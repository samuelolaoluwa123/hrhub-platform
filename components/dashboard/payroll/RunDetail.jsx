"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { sendNotificationEmail } from "@/lib/sendNotificationEmail";
import { computePayslip } from "@/lib/calculatePayroll";
import { downloadPayslipPdf } from "@/lib/generatePayslipPdf";

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

function periodLabel(month, year) {
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

export default function RunDetail({ run, employeesWithPayslips, companyId, company, profileId }) {
  const router = useRouter();
  const supabase = createClient();
  const [drawerEmployee, setDrawerEmployee] = useState(null);
  const [adjustingEmployee, setAdjustingEmployee] = useState(null);
  const [statusSaving, setStatusSaving] = useState(false);

  async function updateRunStatus(newStatus) {
    setStatusSaving(true);
    await supabase.from("payroll_runs").update({ status: newStatus }).eq("id", run.id);
    setStatusSaving(false);
    router.refresh();
  }

  function handleDownload(e) {
    downloadPayslipPdf({
      companyName: company?.name,
      companyAddress: company?.address,
      companyRcNumber: company?.rc_number,
      employeeName: `${e.first_name} ${e.last_name}`,
      jobTitle: e.job_title,
      department: e.department,
      employeeRef: e.id.slice(0, 8).toUpperCase(),
      bankName: e.bank_name,
      bankAccountNumber: e.bank_account_number,
      periodLabel: periodLabel(run.period_month, run.period_year),
      payDate: new Date(e.payslip.created_at ?? Date.now()).toLocaleDateString("en-GB"),
      grossPay: Number(e.payslip.gross_pay),
      deductions: Number(e.payslip.deductions),
      netPay: Number(e.payslip.net_pay),
      breakdown: e.payslip.breakdown,
      loanRepayments: e.payslipLoanRepayments,
    });
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
                      <div className="flex items-center gap-1.5 justify-end">
                        {e.payslipAdjustments.length > 0 && (
                          <span className="text-[10.5px] font-medium px-2 py-1 rounded-md bg-[#fef3e2] text-[#d68a1f]">Adjusted</span>
                        )}
                        <button
                          onClick={() => handleDownload(e)}
                          className="text-xs font-medium px-3 py-1.5 rounded-md bg-[var(--color-violet-tint)] text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white transition-colors duration-150"
                          style={{ transitionTimingFunction: "var(--ease-out)" }}
                        >
                          Download
                        </button>
                        <button
                          onClick={() => setAdjustingEmployee(e)}
                          className="text-xs font-medium px-3 py-1.5 rounded-md border border-black/10 text-[var(--color-text-muted)] hover:bg-black/[0.03] transition-colors duration-150"
                          style={{ transitionTimingFunction: "var(--ease-out)" }}
                        >
                          Adjust
                        </button>
                      </div>
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

      {adjustingEmployee && (
        <PayslipAdjustDrawer
          employee={adjustingEmployee}
          companyId={companyId}
          profileId={profileId}
          onClose={() => setAdjustingEmployee(null)}
          onSaved={() => {
            setAdjustingEmployee(null);
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
        pensionEmployerRate: structure.pension_employer_rate,
      })
    : null;

  const [gross, setGross] = useState(initial ? String(Math.round(initial.grossPay)) : "");
  const [otherDeductions, setOtherDeductions] = useState(String(Math.round(initial ? initial.totalDeductions : 0)));
  // Loan/advance repayment is its own explicit, per-loan, editable
  // line — not silently folded into one combined deductions number.
  // Whatever ends up here is exactly what gets recorded against the
  // loan below, so the two can never diverge (the bug this replaces:
  // the old single deductions field could be edited freely while the
  // loan was always marked repaid by the original computed amount
  // regardless).
  const [loanRepayments, setLoanRepayments] = useState(() => {
    const defaults = {};
    activeLoans.forEach((l) => {
      const owed = Number(l.amount) - Number(l.amount_repaid);
      defaults[l.id] = String(Math.round(Math.min(Number(l.monthly_deduction), owed)));
    });
    return defaults;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const totalLoanRepayment = activeLoans.reduce((sum, l) => sum + Number(loanRepayments[l.id] || 0), 0);
  const deductions = Number(otherDeductions || 0) + totalLoanRepayment;
  const net = Number(gross || 0) - deductions;

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const { data: payslip, error: dbError } = await supabase
      .from("payslips")
      .insert({
        company_id: companyId,
        payroll_run_id: run.id,
        employee_id: employee.id,
        gross_pay: Number(gross),
        deductions,
        net_pay: net,
        // Keep the calculated breakdown for reference even if the admin
        // tweaked the final numbers above — null when there was no
        // salary structure to calculate from at all (fully manual
        // entry). This is what the payslip PDF's earnings/pension/tax
        // sections render from — a real snapshot at issue time, not
        // recomputed later from a salary structure that may have since
        // changed.
        breakdown: initial
          ? {
              base_salary: initial.baseSalary,
              allowances: initial.allowances,
              pension_monthly: initial.pensionMonthly,
              pension_employee_rate: structure.pension_employee_rate,
              pension_employer_monthly: initial.pensionEmployerMonthly,
              pension_employer_rate: structure.pension_employer_rate,
              tax_monthly: initial.taxMonthly,
              annual_gross: initial.annualGross,
              annual_pension: initial.pensionMonthly * 12,
              annual_chargeable_income: initial.taxableAnnual,
              annual_tax: initial.annualTax,
            }
          : null,
      })
      .select("id")
      .single();

    if (dbError) {
      setSaving(false);
      setError(dbError.message);
      return;
    }

    // Apply exactly what this payslip actually shows as this loan's
    // repayment — never the pre-computed default — and log it as a
    // real ledger row tied to this specific run, so the running total
    // and the run-by-run history can never disagree. Skips any loan
    // the admin zeroed out for this run (e.g. an agreed skip month).
    const loansToApply = activeLoans.filter((l) => Number(loanRepayments[l.id] || 0) > 0);
    const loanError = (
      await Promise.all(
        loansToApply.map(async (l) => {
          const amount = Number(loanRepayments[l.id]);
          const newRepaid = Number(l.amount_repaid) + amount;

          const { error: ledgerError } = await supabase.from("loan_repayments").insert({
            company_id: companyId,
            loan_id: l.id,
            payroll_run_id: run.id,
            payslip_id: payslip.id,
            employee_id: employee.id,
            amount,
          });
          if (ledgerError) return ledgerError;

          const { error: loanUpdateError } = await supabase
            .from("loans")
            .update({
              amount_repaid: newRepaid,
              status: newRepaid >= Number(l.amount) ? "completed" : "approved",
            })
            .eq("id", l.id);
          return loanUpdateError;
        })
      )
    ).find(Boolean);

    setSaving(false);

    if (loanError) {
      // The payslip itself already saved successfully — surface this
      // separately rather than pretending the whole save failed, since
      // retrying handleSubmit would try to insert a duplicate payslip.
      setError(`Payslip saved, but a loan repayment didn't record: ${loanError.message}`);
      return;
    }

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
            <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">Other deductions (₦)</label>
            <input
              type="number"
              min="0"
              value={otherDeductions}
              onChange={(e) => setOtherDeductions(e.target.value)}
              className={inputClass}
            />
          </div>

          {activeLoans.length > 0 && (
            <div className="space-y-3 rounded-lg bg-[var(--color-violet-tint)] p-3.5">
              <p className="text-[10.5px] font-semibold tracking-wide uppercase text-[var(--color-primary)]">
                Loan/advance repayment — applied to the loan exactly as entered here
              </p>
              {activeLoans.map((l) => {
                const owed = Number(l.amount) - Number(l.amount_repaid);
                return (
                  <div key={l.id}>
                    <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">
                      {l.loan_type === "advance" ? "Salary advance" : "Staff loan"} — ₦{owed.toLocaleString()} owed
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={owed}
                      value={loanRepayments[l.id] ?? ""}
                      onChange={(e) => setLoanRepayments((prev) => ({ ...prev, [l.id]: e.target.value }))}
                      className={`${inputClass} bg-white`}
                    />
                  </div>
                );
              })}
            </div>
          )}

          <p className="text-sm font-mono text-[var(--color-text-primary)]">
            Total deductions: ₦{deductions.toLocaleString()} · Net pay: ₦{net.toLocaleString()}
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

// 11 Payroll locking — the original payslip is never touched (it has
// no UPDATE/DELETE policy at all, unconditionally). A correction is
// its own permanent row instead: what it was, what it should be, and
// why — the "Adjustment -> authorization -> audit record" the brief
// describes. Authorization is admin-only RLS (already enforced
// server-side, not just this form); the audit record is this row
// itself, plus a matching audit_log entry via the same trigger every
// other lifecycle event in this app goes through.
function PayslipAdjustDrawer({ employee, companyId, profileId, onClose, onSaved }) {
  const supabase = createClient();
  const payslip = employee.payslip;
  const [grossPay, setGrossPay] = useState(String(payslip.gross_pay));
  const [deductions, setDeductions] = useState(String(payslip.deductions));
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const netPay = Number(grossPay || 0) - Number(deductions || 0);
  const unchanged = Number(grossPay) === Number(payslip.gross_pay) && Number(deductions) === Number(payslip.deductions);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!reason.trim()) {
      setError("A reason is required to record a correction.");
      return;
    }
    setSaving(true);
    setError(null);

    const { error: dbError } = await supabase.from("payslip_adjustments").insert({
      company_id: companyId,
      payslip_id: payslip.id,
      employee_id: employee.id,
      original_gross_pay: payslip.gross_pay,
      original_deductions: payslip.deductions,
      original_net_pay: payslip.net_pay,
      corrected_gross_pay: Number(grossPay),
      corrected_deductions: Number(deductions),
      corrected_net_pay: netPay,
      reason: reason.trim(),
      adjusted_by: profileId,
    });

    setSaving(false);
    if (dbError) {
      setError(dbError.message);
      return;
    }
    onSaved();
  }

  const inputClass = "w-full border border-black/10 rounded-lg px-3 py-2 text-sm outline-none";

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/35 animate-[fadeIn_200ms_var(--ease-out)]" onClick={onClose} />
      <div className="absolute top-0 right-0 bottom-0 w-full max-w-[380px] bg-white p-7 overflow-y-auto shadow-2xl animate-[slideIn_280ms_var(--ease-out)]">
        <h2 className="font-display text-lg font-semibold text-[var(--color-text-primary)]">Adjust payslip</h2>
        <p className="text-sm text-[var(--color-text-muted)] mt-1 mb-6">
          For {employee.first_name} {employee.last_name}. The original payslip is never edited — this records a correction alongside it.
        </p>

        {employee.payslipAdjustments.length > 0 && (
          <div className="mb-6 space-y-2">
            <p className="text-[10.5px] font-semibold tracking-wide uppercase text-[var(--color-accent)]">Previous corrections</p>
            {employee.payslipAdjustments.map((a) => (
              <div key={a.id} className="rounded-lg bg-[var(--color-violet-tint)] px-3.5 py-2.5 text-xs">
                <p className="text-[var(--color-text-primary)]">
                  ₦{Number(a.original_net_pay).toLocaleString()} → ₦{Number(a.corrected_net_pay).toLocaleString()}
                </p>
                <p className="text-[var(--color-text-muted)] mt-0.5">{a.reason}</p>
                <p className="text-[var(--color-text-muted)] mt-0.5">{new Date(a.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
              </div>
            ))}
          </div>
        )}

        <div className="rounded-lg border border-black/[0.06] px-3.5 py-2.5 mb-5 text-xs text-[var(--color-text-muted)]">
          Issued as: ₦{Number(payslip.gross_pay).toLocaleString()} gross · ₦{Number(payslip.deductions).toLocaleString()} deductions · ₦{Number(payslip.net_pay).toLocaleString()} net
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">Corrected gross pay (₦)</label>
            <input type="number" min="0" value={grossPay} onChange={(e) => setGrossPay(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">Corrected deductions (₦)</label>
            <input type="number" min="0" value={deductions} onChange={(e) => setDeductions(e.target.value)} className={inputClass} />
          </div>
          <p className="text-sm font-mono text-[var(--color-text-primary)]">Corrected net pay: ₦{netPay.toLocaleString()}</p>

          <div>
            <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">Reason for correction</label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="What was wrong, and why this is the right figure"
              className={inputClass}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-black/10 rounded-lg py-2.5 text-sm font-medium text-[var(--color-text-muted)] hover:bg-black/[0.03] transition-colors duration-150"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || unchanged}
              className="flex-[1.4] rounded-lg py-2.5 text-sm font-medium text-white transition-transform duration-150 hover:scale-[1.02] active:scale-95 disabled:opacity-60"
              style={{ backgroundColor: "var(--color-primary)" }}
              title={unchanged ? "Change gross pay or deductions to record a correction" : undefined}
            >
              {saving ? "Recording..." : "Record correction"}
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
