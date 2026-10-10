import type { Env } from "../index";
import { requireAuth } from "../middleware/auth";
import { getProfileIdForUser } from "../profile/helpers";
import { triggerKnowledgeSync } from "../knowledge/trigger";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "content-type": "application/json",
      "Access-Control-Allow-Origin": "http://localhost:5173",
    },
  });
}

const VALID_TYPES = [
  "award",
  "hackathon",
  "patent",
  "publication",
  "certification",
  "competition",
  "scholarship",
  "other",
];

export async function handleAchievementsRoutes(
  request: Request,
  env: Env,
  url: URL
): Promise<Response | null> {
  if (url.pathname === "/api/achievements" && request.method === "GET") {
    const auth = await requireAuth(request, env);
    if ("error" in auth) return auth.error;

    const profileId = await getProfileIdForUser(env, auth.userId);
    if (!profileId) return json({ error: "profile not found" }, 404);

    const result = await env.DB.prepare(
      `SELECT * FROM achievements WHERE profile_id = ? ORDER BY sort_order ASC, created_at ASC`
    )
      .bind(profileId)
      .all();

    return json({ achievements: result.results });
  }

  if (url.pathname === "/api/achievements" && request.method === "POST") {
    const auth = await requireAuth(request, env);
    if ("error" in auth) return auth.error;

    const profileId = await getProfileIdForUser(env, auth.userId);
    if (!profileId) return json({ error: "profile not found" }, 404);

    const body = (await request.json()) as {
      title?: string;
      type?: string;
      date?: string;
      description?: string;
      verification_url?: string;
    };

    if (!body.title) {
      return json({ error: "title is required" }, 400);
    }
    if (body.type && !VALID_TYPES.includes(body.type)) {
      return json({ error: `type must be one of: ${VALID_TYPES.join(", ")}` }, 400);
    }

    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    await env.DB.prepare(
      `INSERT INTO achievements
        (id, profile_id, title, type, date, description, verification_url, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        id,
        profileId,
        body.title,
        body.type ?? null,
        body.date ?? null,
        body.description ?? null,
        body.verification_url ?? null,
        now,
        now
      )
      .run();

    await triggerKnowledgeSync(env, profileId);

    return json({ success: true, id });
  }

  const deleteMatch = url.pathname.match(/^\/api\/achievements\/([a-f0-9-]+)$/);
  if (deleteMatch && request.method === "DELETE") {
    const auth = await requireAuth(request, env);
    if ("error" in auth) return auth.error;

    const profileId = await getProfileIdForUser(env, auth.userId);
    if (!profileId) return json({ error: "profile not found" }, 404);

    const entryId = deleteMatch[1];

    const result = await env.DB.prepare(
      `DELETE FROM achievements WHERE id = ? AND profile_id = ?`
    )
      .bind(entryId, profileId)
      .run();

    if (result.meta.changes === 0) {
      return json({ error: "achievement not found" }, 404);
    }

    await triggerKnowledgeSync(env, profileId);

    return json({ success: true });
  }

  return null;
}