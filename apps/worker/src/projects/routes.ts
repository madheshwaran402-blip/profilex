import type { Env } from "../index";
import { requireAuth } from "../middleware/auth";
import { getProfileIdForUser } from "../profile/helpers";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "content-type": "application/json",
      "Access-Control-Allow-Origin": "http://localhost:5173",
    },
  });
}

const VALID_VISIBILITY = ["public", "ai_only", "private"];

interface ProjectInput {
  name?: string;
  short_description?: string;
  description?: string;
  problem?: string;
  solution?: string;
  tech_stack?: string;
  role?: string;
  github_url?: string;
  demo_url?: string;
  video_url?: string;
  featured?: boolean;
  visibility?: string;
}

export async function handleProjectsRoutes(
  request: Request,
  env: Env,
  url: URL
): Promise<Response | null> {
  // GET /api/projects — list all projects for logged-in user
  if (url.pathname === "/api/projects" && request.method === "GET") {
    const auth = await requireAuth(request, env);
    if ("error" in auth) return auth.error;

    const profileId = await getProfileIdForUser(env, auth.userId);
    if (!profileId) return json({ error: "profile not found" }, 404);

    const result = await env.DB.prepare(
      `SELECT * FROM projects WHERE profile_id = ? ORDER BY sort_order ASC, created_at DESC`
    )
      .bind(profileId)
      .all();

    return json({ projects: result.results });
  }

  // POST /api/projects — create
  if (url.pathname === "/api/projects" && request.method === "POST") {
    const auth = await requireAuth(request, env);
    if ("error" in auth) return auth.error;

    const profileId = await getProfileIdForUser(env, auth.userId);
    if (!profileId) return json({ error: "profile not found" }, 404);

    const body = (await request.json()) as ProjectInput;

    if (!body.name) {
      return json({ error: "name is required" }, 400);
    }
    if (body.visibility && !VALID_VISIBILITY.includes(body.visibility)) {
      return json(
        { error: `visibility must be one of: ${VALID_VISIBILITY.join(", ")}` },
        400
      );
    }

    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    await env.DB.prepare(
      `INSERT INTO projects
        (id, profile_id, name, short_description, description, problem, solution,
         tech_stack, role, github_url, demo_url, video_url, featured, visibility,
         created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        id,
        profileId,
        body.name,
        body.short_description ?? null,
        body.description ?? null,
        body.problem ?? null,
        body.solution ?? null,
        body.tech_stack ?? null,
        body.role ?? null,
        body.github_url ?? null,
        body.demo_url ?? null,
        body.video_url ?? null,
        body.featured ? 1 : 0,
        body.visibility ?? "public",
        now,
        now
      )
      .run();

    return json({ success: true, id });
  }

  // PUT /api/projects/:id — update
  const putMatch = url.pathname.match(/^\/api\/projects\/([a-f0-9-]+)$/);
  if (putMatch && request.method === "PUT") {
    const auth = await requireAuth(request, env);
    if ("error" in auth) return auth.error;

    const profileId = await getProfileIdForUser(env, auth.userId);
    if (!profileId) return json({ error: "profile not found" }, 404);

    const projectId = putMatch[1];

    const owned = await env.DB.prepare(
      `SELECT id FROM projects WHERE id = ? AND profile_id = ?`
    )
      .bind(projectId, profileId)
      .first();

    if (!owned) return json({ error: "project not found" }, 404);

    const body = (await request.json()) as ProjectInput;

    if (body.visibility && !VALID_VISIBILITY.includes(body.visibility)) {
      return json(
        { error: `visibility must be one of: ${VALID_VISIBILITY.join(", ")}` },
        400
      );
    }

    const allowedFields: (keyof ProjectInput)[] = [
      "name",
      "short_description",
      "description",
      "problem",
      "solution",
      "tech_stack",
      "role",
      "github_url",
      "demo_url",
      "video_url",
      "visibility",
    ];

    const fields: string[] = [];
    const values: unknown[] = [];

    for (const key of allowedFields) {
      if (body[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(body[key]);
      }
    }

    if (body.featured !== undefined) {
      fields.push(`featured = ?`);
      values.push(body.featured ? 1 : 0);
    }

    if (fields.length === 0) {
      return json({ error: "no fields provided to update" }, 400);
    }

    fields.push(`updated_at = ?`);
    values.push(new Date().toISOString());
    values.push(projectId);

    await env.DB.prepare(
      `UPDATE projects SET ${fields.join(", ")} WHERE id = ?`
    )
      .bind(...values)
      .run();

    return json({ success: true });
  }

  // DELETE /api/projects/:id
  const deleteMatch = url.pathname.match(/^\/api\/projects\/([a-f0-9-]+)$/);
  if (deleteMatch && request.method === "DELETE") {
    const auth = await requireAuth(request, env);
    if ("error" in auth) return auth.error;

    const profileId = await getProfileIdForUser(env, auth.userId);
    if (!profileId) return json({ error: "profile not found" }, 404);

    const projectId = deleteMatch[1];

    const result = await env.DB.prepare(
      `DELETE FROM projects WHERE id = ? AND profile_id = ?`
    )
      .bind(projectId, profileId)
      .run();

    if (result.meta.changes === 0) {
      return json({ error: "project not found" }, 404);
    }

    return json({ success: true });
  }

  return null;
}