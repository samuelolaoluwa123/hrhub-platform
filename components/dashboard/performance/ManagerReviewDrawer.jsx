"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { sendNotificationEmail } from "@/lib/sendNotificationEmail";

function formatTarget(kpi) {
  if (kpi.target_value == null) return "No target set";
  const val = Number(kpi.target_value).toLocaleString();
  return kpi.target_unit === "₦" ? `₦${val}` : `${val}${kpi.target_unit ? ` ${kpi.target_unit}` : ""}`;
}

// Achievement is just a starting-point suggestion for Score, not the
// score itself — the manager can always override it (a KPI missed
// for reasons outside the employee's control shouldn't mechanically
// tank their score just because the math says so).
function suggestedAchievement(kpi) {
  if (kpi.target_value == null || kpi.actual_value == null || Number(kpi.target_value) === 0) return null;
  return Math.round((Number(kpi.actual_value) / Number(kpi.target_value)) * 100);
}

export default function ManagerReviewDrawer({ open, onClose, onSaved, cycleId, employee, review, companyId }) {
  const supabase = createClient();
  const [feedback, setFeedback] = useState(review?.manager_feedback ?? "");
  const [rating, setRating] = useState(review?.rating ?? 3);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [kpis, setKpis] = useState([]);
  const [kpiScores, setKpiScores] = useState({});
  const [kpiNotes, setKpiNotes] = useState({});
  const [loadingKpis, setLoadingKpis] = useState(true);

  useEffect(() => {
    if (!open) return;
    setFeedback(review?.manager_feedback ?? "");
    setRating(review?.rating ?? 3);
    setError(null);
    setLoadingKpis(true);

    (async () => {
      // Covers the case where this employee never opened their own
      // self-assessment first — the manager can still see and score
      // the role's KPIs for this cycle. Logged, not surfaced as a
      // blocking error — the review itself still works with zero KPIs
      // shown if this fails for some reason.
      const { error: rpcError } = await supabase.rpc("ensure_employee_kpis", { p_employee_id: employee.id, p_cycle_id: cycleId });
      if (rpcError) console.error("ensure_employee_kpis failed:", rpcError);
      const { data } = await supabase
        .from("employee_kpis")
        .select("id, kpi_name, target_value, target_unit, weight, actual_value, actual_submitted_at, score, manager_note")
        .eq("employee_id", employee.id)
        .eq("cycle_id", cycleId)
        .order("kpi_name");

      setKpis(data ?? []);
      const scores = {}, notes = {};
      (data ?? []).forEach((k) => { scores[k.id] = k.score ?? ""; notes[k.id] = k.manager_note ?? ""; });
      setKpiScores(scores);
      setKpiNotes(notes);
      setLoadingKpis(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, cycleId, employee?.id]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      manager_feedback: feedback,
      rating: Number(rating),
      manager_review_submitted_at: new Date().toISOString(),
      status: "completed",
    };

    const { error: dbError } = review
      ? await supabase.from("performance_reviews").update(payload).eq("id", review.id)
      : await supabase.from("performance_reviews").insert({
          company_id: companyId,
          cycle_id: cycleId,
          employee_id: employee.id,
          ...payload,
        });

    if (dbError) {
      setSaving(false);
      setError(dbError.message);
      return;
    }

    const kpiUpdates = kpis
      .filter((k) => kpiScores[k.id] !== "" && kpiScores[k.id] != null)
      .map((k) =>
        supabase
          .from("employee_kpis")
          .update({ score: Number(kpiScores[k.id]), manager_note: kpiNotes[k.id] || null })
          .eq("id", k.id)
      );
    await Promise.all(kpiUpdates);

    // 8.2 "KPI review" notification — the moment a review actually
    // completes, not when it opens (the employee already knows about
    // their own KPIs from the self-assessment step).
    if (employee.profile_id) {
      await supabase.from("notifications").insert({
        company_id: companyId,
        profile_id: employee.profile_id,
        type: "kpi",
        message: "Your performance review is complete — your manager left feedback and a rating.",
        link: "/dashboard/performance",
      });
    }
    if (employee.email) {
      sendNotificationEmail({
        to: employee.email,
        subject: "Your performance review is complete",
        message: "Your manager has completed your performance review, including feedback and a rating.",
        link: "/dashboard/performance",
      });
    }

    setSaving(false);
    onSaved();
    onClose();
  }

  if (!open) return null;

  const inputClass =
    "w-full border border-black/10 rounded-lg px-3 py-2 text-sm outline-none transition-shadow duration-150";
  const focusRing = (e) => (e.target.style.boxShadow = "0 0 0 2px var(--color-accent)");
  const clearRing = (e) => (e.target.style.boxShadow = "none");

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/35 animate-[fadeIn_200ms_var(--ease-out)]" onClick={onClose} />
      <div className="absolute top-0 right-0 bottom-0 w-full max-w-[420px] bg-white p-7 overflow-y-auto shadow-2xl animate-[slideIn_280ms_var(--ease-out)]">
        <h2 className="font-display text-lg font-semibold text-[var(--color-text-primary)]">
          Review {employee.first_name} {employee.last_name}
        </h2>

        {review?.self_assessment ? (
          <div className="mt-4 mb-6 rounded-lg bg-[var(--color-violet-tint)] px-4 py-3.5">
            <p className="text-[10.5px] font-semibold tracking-wide uppercase text-[var(--color-primary)] mb-1.5">
              Their self-assessment
            </p>
            <p className="text-sm text-[var(--color-text-primary)] whitespace-pre-wrap">{review.self_assessment}</p>
          </div>
        ) : (
          <p className="text-sm text-[var(--color-text-muted)] mt-1 mb-6">
            No self-assessment submitted yet — you can still leave feedback.
          </p>
        )}

        {!loadingKpis && kpis.length > 0 && (
          <div className="space-y-2.5 mb-6">
            <p className="text-xs font-semibold tracking-wide uppercase text-[var(--color-accent)]">KPIs this cycle</p>
            {kpis.map((k) => {
              const achievement = suggestedAchievement(k);
              return (
                <div key={k.id} className="rounded-lg border border-black/[0.06] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">{k.kpi_name}</p>
                    <span className="text-[10.5px] font-mono text-[var(--color-text-muted)] shrink-0">{k.weight}% weight</span>
                  </div>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                    Target: {formatTarget(k)} &middot; Actual: {k.actual_value != null ? Number(k.actual_value).toLocaleString() : "not submitted"}
                    {achievement != null && ` · ${achievement}% of target`}
                  </p>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div>
                      <label className="block text-[10.5px] font-medium text-[var(--color-text-primary)] mb-1">Score</label>
                      <input
                        type="number" min="0" value={kpiScores[k.id] ?? ""}
                        onChange={(e) => setKpiScores((s) => ({ ...s, [k.id]: e.target.value }))}
                        placeholder={achievement != null ? String(achievement) : "0-100"}
                        className={inputClass} onFocus={focusRing} onBlur={clearRing}
                      />
                    </div>
                    <div>
                      <label className="block text-[10.5px] font-medium text-[var(--color-text-primary)] mb-1">Note</label>
                      <input
                        type="text" value={kpiNotes[k.id] ?? ""}
                        onChange={(e) => setKpiNotes((n) => ({ ...n, [k.id]: e.target.value }))}
                        className={inputClass} onFocus={focusRing} onBlur={clearRing}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">Overall rating</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  className={`w-9 h-9 rounded-lg text-sm font-medium border transition-colors duration-150 ${
                    Number(rating) === n
                      ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]"
                      : "border-black/10 text-[var(--color-text-muted)] hover:bg-black/[0.03]"
                  }`}
                  style={{ transitionTimingFunction: "var(--ease-out)" }}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">Your feedback</label>
            <textarea
              required
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={8}
              className={inputClass}
              onFocus={focusRing}
              onBlur={clearRing}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-black/10 rounded-lg py-2.5 text-sm font-medium text-[var(--color-text-muted)] hover:bg-black/[0.03] transition-colors duration-150"
              style={{ transitionTimingFunction: "var(--ease-out)" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-[1.4] rounded-lg py-2.5 text-sm font-medium text-white transition-transform duration-150 hover:scale-[1.02] active:scale-95 disabled:opacity-60"
              style={{ backgroundColor: "var(--color-primary)", transitionTimingFunction: "var(--ease-out)" }}
            >
              {saving ? "Saving..." : "Complete review"}
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
