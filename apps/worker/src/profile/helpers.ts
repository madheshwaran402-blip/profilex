import type { Env } from "../index";

export async function getProfileIdForUser(
  env: Env,
  userId: string
): Promise<string | null> {
  const profile = await env.DB.prepare(
    `SELECT id FROM profiles WHERE user_id = ?`
  )
    .bind(userId)
    .first<{ id: string }>();

  return profile?.id ?? null;
}