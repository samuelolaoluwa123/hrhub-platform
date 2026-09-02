"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

// 6.1 — the employee-driven clock-in/out flow has no way to represent
// someone who never showed up at all (there's no row to correct).
// This is HR's own write path: record an absence directly, for today
// or a recent past date.
export default function MarkAbsentDrawer({ open, onClose, onSaved, companyId, employees }) {
  const supabase = createClient();
  const [employeeId, setEmployeeId] = useState(employees[0]?.id ?? "");
  const [workDate, setWorkDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) return;
    setEmployeeId(employees[0]?.id ?? "");
    setWorkDate(new Date().toISOString().slice(0, 10));
    setNote("");
    setError(null);
  }, [open, employees]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const { error: dbError } = await supabase.from("attendance_records").insert({
      company_id: companyId,
      employee_id: employeeId,
      work_date: workDate,
      status: "absent",
      verification_note: note || null,
    });

    setSaving(false);
    if (dbError) { setError(dbError.message); return; }
    onSaved();
    onClose();
  }

  if (!open) return null;

  const inputClass = "w-full border border-black/10 rounded-lg px-3 py-2 text-sm outline-none transition-shadow duration-150";
  const focusRing = (e) => (e.target.style.boxShadow = "0 0 0 2px var(--color-accent)");
  const clearRing = (e) => (e.target.style.boxShadow = "none");

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/35 animate-[fadeIn_200ms_var(--ease-out)]" onClick={onClose} />
      <div className="absolute top-0 right-0 bottom-0 w-full max-w-[380px] bg-white p-7 overflow-y-auto shadow-2xl animate-[slideIn_280ms_var(--ease-out)]">
        <h2 className="font-display text-lg font-semibold text-[var(--color-text-primary)]">Mark absent</h2>
        <p className="text-sm text-[var(--color-text-muted)] mt-1 mb-6">Records a day with no clock-in at all.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">Employee</label>
            <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} required className={inputClass} onFocus={focusRing} onBlur={clearRing}>
              {employees.map((e) => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">Date</label>
            <input type="date" required value={workDate} onChange={(e) => setWorkDate(e.target.value)} className={inputClass} onFocus={focusRing} onBlur={clearRing} />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">Note (optional)</label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} className={inputClass} onFocus={focusRing} onBlur={clearRing} />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2.5 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-black/10 rounded-lg py-2.5 text-sm font-medium text-[var(--color-text-muted)] hover:bg-black/[0.03] transition-colors duration-150">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex-[1.4] rounded-lg py-2.5 text-sm font-medium text-white transition-transform duration-150 hover:scale-[1.02] active:scale-95 disabled:opacity-60" style={{ backgroundColor: "var(--color-primary)" }}>
              {saving ? "Saving..." : "Mark absent"}
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
