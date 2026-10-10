import type { Env } from "../index";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "content-type": "application/json",
      "Access-Control-Allow-Origin": "http://localhost:5173",
    },
  });
}

export async function handlePublicProfileRoutes(
  request: Request,
  env: Env,
  url: URL
): Promise<Response | null> {
  const match = url.pathname.match(/^\/p\/([a-z0-9-]+)$/);
  if (!match || request.method !== "GET") {
    return null;
  }

  const slug = match[1];

  const profile = await env.DB.prepare(
    `SELECT id, name, title, about, photo_url, slug, theme_config
     FROM profiles WHERE slug = ? AND published = 1`
  )
    .bind(slug)
    .first<{ id: string; name: string; title: string; about: string; photo_url: string; slug: string; theme_config: string }>();

  if (!profile) {
    return json({ error: "profile not found or not published" }, 404);
  }

  await env.DB.prepare(
    `INSERT INTO analytics_events (id, profile_id, event_type, created_at)
     VALUES (?, ?, 'profile_view', ?)`
  )
    .bind(crypto.randomUUID(), profile.id, new Date().toISOString())
    .run();

  return json({ profile });
}