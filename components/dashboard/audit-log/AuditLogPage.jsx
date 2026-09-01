"use client";

import { useMemo, useState } from "react";

const FILTERS = [
  { key: "all", label: "All", actions: null },
  { key: "salary", label: "Salary", actions: ["salary_changed"] },
  { key: "employee_status", label: "Employee status", actions: ["employee_status_changed", "employee_exited"] },
  { key: "onboarding", label: "Onboarding", actions: ["onboarding_completed"] },
  { key: "leave", label: "Leave", actions: ["leave_status_changed"] },
  { key: "payroll", label: "Payroll", actions: ["payroll_run_created", "payroll_run_status_changed"] },
  { key: "loans", label: "Loans", actions: ["loan_status_changed"] },
];

const ACTION_LABEL = {
  salary_changed: "Salary changed",
  employee_status_changed: "Employee status changed",
  employee_exited: "Employee exit recorded",
  onboarding_completed: "Onboarding completed",
  leave_status_changed: "Leave request",
  payroll_run_created: "Payroll run created",
  payroll_run_status_changed: "Payroll run",
  loan_status_changed: "Loan",
};

const STATUS_LABEL = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  cancelled: "Cancelled",
  completed: "Completed",
  draft: "Draft",
  processed: "Processed",
  paid: "Paid",
};

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function naira(amount) {
  if (amount == null) return "—";
  return `₦${Number(amount).toLocaleString("en-NG")}`;
}

function statusLabel(s) {
  return STATUS_LABEL[s] ?? s ?? "—";
}

// Turns one raw audit_log row into a human-readable "what happened" line
// — the raw old_value/new_value jsonb is a full row snapshot, not
// something anyone should have to read directly.
function describe(entry) {
  const { action, old_value, new_value } = entry;

  switch (action) {
    case "salary_changed": {
      const from = old_value?.base_salary;
      const to = new_value?.base_salary;
      if (from !== to) {
        return `Base salary changed from ${naira(from)} to ${naira(to)}`;
      }
      return "Allowances updated";
    }
    case "employee_status_changed":
      // Status values are already display-ready text now (Phase 1.1
      // made them company-configurable) — no lookup table to run
      // through, unlike the other action types below which still use
      // fixed lowercase status values.
      return `Status changed from ${old_value?.status ?? "—"} to ${new_value?.status ?? "—"}`;
    case "employee_exited":
      return `Exited as "${new_value?.exit_status ?? "—"}"${new_value?.exit_reason ? ` — ${new_value.exit_reason}` : ""}`;
    case "onboarding_completed":
      return "Every required onboarding item verified — documents uploaded, data submitted, nothing self-reported.";
    case "leave_status_changed":
      return `Leave request ${statusLabel(new_value?.status).toLowerCase()} (was ${statusLabel(old_value?.status).toLowerCase()})`;
    case "payroll_run_created": {
      const m = MONTH_NAMES[(new_value?.period_month ?? 1) - 1];
      return `Created for ${m} ${new_value?.period_year ?? ""}`;
    }
    case "payroll_run_status_changed": {
      const m = MONTH_NAMES[(new_value?.period_month ?? 1) - 1];
      return `${m} ${new_value?.period_year ?? ""} moved from ${statusLabel(old_value?.status)} to ${statusLabel(new_value?.status)}`;
    }
    case "loan_status_changed":
      return `${naira(new_value?.amount)} loan ${statusLabel(new_value?.status).toLowerCase()} (was ${statusLabel(old_value?.status).toLowerCase()})`;
    default:
      return action;
  }
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function AuditLogPage({ entries }) {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const activeFilter = FILTERS.find((f) => f.key === filter);
    return entries.filter((e) => {
      if (activeFilter?.actions && !activeFilter.actions.includes(e.action)) return false;
      if (search) {
        const q = search.toLowerCase();
        const employeeName = e.employees ? `${e.employees.first_name} ${e.employees.last_name}` : "";
        const haystack = `${e.actor_name ?? ""} ${employeeName} ${describe(e)} ${e.reason ?? ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [entries, filter, search]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold text-[var(--color-text-primary)]">
          Audit Log
        </h1>
        <p className="text-[var(--color-text-muted)] text-sm mt-0.5">
          Every salary change, status change, leave/loan decision, and payroll run — who, what, and when. Nobody, including admins, can edit or delete an entry here.
        </p>
      </div>

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="flex items-center gap-2 bg-white border border-black/[0.08] rounded-lg px-3 py-2 text-sm text-[var(--color-text-muted)] max-w-[280px] flex-1 min-w-[180px]">
          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by person or reason..."
            className="bg-transparent outline-none w-full text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]"
          />
        </div>
        {FILTERS.map((f) => (
          <button
            key={f.key + f.label}
            onClick={() => setFilter(f.key)}
            className={`text-xs font-medium px-3.5 py-2 rounded-full transition-colors duration-150 ${
              filter === f.key
                ? "bg-[var(--color-text-primary)] text-white"
                : "text-[var(--color-text-muted)] hover:bg-black/[0.04]"
            }`}
            style={{ transitionTimingFunction: "var(--ease-out)" }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 border-[1.5px] border-dashed border-black/[0.1] rounded-2xl">
          <p className="font-display font-semibold text-[var(--color-text-primary)]">
            {entries.length === 0 ? "No audit entries yet" : "No entries match"}
          </p>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            {entries.length === 0
              ? "Salary changes, status changes, leave/loan decisions, and payroll runs will show up here automatically."
              : "Try a different search or filter."}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-black/[0.06] overflow-hidden">
          {filtered.map((entry, i) => (
            <div
              key={entry.id}
              className="flex items-start gap-3 px-5 py-4 border-b border-black/[0.04] last:border-b-0"
              style={{ animation: `rowIn 300ms var(--ease-out) ${Math.min(i * 0.03, 0.6)}s both` }}
            >
              <div className="w-2 h-2 rounded-full bg-[var(--color-primary)] mt-1.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3 flex-wrap">
                  <p className="text-sm font-medium text-[var(--color-text-primary)]">
                    {ACTION_LABEL[entry.action] ?? entry.action}
                    {entry.employees && (
                      <span className="text-[var(--color-text-muted)] font-normal">
                        {" · "}
                        {entry.employees.first_name} {entry.employees.last_name}
                      </span>
                    )}
                  </p>
                  <span className="font-mono text-[11px] text-[var(--color-text-muted)] shrink-0">
                    {timeAgo(entry.created_at)}
                  </span>
                </div>
                <p className="text-sm text-[var(--color-text-muted)] mt-0.5">{describe(entry)}</p>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {entry.reason && (
                    <span className="text-xs text-[var(--color-primary)] bg-[var(--color-violet-tint)] px-2 py-0.5 rounded-md">
                      Reason: {entry.reason}
                    </span>
                  )}
                  {entry.effective_date && (
                    <span className="text-xs text-[var(--color-text-muted)] bg-[#f3f2f5] px-2 py-0.5 rounded-md">
                      Effective {new Date(entry.effective_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                  )}
                  {entry.notes && (
                    <span className="text-xs text-[var(--color-text-muted)] bg-[#f3f2f5] px-2 py-0.5 rounded-md">
                      Notes: {entry.notes}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[var(--color-text-muted)] mt-1.5">
                  by {entry.actor_name ?? "System"}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <style jsx global>{`
        @keyframes rowIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
