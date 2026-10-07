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

export interface Experience {
  id: string;
  company: string;
  role: string | null;
  start_date: string | null;
  end_date: string | null;
}

export interface Achievement {
  id: string;
  title: string;
  type: string | null;
  date: string | null;
}

export async function getExperience(token: string): Promise<{ experience: Experience[] }> {
  const res = await fetch(`${API_BASE}/api/experience`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("failed to load experience");
  return res.json();
}

export async function addExperience(
  token: string,
  data: { company: string; role?: string; start_date?: string; end_date?: string }
): Promise<{ success: boolean; id: string }> {
  const res = await fetch(`${API_BASE}/api/experience`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "failed to add experience");
  }
  return res.json();
}

export async function deleteExperience(token: string, id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/experience/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("failed to delete experience");
}

export async function getAchievements(token: string): Promise<{ achievements: Achievement[] }> {
  const res = await fetch(`${API_BASE}/api/achievements`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("failed to load achievements");
  return res.json();
}

export async function addAchievement(
  token: string,
  data: { title: string; type?: string; date?: string }
): Promise<{ success: boolean; id: string }> {
  const res = await fetch(`${API_BASE}/api/achievements`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "failed to add achievement");
  }
  return res.json();
}

export async function deleteAchievement(token: string, id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/achievements/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("failed to delete achievement");
}

export interface Project {
  id: string;
  name: string;
  short_description: string | null;
  tech_stack: string | null;
  github_url: string | null;
  demo_url: string | null;
  featured: number;
}

export async function getProjects(token: string): Promise<{ projects: Project[] }> {
  const res = await fetch(`${API_BASE}/api/projects`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("failed to load projects");
  return res.json();
}

export async function addProject(
  token: string,
  data: {
    name: string;
    short_description?: string;
    tech_stack?: string;
    github_url?: string;
    demo_url?: string;
    featured?: boolean;
  }
): Promise<{ success: boolean; id: string }> {
  const res = await fetch(`${API_BASE}/api/projects`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "failed to add project");
  }
  return res.json();
}

export async function deleteProject(token: string, id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/projects/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("failed to delete project");
}