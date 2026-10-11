import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import {
  getPublicProfile,
  sendChatMessage,
  type PublicProfile as PublicProfileType,
  type PublicSkill,
  type PublicProject,
  type PublicEducation,
} from "./lib/api";
import { THEME_PRESETS } from "./lib/themes";

interface Message {
  role: "user" | "assistant";
  content: string;
}

function PublicProfile() {
  const { username } = useParams<{ username: string }>();
  const [profile, setProfile] = useState<PublicProfileType | null>(null);
  const [skills, setSkills] = useState<PublicSkill[]>([]);
  const [projects, setProjects] = useState<PublicProject[]>([]);
  const [education, setEducation] = useState<PublicEducation[]>([]);
  const [notFound, setNotFound] = useState(false);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);

  const theme = profile
    ? THEME_PRESETS[JSON.parse(profile.theme_config || '{"preset":"cyan"}').preset] ?? THEME_PRESETS.cyan
    : THEME_PRESETS.cyan;

  useEffect(() => {
    if (!username) return;
    getPublicProfile(username)
      .then((data) => {
        setProfile(data.profile);
        setSkills(data.skills);
        setProjects(data.projects);
        setEducation(data.education);
      })
      .catch(() => setNotFound(true));
  }, [username]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(prefill?: string) {
    const toSend = (prefill ?? input).trim();
    if (!username || !toSend || sending) return;

    setMessages((prev) => [...prev, { role: "user", content: toSend }]);
    setInput("");
    setSending(true);

    try {
      const result = await sendChatMessage(username, toSend, conversationId);
      setConversationId(result.conversation_id);
      setMessages((prev) => [...prev, { role: "assistant", content: result.answer }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, something went wrong. Please try again." },
      ]);
    } finally {
      setSending(false);
    }
  }

  function scrollToChat() {
    chatRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <p className="text-slate-400">This profile doesn't exist or isn't published yet.</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <p className="text-slate-400">Loading...</p>
      </div>
    );
  }

  const skillsByCategory = skills.reduce<Record<string, PublicSkill[]>>((acc, s) => {
    const key = s.category || "Skills";
    if (!acc[key]) acc[key] = [];
    acc[key].push(s);
    return acc;
  }, {});

  const suggestedPrompts = [
    projects[0] ? `What is ${projects[0].name}?` : null,
    "What are your skills?",
    "Tell me about your education",
    projects[1] ? `What is ${projects[1].name}?` : null,
  ].filter(Boolean) as string[];

  return (
    <div className={`min-h-screen ${theme.background}`}>
      {/* Hero */}
      <div className="flex flex-col items-center text-center px-4 pt-16 pb-12">
        {profile.photo_url && (
          <img
            src={`https://profilex-worker.madheshwaran402.workers.dev${profile.photo_url}`}
            alt={profile.name}
            className={`w-28 h-28 rounded-full object-cover mb-5 ring-4`}
            style={{ borderColor: "currentColor" }}
          />
        )}
        <p className={`text-sm ${theme.accent} mb-1`}>Hello, I'm</p>
        <h1 className={`text-4xl font-bold ${theme.text} mb-2`}>{profile.name}</h1>
        {profile.title && <p className="text-slate-400 mb-3">{profile.title}</p>}
        {profile.about && (
          <p className="text-slate-400 text-sm max-w-xl leading-relaxed mb-6">{profile.about}</p>
        )}
        <button
          onClick={scrollToChat}
          className={`${theme.accentHover} text-slate-900 font-bold rounded-full px-6 py-3 text-sm`}
        >
          Chat with my AI ↓
        </button>
      </div>

      {/* Skills */}
      {skills.length > 0 && (
        <div className="max-w-3xl mx-auto px-4 py-10">
          <h2 className={`text-xs font-bold uppercase tracking-widest ${theme.accent} mb-4`}>
            Technical Skills
          </h2>
          {Object.entries(skillsByCategory).map(([category, items]) => (
            <div key={category} className="mb-4">
              <p className="text-slate-500 text-xs uppercase tracking-wider mb-2">{category}</p>
              <div className="flex flex-wrap gap-2">
                {items.map((s, i) => (
                  <span
                    key={i}
                    className={`${theme.card} text-slate-200 text-sm rounded-full px-4 py-1.5`}
                  >
                    {s.name}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Projects */}
      {projects.length > 0 && (
        <div className="max-w-3xl mx-auto px-4 py-10">
          <h2 className={`text-xs font-bold uppercase tracking-widest ${theme.accent} mb-4`}>
            Projects
          </h2>
          <div className="flex flex-col gap-4">
            {projects.map((p, i) => (
              <div
                key={i}
                className={`${theme.card} rounded-xl p-5 border-l-4`}
                style={{ borderLeftColor: "currentColor" }}
              >
                <div className="flex justify-between items-start gap-3">
                  <h3 className="text-white font-bold">{p.name}</h3>
                  {p.featured === 1 && (
                    <span className={`${theme.accent} text-xs font-semibold border border-current rounded-full px-2 py-0.5 whitespace-nowrap`}>
                      Featured
                    </span>
                  )}
                </div>
                {p.short_description && (
                  <p className="text-slate-400 text-sm mt-2">{p.short_description}</p>
                )}
                {p.tech_stack && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {p.tech_stack.split(",").map((t, j) => (
                      <span key={j} className="text-xs bg-slate-900/50 text-slate-300 rounded px-2 py-1">
                        {t.trim()}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex gap-3 mt-3">
                  {p.github_url && (
                    <a href={p.github_url} target="_blank" rel="noreferrer" className={`${theme.accent} text-xs underline`}>
                      GitHub →
                    </a>
                  )}
                  {p.demo_url && (
                    <a href={p.demo_url} target="_blank" rel="noreferrer" className={`${theme.accent} text-xs underline`}>
                      Demo →
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Education */}
      {education.length > 0 && (
        <div className="max-w-3xl mx-auto px-4 py-10">
          <h2 className={`text-xs font-bold uppercase tracking-widest ${theme.accent} mb-4`}>
            Education
          </h2>
          {education.map((e, i) => (
            <div key={i} className={`${theme.card} rounded-xl p-5 mb-3`}>
              <p className="text-white font-semibold">
                {e.degree} {e.branch && `— ${e.branch}`}
              </p>
              <p className="text-slate-400 text-sm mt-1">{e.institution}</p>
              {e.cgpa && <p className="text-slate-500 text-xs mt-1">CGPA: {e.cgpa}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Chat */}
      <div ref={chatRef} className="max-w-xl mx-auto px-4 py-10">
        <h2 className={`text-xs font-bold uppercase tracking-widest ${theme.accent} mb-4`}>
          Chat with my AI
        </h2>
        <div className={`${theme.card} rounded-xl flex flex-col h-96 sm:h-112`}>
          <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
            {messages.length === 0 && (
              <>
                <p className="text-slate-500 text-sm text-center mt-4 mb-2">
                  Ask a question, or try one below:
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {suggestedPrompts.map((p, i) => (
                    <button
                      key={i}
                      onClick={() => handleSend(p)}
                      className="text-xs bg-slate-900/50 hover:bg-slate-900 text-slate-300 rounded-full px-3 py-1.5"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                  m.role === "user"
                    ? `${theme.accentHover} text-slate-900 self-end`
                    : "bg-slate-700 text-white self-start"
                }`}
              >
                {m.content}
              </div>
            ))}
            {sending && (
              <div className="bg-slate-700 text-slate-400 text-sm rounded-lg px-3 py-2 self-start">
                Thinking...
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="p-3 border-t border-slate-700 flex gap-2">
            <input
              className="flex-1 bg-slate-700 text-white rounded px-3 py-2 text-sm"
              placeholder="Type a question..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
            />
            <button
              onClick={() => handleSend()}
              disabled={sending}
              className={`${theme.accentHover} disabled:opacity-50 text-slate-900 font-bold rounded px-4 py-2 text-sm`}
            >
              Send
            </button>
          </div>
        </div>
      </div>

      <div className="text-center text-slate-600 text-xs pb-8">
        Built with ProfileX
      </div>
    </div>
  );
}

export default PublicProfile;