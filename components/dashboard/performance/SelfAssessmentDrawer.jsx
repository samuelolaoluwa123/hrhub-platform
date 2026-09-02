"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

function formatTarget(kpi) {
  if (kpi.target_value == null) return "No target set";
  const val = Number(kpi.target_value).toLocaleString();
  return kpi.target_unit === "₦" ? `₦${val}` : `${val}${kpi.target_unit ? ` ${kpi.target_unit}` : ""}`;
}

export default function SelfAssessmentDrawer({ open, onClose, onSaved, cycle, review, employeeId, companyId }) {
  const supabase = createClient();
  const [text, setText] = useState(review?.self_assessment ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // 5.2/5.3 — the KPIs this employee's role carries for this cycle,
  // instantiated from the role's template the moment this opens (a
  // no-op if they already exist). "Actual" is theirs to propose; the
  // target/weight/score stay read-only here — the DB enforces that
  // too, this is just not offering a control that would be rejected.
  const [kpis, setKpis] = useState([]);
  const [kpiActuals, setKpiActuals] = useState({});
  const [loadingKpis, setLoadingKpis] = useState(true);

  useEffect(() => {
    if (!open) return;
    setText(review?.self_assessment ?? "");
    setError(null);
    setLoadingKpis(true);

    (async () => {
      const { error: rpcError } = await supabase.rpc("ensure_employee_kpis", { p_employee_id: employeeId, p_cycle_id: cycle.id });
      if (rpcError) console.error("ensure_employee_kpis failed:", rpcError);
      const { data } = await supabase
        .from("employee_kpis")
        .select("id, kpi_name, target_value, target_unit, weight, actual_value, score, manager_note")
        .eq("employee_id", employeeId)
        .eq("cycle_id", cycle.id)
        .order("kpi_name");

      setKpis(data ?? []);
      const actuals = {};
      (data ?? []).forEach((k) => { actuals[k.id] = k.actual_value ?? ""; });
      setKpiActuals(actuals);
      setLoadingKpis(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, cycle?.id, employeeId]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      self_assessment: text,
      self_assessment_submitted_at: new Date().toISOString(),
      status: "self_assessment_submitted",
    };

    const { error: dbError } = review
      ? await supabase.from("performance_reviews").update(payload).eq("id", review.id)
      : await supabase.from("performance_reviews").insert({
          company_id: companyId,
          cycle_id: cycle.id,
          employee_id: employeeId,
          ...payload,
        });

    if (dbError) {
      setSaving(false);
      setError(dbError.message);
      return;
    }

    // Only touch KPI rows whose Actual was actually filled in —
    // leaving one blank just means it wasn't updated this round.
    const kpiUpdates = kpis
      .filter((k) => kpiActuals[k.id] !== "" && kpiActuals[k.id] != null)
      .map((k) =>
        supabase
          .from("employee_kpis")
          .update({ actual_value: Number(kpiActuals[k.id]), actual_submitted_at: new Date().toISOString() })
          .eq("id", k.id)
      );
    await Promise.all(kpiUpdates);

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
        <h2 className="font-display text-lg font-semibold text-[var(--color-text-primary)]">Self-assessment</h2>
        <p className="text-sm text-[var(--color-text-muted)] mt-1 mb-6">{cycle.name}</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {!loadingKpis && kpis.length > 0 && (
            <div className="space-y-2.5">
              <p className="text-xs font-semibold tracking-wide uppercase text-[var(--color-accent)]">Your KPIs this cycle</p>
              {kpis.map((k) => (
                <div key={k.id} className="rounded-lg border border-black/[0.06] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">{k.kpi_name}</p>
                    <span className="text-[10.5px] font-mono text-[var(--color-text-muted)] shrink-0">{k.weight}% weight</span>
                  </div>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Target: {formatTarget(k)}</p>
                  <div className="mt-2">
                    <label className="block text-[10.5px] font-medium text-[var(--color-text-primary)] mb-1">Your actual</label>
                    <input
                      type="number" step="any" value={kpiActuals[k.id] ?? ""}
                      onChange={(e) => setKpiActuals((a) => ({ ...a, [k.id]: e.target.value }))}
                      placeholder={k.target_unit || "Value"}
                      className={inputClass} onFocus={focusRing} onBlur={clearRing}
                    />
                  </div>
                  {k.score != null && (
                    <p className="text-[10.5px] text-[#1a9c5f] mt-1.5 font-medium">Scored {k.score} by your manager{k.manager_note ? ` — "${k.manager_note}"` : ""}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">
              How did this period go?
            </label>
            <textarea
              required
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={10}
              className={inputClass}
              onFocus={focusRing}
              onBlur={clearRing}
              placeholder="What went well, what you'd do differently, anything your manager should know..."
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
              {saving ? "Submitting..." : "Submit"}
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
