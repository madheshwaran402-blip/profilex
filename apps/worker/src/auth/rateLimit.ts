import type { Env } from "../index";

const LIMITS: Record<string, number> = {
  login: 5,    // 5 attempts per minute per IP
  signup: 3,   // 3 signups per minute per IP
};

function currentWindow(): string {
  return new Date().toISOString().slice(0, 16); // minute-level bucket
}

export async function checkAuthRateLimit(
  env: Env,
  ipAddress: string,
  action: "login" | "signup"
): Promise<boolean> {
  const limit = LIMITS[action];
  const windowStart = currentWindow();

  const existing = await env.DB.prepare(
    `SELECT request_count FROM auth_rate_limits WHERE ip_address = ? AND action = ? AND window_start = ?`
  )
    .bind(ipAddress, action, windowStart)
    .first<{ request_count: number }>();

  if (existing) {
    if (existing.request_count >= limit) {
      return false;
    }
    await env.DB.prepare(
      `UPDATE auth_rate_limits SET request_count = request_count + 1
       WHERE ip_address = ? AND action = ? AND window_start = ?`
    )
      .bind(ipAddress, action, windowStart)
      .run();
    return true;
  }

  await env.DB.prepare(
    `INSERT INTO auth_rate_limits (id, ip_address, action, window_start, request_count)
     VALUES (?, ?, ?, ?, 1)`
  )
    .bind(crypto.randomUUID(), ipAddress, action, windowStart)
    .run();

  return true;
}