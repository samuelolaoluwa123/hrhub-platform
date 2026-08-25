"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const TYPE_LABEL = { advance: "Salary advance", loan: "Staff loan" };

function naira(n) {
  return `₦${Number(n || 0).toLocaleString()}`;
}

export default function ReviewLoanDrawer({ open, onClose, onSaved, loan, profileId }) {
  const supabase = createClient();
  const [repaymentMonths, setRepaymentMonths] = useState(loan.repayment_months);
  const [saving, setSaving] = useState(null); // "approve" | "reject" | null
  const [error, setError] = useState(null);

  const monthlyDeduction = Number(loan.amount) / (Number(repaymentMonths) || 1);

  async function handleDecision(status) {
    setSaving(status);
    setError(null);

    const payload = {
      status,
      reviewed_by: profileId,
      reviewed_at: new Date().toISOString(),
    };
    if (status === "approved") {
      payload.repayment_months = Number(repaymentMonths);
      payload.monthly_deduction = monthlyDeduction;
    }

    const { error: dbError } = await supabase.from("loans").update(payload).eq("id", loan.id);

    setSaving(null);

    if (dbError) {
      setError(dbError.message);
      return;
    }

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
        <h2 className="font-display text-lg font-semibold text-[var(--color-text-primary)]">
          {loan.employees.first_name} {loan.employees.last_name}
        </h2>
        <p className="text-sm text-[var(--color-text-muted)] mt-1 mb-6">
          {TYPE_LABEL[loan.loan_type]} &middot; {naira(loan.amount)}
        </p>

        {loan.reason && (
          <div className="rounded-lg bg-[var(--color-violet-tint)] px-4 py-3 mb-5 text-sm text-[var(--color-text-primary)]">
            {loan.reason}
          </div>
        )}

        <div className="mb-5">
          <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">Repay over how many months?</label>
          <input
            type="number"
            min="1"
            value={repaymentMonths}
            onChange={(e) => setRepaymentMonths(e.target.value)}
            className={inputClass}
            onFocus={focusRing}
            onBlur={clearRing}
          />
          <p className="text-xs text-[var(--color-text-muted)] mt-2">
            Deducted automatically from payroll: <span className="font-mono font-medium text-[var(--color-primary)]">{naira(monthlyDeduction)}</span>/month
          </p>
        </div>

        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

        <div className="flex gap-2.5">
          <button
            type="button"
            disabled={Boolean(saving)}
            onClick={() => handleDecision("rejected")}
            className="flex-1 border border-black/10 rounded-lg py-2.5 text-sm font-medium text-[#cc3333] hover:bg-[#fde8e8] transition-colors duration-150 disabled:opacity-50"
            style={{ transitionTimingFunction: "var(--ease-out)" }}
          >
            {saving === "rejected" ? "Rejecting..." : "Reject"}
          </button>
          <button
            type="button"
            disabled={Boolean(saving)}
            onClick={() => handleDecision("approved")}
            className="flex-[1.4] rounded-lg py-2.5 text-sm font-medium text-white transition-transform duration-150 hover:scale-[1.02] active:scale-95 disabled:opacity-60"
            style={{ backgroundColor: "var(--color-primary)", transitionTimingFunction: "var(--ease-out)" }}
          >
            {saving === "approved" ? "Approving..." : "Approve"}
          </button>
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
