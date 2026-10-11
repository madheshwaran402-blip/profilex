import { extractText, getDocumentProxy } from "unpdf";
import type { Env } from "../index";
import { requireAuth } from "../middleware/auth";
import { getProfileIdForUser } from "../profile/helpers";

import { jsonResponse as json } from "../lib/cors";

interface ParsedSuggestion {
  skills: string[];
  education: { institution: string; degree?: string; branch?: string }[];
  experience: { company: string; role?: string }[];
  projects: { name: string; short_description?: string }[];
}

export async function handleResumeRoutes(
  request: Request,
  env: Env,
  url: URL
): Promise<Response | null> {
  // POST /api/resume/upload — upload + extract + AI-parse a resume PDF
  if (url.pathname === "/api/resume/upload" && request.method === "POST") {
    const auth = await requireAuth(request, env);
    if ("error" in auth) return auth.error;

    const profileId = await getProfileIdForUser(env, auth.userId);
    if (!profileId) return json({ error: "profile not found" }, 404);

    const contentType = request.headers.get("Content-Type") ?? "";
    if (contentType !== "application/pdf") {
      return json({ error: "file must be a PDF" }, 400);
    }

    const bodyBuffer = await request.arrayBuffer();
    if (bodyBuffer.byteLength > 5 * 1024 * 1024) {
      return json({ error: "file must be under 5MB" }, 400);
    }
    if (bodyBuffer.byteLength === 0) {
      return json({ error: "file is empty" }, 400);
    }

    const r2Key = `profiles/${profileId}/documents/resume.pdf`;
    await env.FILES.put(r2Key, bodyBuffer, {
      httpMetadata: { contentType: "application/pdf" },
    });

    const docId = crypto.randomUUID();
    const now = new Date().toISOString();

    await env.DB.prepare(
      `INSERT INTO documents (id, profile_id, filename, r2_key, doc_type, processing_status, created_at)
       VALUES (?, ?, 'resume.pdf', ?, 'resume', 'processing', ?)`
    )
      .bind(docId, profileId, r2Key, now)
      .run();

    // Extract text from the PDF
    let resumeText: string;
    try {
      const pdf = await getDocumentProxy(new Uint8Array(bodyBuffer));
      const { text } = await extractText(pdf, { mergePages: true });
      resumeText = text.slice(0, 6000); // cap to keep the LLM prompt reasonable
    } catch {
      await env.DB.prepare(`UPDATE documents SET processing_status = 'failed' WHERE id = ?`)
        .bind(docId)
        .run();
      return json({ error: "could not extract text from this PDF" }, 400);
    }

    if (!resumeText || resumeText.trim().length < 50) {
      await env.DB.prepare(`UPDATE documents SET processing_status = 'failed' WHERE id = ?`)
        .bind(docId)
        .run();
      return json({ error: "this PDF appears to have no readable text (may be a scanned image)" }, 400);
    }

    // Ask the LLM to extract structured data as JSON
    const systemPrompt = `Extract structured resume information as JSON ONLY, no other text, no markdown formatting, matching exactly this shape:
{
  "skills": ["skill1", "skill2"],
  "education": [{"institution": "...", "degree": "...", "branch": "..."}],
  "experience": [{"company": "...", "role": "..."}],
  "projects": [{"name": "...", "short_description": "..."}]
}
If a field isn't present in the resume, omit it or use an empty array. Output ONLY valid JSON.`;

    const llmResult = (await env.AI.run("@cf/meta/llama-3.1-8b-instruct-fast", {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: resumeText },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          type: "object",
          properties: {
            skills: { type: "array", items: { type: "string" } },
            education: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  institution: { type: "string" },
                  degree: { type: "string" },
                  branch: { type: "string" },
                },
                required: ["institution"],
              },
            },
            experience: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  company: { type: "string" },
                  role: { type: "string" },
                },
                required: ["company"],
              },
            },
            projects: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  short_description: { type: "string" },
                },
                required: ["name"],
              },
            },
          },
          required: ["skills", "education", "experience", "projects"],
        },
      },
    })) as { response: ParsedSuggestion };

    const parsed: ParsedSuggestion = llmResult.response;

    await env.DB.prepare(`UPDATE documents SET processing_status = 'completed' WHERE id = ?`)
      .bind(docId)
      .run();

    return json({
      success: true,
      document_id: docId,
      suggestions: {
        skills: parsed.skills ?? [],
        education: parsed.education ?? [],
        experience: parsed.experience ?? [],
        projects: parsed.projects ?? [],
      },
    });
  }

  // POST /api/resume/generate — AI-tailored resume for a target job
  if (url.pathname === "/api/resume/generate" && request.method === "POST") {
    const auth = await requireAuth(request, env);
    if ("error" in auth) return auth.error;

    const profileId = await getProfileIdForUser(env, auth.userId);
    if (!profileId) return json({ error: "profile not found" }, 404);

    const body = (await request.json()) as { target?: string };
    if (!body.target || body.target.trim().length < 2) {
      return json({ error: "target job type or description is required" }, 400);
    }

    const profile = await env.DB.prepare(
      `SELECT name, title, about FROM profiles WHERE id = ?`
    )
      .bind(profileId)
      .first<{ name: string; title: string; about: string }>();

    const skills = await env.DB.prepare(
      `SELECT name, category FROM skills WHERE profile_id = ?`
    )
      .bind(profileId)
      .all<{ name: string; category: string | null }>();

    const education = await env.DB.prepare(
      `SELECT institution, degree, branch, cgpa FROM education WHERE profile_id = ?`
    )
      .bind(profileId)
      .all<{ institution: string; degree: string | null; branch: string | null; cgpa: string | null }>();

    const experience = await env.DB.prepare(
      `SELECT company, role, description FROM experience WHERE profile_id = ?`
    )
      .bind(profileId)
      .all<{ company: string; role: string | null; description: string | null }>();

    const projects = await env.DB.prepare(
      `SELECT name, short_description, description, tech_stack, role FROM projects WHERE profile_id = ?`
    )
      .bind(profileId)
      .all<{ name: string; short_description: string | null; description: string | null; tech_stack: string | null; role: string | null }>();

    const achievements = await env.DB.prepare(
      `SELECT title, type, description FROM achievements WHERE profile_id = ?`
    )
      .bind(profileId)
      .all<{ title: string; type: string | null; description: string | null }>();

    if (skills.results.length === 0 && projects.results.length === 0) {
      return json({ error: "add some skills or projects before generating a resume" }, 400);
    }

    const sourceData = {
      profile,
      skills: skills.results,
      education: education.results,
      experience: experience.results,
      projects: projects.results,
      achievements: achievements.results,
    };

    const systemPrompt = `You are a resume-tailoring assistant. You will receive a candidate's ACTUAL profile data (skills, education, experience, projects, achievements) and a target job/role.

RULES:
- You may ONLY select, reorder, and rephrase information that already exists in the supplied data.
- NEVER invent a skill, project, company, degree, or achievement that is not present in the data.
- Select and order skills/projects/experience that are MOST RELEVANT to the target job first.
- Write a short 2-3 sentence professional summary synthesizing only the supplied facts, tailored to the target job.
- If the data has nothing relevant to a section (e.g. no experience), return an empty array for it — do not fabricate.
- Output valid JSON only, matching the required schema.`;

    const llmResult = (await env.AI.run("@cf/meta/llama-3.1-8b-instruct-fast", {
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Target job/role: ${body.target}\n\nCandidate data:\n${JSON.stringify(sourceData)}`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          type: "object",
          properties: {
            summary: { type: "string" },
            skills: { type: "array", items: { type: "string" } },
            education: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  institution: { type: "string" },
                  degree: { type: "string" },
                  branch: { type: "string" },
                },
              },
            },
            experience: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  company: { type: "string" },
                  role: { type: "string" },
                  description: { type: "string" },
                },
              },
            },
            projects: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  description: { type: "string" },
                  tech_stack: { type: "string" },
                },
              },
            },
          },
          required: ["summary", "skills", "education", "experience", "projects"],
        },
      },
    })) as {
      response: {
        summary: string;
        skills: string[];
        education: { institution: string; degree?: string; branch?: string }[];
        experience: { company: string; role?: string; description?: string }[];
        projects: { name: string; description?: string; tech_stack?: string }[];
      };
    };

    return json({
      success: true,
      name: profile?.name,
      title: profile?.title,
      resume: llmResult.response,
    });
  }

  return null;
}