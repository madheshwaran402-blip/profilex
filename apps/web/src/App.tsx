import { useState, useEffect } from "react";
import Interview from "./Interview";
import ResumeImport from "./ResumeImport";
import ResumeGenerator from "./ResumeGenerator";
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
  getExperience,
  addExperience,
  deleteExperience,
  getAchievements,
  addAchievement,
  deleteAchievement,
  getProjects,
  addProject,
  deleteProject,
  uploadProfilePhoto,
  togglePublish,
  updateTheme,
  syncKnowledge,
  getAnalytics,
  logout,
  type Profile,
  type Education,
  type Skill,
  type Experience,
  type Achievement,
  type Project,
  type AnalyticsData,
} from "./lib/api";
import { THEME_PRESETS } from "./lib/themes";

function App() {
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem("profilex_token")
  );
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

  const [experience, setExperience] = useState<Experience[]>([]);
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");

  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [achTitle, setAchTitle] = useState("");
  const [achType, setAchType] = useState("");

  const [projects, setProjects] = useState<Project[]>([]);
  const [projectName, setProjectName] = useState("");
  const [projectDesc, setProjectDesc] = useState("");
  const [projectTech, setProjectTech] = useState("");
  const [projectGithub, setProjectGithub] = useState("");

  const [syncStatus, setSyncStatus] = useState("");
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);

  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    if (token && !profile) {
      loadEverything(token).catch(() => {
        localStorage.removeItem("profilex_token");
        setToken(null);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadEverything(tok: string) {
    const { profile } = await getProfile(tok);
    setProfile(profile);
    setTitle(profile.title || "");
    setAbout(profile.about || "");
    setDisplayName(profile.name || "");

    setEducation((await getEducation(tok)).education);
    setSkills((await getSkills(tok)).skills);
    setExperience((await getExperience(tok)).experience);
    setAchievements((await getAchievements(tok)).achievements);
    setProjects((await getProjects(tok)).projects);
    setAnalytics(await getAnalytics(tok));
  }

  async function handleAuth() {
    setError("");
    try {
      const result =
        mode === "signup"
          ? await signup(email, username, password)
          : await login(email, password);
      localStorage.setItem("profilex_token", result.session_token);
      setToken(result.session_token);
      await loadEverything(result.session_token);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function handleLogout() {
    if (token) {
      await logout(token).catch(() => {});
    }
    localStorage.removeItem("profilex_token");
    setToken(null);
    setProfile(null);
  }

  async function handleSaveProfile() {
    if (!token) return;
    const { profile } = await updateProfile(token, { name: displayName, about });
    setProfile(profile);
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!token || !e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    try {
      const result = await uploadProfilePhoto(token, file);
      setProfile((prev) => (prev ? { ...prev, photo_url: result.photo_url } : prev));
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleTogglePublish() {
    if (!token || !profile) return;
    const newState = !profile.published;
    const result = await togglePublish(token, newState);
    setProfile((prev) => (prev ? { ...prev, published: result.published ? 1 : 0 } : prev));
  }

  async function handleThemeChange(preset: string) {
    if (!token) return;
    await updateTheme(token, preset);
    setProfile((prev) =>
      prev ? { ...prev, theme_config: JSON.stringify({ preset }) } : prev
    );
  }

  async function handleManualSync() {
    if (!token) return;
    setSyncStatus("Syncing...");
    try {
      const result = await syncKnowledge(token);
      setSyncStatus(`Synced ${result.chunks_created} knowledge chunks`);
    } catch {
      setSyncStatus("Sync failed");
    }
  }

  async function handleResumeImported() {
    if (!token) return;
    setEducation((await getEducation(token)).education);
    setSkills((await getSkills(token)).skills);
    setExperience((await getExperience(token)).experience);
    setProjects((await getProjects(token)).projects);
  }

  async function handleAddEducation() {
    if (!token || !institution) return;
    await addEducation(token, { institution, degree });
    setInstitution("");
    setDegree("");
    setEducation((await getEducation(token)).education);
  }

  async function handleDeleteEducation(id: string) {
    if (!token) return;
    await deleteEducation(token, id);
    setEducation((await getEducation(token)).education);
  }

  async function handleAddSkill() {
    if (!token || !skillName) return;
    await addSkill(token, { name: skillName, category: skillCategory });
    setSkillName("");
    setSkillCategory("");
    setSkills((await getSkills(token)).skills);
  }

  async function handleDeleteSkill(id: string) {
    if (!token) return;
    await deleteSkill(token, id);
    setSkills((await getSkills(token)).skills);
  }

  async function handleAddExperience() {
    if (!token || !company) return;
    await addExperience(token, { company, role });
    setCompany("");
    setRole("");
    setExperience((await getExperience(token)).experience);
  }

  async function handleDeleteExperience(id: string) {
    if (!token) return;
    await deleteExperience(token, id);
    setExperience((await getExperience(token)).experience);
  }

  async function handleAddAchievement() {
    if (!token || !achTitle) return;
    await addAchievement(token, { title: achTitle, type: achType || undefined });
    setAchTitle("");
    setAchType("");
    setAchievements((await getAchievements(token)).achievements);
  }

  async function handleDeleteAchievement(id: string) {
    if (!token) return;
    await deleteAchievement(token, id);
    setAchievements((await getAchievements(token)).achievements);
  }

  async function handleAddProject() {
    if (!token || !projectName) return;
    await addProject(token, {
      name: projectName,
      short_description: projectDesc,
      tech_stack: projectTech,
      github_url: projectGithub,
    });
    setProjectName("");
    setProjectDesc("");
    setProjectTech("");
    setProjectGithub("");
    setProjects((await getProjects(token)).projects);
  }

  async function handleDeleteProject(id: string) {
    if (!token) return;
    await deleteProject(token, id);
    setProjects((await getProjects(token)).projects);
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

  const currentPreset = JSON.parse(profile.theme_config || '{"preset":"cyan"}').preset;

  return (
    <div className="min-h-screen bg-slate-900 py-10 flex justify-center">
      <div className="w-full max-w-xl px-4 flex flex-col gap-6">
        <div className="bg-slate-800 p-8 rounded-xl w-full max-w-sm mx-4 flex flex-col gap-3">
          <div className="flex justify-between items-start">
            <h1 className="text-2xl font-bold text-cyan-400">
              {profile.name}'s Profile
            </h1>
            <button
              onClick={handleLogout}
              className="text-slate-400 hover:text-white text-sm underline"
            >
              Log out
            </button>
          </div>
          <p className="text-slate-400 text-sm">profilex.app/{profile.slug}</p>

          {profile.photo_url && (
            <img
  src={`https://profilex-worker.madheshwaran402.workers.dev${profile.photo_url}`}
              alt="Profile"
              className="w-20 h-20 rounded-full object-cover mb-2"
            />
          )}
          <label className="text-slate-300 text-sm">Profile Photo</label>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handlePhotoUpload}
            className="text-slate-300 text-sm"
          />

<label className="text-slate-300 text-sm">Display Name</label>
          <input
            className="bg-slate-700 text-white rounded px-3 py-2"
            placeholder="How your name should appear (e.g. Madheshwaran)"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />

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

          <div className="flex items-center justify-between mt-2 pt-3 border-t border-slate-700">
            <span className="text-slate-300 text-sm">
              Status: {profile.published ? "Published" : "Draft"}
            </span>
            <button
              onClick={handleTogglePublish}
              className={`font-bold rounded px-3 py-1 text-sm ${
                profile.published
                  ? "bg-slate-600 text-white hover:bg-slate-500"
                  : "bg-green-500 text-slate-900 hover:bg-green-400"
              }`}
            >
              {profile.published ? "Unpublish" : "Publish"}
            </button>
          </div>

          {profile.published === 1 && (
            <a
              href={`/p/${profile.slug}`}
              target="_blank"
              rel="noreferrer"
              className="text-cyan-400 text-xs underline"
            >
              View public page →
            </a>
          )}

          <label className="text-slate-300 text-sm mt-2">Theme</label>
          <div className="flex gap-2 flex-wrap">
            {Object.entries(THEME_PRESETS).map(([key, preset]) => (
              <button
                key={key}
                onClick={() => handleThemeChange(key)}
                className={`${preset.accentHover} rounded px-3 py-1 text-xs font-semibold text-slate-900 ${
                  currentPreset === key ? "ring-2 ring-white" : ""
                }`}
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        {analytics && (
          <div className="bg-slate-800 p-6 rounded-xl flex flex-col gap-3">
            <h2 className="text-xl font-bold text-cyan-400">Analytics</h2>
            <div className="flex gap-6">
              <div>
                <p className="text-3xl font-bold text-white">{analytics.total_views}</p>
                <p className="text-slate-400 text-sm">Profile Views</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-white">{analytics.total_chat_messages}</p>
                <p className="text-slate-400 text-sm">AI Conversations</p>
              </div>
            </div>
          </div>
        )}

        <ResumeImport token={token} onImported={handleResumeImported} />
        <ResumeGenerator token={token} />

        <div className="bg-slate-800 p-6 rounded-xl flex flex-col gap-3">
          <h2 className="text-xl font-bold text-cyan-400">Education</h2>
          {education.map((e) => (
            <div key={e.id} className="bg-slate-700 rounded px-3 py-2 flex justify-between items-center">
              <span className="text-white text-sm">{e.institution} {e.degree && `— ${e.degree}`}</span>
              <button onClick={() => handleDeleteEducation(e.id)} className="text-red-400 text-xs">Delete</button>
            </div>
          ))}
          <input className="bg-slate-700 text-white rounded px-3 py-2" placeholder="Institution" value={institution} onChange={(e) => setInstitution(e.target.value)} />
          <input className="bg-slate-700 text-white rounded px-3 py-2" placeholder="Degree" value={degree} onChange={(e) => setDegree(e.target.value)} />
          <button onClick={handleAddEducation} className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold rounded px-3 py-2">Add Education</button>
        </div>

        <div className="bg-slate-800 p-6 rounded-xl flex flex-col gap-3">
          <h2 className="text-xl font-bold text-cyan-400">Skills</h2>
          <div className="flex flex-wrap gap-2">
            {skills.map((s) => (
              <span key={s.id} className="bg-slate-700 text-white text-sm rounded-full px-3 py-1 flex items-center gap-2">
                {s.name}
                <button onClick={() => handleDeleteSkill(s.id)} className="text-red-400 text-xs">✕</button>
              </span>
            ))}
          </div>
          <input className="bg-slate-700 text-white rounded px-3 py-2" placeholder="Skill name" value={skillName} onChange={(e) => setSkillName(e.target.value)} />
          <input className="bg-slate-700 text-white rounded px-3 py-2" placeholder="Category (optional)" value={skillCategory} onChange={(e) => setSkillCategory(e.target.value)} />
          <button onClick={handleAddSkill} className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold rounded px-3 py-2">Add Skill</button>
        </div>

        <div className="bg-slate-800 p-6 rounded-xl flex flex-col gap-3">
          <h2 className="text-xl font-bold text-cyan-400">Experience</h2>
          {experience.map((e) => (
            <div key={e.id} className="bg-slate-700 rounded px-3 py-2 flex justify-between items-center">
              <span className="text-white text-sm">{e.company} {e.role && `— ${e.role}`}</span>
              <button onClick={() => handleDeleteExperience(e.id)} className="text-red-400 text-xs">Delete</button>
            </div>
          ))}
          <input className="bg-slate-700 text-white rounded px-3 py-2" placeholder="Company" value={company} onChange={(e) => setCompany(e.target.value)} />
          <input className="bg-slate-700 text-white rounded px-3 py-2" placeholder="Role" value={role} onChange={(e) => setRole(e.target.value)} />
          <button onClick={handleAddExperience} className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold rounded px-3 py-2">Add Experience</button>
        </div>

        <div className="bg-slate-800 p-6 rounded-xl flex flex-col gap-3">
          <h2 className="text-xl font-bold text-cyan-400">Achievements</h2>
          {achievements.map((a) => (
            <div key={a.id} className="bg-slate-700 rounded px-3 py-2 flex justify-between items-center">
              <span className="text-white text-sm">{a.title} {a.type && `(${a.type})`}</span>
              <button onClick={() => handleDeleteAchievement(a.id)} className="text-red-400 text-xs">Delete</button>
            </div>
          ))}
          <input className="bg-slate-700 text-white rounded px-3 py-2" placeholder="Title" value={achTitle} onChange={(e) => setAchTitle(e.target.value)} />
          <input className="bg-slate-700 text-white rounded px-3 py-2" placeholder="Type (e.g. hackathon)" value={achType} onChange={(e) => setAchType(e.target.value)} />
          <button onClick={handleAddAchievement} className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold rounded px-3 py-2">Add Achievement</button>
        </div>

        <div className="bg-slate-800 p-6 rounded-xl flex flex-col gap-3">
          <h2 className="text-xl font-bold text-cyan-400">Projects</h2>
          {projects.map((p) => (
            <div key={p.id} className="bg-slate-700 rounded px-3 py-3 flex flex-col gap-1">
              <div className="flex justify-between items-center">
                <span className="text-white font-semibold text-sm">{p.name}</span>
                <button onClick={() => handleDeleteProject(p.id)} className="text-red-400 text-xs">Delete</button>
              </div>
              {p.short_description && (
                <span className="text-slate-300 text-xs">{p.short_description}</span>
              )}
              {p.tech_stack && (
                <span className="text-cyan-400 text-xs">{p.tech_stack}</span>
              )}
              {p.github_url && (
                <a href={p.github_url} target="_blank" rel="noreferrer" className="text-blue-400 text-xs underline">
                  GitHub
                </a>
              )}
            </div>
          ))}
          <input className="bg-slate-700 text-white rounded px-3 py-2" placeholder="Project name" value={projectName} onChange={(e) => setProjectName(e.target.value)} />
          <input className="bg-slate-700 text-white rounded px-3 py-2" placeholder="Short description" value={projectDesc} onChange={(e) => setProjectDesc(e.target.value)} />
          <input className="bg-slate-700 text-white rounded px-3 py-2" placeholder="Tech stack (comma separated)" value={projectTech} onChange={(e) => setProjectTech(e.target.value)} />
          <input className="bg-slate-700 text-white rounded px-3 py-2" placeholder="GitHub URL" value={projectGithub} onChange={(e) => setProjectGithub(e.target.value)} />
          <button onClick={handleAddProject} className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold rounded px-3 py-2">Add Project</button>
        </div>

        <div className="bg-slate-800 p-4 rounded-xl flex items-center justify-between">
          <span className="text-slate-300 text-sm">
            Your AI auto-updates when you edit your profile. Having issues? Sync manually.
          </span>
          <div className="flex items-center gap-2">
            {syncStatus && <span className="text-slate-400 text-xs">{syncStatus}</span>}
            <button
              onClick={handleManualSync}
              className="bg-slate-600 hover:bg-slate-500 text-white text-sm rounded px-3 py-1"
            >
              Sync Knowledge
            </button>
          </div>
        </div>

        <Interview token={token} />

        {error && <p className="text-red-400 text-sm">{error}</p>}
      </div>
    </div>
  );
}

export default App;