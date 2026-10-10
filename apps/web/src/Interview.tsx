import { useState } from "react";
import { startInterview, submitInterviewAnswer } from "./lib/api";

interface Exchange {
  question: string;
  answer?: string;
}

function Interview({ token }: { token: string }) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [type, setType] = useState("general");
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleStart() {
    setError("");
    setLoading(true);
    try {
      const result = await startInterview(token, type);
      setSessionId(result.session_id);
      setExchanges([{ question: result.question }]);
      setDone(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitAnswer() {
    if (!sessionId || !currentAnswer.trim()) return;
    setError("");
    setLoading(true);
    try {
      const result = await submitInterviewAnswer(token, sessionId, currentAnswer);

      setExchanges((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { ...updated[updated.length - 1], answer: currentAnswer };
        return updated;
      });
      setCurrentAnswer("");

      if (result.done) {
        setDone(true);
      } else if (result.question) {
        setExchanges((prev) => [...prev, { question: result.question! }]);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (!sessionId) {
    return (
      <div className="bg-slate-800 p-6 rounded-xl flex flex-col gap-3">
        <h2 className="text-xl font-bold text-cyan-400">AI Interview Practice</h2>
        <p className="text-slate-400 text-sm">
          Practice answering interview questions generated from your own profile.
        </p>
        <label className="text-slate-300 text-sm">Interview type</label>
        <select
          className="bg-slate-700 text-white rounded px-3 py-2"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="general">General</option>
          <option value="technical">Technical</option>
          <option value="hr">HR</option>
        </select>
        <button
          onClick={handleStart}
          disabled={loading}
          className="bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-900 font-bold rounded px-3 py-2"
        >
          {loading ? "Starting..." : "Start Interview"}
        </button>
        {error && <p className="text-red-400 text-sm">{error}</p>}
      </div>
    );
  }

  return (
    <div className="bg-slate-800 p-6 rounded-xl flex flex-col gap-4">
      <h2 className="text-xl font-bold text-cyan-400">AI Interview Practice</h2>

      {exchanges.map((ex, i) => (
        <div key={i} className="flex flex-col gap-2">
          <div className="bg-slate-700 rounded-lg px-3 py-2 text-white text-sm">
            <span className="text-cyan-400 font-semibold">Q{i + 1}: </span>
            {ex.question}
          </div>
          {ex.answer && (
            <div className="bg-slate-600 rounded-lg px-3 py-2 text-slate-200 text-sm self-end max-w-[85%]">
              {ex.answer}
            </div>
          )}
        </div>
      ))}

      {done ? (
        <div className="text-green-400 text-sm font-semibold">
          Interview complete — nice work!
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <textarea
            className="bg-slate-700 text-white rounded px-3 py-2 h-20 text-sm"
            placeholder="Type your answer..."
            value={currentAnswer}
            onChange={(e) => setCurrentAnswer(e.target.value)}
          />
          <button
            onClick={handleSubmitAnswer}
            disabled={loading || !currentAnswer.trim()}
            className="bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-900 font-bold rounded px-3 py-2 text-sm"
          >
            {loading ? "Thinking..." : "Submit Answer"}
          </button>
        </div>
      )}

      {error && <p className="text-red-400 text-sm">{error}</p>}
    </div>
  );
}

export default Interview;