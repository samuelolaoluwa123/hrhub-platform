"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// 8.2 — a real notification center distinguishes what kind of thing
// each entry is, not just a flat list of sentences.
const TYPE_ICON = {
  announcement: "📣",
  interview: "🗓️",
  leave: "🌴",
  onboarding: "✅",
  birthday: "🎉",
  kpi: "📊",
  payroll: "₦",
  general: "🔔",
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function NotificationsBell({ initialNotifications }) {
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState(initialNotifications);
  const wrapperRef = useRef(null);

  // initialNotifications is refetched by the layout on every
  // router.refresh() (e.g. after approving leave elsewhere) — sync it
  // in, since useState's initial value is otherwise only used once.
  useEffect(() => {
    setNotifications(initialNotifications);
  }, [initialNotifications]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function markAllRead() {
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length === 0) return;

    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await supabase.from("notifications").update({ is_read: true }).in("id", unreadIds);
    router.refresh();
  }

  async function handleClickNotification(n) {
    if (!n.is_read) {
      setNotifications((prev) =>
        prev.map((item) => (item.id === n.id ? { ...item, is_read: true } : item))
      );
      await supabase.from("notifications").update({ is_read: true }).eq("id", n.id);
      router.refresh();
    }
    setOpen(false);
  }

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        aria-label="Notifications"
        onClick={() => setOpen((v) => !v)}
        className="relative w-[34px] h-[34px] rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-black/[0.05] transition-colors duration-150"
        style={{ transitionTimingFunction: "var(--ease-out)" }}
      >
        <svg className="w-[17px] h-[17px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-[6px] right-[6px] w-[6px] h-[6px] rounded-full bg-[var(--color-accent)] border-[1.5px] border-white" />
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-[42px] w-[320px] bg-white border border-black/[0.08] rounded-xl shadow-xl overflow-hidden z-50 animate-[fadeUp_180ms_var(--ease-out)]"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-black/[0.06]">
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">Notifications</p>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs font-medium text-[var(--color-primary)] hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[340px] overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="text-center text-sm text-[var(--color-text-muted)] py-8 px-4">
                No notifications yet.
              </p>
            ) : (
              notifications.map((n) => (
                <Link
                  key={n.id}
                  href={n.link || "#"}
                  onClick={() => handleClickNotification(n)}
                  className="flex items-start gap-2.5 px-4 py-3 border-b border-black/[0.04] last:border-b-0 hover:bg-black/[0.02] transition-colors duration-150"
                  style={{ transitionTimingFunction: "var(--ease-out)" }}
                >
                  {!n.is_read && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] mt-1.5 shrink-0" />
                  )}
                  <span className="text-sm shrink-0" aria-hidden="true">{TYPE_ICON[n.type] ?? TYPE_ICON.general}</span>
                  <div className={n.is_read ? "pl-4" : ""}>
                    <p className="text-sm text-[var(--color-text-primary)]">{n.message}</p>
                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{timeAgo(n.created_at)}</p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
