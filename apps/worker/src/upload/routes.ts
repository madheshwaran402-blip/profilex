import type { Env } from "../index";
import { requireAuth } from "../middleware/auth";
import { getProfileIdForUser } from "../profile/helpers";
import { jsonResponse as json, corsHeaders } from "../lib/cors";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export async function handleUploadRoutes(
  request: Request,
  env: Env,
  url: URL
): Promise<Response | null> {
  // POST /api/upload/photo — upload a profile photo
  if (url.pathname === "/api/upload/photo" && request.method === "POST") {
    const auth = await requireAuth(request, env);
    if ("error" in auth) return auth.error;

    const profileId = await getProfileIdForUser(env, auth.userId);
    if (!profileId) return json({ error: "profile not found" }, 404);

    const contentType = request.headers.get("Content-Type") ?? "";
    if (!ALLOWED_TYPES.includes(contentType)) {
      return json(
        { error: "file must be JPEG, PNG, or WebP" },
        400
      );
    }

    const bodyBuffer = await request.arrayBuffer();
    if (bodyBuffer.byteLength > MAX_SIZE_BYTES) {
      return json({ error: "file must be under 5MB" }, 400);
    }
    if (bodyBuffer.byteLength === 0) {
      return json({ error: "file is empty" }, 400);
    }

    const extension = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
    const key = `profiles/${profileId}/avatar/profile.${extension}`;

    await env.FILES.put(key, bodyBuffer, {
      httpMetadata: { contentType },
    });

    // Store a URL that resolves via our own serving route (not a direct R2 URL)
    const photoUrl = `/api/files/${key}`;

    await env.DB.prepare(
      `UPDATE profiles SET photo_url = ?, updated_at = ? WHERE id = ?`
    )
      .bind(photoUrl, new Date().toISOString(), profileId)
      .run();

    return json({ success: true, photo_url: photoUrl });
  }

  // GET /api/files/* — serve an R2 object (public, read-only)
  if (url.pathname.startsWith("/api/files/") && request.method === "GET") {
    const key = url.pathname.replace("/api/files/", "");

    const object = await env.FILES.get(key);
    if (!object) {
      return new Response("Not found", { status: 404 });
    }

    return new Response(object.body, {
      headers: {
        "content-type": object.httpMetadata?.contentType ?? "application/octet-stream",
        "Access-Control-Allow-Origin": "https://5d107808.profilex-9kl.pages.dev",
        "Cache-Control": "public, max-age=3600",
      },
    });
  }

  return null;
}