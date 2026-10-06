import { validateSession } from "../auth/session";
import type { Env } from "../index";

export async function requireAuth(
  request: Request,
  env: Env
): Promise<{ userId: string } | { error: Response }> {
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token) {
    return {
      error: new Response(
        JSON.stringify({ error: "missing session token" }, null, 2),
        { status: 401, headers: { "content-type": "application/json" } }
      ),
    };
  }

  const userId = await validateSession(env, token);
  if (!userId) {
    return {
      error: new Response(
        JSON.stringify({ error: "invalid or expired session" }, null, 2),
        { status: 401, headers: { "content-type": "application/json" } }
      ),
    };
  }

  return { userId };
}