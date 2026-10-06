import { generateToken, hashToken } from "./crypto";
import type { Env } from "../index";

const VERIFICATION_TOKEN_DURATION_HOURS = 24;

export async function createVerificationToken(
  env: Env,
  userId: string
): Promise<string> {
  const token = generateToken();
  const tokenHash = await hashToken(token);
  const now = new Date();
  const expiresAt = new Date(
    now.getTime() + VERIFICATION_TOKEN_DURATION_HOURS * 60 * 60 * 1000
  );

  await env.DB.prepare(
    `INSERT INTO email_verification_tokens (id, user_id, token_hash, expires_at, created_at)
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

export async function verifyEmailToken(
  env: Env,
  token: string
): Promise<string | null> {
  const tokenHash = await hashToken(token);

  const result = await env.DB.prepare(
    `SELECT user_id, expires_at FROM email_verification_tokens WHERE token_hash = ?`
  )
    .bind(tokenHash)
    .first<{ user_id: string; expires_at: string }>();

  if (!result) return null;
  if (new Date(result.expires_at) < new Date()) return null;

  await env.DB.prepare(`UPDATE users SET email_verified = 1 WHERE id = ?`)
    .bind(result.user_id)
    .run();

  await env.DB.prepare(
    `DELETE FROM email_verification_tokens WHERE token_hash = ?`
  )
    .bind(tokenHash)
    .run();

  return result.user_id;
}