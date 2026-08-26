"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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

export default function AttendancePage({ canManage, employeeId, companyId, todaysRecord, myHistory, companyToday }) {
  const router = useRouter();
  const supabase = createClient();
  const [record, setRecord] = useState(todaysRecord);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function handleClockIn() {
    setSaving(true);
    setError(null);

    const { data, error: dbError } = await supabase
      .from("attendance_records")
      .insert({ employee_id: employeeId, company_id: companyId, clock_in: new Date().toISOString() })
      .select("id, clock_in, clock_out")
      .single();

    setSaving(false);

    if (dbError) {
      setError(dbError.message);
      return;
    }

    setRecord(data);
    router.refresh();
  }

  async function handleClockOut() {
    setSaving(true);
    setError(null);

    const { data, error: dbError } = await supabase
      .from("attendance_records")
      .update({ clock_out: new Date().toISOString() })
      .eq("id", record.id)
      .select("id, clock_in, clock_out")
      .single();

    setSaving(false);

    if (dbError) {
      setError(dbError.message);
      return;
    }

    setRecord(data);
    router.refresh();
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-7">
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
              <button
                onClick={handleClockIn}
                disabled={saving}
                className="rounded-lg px-5 py-2.5 text-sm font-medium text-white transition-transform duration-150 hover:scale-[1.03] active:scale-95 disabled:opacity-60"
                style={{ backgroundColor: "var(--color-primary)", transitionTimingFunction: "var(--ease-out)" }}
              >
                {saving ? "Clocking in..." : "Clock in"}
              </button>
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
          <table className="w-full text-sm min-w-[520px]">
            <thead>
              <tr className="text-left text-[10.5px] font-semibold tracking-wide uppercase text-[#9089a0]">
                <th className="py-3.5 px-3.5">Date</th>
                <th className="py-3.5 px-3.5">Clock in</th>
                <th className="py-3.5 px-3.5">Clock out</th>
                <th className="py-3.5 px-3.5">Hours</th>
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
                  <td className="py-3.5 px-3.5 font-mono text-xs text-[var(--color-text-muted)]">{formatTime(rec.clock_in)}</td>
                  <td className="py-3.5 px-3.5 font-mono text-xs text-[var(--color-text-muted)]">{formatTime(rec.clock_out)}</td>
                  <td className="py-3.5 px-3.5 text-[var(--color-text-muted)]">{hoursWorked(rec.clock_in, rec.clock_out)}</td>
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
            <table className="w-full text-sm min-w-[520px]">
              <thead>
                <tr className="text-left text-[10.5px] font-semibold tracking-wide uppercase text-[#9089a0]">
                  <th className="py-3.5 px-3.5">Employee</th>
                  <th className="py-3.5 px-3.5">Clock in</th>
                  <th className="py-3.5 px-3.5">Clock out</th>
                  <th className="py-3.5 px-3.5">Status</th>
                </tr>
              </thead>
              <tbody>
                {companyToday.map((rec, i) => (
                  <tr
                    key={rec.id}
                    className="border-t border-black/[0.05] hover:bg-[var(--color-primary)]/[0.03] transition-colors duration-150"
                    style={{ transitionTimingFunction: "var(--ease-out)", animation: `rowIn 400ms var(--ease-out) ${i * 0.05}s both` }}
                  >
                    <td className="py-3.5 px-3.5">
                      {rec.employees ? `${rec.employees.first_name} ${rec.employees.last_name}` : "—"}
                    </td>
                    <td className="py-3.5 px-3.5 font-mono text-xs text-[var(--color-text-muted)]">{formatTime(rec.clock_in)}</td>
                    <td className="py-3.5 px-3.5 font-mono text-xs text-[var(--color-text-muted)]">{formatTime(rec.clock_out)}</td>
                    <td className="py-3.5 px-3.5">
                      <span
                        className={`text-xs font-medium px-2.5 py-1 rounded-md ${
                          rec.clock_out ? "bg-[#f3f2f5] text-[#706f83]" : "bg-[#e8f9f0] text-[#1a9c5f]"
                        }`}
                      >
                        {rec.clock_out ? "Done" : "In progress"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>
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
