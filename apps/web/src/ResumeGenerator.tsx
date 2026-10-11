import { useState } from "react";
import { generateResume, type GeneratedResume } from "./lib/api";

function ResumeGenerator({ token }: { token: string }) {
  const [target, setTarget] = useState("");
  const [result, setResult] = useState<{ name: string; title: string; resume: GeneratedResume } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleGenerate() {
    if (!target.trim()) return;
    setError("");
    setLoading(true);
    try {
      const r = await generateResume(token, target);
      setResult(r);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-slate-800 p-6 rounded-xl flex flex-col gap-3">
      <h2 className="text-xl font-bold text-cyan-400">AI Resume Generator</h2>
      <p className="text-slate-400 text-sm">
        Enter a job type or paste a job description — the AI will pick your most relevant real skills, projects, and experience and build a tailored resume. Nothing is invented.
      </p>

      <input
        className="bg-slate-700 text-white rounded px-3 py-2"
        placeholder="e.g. Hardware Engineer, Software Developer, or paste a job description"
        value={target}
        onChange={(e) => setTarget(e.target.value)}
      />
      <button
        onClick={handleGenerate}
        disabled={loading || !target.trim()}
        className="bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-900 font-bold rounded px-3 py-2"
      >
        {loading ? "Generating..." : "Generate Resume"}
      </button>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {result && (
        <div className="mt-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-cyan-400 font-semibold text-sm">Preview</h3>
            <button
              onClick={() => window.print()}
              className="bg-slate-600 hover:bg-slate-500 text-white text-xs rounded px-3 py-1"
            >
              Print / Save as PDF
            </button>
          </div>

          <div
            id="resume-print-area"
            className="bg-white text-slate-900 rounded shadow-lg mx-auto"
            style={{ maxWidth: "680px", fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            <div className="p-10">
              {/* Header */}
              <div className="text-center border-b-2 border-slate-800 pb-4 mb-6">
                <h1 className="text-3xl font-bold tracking-wide uppercase">{result.name}</h1>
                {result.title && (
                  <p className="text-slate-600 text-sm mt-1 tracking-wider uppercase">{result.title}</p>
                )}
              </div>

              {/* Summary */}
              {result.resume.summary && (
                <div className="mb-6">
                  <p className="text-sm leading-relaxed text-slate-800 italic">{result.resume.summary}</p>
                </div>
              )}

              {/* Skills */}
              {result.resume.skills.length > 0 && (
                <div className="mb-6">
                  <h2 className="text-sm font-bold uppercase tracking-widest text-slate-800 border-b border-slate-400 pb-1 mb-3">
                    Core Skills
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {result.resume.skills.map((s, i) => (
                      <span
                        key={i}
                        className="text-xs bg-slate-100 border border-slate-300 rounded px-2 py-1 font-medium"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Projects */}
              {result.resume.projects.length > 0 && (
                <div className="mb-6">
                  <h2 className="text-sm font-bold uppercase tracking-widest text-slate-800 border-b border-slate-400 pb-1 mb-3">
                    Projects
                  </h2>
                  {result.resume.projects.map((p, i) => (
                    <div key={i} className="mb-3">
                      <p className="font-bold text-sm">{p.name}</p>
                      {p.description && (
                        <p className="text-slate-700 text-sm leading-snug mt-0.5">{p.description}</p>
                      )}
                      {p.tech_stack && (
                        <p className="text-slate-500 text-xs mt-0.5 font-medium">{p.tech_stack}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Experience */}
              {result.resume.experience.length > 0 && (
                <div className="mb-6">
                  <h2 className="text-sm font-bold uppercase tracking-widest text-slate-800 border-b border-slate-400 pb-1 mb-3">
                    Experience
                  </h2>
                  {result.resume.experience.map((e, i) => (
                    <div key={i} className="mb-3">
                      <div className="flex justify-between items-baseline">
                        <p className="font-bold text-sm">{e.company}</p>
                        {e.role && <p className="text-xs text-slate-500 font-medium">{e.role}</p>}
                      </div>
                      {e.description && (
                        <p className="text-slate-700 text-sm leading-snug mt-0.5">{e.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Education */}
              {result.resume.education.length > 0 && (
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-widest text-slate-800 border-b border-slate-400 pb-1 mb-3">
                    Education
                  </h2>
                  {result.resume.education.map((e, i) => (
                    <div key={i} className="flex justify-between items-baseline mb-1">
                      <p className="text-sm font-semibold">{e.institution}</p>
                      <p className="text-xs text-slate-500">
                        {e.degree} {e.branch && `· ${e.branch}`}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ResumeGenerator;