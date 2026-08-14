"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { downloadPayslipPdf } from "@/lib/generatePayslipPdf";

const STATUS_BADGE = {
  draft: "bg-[#f3f2f5] text-[#706f83]",
  processed: "bg-[#fef3e2] text-[#d68a1f]",
  paid: "bg-[#e8f9f0] text-[#1a9c5f]",
};
const STATUS_LABEL = { draft: "Draft", processed: "Processed", paid: "Paid" };
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function periodLabel(month, year) {
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

export default function PayrollPage({ canManage, runs, myPayslips, totalActiveEmployees, companyId, employeeName, companyName }) {
  const router = useRouter();
  const supabase = createClient();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function handleCreateRun(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const { error: dbError } = await supabase.from("payroll_runs").insert({
      company_id: companyId,
      period_month: Number(month),
      period_year: Number(year),
      status: "draft",
    });

    setSaving(false);

    if (dbError) {
      setError(
        dbError.code === "23505"
          ? "A payroll run for this period already exists."
          : dbError.message
      );
      return;
    }

    setDrawerOpen(false);
    router.refresh();
  }

  return (
    <div>
      <div className="flex flex-wrap justify-between items-start gap-3 mb-7">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--color-violet-tint)] flex items-center justify-center shrink-0">
            <span className="font-display font-semibold text-lg text-[var(--color-primary)]">₦</span>
          </div>
          <div>
            <h1 className="font-display text-2xl font-semibold text-[var(--color-text-primary)]">Payroll</h1>
            <p className="text-[var(--color-text-muted)] text-sm mt-0.5">Run payroll and view payslips.</p>
          </div>
        </div>
        {canManage && (
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-transform duration-150 hover:scale-[1.03] active:scale-95"
            style={{ backgroundColor: "var(--color-primary)", transitionTimingFunction: "var(--ease-out)" }}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New payroll run
          </button>
        )}
      </div>

      {canManage && (
        <Section eyebrow="Manage" title="Payroll runs">
          {runs.length === 0 ? (
            <EmptyRow text="No payroll runs yet — create one to get started." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[560px]">
                <thead>
                  <tr className="text-left text-[10.5px] font-semibold tracking-wide uppercase text-[#9089a0]">
                    <th className="py-3.5 px-3.5">Period</th>
                    <th className="py-3.5 px-3.5">Status</th>
                    <th className="py-3.5 px-3.5">Payslips issued</th>
                    <th className="py-3.5 px-3.5"></th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((run, i) => (
                    <tr
                      key={run.id}
                      onClick={() => router.push(`/dashboard/payroll/${run.id}`)}
                      className="border-t border-black/[0.05] hover:bg-[var(--color-primary)]/[0.03] transition-colors duration-150 cursor-pointer"
                      style={{ transitionTimingFunction: "var(--ease-out)", animation: `rowIn 400ms var(--ease-out) ${i * 0.05}s both` }}
                    >
                      <td className="py-3.5 px-3.5 font-medium text-[var(--color-text-primary)]">
                        {periodLabel(run.period_month, run.period_year)}
                      </td>
                      <td className="py-3.5 px-3.5">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-md ${STATUS_BADGE[run.status]}`}>
                          {STATUS_LABEL[run.status]}
                        </span>
                      </td>
                      <td className="py-3.5 px-3.5 text-[var(--color-text-muted)]">
                        {run.payslip_count} of {totalActiveEmployees} employees
                      </td>
                      <td className="py-3.5 px-3.5 text-right text-[#9089a0]">→</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      )}

      <Section eyebrow="Your history" title="My payslips">
        {myPayslips.length === 0 ? (
          <EmptyRow text="You don't have any payslips yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[580px]">
              <thead>
                <tr className="text-left text-[10.5px] font-semibold tracking-wide uppercase text-[#9089a0]">
                  <th className="py-3.5 px-3.5">Period</th>
                  <th className="py-3.5 px-3.5">Gross</th>
                  <th className="py-3.5 px-3.5">Deductions</th>
                  <th className="py-3.5 px-3.5">Net pay</th>
                  <th className="py-3.5 px-3.5"></th>
                </tr>
              </thead>
              <tbody>
                {myPayslips.map((p, i) => (
                  <tr
                    key={p.id}
                    className="border-t border-black/[0.05]"
                    style={{ animation: `rowIn 400ms var(--ease-out) ${i * 0.05}s both` }}
                  >
                    <td className="py-3.5 px-3.5 font-medium text-[var(--color-text-primary)]">
                      {periodLabel(p.payroll_runs.period_month, p.payroll_runs.period_year)}
                    </td>
                    <td className="py-3.5 px-3.5 font-mono text-xs text-[var(--color-text-muted)]">
                      ₦{Number(p.gross_pay).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-3.5 font-mono text-xs text-[var(--color-text-muted)]">
                      ₦{Number(p.deductions).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-3.5 font-mono text-xs font-medium text-[var(--color-text-primary)]">
                      ₦{Number(p.net_pay).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-3.5 text-right">
                      <button
                        onClick={() =>
                          downloadPayslipPdf({
                            companyName,
                            employeeName,
                            periodLabel: periodLabel(p.payroll_runs.period_month, p.payroll_runs.period_year),
                            grossPay: Number(p.gross_pay),
                            deductions: Number(p.deductions),
                            netPay: Number(p.net_pay),
                          })
                        }
                        className="text-xs font-medium px-3 py-1.5 rounded-md bg-[var(--color-violet-tint)] text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white transition-colors duration-150"
                        style={{ transitionTimingFunction: "var(--ease-out)" }}
                      >
                        Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {drawerOpen && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/35 animate-[fadeIn_200ms_var(--ease-out)]"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="absolute top-0 right-0 bottom-0 w-full max-w-[360px] bg-white p-7 overflow-y-auto shadow-2xl animate-[slideIn_280ms_var(--ease-out)]">
            <h2 className="font-display text-lg font-semibold text-[var(--color-text-primary)]">New payroll run</h2>
            <p className="text-sm text-[var(--color-text-muted)] mt-1 mb-6">Pick the month you're running payroll for.</p>

            <form onSubmit={handleCreateRun} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">Month</label>
                  <select
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    className="w-full border border-black/10 rounded-lg px-3 py-2 text-sm outline-none"
                  >
                    {MONTH_NAMES.map((m, idx) => (
                      <option key={m} value={idx + 1}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">Year</label>
                  <input
                    type="number"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className="w-full border border-black/10 rounded-lg px-3 py-2 text-sm outline-none"
                  />
                </div>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
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
                  {saving ? "Creating..." : "Create run"}
                </button>
              </div>
            </form>
          </div>
        </div>
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

function Section({ eyebrow, title, children }) {
  return (
    <div className="mb-7">
      <p className="font-mono text-[10.5px] tracking-wide uppercase text-[var(--color-accent)] mb-1">{eyebrow}</p>
      <p className="font-display text-base font-semibold text-[var(--color-text-primary)] mb-3">{title}</p>
      <div className="bg-white border border-black/[0.06] rounded-2xl overflow-hidden">{children}</div>
    </div>
  );
}

function EmptyRow({ text }) {
  return <p className="text-center py-9 text-sm text-[var(--color-text-muted)]">{text}</p>;
}
