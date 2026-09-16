"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/dashboard/ToastProvider";

const inputClass = "w-full border border-black/10 rounded-lg px-3 py-2 text-sm outline-none transition-shadow duration-150";
const focusRing = (e) => (e.target.style.boxShadow = "0 0 0 2px var(--color-accent)");
const clearRing = (e) => (e.target.style.boxShadow = "none");

// Phase 6 — shared by Settings → Departments and Settings → Teams,
// which are otherwise identical: a managed name list, rename-cascade
// on save, deactivate-not-delete. `kind` picks the RPC and copy.
export default function OrgUnitsPage({ kind, title, description, items }) {
  const router = useRouter();
  const supabase = createClient();
  const toast = useToast();
  const [drawerItem, setDrawerItem] = useState(null); // {} = new, {...item} = edit, null = closed
  const [togglingId, setTogglingId] = useState(null);

  const rpcName = kind === "department" ? "upsert_department" : "upsert_team";
  const noun = kind === "department" ? "department" : "team";

  async function handleToggleActive(item) {
    const activating = !item.is_active;
    if (
      !activating &&
      !confirm(
        `Deactivate "${item.name}"? It'll stop appearing as a suggestion for new entries — anyone already using it keeps showing it, and nothing about their record changes.`
      )
    ) {
      return;
    }
    setTogglingId(item.id);
    const { error } = await supabase.rpc(rpcName, {
      p_id: item.id,
      p_name: item.name,
      p_is_active: activating,
      p_sort_order: item.sort_order,
    });
    setTogglingId(null);
    if (error) {
      toast.showError(error.message);
      return;
    }
    toast.showSuccess(activating ? `"${item.name}" reactivated.` : `"${item.name}" deactivated.`);
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
          <h1 className="font-display text-2xl font-semibold text-[var(--color-text-primary)]">{title}</h1>
          <p className="text-[var(--color-text-muted)] text-sm mt-0.5 max-w-[52ch]">{description}</p>
        </div>
        <button
          onClick={() => setDrawerItem({})}
          className="flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-transform duration-150 hover:scale-[1.03] active:scale-95"
          style={{ backgroundColor: "var(--color-primary)", transitionTimingFunction: "var(--ease-out)" }}
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add {noun}
        </button>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-20 border-[1.5px] border-dashed border-black/[0.1] rounded-2xl">
          <p className="font-display font-semibold text-[var(--color-text-primary)]">No {noun}s yet</p>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">Add one to start suggesting it wherever {noun} comes up.</p>
        </div>
      ) : (
        <div className="bg-white border border-black/[0.06] rounded-2xl overflow-hidden">
          {items.map((item, i) => (
            <div
              key={item.id}
              className={`flex items-center justify-between gap-3 px-5 py-3.5 border-t border-black/[0.05] first:border-t-0 ${item.is_active === false ? "opacity-50" : ""}`}
              style={{ animation: `rowIn 400ms var(--ease-out) ${i * 0.03}s both` }}
            >
              <p className="text-sm font-medium text-[var(--color-text-primary)]">
                {item.name}
                {item.is_active === false && (
                  <span className="ml-2 text-[10.5px] font-normal text-[var(--color-text-muted)]">Deactivated</span>
                )}
              </p>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => setDrawerItem(item)}
                  className="text-xs font-medium px-3 py-1.5 rounded-md bg-[var(--color-violet-tint)] text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white transition-colors duration-150"
                  style={{ transitionTimingFunction: "var(--ease-out)" }}
                >
                  Edit
                </button>
                <button
                  onClick={() => handleToggleActive(item)}
                  disabled={togglingId === item.id}
                  className={`text-xs font-medium px-3 py-1.5 rounded-md border transition-colors duration-150 disabled:opacity-50 ${
                    item.is_active === false
                      ? "border-[#e8f9f0] text-[#1a9c5f] hover:bg-[#e8f9f0]"
                      : "border-black/10 text-[var(--color-text-muted)] hover:bg-black/[0.03]"
                  }`}
                  style={{ transitionTimingFunction: "var(--ease-out)" }}
                >
                  {togglingId === item.id ? "..." : item.is_active === false ? "Reactivate" : "Deactivate"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {drawerItem && (
        <ItemDrawer
          item={drawerItem.id ? drawerItem : null}
          rpcName={rpcName}
          noun={noun}
          onClose={() => setDrawerItem(null)}
          onSaved={() => {
            setDrawerItem(null);
            router.refresh();
          }}
        />
      )}

      <style jsx global>{`
        @keyframes rowIn {
          from { opacity: 0; transform: translateY(4px); }
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

function ItemDrawer({ item, rpcName, noun, onClose, onSaved }) {
  const supabase = createClient();
  const toast = useToast();
  const isEdit = Boolean(item);

  const [name, setName] = useState(item?.name ?? "");
  const [sortOrder, setSortOrder] = useState(item?.sort_order ?? 0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);

    const { error: rpcError } = await supabase.rpc(rpcName, {
      p_id: item?.id ?? null,
      p_name: name,
      p_is_active: item?.is_active ?? true,
      p_sort_order: Number(sortOrder) || 0,
    });

    setSaving(false);

    if (rpcError) {
      setError(
        rpcError.code === "23505"
          ? `A ${noun} with this name already exists.`
          : rpcError.message
      );
      return;
    }

    toast.showSuccess(isEdit ? `"${name}" updated.` : `"${name}" added.`);
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/35 animate-[fadeIn_200ms_var(--ease-out)]" onClick={onClose} />
      <div className="absolute top-0 right-0 bottom-0 w-full max-w-[380px] bg-white p-7 overflow-y-auto shadow-2xl animate-[slideIn_280ms_var(--ease-out)]">
        <h2 className="font-display text-lg font-semibold text-[var(--color-text-primary)] capitalize">
          {isEdit ? `Edit ${noun}` : `Add ${noun}`}
        </h2>
        <p className="text-sm text-[var(--color-text-muted)] mt-1 mb-6">
          {isEdit
            ? "Renaming updates every employee, posting, requisition, and targeted announcement using it — nobody gets silently orphaned."
            : "Available immediately as a suggestion, company-wide."}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5 capitalize">{noun} name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={noun === "department" ? "e.g. Finance" : "e.g. Design Systems"}
              className={inputClass}
              onFocus={focusRing}
              onBlur={clearRing}
            />
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
            <p className="text-[11px] text-[var(--color-text-muted)] mt-1">Lower numbers show first as a suggestion.</p>
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
              {saving ? "Saving..." : isEdit ? "Save changes" : `Add ${noun}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
