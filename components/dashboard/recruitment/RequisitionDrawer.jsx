"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function RequisitionDrawer({ open, onClose, onSaved, companyId, profileId }) {
  const supabase = createClient();
  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [employmentType, setEmploymentType] = useState("full_time");
  const [headcount, setHeadcount] = useState(1);
  const [justification, setJustification] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const { error: dbError } = await supabase.from("job_requisitions").insert({
      company_id: companyId,
      title,
      department: department || null,
      employment_type: employmentType,
      headcount: Number(headcount),
      justification: justification || null,
      requested_by: profileId,
    });

    setSaving(false);

    if (dbError) {
      setError(dbError.message);
      return;
    }

    setTitle("");
    setDepartment("");
    setHeadcount(1);
    setJustification("");
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
        <h2 className="font-display text-lg font-semibold text-[var(--color-text-primary)]">New requisition</h2>
        <p className="text-sm text-[var(--color-text-muted)] mt-1 mb-6">Goes to an admin for approval before it can be posted.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">Role title</label>
            <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} onFocus={focusRing} onBlur={clearRing} placeholder="e.g. Backend Engineer" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">Department</label>
              <input type="text" value={department} onChange={(e) => setDepartment(e.target.value)} className={inputClass} onFocus={focusRing} onBlur={clearRing} placeholder="Engineering" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">Headcount</label>
              <input type="number" min="1" value={headcount} onChange={(e) => setHeadcount(e.target.value)} className={inputClass} onFocus={focusRing} onBlur={clearRing} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">Employment type</label>
            <select value={employmentType} onChange={(e) => setEmploymentType(e.target.value)} className={inputClass} onFocus={focusRing} onBlur={clearRing}>
              <option value="full_time">Full-time</option>
              <option value="part_time">Part-time</option>
              <option value="contract">Contract</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">
              Justification <span className="text-[var(--color-text-muted)] font-normal">(optional)</span>
            </label>
            <textarea value={justification} onChange={(e) => setJustification(e.target.value)} rows={3} className={inputClass} onFocus={focusRing} onBlur={clearRing} placeholder="Why this hire, why now" />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2.5 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-black/10 rounded-lg py-2.5 text-sm font-medium text-[var(--color-text-muted)] hover:bg-black/[0.03] transition-colors duration-150" style={{ transitionTimingFunction: "var(--ease-out)" }}>
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex-[1.4] rounded-lg py-2.5 text-sm font-medium text-white transition-transform duration-150 hover:scale-[1.02] active:scale-95 disabled:opacity-60" style={{ backgroundColor: "var(--color-primary)", transitionTimingFunction: "var(--ease-out)" }}>
              {saving ? "Submitting..." : "Submit requisition"}
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
