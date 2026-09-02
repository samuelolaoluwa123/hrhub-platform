"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AnnouncementDrawer from "./AnnouncementDrawer";

const CATEGORY_LABEL = { general: "General", hr: "HR", event: "Event", urgent: "Urgent", birthday: "🎉 Birthday" };
const CATEGORY_BADGE = {
  general: "bg-[var(--color-violet-tint)] text-[var(--color-primary)]",
  hr: "bg-[#eaf2fd] text-[#2f6fd1]",
  event: "bg-[#e8f9f0] text-[#1a9c5f]",
  urgent: "bg-[#fde8e8] text-[#cc3333]",
  birthday: "bg-[#fef3e2] text-[#d68a1f]",
};

function audienceLabel(a) {
  if (a.audience_type === "company") return null;
  if (a.audience_type === "department") return `Dept: ${a.audience_value}`;
  if (a.audience_type === "team") return `Team: ${a.audience_value}`;
  if (a.audience_type === "individual") return "Just for you";
  return null;
}

function formatDate(value) {
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function AnnouncementsPage({ canManage, announcements, employees, companyId, profileId }) {
  const router = useRouter();
  const supabase = createClient();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  async function handleDelete(id) {
    if (!confirm("Remove this announcement for everyone?")) return;
    setDeletingId(id);
    await supabase.from("announcements").delete().eq("id", id);
    setDeletingId(null);
    router.refresh();
  }

  return (
    <div>
      <div className="flex flex-wrap justify-between items-start gap-3 mb-7">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--color-violet-tint)] flex items-center justify-center shrink-0">
            <svg className="w-[19px] h-[19px] text-[var(--color-primary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 11l18-5v12L3 14v-3z" />
              <path d="M11.6 16.8a2 2 0 1 1-3.2 2.4" />
            </svg>
          </div>
          <div>
            <h1 className="font-display text-2xl font-semibold text-[var(--color-text-primary)]">Announcements</h1>
            <p className="text-[var(--color-text-muted)] text-sm mt-0.5">What's happening across the company.</p>
          </div>
        </div>
        {canManage && (
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-transform duration-150 hover:scale-[1.03] active:scale-95"
            style={{ backgroundColor: "var(--color-primary)", transitionTimingFunction: "var(--ease-out)" }}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New announcement
          </button>
        )}
      </div>

      {announcements.length === 0 ? (
        <div className="rounded-2xl bg-black/[0.02] border border-dashed border-black/[0.08] px-6 py-9 text-center">
          <p className="text-sm text-[var(--color-text-muted)]">
            {canManage ? "Nothing posted yet — share the first update." : "No announcements yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((a, i) => (
            <div
              key={a.id}
              className={`rounded-2xl bg-white border px-5 py-5 ${a.pinned ? "border-[var(--color-primary)]/30" : "border-black/[0.06]"}`}
              style={{ animation: `fadeUp 400ms var(--ease-out) ${i * 0.04}s both` }}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {a.pinned && (
                    <span className="text-[10px] font-semibold text-[var(--color-primary)] uppercase tracking-wide">Pinned</span>
                  )}
                  <span className={`text-[10.5px] font-medium px-2.5 py-1 rounded-full ${CATEGORY_BADGE[a.category]}`}>
                    {CATEGORY_LABEL[a.category] ?? a.category}
                  </span>
                  {audienceLabel(a) && (
                    <span className="text-[10.5px] font-medium px-2.5 py-1 rounded-full bg-[#f3f2f5] text-[#706f83]">
                      {audienceLabel(a)}
                    </span>
                  )}
                </div>
                {canManage && (
                  <button
                    onClick={() => handleDelete(a.id)}
                    disabled={deletingId === a.id}
                    className="text-xs text-[var(--color-text-muted)] hover:text-red-600 transition-colors duration-150 disabled:opacity-50"
                    style={{ transitionTimingFunction: "var(--ease-out)" }}
                  >
                    Remove
                  </button>
                )}
              </div>
              <p className="font-display text-base font-semibold text-[var(--color-text-primary)] mb-1.5">{a.title}</p>
              <p className="text-sm text-[var(--color-text-muted)] whitespace-pre-wrap mb-3">{a.body}</p>
              <div className="flex items-center gap-3 text-[11px] text-[var(--color-text-muted)]">
                <span>{a.profiles?.full_name ?? "HR"}</span>
                <span>&middot;</span>
                <span>{formatDate(a.created_at)}</span>
                {a.event_date && (
                  <>
                    <span>&middot;</span>
                    <span className="font-medium text-[var(--color-primary)]">Event: {formatDate(a.event_date)}</span>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {canManage && (
        <AnnouncementDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          onSaved={() => router.refresh()}
          companyId={companyId}
          profileId={profileId}
          employees={employees}
        />
      )}

      <style jsx global>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
