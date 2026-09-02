"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { computePayslip } from "@/lib/calculatePayroll";

export default function SalaryStructureDrawer({ open, onClose, onSaved, employee, structure, companyId, profileId }) {
  const supabase = createClient();
  const [baseSalary, setBaseSalary] = useState(structure?.base_salary ?? "");
  const [allowanceRows, setAllowanceRows] = useState(
    structure?.allowances && Object.keys(structure.allowances).length
      ? Object.entries(structure.allowances).map(([name, amount]) => ({ name, amount }))
      : [{ name: "", amount: "" }]
  );
  const [pensionRate, setPensionRate] = useState(structure?.pension_employee_rate ?? 8);
  const [pensionEmployerRate, setPensionEmployerRate] = useState(structure?.pension_employer_rate ?? 10);
  const [changeReason, setChangeReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const allowances = {};
  allowanceRows.forEach((row) => {
    if (row.name.trim()) allowances[row.name.trim()] = Number(row.amount) || 0;
  });

  const preview = computePayslip({ baseSalary, allowances, pensionEmployeeRate: pensionRate, pensionEmployerRate });

  function updateRow(i, field, value) {
    setAllowanceRows((rows) => rows.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  }
  function addRow() {
    setAllowanceRows((rows) => [...rows, { name: "", amount: "" }]);
  }
  function removeRow(i) {
    setAllowanceRows((rows) => rows.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const { error: dbError } = await supabase.from("salary_structures").upsert(
      {
        company_id: companyId,
        employee_id: employee.id,
        base_salary: Number(baseSalary) || 0,
        allowances,
        pension_employee_rate: Number(pensionRate) || 0,
        pension_employer_rate: Number(pensionEmployerRate) || 0,
        change_reason: changeReason.trim() || null,
        created_by: profileId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "employee_id" }
    );

    setSaving(false);

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
      <div className="absolute top-0 right-0 bottom-0 w-full max-w-[420px] bg-white p-7 overflow-y-auto shadow-2xl animate-[slideIn_280ms_var(--ease-out)]">
        <h2 className="font-display text-lg font-semibold text-[var(--color-text-primary)]">
          Salary structure
        </h2>
        <p className="text-sm text-[var(--color-text-muted)] mt-1 mb-6">
          {employee.first_name} {employee.last_name} &mdash; used to auto-calculate future payslips.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">Base salary (₦/mo)</label>
            <input
              type="number"
              min="0"
              required
              value={baseSalary}
              onChange={(e) => setBaseSalary(e.target.value)}
              className={inputClass}
              onFocus={focusRing}
              onBlur={clearRing}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">Allowances</label>
            <div className="space-y-2">
              {allowanceRows.map((row, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. Housing"
                    value={row.name}
                    onChange={(e) => updateRow(i, "name", e.target.value)}
                    className={inputClass}
                    onFocus={focusRing}
                    onBlur={clearRing}
                  />
                  <input
                    type="number"
                    min="0"
                    placeholder="₦"
                    value={row.amount}
                    onChange={(e) => updateRow(i, "amount", e.target.value)}
                    className={`${inputClass} max-w-[110px]`}
                    onFocus={focusRing}
                    onBlur={clearRing}
                  />
                  <button
                    type="button"
                    onClick={() => removeRow(i)}
                    className="shrink-0 w-9 h-9 rounded-lg border border-black/10 text-[var(--color-text-muted)] hover:bg-black/[0.03] transition-colors duration-150"
                    style={{ transitionTimingFunction: "var(--ease-out)" }}
                    aria-label="Remove allowance"
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addRow}
              className="mt-2 text-xs font-medium text-[var(--color-primary)] hover:underline"
            >
              + Add allowance
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">Pension — employee %</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={pensionRate}
                onChange={(e) => setPensionRate(e.target.value)}
                className={inputClass}
                onFocus={focusRing}
                onBlur={clearRing}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">Pension — employer %</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={pensionEmployerRate}
                onChange={(e) => setPensionEmployerRate(e.target.value)}
                className={inputClass}
                onFocus={focusRing}
                onBlur={clearRing}
              />
              <p className="text-[10.5px] text-[var(--color-text-muted)] mt-1">Disclosed on the payslip, never deducted from net pay.</p>
            </div>
          </div>

          {structure && (
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">
                Reason for change (optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Promotion, annual review"
                value={changeReason}
                onChange={(e) => setChangeReason(e.target.value)}
                className={inputClass}
                onFocus={focusRing}
                onBlur={clearRing}
              />
              <p className="text-[11px] text-[var(--color-text-muted)] mt-1">
                Recorded in the audit log alongside this change — not shown to the employee.
              </p>
            </div>
          )}

          <div className="rounded-lg bg-[var(--color-violet-tint)] px-4 py-3.5 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-[var(--color-text-muted)]">Gross pay</span><span className="font-mono">₦{preview.grossPay.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></div>
            <div className="flex justify-between"><span className="text-[var(--color-text-muted)]">Pension (employee)</span><span className="font-mono">−₦{preview.pensionMonthly.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></div>
            <div className="flex justify-between"><span className="text-[var(--color-text-muted)]">Pension (employer, not deducted)</span><span className="font-mono">₦{preview.pensionEmployerMonthly.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></div>
            <div className="flex justify-between"><span className="text-[var(--color-text-muted)]">Est. PAYE tax</span><span className="font-mono">−₦{preview.taxMonthly.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></div>
            <div className="flex justify-between font-medium text-[var(--color-primary)] pt-1 border-t border-black/[0.06]"><span>Est. net pay</span><span className="font-mono">₦{preview.netPay.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></div>
          </div>
          <p className="text-[11px] text-[var(--color-text-muted)] -mt-2">
            Estimate only — confirm tax/pension rules with your accountant before relying on this for compliance.
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
              {saving ? "Saving..." : "Save structure"}
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
