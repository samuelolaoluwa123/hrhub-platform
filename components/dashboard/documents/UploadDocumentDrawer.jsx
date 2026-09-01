"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { DOC_TYPES, docTypeLabel } from "./DocumentsPage";

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB

export default function UploadDocumentDrawer({
  open,
  onClose,
  onSaved,
  canManage,
  employees,
  employeeId,
  companyId,
  profileId,
  // Set when opened from a specific onboarding requirement — skips the
  // document-type picker (they already know what they're uploading)
  // instead of making them pick it again from the full, mostly-irrelevant
  // list.
  lockedDocType,
}) {
  const supabase = createClient();
  const [targetEmployeeId, setTargetEmployeeId] = useState(employeeId || employees[0]?.id || "");
  const [docType, setDocType] = useState(lockedDocType || DOC_TYPES[0].id);
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // This drawer stays mounted (DocumentsPage renders it unconditionally,
  // toggling `open`) — reset on every open rather than trusting a
  // one-time useState initializer, same fix as the Phase 1 drawers.
  useEffect(() => {
    if (!open) return;
    setTargetEmployeeId(employeeId || employees[0]?.id || "");
    setDocType(lockedDocType || DOC_TYPES[0].id);
    setFile(null);
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, employeeId, lockedDocType]);

  async function handleSubmit(e) {
    e.preventDefault();

    if (!file) {
      setError("Choose a file to upload.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError("File is too large — 10MB max.");
      return;
    }

    setSaving(true);
    setError(null);

    const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    const path = `${companyId}/${targetEmployeeId}/${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from("employee-documents")
      .upload(path, file);

    if (uploadError) {
      setSaving(false);
      setError(uploadError.message);
      return;
    }

    const { error: dbError } = await supabase.from("employee_documents").insert({
      company_id: companyId,
      employee_id: targetEmployeeId,
      doc_type: docType,
      file_path: path,
      uploaded_by: profileId,
    });

    setSaving(false);

    if (dbError) {
      // Clean up the orphaned file rather than leaving it unreferenced.
      await supabase.storage.from("employee-documents").remove([path]);
      setError(dbError.message);
      return;
    }

    setFile(null);
    setDocType(DOC_TYPES[0].id);
    onSaved();
    onClose();
  }

  if (!open) return null;

  const inputClass =
    "w-full border border-black/10 rounded-lg px-3 py-2 text-sm outline-none transition-shadow duration-150";
  const focusRing = (e) => (e.target.style.boxShadow = "0 0 0 2px var(--color-accent)");
  const clearRing = (e) => (e.target.style.boxShadow = "none");

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/35 animate-[fadeIn_200ms_var(--ease-out)]"
        onClick={onClose}
      />
      <div className="absolute top-0 right-0 bottom-0 w-full max-w-[380px] bg-white p-7 overflow-y-auto shadow-2xl animate-[slideIn_280ms_var(--ease-out)]">
        <h2 className="font-display text-lg font-semibold text-[var(--color-text-primary)]">
          Upload document
        </h2>
        <p className="text-sm text-[var(--color-text-muted)] mt-1 mb-6">
          {canManage ? "Stored privately — only the employee and HR can access it." : "Stored privately — only you and HR can access it."}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {canManage && (
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">
                Employee
              </label>
              <select
                value={targetEmployeeId}
                onChange={(e) => setTargetEmployeeId(e.target.value)}
                required
                className={inputClass}
                onFocus={focusRing}
                onBlur={clearRing}
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.first_name} {emp.last_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">
              Document type
            </label>
            {lockedDocType ? (
              <p className="text-sm text-[var(--color-text-primary)] bg-[var(--color-violet-tint)] rounded-lg px-3 py-2">
                {docTypeLabel(lockedDocType)}
              </p>
            ) : (
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                required
                className={inputClass}
                onFocus={focusRing}
                onBlur={clearRing}
              >
                {DOC_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">
              File
            </label>
            <input
              type="file"
              required
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-[var(--color-text-muted)] file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--color-violet-tint)] file:px-3 file:py-2 file:text-sm file:font-medium file:text-[var(--color-primary)]"
            />
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">10MB max.</p>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-black/10 rounded-lg py-2.5 text-sm font-medium text-[var(--color-text-muted)] hover:bg-black/[0.03] transition-colors duration-150"
              style={{ transitionTimingFunction: "var(--ease-out)" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-[1.4] rounded-lg py-2.5 text-sm font-medium text-white transition-transform duration-150 hover:scale-[1.02] active:scale-95 disabled:opacity-60"
              style={{
                backgroundColor: "var(--color-primary)",
                transitionTimingFunction: "var(--ease-out)",
              }}
            >
              {saving ? "Uploading..." : "Upload"}
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
