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

export async function handleExperienceRoutes(
  request: Request,
  env: Env,
  url: URL
): Promise<Response | null> {
  if (url.pathname === "/api/experience" && request.method === "GET") {
    const auth = await requireAuth(request, env);
    if ("error" in auth) return auth.error;

    const profileId = await getProfileIdForUser(env, auth.userId);
    if (!profileId) return json({ error: "profile not found" }, 404);

    const result = await env.DB.prepare(
      `SELECT * FROM experience WHERE profile_id = ? ORDER BY sort_order ASC, created_at ASC`
    )
      .bind(profileId)
      .all();

    return json({ experience: result.results });
  }

  if (url.pathname === "/api/experience" && request.method === "POST") {
    const auth = await requireAuth(request, env);
    if ("error" in auth) return auth.error;

    const profileId = await getProfileIdForUser(env, auth.userId);
    if (!profileId) return json({ error: "profile not found" }, 404);

    const body = (await request.json()) as {
      company?: string;
      role?: string;
      start_date?: string;
      end_date?: string;
      current_role?: boolean;
      description?: string;
    };

    if (!body.company) {
      return json({ error: "company is required" }, 400);
    }

    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    await env.DB.prepare(
      `INSERT INTO experience
        (id, profile_id, company, role, start_date, end_date, current_role, description, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        id,
        profileId,
        body.company,
        body.role ?? null,
        body.start_date ?? null,
        body.end_date ?? null,
        body.current_role ? 1 : 0,
        body.description ?? null,
        now,
        now
      )
      .run();

    await triggerKnowledgeSync(env, profileId);

    return json({ success: true, id });
  }

  const deleteMatch = url.pathname.match(/^\/api\/experience\/([a-f0-9-]+)$/);
  if (deleteMatch && request.method === "DELETE") {
    const auth = await requireAuth(request, env);
    if ("error" in auth) return auth.error;

    const profileId = await getProfileIdForUser(env, auth.userId);
    if (!profileId) return json({ error: "profile not found" }, 404);

    const entryId = deleteMatch[1];

    const result = await env.DB.prepare(
      `DELETE FROM experience WHERE id = ? AND profile_id = ?`
    )
      .bind(entryId, profileId)
      .run();

    if (result.meta.changes === 0) {
      return json({ error: "experience entry not found" }, 404);
    }

    await triggerKnowledgeSync(env, profileId);

    return json({ success: true });
  }

  return null;
}