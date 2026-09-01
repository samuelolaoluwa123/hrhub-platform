"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function formatWhen(value) {
  return new Date(value).toLocaleString("en-US", {
    weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });
}

export default function InterviewPanelPage({ panels, companyId, profileId }) {
  const router = useRouter();
  const supabase = createClient();
  const [downloadingId, setDownloadingId] = useState(null);
  const [downloadError, setDownloadError] = useState(null);
  const [evaluating, setEvaluating] = useState(null);

  async function handleDownloadResume(panel) {
    if (!panel.resume_path) return;
    setDownloadingId(panel.interview_id);
    setDownloadError(null);
    const { data, error } = await supabase.storage.from("candidate-resumes").createSignedUrl(panel.resume_path, 60);
    setDownloadingId(null);
    if (error || !data?.signedUrl) {
      setDownloadError(panel.interview_id);
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-7">
        <div className="w-10 h-10 rounded-xl bg-[var(--color-violet-tint)] flex items-center justify-center shrink-0">
          <svg className="w-[19px] h-[19px] text-[var(--color-primary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </div>
        <div>
          <h1 className="font-display text-2xl font-semibold text-[var(--color-text-primary)]">Interview Panel</h1>
          <p className="text-[var(--color-text-muted)] text-sm mt-0.5">Interviews you've been assigned to sit on.</p>
        </div>
      </div>

      {panels.length === 0 ? (
        <div className="text-center py-20 border-[1.5px] border-dashed border-black/[0.1] rounded-2xl">
          <p className="font-display font-semibold text-[var(--color-text-primary)]">No panel assignments</p>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">You'll see interviews here once HR adds you to a panel.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {panels.map((p) => (
            <div key={p.interview_id} className="bg-white border border-black/[0.06] rounded-2xl p-5">
              <div className="flex flex-wrap justify-between items-start gap-3">
                <div>
                  <p className="font-display text-base font-semibold text-[var(--color-text-primary)]">
                    {p.candidate_first_name} {p.candidate_last_name}
                  </p>
                  <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
                    {p.posting_title || "Role"}{p.posting_department ? ` · ${p.posting_department}` : ""}
                  </p>
                </div>
                {p.already_evaluated ? (
                  <span className="text-xs font-medium px-2.5 py-1 rounded-md bg-[#e8f9f0] text-[#1a9c5f] shrink-0">✓ Evaluation submitted</span>
                ) : (
                  <button
                    onClick={() => setEvaluating(p)}
                    className="text-xs font-medium px-3.5 py-2 rounded-lg text-white shrink-0 transition-transform duration-150 hover:scale-[1.03] active:scale-95"
                    style={{ backgroundColor: "var(--color-primary)", transitionTimingFunction: "var(--ease-out)" }}
                  >
                    Evaluate
                  </button>
                )}
              </div>

              <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2 mt-4 text-sm">
                <p className="text-[var(--color-text-muted)]">
                  <span className="font-medium text-[var(--color-text-primary)]">{formatWhen(p.scheduled_at)}</span> · {p.duration_minutes} min
                </p>
                <p className="text-[var(--color-text-muted)] capitalize">
                  {p.mode?.replace("_", " ")}{p.location ? ` · ${p.location}` : ""}
                </p>
                <p className="text-[var(--color-text-muted)]">{p.candidate_email}{p.candidate_phone ? ` · ${p.candidate_phone}` : ""}</p>
                <p className="text-[var(--color-text-muted)]">
                  Panel: {p.co_panelists?.length ? `you + ${p.co_panelists.join(", ")}` : "just you"}
                </p>
              </div>

              {p.notes && <p className="text-xs text-[var(--color-text-muted)] mt-2.5 bg-[var(--color-surface)] rounded-lg p-2.5">{p.notes}</p>}

              {p.resume_path && (
                <button
                  onClick={() => handleDownloadResume(p)}
                  disabled={downloadingId === p.interview_id}
                  className="mt-3 text-xs font-medium px-3 py-1.5 rounded-md bg-[var(--color-violet-tint)] text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white transition-colors duration-150 disabled:opacity-50"
                  style={{ transitionTimingFunction: "var(--ease-out)" }}
                >
                  {downloadingId === p.interview_id ? "Opening..." : downloadError === p.interview_id ? "Try again" : "View resume"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {evaluating && (
        <EvaluationDrawer
          panel={evaluating}
          companyId={companyId}
          profileId={profileId}
          onClose={() => setEvaluating(null)}
          onSaved={() => {
            setEvaluating(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

const DIMENSIONS = [
  { key: "technical_score", label: "Technical competence" },
  { key: "communication_score", label: "Communication" },
  { key: "problem_solving_score", label: "Problem solving" },
  { key: "experience_score", label: "Experience" },
  { key: "culture_fit_score", label: "Culture fit" },
];
const RECOMMENDATIONS = [
  { value: "strong_hire", label: "Strong Hire" },
  { value: "hire", label: "Hire" },
  { value: "maybe", label: "Maybe" },
  { value: "no_hire", label: "No Hire" },
];

// 4.6 — a structured scorecard instead of a free-text PDF-style
// writeup, so 4.7's aggregation (10 candidates × 10 evaluators) is
// real, comparable data instead of 100 documents someone has to
// re-read by hand.
function EvaluationDrawer({ panel, companyId, profileId, onClose, onSaved }) {
  const supabase = createClient();
  const [scores, setScores] = useState({
    technical_score: 0, communication_score: 0, problem_solving_score: 0, experience_score: 0, culture_fit_score: 0,
  });
  const [recommendation, setRecommendation] = useState("");
  const [comments, setComments] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const { error: dbError } = await supabase.from("interview_evaluations").insert({
      company_id: companyId,
      interview_id: panel.interview_id,
      evaluator_id: profileId,
      technical_score: scores.technical_score || null,
      communication_score: scores.communication_score || null,
      problem_solving_score: scores.problem_solving_score || null,
      experience_score: scores.experience_score || null,
      culture_fit_score: scores.culture_fit_score || null,
      recommendation: recommendation || null,
      comments: comments || null,
    });

    setSaving(false);
    if (dbError) { setError(dbError.message); return; }
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/35 animate-[fadeIn_200ms_var(--ease-out)]" onClick={onClose} />
      <div className="absolute top-0 right-0 bottom-0 w-full max-w-[420px] bg-white p-7 overflow-y-auto shadow-2xl animate-[slideIn_280ms_var(--ease-out)]">
        <h2 className="font-display text-lg font-semibold text-[var(--color-text-primary)]">
          Evaluate {panel.candidate_first_name} {panel.candidate_last_name}
        </h2>
        <p className="text-sm text-[var(--color-text-muted)] mt-0.5 mb-6">{panel.posting_title}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {DIMENSIONS.map((d) => (
            <div key={d.key}>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-[var(--color-text-primary)]">{d.label}</label>
                <span className="text-xs font-mono text-[var(--color-text-muted)]">{scores[d.key] || "—"}/10</span>
              </div>
              <input
                type="range" min="1" max="10" value={scores[d.key] || 0}
                onChange={(e) => setScores((s) => ({ ...s, [d.key]: Number(e.target.value) }))}
                className="w-full"
              />
            </div>
          ))}

          <div>
            <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">Recommendation</label>
            <div className="grid grid-cols-2 gap-2">
              {RECOMMENDATIONS.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRecommendation(r.value)}
                  className={`text-xs font-medium py-2 rounded-lg border transition-colors duration-150 ${
                    recommendation === r.value
                      ? "text-white border-transparent"
                      : "text-[var(--color-text-primary)] border-black/10 hover:bg-black/[0.03]"
                  }`}
                  style={recommendation === r.value ? { backgroundColor: "var(--color-primary)" } : undefined}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">Comments</label>
            <textarea
              value={comments} onChange={(e) => setComments(e.target.value)} rows={3}
              className="w-full border border-black/10 rounded-lg px-3 py-2 text-sm outline-none"
              placeholder="What stood out, positively or not"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2.5 pt-1">
            <button
              type="button" onClick={onClose}
              className="flex-1 border border-black/10 rounded-lg py-2.5 text-sm font-medium text-[var(--color-text-muted)] hover:bg-black/[0.03] transition-colors duration-150"
            >
              Cancel
            </button>
            <button
              type="submit" disabled={saving}
              className="flex-[1.4] rounded-lg py-2.5 text-sm font-medium text-white transition-transform duration-150 hover:scale-[1.02] active:scale-95 disabled:opacity-60"
              style={{ backgroundColor: "var(--color-primary)" }}
            >
              {saving ? "Submitting..." : "Submit evaluation"}
            </button>
          </div>
        </form>
      </div>

      <style jsx global>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
