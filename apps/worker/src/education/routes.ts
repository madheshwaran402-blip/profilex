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

export async function handleEducationRoutes(
  request: Request,
  env: Env,
  url: URL
): Promise<Response | null> {
  // GET /api/education — list all education entries for logged-in user
  if (url.pathname === "/api/education" && request.method === "GET") {
    const auth = await requireAuth(request, env);
    if ("error" in auth) return auth.error;

    const profileId = await getProfileIdForUser(env, auth.userId);
    if (!profileId) return json({ error: "profile not found" }, 404);

    const result = await env.DB.prepare(
      `SELECT * FROM education WHERE profile_id = ? ORDER BY sort_order ASC, created_at ASC`
    )
      .bind(profileId)
      .all();

    return json({ education: result.results });
  }

  // POST /api/education — create a new entry
  if (url.pathname === "/api/education" && request.method === "POST") {
    const auth = await requireAuth(request, env);
    if ("error" in auth) return auth.error;

    const profileId = await getProfileIdForUser(env, auth.userId);
    if (!profileId) return json({ error: "profile not found" }, 404);

    const body = (await request.json()) as {
      institution?: string;
      degree?: string;
      branch?: string;
      start_date?: string;
      end_date?: string;
      cgpa?: string;
      description?: string;
    };

    if (!body.institution) {
      return json({ error: "institution is required" }, 400);
    }

    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    await env.DB.prepare(
      `INSERT INTO education
        (id, profile_id, institution, degree, branch, start_date, end_date, cgpa, description, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        id,
        profileId,
        body.institution,
        body.degree ?? null,
        body.branch ?? null,
        body.start_date ?? null,
        body.end_date ?? null,
        body.cgpa ?? null,
        body.description ?? null,
        now,
        now
      )
      .run();

    await triggerKnowledgeSync(env, profileId);

    return json({ success: true, id });
  }

  // PUT /api/education/:id — update an entry
  const putMatch = url.pathname.match(/^\/api\/education\/([a-f0-9-]+)$/);
  if (putMatch && request.method === "PUT") {
    const auth = await requireAuth(request, env);
    if ("error" in auth) return auth.error;

    const profileId = await getProfileIdForUser(env, auth.userId);
    if (!profileId) return json({ error: "profile not found" }, 404);

    const entryId = putMatch[1];

    const owned = await env.DB.prepare(
      `SELECT id FROM education WHERE id = ? AND profile_id = ?`
    )
      .bind(entryId, profileId)
      .first();

    if (!owned) return json({ error: "education entry not found" }, 404);

    const body = (await request.json()) as Record<string, string>;
    const allowedFields = [
      "institution",
      "degree",
      "branch",
      "start_date",
      "end_date",
      "cgpa",
      "description",
    ];

    const fields: string[] = [];
    const values: unknown[] = [];

    for (const key of allowedFields) {
      if (body[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(body[key]);
      }
    }

    if (fields.length === 0) {
      return json({ error: "no fields provided to update" }, 400);
    }

    fields.push(`updated_at = ?`);
    values.push(new Date().toISOString());
    values.push(entryId);

    await env.DB.prepare(
      `UPDATE education SET ${fields.join(", ")} WHERE id = ?`
    )
      .bind(...values)
      .run();

    await triggerKnowledgeSync(env, profileId);

    return json({ success: true });
  }

  // DELETE /api/education/:id
  const deleteMatch = url.pathname.match(/^\/api\/education\/([a-f0-9-]+)$/);
  if (deleteMatch && request.method === "DELETE") {
    const auth = await requireAuth(request, env);
    if ("error" in auth) return auth.error;

    const profileId = await getProfileIdForUser(env, auth.userId);
    if (!profileId) return json({ error: "profile not found" }, 404);

    const entryId = deleteMatch[1];

    const result = await env.DB.prepare(
      `DELETE FROM education WHERE id = ? AND profile_id = ?`
    )
      .bind(entryId, profileId)
      .run();

    if (result.meta.changes === 0) {
      return json({ error: "education entry not found" }, 404);
    }

    await triggerKnowledgeSync(env, profileId);

    return json({ success: true });
  }

  return null;
}