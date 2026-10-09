import type { Env } from "../index";

const REQUESTS_PER_MINUTE = 10;

function currentWindow(): string {
  // Truncate ISO timestamp to the minute, e.g. "2026-10-09T14:32"
  return new Date().toISOString().slice(0, 16);
}

export async function checkRateLimit(
  env: Env,
  ipAddress: string
): Promise<boolean> {
  const windowStart = currentWindow();

  const existing = await env.DB.prepare(
    `SELECT request_count FROM chat_rate_limits WHERE ip_address = ? AND window_start = ?`
  )
    .bind(ipAddress, windowStart)
    .first<{ request_count: number }>();

  if (existing) {
    if (existing.request_count >= REQUESTS_PER_MINUTE) {
      return false; // over the limit
    }
    await env.DB.prepare(
      `UPDATE chat_rate_limits SET request_count = request_count + 1
       WHERE ip_address = ? AND window_start = ?`
    )
      .bind(ipAddress, windowStart)
      .run();
    return true;
  }

  await env.DB.prepare(
    `INSERT INTO chat_rate_limits (id, ip_address, window_start, request_count)
     VALUES (?, ?, ?, 1)`
  )
    .bind(crypto.randomUUID(), ipAddress, windowStart)
    .run();

  return true;
}