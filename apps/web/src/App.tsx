import { useState } from "react";
import { signup, login, getProfile, updateProfile, type Profile } from "./lib/api";

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

  async function handleAuth() {
    setError("");
    try {
      const result =
        mode === "signup"
          ? await signup(email, username, password)
          : await login(email, password);
      setToken(result.session_token);
      const { profile } = await getProfile(result.session_token);
      setProfile(profile);
      setTitle(profile.title || "");
      setAbout(profile.about || "");
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function handleSaveProfile() {
    if (!token) return;
    setError("");
    try {
      const { profile } = await updateProfile(token, { title, about });
      setProfile(profile);
    } catch (e) {
      setError((e as Error).message);
    }
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
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="bg-slate-800 p-8 rounded-xl w-[32rem] flex flex-col gap-3">
        <h1 className="text-2xl font-bold text-cyan-400">
          {profile.name}'s Profile
        </h1>
        <p className="text-slate-400 text-sm">profilex.app/{profile.slug}</p>

        <label className="text-slate-300 text-sm mt-2">Title</label>
        <input
          className="bg-slate-700 text-white rounded px-3 py-2"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <label className="text-slate-300 text-sm mt-2">About</label>
        <textarea
          className="bg-slate-700 text-white rounded px-3 py-2 h-28"
          value={about}
          onChange={(e) => setAbout(e.target.value)}
        />

        <button
          onClick={handleSaveProfile}
          className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold rounded px-3 py-2 mt-2"
        >
          Save Profile
        </button>

        {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
      </div>
    </div>
  );
}

export default App;