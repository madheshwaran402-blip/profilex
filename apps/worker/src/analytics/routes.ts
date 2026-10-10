import type { Env } from "../index";
import { requireAuth } from "../middleware/auth";
import { getProfileIdForUser } from "../profile/helpers";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "content-type": "application/json",
      "Access-Control-Allow-Origin": "https://5d107808.profilex-9kl.pages.dev",
    },
  });
}

export async function handleAnalyticsRoutes(
  request: Request,
  env: Env,
  url: URL
): Promise<Response | null> {
  if (url.pathname !== "/api/analytics" || request.method !== "GET") {
    return null;
  }

  const auth = await requireAuth(request, env);
  if ("error" in auth) return auth.error;

  const profileId = await getProfileIdForUser(env, auth.userId);
  if (!profileId) return json({ error: "profile not found" }, 404);

  const views = await env.DB.prepare(
    `SELECT COUNT(*) as count FROM analytics_events WHERE profile_id = ? AND event_type = 'profile_view'`
  )
    .bind(profileId)
    .first<{ count: number }>();

  const chats = await env.DB.prepare(
    `SELECT COUNT(*) as count FROM analytics_events WHERE profile_id = ? AND event_type = 'chat_message'`
  )
    .bind(profileId)
    .first<{ count: number }>();

  const recentViews = await env.DB.prepare(
    `SELECT created_at FROM analytics_events
     WHERE profile_id = ? AND event_type = 'profile_view'
     ORDER BY created_at DESC LIMIT 10`
  )
    .bind(profileId)
    .all<{ created_at: string }>();

  return json({
    total_views: views?.count ?? 0,
    total_chat_messages: chats?.count ?? 0,
    recent_views: recentViews.results.map((r) => r.created_at),
  });
}