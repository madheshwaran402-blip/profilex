import type { Env } from "../index";

interface ChunkToEmbed {
  sourceType: string;
  sourceId: string | null;
  content: string;
}

async function embedText(env: Env, text: string): Promise<number[]> {
  const result = (await env.AI.run("@cf/baai/bge-base-en-v1.5", {
    text: [text],
  })) as { data: number[][] };
  return result.data[0];
}

export async function syncProfileKnowledge(
  env: Env,
  profileId: string
): Promise<{ chunksCreated: number }> {
  const chunks: ChunkToEmbed[] = [];

  // --- Profile basics ---
  const profile = await env.DB.prepare(
    `SELECT name, title, about FROM profiles WHERE id = ?`
  )
    .bind(profileId)
    .first<{ name: string; title: string; about: string }>();

  if (profile) {
    const parts = [
      profile.name ? `Name: ${profile.name}` : "",
      profile.title ? `Title: ${profile.title}` : "",
      profile.about ? `About: ${profile.about}` : "",
    ].filter(Boolean);

    if (parts.length > 0) {
      chunks.push({
        sourceType: "profile",
        sourceId: profileId,
        content: parts.join(". "),
      });
    }
  }

  // --- Skills (combined into one chunk) ---
  const skills = await env.DB.prepare(
    `SELECT name, category FROM skills WHERE profile_id = ?`
  )
    .bind(profileId)
    .all<{ name: string; category: string | null }>();

  if (skills.results.length > 0) {
    const skillList = skills.results
      .map((s) => (s.category ? `${s.name} (${s.category})` : s.name))
      .join(", ");
    chunks.push({
      sourceType: "skills",
      sourceId: null,
      content: `Skills: ${skillList}`,
    });
  }

  // --- Education (one chunk per entry) ---
  const education = await env.DB.prepare(
    `SELECT id, institution, degree, branch, cgpa FROM education WHERE profile_id = ?`
  )
    .bind(profileId)
    .all<{ id: string; institution: string; degree: string | null; branch: string | null; cgpa: string | null }>();

  for (const e of education.results) {
    const parts = [
      `Studied at ${e.institution}`,
      e.degree ? `pursuing ${e.degree}` : "",
      e.branch ? `in ${e.branch}` : "",
      e.cgpa ? `with a CGPA of ${e.cgpa}` : "",
    ].filter(Boolean);
    chunks.push({
      sourceType: "education",
      sourceId: e.id,
      content: parts.join(" "),
    });
  }

  // --- Experience (one chunk per entry) ---
  const experience = await env.DB.prepare(
    `SELECT id, company, role, description FROM experience WHERE profile_id = ?`
  )
    .bind(profileId)
    .all<{ id: string; company: string; role: string | null; description: string | null }>();

  for (const e of experience.results) {
    const parts = [
      `Worked at ${e.company}`,
      e.role ? `as ${e.role}` : "",
      e.description ? `. ${e.description}` : "",
    ].filter(Boolean);
    chunks.push({
      sourceType: "experience",
      sourceId: e.id,
      content: parts.join(" "),
    });
  }

  // --- Projects (one chunk per project — most important for AI) ---
  const projects = await env.DB.prepare(
    `SELECT id, name, short_description, description, problem, solution, tech_stack, role
     FROM projects WHERE profile_id = ?`
  )
    .bind(profileId)
    .all<{
      id: string;
      name: string;
      short_description: string | null;
      description: string | null;
      problem: string | null;
      solution: string | null;
      tech_stack: string | null;
      role: string | null;
    }>();

  for (const p of projects.results) {
    const parts = [
      `Project: ${p.name}`,
      p.short_description ? `. ${p.short_description}` : "",
      p.description ? `. ${p.description}` : "",
      p.problem ? `. Problem solved: ${p.problem}` : "",
      p.solution ? `. Solution: ${p.solution}` : "",
      p.tech_stack ? `. Built with: ${p.tech_stack}` : "",
      p.role ? `. Role: ${p.role}` : "",
    ].filter(Boolean);
    chunks.push({
      sourceType: "project",
      sourceId: p.id,
      content: parts.join(""),
    });
  }

  // --- Achievements (one chunk per entry) ---
  const achievements = await env.DB.prepare(
    `SELECT id, title, type, description FROM achievements WHERE profile_id = ?`
  )
    .bind(profileId)
    .all<{ id: string; title: string; type: string | null; description: string | null }>();

  for (const a of achievements.results) {
    const parts = [
      `Achievement: ${a.title}`,
      a.type ? `(${a.type})` : "",
      a.description ? `. ${a.description}` : "",
    ].filter(Boolean);
    chunks.push({
      sourceType: "achievement",
      sourceId: a.id,
      content: parts.join(" "),
    });
  }

  // --- Clear old chunks for this profile before re-syncing ---
  const oldChunks = await env.DB.prepare(
    `SELECT vector_id FROM knowledge_chunks WHERE profile_id = ?`
  )
    .bind(profileId)
    .all<{ vector_id: string }>();

  if (oldChunks.results.length > 0) {
    await env.VECTORIZE.deleteByIds(oldChunks.results.map((c) => c.vector_id));
    await env.DB.prepare(`DELETE FROM knowledge_chunks WHERE profile_id = ?`)
      .bind(profileId)
      .run();
  }

  // --- Embed and store each new chunk ---
  const now = new Date().toISOString();
  let count = 0;

  for (const chunk of chunks) {
    const vectorId = crypto.randomUUID();
    const embedding = await embedText(env, chunk.content);

    await env.VECTORIZE.insert([
      {
        id: vectorId,
        values: embedding,
        metadata: {
          profile_id: profileId,
          source_type: chunk.sourceType,
          source_id: chunk.sourceId ?? "",
        },
      },
    ]);

    await env.DB.prepare(
      `INSERT INTO knowledge_chunks (id, profile_id, source_type, source_id, content, vector_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        crypto.randomUUID(),
        profileId,
        chunk.sourceType,
        chunk.sourceId,
        chunk.content,
        vectorId,
        now
      )
      .run();

    count++;
  }

  return { chunksCreated: count };
}