"use client";

import { useState } from "react";

// UI-only for now — not wired to a backend. Real version belongs to the
// Employee Engagement line item in the roadmap (anonymous org-level
// sentiment aggregation, never shown per-person to HR).
export default function PulseCheckin() {
  const [picked, setPicked] = useState(null);

  const options = [
    { id: "good", emoji: "🙂", label: "Good" },
    { id: "okay", emoji: "😐", label: "Okay" },
    { id: "rough", emoji: "🙁", label: "Rough" },
  ];

  return (
    <div>
      <p className="text-sm text-[var(--color-text-muted)] mb-4">
        Anonymous — only HR sees the overall trend, never individual answers.
      </p>
      {picked ? (
        <p className="text-sm font-medium text-[var(--color-primary)] animate-[fadeIn_200ms_var(--ease-out)]">
          Thanks for sharing.
        </p>
      ) : (
        <div className="flex gap-2.5">
          {options.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setPicked(opt.id)}
              aria-label={opt.label}
              className="w-11 h-11 rounded-xl border border-black/10 bg-white text-lg flex items-center justify-center transition-transform duration-150 hover:scale-105 active:scale-90"
              style={{ transitionTimingFunction: "var(--ease-out)" }}
            >
              {opt.emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
