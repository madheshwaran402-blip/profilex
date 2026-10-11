import type { Env } from "../index";
import { jsonResponse as json } from "../lib/cors";

export async function handlePublicProfileRoutes(
  request: Request,
  env: Env,
  url: URL
): Promise<Response | null> {
  const match = url.pathname.match(/^\/p\/([a-z0-9-]+)$/);
  if (!match || request.method !== "GET") {
    return null;
  }

  const slug = match[1];

  const profile = await env.DB.prepare(
    `SELECT id, name, title, about, photo_url, slug, theme_config
     FROM profiles WHERE slug = ? AND published = 1`
  )
    .bind(slug)
    .first<{
      id: string;
      name: string;
      title: string;
      about: string;
      photo_url: string;
      slug: string;
      theme_config: string;
    }>();

  if (!profile) {
    return json({ error: "profile not found or not published" }, 404);
  }

  await env.DB.prepare(
    `INSERT INTO analytics_events (id, profile_id, event_type, created_at)
     VALUES (?, ?, 'profile_view', ?)`
  )
    .bind(crypto.randomUUID(), profile.id, new Date().toISOString())
    .run();

  const skills = await env.DB.prepare(
    `SELECT name, category FROM skills WHERE profile_id = ? ORDER BY sort_order ASC, created_at ASC`
  )
    .bind(profile.id)
    .all<{ name: string; category: string | null }>();

  const projects = await env.DB.prepare(
    `SELECT name, short_description, tech_stack, github_url, demo_url, featured
     FROM projects WHERE profile_id = ? AND visibility = 'public'
     ORDER BY featured DESC, sort_order ASC, created_at DESC`
  )
    .bind(profile.id)
    .all<{
      name: string;
      short_description: string | null;
      tech_stack: string | null;
      github_url: string | null;
      demo_url: string | null;
      featured: number;
    }>();

  const education = await env.DB.prepare(
    `SELECT institution, degree, branch, cgpa FROM education WHERE profile_id = ? ORDER BY sort_order ASC, created_at ASC`
  )
    .bind(profile.id)
    .all<{ institution: string; degree: string | null; branch: string | null; cgpa: string | null }>();

  return json({
    profile,
    skills: skills.results,
    projects: projects.results,
    education: education.results,
  });
}