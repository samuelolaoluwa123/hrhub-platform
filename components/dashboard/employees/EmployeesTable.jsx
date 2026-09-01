"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import EmployeeDrawer from "./EmployeeDrawer";
import ChangeStatusDrawer from "./ChangeStatusDrawer";
import ExitEmployeeDrawer from "./ExitEmployeeDrawer";

const AVATAR_GRADIENTS = [
  "linear-gradient(135deg,#9b50e9,#8224e3)",
  "linear-gradient(135deg,#4a9eff,#2f6fd1)",
  "linear-gradient(135deg,#f5a623,#d68a1f)",
  "linear-gradient(135deg,#3ee87a,#1a9c5f)",
  "linear-gradient(135deg,#9089a0,#706f83)",
];

function gradientFor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

function initials(first, last) {
  return `${(first || "?")[0]}${(last || "")[0] || ""}`.toUpperCase();
}

// Badge color is derived from the status's flags, not its name — the
// list is company-configurable now, so there's no fixed set of names
// to hardcode a lookup table against.
function badgeClass(statusMeta) {
  if (!statusMeta) return "bg-[#f3f2f5] text-[#706f83]";
  if (statusMeta.is_exit) return "bg-[#f3f2f5] text-[#706f83]";
  if (statusMeta.is_active_headcount) return "bg-[#e8f9f0] text-[#1a9c5f]";
  return "bg-[#fef3e2] text-[#d68a1f]";
}

