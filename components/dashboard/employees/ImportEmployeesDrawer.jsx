"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/dashboard/ToastProvider";
import { assignOnboardingChecklist } from "@/lib/assignOnboardingChecklist";
import { parseCsv } from "@/lib/parseCsv";
import { toCsv, downloadCsv } from "@/lib/csv";

const TEMPLATE_COLUMNS = [
  { key: "First Name", label: "First Name" },
  { key: "Last Name", label: "Last Name" },
  { key: "Email", label: "Email" },
  { key: "Phone", label: "Phone" },
  { key: "Job Title", label: "Job Title" },
  { key: "Department", label: "Department" },
  { key: "Team", label: "Team" },
  { key: "Employment Type", label: "Employment Type" },
  { key: "Start Date", label: "Start Date" },
];

const EMPLOYMENT_TYPES = ["full_time", "part_time", "contract"];

function normalizeEmploymentType(value) {
  const v = (value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  return EMPLOYMENT_TYPES.includes(v) ? v : "full_time";
}

// Same first-active-headcount-non-exit-status fallback EmployeeDrawer's
// manual "Add employee" already uses, so an imported row ends up in
// exactly the same state a hand-typed one would.
function defaultStatus(statuses) {
  const activeStatus = statuses
    .filter((s) => s.is_active_headcount && !s.is_exit)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))[0];
  return activeStatus?.name ?? "Active";
}

