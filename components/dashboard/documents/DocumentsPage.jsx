"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import UploadDocumentDrawer from "./UploadDocumentDrawer";

export const DOC_TYPES = [
  { id: "passport_photo", label: "Passport photograph" },
  { id: "id_document", label: "ID document" },
  { id: "medical_record", label: "Medical record" },
  { id: "contract", label: "Employment contract" },
  { id: "certificate", label: "Certificate" },
  { id: "other", label: "Other" },
];

export function docTypeLabel(id) {
  return DOC_TYPES.find((t) => t.id === id)?.label ?? id;
}

function formatDate(value) {
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function DocumentsPage({
  canManage,
  myDocuments,
  allDocuments,
  employees,
  employeeId,
  companyId,
  profileId,
}) {
  const router = useRouter();
  const supabase = createClient();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [downloadError, setDownloadError] = useState(null);

  async function handleDownload(doc) {
    setDownloadingId(doc.id);
    setDownloadError(null);

    const { data, error } = await supabase.storage
      .from("employee-documents")
      .createSignedUrl(doc.file_path, 60);

    setDownloadingId(null);

    if (error || !data?.signedUrl) {
      setDownloadError(doc.id);
      return;
    }

    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  const canUpload = Boolean(employeeId) || canManage;

  return (
    <div>
      <div className="flex flex-wrap justify-between items-start gap-3 mb-7">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--color-violet-tint)] flex items-center justify-center shrink-0">
            <svg className="w-[19px] h-[19px] text-[var(--color-primary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 3h9l3 3v15H6zM9 12h6M9 16h6" />
            </svg>
          </div>
          <div>
            <h1 className="font-display text-2xl font-semibold text-[var(--color-text-primary)]">Documents</h1>
            <p className="text-[var(--color-text-muted)] text-sm mt-0.5">
              {canManage ? "Store and manage HR documents for your team." : "Your personal HR documents."}
            </p>
          </div>
        </div>
        {canUpload && (
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-transform duration-150 hover:scale-[1.03] active:scale-95"
            style={{ backgroundColor: "var(--color-primary)", transitionTimingFunction: "var(--ease-out)" }}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Upload document
          </button>
        )}
      </div>

      <Section eyebrow="Your files" title="My documents">
        {!employeeId ? (
          <EmptyRow text="You're not linked to an employee record yet, so you don't have any documents." />
        ) : myDocuments.length === 0 ? (
          <EmptyRow text="No documents yet." />
        ) : (
          <table className="w-full text-sm min-w-[480px]">
            <thead>
              <tr className="text-left text-[10.5px] font-semibold tracking-wide uppercase text-[#9089a0]">
                <th className="py-3.5 px-3.5">Type</th>
                <th className="py-3.5 px-3.5">Uploaded</th>
                <th className="py-3.5 px-3.5"></th>
              </tr>
            </thead>
            <tbody>
              {myDocuments.map((doc, i) => (
                <tr
                  key={doc.id}
                  className="border-t border-black/[0.05]"
                  style={{ animation: `rowIn 400ms var(--ease-out) ${i * 0.05}s both` }}
                >
                  <td className="py-3.5 px-3.5">{docTypeLabel(doc.doc_type)}</td>
                  <td className="py-3.5 px-3.5 font-mono text-xs text-[var(--color-text-muted)]">
                    {formatDate(doc.created_at)}
                  </td>
                  <td className="py-3.5 px-3.5 text-right">
                    <DownloadButton
                      onClick={() => handleDownload(doc)}
                      loading={downloadingId === doc.id}
                      error={downloadError === doc.id}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      {canManage && (
        <Section eyebrow="Company-wide" title="All employee documents" count={allDocuments.length}>
          {allDocuments.length === 0 ? (
            <EmptyRow text="No documents have been uploaded yet." />
          ) : (
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="text-left text-[10.5px] font-semibold tracking-wide uppercase text-[#9089a0]">
                  <th className="py-3.5 px-3.5">Employee</th>
                  <th className="py-3.5 px-3.5">Type</th>
                  <th className="py-3.5 px-3.5">Uploaded</th>
                  <th className="py-3.5 px-3.5"></th>
                </tr>
              </thead>
              <tbody>
                {allDocuments.map((doc, i) => (
                  <tr
                    key={doc.id}
                    className="border-t border-black/[0.05] hover:bg-[var(--color-primary)]/[0.03] transition-colors duration-150"
                    style={{ transitionTimingFunction: "var(--ease-out)", animation: `rowIn 400ms var(--ease-out) ${i * 0.05}s both` }}
                  >
                    <td className="py-3.5 px-3.5">
                      {doc.employees ? `${doc.employees.first_name} ${doc.employees.last_name}` : "—"}
                    </td>
                    <td className="py-3.5 px-3.5 text-[var(--color-text-muted)]">{docTypeLabel(doc.doc_type)}</td>
                    <td className="py-3.5 px-3.5 font-mono text-xs text-[var(--color-text-muted)]">
                      {formatDate(doc.created_at)}
                    </td>
                    <td className="py-3.5 px-3.5 text-right">
                      <DownloadButton
                        onClick={() => handleDownload(doc)}
                        loading={downloadingId === doc.id}
                        error={downloadError === doc.id}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>
      )}

      {canUpload && (
        <UploadDocumentDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          onSaved={() => router.refresh()}
          canManage={canManage}
          employees={employees}
          employeeId={employeeId}
          companyId={companyId}
          profileId={profileId}
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

function DownloadButton({ onClick, loading, error }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="text-xs font-medium px-3 py-1.5 rounded-md bg-[var(--color-violet-tint)] text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white transition-colors duration-150 disabled:opacity-50"
      style={{ transitionTimingFunction: "var(--ease-out)" }}
    >
      {loading ? "Preparing..." : error ? "Try again" : "Download"}
    </button>
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
