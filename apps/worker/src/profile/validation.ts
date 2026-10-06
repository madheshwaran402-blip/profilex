export interface ProfileUpdateInput {
  name?: string;
  title?: string;
  location?: string;
  about?: string;
  photo_url?: string;
  ai_personality?: string;
}

const VALID_PERSONALITIES = [
  "professional",
  "friendly",
  "technical",
  "concise",
  "academic",
];

export function validateProfileUpdate(
  body: ProfileUpdateInput
): string | null {
  if (body.name !== undefined && body.name.length > 100) {
    return "name must be 100 characters or fewer";
  }
  if (body.title !== undefined && body.title.length > 150) {
    return "title must be 150 characters or fewer";
  }
  if (body.location !== undefined && body.location.length > 100) {
    return "location must be 100 characters or fewer";
  }
  if (body.about !== undefined && body.about.length > 2000) {
    return "about must be 2000 characters or fewer";
  }
  if (
    body.ai_personality !== undefined &&
    !VALID_PERSONALITIES.includes(body.ai_personality)
  ) {
    return `ai_personality must be one of: ${VALID_PERSONALITIES.join(", ")}`;
  }
  return null;
}