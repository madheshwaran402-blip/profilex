import { useState } from "react";
import {
  uploadResume,
  addSkill,
  addEducation,
  addExperience,
  addProject,
  type ResumeSuggestions,
} from "./lib/api";

function ResumeImport({ token, onImported }: { token: string; onImported: () => void }) {
  const [suggestions, setSuggestions] = useState<ResumeSuggestions | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [accepted, setAccepted] = useState<Set<string>>(new Set());

  function keyFor(category: string, index: number) {
    return `${category}-${index}`;
  }

  function toggle(key: string) {
    setAccepted((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setError("");
    setLoading(true);
    try {
      const result = await uploadResume(token, file);
      setSuggestions(result.suggestions);
      setAccepted(new Set());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleApply() {
    if (!suggestions) return;
    setLoading(true);
    try {
      for (let i = 0; i < suggestions.skills.length; i++) {
        if (accepted.has(keyFor("skills", i))) {
          await addSkill(token, { name: suggestions.skills[i] });
        }
      }
      for (let i = 0; i < suggestions.education.length; i++) {
        if (accepted.has(keyFor("education", i))) {
          const e = suggestions.education[i];
          await addEducation(token, { institution: e.institution, degree: e.degree, branch: e.branch });
        }
      }
      for (let i = 0; i < suggestions.experience.length; i++) {
        if (accepted.has(keyFor("experience", i))) {
          const ex = suggestions.experience[i];
          await addExperience(token, { company: ex.company, role: ex.role });
        }
      }
      for (let i = 0; i < suggestions.projects.length; i++) {
        if (accepted.has(keyFor("projects", i))) {
          const p = suggestions.projects[i];
          await addProject(token, { name: p.name, short_description: p.short_description });
        }
      }
      setSuggestions(null);
      onImported();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-slate-800 p-6 rounded-xl flex flex-col gap-3">
      <h2 className="text-xl font-bold text-cyan-400">Import from Resume</h2>
      <p className="text-slate-400 text-sm">
        Upload a PDF resume and the AI will suggest skills, education, experience, and projects to add. Nothing is added automatically — review and pick what you want.
      </p>

      {!suggestions && (
        <>
          <input
            type="file"
            accept="application/pdf"
            onChange={handleUpload}
            disabled={loading}
            className="text-slate-300 text-sm"
          />
          {loading && <p className="text-slate-400 text-sm">Reading and analyzing your resume...</p>}
        </>
      )}

      {suggestions && (
        <div className="flex flex-col gap-4">
          {suggestions.skills.length > 0 && (
            <div>
              <h3 className="text-cyan-400 text-sm font-semibold mb-2">Skills</h3>
              <div className="flex flex-wrap gap-2">
                {suggestions.skills.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => toggle(keyFor("skills", i))}
                    className={`text-xs rounded-full px-3 py-1 ${
                      accepted.has(keyFor("skills", i))
                        ? "bg-cyan-500 text-slate-900"
                        : "bg-slate-700 text-slate-300"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {suggestions.education.length > 0 && (
            <div>
              <h3 className="text-cyan-400 text-sm font-semibold mb-2">Education</h3>
              {suggestions.education.map((e, i) => (
                <label key={i} className="flex items-center gap-2 text-slate-300 text-sm py-1">
                  <input
                    type="checkbox"
                    checked={accepted.has(keyFor("education", i))}
                    onChange={() => toggle(keyFor("education", i))}
                  />
                  {e.institution} {e.degree && `— ${e.degree}`} {e.branch && `(${e.branch})`}
                </label>
              ))}
            </div>
          )}

          {suggestions.experience.length > 0 && (
            <div>
              <h3 className="text-cyan-400 text-sm font-semibold mb-2">Experience</h3>
              {suggestions.experience.map((ex, i) => (
                <label key={i} className="flex items-center gap-2 text-slate-300 text-sm py-1">
                  <input
                    type="checkbox"
                    checked={accepted.has(keyFor("experience", i))}
                    onChange={() => toggle(keyFor("experience", i))}
                  />
                  {ex.company} {ex.role && `— ${ex.role}`}
                </label>
              ))}
            </div>
          )}

          {suggestions.projects.length > 0 && (
            <div>
              <h3 className="text-cyan-400 text-sm font-semibold mb-2">Projects</h3>
              {suggestions.projects.map((p, i) => (
                <label key={i} className="flex items-center gap-2 text-slate-300 text-sm py-1">
                  <input
                    type="checkbox"
                    checked={accepted.has(keyFor("projects", i))}
                    onChange={() => toggle(keyFor("projects", i))}
                  />
                  {p.name} {p.short_description && `— ${p.short_description}`}
                </label>
              ))}
            </div>
          )}

          <div className="flex gap-2 mt-2">
            <button
              onClick={handleApply}
              disabled={loading || accepted.size === 0}
              className="bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-900 font-bold rounded px-3 py-2 text-sm"
            >
              {loading ? "Adding..." : `Add Selected (${accepted.size})`}
            </button>
            <button
              onClick={() => setSuggestions(null)}
              className="bg-slate-600 hover:bg-slate-500 text-white rounded px-3 py-2 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-red-400 text-sm">{error}</p>}
    </div>
  );
}

export default ResumeImport;