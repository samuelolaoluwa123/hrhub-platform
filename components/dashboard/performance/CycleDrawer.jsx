"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const CYCLE_TYPES = [
  { id: "monthly", label: "Monthly" },
  { id: "quarterly", label: "Quarterly" },
  { id: "half_yearly", label: "Half-yearly" },
  { id: "annual", label: "Annual" },
  { id: "probation", label: "Probation" },
  { id: "custom", label: "Custom" },
];

export default function CycleDrawer({ open, onClose, onSaved, companyId, profileId }) {
  const supabase = createClient();
  const [name, setName] = useState("");
  const [cycleType, setCycleType] = useState("quarterly");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const { error: dbError } = await supabase.from("review_cycles").insert({
      company_id: companyId,
      name,
      cycle_type: cycleType,
      start_date: startDate || null,
      end_date: endDate || null,
      status: "open",
      created_by: profileId,
    });

    setSaving(false);

    if (dbError) {
      setError(dbError.message);
      return;
    }

    setName("");
    setCycleType("quarterly");
    setStartDate("");
    setEndDate("");
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
      <div className="absolute top-0 right-0 bottom-0 w-full max-w-[380px] bg-white p-7 overflow-y-auto shadow-2xl animate-[slideIn_280ms_var(--ease-out)]">
        <h2 className="font-display text-lg font-semibold text-[var(--color-text-primary)]">New review cycle</h2>
        <p className="text-sm text-[var(--color-text-muted)] mt-1 mb-6">
          Opens immediately — everyone can see it and start their self-assessment.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
              onFocus={focusRing}
              onBlur={clearRing}
              placeholder="e.g. Q1 2026"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">Type</label>
            <select
              value={cycleType}
              onChange={(e) => setCycleType(e.target.value)}
              required
              className={inputClass}
              onFocus={focusRing}
              onBlur={clearRing}
            >
              {CYCLE_TYPES.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">Start date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={inputClass}
                onFocus={focusRing}
                onBlur={clearRing}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">End date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={inputClass}
                onFocus={focusRing}
                onBlur={clearRing}
              />
            </div>
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
              {saving ? "Creating..." : "Create cycle"}
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
