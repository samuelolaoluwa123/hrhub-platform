"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AddCandidateDrawer from "./AddCandidateDrawer";
import ApplicationDrawer from "./ApplicationDrawer";

const STATUS_BADGE = {
  applied: "bg-[var(--color-violet-tint)] text-[var(--color-primary)]",
  screening: "bg-[#eaf2fd] text-[#2f6fd1]",
  interview: "bg-[#fef3e2] text-[#d68a1f]",
  offer: "bg-[#e8f9f9] text-[#0d9488]",
  hired: "bg-[#e8f9f0] text-[#1a9c5f]",
  rejected: "bg-[#fde8e8] text-[#cc3333]",
  withdrawn: "bg-[#f3f2f5] text-[#706f83]",
};
const STATUS_LABEL = {
  applied: "Applied", screening: "Screening", interview: "Interview",
  offer: "Offer", hired: "Hired", rejected: "Rejected", withdrawn: "Withdrawn",
};
const POSTING_STATUS_LABEL = { open: "Open", closed: "Closed", filled: "Filled" };

function formatDate(value) {
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function PostingDetail({ posting, applications, companyId, profileId }) {
  const router = useRouter();
  const supabase = createClient();
  const [addOpen, setAddOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState(null);
  const [changingStatus, setChangingStatus] = useState(false);

  async function handlePostingStatus(status) {
    setChangingStatus(true);
    await supabase.from("job_postings").update({ status }).eq("id", posting.id);
    setChangingStatus(false);
    router.refresh();
  }

  return (
    <div>
      <button
        onClick={() => router.push("/dashboard/recruitment")}
        className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors duration-150 mb-4 flex items-center gap-1"
        style={{ transitionTimingFunction: "var(--ease-out)" }}
      >
        ← Back to Recruitment
      </button>

      <div className="flex flex-wrap justify-between items-start gap-3 mb-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-[var(--color-text-primary)]">{posting.title}</h1>
          <p className="text-[var(--color-text-muted)] text-sm mt-0.5">
            {posting.department || "No department"} &middot; {posting.location || "Location not set"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={posting.status}
            disabled={changingStatus}
            onChange={(e) => handlePostingStatus(e.target.value)}
            className="text-xs font-medium px-3 py-2 rounded-lg border border-black/10 outline-none disabled:opacity-50"
          >
            {Object.entries(POSTING_STATUS_LABEL).map(([id, label]) => (
              <option key={id} value={id}>{label}</option>
            ))}
          </select>
          <button
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-transform duration-150 hover:scale-[1.03] active:scale-95"
            style={{ backgroundColor: "var(--color-primary)", transitionTimingFunction: "var(--ease-out)" }}
          >
            + Add candidate
          </button>
        </div>
      </div>

      {posting.description && (
        <p className="text-sm text-[var(--color-text-muted)] whitespace-pre-wrap mb-7 max-w-[70ch]">{posting.description}</p>
      )}

      <div className="bg-white border border-black/[0.06] rounded-2xl overflow-hidden">
        {applications.length === 0 ? (
          <p className="text-center py-9 text-sm text-[var(--color-text-muted)]">No candidates yet — add one to start the pipeline.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="text-left text-[10.5px] font-semibold tracking-wide uppercase text-[#9089a0]">
                  <th className="py-3.5 px-3.5">Candidate</th>
                  <th className="py-3.5 px-3.5">Source</th>
                  <th className="py-3.5 px-3.5">Score</th>
                  <th className="py-3.5 px-3.5">Status</th>
                  <th className="py-3.5 px-3.5">Applied</th>
                  <th className="py-3.5 px-3.5"></th>
                </tr>
              </thead>
              <tbody>
                {applications.map((a, i) => (
                  <tr
                    key={a.id}
                    onClick={() => setSelectedApp(a)}
                    className="border-t border-black/[0.05] hover:bg-[var(--color-primary)]/[0.03] transition-colors duration-150 cursor-pointer"
                    style={{ transitionTimingFunction: "var(--ease-out)", animation: `rowIn 400ms var(--ease-out) ${i * 0.04}s both` }}
                  >
                    <td className="py-3.5 px-3.5">
                      <p className="font-medium text-[var(--color-text-primary)]">{a.candidates.first_name} {a.candidates.last_name}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">{a.candidates.email}</p>
                    </td>
                    <td className="py-3.5 px-3.5 text-[var(--color-text-muted)] capitalize">{a.candidates.source.replace("_", " ")}</td>
                    <td className="py-3.5 px-3.5 text-[var(--color-text-muted)]">{a.score ? `${a.score}/5` : "—"}</td>
                    <td className="py-3.5 px-3.5">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-md ${STATUS_BADGE[a.status]}`}>{STATUS_LABEL[a.status]}</span>
                    </td>
                    <td className="py-3.5 px-3.5 font-mono text-xs text-[var(--color-text-muted)]">{formatDate(a.applied_at)}</td>
                    <td className="py-3.5 px-3.5 text-right text-[#9089a0]">→</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AddCandidateDrawer
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSaved={() => router.refresh()}
        companyId={companyId}
        postingId={posting.id}
      />

      {selectedApp && (
        <ApplicationDrawer
          open={Boolean(selectedApp)}
          onClose={() => setSelectedApp(null)}
          onSaved={() => router.refresh()}
          application={selectedApp}
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
