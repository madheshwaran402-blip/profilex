import { generateToken, hashToken } from "./crypto";
import type { Env } from "../index";

const SESSION_DURATION_DAYS = 30;

export async function createSession(env: Env, userId: string): Promise<string> {
  const token = generateToken();
  const tokenHash = await hashToken(token);
  const now = new Date();
  const expiresAt = new Date(
    now.getTime() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000
  );

  await env.DB.prepare(
    `INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?)`
  )
    .bind(
      crypto.randomUUID(),
      userId,
      tokenHash,
      expiresAt.toISOString(),
      now.toISOString()
    )
    .run();

  return token;
}

export async function validateSession(
  env: Env,
  token: string
): Promise<string | null> {
  const tokenHash = await hashToken(token);

  const result = await env.DB.prepare(
    `SELECT user_id, expires_at FROM sessions WHERE token_hash = ?`
  )
    .bind(tokenHash)
    .first<{ user_id: string; expires_at: string }>();

  if (!result) return null;
  if (new Date(result.expires_at) < new Date()) return null;

  return result.user_id;
}