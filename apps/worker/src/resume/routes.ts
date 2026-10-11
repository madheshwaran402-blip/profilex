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

  return null;
}