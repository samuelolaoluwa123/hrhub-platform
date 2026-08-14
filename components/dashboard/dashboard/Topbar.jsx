import SignOutButton from "./SignOutButton";
import NotificationsBell from "./NotificationsBell";

export default function Topbar({ companyName, notifications }) {
  return (
    <header className="hidden md:flex items-center justify-between gap-5 px-8 py-4 border-b border-black/5 bg-white">
      <div className="flex-1 max-w-[340px] flex items-center gap-2 bg-[var(--color-violet-tint)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-muted)]">
        <svg className="w-[15px] h-[15px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.3-4.3" />
        </svg>
        <span className="truncate">Search employees, requests...</span>
        <kbd className="ml-auto font-mono text-[10.5px] bg-white border border-black/[0.08] rounded px-1.5 py-0.5 text-[var(--color-text-muted)]">
          ⌘K
        </kbd>
      </div>

      <div className="flex items-center gap-1.5">
        <NotificationsBell initialNotifications={notifications} />

        <p className="text-[13px] font-semibold text-[var(--color-text-primary)] px-1">
          {companyName}
        </p>

        <SignOutButton />
      </div>
    </header>
  );
}
