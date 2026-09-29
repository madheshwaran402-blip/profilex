export interface Env {
  DB: D1Database;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/test-db") {
      const now = new Date().toISOString();

      // Insert a test user if it doesn't already exist
      await env.DB.prepare(
        `INSERT INTO users (id, email, username, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(email) DO NOTHING`
      )
        .bind("usr_test_001", "test@profilex.app", "testuser", now, now)
        .run();

      // Read it back
      const result = await env.DB.prepare(
        `SELECT * FROM users`
      ).all();

      return new Response(JSON.stringify(result.results, null, 2), {
        headers: { "content-type": "application/json" },
      });
    }

    return new Response("Hello from ProfileX Worker!", {
      headers: { "content-type": "text/plain" },
    });
  },
};