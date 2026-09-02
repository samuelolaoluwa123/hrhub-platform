"use client";

import { useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { sendNotificationEmail } from "@/lib/sendNotificationEmail";

function daysBetween(start, end) {
  const s = new Date(start);
  const e = new Date(end);
  const diff = Math.round((e - s) / (1000 * 60 * 60 * 24));
  return diff >= 0 ? diff + 1 : null;
}

// 7.2 — before submitting, show exactly what the brief asks for:
// "You have N days remaining." The real enforcement is a database
// trigger (enforce_leave_balance) that blocks the insert server-side
// regardless of what this UI shows — this is a proactive heads-up,
// not the actual gate, so it can't be bypassed by a stale prop.
export default function LeaveRequestDrawer({ open, onClose, onSaved, leaveTypes, employeeId, companyId, myBalances, pendingByEmployeeAndType }) {
  const supabase = createClient();
  const [leaveTypeId, setLeaveTypeId] = useState(leaveTypes[0]?.id ?? "");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const days = startDate && endDate ? daysBetween(startDate, endDate) : null;

  const remaining = useMemo(() => {
    const balance = myBalances.find((b) => b.leave_type_id === leaveTypeId);
    if (!balance) return null;
    const pending = pendingByEmployeeAndType[`${employeeId}:${leaveTypeId}`] ?? 0;
    return Number(balance.days_allocated) - Number(balance.days_used) - pending;
  }, [myBalances, pendingByEmployeeAndType, leaveTypeId, employeeId]);

  const exceedsBalance = remaining != null && days != null && days > remaining;

  async function handleSubmit(e) {
    e.preventDefault();

    if (days === null) {
      setError("End date must be on or after the start date.");
      return;
    }

    setSaving(true);
    setError(null);

    const { error: dbError } = await supabase.from("leave_requests").insert({
      company_id: companyId,
      employee_id: employeeId,
      leave_type_id: leaveTypeId,
      start_date: startDate,
      end_date: endDate,
      days_requested: days,
      reason: reason || null,
      status: "pending",
    });

    if (dbError) {
      setSaving(false);
      // The DB trigger's own message ("Insufficient leave balance —
      // you have N day(s) remaining." / "No X balance has been
      // allocated...") is already written for a human to read —
      // surfaced as-is, same as every other trigger-raised error in
      // this app.
      setError(dbError.message);
      return;
    }

    // Notify everyone who can approve leave — a manual fan-out insert
    // since there's no server-side trigger for this yet.
    const { data: approvers } = await supabase
      .from("profiles")
      .select("id, email")
      .eq("company_id", companyId)
      .in("role", ["admin", "manager"]);

    if (approvers?.length) {
      await supabase.from("notifications").insert(
        approvers.map((a) => ({
          company_id: companyId,
          profile_id: a.id,
          type: "leave",
          message: "A new leave request needs your review.",
          link: "/dashboard/leave",
        }))
      );

      approvers.forEach((a) =>
        sendNotificationEmail({
          to: a.email,
          subject: "New leave request awaiting your review",
          message: "A new leave request has been submitted and needs your review.",
          link: "/dashboard/leave",
        })
      );
    }

    setSaving(false);
    setStartDate("");
    setEndDate("");
    setReason("");
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
      <div
        className="absolute inset-0 bg-black/35 animate-[fadeIn_200ms_var(--ease-out)]"
        onClick={onClose}
      />
      <div className="absolute top-0 right-0 bottom-0 w-full max-w-[380px] bg-white p-7 overflow-y-auto shadow-2xl animate-[slideIn_280ms_var(--ease-out)]">
        <h2 className="font-display text-lg font-semibold text-[var(--color-text-primary)]">
          Request leave
        </h2>
        <p className="text-sm text-[var(--color-text-muted)] mt-1 mb-6">
          Your request goes to your admin or manager for approval.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">
              Leave type
            </label>
            <select
              value={leaveTypeId}
              onChange={(e) => setLeaveTypeId(e.target.value)}
              required
              className={inputClass}
              onFocus={focusRing}
              onBlur={clearRing}
            >
              {leaveTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-[var(--color-text-muted)] mt-1.5">
              {remaining == null
                ? "No balance allocated yet for this type — contact HR."
                : `You have ${remaining} day${remaining === 1 ? "" : "s"} remaining.`}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">
                Start date
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={inputClass}
                onFocus={focusRing}
                onBlur={clearRing}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">
                End date
              </label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={inputClass}
                onFocus={focusRing}
                onBlur={clearRing}
              />
            </div>
          </div>

          {days !== null && (
            <p className={`text-xs font-mono ${exceedsBalance ? "text-red-600 font-medium" : "text-[var(--color-text-muted)]"}`}>
              {exceedsBalance
                ? `❌ Insufficient leave balance — ${days} day${days !== 1 ? "s" : ""} requested, only ${remaining} remaining.`
                : `${days} day${days !== 1 ? "s" : ""} requested`}
            </p>
          )}

          <div>
            <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">
              Reason <span className="text-[var(--color-text-muted)] font-normal">(optional)</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
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
              style={{
                backgroundColor: "var(--color-primary)",
                transitionTimingFunction: "var(--ease-out)",
              }}
            >
              {saving ? "Submitting..." : "Submit request"}
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
