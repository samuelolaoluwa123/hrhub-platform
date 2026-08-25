"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import EmployeeDrawer from "./EmployeeDrawer";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "on_leave", label: "On leave" },
  { key: "terminated", label: "Terminated" },
];

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

const STATUS_BADGE = {
  active: "bg-[#e8f9f0] text-[#1a9c5f]",
  on_leave: "bg-[#fef3e2] text-[#d68a1f]",
  terminated: "bg-[#f3f2f5] text-[#706f83]",
};
const STATUS_LABEL = { active: "Active", on_leave: "On leave", terminated: "Terminated" };

export default function EmployeesTable({ initialEmployees, canManage, companyId }) {
  const router = useRouter();
  const supabase = createClient();

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(new Set());
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [invitingId, setInvitingId] = useState(null);

  const employees = initialEmployees;

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

  const activeCount = employees.filter((e) => e.status === "active").length;
  const onLeaveCount = employees.filter((e) => e.status === "on_leave").length;

  function toggleRow(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) =>
      prev.size === filtered.length ? new Set() : new Set(filtered.map((e) => e.id))
    );
  }

  function refresh() {
    setSelected(new Set());
    router.refresh();
  }

  async function handleBulkDeactivate() {
    if (!canManage) return;
    const { error } = await supabase
      .from("employees")
      .update({ status: "terminated" })
      .in("id", Array.from(selected));
    if (error) {
      alert(error.message);
      return;
    }
    refresh();
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
    try {
      const res = await fetch("/api/invite-employee", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId: emp.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to send invite.");
      } else {
        router.refresh();
      }
    } catch {
      alert("Failed to send invite. Check your connection and try again.");
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

      {canManage && selected.size > 0 ? (
        <div className="flex items-center gap-4 bg-[var(--color-text-primary)] text-white rounded-lg px-4 py-2.5 mb-4 text-sm">
          <span className="font-medium">{selected.size} selected</span>
          <div className="ml-auto flex gap-2">
            <button
              onClick={handleBulkDeactivate}
              className="bg-white/10 hover:bg-white/20 transition-colors duration-150 rounded-md px-3 py-1.5 text-xs"
              style={{ transitionTimingFunction: "var(--ease-out)" }}
            >
              Deactivate
            </button>
          </div>
        </div>
      ) : (
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
          {FILTERS.map((f) => (
            <button
              key={f.key}
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
      )}

      {filtered.length === 0 ? (
        <EmptyState hasAny={employees.length > 0} onAdd={canManage ? openAdd : null} />
      ) : (
        <div className="bg-white rounded-2xl border border-black/[0.06] overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="text-left text-[11px] font-semibold tracking-wide uppercase text-[#9089a0] border-b border-black/[0.06]">
                {canManage && (
                  <th className="w-8 py-3 pl-4">
                    <input
                      type="checkbox"
                      className="accent-[var(--color-primary)]"
                      checked={selected.size === filtered.length}
                      onChange={toggleAll}
                    />
                  </th>
                )}
                <th className="py-3 px-3">Name</th>
                <th className="py-3 px-3">Role</th>
                <th className="py-3 px-3">Department</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Start date</th>
                <th className="py-3 px-3 w-16"></th>
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
                  {canManage && (
                    <td className="py-3.5 pl-4">
                      <input
                        type="checkbox"
                        className="accent-[var(--color-primary)]"
                        checked={selected.has(emp.id)}
                        onChange={() => toggleRow(emp.id)}
                      />
                    </td>
                  )}
                  <td className="py-3.5 px-3">
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
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-md ${STATUS_BADGE[emp.status]}`}>
                      {STATUS_LABEL[emp.status]}
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
                  <td className="py-3.5 px-3">
                    <div className="flex items-center gap-1.5 justify-end">
                      {canManage && !emp.profile_id && (
                        <button
                          onClick={() => handleInvite(emp)}
                          disabled={invitingId === emp.id}
                          className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 text-[11px] font-medium px-2.5 py-1 rounded-md bg-[var(--color-violet-tint)] text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white disabled:opacity-50"
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
                          onClick={() => openEdit(emp)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 w-7 h-7 rounded-md flex items-center justify-center text-[var(--color-text-muted)] hover:bg-black/[0.06] hover:text-[var(--color-text-primary)] shrink-0"
                          style={{ transitionTimingFunction: "var(--ease-out)" }}
                          aria-label={`Edit ${emp.first_name}`}
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
