import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

// Phase 5 — the first thing to live under a proper Settings area.
// Deliberately just a small hub of cards rather than assuming what
// else belongs here — later phases (departments/teams, etc.) add
// their own card rather than this page guessing ahead of them.
export default async function SettingsRoute() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    redirect("/unauthorized");
  }

  const sections = [
    {
      href: "/dashboard/settings/employee-statuses",
      title: "Employee statuses",
      description: "Add, rename, and manage the statuses your company uses — and whether each one blocks portal login.",
      icon: (
        <path d="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      ),
    },
    {
      href: "/dashboard/settings/departments",
      title: "Departments",
      description: "Manage the department list suggested across Employees, recruitment, and announcements.",
      icon: <path d="M3 21h18M5 21V7l8-4v18M13 21V11l6 3v7M9 9v.01M9 12v.01M9 15v.01" />,
    },
    {
      href: "/dashboard/settings/teams",
      title: "Teams",
      description: "A narrower grouping than department — manage the list suggested on Employees.",
      icon: (
        <>
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-7">
        <div className="w-10 h-10 rounded-xl bg-[var(--color-violet-tint)] flex items-center justify-center shrink-0">
          <svg className="w-[19px] h-[19px] text-[var(--color-primary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </div>
        <div>
          <h1 className="font-display text-2xl font-semibold text-[var(--color-text-primary)]">Settings</h1>
          <p className="text-[var(--color-text-muted)] text-sm mt-0.5">Company-wide configuration.</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sections.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="group bg-white border border-black/[0.06] rounded-2xl p-5 transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-1 hover:border-[var(--color-primary)]/40 hover:shadow-[0_8px_24px_rgba(130,36,227,0.1)]"
            style={{ transitionTimingFunction: "var(--ease-out)" }}
          >
            <svg className="w-6 h-6 text-[var(--color-primary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {s.icon}
            </svg>
            <p className="mt-4 text-sm font-semibold text-[var(--color-text-primary)]">{s.title}</p>
            <p className="mt-1 text-xs text-[var(--color-text-muted)] leading-relaxed">{s.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
