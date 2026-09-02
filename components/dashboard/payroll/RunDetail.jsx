"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { sendNotificationEmail } from "@/lib/sendNotificationEmail";
import { computePayslip } from "@/lib/calculatePayroll";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const STATUS_BADGE = {
  draft: "bg-[#f3f2f5] text-[#706f83]",
  processed: "bg-[#fef3e2] text-[#d68a1f]",
  paid: "bg-[#e8f9f0] text-[#1a9c5f]",
};
const STATUS_LABEL = { draft: "Draft", processed: "Processed", paid: "Paid" };

export default function RunDetail({ run, employeesWithPayslips, companyId }) {
  const router = useRouter();
  const supabase = createClient();
  const [drawerEmployee, setDrawerEmployee] = useState(null);
  const [statusSaving, setStatusSaving] = useState(false);

  async function updateRunStatus(newStatus) {
    setStatusSaving(true);
    await supabase.from("payroll_runs").update({ status: newStatus }).eq("id", run.id);
    setStatusSaving(false);
    router.refresh();
  }

  const paidCount = employeesWithPayslips.filter((e) => e.payslip).length;

  return (
    <div>
      <button
        onClick={() => router.push("/dashboard/payroll")}
        className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors duration-150 mb-4 flex items-center gap-1"
        style={{ transitionTimingFunction: "var(--ease-out)" }}
      >
        ← Back to Payroll
      </button>

      <div className="flex flex-wrap justify-between items-start gap-3 mb-7">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <h1 className="font-display text-2xl font-semibold text-[var(--color-text-primary)]">
              {MONTH_NAMES[run.period_month - 1]} {run.period_year}
            </h1>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-md ${STATUS_BADGE[run.status]}`}>
              {STATUS_LABEL[run.status]}
            </span>
          </div>
          <p className="text-[var(--color-text-muted)] text-sm">
            {paidCount} of {employeesWithPayslips.length} employees have a payslip
          </p>
        </div>

        <div className="flex gap-2">
          {run.status === "draft" && (
            <button
              disabled={statusSaving}
              onClick={() => updateRunStatus("processed")}
              className="text-sm font-medium px-4 py-2.5 rounded-lg border border-black/10 text-[var(--color-text-muted)] hover:bg-black/[0.03] transition-colors duration-150 disabled:opacity-50"
              style={{ transitionTimingFunction: "var(--ease-out)" }}
            >
              Mark as processed
            </button>
          )}
          {run.status === "processed" && (
            <button
              disabled={statusSaving}
              onClick={() => updateRunStatus("paid")}
              className="text-sm font-medium px-4 py-2.5 rounded-lg text-white transition-transform duration-150 hover:scale-[1.03] active:scale-95 disabled:opacity-50"
              style={{ backgroundColor: "var(--color-primary)", transitionTimingFunction: "var(--ease-out)" }}
            >
              Mark as paid
            </button>
          )}
        </div>
      </div>

      <div className="bg-white border border-black/[0.06] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[520px]">
            <thead>
              <tr className="text-left text-[10.5px] font-semibold tracking-wide uppercase text-[#9089a0]">
                <th className="py-3.5 px-3.5">Employee</th>
                <th className="py-3.5 px-3.5">Net pay</th>
                <th className="py-3.5 px-3.5"></th>
              </tr>
            </thead>
            <tbody>
              {employeesWithPayslips.map((e, i) => (
                <tr
                  key={e.id}
                  className="border-t border-black/[0.05]"
                  style={{ animation: `rowIn 400ms var(--ease-out) ${i * 0.04}s both` }}
                >
                  <td className="py-3.5 px-3.5 font-medium text-[var(--color-text-primary)]">
                    {e.first_name} {e.last_name}
                  </td>
                  <td className="py-3.5 px-3.5 font-mono text-xs text-[var(--color-text-muted)]">
                    {e.payslip ? `₦${Number(e.payslip.net_pay).toLocaleString()}` : "—"}
                  </td>
                  <td className="py-3.5 px-3.5 text-right">
                    {e.payslip ? (
                      <span className="text-xs font-medium px-2.5 py-1 rounded-md bg-[#e8f9f0] text-[#1a9c5f]">
                        Added
                      </span>
                    ) : (
                      <button
                        onClick={() => setDrawerEmployee(e)}
                        className="text-xs font-medium px-3 py-1.5 rounded-md bg-[var(--color-violet-tint)] text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white transition-colors duration-150"
                        style={{ transitionTimingFunction: "var(--ease-out)" }}
                      >
                        Add payslip
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {drawerEmployee && (
        <AddPayslipDrawer
          employee={drawerEmployee}
          run={run}
          companyId={companyId}
          onClose={() => setDrawerEmployee(null)}
          onSaved={() => {
            setDrawerEmployee(null);
            router.refresh();
          }}
        />
      )}

      <style jsx global>{`
        @keyframes rowIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}

function AddPayslipDrawer({ employee, run, companyId, onClose, onSaved }) {
  const supabase = createClient();
  const structure = employee.structure;
  const activeLoans = employee.activeLoans || [];

  // If a salary structure exists, pre-fill from the calculator (see
  // lib/calculatePayroll.js) — still fully editable before saving,
  // since one-off cases (unpaid leave, a bonus) come up every run.
  const initial = structure
    ? computePayslip({
        baseSalary: structure.base_salary,
        allowances: structure.allowances,
        pensionEmployeeRate: structure.pension_employee_rate,
      })
    : null;

  // Whatever's left owed on each approved loan/advance, capped at its
  // monthly installment — this run's automatic deduction.
  const loanDeduction = activeLoans.reduce(
    (sum, l) => sum + Math.min(Number(l.monthly_deduction), Number(l.amount) - Number(l.amount_repaid)),
    0
  );

  const [gross, setGross] = useState(initial ? String(Math.round(initial.grossPay)) : "");
  const [deductions, setDeductions] = useState(
    String(Math.round((initial ? initial.totalDeductions : 0) + loanDeduction))
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const net = Number(gross || 0) - Number(deductions || 0);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const { error: dbError } = await supabase.from("payslips").insert({
      company_id: companyId,
      payroll_run_id: run.id,
      employee_id: employee.id,
      gross_pay: Number(gross),
      deductions: Number(deductions || 0),
      net_pay: net,
      // Keep the calculated breakdown for reference even if the admin
      // tweaked the final numbers above — null when there was no
      // salary structure to calculate from at all (fully manual entry).
      breakdown: initial
        ? {
            base_salary: initial.baseSalary,
            allowances: initial.allowances,
            pension_monthly: initial.pensionMonthly,
            tax_monthly: initial.taxMonthly,
          }
        : null,
    });

    setSaving(false);

    if (dbError) {
      setError(dbError.message);
      return;
    }

    // Apply this run's deduction to each active loan/advance — capped
    // at what's actually still owed, marking it completed once repaid.
    await Promise.all(
      activeLoans.map((l) => {
        const installment = Math.min(Number(l.monthly_deduction), Number(l.amount) - Number(l.amount_repaid));
        const newRepaid = Number(l.amount_repaid) + installment;
        return supabase
          .from("loans")
          .update({
            amount_repaid: newRepaid,
            status: newRepaid >= Number(l.amount) ? "completed" : "approved",
          })
          .eq("id", l.id);
      })
    );

    if (employee.profile_id) {
      await supabase.from("notifications").insert({
        company_id: companyId,
        profile_id: employee.profile_id,
        type: "payroll",
        message: `Your payslip for ${MONTH_NAMES[run.period_month - 1]} ${run.period_year} is ready.`,
        link: "/dashboard/payroll",
      });
    }

    if (employee.email) {
      sendNotificationEmail({
        to: employee.email,
        subject: `Your payslip for ${MONTH_NAMES[run.period_month - 1]} ${run.period_year} is ready`,
        message: `Your payslip for ${MONTH_NAMES[run.period_month - 1]} ${run.period_year} has been added and is ready to view.`,
        link: "/dashboard/payroll",
      });
    }

    onSaved();
  }

  const inputClass = "w-full border border-black/10 rounded-lg px-3 py-2 text-sm outline-none";

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/35 animate-[fadeIn_200ms_var(--ease-out)]" onClick={onClose} />
      <div className="absolute top-0 right-0 bottom-0 w-full max-w-[360px] bg-white p-7 overflow-y-auto shadow-2xl animate-[slideIn_280ms_var(--ease-out)]">
        <h2 className="font-display text-lg font-semibold text-[var(--color-text-primary)]">Add payslip</h2>
        <p className="text-sm text-[var(--color-text-muted)] mt-1 mb-1">
          For {employee.first_name} {employee.last_name}
        </p>
        <p className="text-xs mb-1" style={{ color: structure ? "var(--color-primary)" : "var(--color-text-muted)" }}>
          {structure
            ? "Pre-filled from their salary structure — pension and estimated tax already factored in. Edit freely before saving."
            : "No salary structure set for them yet — enter figures manually, or set one up first from the Payroll page."}
        </p>
        {loanDeduction > 0 && (
          <p className="text-xs text-[var(--color-primary)] mb-1">
            Includes ₦{Math.round(loanDeduction).toLocaleString()} loan/advance repayment for this run, applied automatically on save.
          </p>
        )}
        <div className="mb-6" />

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">Gross pay (₦)</label>
            <input
              type="number"
              required
              min="0"
              value={gross}
              onChange={(e) => setGross(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">Deductions (₦)</label>
            <input
              type="number"
              min="0"
              value={deductions}
              onChange={(e) => setDeductions(e.target.value)}
              className={inputClass}
            />
          </div>

          <p className="text-sm font-mono text-[var(--color-text-primary)]">
            Net pay: ₦{net.toLocaleString()}
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
              {saving ? "Saving..." : "Add payslip"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
