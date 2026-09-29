export interface Env {
  // We'll add D1, R2, Vectorize bindings here in later days
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return new Response("Hello from ProfileX Worker!", {
      headers: { "content-type": "text/plain" },
    });
  },
};