"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/dashboard/ToastProvider";

const inputClass = "w-full border border-black/10 rounded-lg px-3 py-2 text-sm outline-none transition-shadow duration-150";
const focusRing = (e) => (e.target.style.boxShadow = "0 0 0 2px var(--color-accent)");
const clearRing = (e) => (e.target.style.boxShadow = "none");

function Flag({ on, label }) {
  return (
    <span
      className={`text-[10.5px] font-medium px-2 py-1 rounded-md ${
        on ? "bg-[var(--color-violet-tint)] text-[var(--color-primary)]" : "bg-[#f3f2f5] text-[#9089a0]"
      }`}
    >
      {label}
    </span>
  );
}

export default function EmployeeStatusesPage({ statuses, companyId }) {
  const router = useRouter();
  const supabase = createClient();
  const toast = useToast();
  const [drawerStatus, setDrawerStatus] = useState(null); // { ...status } or {} for new, null = closed
  const [togglingId, setTogglingId] = useState(null);

  async function handleToggleActive(s) {
    const activating = !s.is_active;
    if (
      !activating &&
      !confirm(
        `Deactivate "${s.name}"? It'll stop appearing as a choice for new status changes — anyone already on it keeps showing it, and nothing about their record changes.`
      )
    ) {
      return;
    }
    setTogglingId(s.id);
    const { error } = await supabase.rpc("upsert_employee_status", {
      p_id: s.id,
      p_name: s.name,
      p_is_active_headcount: s.is_active_headcount,
      p_is_exit: s.is_exit,
      p_blocks_login: s.blocks_login,
      p_is_active: activating,
      p_sort_order: s.sort_order,
    });
    setTogglingId(null);
    if (error) {
      toast.showError(error.message);
      return;
    }
    toast.showSuccess(activating ? `"${s.name}" reactivated.` : `"${s.name}" deactivated.`);
    router.refresh();
  }

  return (
    <div>
      <Link
        href="/dashboard/settings"
        className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors duration-150 mb-4 inline-flex items-center gap-1"
        style={{ transitionTimingFunction: "var(--ease-out)" }}
      >
        ← Back to Settings
      </Link>

      <div className="flex flex-wrap justify-between items-start gap-3 mb-7">
        <div>
          <h1 className="font-display text-2xl font-semibold text-[var(--color-text-primary)]">Employee statuses</h1>
          <p className="text-[var(--color-text-muted)] text-sm mt-0.5 max-w-[52ch]">
            What each status means for headcount, exits, and portal login — used everywhere across HRhub, from Employees to Payroll to the dashboard.
          </p>
        </div>
        <button
          onClick={() => setDrawerStatus({})}
          className="flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-transform duration-150 hover:scale-[1.03] active:scale-95"
          style={{ backgroundColor: "var(--color-primary)", transitionTimingFunction: "var(--ease-out)" }}
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add status
        </button>
      </div>

      <div className="bg-white border border-black/[0.06] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="text-left text-[10.5px] font-semibold tracking-wide uppercase text-[#9089a0] border-b border-black/[0.06]">
                <th className="py-3.5 px-4">Name</th>
                <th className="py-3.5 px-3.5">Active headcount</th>
                <th className="py-3.5 px-3.5">Exit status</th>
                <th className="py-3.5 px-3.5">Blocks login</th>
                <th className="py-3.5 px-3.5"></th>
                <th className="py-3.5 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {statuses.map((s) => (
                <tr key={s.id} className={`border-t border-black/[0.05] ${s.is_active === false ? "opacity-50" : ""}`}>
                  <td className="py-3.5 px-4 font-medium text-[var(--color-text-primary)]">
                    {s.name}
                    {s.is_active === false && (
                      <span className="ml-2 text-[10.5px] font-normal text-[var(--color-text-muted)]">Deactivated</span>
                    )}
                  </td>
                  <td className="py-3.5 px-3.5"><Flag on={s.is_active_headcount} label={s.is_active_headcount ? "Yes" : "No"} /></td>
                  <td className="py-3.5 px-3.5"><Flag on={s.is_exit} label={s.is_exit ? "Yes" : "No"} /></td>
                  <td className="py-3.5 px-3.5"><Flag on={s.blocks_login} label={s.blocks_login ? "Yes" : "No"} /></td>
                  <td className="py-3.5 px-3.5 text-right">
                    <button
                      onClick={() => setDrawerStatus(s)}
                      className="text-xs font-medium px-3 py-1.5 rounded-md bg-[var(--color-violet-tint)] text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white transition-colors duration-150"
                      style={{ transitionTimingFunction: "var(--ease-out)" }}
                    >
                      Edit
                    </button>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => handleToggleActive(s)}
                      disabled={togglingId === s.id}
                      className={`text-xs font-medium px-3 py-1.5 rounded-md border transition-colors duration-150 disabled:opacity-50 ${
                        s.is_active === false
                          ? "border-[#e8f9f0] text-[#1a9c5f] hover:bg-[#e8f9f0]"
                          : "border-black/10 text-[var(--color-text-muted)] hover:bg-black/[0.03]"
                      }`}
                      style={{ transitionTimingFunction: "var(--ease-out)" }}
                    >
                      {togglingId === s.id ? "..." : s.is_active === false ? "Reactivate" : "Deactivate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {drawerStatus && (
        <StatusDrawer
          status={drawerStatus.id ? drawerStatus : null}
          companyId={companyId}
          onClose={() => setDrawerStatus(null)}
          onSaved={() => {
            setDrawerStatus(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function StatusDrawer({ status, onClose, onSaved }) {
  const supabase = createClient();
  const toast = useToast();
  const isEdit = Boolean(status);

  const [name, setName] = useState(status?.name ?? "");
  const [isActiveHeadcount, setIsActiveHeadcount] = useState(status?.is_active_headcount ?? true);
  const [isExit, setIsExit] = useState(status?.is_exit ?? false);
  const [blocksLogin, setBlocksLogin] = useState(status?.blocks_login ?? false);
  const [sortOrder, setSortOrder] = useState(status?.sort_order ?? 0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);

    const { error: rpcError } = await supabase.rpc("upsert_employee_status", {
      p_id: status?.id ?? null,
      p_name: name,
      p_is_active_headcount: isActiveHeadcount,
      p_is_exit: isExit,
      p_blocks_login: blocksLogin,
      p_is_active: status?.is_active ?? true,
      p_sort_order: Number(sortOrder) || 0,
    });

    setSaving(false);

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    toast.showSuccess(isEdit ? `"${name}" updated.` : `"${name}" added.`);
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/35 animate-[fadeIn_200ms_var(--ease-out)]" onClick={onClose} />
      <div className="absolute top-0 right-0 bottom-0 w-full max-w-[420px] bg-white p-7 overflow-y-auto shadow-2xl animate-[slideIn_280ms_var(--ease-out)]">
        <h2 className="font-display text-lg font-semibold text-[var(--color-text-primary)]">
          {isEdit ? "Edit status" : "Add status"}
        </h2>
        <p className="text-sm text-[var(--color-text-muted)] mt-1 mb-6">
          {isEdit
            ? "Renaming updates every employee currently on this status too — nobody gets silently orphaned."
            : "Available immediately, company-wide."}
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sabbatical"
              className={inputClass}
              onFocus={focusRing}
              onBlur={clearRing}
            />
          </div>

          <div className="space-y-3 rounded-lg bg-[var(--color-surface)] p-3.5">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={isActiveHeadcount}
                onChange={(e) => setIsActiveHeadcount(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                <span className="block text-sm text-[var(--color-text-primary)]">Counts as active headcount</span>
                <span className="block text-xs text-[var(--color-text-muted)] mt-0.5">
                  Included in "active employees," payroll runs, and onboarding-completion %.
                </span>
              </span>
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={isExit}
                onChange={(e) => setIsExit(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                <span className="block text-sm text-[var(--color-text-primary)]">Is an exit status</span>
                <span className="block text-xs text-[var(--color-text-muted)] mt-0.5">
                  Only reachable through "Record exit" (handover, replacement, outstanding items) — not this list's own status picker.
                </span>
              </span>
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={blocksLogin}
                onChange={(e) => setBlocksLogin(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                <span className="block text-sm text-[var(--color-text-primary)]">Blocks portal login</span>
                <span className="block text-xs text-[var(--color-text-muted)] mt-0.5">
                  Moving an employee onto this status bans their login immediately; moving them off it restores access.
                </span>
              </span>
            </label>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">Sort order</label>
            <input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className={inputClass}
              onFocus={focusRing}
              onBlur={clearRing}
            />
            <p className="text-[11px] text-[var(--color-text-muted)] mt-1">Lower numbers show first in dropdowns.</p>
          </div>

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
              {saving ? "Saving..." : isEdit ? "Save changes" : "Add status"}
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
