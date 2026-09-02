"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

const STATUS_OPTIONS = [
  { id: "present", label: "Present" },
  { id: "late", label: "Late" },
  { id: "half_day", label: "Half day" },
  { id: "absent", label: "Absent" },
];

function formatDateTime(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

// 6.3 — this is the actual investigation view: "employee says they
// clocked in at 8:01am" vs. everything the system actually recorded
// about that clock-in and clock-out, side by side, instead of a bare
// Present checkmark.
export default function AttendanceRecordDrawer({ open, onClose, onSaved, record, profileId }) {
  const supabase = createClient();
  const [status, setStatus] = useState(record?.status ?? "present");
  const [note, setNote] = useState(record?.verification_note ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // This drawer stays mounted the whole time (the parent renders it
  // unconditionally, toggling `open`/`record`) — without this, the
  // useState initializers above only run once on first mount, so
  // clicking from one employee's record to another's would keep
  // showing the first record's status/note. Same fix as the Phase 1
  // drawers.
  useEffect(() => {
    if (!open) return;
    setStatus(record?.status ?? "present");
    setNote(record?.verification_note ?? "");
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, record?.id]);

  async function handleSave(markVerified) {
    setSaving(true);
    setError(null);

    const payload = { status };
    if (markVerified) {
      payload.verified_by = profileId;
      payload.verified_at = new Date().toISOString();
      payload.verification_note = note || null;
    }

    const { error: dbError } = await supabase.from("attendance_records").update(payload).eq("id", record.id);

    setSaving(false);
    if (dbError) { setError(dbError.message); return; }
    onSaved();
    onClose();
  }

  if (!open || !record) return null;

  const inputClass = "w-full border border-black/10 rounded-lg px-3 py-2 text-sm outline-none transition-shadow duration-150";
  const focusRing = (e) => (e.target.style.boxShadow = "0 0 0 2px var(--color-accent)");
  const clearRing = (e) => (e.target.style.boxShadow = "none");

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/35 animate-[fadeIn_200ms_var(--ease-out)]" onClick={onClose} />
      <div className="absolute top-0 right-0 bottom-0 w-full max-w-[420px] bg-white p-7 overflow-y-auto shadow-2xl animate-[slideIn_280ms_var(--ease-out)]">
        <h2 className="font-display text-lg font-semibold text-[var(--color-text-primary)]">
          {record.employees ? `${record.employees.first_name} ${record.employees.last_name}` : "Attendance record"}
        </h2>
        <p className="text-sm text-[var(--color-text-muted)] mt-0.5 mb-6">
          {new Date(record.work_date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
        </p>

        {record.flagged && (
          <div className="mb-5 rounded-lg bg-[#fde8e8] px-4 py-3">
            <p className="text-xs font-semibold text-[#cc3333] uppercase tracking-wide mb-1">Flagged</p>
            <p className="text-sm text-[#8a2323]">{record.flag_reason || "Flagged for review."}</p>
          </div>
        )}

        <div className="space-y-4 mb-6">
          <EvidenceBlock title="Clock-in" time={formatDateTime(record.clock_in)} ip={record.clock_in_ip} device={record.clock_in_device} sessionId={record.clock_in_session_id} location={record.work_location} />
          <EvidenceBlock title="Clock-out" time={formatDateTime(record.clock_out)} ip={record.clock_out_ip} device={record.clock_out_device} sessionId={record.clock_out_session_id} />
        </div>

        {record.verified_at && (
          <p className="text-xs text-[#1a9c5f] mb-5">
            ✓ Reviewed {formatDateTime(record.verified_at)}{record.verification_note ? ` — "${record.verification_note}"` : ""}
          </p>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputClass} onFocus={focusRing} onBlur={clearRing}>
              {STATUS_OPTIONS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">Review note</label>
            <textarea
              value={note} onChange={(e) => setNote(e.target.value)} rows={3}
              placeholder="What you checked, and what you concluded"
              className={inputClass} onFocus={focusRing} onBlur={clearRing}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2.5 pt-1">
            <button
              type="button" onClick={onClose}
              className="flex-1 border border-black/10 rounded-lg py-2.5 text-sm font-medium text-[var(--color-text-muted)] hover:bg-black/[0.03] transition-colors duration-150"
            >
              Cancel
            </button>
            <button
              type="button" onClick={() => handleSave(false)} disabled={saving}
              className="flex-1 border border-black/10 rounded-lg py-2.5 text-sm font-medium text-[var(--color-text-primary)] hover:bg-black/[0.03] transition-colors duration-150 disabled:opacity-60"
            >
              Save status
            </button>
            <button
              type="button" onClick={() => handleSave(true)} disabled={saving}
              className="flex-[1.4] rounded-lg py-2.5 text-sm font-medium text-white transition-transform duration-150 hover:scale-[1.02] active:scale-95 disabled:opacity-60"
              style={{ backgroundColor: "var(--color-primary)" }}
            >
              {saving ? "Saving..." : "Mark reviewed"}
            </button>
          </div>
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

function EvidenceBlock({ title, time, ip, device, sessionId, location }) {
  return (
    <div className="rounded-lg border border-black/[0.06] p-3.5">
      <p className="text-[10.5px] font-semibold tracking-wide uppercase text-[var(--color-accent)] mb-2">{title}</p>
      <p className="text-sm font-medium text-[var(--color-text-primary)] font-mono">{time}</p>
      <div className="mt-2 space-y-1 text-xs text-[var(--color-text-muted)]">
        {location && <p>Location: <span className="text-[var(--color-text-primary)] capitalize">{location}</span></p>}
        <p>IP: <span className="font-mono text-[var(--color-text-primary)]">{ip || "—"}</span></p>
        <p className="truncate">Device: <span className="text-[var(--color-text-primary)]">{device || "—"}</span></p>
        <p>Session: <span className="font-mono text-[var(--color-text-primary)]">{sessionId ? sessionId.slice(0, 8) : "—"}</span></p>
      </div>
    </div>
  );
}
