"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import LeaveRequestDrawer from "./LeaveRequestDrawer";
import LeaveTypeDrawer from "./LeaveTypeDrawer";
import AllocateBalanceDrawer from "./AllocateBalanceDrawer";
import LeaveReviewDrawer from "./LeaveReviewDrawer";

const STATUS_BADGE = {
  pending: "bg-[#fef3e2] text-[#d68a1f]",
  approved: "bg-[#e8f9f0] text-[#1a9c5f]",
  rejected: "bg-[#fde8e8] text-[#cc3333]",
  cancelled: "bg-[#f3f2f5] text-[#706f83]",
};
const STATUS_LABEL = { pending: "Pending", approved: "Approved", rejected: "Rejected", cancelled: "Cancelled" };

const AVATAR_GRADIENTS = [
  "linear-gradient(135deg,#9b50e9,#8224e3)",
  "linear-gradient(135deg,#4a9eff,#2f6fd1)",
  "linear-gradient(135deg,#f5a623,#d68a1f)",
  "linear-gradient(135deg,#3ee87a,#1a9c5f)",
];
function gradientFor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}
function formatRange(start, end) {
  const opts = { month: "short", day: "numeric" };
  return `${new Date(start).toLocaleDateString("en-US", opts)} – ${new Date(end).toLocaleDateString("en-US", opts)}`;
}

