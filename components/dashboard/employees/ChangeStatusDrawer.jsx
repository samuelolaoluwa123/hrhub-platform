"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/dashboard/ToastProvider";

const inputClass = "w-full border border-black/10 rounded-lg px-3 py-2 text-sm outline-none transition-shadow duration-150";
const focusRing = (e) => (e.target.style.boxShadow = "0 0 0 2px var(--color-accent)");
const clearRing = (e) => (e.target.style.boxShadow = "none");

// For transitions between non-exit statuses (Active <-> Probation <-> On
// Leave <-> Suspended <-> Inactive). Exit statuses (Resigned, Terminated,
// Retired, Deceased) go through ExitEmployeeDrawer instead — they need
// handover/replacement/outstanding-items detail this form doesn't ask for.
//
// Phase 5 — a status's real-world effect on portal login is now its own
// explicit, admin-configurable flag (blocks_login, set from Settings →
// Employee Statuses) rather than being silently hardwired to "is this
// an exit status." Whatever the company has configured, this drawer
// just follows it.
export default function ChangeStatusDrawer({ open, onClose, onSaved, employee, statuses }) {
  const supabase = createClient();
  const toast = useToast();
  // Deactivated statuses (Settings → Employee Statuses) aren't offered
  // as a new choice, same as a deactivated leave type isn't offered on
  // a new leave request — the fallback below still handles an employee
  // whose *current* status was since deactivated.
  const nonExitStatuses = statuses.filter((s) => !s.is_exit && s.is_active !== false);
  const statusByName = new Map(statuses.map((s) => [s.name, s]));

  const [status, setStatus] = useState("");
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // The drawer stays mounted the whole time (EmployeesTable renders it
  // unconditionally, toggling `open`/`employee`) — a bare useState
  // initializer only runs once on first mount, so it'd never pick up a
  // later employee without this.
  //
  // Real bug found while testing the exit-access-restore flow: this
  // used to default straight to `employee.status`, but this drawer's
  // <select> only ever lists non-exit statuses. When the employee's
  // current status IS an exit status (exactly the reactivation case —
  // the only reason this drawer would ever be opened on an exited
  // employee), that value matches none of the <option>s. A controlled
  // <select> with no matching option can't mark anything as selected,
  // so the browser visually falls back to showing the first option
  // ("Active") while React's own `status` state silently keeps holding
  // the real (exit) value the whole time — the dropdown *looks* like
  // "Active" is chosen, but submitting sends the invisible old status,
  // completely unchanged. Falling back to the first real option here
  // keeps what's displayed and what's submitted in sync.
  useEffect(() => {
    if (!open) return;
    const currentIsValidOption = nonExitStatuses.some((s) => s.name === employee?.status);
    setStatus(currentIsValidOption ? employee.status : nonExitStatuses[0]?.name ?? "");
    setEffectiveDate(new Date().toISOString().slice(0, 10));
    setReason("");
    setNotes("");
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, employee]);

  if (!open || !employee) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);

    const oldBlocksLogin = statusByName.get(employee.status)?.blocks_login ?? false;
    const newBlocksLogin = statusByName.get(status)?.blocks_login ?? false;

    const { error: dbError } = await supabase
      .from("employees")
      .update({
        status,
        status_effective_date: effectiveDate || null,
        change_reason: reason.trim() || null,
        change_notes: notes.trim() || null,
      })
      .eq("id", employee.id);

    if (dbError) {
      setSaving(false);
      setError(dbError.message);
      return;
    }

    // Phase 5 — follows whatever the target status is actually
    // configured to do, in either direction: moving onto a
    // blocks_login status (e.g. a mis-recorded exit's original exit
    // status, or a non-exit status a company has explicitly opted
    // into banning login for) revokes access the same way
    // ExitEmployeeDrawer does; moving off one restores it. A same-to-
    // same transition (both block, or neither does) correctly does
    // nothing. Non-blocking, same as before — the status change itself
    // already succeeded regardless of whether this call works.
    if (oldBlocksLogin !== newBlocksLogin) {
      try {
        await fetch("/api/employees/portal-access", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ employeeId: employee.id, restore: !newBlocksLogin }),
        });
      } catch (accessErr) {
        console.error("Failed to update portal access:", accessErr);
      }
    }

    setSaving(false);
    toast.showSuccess(`${employee.first_name}'s status updated to ${status}.`);
    onSaved();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/35 animate-[fadeIn_200ms_var(--ease-out)]" onClick={onClose} />
      <div className="absolute top-0 right-0 bottom-0 w-full max-w-[380px] bg-white p-7 overflow-y-auto shadow-2xl animate-[slideIn_280ms_var(--ease-out)]">
        <h2 className="font-display text-lg font-semibold text-[var(--color-text-primary)]">
          Change status
        </h2>
        <p className="text-sm text-[var(--color-text-muted)] mt-1 mb-6">
          {employee.first_name} {employee.last_name} &mdash; currently {employee.status}.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">New status</label>
            <select
              required
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className={inputClass}
              onFocus={focusRing}
              onBlur={clearRing}
            >
              {nonExitStatuses.map((s) => (
                <option key={s.id} value={s.name}>{s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">Effective date</label>
            <input
              type="date"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
              className={inputClass}
              onFocus={focusRing}
              onBlur={clearRing}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">Reason (optional)</label>
            <input
              type="text"
              placeholder="e.g. Approved medical leave"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className={inputClass}
              onFocus={focusRing}
              onBlur={clearRing}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">Notes (optional)</label>
            <textarea
              rows={3}
              placeholder="Any extra detail worth recording"
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
              style={{ backgroundColor: "var(--color-primary)", transitionTimingFunction: "var(--ease-out)" }}
            >
              {saving ? "Saving..." : "Save status"}
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
