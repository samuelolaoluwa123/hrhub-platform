"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function RequestLoanDrawer({ open, onClose, onSaved, employeeId, companyId }) {
  const supabase = createClient();
  const [loanType, setLoanType] = useState("advance");
  const [amount, setAmount] = useState("");
  const [repaymentMonths, setRepaymentMonths] = useState(1);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const { error: dbError } = await supabase.from("loans").insert({
      company_id: companyId,
      employee_id: employeeId,
      loan_type: loanType,
      amount: Number(amount),
      repayment_months: Number(repaymentMonths),
      reason: reason || null,
      status: "pending",
    });

    setSaving(false);

    if (dbError) {
      setError(dbError.message);
      return;
    }

    setAmount("");
    setReason("");
    setRepaymentMonths(1);
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
        <h2 className="font-display text-lg font-semibold text-[var(--color-text-primary)]">Request advance/loan</h2>
        <p className="text-sm text-[var(--color-text-muted)] mt-1 mb-6">
          Goes to your admin or manager for approval. If approved, it's repaid automatically from your future payslips.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">Type</label>
            <select
              value={loanType}
              onChange={(e) => setLoanType(e.target.value)}
              className={inputClass}
              onFocus={focusRing}
              onBlur={clearRing}
            >
              <option value="advance">Salary advance (repaid next payslip)</option>
              <option value="loan">Staff loan (repaid over time)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">Amount (₦)</label>
            <input
              type="number"
              min="1"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={inputClass}
              onFocus={focusRing}
              onBlur={clearRing}
            />
          </div>

          {loanType === "loan" && (
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">
                Repay over how many months?
              </label>
              <input
                type="number"
                min="2"
                value={repaymentMonths}
                onChange={(e) => setRepaymentMonths(e.target.value)}
                className={inputClass}
                onFocus={focusRing}
                onBlur={clearRing}
              />
              <p className="text-[11px] text-[var(--color-text-muted)] mt-1">
                Your admin can adjust this when reviewing your request.
              </p>
            </div>
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
              style={{ backgroundColor: "var(--color-primary)", transitionTimingFunction: "var(--ease-out)" }}
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
