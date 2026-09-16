import Link from "next/link";

export default function SetupChecklist({ steps, companyName }) {
  const doneCount = steps.filter((s) => s.done).length;
  const allDone = doneCount === steps.length;

  return (
    <div>
      <div className="flex items-center gap-3 mb-7">
        <div className="w-10 h-10 rounded-xl bg-[var(--color-violet-tint)] flex items-center justify-center shrink-0">
          <svg className="w-[19px] h-[19px] text-[var(--color-primary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
        </div>
        <div>
          <h1 className="font-display text-2xl font-semibold text-[var(--color-text-primary)]">
            {allDone ? "You're all set up" : `Set up ${companyName || "your company"}`}
          </h1>
          <p className="text-[var(--color-text-muted)] text-sm mt-0.5">
            {allDone
              ? "Every essential step is done — you can always revisit these settings anytime."
              : "A few real steps to get HRhub genuinely ready to use — each one checks itself off automatically."}
          </p>
        </div>
      </div>

      <div className="bg-white border border-black/[0.06] rounded-2xl overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-black/[0.05] flex items-center gap-3">
          <div className="flex-1 h-1.5 bg-[var(--color-violet-tint)] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${(doneCount / steps.length) * 100}%`, backgroundColor: allDone ? "#1a9c5f" : "var(--color-primary)" }}
            />
          </div>
          <span className="text-xs font-mono text-[var(--color-text-muted)]">{doneCount}/{steps.length}</span>
        </div>

        <ul>
          {steps.map((step, i) => (
            <li key={step.id} className={`border-t border-black/[0.05] first:border-t-0 px-5 py-4 ${step.done ? "opacity-60" : ""}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[11px] font-semibold ${
                      step.done ? "bg-[#e8f9f0] text-[#1a9c5f]" : "bg-[var(--color-violet-tint)] text-[var(--color-primary)]"
                    }`}
                  >
                    {step.done ? "✓" : i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">{step.label}</p>
                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{step.description}</p>
                  </div>
                </div>
                {!step.done && (
                  <Link
                    href={step.href}
                    className="shrink-0 text-xs font-medium px-3 py-1.5 rounded-md bg-[var(--color-violet-tint)] text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white transition-colors duration-150"
                    style={{ transitionTimingFunction: "var(--ease-out)" }}
                  >
                    {step.cta} →
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      <Link
        href="/dashboard"
        className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors duration-150 inline-flex items-center gap-1"
        style={{ transitionTimingFunction: "var(--ease-out)" }}
      >
        ← Back to Overview
      </Link>
    </div>
  );
}
