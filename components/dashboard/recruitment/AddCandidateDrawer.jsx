"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const SOURCES = [
  { id: "direct", label: "Direct application" },
  { id: "referral", label: "Referral" },
  { id: "job_board", label: "Job board" },
  { id: "other", label: "Other" },
];

export default function AddCandidateDrawer({ open, onClose, onSaved, companyId, postingId }) {
  const supabase = createClient();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [source, setSource] = useState("direct");
  const [resume, setResume] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const { data: candidate, error: candidateError } = await supabase
      .from("candidates")
      .insert({
        company_id: companyId,
        first_name: firstName,
        last_name: lastName,
        email,
        phone: phone || null,
        source,
      })
      .select("id")
      .single();

    if (candidateError) {
      setSaving(false);
      setError(candidateError.message);
      return;
    }

    let resumePath = null;
    if (resume) {
      const safeName = resume.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
      resumePath = `${companyId}/${candidate.id}/${Date.now()}-${safeName}`;
      const { error: uploadError } = await supabase.storage.from("candidate-resumes").upload(resumePath, resume);
      if (uploadError) {
        setSaving(false);
        setError(uploadError.message);
        return;
      }
      await supabase.from("candidates").update({ resume_path: resumePath }).eq("id", candidate.id);
    }

    const { error: appError } = await supabase.from("applications").insert({
      company_id: companyId,
      candidate_id: candidate.id,
      job_posting_id: postingId,
    });

    setSaving(false);

    if (appError) {
      setError(appError.message);
      return;
    }

    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setSource("direct");
    setResume(null);
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
        <h2 className="font-display text-lg font-semibold text-[var(--color-text-primary)]">Add candidate</h2>
        <p className="text-sm text-[var(--color-text-muted)] mt-1 mb-6">Adds them to this posting's pipeline.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">First name</label>
              <input type="text" required value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputClass} onFocus={focusRing} onBlur={clearRing} />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">Last name</label>
              <input type="text" required value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputClass} onFocus={focusRing} onBlur={clearRing} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} onFocus={focusRing} onBlur={clearRing} />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">
              Phone <span className="text-[var(--color-text-muted)] font-normal">(optional)</span>
            </label>
            <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} onFocus={focusRing} onBlur={clearRing} />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">Source</label>
            <select value={source} onChange={(e) => setSource(e.target.value)} className={inputClass} onFocus={focusRing} onBlur={clearRing}>
              {SOURCES.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">
              Resume/CV <span className="text-[var(--color-text-muted)] font-normal">(optional)</span>
            </label>
            <input
              type="file"
              onChange={(e) => setResume(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-[var(--color-text-muted)] file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--color-violet-tint)] file:px-3 file:py-2 file:text-sm file:font-medium file:text-[var(--color-primary)]"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2.5 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-black/10 rounded-lg py-2.5 text-sm font-medium text-[var(--color-text-muted)] hover:bg-black/[0.03] transition-colors duration-150" style={{ transitionTimingFunction: "var(--ease-out)" }}>
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex-[1.4] rounded-lg py-2.5 text-sm font-medium text-white transition-transform duration-150 hover:scale-[1.02] active:scale-95 disabled:opacity-60" style={{ backgroundColor: "var(--color-primary)", transitionTimingFunction: "var(--ease-out)" }}>
              {saving ? "Adding..." : "Add candidate"}
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
