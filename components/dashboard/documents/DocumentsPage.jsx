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

const STATUS_CONFIG = {
  uploaded: { label: "Uploaded", bg: "#eef0f4", fg: "#5b5a6a" },
  under_review: { label: "Under review", bg: "#fef3e2", fg: "#d68a1f" },
  verified: { label: "Verified", bg: "#e6f9ee", fg: "#1a9c5f" },
  rejected: { label: "Rejected", bg: "#fdeaea", fg: "#c0392b" },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.uploaded;
  return (
    <span
      className="text-[11px] font-medium px-2.5 py-1 rounded-md whitespace-nowrap"
      style={{ backgroundColor: cfg.bg, color: cfg.fg }}
    >
      {cfg.label}
    </span>
  );
}

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function DocumentsPage({
  canManage,
  isAdmin,
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
  const [updatingId, setUpdatingId] = useState(null);
  const [updateError, setUpdateError] = useState(null);

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

  // RLS backs this up (managers are blocked from updating medical_record
  // rows at all), but the UI shouldn't dangle a button in front of a
  // manager that would just bounce off the database.
  async function handleStatusChange(doc, status) {
    setUpdatingId(doc.id);
    setUpdateError(null);

    const patch = { status };
    if (status === "verified" || status === "rejected") {
      patch.verified_by = profileId;
      patch.verified_at = new Date().toISOString();
    }

    const { error } = await supabase.from("employee_documents").update(patch).eq("id", doc.id);

    setUpdatingId(null);

    if (error) {
      setUpdateError(doc.id);
      return;
    }

    router.refresh();
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
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="text-left text-[10.5px] font-semibold tracking-wide uppercase text-[#9089a0]">
                <th className="py-3.5 px-3.5">Type</th>
                <th className="py-3.5 px-3.5">Uploaded</th>
                <th className="py-3.5 px-3.5">Status</th>
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
                  <td className="py-3.5 px-3.5">
                    <StatusBadge status={doc.status} />
                    {(doc.status === "verified" || doc.status === "rejected") && (
                      <p className="text-[10.5px] text-[var(--color-text-muted)] mt-1">
                        {doc.verifier?.full_name ? `by ${doc.verifier.full_name}` : ""}
                        {doc.verified_at ? ` · ${formatDate(doc.verified_at)}` : ""}
                      </p>
                    )}
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
            <table className="w-full text-sm min-w-[720px]">
              <thead>
                <tr className="text-left text-[10.5px] font-semibold tracking-wide uppercase text-[#9089a0]">
                  <th className="py-3.5 px-3.5">Employee</th>
                  <th className="py-3.5 px-3.5">Type</th>
                  <th className="py-3.5 px-3.5">Uploaded</th>
                  <th className="py-3.5 px-3.5">Status</th>
                  <th className="py-3.5 px-3.5"></th>
                </tr>
              </thead>
              <tbody>
                {allDocuments.map((doc, i) => {
                  // Medical records are hidden from managers at the RLS
                  // layer (HR/admin only) — mirror that here so a manager
                  // never sees review controls they'd just get blocked on.
                  const isMedical = doc.doc_type === "medical_record";
                  const canReview = isAdmin || !isMedical;

                  return (
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
                      <td className="py-3.5 px-3.5">
                        <StatusBadge status={doc.status} />
                        {(doc.status === "verified" || doc.status === "rejected") && (
                          <p className="text-[10.5px] text-[var(--color-text-muted)] mt-1">
                            {doc.verifier?.full_name ? `by ${doc.verifier.full_name}` : ""}
                            {doc.verified_at ? ` · ${formatDate(doc.verified_at)}` : ""}
                          </p>
                        )}
                      </td>
                      <td className="py-3.5 px-3.5">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {canReview ? (
                            <>
                              {doc.status !== "under_review" && (
                                <ReviewButton
                                  label="Review"
                                  onClick={() => handleStatusChange(doc, "under_review")}
                                  loading={updatingId === doc.id}
                                />
                              )}
                              {doc.status !== "verified" && (
                                <ReviewButton
                                  label="Verify"
                                  tone="verified"
                                  onClick={() => handleStatusChange(doc, "verified")}
                                  loading={updatingId === doc.id}
                                />
                              )}
                              {doc.status !== "rejected" && (
                                <ReviewButton
                                  label="Reject"
                                  tone="rejected"
                                  onClick={() => handleStatusChange(doc, "rejected")}
                                  loading={updatingId === doc.id}
                                />
                              )}
                            </>
                          ) : (
                            <span className="text-[10.5px] text-[var(--color-text-muted)]">Admin only</span>
                          )}
                          <DownloadButton
                            onClick={() => handleDownload(doc)}
                            loading={downloadingId === doc.id}
                            error={downloadError === doc.id}
                          />
                        </div>
                        {updateError === doc.id && (
                          <p className="text-[10.5px] text-red-600 text-right mt-1">Couldn't update — try again.</p>
                        )}
                      </td>
                    </tr>
                  );
                })}
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

const REVIEW_TONE = {
  default: "bg-[#eef0f4] text-[#5b5a6a] hover:bg-[#dfe1e8]",
  verified: "bg-[#e6f9ee] text-[#1a9c5f] hover:bg-[#c9f2da]",
  rejected: "bg-[#fdeaea] text-[#c0392b] hover:bg-[#fad4d4]",
};

function ReviewButton({ label, tone = "default", onClick, loading }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`text-xs font-medium px-2.5 py-1.5 rounded-md transition-colors duration-150 disabled:opacity-50 ${REVIEW_TONE[tone]}`}
      style={{ transitionTimingFunction: "var(--ease-out)" }}
    >
      {label}
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
