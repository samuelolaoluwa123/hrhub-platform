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

export default function LoansPage({ canManage, employeeId, companyId, myLoans, pendingLoans, allLoans, profileId }) {
  const router = useRouter();
  const [requestOpen, setRequestOpen] = useState(false);
  const [reviewing, setReviewing] = useState(null);

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
                {myLoans.map((l, i) => (
                  <tr key={l.id} className="border-t border-black/[0.05]" style={{ animation: `rowIn 400ms var(--ease-out) ${i * 0.05}s both` }}>
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
                    </td>
                  </tr>
                ))}
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
                {allLoans.map((l) => (
                  <tr key={l.id} className="border-t border-black/[0.05]">
                    <td className="py-3.5 px-3.5">{l.employees ? `${l.employees.first_name} ${l.employees.last_name}` : "—"}</td>
                    <td className="py-3.5 px-3.5 text-[var(--color-text-muted)]">{TYPE_LABEL[l.loan_type]}</td>
                    <td className="py-3.5 px-3.5 font-mono text-xs text-[var(--color-text-muted)]">
                      {l.status === "approved" ? naira(Number(l.amount) - Number(l.amount_repaid)) : "—"}
                    </td>
                    <td className="py-3.5 px-3.5">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-md ${STATUS_BADGE[l.status]}`}>{STATUS_LABEL[l.status]}</span>
                    </td>
                  </tr>
                ))}
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
