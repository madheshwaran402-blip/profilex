const API_BASE = "http://localhost:8787";

export interface SignupResponse {
  success: boolean;
  user: { id: string; username: string; email: string };
  session_token: string;
}

export interface Profile {
  id: string;
  name: string;
  title: string;
  location: string;
  about: string;
  photo_url: string;
  ai_personality: string;
  slug: string;
}

export async function signup(
  email: string,
  username: string,
  password: string
): Promise<SignupResponse> {
  const res = await fetch(`${API_BASE}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, username, password }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "signup failed");
  }
  return res.json();
}

export async function login(
  email: string,
  password: string
): Promise<SignupResponse> {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "login failed");
  }
  return res.json();
}

export async function getProfile(token: string): Promise<{ profile: Profile }> {
  const res = await fetch(`${API_BASE}/api/profile`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "failed to load profile");
  }
  return res.json();
}

export async function updateProfile(
  token: string,
  updates: Partial<Profile>
): Promise<{ profile: Profile }> {
  const res = await fetch(`${API_BASE}/api/profile`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "failed to update profile");
  }
  return res.json();
}

export interface Education {
  id: string;
  institution: string;
  degree: string | null;
  branch: string | null;
  cgpa: string | null;
}

export interface Skill {
  id: string;
  name: string;
  category: string | null;
  proficiency: number | null;
}

export async function getEducation(token: string): Promise<{ education: Education[] }> {
  const res = await fetch(`${API_BASE}/api/education`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("failed to load education");
  return res.json();
}

export async function addEducation(
  token: string,
  data: { institution: string; degree?: string; branch?: string; cgpa?: string }
): Promise<{ success: boolean; id: string }> {
  const res = await fetch(`${API_BASE}/api/education`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "failed to add education");
  }
  return res.json();
}

export async function deleteEducation(token: string, id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/education/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("failed to delete education");
}

export async function getSkills(token: string): Promise<{ skills: Skill[] }> {
  const res = await fetch(`${API_BASE}/api/skills`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("failed to load skills");
  return res.json();
}

export async function addSkill(
  token: string,
  data: { name: string; category?: string; proficiency?: number }
): Promise<{ success: boolean; id: string }> {
  const res = await fetch(`${API_BASE}/api/skills`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "failed to add skill");
  }
  return res.json();
}

export async function deleteSkill(token: string, id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/skills/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("failed to delete skill");
}