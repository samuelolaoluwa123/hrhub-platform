"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

// 6.1's auto-'late' detection and 6.2's "does the network match a
// known office" flagging are both driven from here — this is the
// "configurable... decide what your company actually considers
// acceptable evidence" knob the brief asked for, not a fixed policy
// baked into the code.
export default function AttendanceSettingsDrawer({ open, onClose, onSaved, companyId, company, trustedNetworks, profileId }) {
  const supabase = createClient();
  const [startTime, setStartTime] = useState(company?.standard_start_time?.slice(0, 5) ?? "");
  const [graceMinutes, setGraceMinutes] = useState(company?.late_grace_minutes ?? 15);
  const [savingPolicy, setSavingPolicy] = useState(false);

  const [label, setLabel] = useState("");
  const [ipPrefix, setIpPrefix] = useState("");
  const [addingNetwork, setAddingNetwork] = useState(false);
  const [removingId, setRemovingId] = useState(null);
  const [error, setError] = useState(null);

  // Stays mounted for the life of the page (parent only toggles
  // `open`) — resync from fresh props every time it opens rather than
  // trusting the one-time useState initializers above, same bug class
  // already fixed in this codebase's other drawers.
  useEffect(() => {
    if (!open) return;
    setStartTime(company?.standard_start_time?.slice(0, 5) ?? "");
    setGraceMinutes(company?.late_grace_minutes ?? 15);
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, company]);

  async function handleSavePolicy(e) {
    e.preventDefault();
    setSavingPolicy(true);
    setError(null);

    const { error: dbError } = await supabase
      .from("companies")
      .update({ standard_start_time: startTime || null, late_grace_minutes: Number(graceMinutes) || 0 })
      .eq("id", companyId);

    setSavingPolicy(false);
    if (dbError) { setError(dbError.message); return; }
    onSaved();
  }

  async function handleAddNetwork(e) {
    e.preventDefault();
    if (!label.trim() || !ipPrefix.trim()) return;
    setAddingNetwork(true);
    setError(null);

    const { error: dbError } = await supabase.from("attendance_trusted_networks").insert({
      company_id: companyId,
      label: label.trim(),
      ip_prefix: ipPrefix.trim(),
      created_by: profileId,
    });

    setAddingNetwork(false);
    if (dbError) { setError(dbError.message); return; }
    setLabel("");
    setIpPrefix("");
    onSaved();
  }

  async function handleRemoveNetwork(id) {
    setRemovingId(id);
    await supabase.from("attendance_trusted_networks").delete().eq("id", id);
    setRemovingId(null);
    onSaved();
  }

  if (!open) return null;

  const inputClass = "w-full border border-black/10 rounded-lg px-3 py-2 text-sm outline-none transition-shadow duration-150";
  const focusRing = (e) => (e.target.style.boxShadow = "0 0 0 2px var(--color-accent)");
  const clearRing = (e) => (e.target.style.boxShadow = "none");

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/35 animate-[fadeIn_200ms_var(--ease-out)]" onClick={onClose} />
      <div className="absolute top-0 right-0 bottom-0 w-full max-w-[420px] bg-white p-7 overflow-y-auto shadow-2xl animate-[slideIn_280ms_var(--ease-out)] space-y-7">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-[var(--color-text-primary)]">Attendance settings</h2>
          <button onClick={onClose} className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">Done</button>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="space-y-3">
          <p className="text-xs font-semibold tracking-wide uppercase text-[var(--color-accent)]">Lateness</p>
          <form onSubmit={handleSavePolicy} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">Start time</label>
                <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className={inputClass} onFocus={focusRing} onBlur={clearRing} />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">Grace (min)</label>
                <input type="number" min="0" value={graceMinutes} onChange={(e) => setGraceMinutes(e.target.value)} className={inputClass} onFocus={focusRing} onBlur={clearRing} />
              </div>
            </div>
            <p className="text-[11px] text-[var(--color-text-muted)]">
              {startTime ? "Clocking in past start time + grace is auto-marked Late." : "Not set — nobody is ever auto-marked Late."}
            </p>
            <button type="submit" disabled={savingPolicy} className="text-xs font-medium px-3 py-1.5 rounded-md bg-[var(--color-primary)] text-white disabled:opacity-60">
              {savingPolicy ? "Saving..." : "Save"}
            </button>
          </form>
        </div>

        <div className="space-y-3 border-t border-black/[0.06] pt-6">
          <p className="text-xs font-semibold tracking-wide uppercase text-[var(--color-accent)]">Known office networks</p>
          <p className="text-[11px] text-[var(--color-text-muted)]">
            A clock-in claiming "Office" that doesn't match one of these (or "Remote" that does) gets flagged for review.
          </p>

          {trustedNetworks.length > 0 && (
            <div className="space-y-1.5">
              {trustedNetworks.map((n) => (
                <div key={n.id} className="flex items-center justify-between gap-2 text-sm bg-[var(--color-surface)] rounded-lg px-3 py-2">
                  <span className="text-[var(--color-text-primary)]">{n.label} <span className="font-mono text-[var(--color-text-muted)]">{n.ip_prefix}</span></span>
                  <button
                    onClick={() => handleRemoveNetwork(n.id)}
                    disabled={removingId === n.id}
                    className="text-[10.5px] font-medium text-[#cc3333] hover:underline disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleAddNetwork} className="space-y-2.5">
            <input type="text" placeholder="Label, e.g. Lagos HQ" value={label} onChange={(e) => setLabel(e.target.value)} className={inputClass} onFocus={focusRing} onBlur={clearRing} />
            <input type="text" placeholder="IP prefix, e.g. 102.89.23." value={ipPrefix} onChange={(e) => setIpPrefix(e.target.value)} className={inputClass} onFocus={focusRing} onBlur={clearRing} />
            <button type="submit" disabled={addingNetwork} className="text-xs font-medium px-3 py-1.5 rounded-md bg-[var(--color-violet-tint)] text-[var(--color-primary)] disabled:opacity-60">
              {addingNetwork ? "Adding..." : "+ Add network"}
            </button>
          </form>
        </div>
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
