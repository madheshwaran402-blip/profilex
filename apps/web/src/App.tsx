import { useState, useEffect } from "react";
import {
  signup,
  login,
  getProfile,
  updateProfile,
  getEducation,
  addEducation,
  deleteEducation,
  getSkills,
  addSkill,
  deleteSkill,
  type Profile,
  type Education,
  type Skill,
} from "./lib/api";

function App() {
  const [token, setToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState("");

  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [title, setTitle] = useState("");
  const [about, setAbout] = useState("");

  const [education, setEducation] = useState<Education[]>([]);
  const [institution, setInstitution] = useState("");
  const [degree, setDegree] = useState("");

  const [skills, setSkills] = useState<Skill[]>([]);
  const [skillName, setSkillName] = useState("");
  const [skillCategory, setSkillCategory] = useState("");

  async function loadEverything(tok: string) {
    const { profile } = await getProfile(tok);
    setProfile(profile);
    setTitle(profile.title || "");
    setAbout(profile.about || "");

    const { education } = await getEducation(tok);
    setEducation(education);

    const { skills } = await getSkills(tok);
    setSkills(skills);
  }

  async function handleAuth() {
    setError("");
    try {
      const result =
        mode === "signup"
          ? await signup(email, username, password)
          : await login(email, password);
      setToken(result.session_token);
      await loadEverything(result.session_token);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function handleSaveProfile() {
    if (!token) return;
    const { profile } = await updateProfile(token, { title, about });
    setProfile(profile);
  }

  async function handleAddEducation() {
    if (!token || !institution) return;
    await addEducation(token, { institution, degree });
    setInstitution("");
    setDegree("");
    const { education } = await getEducation(token);
    setEducation(education);
  }

  async function handleDeleteEducation(id: string) {
    if (!token) return;
    await deleteEducation(token, id);
    const { education } = await getEducation(token);
    setEducation(education);
  }

  async function handleAddSkill() {
    if (!token || !skillName) return;
    await addSkill(token, { name: skillName, category: skillCategory });
    setSkillName("");
    setSkillCategory("");
    const { skills } = await getSkills(token);
    setSkills(skills);
  }

  async function handleDeleteSkill(id: string) {
    if (!token) return;
    await deleteSkill(token, id);
    const { skills } = await getSkills(token);
    setSkills(skills);
  }

  if (!token || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="bg-slate-800 p-8 rounded-xl w-96 flex flex-col gap-3">
          <h1 className="text-2xl font-bold text-cyan-400 mb-2">
            ProfileX — {mode === "signup" ? "Sign Up" : "Log In"}
          </h1>
          <input
            className="bg-slate-700 text-white rounded px-3 py-2"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {mode === "signup" && (
            <input
              className="bg-slate-700 text-white rounded px-3 py-2"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          )}
          <input
            className="bg-slate-700 text-white rounded px-3 py-2"
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            onClick={handleAuth}
            className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold rounded px-3 py-2 mt-2"
          >
            {mode === "signup" ? "Sign Up" : "Log In"}
          </button>
          <button
            onClick={() => setMode(mode === "signup" ? "login" : "signup")}
            className="text-slate-400 text-sm mt-1"
          >
            {mode === "signup"
              ? "Already have an account? Log in"
              : "Need an account? Sign up"}
          </button>
          {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 py-10 flex justify-center">
      <div className="w-[36rem] flex flex-col gap-6">
        <div className="bg-slate-800 p-6 rounded-xl flex flex-col gap-3">
          <h1 className="text-2xl font-bold text-cyan-400">
            {profile.name}'s Profile
          </h1>
          <p className="text-slate-400 text-sm">profilex.app/{profile.slug}</p>
          <label className="text-slate-300 text-sm">Title</label>
          <input
            className="bg-slate-700 text-white rounded px-3 py-2"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <label className="text-slate-300 text-sm">About</label>
          <textarea
            className="bg-slate-700 text-white rounded px-3 py-2 h-24"
            value={about}
            onChange={(e) => setAbout(e.target.value)}
          />
          <button
            onClick={handleSaveProfile}
            className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold rounded px-3 py-2"
          >
            Save Profile
          </button>
        </div>

        <div className="bg-slate-800 p-6 rounded-xl flex flex-col gap-3">
          <h2 className="text-xl font-bold text-cyan-400">Education</h2>
          {education.map((e) => (
            <div
              key={e.id}
              className="bg-slate-700 rounded px-3 py-2 flex justify-between items-center"
            >
              <span className="text-white text-sm">
                {e.institution} {e.degree && `— ${e.degree}`}
              </span>
              <button
                onClick={() => handleDeleteEducation(e.id)}
                className="text-red-400 text-xs"
              >
                Delete
              </button>
            </div>
          ))}
          <input
            className="bg-slate-700 text-white rounded px-3 py-2"
            placeholder="Institution"
            value={institution}
            onChange={(e) => setInstitution(e.target.value)}
          />
          <input
            className="bg-slate-700 text-white rounded px-3 py-2"
            placeholder="Degree"
            value={degree}
            onChange={(e) => setDegree(e.target.value)}
          />
          <button
            onClick={handleAddEducation}
            className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold rounded px-3 py-2"
          >
            Add Education
          </button>
        </div>

        <div className="bg-slate-800 p-6 rounded-xl flex flex-col gap-3">
          <h2 className="text-xl font-bold text-cyan-400">Skills</h2>
          <div className="flex flex-wrap gap-2">
            {skills.map((s) => (
              <span
                key={s.id}
                className="bg-slate-700 text-white text-sm rounded-full px-3 py-1 flex items-center gap-2"
              >
                {s.name}
                <button
                  onClick={() => handleDeleteSkill(s.id)}
                  className="text-red-400 text-xs"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
          <input
            className="bg-slate-700 text-white rounded px-3 py-2"
            placeholder="Skill name"
            value={skillName}
            onChange={(e) => setSkillName(e.target.value)}
          />
          <input
            className="bg-slate-700 text-white rounded px-3 py-2"
            placeholder="Category (optional)"
            value={skillCategory}
            onChange={(e) => setSkillCategory(e.target.value)}
          />
          <button
            onClick={handleAddSkill}
            className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold rounded px-3 py-2"
          >
            Add Skill
          </button>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}
      </div>
    </div>
  );
}

export default App;