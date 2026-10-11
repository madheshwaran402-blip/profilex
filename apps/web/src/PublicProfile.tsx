import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { getPublicProfile, sendChatMessage, type PublicProfile as PublicProfileType } from "./lib/api";
import { THEME_PRESETS } from "./lib/themes";

interface Message {
  role: "user" | "assistant";
  content: string;
}

function PublicProfile() {
  const { username } = useParams<{ username: string }>();
  const [profile, setProfile] = useState<PublicProfileType | null>(null);
  const [notFound, setNotFound] = useState(false);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const theme = profile
    ? THEME_PRESETS[JSON.parse(profile.theme_config || '{"preset":"cyan"}').preset] ?? THEME_PRESETS.cyan
    : THEME_PRESETS.cyan;

  useEffect(() => {
    if (!username) return;
    getPublicProfile(username)
      .then(setProfile)
      .catch(() => setNotFound(true));
  }, [username]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    if (!username || !input.trim() || sending) return;

    const userMessage = input.trim();
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setInput("");
    setSending(true);

    try {
      const result = await sendChatMessage(username, userMessage, conversationId);
      setConversationId(result.conversation_id);
      setMessages((prev) => [...prev, { role: "assistant", content: result.answer }]);
    } catch{
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, something went wrong. Please try again." },
      ]);
    } finally {
      setSending(false);
    }
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

  return (
    <div className={`min-h-screen ${theme.background} py-12 flex justify-center px-4`}>
      <div className="w-full max-w-xl flex flex-col gap-6">
        <div className="text-center">
          {profile.photo_url && (
            <img
  src={`https://profilex-worker.madheshwaran402.workers.dev${profile.photo_url}`}
              alt={profile.name}
              className="w-24 h-24 rounded-full mx-auto mb-4 object-cover"
            />
          )}
          <h1 className={`text-3xl font-bold ${theme.accent}`}>{profile.name}</h1>
          {profile.title && <p className="text-slate-300 mt-1">{profile.title}</p>}
          {profile.about && <p className="text-slate-400 mt-3 text-sm">{profile.about}</p>}
        </div>

        <div className={`${theme.card} rounded-xl flex flex-col h-96 sm:h-112`}>
          <div className="px-4 py-3 border-b border-slate-700">
            <h2 className="text-cyan-400 font-semibold text-sm">
              Ask {profile.name}'s AI
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
            {messages.length === 0 && (
              <p className="text-slate-500 text-sm text-center mt-8">
                Ask a question about {profile.name}'s skills, projects, or experience.
              </p>
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
              onClick={handleSend}
              disabled={sending}
              className={`${theme.accentHover} disabled:opacity-50 text-slate-900 font-bold rounded px-4 py-2 text-sm`}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PublicProfile;