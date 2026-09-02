"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import RequestLoanDrawer from "./RequestLoanDrawer";
import ReviewLoanDrawer from "./ReviewLoanDrawer";

const TYPE_LABEL = { advance: "Salary advance", loan: "Staff loan" };
const STATUS_BADGE = {
  pending: "bg-[#fef3e2] text-[#d68a1f]",
  approved: "bg-[#e8f9f0] text-[#1a9c5f]",
  rejected: "bg-[#fde8e8] text-[#cc3333]",
  completed: "bg-[#f3f2f5] text-[#706f83]",
};
const STATUS_LABEL = { pending: "Pending", approved: "Active", rejected: "Rejected", completed: "Completed" };

function naira(n) {
  return `₦${Number(n).toLocaleString()}`;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function LoansPage({ canManage, employeeId, companyId, myLoans, pendingLoans, allLoans, repaymentsByLoan, profileId }) {
  const router = useRouter();
  const [requestOpen, setRequestOpen] = useState(false);
  const [reviewing, setReviewing] = useState(null);
  const [viewingHistory, setViewingHistory] = useState(null);

  return (
    <div>
      <div className="flex flex-wrap justify-between items-start gap-3 mb-7">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--color-violet-tint)] flex items-center justify-center shrink-0">
            <svg className="w-[19px] h-[19px] text-[var(--color-primary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="6" width="20" height="12" rx="2" />
              <circle cx="12" cy="12" r="2.5" />
            </svg>
          </div>
          <div>
            <h1 className="font-display text-2xl font-semibold text-[var(--color-text-primary)]">Loans &amp; Advances</h1>
            <p className="text-[var(--color-text-muted)] text-sm mt-0.5">
              {canManage ? "Review requests and track repayment." : "Salary advances and staff loans, repaid automatically from payroll."}
            </p>
          </div>
        </div>
        {employeeId && (
          <button
            onClick={() => setRequestOpen(true)}
            className="flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-transform duration-150 hover:scale-[1.03] active:scale-95"
            style={{ backgroundColor: "var(--color-primary)", transitionTimingFunction: "var(--ease-out)" }}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Request advance/loan
          </button>
        )}
      </div>

      {canManage && (
        <Section eyebrow="Needs your action" title="Pending requests" count={pendingLoans.length}>
          {pendingLoans.length === 0 ? (
            <EmptyRow text="No pending requests." />
          ) : (
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="text-left text-[10.5px] font-semibold tracking-wide uppercase text-[#9089a0]">
                  <th className="py-3.5 px-3.5">Employee</th>
                  <th className="py-3.5 px-3.5">Type</th>
                  <th className="py-3.5 px-3.5">Amount</th>
                  <th className="py-3.5 px-3.5">Reason</th>
                  <th className="py-3.5 px-3.5"></th>
                </tr>
              </thead>
              <tbody>
                {pendingLoans.map((l, i) => (
                  <tr key={l.id} className="border-t border-black/[0.05]" style={{ animation: `rowIn 400ms var(--ease-out) ${i * 0.05}s both` }}>
                    <td className="py-3.5 px-3.5 font-medium text-[var(--color-text-primary)]">
                      {l.employees ? `${l.employees.first_name} ${l.employees.last_name}` : "—"}
                    </td>
                    <td className="py-3.5 px-3.5 text-[var(--color-text-muted)]">{TYPE_LABEL[l.loan_type]}</td>
                    <td className="py-3.5 px-3.5 font-mono text-xs text-[var(--color-text-muted)]">{naira(l.amount)}</td>
                    <td className="py-3.5 px-3.5 text-[var(--color-text-muted)]">{l.reason || "—"}</td>
                    <td className="py-3.5 px-3.5 text-right">
                      <button
                        onClick={() => setReviewing(l)}
                        className="text-xs font-medium px-3 py-1.5 rounded-md bg-[var(--color-violet-tint)] text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white transition-colors duration-150"
                        style={{ transitionTimingFunction: "var(--ease-out)" }}
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>
      )}

      {employeeId && (
        <Section eyebrow="Your history" title="My loans &amp; advances">
          {myLoans.length === 0 ? (
            <EmptyRow text="You haven't requested one yet." />
          ) : (
            <table className="w-full text-sm min-w-[620px]">
              <thead>
                <tr className="text-left text-[10.5px] font-semibold tracking-wide uppercase text-[#9089a0]">
                  <th className="py-3.5 px-3.5">Type</th>
                  <th className="py-3.5 px-3.5">Amount</th>
                  <th className="py-3.5 px-3.5">Monthly deduction</th>
                  <th className="py-3.5 px-3.5">Outstanding</th>
                  <th className="py-3.5 px-3.5">Status</th>
                </tr>
              </thead>
              <tbody>
                {myLoans.map((l, i) => {
                  const hasHistory = (repaymentsByLoan[l.id]?.length ?? 0) > 0;
                  return (
                    <tr
                      key={l.id}
                      onClick={() => hasHistory && setViewingHistory(l)}
                      className={`border-t border-black/[0.05] ${hasHistory ? "cursor-pointer hover:bg-[var(--color-primary)]/[0.03] transition-colors duration-150" : ""}`}
                      style={{ transitionTimingFunction: "var(--ease-out)", animation: `rowIn 400ms var(--ease-out) ${i * 0.05}s both` }}
                    >
                      <td className="py-3.5 px-3.5">{TYPE_LABEL[l.loan_type]}</td>
                      <td className="py-3.5 px-3.5 font-mono text-xs text-[var(--color-text-muted)]">{naira(l.amount)}</td>
                      <td className="py-3.5 px-3.5 font-mono text-xs text-[var(--color-text-muted)]">
                        {l.status === "approved" ? naira(l.monthly_deduction) : "—"}
                      </td>
                      <td className="py-3.5 px-3.5 font-mono text-xs font-medium text-[var(--color-text-primary)]">
                        {l.status === "approved" ? naira(Number(l.amount) - Number(l.amount_repaid)) : "—"}
                      </td>
                      <td className="py-3.5 px-3.5">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-md ${STATUS_BADGE[l.status]}`}>{STATUS_LABEL[l.status]}</span>
                        {hasHistory && <span className="ml-1.5 text-[10.5px] text-[var(--color-primary)]">History →</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Section>
      )}

      {canManage && (
        <Section eyebrow="Oversight" title="All loans" count={allLoans.length}>
          {allLoans.length === 0 ? (
            <EmptyRow text="Nothing approved or resolved yet." />
          ) : (
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="text-left text-[10.5px] font-semibold tracking-wide uppercase text-[#9089a0]">
                  <th className="py-3.5 px-3.5">Employee</th>
                  <th className="py-3.5 px-3.5">Type</th>
                  <th className="py-3.5 px-3.5">Outstanding</th>
                  <th className="py-3.5 px-3.5">Status</th>
                </tr>
              </thead>
              <tbody>
                {allLoans.map((l) => {
                  const hasHistory = (repaymentsByLoan[l.id]?.length ?? 0) > 0;
                  return (
                    <tr
                      key={l.id}
                      onClick={() => hasHistory && setViewingHistory(l)}
                      className={`border-t border-black/[0.05] ${hasHistory ? "cursor-pointer hover:bg-[var(--color-primary)]/[0.03] transition-colors duration-150" : ""}`}
                      style={{ transitionTimingFunction: "var(--ease-out)" }}
                    >
                      <td className="py-3.5 px-3.5">{l.employees ? `${l.employees.first_name} ${l.employees.last_name}` : "—"}</td>
                      <td className="py-3.5 px-3.5 text-[var(--color-text-muted)]">{TYPE_LABEL[l.loan_type]}</td>
                      <td className="py-3.5 px-3.5 font-mono text-xs text-[var(--color-text-muted)]">
                        {l.status === "approved" ? naira(Number(l.amount) - Number(l.amount_repaid)) : "—"}
                      </td>
                      <td className="py-3.5 px-3.5">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-md ${STATUS_BADGE[l.status]}`}>{STATUS_LABEL[l.status]}</span>
                        {hasHistory && <span className="ml-1.5 text-[10.5px] text-[var(--color-primary)]">History →</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Section>
      )}

      {employeeId && (
        <RequestLoanDrawer
          open={requestOpen}
          onClose={() => setRequestOpen(false)}
          onSaved={() => router.refresh()}
          employeeId={employeeId}
          companyId={companyId}
        />
      )}

      {reviewing && (
        <ReviewLoanDrawer
          open={Boolean(reviewing)}
          onClose={() => setReviewing(null)}
          onSaved={() => router.refresh()}
          loan={reviewing}
          profileId={profileId}
        />
      )}

      {viewingHistory && (
        <LoanHistoryDrawer
          loan={viewingHistory}
          repayments={repaymentsByLoan[viewingHistory.id] ?? []}
          onClose={() => setViewingHistory(null)}
        />
      )}

      <style jsx global>{`
        @keyframes rowIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

function Section({ eyebrow, title, count, children }) {
  return (
    <div className="mb-7">
      <p className="font-mono text-[10.5px] tracking-wide uppercase text-[var(--color-accent)] mb-1">{eyebrow}</p>
      <p className="font-display text-base font-semibold text-[var(--color-text-primary)] mb-3 flex items-center gap-2">
        {title}
        {count > 0 && (
          <span className="font-sans text-[11px] font-semibold bg-[#fef3e2] text-[#d68a1f] px-2 py-0.5 rounded-full">{count}</span>
        )}
      </p>
      <div className="bg-white border border-black/[0.06] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">{children}</div>
      </div>
    </div>
  );
}

function EmptyRow({ text }) {
  return <p className="text-center py-9 text-sm text-[var(--color-text-muted)]">{text}</p>;
}

// The actual "repayment schedule" — every payroll run this loan was
// deducted in, and exactly how much, not just a running total. Each
// row here is what payroll genuinely did, guaranteed to match the
// loan's outstanding balance by construction (loan_repayments and
// loans.amount_repaid are always written together, same transaction).
function LoanHistoryDrawer({ loan, repayments, onClose }) {
  const totalRepaid = repayments.reduce((sum, r) => sum + Number(r.amount), 0);

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/35 animate-[fadeIn_200ms_var(--ease-out)]" onClick={onClose} />
      <div className="absolute top-0 right-0 bottom-0 w-full max-w-[360px] bg-white p-7 overflow-y-auto shadow-2xl animate-[slideIn_280ms_var(--ease-out)]">
        <h2 className="font-display text-lg font-semibold text-[var(--color-text-primary)]">Repayment history</h2>
        <p className="text-sm text-[var(--color-text-muted)] mt-1 mb-6">
          {TYPE_LABEL[loan.loan_type]} &middot; {naira(loan.amount)}
        </p>

        {repayments.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">No deductions recorded yet.</p>
        ) : (
          <div className="space-y-2">
            {repayments.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-lg border border-black/[0.06] px-3.5 py-2.5">
                <span className="text-sm text-[var(--color-text-primary)]">
                  {r.payroll_runs ? `${MONTH_NAMES[r.payroll_runs.period_month - 1]} ${r.payroll_runs.period_year}` : "—"}
                </span>
                <span className="text-sm font-mono font-medium text-[var(--color-text-primary)]">{naira(r.amount)}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between mt-5 pt-5 border-t border-black/[0.06]">
          <span className="text-sm font-medium text-[var(--color-text-primary)]">Total repaid</span>
          <span className="text-sm font-mono font-semibold text-[var(--color-primary)]">{naira(totalRepaid)}</span>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-6 border border-black/10 rounded-lg py-2.5 text-sm font-medium text-[var(--color-text-muted)] hover:bg-black/[0.03] transition-colors duration-150"
        >
          Close
        </button>
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
