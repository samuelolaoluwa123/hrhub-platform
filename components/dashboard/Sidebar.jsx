"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV_ITEMS = [
  {
    href: "/dashboard/me",
    label: "My Hub",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 12l9-9 9 9M5 10v10h14V10" />
      </svg>
    ),
  },
  {
    href: "/dashboard",
    label: "Overview",
    exact: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    href: "/dashboard/employees",
    label: "Employees",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    href: "/dashboard/leave",
    label: "Leave",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </svg>
    ),
  },
  {
    href: "/dashboard/payroll",
    label: "Payroll",
    icon: <span className="font-display font-semibold text-[15px] leading-none">₦</span>,
  },
  {
    href: "/dashboard/onboarding",
    label: "Onboarding",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
  },
  {
    href: "/dashboard/attendance",
    label: "Attendance",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 3" />
      </svg>
    ),
  },
  {
    href: "/dashboard/documents",
    label: "Documents",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M6 3h9l3 3v15H6zM9 12h6M9 16h6" />
      </svg>
    ),
  },
];

export default function Sidebar({ fullName, role }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const items = NAV_ITEMS.filter((item) => !item.adminOnly || role === "admin");
  const initial = (fullName || "?").charAt(0).toUpperCase();

  return (
    <>
      {/* Mobile top strip with menu toggle */}
      <div className="md:hidden flex items-center justify-between px-5 py-4 border-b border-black/5 bg-white">
        <Image
          src="/hrhub-logo-full-color.png"
          alt="HRhub"
          width={92}
          height={29}
          priority
          className="h-6 w-auto"
        />
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle navigation"
          className="w-9 h-9 flex items-center justify-center rounded-lg border border-black/10 transition-colors duration-150"
          style={{ transitionTimingFunction: "var(--ease-out)" }}
        >
          <span className="sr-only">Menu</span>
          <div className="w-4 space-y-1">
            <span className="block h-0.5 bg-[var(--color-text-primary)]" />
            <span className="block h-0.5 bg-[var(--color-text-primary)]" />
            <span className="block h-0.5 bg-[var(--color-text-primary)]" />
          </div>
        </button>
      </div>

      <div
        className={`
          overflow-hidden transition-[max-height] duration-300
          md:!max-h-none
          ${open ? "max-h-[480px]" : "max-h-0"}
        `}
        style={{ transitionTimingFunction: "var(--ease-out)" }}
      >
        <nav
          className="
            relative bg-[var(--color-hero-bg)]
            w-full md:w-[234px] md:shrink-0
            flex flex-col md:h-screen md:sticky md:top-0 px-3.5 py-6
          "
        >
        {/* Ambient glow, echoes the landing page hero without WebGL cost */}
        <div
          className="absolute -top-20 -left-10 w-56 h-56 rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(130,36,227,0.25), transparent 70%)",
          }}
        />

        <div className="hidden md:block px-2.5 pb-1.5 relative">
          <Image
            src="/hrhub-logo-white.png"
            alt="HRhub"
            width={100}
            height={32}
            className="h-7 w-auto"
          />
        </div>

        <p className="text-[10.5px] font-semibold tracking-wide text-[#6b6180] uppercase px-3 pt-5 pb-2 relative">
          Workspace
        </p>

        <ul className="space-y-0.5 relative">
          {items.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);

            return (
              <li key={item.href} className="relative">
                {isActive && (
                  <span className="absolute -left-3.5 top-2 bottom-2 w-[3px] rounded-full bg-[var(--color-accent)]" />
                )}
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`
                    flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] text-sm font-medium
                    transition-[background-color,color,padding] duration-150
                    ${
                      isActive
                        ? "text-white bg-gradient-to-r from-[rgba(130,36,227,0.32)] to-[rgba(130,36,227,0.06)]"
                        : "text-[#a99fc0] hover:text-white hover:bg-white/[0.06] hover:pl-4"
                    }
                  `}
                  style={{ transitionTimingFunction: "var(--ease-out)" }}
                >
                  <span className="w-[17px] h-[17px] shrink-0 opacity-90 flex items-center justify-center">
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="mt-auto pt-3 border-t border-white/[0.08] relative">
          <div className="flex items-center gap-2.5 rounded-[10px] p-2 -mx-2 mt-3 cursor-pointer transition-colors duration-150 hover:bg-white/[0.06]" style={{ transitionTimingFunction: "var(--ease-out)" }}>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[13px] font-semibold shrink-0"
              style={{ background: "linear-gradient(135deg, var(--color-accent), var(--color-primary))" }}
            >
              {initial}
            </div>
            <div className="min-w-0">
              <p className="text-[13px] text-white font-medium truncate">{fullName}</p>
              <p className="text-[11px] text-[#a99fc0] capitalize">{role}</p>
            </div>
            <svg className="ml-auto w-3.5 h-3.5 text-[#6b6180] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 9l4-4 4 4M8 15l4 4 4-4" />
            </svg>
          </div>
        </div>
        </nav>
      </div>
    </>
  );
}
