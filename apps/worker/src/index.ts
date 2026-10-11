import { hashPassword, verifyPassword } from "./auth/crypto";
import { createSession } from "./auth/session";
import { validateUsername } from "./auth/validation";
import { createVerificationToken, verifyEmailToken } from "./auth/verification";
import { requireAuth } from "./middleware/auth";
import { validateProfileUpdate, type ProfileUpdateInput } from "./profile/validation";
import { getProfileIdForUser } from "./profile/helpers";
import { handleEducationRoutes } from "./education/routes";
import { handleSkillsRoutes } from "./skills/routes";
import { handleExperienceRoutes } from "./experience/routes";
import { handleAchievementsRoutes } from "./achievements/routes";
import { handleProjectsRoutes } from "./projects/routes";
import { syncProfileKnowledge } from "./knowledge/sync";
import { handleChatRoutes } from "./chat/routes";
import { handlePublicProfileRoutes } from "./public/routes";
import { handleUploadRoutes } from "./upload/routes";
import { handleInterviewRoutes } from "./interview/routes";
import { handleAnalyticsRoutes } from "./analytics/routes";
import { handleResumeRoutes } from "./resume/routes";
import { jsonResponse as json, corsHeaders } from "./lib/cors";

export interface Env {
  DB: D1Database;
  AI: Ai;
  VECTORIZE: VectorizeIndex;
  FILES: R2Bucket;
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

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // --- Sub-resource route modules (checked first) ---
    const educationResponse = await handleEducationRoutes(request, env, url);
    if (educationResponse) return educationResponse;

    const skillsResponse = await handleSkillsRoutes(request, env, url);
    if (skillsResponse) return skillsResponse;

    const experienceResponse = await handleExperienceRoutes(request, env, url);
    if (experienceResponse) return experienceResponse;

    const achievementsResponse = await handleAchievementsRoutes(request, env, url);
    if (achievementsResponse) return achievementsResponse;

    const projectsResponse = await handleProjectsRoutes(request, env, url);
    if (projectsResponse) return projectsResponse;

    const interviewResponse = await handleInterviewRoutes(request, env, url);
    if (interviewResponse) return interviewResponse;

    const analyticsResponse = await handleAnalyticsRoutes(request, env, url);
    if (analyticsResponse) return analyticsResponse;

    const resumeResponse = await handleResumeRoutes(request, env, url);
    if (resumeResponse) return resumeResponse;

    // --- SYNC KNOWLEDGE (embeds profile data into Vectorize) ---
    if (url.pathname === "/api/knowledge/sync" && request.method === "POST") {
      const auth = await requireAuth(request, env);
      if ("error" in auth) return auth.error;

      const profileId = await getProfileIdForUser(env, auth.userId);
      if (!profileId) return json({ error: "profile not found" }, 404);

      const result = await syncProfileKnowledge(env, profileId);

      return json({ success: true, chunks_created: result.chunksCreated });
    }

    const chatResponse = await handleChatRoutes(request, env, url);
    if (chatResponse) return chatResponse;

    const publicProfileResponse = await handlePublicProfileRoutes(request, env, url);
    if (publicProfileResponse) return publicProfileResponse;

    const uploadResponse = await handleUploadRoutes(request, env, url);
    if (uploadResponse) return uploadResponse;

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

    // --- GET PROFILE ---
    if (url.pathname === "/api/profile" && request.method === "GET") {
      const auth = await requireAuth(request, env);
      if ("error" in auth) return auth.error;

      const profile = await env.DB.prepare(
        `SELECT id, name, title, location, about, photo_url, ai_personality,
                ai_enabled, slug, published, theme_config, created_at, updated_at
         FROM profiles WHERE user_id = ?`
      )
        .bind(auth.userId)
        .first();

      if (!profile) return json({ error: "profile not found" }, 404);

      return json({ profile });
    }

    // --- UPDATE PROFILE ---
    if (url.pathname === "/api/profile" && request.method === "PUT") {
      const auth = await requireAuth(request, env);
      if ("error" in auth) return auth.error;

      const body = (await request.json()) as ProfileUpdateInput;

      const validationError = validateProfileUpdate(body);
      if (validationError) {
        return json({ error: validationError }, 400);
      }

      const existing = await env.DB.prepare(
        `SELECT id FROM profiles WHERE user_id = ?`
      )
        .bind(auth.userId)
        .first<{ id: string }>();

      if (!existing) return json({ error: "profile not found" }, 404);

      const now = new Date().toISOString();

      const fields: string[] = [];
      const values: unknown[] = [];

      for (const key of [
        "name",
        "title",
        "location",
        "about",
        "photo_url",
        "ai_personality",
      ] as const) {
        if (body[key] !== undefined) {
          fields.push(`${key} = ?`);
          values.push(body[key]);
        }
      }

      if (fields.length === 0) {
        return json({ error: "no fields provided to update" }, 400);
      }

      fields.push(`updated_at = ?`);
      values.push(now);
      values.push(auth.userId);

      await env.DB.prepare(
        `UPDATE profiles SET ${fields.join(", ")} WHERE user_id = ?`
      )
        .bind(...values)
        .run();

      const updated = await env.DB.prepare(
        `SELECT id, name, title, location, about, photo_url, ai_personality,
                ai_enabled, slug, published, created_at, updated_at
         FROM profiles WHERE user_id = ?`
      )
        .bind(auth.userId)
        .first();

      return json({ success: true, profile: updated });
    }

    // --- TOGGLE PUBLISHED STATUS ---
    if (url.pathname === "/api/profile/publish" && request.method === "POST") {
      const auth = await requireAuth(request, env);
      if ("error" in auth) return auth.error;

      const body = (await request.json()) as { publish?: boolean };
      const publishValue = body.publish === false ? 0 : 1;

      await env.DB.prepare(
        `UPDATE profiles SET published = ?, updated_at = ? WHERE user_id = ?`
      )
        .bind(publishValue, new Date().toISOString(), auth.userId)
        .run();

      return json({ success: true, published: publishValue === 1 });
    }

    // --- UPDATE THEME ---
    if (url.pathname === "/api/profile/theme" && request.method === "PUT") {
      const auth = await requireAuth(request, env);
      if ("error" in auth) return auth.error;

      const body = (await request.json()) as { preset?: string };
      const validPresets = ["cyan", "violet", "emerald", "amber"];

      if (!body.preset || !validPresets.includes(body.preset)) {
        return json({ error: `preset must be one of: ${validPresets.join(", ")}` }, 400);
      }

      const themeConfig = JSON.stringify({ preset: body.preset });

      await env.DB.prepare(
        `UPDATE profiles SET theme_config = ?, updated_at = ? WHERE user_id = ?`
      )
        .bind(themeConfig, new Date().toISOString(), auth.userId)
        .run();

      return json({ success: true });
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