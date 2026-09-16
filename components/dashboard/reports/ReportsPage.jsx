"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toCsv, downloadCsv } from "@/lib/csv";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}
function daysAgoIso(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}
function naira(n) {
  return Number(n || 0).toLocaleString();
}

export default function ReportsPage({ isAdmin, companyId, employees, payrollRuns, leaveTypes }) {
  const [tab, setTab] = useState("directory");

  const tabs = [
    { id: "directory", label: "Employee Directory" },
    ...(isAdmin ? [{ id: "payroll", label: "Payroll Register" }] : []),
    { id: "leave", label: "Leave" },
    { id: "attendance", label: "Attendance" },
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-7">
        <div className="w-10 h-10 rounded-xl bg-[var(--color-violet-tint)] flex items-center justify-center shrink-0">
          <svg className="w-[19px] h-[19px] text-[var(--color-primary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 17V9M13 17V5M17 17v-4" />
            <rect x="3" y="3" width="18" height="18" rx="2" />
          </svg>
        </div>
        <div>
          <h1 className="font-display text-2xl font-semibold text-[var(--color-text-primary)]">Reports</h1>
          <p className="text-[var(--color-text-muted)] text-sm mt-0.5">Real data, exportable to CSV — nothing here is estimated.</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-6 border-b border-black/[0.06]">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`text-sm font-medium px-4 py-2.5 border-b-2 -mb-px transition-colors duration-150 ${
              tab === t.id
                ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "directory" && <DirectoryReport employees={employees} />}
      {tab === "payroll" && isAdmin && <PayrollReport payrollRuns={payrollRuns} />}
      {tab === "leave" && <LeaveReport leaveTypes={leaveTypes} />}
      {tab === "attendance" && <AttendanceReport />}
    </div>
  );
}

function ReportShell({ eyebrow, title, controls, onExport, exportDisabled, children }) {
  return (
    <div>
      <div className="flex flex-wrap justify-between items-end gap-3 mb-4">
        <div>
          <p className="font-mono text-[10.5px] tracking-wide uppercase text-[var(--color-accent)] mb-1">{eyebrow}</p>
          <p className="font-display text-base font-semibold text-[var(--color-text-primary)]">{title}</p>
        </div>
        <div className="flex items-end gap-2.5 flex-wrap">
          {controls}
          <button
            onClick={onExport}
            disabled={exportDisabled}
            className="text-sm font-medium px-4 py-2.5 rounded-lg text-white disabled:opacity-50 transition-transform duration-150 hover:scale-[1.02] active:scale-95"
            style={{ backgroundColor: "var(--color-primary)" }}
          >
            Download CSV
          </button>
        </div>
      </div>
      <div className="bg-white border border-black/[0.06] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">{children}</div>
      </div>
    </div>
  );
}

function fieldClass() {
  return "border border-black/10 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-accent)]";
}

function EmptyRow({ text }) {
  return <p className="text-center py-9 text-sm text-[var(--color-text-muted)]">{text}</p>;
}

// ---------- Employee Directory ----------

