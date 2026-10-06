import { hashPassword, verifyPassword } from "./auth/crypto";
import { createSession } from "./auth/session";
import { validateUsername } from "./auth/validation";
import { createVerificationToken, verifyEmailToken } from "./auth/verification";
import { requireAuth } from "./middleware/auth";

export interface Env {
  DB: D1Database;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function hashTokenForLookup(token: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token)
  );
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // --- SIGNUP ---
    if (url.pathname === "/api/auth/signup" && request.method === "POST") {
      const body = (await request.json()) as {
        email?: string;
        username?: string;
        password?: string;
      };
      const { email, username, password } = body;

      if (!email || !username || !password) {
        return json({ error: "email, username, and password are required" }, 400);
      }
      if (password.length < 8) {
        return json({ error: "password must be at least 8 characters" }, 400);
      }

      const usernameError = validateUsername(username);
      if (usernameError) {
        return json({ error: usernameError }, 400);
      }

      const normalizedUsername = username.toLowerCase();

      const existing = await env.DB.prepare(
        `SELECT id FROM users WHERE email = ? OR username = ?`
      )
        .bind(email, normalizedUsername)
        .first();

      if (existing) {
        return json({ error: "email or username already in use" }, 409);
      }

      const now = new Date().toISOString();
      const userId = crypto.randomUUID();
      const profileId = crypto.randomUUID();
      const passwordHash = await hashPassword(password);

      await env.DB.batch([
        env.DB.prepare(
          `INSERT INTO users (id, email, username, password_hash, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?)`
        ).bind(userId, email, normalizedUsername, passwordHash, now, now),

        env.DB.prepare(
          `INSERT INTO profiles (id, user_id, name, slug, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?)`
        ).bind(profileId, userId, normalizedUsername, normalizedUsername, now, now),
      ]);

      const token = await createSession(env, userId);

      return json({
        success: true,
        user: { id: userId, username: normalizedUsername, email },
        session_token: token,
      });
    }

    // --- LOGIN ---
    if (url.pathname === "/api/auth/login" && request.method === "POST") {
      const body = (await request.json()) as { email?: string; password?: string };
      const { email, password } = body;

      if (!email || !password) {
        return json({ error: "email and password are required" }, 400);
      }

      const user = await env.DB.prepare(
        `SELECT id, username, password_hash FROM users WHERE email = ?`
      )
        .bind(email)
        .first<{ id: string; username: string; password_hash: string }>();

      if (!user || !user.password_hash) {
        return json({ error: "invalid email or password" }, 401);
      }

      const valid = await verifyPassword(password, user.password_hash);
      if (!valid) {
        return json({ error: "invalid email or password" }, 401);
      }

      const token = await createSession(env, user.id);

      return json({
        success: true,
        user: { id: user.id, username: user.username, email },
        session_token: token,
      });
    }

    // --- LOGOUT ---
    if (url.pathname === "/api/auth/logout" && request.method === "POST") {
      const auth = await requireAuth(request, env);
      if ("error" in auth) return auth.error;

      const authHeader = request.headers.get("Authorization");
      const token = authHeader!.replace("Bearer ", "");
      const tokenHash = await hashTokenForLookup(token);

      await env.DB.prepare(`DELETE FROM sessions WHERE token_hash = ?`)
        .bind(tokenHash)
        .run();

      return json({ success: true, message: "logged out" });
    }

    // --- REQUEST EMAIL VERIFICATION ---
    if (url.pathname === "/api/auth/request-verification" && request.method === "POST") {
      const auth = await requireAuth(request, env);
      if ("error" in auth) return auth.error;

      const token = await createVerificationToken(env, auth.userId);

      // NOTE: no email service wired up yet (that's a later day).
      // For now we return the token directly so you can test the flow.
      return json({
        success: true,
        message: "verification token created (would normally be emailed)",
        verification_token: token,
      });
    }

    // --- VERIFY EMAIL ---
    if (url.pathname === "/api/auth/verify-email" && request.method === "POST") {
      const body = (await request.json()) as { token?: string };
      if (!body.token) {
        return json({ error: "token is required" }, 400);
      }

      const userId = await verifyEmailToken(env, body.token);
      if (!userId) {
        return json({ error: "invalid or expired verification token" }, 400);
      }

      return json({ success: true, message: "email verified" });
    }

    // --- ACCOUNT SETTINGS: update name / password ---
    if (url.pathname === "/api/settings" && request.method === "PUT") {
      const auth = await requireAuth(request, env);
      if ("error" in auth) return auth.error;

      const body = (await request.json()) as {
        name?: string;
        current_password?: string;
        new_password?: string;
      };

      const now = new Date().toISOString();

      if (body.new_password) {
        if (!body.current_password) {
          return json({ error: "current_password is required to set a new password" }, 400);
        }
        if (body.new_password.length < 8) {
          return json({ error: "new password must be at least 8 characters" }, 400);
        }

        const user = await env.DB.prepare(
          `SELECT password_hash FROM users WHERE id = ?`
        )
          .bind(auth.userId)
          .first<{ password_hash: string }>();

        if (!user) return json({ error: "user not found" }, 404);

        const valid = await verifyPassword(body.current_password, user.password_hash);
        if (!valid) {
          return json({ error: "current password is incorrect" }, 401);
        }

        const newHash = await hashPassword(body.new_password);
        await env.DB.prepare(
          `UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?`
        )
          .bind(newHash, now, auth.userId)
          .run();
      }

      if (body.name) {
        await env.DB.prepare(
          `UPDATE profiles SET name = ?, updated_at = ? WHERE user_id = ?`
        )
          .bind(body.name, now, auth.userId)
          .run();
      }

      return json({ success: true, message: "settings updated" });
    }

    // --- CHANGE SLUG / USERNAME (public URL) ---
    if (url.pathname === "/api/settings/slug" && request.method === "PUT") {
      const auth = await requireAuth(request, env);
      if ("error" in auth) return auth.error;

      const body = (await request.json()) as { new_slug?: string };
      if (!body.new_slug) {
        return json({ error: "new_slug is required" }, 400);
      }

      const slugError = validateUsername(body.new_slug);
      if (slugError) {
        return json({ error: slugError }, 400);
      }

      const newSlug = body.new_slug.toLowerCase();

      const profile = await env.DB.prepare(
        `SELECT id, slug FROM profiles WHERE user_id = ?`
      )
        .bind(auth.userId)
        .first<{ id: string; slug: string }>();

      if (!profile) return json({ error: "profile not found" }, 404);

      if (profile.slug === newSlug) {
        return json({ error: "this is already your current slug" }, 400);
      }

      const taken = await env.DB.prepare(
        `SELECT id FROM profiles WHERE slug = ?`
      )
        .bind(newSlug)
        .first();

      if (taken) {
        return json({ error: "this slug is already taken" }, 409);
      }

      const now = new Date().toISOString();

      await env.DB.batch([
        env.DB.prepare(
          `INSERT INTO profile_slug_history (id, profile_id, old_slug, changed_at)
           VALUES (?, ?, ?, ?)`
        ).bind(crypto.randomUUID(), profile.id, profile.slug, now),

        env.DB.prepare(
          `UPDATE profiles SET slug = ?, updated_at = ? WHERE id = ?`
        ).bind(newSlug, now, profile.id),
      ]);

      return json({
        success: true,
        message: "slug updated",
        old_slug: profile.slug,
        new_slug: newSlug,
      });
    }

    // --- PROTECTED: current logged-in user ---
    if (url.pathname === "/api/me" && request.method === "GET") {
      const auth = await requireAuth(request, env);
      if ("error" in auth) return auth.error;

      const user = await env.DB.prepare(
        `SELECT id, email, username, email_verified, created_at FROM users WHERE id = ?`
      )
        .bind(auth.userId)
        .first();

      return json({ user });
    }

    if (url.pathname === "/api/test-db") {
      const result = await env.DB.prepare(`SELECT * FROM users`).all();
      return json(result.results);
    }

    return new Response("Hello from ProfileX Worker!", {
      headers: { "content-type": "text/plain" },
    });
  },
};