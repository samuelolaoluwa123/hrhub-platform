"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function PostingDrawer({ open, onClose, onSaved, companyId, profileId, requisitions }) {
  const supabase = createClient();
  const [requisitionId, setRequisitionId] = useState(requisitions[0]?.id ?? "");
  const [title, setTitle] = useState(requisitions[0]?.title ?? "");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [requirements, setRequirements] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  function handleRequisitionChange(id) {
    setRequisitionId(id);
    const req = requisitions.find((r) => r.id === id);
    if (req) setTitle(req.title);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const req = requisitions.find((r) => r.id === requisitionId);

    const { error: dbError } = await supabase.from("job_postings").insert({
      company_id: companyId,
      requisition_id: requisitionId || null,
      title,
      department: req?.department ?? null,
      employment_type: req?.employment_type ?? "full_time",
      location: location || null,
      description: description || null,
      requirements: requirements || null,
      created_by: profileId,
    });

    setSaving(false);

    if (dbError) {
      setError(dbError.message);
      return;
    }

    setLocation("");
    setDescription("");
    setRequirements("");
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
      <div className="absolute top-0 right-0 bottom-0 w-full max-w-[420px] bg-white p-7 overflow-y-auto shadow-2xl animate-[slideIn_280ms_var(--ease-out)]">
        <h2 className="font-display text-lg font-semibold text-[var(--color-text-primary)]">New posting</h2>
        <p className="text-sm text-[var(--color-text-muted)] mt-1 mb-6">From an approved requisition.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">Requisition</label>
            <select value={requisitionId} onChange={(e) => handleRequisitionChange(e.target.value)} required className={inputClass} onFocus={focusRing} onBlur={clearRing}>
              {requisitions.map((r) => (
                <option key={r.id} value={r.id}>{r.title} ({r.department || "no department"})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">Posting title</label>
            <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} onFocus={focusRing} onBlur={clearRing} />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">
              Location <span className="text-[var(--color-text-muted)] font-normal">(optional)</span>
            </label>
            <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} className={inputClass} onFocus={focusRing} onBlur={clearRing} placeholder="Remote, Lagos, ..." />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className={inputClass} onFocus={focusRing} onBlur={clearRing} />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">Requirements</label>
            <textarea value={requirements} onChange={(e) => setRequirements(e.target.value)} rows={3} className={inputClass} onFocus={focusRing} onBlur={clearRing} />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2.5 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-black/10 rounded-lg py-2.5 text-sm font-medium text-[var(--color-text-muted)] hover:bg-black/[0.03] transition-colors duration-150" style={{ transitionTimingFunction: "var(--ease-out)" }}>
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex-[1.4] rounded-lg py-2.5 text-sm font-medium text-white transition-transform duration-150 hover:scale-[1.02] active:scale-95 disabled:opacity-60" style={{ backgroundColor: "var(--color-primary)", transitionTimingFunction: "var(--ease-out)" }}>
              {saving ? "Posting..." : "Publish posting"}
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
