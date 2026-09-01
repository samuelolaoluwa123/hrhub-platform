"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const inputClass = "w-full border border-black/10 rounded-lg px-3 py-2 text-sm outline-none transition-shadow duration-150";
const focusRing = (e) => (e.target.style.boxShadow = "0 0 0 2px var(--color-accent)");
const clearRing = (e) => (e.target.style.boxShadow = "none");

// Admin-only (enforced server-side by record_employee_exit — this UI
// only ever renders behind an isAdmin check anyway). Covers a real exit:
// resignation, termination, retirement, or death — the one action in
// the employee lifecycle serious enough to need handover/replacement/
// outstanding-items on top of just "what status did they end up in."
export default function ExitEmployeeDrawer({ open, onClose, onSaved, employee, statuses, employees }) {
  const supabase = createClient();
  const exitStatuses = statuses.filter((s) => s.is_exit);

  const [exitStatus, setExitStatus] = useState(exitStatuses[0]?.name ?? "");
  const [exitDate, setExitDate] = useState(new Date().toISOString().slice(0, 10));
  const [exitReason, setExitReason] = useState("");
  const [handoverId, setHandoverId] = useState("");
  const [replacementId, setReplacementId] = useState("");
  const [replacementNote, setReplacementNote] = useState("");
  const [outstandingResponsibilities, setOutstandingResponsibilities] = useState("");
  const [outstandingProperty, setOutstandingProperty] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Same reasoning as ChangeStatusDrawer — this stays mounted across
  // different employees being selected, so state has to be reset
  // explicitly rather than relying on a one-time initializer.
  useEffect(() => {
    if (!open) return;
    setExitStatus(exitStatuses[0]?.name ?? "");
    setExitDate(new Date().toISOString().slice(0, 10));
    setExitReason("");
    setHandoverId("");
    setReplacementId("");
    setReplacementNote("");
    setOutstandingResponsibilities("");
    setOutstandingProperty("");
    setNotes("");
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, employee]);

  if (!open || !employee) return null;

  const otherEmployees = employees.filter((e) => e.id !== employee.id);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const { error: dbError } = await supabase.rpc("record_employee_exit", {
      p_employee_id: employee.id,
      p_exit_status: exitStatus,
      p_exit_date: exitDate,
      p_exit_reason: exitReason.trim() || null,
      p_handover_employee_id: handoverId || null,
      p_replacement_employee_id: replacementId || null,
      p_replacement_note: replacementNote.trim() || null,
      p_outstanding_responsibilities: outstandingResponsibilities.trim() || null,
      p_outstanding_property: outstandingProperty.trim() || null,
      p_notes: notes.trim() || null,
    });

    setSaving(false);

    if (dbError) {
      setError(dbError.message);
      return;
    }

    onSaved();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/35 animate-[fadeIn_200ms_var(--ease-out)]" onClick={onClose} />
      <div className="absolute top-0 right-0 bottom-0 w-full max-w-[420px] bg-white p-7 overflow-y-auto shadow-2xl animate-[slideIn_280ms_var(--ease-out)]">
        <h2 className="font-display text-lg font-semibold text-[var(--color-text-primary)]">
          Record exit
        </h2>
        <p className="text-sm text-[var(--color-text-muted)] mt-1 mb-6">
          {employee.first_name} {employee.last_name} &mdash; this permanently ends their active status and can&apos;t be undone from here.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">Exit status</label>
              <select
                required
                value={exitStatus}
                onChange={(e) => setExitStatus(e.target.value)}
                className={inputClass}
                onFocus={focusRing}
                onBlur={clearRing}
              >
                {exitStatuses.map((s) => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">Exit date</label>
              <input
                type="date"
                required
                value={exitDate}
                onChange={(e) => setExitDate(e.target.value)}
                className={inputClass}
                onFocus={focusRing}
                onBlur={clearRing}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">Exit reason</label>
            <input
              type="text"
              placeholder="e.g. Resigned for a role at another company"
              value={exitReason}
              onChange={(e) => setExitReason(e.target.value)}
              className={inputClass}
              onFocus={focusRing}
              onBlur={clearRing}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">Handover person (optional)</label>
            <select
              value={handoverId}
              onChange={(e) => setHandoverId(e.target.value)}
              className={inputClass}
              onFocus={focusRing}
              onBlur={clearRing}
            >
              <option value="">No one assigned</option>
              {otherEmployees.map((e) => (
                <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">Replacement / successor (optional)</label>
            <select
              value={replacementId}
              onChange={(e) => setReplacementId(e.target.value)}
              className={`${inputClass} mb-2`}
              onFocus={focusRing}
              onBlur={clearRing}
            >
              <option value="">Not someone already in HRhub</option>
              {otherEmployees.map((e) => (
                <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Or a note, e.g. 'External hire pending', 'TBD'"
              value={replacementNote}
              onChange={(e) => setReplacementNote(e.target.value)}
              className={inputClass}
              onFocus={focusRing}
              onBlur={clearRing}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">Outstanding responsibilities</label>
            <textarea
              rows={2}
              placeholder="e.g. Close 3 open support tickets, hand off Q4 report"
              value={outstandingResponsibilities}
              onChange={(e) => setOutstandingResponsibilities(e.target.value)}
              className={inputClass}
              onFocus={focusRing}
              onBlur={clearRing}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">Outstanding company property</label>
            <textarea
              rows={2}
              placeholder="e.g. Laptop, access badge, company phone"
              value={outstandingProperty}
              onChange={(e) => setOutstandingProperty(e.target.value)}
              className={inputClass}
              onFocus={focusRing}
              onBlur={clearRing}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">Exit notes (optional)</label>
            <textarea
              rows={2}
              placeholder="Anything else worth recording"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={inputClass}
              onFocus={focusRing}
              onBlur={clearRing}
            />
          </div>

          <p className="text-[11px] text-[var(--color-text-muted)]">
            Recorded permanently in the Audit Log &mdash; not shown to the employee.
          </p>

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
              style={{ backgroundColor: "#cc3333", transitionTimingFunction: "var(--ease-out)" }}
            >
              {saving ? "Recording..." : "Record exit"}
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
