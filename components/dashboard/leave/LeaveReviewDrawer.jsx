"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { sendNotificationEmail } from "@/lib/sendNotificationEmail";

function formatRange(start, end) {
  const opts = { month: "short", day: "numeric", year: "numeric" };
  return `${new Date(start).toLocaleDateString("en-US", opts)} – ${new Date(end).toLocaleDateString("en-US", opts)}`;
}
function formatDate(value) {
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// 7.4 — every field the brief asks a leave decision to record:
// requested by / date requested (the request itself, shown above),
// leave type, days, approver (the signed-in reviewer), decision,
// decision date, and now a real reason/comment on the decision
// itself — separate from the employee's own reason for asking.
export default function LeaveReviewDrawer({ open, onClose, onSaved, request, profileId }) {
  const supabase = createClient();
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(null); // "approved" | "rejected" | null
  const [error, setError] = useState(null);

  // Stays mounted across open/close (parent only toggles `open`) —
  // resync per the same pattern already established in this codebase
  // for every other drawer that behaves this way.
  useEffect(() => {
    if (!open) return;
    setComment("");
    setError(null);
  }, [open, request?.id]);

  async function handleDecision(status) {
    setSaving(status);
    setError(null);

    const { error: dbError } = await supabase
      .from("leave_requests")
      .update({
        status,
        reviewed_by: profileId,
        reviewed_at: new Date().toISOString(),
        decision_comment: comment || null,
      })
      .eq("id", request.id);

    if (dbError) {
      setSaving(null);
      setError(dbError.message);
      return;
    }

    // Same dual-channel (in-app + email) notification pattern already
    // used for this exact outcome elsewhere in the app.
    if (request.employees?.profile_id) {
      await supabase.from("notifications").insert({
        company_id: request.employees.company_id,
        profile_id: request.employees.profile_id,
        type: "leave",
        message: `Your leave request was ${status}.${comment ? ` "${comment}"` : ""}`,
        link: "/dashboard/leave",
      });
    }
    if (request.employees?.email) {
      sendNotificationEmail({
        to: request.employees.email,
        subject: `Your leave request was ${status}`,
        message: `Your leave request (${formatRange(request.start_date, request.end_date)}) has been ${status} by your admin or manager.${comment ? `\n\nComment: ${comment}` : ""}`,
        link: "/dashboard/leave",
      });
    }

    setSaving(null);
    onSaved();
    onClose();
  }

  if (!open || !request) return null;

  const inputClass = "w-full border border-black/10 rounded-lg px-3 py-2 text-sm outline-none transition-shadow duration-150";
  const focusRing = (e) => (e.target.style.boxShadow = "0 0 0 2px var(--color-accent)");
  const clearRing = (e) => (e.target.style.boxShadow = "none");

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/35 animate-[fadeIn_200ms_var(--ease-out)]" onClick={onClose} />
      <div className="absolute top-0 right-0 bottom-0 w-full max-w-[420px] bg-white p-7 overflow-y-auto shadow-2xl animate-[slideIn_280ms_var(--ease-out)]">
        <h2 className="font-display text-lg font-semibold text-[var(--color-text-primary)]">
          {request.employees.first_name} {request.employees.last_name}
        </h2>
        <p className="text-sm text-[var(--color-text-muted)] mt-0.5 mb-6">Requested {formatDate(request.created_at)}</p>

        <div className="rounded-lg border border-black/[0.06] p-4 space-y-2 mb-6">
          <div className="flex justify-between text-sm">
            <span className="text-[var(--color-text-muted)]">Leave type</span>
            <span className="font-medium text-[var(--color-text-primary)]">{request.leave_types.name}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[var(--color-text-muted)]">Dates</span>
            <span className="font-medium text-[var(--color-text-primary)] font-mono">{formatRange(request.start_date, request.end_date)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[var(--color-text-muted)]">Days</span>
            <span className="font-medium text-[var(--color-text-primary)]">{request.days_requested}</span>
          </div>
          {request.reason && (
            <div className="pt-2 border-t border-black/[0.05]">
              <p className="text-[10.5px] font-semibold tracking-wide uppercase text-[#9089a0] mb-1">Their reason</p>
              <p className="text-sm text-[var(--color-text-primary)]">{request.reason}</p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">
              Your comment <span className="text-[var(--color-text-muted)] font-normal">(optional)</span>
            </label>
            <textarea
              value={comment} onChange={(e) => setComment(e.target.value)} rows={3}
              placeholder="Visible to the employee"
              className={inputClass} onFocus={focusRing} onBlur={clearRing}
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
              type="button" onClick={() => handleDecision("rejected")} disabled={Boolean(saving)}
              className="flex-1 rounded-lg py-2.5 text-sm font-medium text-white transition-transform duration-150 hover:scale-[1.02] active:scale-95 disabled:opacity-60 bg-[#cc3333]"
            >
              {saving === "rejected" ? "Rejecting..." : "Reject"}
            </button>
            <button
              type="button" onClick={() => handleDecision("approved")} disabled={Boolean(saving)}
              className="flex-1 rounded-lg py-2.5 text-sm font-medium text-white transition-transform duration-150 hover:scale-[1.02] active:scale-95 disabled:opacity-60"
              style={{ backgroundColor: "var(--color-primary)" }}
            >
              {saving === "approved" ? "Approving..." : "Approve"}
            </button>
          </div>
        </div>
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
