"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

// 7.3 — leave types are fully company-configurable: add one, rename
// it, change its default allocation, or take it out of the current
// workflow (deactivate — never a hard delete, since a type that's
// already been used on real requests can't just disappear without
// destroying that history).
export default function LeaveTypeDrawer({ open, onClose, onSaved, companyId, editingType }) {
  const supabase = createClient();
  const [name, setName] = useState("");
  const [days, setDays] = useState("20");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (editingType) {
      setName(editingType.name);
      setDays(String(editingType.default_days_per_year ?? 20));
    } else {
      setName("");
      setDays("20");
    }
  }, [open, editingType]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = { name, default_days_per_year: Number(days || 0) };

    const { error: dbError } = editingType
      ? await supabase.from("leave_types").update(payload).eq("id", editingType.id)
      : await supabase.from("leave_types").insert({ ...payload, company_id: companyId });

    setSaving(false);

    if (dbError) {
      setError(dbError.message);
      return;
    }

    onSaved();
    onClose();
  }

  async function handleToggleActive() {
    setSaving(true);
    setError(null);

    const { error: dbError } = await supabase
      .from("leave_types")
      .update({ is_active: !editingType.is_active })
      .eq("id", editingType.id);

    setSaving(false);
    if (dbError) {
      setError(dbError.message);
      return;
    }
    onSaved();
    onClose();
  }

  if (!open) return null;

  const inputClass =
    "w-full border border-black/10 rounded-lg px-3 py-2 text-sm outline-none transition-shadow duration-150";
  const focusRing = (e) => (e.target.style.boxShadow = "0 0 0 2px var(--color-accent)");
  const clearRing = (e) => (e.target.style.boxShadow = "none");

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/35 animate-[fadeIn_200ms_var(--ease-out)]" onClick={onClose} />
      <div className="absolute top-0 right-0 bottom-0 w-full max-w-[380px] bg-white p-7 overflow-y-auto shadow-2xl animate-[slideIn_280ms_var(--ease-out)]">
        <h2 className="font-display text-lg font-semibold text-[var(--color-text-primary)]">
          {editingType ? "Edit leave type" : "Add leave type"}
        </h2>
        <p className="text-sm text-[var(--color-text-muted)] mt-1 mb-6">
          {editingType ? "Changes apply company-wide." : "Available to every employee once added."}
        </p>

        {editingType && !editingType.is_active && (
          <div className="mb-5 rounded-lg bg-[#fde8e8] px-4 py-3 text-sm text-[#8a2323]">
            Removed from the current workflow — no one can request this type anymore, but past requests keep showing it.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
              onFocus={focusRing}
              onBlur={clearRing}
              placeholder="e.g. Study leave"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">Default days per year</label>
            <input
              type="number"
              min="0"
              value={days}
              onChange={(e) => setDays(e.target.value)}
              className={inputClass}
              onFocus={focusRing}
              onBlur={clearRing}
            />
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
              {saving ? "Saving..." : editingType ? "Save changes" : "Add type"}
            </button>
          </div>

          {editingType && (
            <button
              type="button"
              onClick={handleToggleActive}
              disabled={saving}
              className={`w-full text-sm font-medium py-2.5 rounded-lg border transition-colors duration-150 disabled:opacity-60 ${
                editingType.is_active
                  ? "border-[#fde8e8] text-[#cc3333] hover:bg-[#fde8e8]"
                  : "border-[#e8f9f0] text-[#1a9c5f] hover:bg-[#e8f9f0]"
              }`}
            >
              {editingType.is_active ? "Remove from current workflow" : "Restore to current workflow"}
            </button>
          )}
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
