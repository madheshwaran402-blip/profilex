// Rules: 3-30 chars, lowercase letters/numbers/hyphens only,
// can't start/end with a hyphen, no reserved words.

const RESERVED_USERNAMES = [
  "admin", "api", "www", "app", "dashboard", "login", "signup",
  "logout", "settings", "profile", "profilex", "support", "help",
  "about", "contact", "chat", "interview", "resume", "p",
];

export function validateUsername(username: string): string | null {
  const normalized = username.toLowerCase();

  if (normalized.length < 3 || normalized.length > 30) {
    return "username must be between 3 and 30 characters";
  }
  if (!/^[a-z0-9-]+$/.test(normalized)) {
    return "username can only contain lowercase letters, numbers, and hyphens";
  }
  if (normalized.startsWith("-") || normalized.endsWith("-")) {
    return "username cannot start or end with a hyphen";
  }
  if (RESERVED_USERNAMES.includes(normalized)) {
    return "this username is reserved";
  }

  return null; // null means valid
}