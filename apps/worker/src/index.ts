import { hashPassword, verifyPassword } from "./auth/crypto";
import { createSession, validateSession } from "./auth/session";

export interface Env {
  DB: D1Database;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function slugify(username: string): string {
  return username.toLowerCase().replace(/[^a-z0-9-]/g, "");
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

      const existing = await env.DB.prepare(
        `SELECT id FROM users WHERE email = ? OR username = ?`
      )
        .bind(email, username)
        .first();

      if (existing) {
        return json({ error: "email or username already in use" }, 409);
      }

      const now = new Date().toISOString();
      const userId = crypto.randomUUID();
      const profileId = crypto.randomUUID();
      const passwordHash = await hashPassword(password);
      const slug = slugify(username);

      await env.DB.batch([
        env.DB.prepare(
          `INSERT INTO users (id, email, username, password_hash, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?)`
        ).bind(userId, email, username, passwordHash, now, now),

        env.DB.prepare(
          `INSERT INTO profiles (id, user_id, name, slug, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?)`
        ).bind(profileId, userId, username, slug, now, now),
      ]);

      const token = await createSession(env, userId);

      return json({
        success: true,
        user: { id: userId, username, email },
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

    // --- PROTECTED: current logged-in user ---
    if (url.pathname === "/api/me" && request.method === "GET") {
      const authHeader = request.headers.get("Authorization");
      const token = authHeader?.replace("Bearer ", "");

      if (!token) {
        return json({ error: "missing session token" }, 401);
      }

      const userId = await validateSession(env, token);
      if (!userId) {
        return json({ error: "invalid or expired session" }, 401);
      }

      const user = await env.DB.prepare(
        `SELECT id, email, username, created_at FROM users WHERE id = ?`
      )
        .bind(userId)
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