export default function EmployeesTable({ initialEmployees, statuses, canManage, isAdmin, currentProfileId, companyId }) {
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [statusDrawerEmployee, setStatusDrawerEmployee] = useState(null);
  const [exitDrawerEmployee, setExitDrawerEmployee] = useState(null);
  const [invitingId, setInvitingId] = useState(null);
  const [inviteError, setInviteError] = useState(null);

  const employees = initialEmployees;
  const statusByName = useMemo(() => new Map(statuses.map((s) => [s.name, s])), [statuses]);

  const filtered = useMemo(() => {
    return employees.filter((emp) => {
      if (filter !== "all" && emp.status !== filter) return false;
      if (search) {
        const q = search.toLowerCase();
        const haystack = `${emp.first_name} ${emp.last_name} ${emp.email}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [employees, filter, search]);

  const activeCount = employees.filter((e) => statusByName.get(e.status)?.is_active_headcount).length;
  const onLeaveCount = employees.filter((e) => e.status === "On Leave").length;

  function refresh() {
    router.refresh();
  }

  function openAdd() {
    setEditingEmployee(null);
    setDrawerOpen(true);
  }

  function openEdit(emp) {
    setEditingEmployee(emp);
    setDrawerOpen(true);
  }

  async function handleInvite(emp) {
    setInvitingId(emp.id);
    setInviteError(null);
    try {
      const res = await fetch("/api/invite-employee", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId: emp.id }),
      });
      // The body isn't guaranteed to be valid JSON (a framework-level
      // 500 can return an empty or HTML body) — never let that throw
      // past this point, and never surface a raw non-string value.
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const detail = typeof data?.error === "string" && data.error ? data.error : null;
        console.error("Invite to portal failed:", res.status, data);
        setInviteError(
          `Couldn't invite ${emp.first_name} — ${
            detail ??
            "the email service didn't accept it. If you're on Resend's sandbox sender, it can only deliver to the address your Resend account is registered under — verify a domain at resend.com/domains to invite anyone else."
          }`
        );
      } else {
        router.refresh();
      }
    } catch {
      setInviteError(`Couldn't reach the server to invite ${emp.first_name}. Check your connection and try again.`);
    }
    setInvitingId(null);
  }

  return (
    <div>
      <div className="flex flex-wrap justify-between items-start gap-3 mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-[var(--color-text-primary)]">
            Employees
          </h1>
          <p className="text-[var(--color-text-muted)] text-sm mt-0.5">
            {activeCount} active · {onLeaveCount} on leave
          </p>
        </div>
        {canManage && (
          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-transform duration-150 hover:scale-[1.03] active:scale-95"
            style={{ backgroundColor: "var(--color-primary)", transitionTimingFunction: "var(--ease-out)" }}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Add employee
          </button>
        )}
      </div>

      {inviteError && (
        <div className="flex items-start gap-3 bg-[#fde8e8] text-[#cc3333] rounded-lg px-4 py-3 mb-4 text-sm">
          <span className="flex-1">{inviteError}</span>
          <button
            onClick={() => setInviteError(null)}
            aria-label="Dismiss"
            className="shrink-0 text-[#cc3333]/70 hover:text-[#cc3333]"
          >
            &times;
          </button>
        </div>
      )}

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="flex items-center gap-2 bg-white border border-black/[0.08] rounded-lg px-3 py-2 text-sm text-[var(--color-text-muted)] max-w-[260px] flex-1 min-w-[180px]">
          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search employees..."
            className="bg-transparent outline-none w-full text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="text-xs font-medium px-3 py-2.5 rounded-lg border border-black/[0.08] bg-white text-[var(--color-text-primary)] outline-none"
        >
          <option value="all">All statuses</option>
          {statuses.map((s) => (
            <option key={s.id} value={s.name}>{s.name}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState hasAny={employees.length > 0} onAdd={canManage ? openAdd : null} />
      ) : (
        <div className="bg-white rounded-2xl border border-black/[0.06] overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[760px]">
            <thead>
              <tr className="text-left text-[11px] font-semibold tracking-wide uppercase text-[#9089a0] border-b border-black/[0.06]">
                <th className="py-3 pl-4 px-3">Name</th>
                <th className="py-3 px-3">Role</th>
                <th className="py-3 px-3">Department</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Start date</th>
                <th className="py-3 px-3 pr-4 w-16"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((emp, i) => (
                <tr
                  key={emp.id}
                  className="group border-b border-black/[0.04] last:border-b-0 hover:bg-[var(--color-primary)]/[0.03] transition-colors duration-150"
                  style={{
                    transitionTimingFunction: "var(--ease-out)",
                    animation: `rowIn 400ms var(--ease-out) ${i * 0.04}s both`,
                  }}
                >
                  <td className="py-3.5 pl-4 px-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0"
                        style={{ background: gradientFor(emp.first_name + emp.last_name) }}
                      >
                        {initials(emp.first_name, emp.last_name)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-[var(--color-text-primary)] truncate">
                          {emp.first_name} {emp.last_name}
                        </p>
                        <p className="text-xs text-[var(--color-text-muted)] truncate">{emp.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-3 text-[var(--color-text-muted)]">{emp.job_title || "—"}</td>
                  <td className="py-3.5 px-3">
                    {emp.department ? (
                      <span className="text-xs font-medium bg-[#f3f2f5] text-[#4a4756] px-2 py-1 rounded-md">
                        {emp.department}
                      </span>
                    ) : (
                      <span className="text-[var(--color-text-muted)]">—</span>
                    )}
                  </td>
                  <td className="py-3.5 px-3">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-md ${badgeClass(statusByName.get(emp.status))}`}>
                      {emp.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 font-mono text-xs text-[var(--color-text-muted)]">
                    {emp.start_date
                      ? new Date(emp.start_date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "—"}
                  </td>
                  <td className="py-3.5 px-3 pr-4">
                    <div className="flex items-center gap-1.5 justify-end">
                      {canManage && !emp.profile_id && (
                        <button
                          onClick={() => handleInvite(emp)}
                          disabled={invitingId === emp.id}
                          className="text-[11px] font-medium px-2.5 py-1 rounded-md bg-[var(--color-violet-tint)] text-[var(--color-primary)] transition-colors duration-150 hover:bg-[var(--color-primary)] hover:text-white disabled:opacity-50"
                          style={{ transitionTimingFunction: "var(--ease-out)" }}
                        >
                          {invitingId === emp.id ? "Sending..." : "Invite to portal"}
                        </button>
                      )}
                      {emp.profile_id && (
                        <span className="text-[10.5px] font-medium text-[#1a9c5f] bg-[#e8f9f0] px-2 py-1 rounded-md">
                          Portal access
                        </span>
                      )}
                      {canManage && (
                        <button
                          onClick={() => setStatusDrawerEmployee(emp)}
                          className="w-7 h-7 rounded-md flex items-center justify-center text-[var(--color-text-muted)] transition-colors duration-150 hover:bg-black/[0.06] hover:text-[var(--color-text-primary)] shrink-0"
                          style={{ transitionTimingFunction: "var(--ease-out)" }}
                          aria-label={`Change status for ${emp.first_name}`}
                          title="Change status"
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="9" />
                            <path d="M12 7v5l3 3" />
                          </svg>
                        </button>
                      )}
                      {isAdmin && (
                        <button
                          onClick={() => setExitDrawerEmployee(emp)}
                          className="w-7 h-7 rounded-md flex items-center justify-center text-[var(--color-text-muted)] transition-colors duration-150 hover:bg-[#fde8e8] hover:text-[#cc3333] shrink-0"
                          style={{ transitionTimingFunction: "var(--ease-out)" }}
                          aria-label={`Record exit for ${emp.first_name}`}
                          title="Record exit"
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                            <path d="M16 17l5-5-5-5M21 12H9" />
                          </svg>
                        </button>
                      )}
                      {canManage && (
                        <button
                          onClick={() => openEdit(emp)}
                          className="w-7 h-7 rounded-md flex items-center justify-center text-[var(--color-text-muted)] transition-colors duration-150 hover:bg-black/[0.06] hover:text-[var(--color-text-primary)] shrink-0"
                          style={{ transitionTimingFunction: "var(--ease-out)" }}
                          aria-label={`Edit ${emp.first_name}`}
                          title="Edit"
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      <EmployeeDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSaved={refresh}
        editingEmployee={editingEmployee}
        companyId={companyId}
        employees={employees}
        isAdmin={isAdmin}
        currentProfileId={currentProfileId}
      />

      <ChangeStatusDrawer
        open={!!statusDrawerEmployee}
        onClose={() => setStatusDrawerEmployee(null)}
        onSaved={refresh}
        employee={statusDrawerEmployee}
        statuses={statuses}
      />

      <ExitEmployeeDrawer
        open={!!exitDrawerEmployee}
        onClose={() => setExitDrawerEmployee(null)}
        onSaved={refresh}
        employee={exitDrawerEmployee}
        statuses={statuses}
        employees={employees}
      />

      <style jsx global>{`
        @keyframes rowIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

function EmptyState({ hasAny, onAdd }) {
  return (
    <div className="text-center py-20 border-[1.5px] border-dashed border-black/[0.1] rounded-2xl">
      <div className="w-12 h-12 rounded-[14px] bg-[var(--color-violet-tint)] flex items-center justify-center mx-auto mb-4">
        <svg className="w-5 h-5 text-[var(--color-primary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
        </svg>
      </div>
      <p className="font-display font-semibold text-[var(--color-text-primary)]">
        {hasAny ? "No employees match" : "No employees yet"}
      </p>
      <p className="text-sm text-[var(--color-text-muted)] mt-1">
        {hasAny ? "Try a different search or filter." : onAdd ? "Add your first employee to get started." : "Employees will appear here once added."}
      </p>
    </div>
  );
}
