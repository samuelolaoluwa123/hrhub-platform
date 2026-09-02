"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AttendanceRecordDrawer from "./AttendanceRecordDrawer";
import MarkAbsentDrawer from "./MarkAbsentDrawer";
import AttendanceSettingsDrawer from "./AttendanceSettingsDrawer";

const STATUS_BADGE = {
  present: "bg-[#e8f9f0] text-[#1a9c5f]",
  late: "bg-[#fef3e2] text-[#d68a1f]",
  half_day: "bg-[#eaf2fd] text-[#2f6fd1]",
  absent: "bg-[#fde8e8] text-[#cc3333]",
};
const STATUS_LABEL = { present: "Present", late: "Late", half_day: "Half day", absent: "Absent" };

function formatTime(value) {
  if (!value) return "—";
  return new Date(value).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function formatDate(value) {
  return new Date(value).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function hoursWorked(clockIn, clockOut) {
  if (!clockIn || !clockOut) return "—";
  const ms = new Date(clockOut) - new Date(clockIn);
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.round((ms % 3600000) / 60000);
  return `${hours}h ${minutes}m`;
}

// One id per browser tab session, not per clock-in — lets HR see
// whether clock-in and clock-out actually came from the same
// browser session (6.2's "device/session information" signal).
// Session-scoped on purpose: a fresh tab is a fresh session, same as
// re-authenticating would be.
function getSessionId() {
  if (typeof window === "undefined") return null;
  let id = window.sessionStorage.getItem("hrhub_attendance_session");
  if (!id) {
    id = crypto.randomUUID();
    window.sessionStorage.setItem("hrhub_attendance_session", id);
  }
  return id;
}

export default function AttendancePage({
  canManage,
  isAdmin,
  employeeId,
  companyId,
  profileId,
  todaysRecord,
  myHistory,
  companyToday,
  flaggedRecords,
  employees,
  trustedNetworks,
  company,
}) {
  const router = useRouter();
  const [record, setRecord] = useState(todaysRecord);
  const [workLocation, setWorkLocation] = useState("office");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [investigating, setInvestigating] = useState(null);
  const [markAbsentOpen, setMarkAbsentOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  async function handleClockIn() {
    setSaving(true);
    setError(null);

    const res = await fetch("/api/attendance/clock-in", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ work_location: workLocation, session_id: getSessionId() }),
    });
    const data = await res.json().catch(() => ({}));

    setSaving(false);

    if (!res.ok) {
      setError(data?.error ?? "Couldn't clock in.");
      return;
    }

    setRecord(data.record);
    router.refresh();
  }

  async function handleClockOut() {
    setSaving(true);
    setError(null);

    const res = await fetch("/api/attendance/clock-out", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: getSessionId() }),
    });
    const data = await res.json().catch(() => ({}));

    setSaving(false);

    if (!res.ok) {
      setError(data?.error ?? "Couldn't clock out.");
      return;
    }

    setRecord(data.record);
    router.refresh();
  }

  return (
    <div>
      <div className="flex flex-wrap justify-between items-start gap-3 mb-7">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--color-violet-tint)] flex items-center justify-center shrink-0">
            <svg className="w-[19px] h-[19px] text-[var(--color-primary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 3" />
            </svg>
          </div>
          <div>
            <h1 className="font-display text-2xl font-semibold text-[var(--color-text-primary)]">Attendance</h1>
            <p className="text-[var(--color-text-muted)] text-sm mt-0.5">
              {canManage ? "Track your own time and see who's in today." : "Clock in and out, and see your history."}
            </p>
          </div>
        </div>
        {canManage && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMarkAbsentOpen(true)}
              className="text-xs font-medium px-3 py-2 rounded-lg border border-black/10 text-[var(--color-text-primary)] hover:bg-black/[0.03] transition-colors duration-150"
            >
              Mark absent
            </button>
            {isAdmin && (
              <button
                onClick={() => setSettingsOpen(true)}
                className="text-xs font-medium px-3 py-2 rounded-lg border border-black/10 text-[var(--color-text-primary)] hover:bg-black/[0.03] transition-colors duration-150"
              >
                Settings
              </button>
            )}
          </div>
        )}
      </div>

      {employeeId ? (
        <div className="rounded-2xl bg-white border border-black/[0.06] px-6 py-6 md:px-7 md:py-7 mb-7">
          <p className="text-xs font-semibold tracking-wide text-[var(--color-primary)] uppercase mb-3">Today</p>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex gap-8">
              <div>
                <p className="text-[10.5px] font-semibold tracking-wide uppercase text-[#9089a0] mb-1">Clock in</p>
                <p className="font-mono text-lg text-[var(--color-text-primary)]">{formatTime(record?.clock_in)}</p>
              </div>
              <div>
                <p className="text-[10.5px] font-semibold tracking-wide uppercase text-[#9089a0] mb-1">Clock out</p>
                <p className="font-mono text-lg text-[var(--color-text-primary)]">{formatTime(record?.clock_out)}</p>
              </div>
            </div>

            {!record?.clock_in ? (
              <div className="flex items-center gap-2.5">
                <div className="flex rounded-lg border border-black/10 overflow-hidden text-xs font-medium">
                  {["office", "remote"].map((loc) => (
                    <button
                      key={loc}
                      type="button"
                      onClick={() => setWorkLocation(loc)}
                      className={`px-3 py-2 capitalize transition-colors duration-150 ${
                        workLocation === loc ? "text-white" : "text-[var(--color-text-muted)] hover:bg-black/[0.03]"
                      }`}
                      style={workLocation === loc ? { backgroundColor: "var(--color-primary)" } : undefined}
                    >
                      {loc}
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleClockIn}
                  disabled={saving}
                  className="rounded-lg px-5 py-2.5 text-sm font-medium text-white transition-transform duration-150 hover:scale-[1.03] active:scale-95 disabled:opacity-60"
                  style={{ backgroundColor: "var(--color-primary)", transitionTimingFunction: "var(--ease-out)" }}
                >
                  {saving ? "Clocking in..." : "Clock in"}
                </button>
              </div>
            ) : !record?.clock_out ? (
              <button
                onClick={handleClockOut}
                disabled={saving}
                className="rounded-lg px-5 py-2.5 text-sm font-medium text-white transition-transform duration-150 hover:scale-[1.03] active:scale-95 disabled:opacity-60 bg-[#cc3333]"
                style={{ transitionTimingFunction: "var(--ease-out)" }}
              >
                {saving ? "Clocking out..." : "Clock out"}
              </button>
            ) : (
              <span className="text-xs font-medium px-3 py-1.5 rounded-md bg-[#e8f9f0] text-[#1a9c5f]">
                Done for today
              </span>
            )}
          </div>
          {record?.work_location && (
            <p className="text-xs text-[var(--color-text-muted)] mt-3 capitalize">Working {record.work_location} today.</p>
          )}
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        </div>
      ) : (
        <div className="rounded-2xl bg-black/[0.02] border border-dashed border-black/[0.08] px-6 py-6 mb-7">
          <p className="text-sm text-[var(--color-text-muted)]">
            You're not linked to an employee record yet, so you can't clock in.
          </p>
        </div>
      )}

      <Section eyebrow="Your history" title="My attendance">
        {!employeeId ? (
          <EmptyRow text="No history to show." />
        ) : myHistory.length === 0 ? (
          <EmptyRow text="You haven't clocked in yet." />
        ) : (
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="text-left text-[10.5px] font-semibold tracking-wide uppercase text-[#9089a0]">
                <th className="py-3.5 px-3.5">Date</th>
                <th className="py-3.5 px-3.5">Location</th>
                <th className="py-3.5 px-3.5">Clock in</th>
                <th className="py-3.5 px-3.5">Clock out</th>
                <th className="py-3.5 px-3.5">Hours</th>
                <th className="py-3.5 px-3.5">Status</th>
              </tr>
            </thead>
            <tbody>
              {myHistory.map((rec, i) => (
                <tr
                  key={rec.id}
                  className="border-t border-black/[0.05]"
                  style={{ animation: `rowIn 400ms var(--ease-out) ${i * 0.05}s both` }}
                >
                  <td className="py-3.5 px-3.5">{formatDate(rec.work_date)}</td>
                  <td className="py-3.5 px-3.5 text-[var(--color-text-muted)] capitalize">{rec.work_location ?? "—"}</td>
                  <td className="py-3.5 px-3.5 font-mono text-xs text-[var(--color-text-muted)]">{formatTime(rec.clock_in)}</td>
                  <td className="py-3.5 px-3.5 font-mono text-xs text-[var(--color-text-muted)]">{formatTime(rec.clock_out)}</td>
                  <td className="py-3.5 px-3.5 text-[var(--color-text-muted)]">{hoursWorked(rec.clock_in, rec.clock_out)}</td>
                  <td className="py-3.5 px-3.5">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-md ${STATUS_BADGE[rec.status]}`}>{STATUS_LABEL[rec.status]}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      {canManage && (
        <Section eyebrow="Company-wide" title="Today" count={companyToday.length}>
          {companyToday.length === 0 ? (
            <EmptyRow text="No one has clocked in yet today." />
          ) : (
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="text-left text-[10.5px] font-semibold tracking-wide uppercase text-[#9089a0]">
                  <th className="py-3.5 px-3.5">Employee</th>
                  <th className="py-3.5 px-3.5">Location</th>
                  <th className="py-3.5 px-3.5">Clock in</th>
                  <th className="py-3.5 px-3.5">Clock out</th>
                  <th className="py-3.5 px-3.5">Status</th>
                  <th className="py-3.5 px-3.5"></th>
                </tr>
              </thead>
              <tbody>
                {companyToday.map((rec, i) => (
                  <tr
                    key={rec.id}
                    onClick={() => setInvestigating(rec)}
                    className="border-t border-black/[0.05] hover:bg-[var(--color-primary)]/[0.03] transition-colors duration-150 cursor-pointer"
                    style={{ transitionTimingFunction: "var(--ease-out)", animation: `rowIn 400ms var(--ease-out) ${i * 0.05}s both` }}
                  >
                    <td className="py-3.5 px-3.5">
                      {rec.employees ? `${rec.employees.first_name} ${rec.employees.last_name}` : "—"}
                    </td>
                    <td className="py-3.5 px-3.5 text-[var(--color-text-muted)] capitalize">{rec.work_location ?? "—"}</td>
                    <td className="py-3.5 px-3.5 font-mono text-xs text-[var(--color-text-muted)]">{formatTime(rec.clock_in)}</td>
                    <td className="py-3.5 px-3.5 font-mono text-xs text-[var(--color-text-muted)]">{formatTime(rec.clock_out)}</td>
                    <td className="py-3.5 px-3.5">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-md ${STATUS_BADGE[rec.status]}`}>{STATUS_LABEL[rec.status]}</span>
                      {rec.flagged && (
                        <span className="ml-1.5 text-[10.5px] font-medium px-1.5 py-0.5 rounded bg-[#fde8e8] text-[#cc3333]">Flagged</span>
                      )}
                    </td>
                    <td className="py-3.5 px-3.5 text-right text-[#9089a0]">→</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>
      )}

      {canManage && (
        <Section eyebrow="Investigate" title="Flagged records" count={flaggedRecords.length}>
          {flaggedRecords.length === 0 ? (
            <EmptyRow text="Nothing flagged — no unusual clock-ins or clock-outs in the last 50 records." />
          ) : (
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="text-left text-[10.5px] font-semibold tracking-wide uppercase text-[#9089a0]">
                  <th className="py-3.5 px-3.5">Employee</th>
                  <th className="py-3.5 px-3.5">Date</th>
                  <th className="py-3.5 px-3.5">Reason</th>
                  <th className="py-3.5 px-3.5"></th>
                </tr>
              </thead>
              <tbody>
                {flaggedRecords.map((rec, i) => (
                  <tr
                    key={rec.id}
                    onClick={() => setInvestigating(rec)}
                    className="border-t border-black/[0.05] hover:bg-[var(--color-primary)]/[0.03] transition-colors duration-150 cursor-pointer"
                    style={{ transitionTimingFunction: "var(--ease-out)", animation: `rowIn 400ms var(--ease-out) ${i * 0.05}s both` }}
                  >
                    <td className="py-3.5 px-3.5">
                      {rec.employees ? `${rec.employees.first_name} ${rec.employees.last_name}` : "—"}
                    </td>
                    <td className="py-3.5 px-3.5 font-mono text-xs text-[var(--color-text-muted)]">{formatDate(rec.work_date)}</td>
                    <td className="py-3.5 px-3.5 text-[var(--color-text-muted)] truncate max-w-[280px]">{rec.flag_reason}</td>
                    <td className="py-3.5 px-3.5 text-right">
                      {rec.verified_at ? (
                        <span className="text-[10.5px] font-medium text-[#1a9c5f]">Reviewed</span>
                      ) : (
                        <span className="text-[#9089a0]">→</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>
      )}

      <AttendanceRecordDrawer
        open={Boolean(investigating)}
        onClose={() => setInvestigating(null)}
        onSaved={() => router.refresh()}
        record={investigating}
        profileId={profileId}
      />

      {canManage && (
        <MarkAbsentDrawer
          open={markAbsentOpen}
          onClose={() => setMarkAbsentOpen(false)}
          onSaved={() => router.refresh()}
          companyId={companyId}
          employees={employees}
        />
      )}

      {isAdmin && (
        <AttendanceSettingsDrawer
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          onSaved={() => router.refresh()}
          companyId={companyId}
          profileId={profileId}
          company={company}
          trustedNetworks={trustedNetworks}
        />
      )}

      <style jsx global>{`
        @keyframes rowIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

function Section({ eyebrow, title, count, children }) {
  return (
    <div className="mb-7">
      <p className="font-mono text-[10.5px] tracking-wide uppercase text-[var(--color-accent)] mb-1">
        {eyebrow}
      </p>
      <p className="font-display text-base font-semibold text-[var(--color-text-primary)] mb-3 flex items-center gap-2">
        {title}
        {count > 0 && (
          <span className="font-sans text-[11px] font-semibold bg-[#fef3e2] text-[#d68a1f] px-2 py-0.5 rounded-full">
            {count}
          </span>
        )}
      </p>
      <div className="bg-white border border-black/[0.06] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">{children}</div>
      </div>
    </div>
  );
}

function EmptyRow({ text }) {
  return <p className="text-center py-9 text-sm text-[var(--color-text-muted)]">{text}</p>;
}
