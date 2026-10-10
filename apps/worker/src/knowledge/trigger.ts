import type { Env } from "../index";
import { syncProfileKnowledge } from "./sync";

// Fire-and-forget style sync — call this after any mutation
// to skills/education/experience/projects/achievements.
// Uses ctx.waitUntil pattern via direct await since Workers AI
// calls are already async or fast for the content sizes these forms produce.
export async function triggerKnowledgeSync(env: Env, profileId: string): Promise<void> {
  try {
    await syncProfileKnowledge(env, profileId);
  } catch (err) {
    // Don't let a sync failure break the actual CRUD operation
    console.error("Knowledge sync failed:", err);
  }
}