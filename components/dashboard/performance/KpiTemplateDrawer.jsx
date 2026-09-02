"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

const CYCLE_TYPES = [
  { id: "monthly", label: "Monthly" },
  { id: "quarterly", label: "Quarterly" },
  { id: "half_yearly", label: "Half-yearly" },
  { id: "annual", label: "Annual" },
  { id: "probation", label: "Probation" },
  { id: "custom", label: "Custom" },
];

const EMPTY_FORM = { job_title: "", cycle_type: "monthly", kpi_name: "", target_value: "", target_unit: "", weight: "" };

// 5.2 — a KPI belongs to a role (job title), not one person: this
// adds/edits one line in that role's KPI set for a given cycle
// cadence. Every employee whose job_title matches picks these up
// automatically via ensure_employee_kpis() the next time a cycle of
// that type opens for them.
export default function KpiTemplateDrawer({ open, onClose, onSaved, companyId, profileId, editingTemplate, jobTitleSuggestions }) {
  const supabase = createClient();
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setForm(
      editingTemplate
        ? {
            job_title: editingTemplate.job_title,
            cycle_type: editingTemplate.cycle_type,
            kpi_name: editingTemplate.kpi_name,
            target_value: editingTemplate.target_value ?? "",
            target_unit: editingTemplate.target_unit ?? "",
            weight: editingTemplate.weight ?? "",
          }
        : EMPTY_FORM
    );
  }, [open, editingTemplate]);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      job_title: form.job_title.trim(),
      cycle_type: form.cycle_type,
      kpi_name: form.kpi_name.trim(),
      target_value: form.target_value === "" ? null : Number(form.target_value),
      target_unit: form.target_unit.trim() || null,
      weight: form.weight === "" ? 0 : Number(form.weight),
    };

    const { error: dbError } = editingTemplate
      ? await supabase.from("kpi_templates").update(payload).eq("id", editingTemplate.id)
      : await supabase.from("kpi_templates").insert({ ...payload, company_id: companyId, created_by: profileId });

    setSaving(false);

    if (dbError) {
      setError(dbError.message);
      return;
    }

    onSaved();
    onClose();
  }

  if (!open) return null;

  const inputClass = "w-full border border-black/10 rounded-lg px-3 py-2 text-sm outline-none transition-shadow duration-150";
  const focusRing = (e) => (e.target.style.boxShadow = "0 0 0 2px var(--color-accent)");
  const clearRing = (e) => (e.target.style.boxShadow = "none");

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/35 animate-[fadeIn_200ms_var(--ease-out)]" onClick={onClose} />
      <div className="absolute top-0 right-0 bottom-0 w-full max-w-[380px] bg-white p-7 overflow-y-auto shadow-2xl animate-[slideIn_280ms_var(--ease-out)]">
        <h2 className="font-display text-lg font-semibold text-[var(--color-text-primary)]">
          {editingTemplate ? "Edit KPI" : "Add KPI"}
        </h2>
        <p className="text-sm text-[var(--color-text-muted)] mt-1 mb-6">
          Applies to everyone with this job title once a cycle of this type opens.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">Job title</label>
            <input
              type="text" required list="job-title-suggestions" value={form.job_title}
              onChange={(e) => update("job_title", e.target.value)}
              placeholder="e.g. Sales Executive"
              className={inputClass} onFocus={focusRing} onBlur={clearRing}
            />
            <datalist id="job-title-suggestions">
              {(jobTitleSuggestions ?? []).map((t) => <option key={t} value={t} />)}
            </datalist>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">Cycle type</label>
            <select value={form.cycle_type} onChange={(e) => update("cycle_type", e.target.value)} className={inputClass} onFocus={focusRing} onBlur={clearRing}>
              {CYCLE_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">KPI name</label>
            <input
              type="text" required value={form.kpi_name}
              onChange={(e) => update("kpi_name", e.target.value)}
              placeholder="e.g. Monthly revenue"
              className={inputClass} onFocus={focusRing} onBlur={clearRing}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">Target</label>
              <input
                type="number" step="any" value={form.target_value}
                onChange={(e) => update("target_value", e.target.value)}
                placeholder="5000000"
                className={inputClass} onFocus={focusRing} onBlur={clearRing}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">Unit</label>
              <input
                type="text" value={form.target_unit}
                onChange={(e) => update("target_unit", e.target.value)}
                placeholder="₦, count, %"
                className={inputClass} onFocus={focusRing} onBlur={clearRing}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">Weight (%)</label>
            <input
              type="number" min="0" max="100" value={form.weight}
              onChange={(e) => update("weight", e.target.value)}
              placeholder="40"
              className={inputClass} onFocus={focusRing} onBlur={clearRing}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2.5 pt-2">
            <button
              type="button" onClick={onClose}
              className="flex-1 border border-black/10 rounded-lg py-2.5 text-sm font-medium text-[var(--color-text-muted)] hover:bg-black/[0.03] transition-colors duration-150"
              style={{ transitionTimingFunction: "var(--ease-out)" }}
            >
              Cancel
            </button>
            <button
              type="submit" disabled={saving}
              className="flex-[1.4] rounded-lg py-2.5 text-sm font-medium text-white transition-transform duration-150 hover:scale-[1.02] active:scale-95 disabled:opacity-60"
              style={{ backgroundColor: "var(--color-primary)", transitionTimingFunction: "var(--ease-out)" }}
            >
              {saving ? "Saving..." : editingTemplate ? "Save changes" : "Add KPI"}
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
