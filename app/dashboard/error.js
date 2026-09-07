"use client";

import { useEffect } from "react";
import Link from "next/link";

// Phase 14 — "Error state: Something went wrong." Before this file
// existed, an unhandled error anywhere under /dashboard fell through
// to Next's generic, unbranded error screen. This is a real React
// Error Boundary Next.js wraps around every route in this segment —
// error.js files must be Client Components (they need the `reset`
// callback and an onClick).
//
// Deliberately never renders `error.message` — that's server/db detail
// (could be an RLS message, a raw Postgres error, a stack fragment) an
// end user has no use for and shouldn't be shown by default. It's
// still logged to the console for whoever's actually debugging.
export default function DashboardError({ error, reset }) {
  useEffect(() => {
    console.error("Dashboard error boundary caught:", error);
  }, [error]);

  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center text-center px-6">
      <div className="w-14 h-14 rounded-2xl bg-[#fdeaea] flex items-center justify-center mb-5">
        <svg className="w-6 h-6 text-[#cc3333]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <path d="M12 9v4M12 17h.01" />
        </svg>
      </div>
      <h2 className="font-display text-xl font-semibold text-[var(--color-text-primary)]">
        Something went wrong
      </h2>
      <p className="text-sm text-[var(--color-text-muted)] mt-1.5 max-w-sm">
        This page ran into a problem loading. It's been logged — try again, or head back to your Overview.
      </p>
      <div className="flex gap-2.5 mt-6">
        <button
          onClick={() => reset()}
          className="rounded-lg px-5 py-2.5 text-sm font-medium text-white transition-transform duration-150 hover:scale-[1.03] active:scale-95"
          style={{ backgroundColor: "var(--color-primary)", transitionTimingFunction: "var(--ease-out)" }}
        >
          Try again
        </button>
        <Link
          href="/dashboard"
          className="rounded-lg px-5 py-2.5 text-sm font-medium border border-black/10 text-[var(--color-text-primary)] hover:bg-black/[0.03] transition-colors duration-150"
          style={{ transitionTimingFunction: "var(--ease-out)" }}
        >
          Go to Overview
        </Link>
      </div>
    </div>
  );
}