export default function LeavePage({
  canApprove,
  pendingRequests,
  myRequests,
  leaveTypes,
  activeLeaveTypes,
  employeeId,
  profileId,
  companyId,
  myBalances,
  teamBalances,
  employees,
  currentYear,
  pendingByEmployeeAndType,
}) {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [typeDrawerOpen, setTypeDrawerOpen] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [balanceDrawerOpen, setBalanceDrawerOpen] = useState(false);
  const [reviewing, setReviewing] = useState(null);

  return (
    <div>
      <div className="flex flex-wrap justify-between items-start gap-3 mb-7">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--color-violet-tint)] flex items-center justify-center shrink-0">
            <svg className="w-[19px] h-[19px] text-[var(--color-primary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
          </div>
          <div>
            <h1 className="font-display text-2xl font-semibold text-[var(--color-text-primary)]">Leave</h1>
            <p className="text-[var(--color-text-muted)] text-sm mt-0.5">Request and manage time off.</p>
          </div>
        </div>
        {employeeId && (
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-transform duration-150 hover:scale-[1.03] active:scale-95"
            style={{ backgroundColor: "var(--color-primary)", transitionTimingFunction: "var(--ease-out)" }}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Request leave
          </button>
        )}
      </div>

      {employeeId && (
        <Section eyebrow="This year" title="My leave balance">
          {myBalances.length === 0 ? (
            <EmptyRow text="No balance set yet — ask your admin to allocate one." />
          ) : (
            <div className="grid sm:grid-cols-2 gap-3 p-4">
              {myBalances.map((b) => {
                const pending = pendingByEmployeeAndType[`${employeeId}:${b.leave_type_id}`] ?? 0;
                const remaining = Number(b.days_allocated) - Number(b.days_used) - pending;
                return (
                  <div key={b.id} className="rounded-xl border border-black/[0.06] px-4 py-3.5">
                    <p className="text-sm font-medium text-[var(--color-text-primary)] mb-2.5">{b.leave_types?.name}</p>
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <Stat label="Entitlement" value={b.days_allocated} />
                      <Stat label="Used" value={b.days_used} />
                      <Stat label="Pending" value={pending} />
                      <Stat label="Remaining" value={remaining} highlight />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Section>
      )}

      {canApprove && (
        <Section
          eyebrow="Needs your action"
          title="Pending approvals"
          count={pendingRequests.length}
        >
          {pendingRequests.length === 0 ? (
            <EmptyRow text="No pending approvals — you're all caught up." />
          ) : (
            <table className="w-full text-sm min-w-[680px]">
              <thead>
                <tr className="text-left text-[10.5px] font-semibold tracking-wide uppercase text-[#9089a0]">
                  <th className="py-3.5 px-3.5">Employee</th>
                  <th className="py-3.5 px-3.5">Type</th>
                  <th className="py-3.5 px-3.5">Dates</th>
                  <th className="py-3.5 px-3.5">Days</th>
                  <th className="py-3.5 px-3.5">Reason</th>
                  <th className="py-3.5 px-3.5"></th>
                </tr>
              </thead>
              <tbody>
                {pendingRequests.map((req, i) => (
                  <tr
                    key={req.id}
                    onClick={() => setReviewing(req)}
                    className="border-t border-black/[0.05] hover:bg-[var(--color-primary)]/[0.03] transition-colors duration-150 cursor-pointer"
                    style={{ transitionTimingFunction: "var(--ease-out)", animation: `rowIn 400ms var(--ease-out) ${i * 0.05}s both` }}
                  >
                    <td className="py-3.5 px-3.5">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-semibold shrink-0"
                          style={{ background: gradientFor(req.employees.first_name + req.employees.last_name) }}
                        >
                          {req.employees.first_name[0]}
                          {req.employees.last_name[0]}
                        </div>
                        {req.employees.first_name} {req.employees.last_name}
                      </div>
                    </td>
                    <td className="py-3.5 px-3.5 text-[var(--color-text-muted)]">{req.leave_types.name}</td>
                    <td className="py-3.5 px-3.5 font-mono text-xs text-[var(--color-text-muted)]">
                      {formatRange(req.start_date, req.end_date)}
                    </td>
                    <td className="py-3.5 px-3.5 text-[var(--color-text-muted)]">{req.days_requested}</td>
                    <td className="py-3.5 px-3.5 text-[var(--color-text-muted)] truncate max-w-[160px]">{req.reason || "—"}</td>
                    <td className="py-3.5 px-3.5 text-right text-[#9089a0]">→</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>
      )}

      <Section eyebrow="Your history" title="My requests">
        {!employeeId ? (
          <EmptyRow text="You're not linked to an employee record yet, so you can't submit requests." />
        ) : myRequests.length === 0 ? (
          <EmptyRow text="You haven't requested any leave yet." />
        ) : (
          <table className="w-full text-sm min-w-[620px]">
            <thead>
              <tr className="text-left text-[10.5px] font-semibold tracking-wide uppercase text-[#9089a0]">
                <th className="py-3.5 px-3.5">Type</th>
                <th className="py-3.5 px-3.5">Dates</th>
                <th className="py-3.5 px-3.5">Days</th>
                <th className="py-3.5 px-3.5">Status</th>
                <th className="py-3.5 px-3.5">Comment</th>
              </tr>
            </thead>
            <tbody>
              {myRequests.map((req, i) => (
                <tr
                  key={req.id}
                  className="border-t border-black/[0.05]"
                  style={{ animation: `rowIn 400ms var(--ease-out) ${i * 0.05}s both` }}
                >
                  <td className="py-3.5 px-3.5 text-[var(--color-text-muted)]">{req.leave_types.name}</td>
                  <td className="py-3.5 px-3.5 font-mono text-xs text-[var(--color-text-muted)]">
                    {formatRange(req.start_date, req.end_date)}
                  </td>
                  <td className="py-3.5 px-3.5 text-[var(--color-text-muted)]">{req.days_requested}</td>
                  <td className="py-3.5 px-3.5">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-md ${STATUS_BADGE[req.status]}`}>
                      {STATUS_LABEL[req.status]}
                    </span>
                  </td>
                  <td className="py-3.5 px-3.5 text-[var(--color-text-muted)] truncate max-w-[200px]">{req.decision_comment || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      {canApprove && (
        <Section
          eyebrow="Admin"
          title="Leave types"
          action={
            <button
              onClick={() => { setEditingType(null); setTypeDrawerOpen(true); }}
              className="text-xs font-medium px-3 py-1.5 rounded-md bg-[var(--color-primary)] text-white hover:scale-[1.03] transition-transform duration-150"
              style={{ transitionTimingFunction: "var(--ease-out)" }}
            >
              + Add type
            </button>
          }
        >
          {leaveTypes.length === 0 ? (
            <EmptyRow text="No leave types yet." />
          ) : (
            <div className="flex flex-wrap gap-2 p-4">
              {leaveTypes.map((t) => (
                <button
                  key={t.id}
                  onClick={() => { setEditingType(t); setTypeDrawerOpen(true); }}
                  className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors duration-150 ${
                    t.is_active
                      ? "bg-[var(--color-violet-tint)] text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white"
                      : "bg-[#f3f2f5] text-[#9089a0] line-through hover:bg-[#e5e3e8]"
                  }`}
                >
                  {t.name} &middot; {t.default_days_per_year}/yr
                </button>
              ))}
            </div>
          )}
        </Section>
      )}

      {canApprove && (
        <Section eyebrow="Admin" title="Team leave balances" count={teamBalances.length}
          action={
            <button
              onClick={() => setBalanceDrawerOpen(true)}
              className="text-xs font-medium px-3 py-1.5 rounded-md bg-[var(--color-primary)] text-white hover:scale-[1.03] transition-transform duration-150"
              style={{ transitionTimingFunction: "var(--ease-out)" }}
            >
              + Allocate balance
            </button>
          }
        >
          {teamBalances.length === 0 ? (
            <EmptyRow text="No balances allocated yet." />
          ) : (
            <table className="w-full text-sm min-w-[580px]">
              <thead>
                <tr className="text-left text-[10.5px] font-semibold tracking-wide uppercase text-[#9089a0]">
                  <th className="py-3.5 px-3.5">Employee</th>
                  <th className="py-3.5 px-3.5">Type</th>
                  <th className="py-3.5 px-3.5">Entitlement</th>
                  <th className="py-3.5 px-3.5">Used</th>
                  <th className="py-3.5 px-3.5">Pending</th>
                  <th className="py-3.5 px-3.5">Remaining</th>
                </tr>
              </thead>
              <tbody>
                {teamBalances.map((b) => {
                  const pending = pendingByEmployeeAndType[`${b.employee_id}:${b.leave_type_id}`] ?? 0;
                  return (
                    <tr key={b.id} className="border-t border-black/[0.05]">
                      <td className="py-3.5 px-3.5">{b.employees ? `${b.employees.first_name} ${b.employees.last_name}` : "—"}</td>
                      <td className="py-3.5 px-3.5 text-[var(--color-text-muted)]">{b.leave_types?.name}</td>
                      <td className="py-3.5 px-3.5 text-[var(--color-text-muted)]">{b.days_allocated}</td>
                      <td className="py-3.5 px-3.5 text-[var(--color-text-muted)]">{b.days_used}</td>
                      <td className="py-3.5 px-3.5 text-[var(--color-text-muted)]">{pending}</td>
                      <td className="py-3.5 px-3.5 font-medium text-[var(--color-text-primary)]">
                        {Number(b.days_allocated) - Number(b.days_used) - pending}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Section>
      )}

      {canApprove && (
        <LeaveTypeDrawer
          open={typeDrawerOpen}
          onClose={() => setTypeDrawerOpen(false)}
          onSaved={() => router.refresh()}
          companyId={companyId}
          editingType={editingType}
        />
      )}

      {canApprove && (
        <AllocateBalanceDrawer
          open={balanceDrawerOpen}
          onClose={() => setBalanceDrawerOpen(false)}
          onSaved={() => router.refresh()}
          companyId={companyId}
          employees={employees}
          leaveTypes={leaveTypes}
          currentYear={currentYear}
        />
      )}

      {canApprove && (
        <LeaveReviewDrawer
          open={Boolean(reviewing)}
          onClose={() => setReviewing(null)}
          onSaved={() => router.refresh()}
          request={reviewing}
          profileId={profileId}
        />
      )}

      {employeeId && (
        <LeaveRequestDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          onSaved={() => router.refresh()}
          leaveTypes={activeLeaveTypes}
          employeeId={employeeId}
          companyId={companyId}
          myBalances={myBalances}
          pendingByEmployeeAndType={pendingByEmployeeAndType}
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

function Stat({ label, value, highlight }) {
  return (
    <div>
      <p className={`text-base font-semibold ${highlight ? "text-[var(--color-primary)]" : "text-[var(--color-text-primary)]"}`}>{value}</p>
      <p className="text-[9.5px] font-medium tracking-wide uppercase text-[#9089a0] mt-0.5">{label}</p>
    </div>
  );
}

function Section({ eyebrow, title, count, action, children }) {
  return (
    <div className="mb-7">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="font-mono text-[10.5px] tracking-wide uppercase text-[var(--color-accent)] mb-1">
            {eyebrow}
          </p>
          <p className="font-display text-base font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
            {title}
            {count > 0 && (
              <span className="font-sans text-[11px] font-semibold bg-[#fef3e2] text-[#d68a1f] px-2 py-0.5 rounded-full">
                {count}
              </span>
            )}
          </p>
        </div>
        {action}
      </div>
      <div className="bg-white border border-black/[0.06] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">{children}</div>
      </div>
    </div>
  );
}

function EmptyRow({ text }) {
  return <p className="text-center py-9 text-sm text-[var(--color-text-muted)]">{text}</p>;
}
