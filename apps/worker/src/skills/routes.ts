import type { Env } from "../index";
import { requireAuth } from "../middleware/auth";
import { getProfileIdForUser } from "../profile/helpers";
import { triggerKnowledgeSync } from "../knowledge/trigger";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "content-type": "application/json",
      "Access-Control-Allow-Origin": "https://5d107808.profilex-9kl.pages.dev",
    },
  });
}

export async function handleSkillsRoutes(
  request: Request,
  env: Env,
  url: URL
): Promise<Response | null> {
  if (url.pathname === "/api/skills" && request.method === "GET") {
    const auth = await requireAuth(request, env);
    if ("error" in auth) return auth.error;

    const profileId = await getProfileIdForUser(env, auth.userId);
    if (!profileId) return json({ error: "profile not found" }, 404);

    const result = await env.DB.prepare(
      `SELECT * FROM skills WHERE profile_id = ? ORDER BY sort_order ASC, created_at ASC`
    )
      .bind(profileId)
      .all();

    return json({ skills: result.results });
  }

  if (url.pathname === "/api/skills" && request.method === "POST") {
    const auth = await requireAuth(request, env);
    if ("error" in auth) return auth.error;

    const profileId = await getProfileIdForUser(env, auth.userId);
    if (!profileId) return json({ error: "profile not found" }, 404);

    const body = (await request.json()) as {
      name?: string;
      category?: string;
      proficiency?: number;
    };

    if (!body.name) {
      return json({ error: "name is required" }, 400);
    }

    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    await env.DB.prepare(
      `INSERT INTO skills (id, profile_id, name, category, proficiency, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        id,
        profileId,
        body.name,
        body.category ?? null,
        body.proficiency ?? null,
        now,
        now
      )
      .run();

    await triggerKnowledgeSync(env, profileId);

    return json({ success: true, id });
  }

  const deleteMatch = url.pathname.match(/^\/api\/skills\/([a-f0-9-]+)$/);
  if (deleteMatch && request.method === "DELETE") {
    const auth = await requireAuth(request, env);
    if ("error" in auth) return auth.error;

    const profileId = await getProfileIdForUser(env, auth.userId);
    if (!profileId) return json({ error: "profile not found" }, 404);

    const skillId = deleteMatch[1];

    const result = await env.DB.prepare(
      `DELETE FROM skills WHERE id = ? AND profile_id = ?`
    )
      .bind(skillId, profileId)
      .run();

    if (result.meta.changes === 0) {
      return json({ error: "skill not found" }, 404);
    }

    await triggerKnowledgeSync(env, profileId);

    return json({ success: true });
  }

  return null;
}