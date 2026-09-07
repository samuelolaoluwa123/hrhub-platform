"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/dashboard/ToastProvider";

const inputClass = "w-full border border-black/10 rounded-lg px-3 py-2 text-sm outline-none transition-shadow duration-150";
const focusRing = (e) => (e.target.style.boxShadow = "0 0 0 2px var(--color-accent)");
const clearRing = (e) => (e.target.style.boxShadow = "none");

// 13 — a deliberate, audited, admin-triggered purge of an exited
// employee's sensitive documents. No automatic timer anywhere in this
// app decides when this happens — an admin has to actively choose to
// do it, with a reason, once the company's real retention period
// (confirmed with a privacy professional, not guessed by HRhub) says
// it's time.
export default function PurgeDocumentsDrawer({ open, onClose, onPurged, employee }) {
  const toast = useToast();
  const [reason, setReason] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) return;
    setReason("");
    setConfirmText("");
    setError(null);
  }, [open, employee]);

  if (!open || !employee) return null;

  const confirmed = confirmText.trim().toUpperCase() === "PURGE";

  async function handleSubmit(e) {
    e.preventDefault();
    if (!confirmed) return;
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/employees/purge-documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId: employee.id, reason: reason.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || "Something went wrong purging documents.");
        setSaving(false);
        return;
      }
      toast.showSuccess(`Documents purged for ${employee.first_name} ${employee.last_name}.`);
      onPurged(data.purgedCount ?? 0);
      onClose();
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/35 animate-[fadeIn_200ms_var(--ease-out)]" onClick={onClose} />
      <div className="absolute top-0 right-0 bottom-0 w-full max-w-[380px] bg-white p-7 overflow-y-auto shadow-2xl animate-[slideIn_280ms_var(--ease-out)]">
        <h2 className="font-display text-lg font-semibold text-[#cc3333]">Purge documents</h2>
        <p className="text-sm text-[var(--color-text-muted)] mt-1 mb-6">
          {employee.first_name} {employee.last_name} — this permanently deletes every uploaded document
          (passport photo, ID, medical record, contract, etc.) and their avatar photo. This cannot be undone.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">
              Reason (required)
            </label>
            <textarea
              required
              rows={2}
              placeholder="e.g. Retention period elapsed per company policy"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className={inputClass}
              onFocus={focusRing}
              onBlur={clearRing}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">
              Type PURGE to confirm
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className={inputClass}
              onFocus={focusRing}
              onBlur={clearRing}
              autoComplete="off"
            />
          </div>

          <p className="text-[11px] text-[var(--color-text-muted)]">
            Recorded permanently in the Audit Log, including your reason — this is the one record of the
            purge that survives it.
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
              disabled={saving || !confirmed || !reason.trim()}
              className="flex-[1.4] rounded-lg py-2.5 text-sm font-medium text-white transition-transform duration-150 hover:scale-[1.02] active:scale-95 disabled:opacity-50"
              style={{ backgroundColor: "#cc3333", transitionTimingFunction: "var(--ease-out)" }}
            >
              {saving ? "Purging..." : "Purge documents"}
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