function DirectoryReport({ employees }) {
  const managerName = useMemo(() => {
    const map = new Map();
    for (const e of employees) map.set(e.id, `${e.first_name} ${e.last_name}`);
    return map;
  }, [employees]);

  const rows = employees.map((e) => ({
    name: `${e.first_name} ${e.last_name}`,
    email: e.email,
    job_title: e.job_title || "—",
    department: e.department || "—",
    team: e.team || "—",
    status: e.status,
    start_date: e.start_date || "—",
    manager: e.manager_id ? managerName.get(e.manager_id) ?? "—" : "—",
  }));

  const columns = [
    { key: "name", label: "Name" },
    { key: "email", label: "Email" },
    { key: "job_title", label: "Job title" },
    { key: "department", label: "Department" },
    { key: "team", label: "Team" },
    { key: "status", label: "Status" },
    { key: "start_date", label: "Start date" },
    { key: "manager", label: "Manager" },
  ];

  return (
    <ReportShell
      eyebrow="Headcount"
      title={`${rows.length} employee${rows.length === 1 ? "" : "s"}`}
      onExport={() => downloadCsv(`employee-directory-${todayIso()}.csv`, toCsv(rows, columns))}
      exportDisabled={rows.length === 0}
    >
      {rows.length === 0 ? (
        <EmptyRow text="No employees yet." />
      ) : (
        <table className="w-full text-sm min-w-[760px]">
          <thead>
            <tr className="text-left text-[10.5px] font-semibold tracking-wide uppercase text-[#9089a0]">
              {columns.map((c) => (
                <th key={c.key} className="py-3.5 px-3.5">{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-black/[0.05]">
                {columns.map((c) => (
                  <td key={c.key} className="py-3 px-3.5 text-[var(--color-text-muted)] first:text-[var(--color-text-primary)] first:font-medium">
                    {r[c.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </ReportShell>
  );
}

// ---------- Payroll Register ----------

function PayrollReport({ payrollRuns }) {
  const supabase = createClient();
  const [runId, setRunId] = useState(payrollRuns[0]?.id ?? "");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  async function loadRun(id) {
    if (!id) return;
    setLoading(true);
    setLoaded(false);

    const [{ data: payslips }, { data: repayments }] = await Promise.all([
      supabase
        .from("payslips")
        .select("employee_id, gross_pay, deductions, net_pay, employees(first_name, last_name)")
        .eq("payroll_run_id", id),
      supabase
        .from("loan_repayments")
        .select("employee_id, amount")
        .eq("payroll_run_id", id),
    ]);

    const repaidByEmployee = new Map();
    for (const r of repayments ?? []) {
      repaidByEmployee.set(r.employee_id, (repaidByEmployee.get(r.employee_id) ?? 0) + Number(r.amount));
    }

    setRows(
      (payslips ?? []).map((p) => ({
        name: p.employees ? `${p.employees.first_name} ${p.employees.last_name}` : "—",
        gross_pay: Number(p.gross_pay ?? 0),
        deductions: Number(p.deductions ?? 0),
        loan_repayment: repaidByEmployee.get(p.employee_id) ?? 0,
        net_pay: Number(p.net_pay ?? 0),
      }))
    );
    setLoading(false);
    setLoaded(true);
  }

  const selectedRun = payrollRuns.find((r) => r.id === runId);
  const runLabel = selectedRun ? `${MONTHS[selectedRun.period_month - 1] ?? ""} ${selectedRun.period_year}` : "";

  const columns = [
    { key: "name", label: "Employee" },
    { key: "gross_pay", label: "Gross pay" },
    { key: "deductions", label: "Deductions" },
    { key: "loan_repayment", label: "Loan repayment" },
    { key: "net_pay", label: "Net pay" },
  ];

  return (
    <ReportShell
      eyebrow="Payroll"
      title={loaded ? `${runLabel} — ${rows.length} payslip${rows.length === 1 ? "" : "s"}` : "Pick a payroll run"}
      controls={
        <>
          <select value={runId} onChange={(e) => setRunId(e.target.value)} className={fieldClass()}>
            <option value="" disabled>Select a run...</option>
            {payrollRuns.map((r) => (
              <option key={r.id} value={r.id}>
                {MONTHS[r.period_month - 1] ?? r.period_month} {r.period_year} · {r.status}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => loadRun(runId)}
            disabled={!runId || loading}
            className="text-sm font-medium px-4 py-2.5 rounded-lg border border-black/10 text-[var(--color-text-primary)] hover:bg-black/[0.03] disabled:opacity-50"
          >
            {loading ? "Loading..." : "Load"}
          </button>
        </>
      }
      onExport={() => downloadCsv(`payroll-register-${runLabel.replace(/\s+/g, "-").toLowerCase() || "run"}.csv`, toCsv(rows, columns))}
      exportDisabled={rows.length === 0}
    >
      {payrollRuns.length === 0 ? (
        <EmptyRow text="No payroll runs yet." />
      ) : !loaded ? (
        <EmptyRow text="Choose a run above and click Load." />
      ) : rows.length === 0 ? (
        <EmptyRow text="No payslips in this run." />
      ) : (
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="text-left text-[10.5px] font-semibold tracking-wide uppercase text-[#9089a0]">
              {columns.map((c) => (
                <th key={c.key} className="py-3.5 px-3.5">{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-black/[0.05]">
                <td className="py-3 px-3.5 font-medium text-[var(--color-text-primary)]">{r.name}</td>
                <td className="py-3 px-3.5 text-[var(--color-text-muted)] font-mono">₦{naira(r.gross_pay)}</td>
                <td className="py-3 px-3.5 text-[var(--color-text-muted)] font-mono">₦{naira(r.deductions)}</td>
                <td className="py-3 px-3.5 text-[var(--color-text-muted)] font-mono">₦{naira(r.loan_repayment)}</td>
                <td className="py-3 px-3.5 font-medium text-[var(--color-text-primary)] font-mono">₦{naira(r.net_pay)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </ReportShell>
  );
}

// ---------- Leave Report ----------

function LeaveReport({ leaveTypes }) {
  const supabase = createClient();
  const [year, setYear] = useState(new Date().getFullYear());
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  async function loadYear() {
    setLoading(true);
    setLoaded(false);

    const { data } = await supabase
      .from("leave_balances")
      .select("employee_id, days_allocated, days_used, employees(first_name, last_name), leave_types(name)")
      .eq("year", year)
      .order("first_name", { referencedTable: "employees" });

    setRows(
      (data ?? []).map((b) => ({
        name: b.employees ? `${b.employees.first_name} ${b.employees.last_name}` : "—",
        leave_type: b.leave_types?.name ?? "—",
        allocated: Number(b.days_allocated ?? 0),
        used: Number(b.days_used ?? 0),
        remaining: Number(b.days_allocated ?? 0) - Number(b.days_used ?? 0),
      }))
    );
    setLoading(false);
    setLoaded(true);
  }

  const columns = [
    { key: "name", label: "Employee" },
    { key: "leave_type", label: "Leave type" },
    { key: "allocated", label: "Allocated" },
    { key: "used", label: "Used" },
    { key: "remaining", label: "Remaining" },
  ];

  return (
    <ReportShell
      eyebrow="Leave"
      title={loaded ? `${year} — ${rows.length} balance${rows.length === 1 ? "" : "s"}` : "Pick a year"}
      controls={
        <>
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className={`${fieldClass()} w-24`}
          />
          <button
            type="button"
            onClick={loadYear}
            disabled={loading}
            className="text-sm font-medium px-4 py-2.5 rounded-lg border border-black/10 text-[var(--color-text-primary)] hover:bg-black/[0.03] disabled:opacity-50"
          >
            {loading ? "Loading..." : "Load"}
          </button>
        </>
      }
      onExport={() => downloadCsv(`leave-report-${year}.csv`, toCsv(rows, columns))}
      exportDisabled={rows.length === 0}
    >
      {!loaded ? (
        <EmptyRow text={leaveTypes.length === 0 ? "No leave types set up yet." : "Choose a year above and click Load."} />
      ) : rows.length === 0 ? (
        <EmptyRow text="No leave balances allocated for this year." />
      ) : (
        <table className="w-full text-sm min-w-[560px]">
          <thead>
            <tr className="text-left text-[10.5px] font-semibold tracking-wide uppercase text-[#9089a0]">
              {columns.map((c) => (
                <th key={c.key} className="py-3.5 px-3.5">{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-black/[0.05]">
                <td className="py-3 px-3.5 font-medium text-[var(--color-text-primary)]">{r.name}</td>
                <td className="py-3 px-3.5 text-[var(--color-text-muted)]">{r.leave_type}</td>
                <td className="py-3 px-3.5 text-[var(--color-text-muted)]">{r.allocated}</td>
                <td className="py-3 px-3.5 text-[var(--color-text-muted)]">{r.used}</td>
                <td className="py-3 px-3.5 font-medium text-[var(--color-text-primary)]">{r.remaining}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </ReportShell>
  );
}

// ---------- Attendance Summary ----------

function AttendanceReport() {
  const supabase = createClient();
  const [startDate, setStartDate] = useState(daysAgoIso(30));
  const [endDate, setEndDate] = useState(todayIso());
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  async function loadRange() {
    setLoading(true);
    setLoaded(false);

    const { data } = await supabase
      .from("attendance_records")
      .select("employee_id, status, flagged, employees(first_name, last_name)")
      .gte("work_date", startDate)
      .lte("work_date", endDate);

    const byEmployee = new Map();
    for (const r of data ?? []) {
      const key = r.employee_id;
      if (!byEmployee.has(key)) {
        byEmployee.set(key, {
          name: r.employees ? `${r.employees.first_name} ${r.employees.last_name}` : "—",
          present: 0,
          late: 0,
          absent: 0,
          flagged: 0,
          total: 0,
        });
      }
      const entry = byEmployee.get(key);
      entry.total += 1;
      if (r.status === "present") entry.present += 1;
      else if (r.status === "late") entry.late += 1;
      else if (r.status === "absent") entry.absent += 1;
      if (r.flagged) entry.flagged += 1;
    }

    setRows(Array.from(byEmployee.values()).sort((a, b) => a.name.localeCompare(b.name)));
    setLoading(false);
    setLoaded(true);
  }

  const columns = [
    { key: "name", label: "Employee" },
    { key: "present", label: "Present" },
    { key: "late", label: "Late" },
    { key: "absent", label: "Absent" },
    { key: "flagged", label: "Flagged" },
    { key: "total", label: "Total records" },
  ];

  return (
    <ReportShell
      eyebrow="Attendance"
      title={loaded ? `${startDate} to ${endDate} — ${rows.length} employee${rows.length === 1 ? "" : "s"}` : "Pick a date range"}
      controls={
        <>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={fieldClass()} />
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={fieldClass()} />
          <button
            type="button"
            onClick={loadRange}
            disabled={loading}
            className="text-sm font-medium px-4 py-2.5 rounded-lg border border-black/10 text-[var(--color-text-primary)] hover:bg-black/[0.03] disabled:opacity-50"
          >
            {loading ? "Loading..." : "Load"}
          </button>
        </>
      }
      onExport={() => downloadCsv(`attendance-summary-${startDate}-to-${endDate}.csv`, toCsv(rows, columns))}
      exportDisabled={rows.length === 0}
    >
      {!loaded ? (
        <EmptyRow text="Choose a date range above and click Load." />
      ) : rows.length === 0 ? (
        <EmptyRow text="No attendance records in this range." />
      ) : (
        <table className="w-full text-sm min-w-[560px]">
          <thead>
            <tr className="text-left text-[10.5px] font-semibold tracking-wide uppercase text-[#9089a0]">
              {columns.map((c) => (
                <th key={c.key} className="py-3.5 px-3.5">{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-black/[0.05]">
                <td className="py-3 px-3.5 font-medium text-[var(--color-text-primary)]">{r.name}</td>
                <td className="py-3 px-3.5 text-[var(--color-text-muted)]">{r.present}</td>
                <td className="py-3 px-3.5 text-[var(--color-text-muted)]">{r.late}</td>
                <td className="py-3 px-3.5 text-[var(--color-text-muted)]">{r.absent}</td>
                <td className="py-3 px-3.5 text-[var(--color-text-muted)]">{r.flagged}</td>
                <td className="py-3 px-3.5 text-[var(--color-text-muted)]">{r.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </ReportShell>
  );
}
