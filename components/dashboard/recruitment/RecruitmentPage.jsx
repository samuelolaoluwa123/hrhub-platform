"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import RequisitionDrawer from "./RequisitionDrawer";
import PostingDrawer from "./PostingDrawer";

const REQ_STATUS_BADGE = {
  pending_approval: "bg-[#fef3e2] text-[#d68a1f]",
  approved: "bg-[#e8f9f0] text-[#1a9c5f]",
  rejected: "bg-[#fde8e8] text-[#cc3333]",
  filled: "bg-[#f3f2f5] text-[#706f83]",
  cancelled: "bg-[#f3f2f5] text-[#706f83]",
};
const REQ_STATUS_LABEL = {
  pending_approval: "Pending approval",
  approved: "Approved",
  rejected: "Rejected",
  filled: "Filled",
  cancelled: "Cancelled",
};
const POSTING_STATUS_BADGE = {
  open: "bg-[#e8f9f0] text-[#1a9c5f]",
  closed: "bg-[#f3f2f5] text-[#706f83]",
  filled: "bg-[var(--color-violet-tint)] text-[var(--color-primary)]",
};
const POSTING_STATUS_LABEL = { open: "Open", closed: "Closed", filled: "Filled" };

function formatDate(value) {
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function RecruitmentPage({ role, requisitions, postings, companyId, profileId }) {
  const router = useRouter();
  const supabase = createClient();
  const isAdmin = role === "admin";
  const approvedRequisitions = requisitions.filter((r) => r.status === "approved");

  const [reqDrawerOpen, setReqDrawerOpen] = useState(false);
  const [postingDrawerOpen, setPostingDrawerOpen] = useState(false);
  const [actingOn, setActingOn] = useState(null);

  async function handleReviewRequisition(id, status) {
    setActingOn(id);
    await supabase
      .from("job_requisitions")
      .update({ status, reviewed_by: profileId, reviewed_at: new Date().toISOString() })
      .eq("id", id);
    setActingOn(null);
    router.refresh();
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-7">
        <div className="w-10 h-10 rounded-xl bg-[var(--color-violet-tint)] flex items-center justify-center shrink-0">
          <svg className="w-[19px] h-[19px] text-[var(--color-primary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M19 8v6M22 11h-6" />
          </svg>
        </div>
        <div>
          <h1 className="font-display text-2xl font-semibold text-[var(--color-text-primary)]">Recruitment</h1>
          <p className="text-[var(--color-text-muted)] text-sm mt-0.5">Requisitions, postings, and who's applied.</p>
        </div>
      </div>

      <Section
        eyebrow="Requests to hire"
        title="Job requisitions"
        action={
          <button onClick={() => setReqDrawerOpen(true)} className="text-xs font-medium px-3 py-1.5 rounded-md bg-[var(--color-primary)] text-white hover:scale-[1.03] transition-transform duration-150" style={{ transitionTimingFunction: "var(--ease-out)" }}>
            + New requisition
          </button>
        }
      >
        {requisitions.length === 0 ? (
          <EmptyRow text="No requisitions yet." />
        ) : (
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="text-left text-[10.5px] font-semibold tracking-wide uppercase text-[#9089a0]">
                <th className="py-3.5 px-3.5">Role</th>
                <th className="py-3.5 px-3.5">Department</th>
                <th className="py-3.5 px-3.5">Headcount</th>
                <th className="py-3.5 px-3.5">Status</th>
                {isAdmin && <th className="py-3.5 px-3.5"></th>}
              </tr>
            </thead>
            <tbody>
              {requisitions.map((r) => (
                <tr key={r.id} className="border-t border-black/[0.05]">
                  <td className="py-3.5 px-3.5 font-medium text-[var(--color-text-primary)]">{r.title}</td>
                  <td className="py-3.5 px-3.5 text-[var(--color-text-muted)]">{r.department || "—"}</td>
                  <td className="py-3.5 px-3.5 text-[var(--color-text-muted)]">{r.headcount}</td>
                  <td className="py-3.5 px-3.5">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-md ${REQ_STATUS_BADGE[r.status]}`}>{REQ_STATUS_LABEL[r.status]}</span>
                  </td>
                  {isAdmin && (
                    <td className="py-3.5 px-3.5 text-right">
                      {r.status === "pending_approval" && (
                        <div className="flex gap-1.5 justify-end">
                          <button
                            disabled={actingOn === r.id}
                            onClick={() => handleReviewRequisition(r.id, "approved")}
                            className="text-xs font-medium px-3 py-1.5 rounded-md bg-[#e8f9f0] text-[#1a9c5f] hover:bg-[#1a9c5f] hover:text-white transition-colors duration-150 disabled:opacity-50"
                            style={{ transitionTimingFunction: "var(--ease-out)" }}
                          >
                            Approve
                          </button>
                          <button
                            disabled={actingOn === r.id}
                            onClick={() => handleReviewRequisition(r.id, "rejected")}
                            className="text-xs font-medium px-3 py-1.5 rounded-md bg-[#fde8e8] text-[#cc3333] hover:bg-[#cc3333] hover:text-white transition-colors duration-150 disabled:opacity-50"
                            style={{ transitionTimingFunction: "var(--ease-out)" }}
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <Section
        eyebrow="Live"
        title="Job postings"
        action={
          approvedRequisitions.length > 0 && (
            <button onClick={() => setPostingDrawerOpen(true)} className="text-xs font-medium px-3 py-1.5 rounded-md bg-[var(--color-primary)] text-white hover:scale-[1.03] transition-transform duration-150" style={{ transitionTimingFunction: "var(--ease-out)" }}>
              + New posting
            </button>
          )
        }
      >
        {postings.length === 0 ? (
          <EmptyRow text={approvedRequisitions.length === 0 ? "Approve a requisition first to post a role." : "No postings yet."} />
        ) : (
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="text-left text-[10.5px] font-semibold tracking-wide uppercase text-[#9089a0]">
                <th className="py-3.5 px-3.5">Role</th>
                <th className="py-3.5 px-3.5">Department</th>
                <th className="py-3.5 px-3.5">Applicants</th>
                <th className="py-3.5 px-3.5">Status</th>
                <th className="py-3.5 px-3.5">Posted</th>
                <th className="py-3.5 px-3.5"></th>
              </tr>
            </thead>
            <tbody>
              {postings.map((p, i) => (
                <tr
                  key={p.id}
                  onClick={() => router.push(`/dashboard/recruitment/${p.id}`)}
                  className="border-t border-black/[0.05] hover:bg-[var(--color-primary)]/[0.03] transition-colors duration-150 cursor-pointer"
                  style={{ transitionTimingFunction: "var(--ease-out)", animation: `rowIn 400ms var(--ease-out) ${i * 0.04}s both` }}
                >
                  <td className="py-3.5 px-3.5 font-medium text-[var(--color-text-primary)]">{p.title}</td>
                  <td className="py-3.5 px-3.5 text-[var(--color-text-muted)]">{p.department || "—"}</td>
                  <td className="py-3.5 px-3.5 text-[var(--color-text-muted)]">{p.applications?.length ?? 0}</td>
                  <td className="py-3.5 px-3.5">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-md ${POSTING_STATUS_BADGE[p.status]}`}>{POSTING_STATUS_LABEL[p.status]}</span>
                  </td>
                  <td className="py-3.5 px-3.5 font-mono text-xs text-[var(--color-text-muted)]">{formatDate(p.created_at)}</td>
                  <td className="py-3.5 px-3.5 text-right text-[#9089a0]">→</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <RequisitionDrawer
        open={reqDrawerOpen}
        onClose={() => setReqDrawerOpen(false)}
        onSaved={() => router.refresh()}
        companyId={companyId}
        profileId={profileId}
      />

      <PostingDrawer
        open={postingDrawerOpen}
        onClose={() => setPostingDrawerOpen(false)}
        onSaved={() => router.refresh()}
        companyId={companyId}
        profileId={profileId}
        requisitions={approvedRequisitions}
      />

      <style jsx global>{`
        @keyframes rowIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

function Section({ eyebrow, title, action, children }) {
  return (
    <div className="mb-7">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="font-mono text-[10.5px] tracking-wide uppercase text-[var(--color-accent)] mb-1">{eyebrow}</p>
          <p className="font-display text-base font-semibold text-[var(--color-text-primary)]">{title}</p>
        </div>
        {action}
      </div>
      <div className="bg-white border border-black/[0.06] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">{children}</div>
      </div>
    </div>
  );
}

function EmptyRow({ text }) {
  return <p className="text-center py-9 text-sm text-[var(--color-text-muted)]">{text}</p>;
}
