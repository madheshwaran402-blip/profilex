import type { Env } from "../index";
import { requireAuth } from "../middleware/auth";
import { getProfileIdForUser } from "../profile/helpers";

import { jsonResponse as json } from "../lib/cors";

const MAX_QUESTIONS = 5;
const VALID_TYPES = ["general", "technical", "hr"];

async function buildProfileContext(env: Env, profileId: string): Promise<string> {
  const chunks = await env.DB.prepare(
    `SELECT content FROM knowledge_chunks WHERE profile_id = ? LIMIT 20`
  )
    .bind(profileId)
    .all<{ content: string }>();

  return chunks.results.map((c) => `- ${c.content}`).join("\n");
}

async function askLLM(env: Env, systemPrompt: string, userPrompt: string): Promise<string> {
  const result = (await env.AI.run("@cf/meta/llama-3.1-8b-instruct-fast", {
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  })) as { response: string };
  return result.response;
}

export async function handleInterviewRoutes(
  request: Request,
  env: Env,
  url: URL
): Promise<Response | null> {
  // POST /api/interview/start
  if (url.pathname === "/api/interview/start" && request.method === "POST") {
    const auth = await requireAuth(request, env);
    if ("error" in auth) return auth.error;

    const profileId = await getProfileIdForUser(env, auth.userId);
    if (!profileId) return json({ error: "profile not found" }, 404);

    const body = (await request.json()) as { type?: string };
    const interviewType = body.type && VALID_TYPES.includes(body.type) ? body.type : "general";

    const context = await buildProfileContext(env, profileId);
    if (!context) {
      return json(
        { error: "add some profile data (skills, projects) before starting an interview" },
        400
      );
    }

    const sessionId = crypto.randomUUID();
    const now = new Date().toISOString();

    await env.DB.prepare(
      `INSERT INTO interview_sessions (id, profile_id, type, status, question_count, started_at)
       VALUES (?, ?, ?, 'active', 1, ?)`
    )
      .bind(sessionId, profileId, interviewType, now)
      .run();

    const systemPrompt = `You are a ${interviewType} interviewer. Ask ONE clear, specific interview question based on the candidate's profile below. Do not greet, do not explain, output ONLY the question itself.
Profile context:
${context}`;

    const question = await askLLM(env, systemPrompt, "Ask the first interview question.");

    await env.DB.prepare(
      `INSERT INTO interview_messages (id, session_id, role, content, created_at)
       VALUES (?, ?, 'assistant', ?, ?)`
    )
      .bind(crypto.randomUUID(), sessionId, question, now)
      .run();

    return json({ session_id: sessionId, question, question_number: 1 });
  }

  // POST /api/interview/answer
  if (url.pathname === "/api/interview/answer" && request.method === "POST") {
    const auth = await requireAuth(request, env);
    if ("error" in auth) return auth.error;

    const profileId = await getProfileIdForUser(env, auth.userId);
    if (!profileId) return json({ error: "profile not found" }, 404);

    const body = (await request.json()) as { session_id?: string; answer?: string };
    if (!body.session_id || !body.answer) {
      return json({ error: "session_id and answer are required" }, 400);
    }

    const session = await env.DB.prepare(
      `SELECT id, type, status, question_count FROM interview_sessions WHERE id = ? AND profile_id = ?`
    )
      .bind(body.session_id, profileId)
      .first<{ id: string; type: string; status: string; question_count: number }>();

    if (!session) return json({ error: "interview session not found" }, 404);
    if (session.status !== "active") return json({ error: "this interview has already ended" }, 400);

    const now = new Date().toISOString();

    await env.DB.prepare(
      `INSERT INTO interview_messages (id, session_id, role, content, created_at)
       VALUES (?, ?, 'user', ?, ?)`
    )
      .bind(crypto.randomUUID(), session.id, body.answer, now)
      .run();

    if (session.question_count >= MAX_QUESTIONS) {
      await env.DB.prepare(
        `UPDATE interview_sessions SET status = 'completed', completed_at = ? WHERE id = ?`
      )
        .bind(now, session.id)
        .run();

      return json({
        session_id: session.id,
        done: true,
        message: "Interview complete. Thanks for your answers!",
      });
    }

    const context = await buildProfileContext(env, profileId);

    const history = await env.DB.prepare(
      `SELECT role, content FROM interview_messages WHERE session_id = ? ORDER BY created_at ASC`
    )
      .bind(session.id)
      .all<{ role: string; content: string }>();

    const historyText = history.results
      .map((m) => `${m.role === "assistant" ? "Interviewer" : "Candidate"}: ${m.content}`)
      .join("\n");

    const systemPrompt = `You are a ${session.type} interviewer. Based on the conversation so far and the candidate's profile, ask the NEXT single interview question. It can build on their previous answer. Do not repeat earlier questions. Output ONLY the question.
Profile context:
${context}`;

    const nextQuestion = await askLLM(
      env,
      systemPrompt,
      `Conversation so far:\n${historyText}\n\nAsk the next question.`
    );

    const newCount = session.question_count + 1;

    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO interview_messages (id, session_id, role, content, created_at)
         VALUES (?, ?, 'assistant', ?, ?)`
      ).bind(crypto.randomUUID(), session.id, nextQuestion, now),

      env.DB.prepare(
        `UPDATE interview_sessions SET question_count = ? WHERE id = ?`
      ).bind(newCount, session.id),
    ]);

    return json({
      session_id: session.id,
      done: false,
      question: nextQuestion,
      question_number: newCount,
    });
  }

  // GET /api/interview/history — list past sessions
  if (url.pathname === "/api/interview/history" && request.method === "GET") {
    const auth = await requireAuth(request, env);
    if ("error" in auth) return auth.error;

    const profileId = await getProfileIdForUser(env, auth.userId);
    if (!profileId) return json({ error: "profile not found" }, 404);

    const sessions = await env.DB.prepare(
      `SELECT id, type, status, question_count, started_at, completed_at
       FROM interview_sessions WHERE profile_id = ? ORDER BY started_at DESC`
    )
      .bind(profileId)
      .all();

    return json({ sessions: sessions.results });
  }

  return null;
}