export default function ImportEmployeesDrawer({ open, onClose, onSaved, companyId, statuses = [] }) {
  const supabase = createClient();
  const toast = useToast();
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState([]);
  const [parseError, setParseError] = useState(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState(null);

  function reset() {
    setFileName("");
    setRows([]);
    setParseError(null);
    setProgress(0);
    setResults(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    reset();
    setFileName(file.name);

    const text = await file.text();
    const { headers, records } = parseCsv(text);

    if (!headers.includes("First Name") || !headers.includes("Last Name") || !headers.includes("Email")) {
      setParseError('The CSV must include at least "First Name", "Last Name", and "Email" columns — download the template below to see the expected format.');
      return;
    }

    const parsed = records.map((r, i) => {
      const missing = [];
      if (!r["First Name"]) missing.push("First Name");
      if (!r["Last Name"]) missing.push("Last Name");
      if (!r["Email"]) missing.push("Email");
      return {
        rowNumber: i + 2, // +1 for header row, +1 for 1-indexing
        first_name: r["First Name"] || "",
        last_name: r["Last Name"] || "",
        email: r["Email"] || "",
        phone: r["Phone"] || null,
        job_title: r["Job Title"] || null,
        department: r["Department"] || null,
        team: r["Team"] || null,
        employment_type: normalizeEmploymentType(r["Employment Type"]),
        start_date: r["Start Date"] || null,
        missingFields: missing,
      };
    });

    setRows(parsed);
  }

  const validRows = rows.filter((r) => r.missingFields.length === 0);

  async function handleImport() {
    if (importing || validRows.length === 0) return;
    setImporting(true);
    setProgress(0);

    const outcomes = [];
    const status = defaultStatus(statuses);

    for (const row of validRows) {
      const { data: newEmployee, error } = await supabase
        .from("employees")
        .insert({
          company_id: companyId,
          first_name: row.first_name,
          last_name: row.last_name,
          email: row.email,
          phone: row.phone,
          job_title: row.job_title,
          department: row.department,
          team: row.team,
          employment_type: row.employment_type,
          start_date: row.start_date,
          status,
        })
        .select("id")
        .single();

      if (error) {
        outcomes.push({
          rowNumber: row.rowNumber,
          name: `${row.first_name} ${row.last_name}`,
          ok: false,
          message: error.code === "23505" ? "An employee with this email already exists in your company." : error.message,
        });
      } else {
        await assignOnboardingChecklist(newEmployee.id, `${row.first_name} ${row.last_name}`, row.department, companyId, supabase);
        outcomes.push({ rowNumber: row.rowNumber, name: `${row.first_name} ${row.last_name}`, ok: true });
      }
      setProgress((p) => p + 1);
    }

    setImporting(false);
    setResults(outcomes);

    const successCount = outcomes.filter((o) => o.ok).length;
    if (successCount > 0) {
      toast.showSuccess(`Imported ${successCount} employee${successCount === 1 ? "" : "s"}.`);
      onSaved();
    }
  }

  function handleDownloadTemplate() {
    downloadCsv("hrhub-employee-import-template.csv", toCsv([], TEMPLATE_COLUMNS));
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/35 animate-[fadeIn_200ms_var(--ease-out)]" onClick={handleClose} />
      <div className="absolute top-0 right-0 bottom-0 w-full max-w-[520px] bg-white p-7 overflow-y-auto shadow-2xl animate-[slideIn_280ms_var(--ease-out)]">
        <h2 className="font-display text-lg font-semibold text-[var(--color-text-primary)]">Import employees from CSV</h2>
        <p className="text-sm text-[var(--color-text-muted)] mt-1 mb-6">
          Bring in your team from a spreadsheet. Only First Name, Last Name, and Email are required.
        </p>

        <button
          onClick={handleDownloadTemplate}
          className="text-sm font-medium px-4 py-2.5 rounded-lg border border-black/10 text-[var(--color-text-primary)] hover:bg-black/[0.03] transition-colors duration-150 mb-5"
        >
          Download CSV template
        </button>

        {!results && (
          <div className="mb-5">
            <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">CSV file</label>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={handleFile}
              className="w-full text-sm text-[var(--color-text-muted)] file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--color-violet-tint)] file:px-3 file:py-2 file:text-sm file:font-medium file:text-[var(--color-primary)]"
            />
          </div>
        )}

        {parseError && <p className="text-sm text-red-600 mb-4">{parseError}</p>}

        {!results && rows.length > 0 && (
          <>
            <div className="rounded-lg bg-[var(--color-violet-tint)] px-4 py-3 mb-4 text-sm text-[var(--color-text-primary)]">
              {fileName}: {validRows.length} of {rows.length} row{rows.length === 1 ? "" : "s"} ready to import.
              {validRows.length < rows.length && ` ${rows.length - validRows.length} will be skipped — missing required fields.`}
            </div>

            <div className="border border-black/10 rounded-lg overflow-hidden mb-5 max-h-64 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-[var(--color-surface)]">
                  <tr className="text-left text-[10px] font-semibold tracking-wide uppercase text-[#9089a0]">
                    <th className="py-2 px-3">Row</th>
                    <th className="py-2 px-3">Name</th>
                    <th className="py-2 px-3">Email</th>
                    <th className="py-2 px-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.rowNumber} className="border-t border-black/[0.05]">
                      <td className="py-2 px-3 text-[var(--color-text-muted)]">{r.rowNumber}</td>
                      <td className="py-2 px-3 text-[var(--color-text-primary)]">{r.first_name} {r.last_name}</td>
                      <td className="py-2 px-3 text-[var(--color-text-muted)]">{r.email || "—"}</td>
                      <td className="py-2 px-3 text-right">
                        {r.missingFields.length > 0 ? (
                          <span className="text-[10px] font-medium text-red-600">Missing {r.missingFields.join(", ")}</span>
                        ) : (
                          <span className="text-[10px] font-medium text-[#1a9c5f]">Ready</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              onClick={handleImport}
              disabled={importing || validRows.length === 0}
              className="w-full rounded-lg py-2.5 text-sm font-medium text-white transition-transform duration-150 hover:scale-[1.01] active:scale-95 disabled:opacity-60"
              style={{ backgroundColor: "var(--color-primary)" }}
            >
              {importing ? `Importing ${progress}/${validRows.length}...` : `Import ${validRows.length} employee${validRows.length === 1 ? "" : "s"}`}
            </button>
          </>
        )}

        {results && (
          <>
            <div className="rounded-lg bg-[var(--color-violet-tint)] px-4 py-3 mb-4 text-sm text-[var(--color-text-primary)]">
              {results.filter((r) => r.ok).length} of {results.length} imported successfully.
            </div>

            {results.some((r) => !r.ok) && (
              <div className="border border-black/10 rounded-lg overflow-hidden mb-5">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-[10px] font-semibold tracking-wide uppercase text-[#9089a0]">
                      <th className="py-2 px-3">Row</th>
                      <th className="py-2 px-3">Name</th>
                      <th className="py-2 px-3">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.filter((r) => !r.ok).map((r) => (
                      <tr key={r.rowNumber} className="border-t border-black/[0.05]">
                        <td className="py-2 px-3 text-[var(--color-text-muted)]">{r.rowNumber}</td>
                        <td className="py-2 px-3 text-[var(--color-text-primary)]">{r.name}</td>
                        <td className="py-2 px-3 text-red-600">{r.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <button
              onClick={handleClose}
              className="w-full rounded-lg py-2.5 text-sm font-medium text-white transition-transform duration-150 hover:scale-[1.01] active:scale-95"
              style={{ backgroundColor: "var(--color-primary)" }}
            >
              Done
            </button>
          </>
        )}
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
