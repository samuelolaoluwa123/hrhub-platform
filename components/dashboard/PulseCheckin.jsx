"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Anonymous by design — only INSERT-own/SELECT-own RLS policies exist on
// pulse_checkins, so no one (not even an admin) can read who picked what.
// Org-level trend aggregation is a separate roadmap item (Employee
// Engagement) and would need its own SECURITY DEFINER aggregate, never
// direct table access.
export default function PulseCheckin({ profileId, companyId, initialMood }) {
  const supabase = createClient();
  const [picked, setPicked] = useState(initialMood);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const options = [
    { id: "good", emoji: "🙂", label: "Good" },
    { id: "okay", emoji: "😐", label: "Okay" },
    { id: "rough", emoji: "🙁", label: "Rough" },
  ];

  async function handlePick(mood) {
    if (saving || picked) return;
    setSaving(true);
    setError(null);

    const { error: dbError } = await supabase.from("pulse_checkins").insert({
      profile_id: profileId,
      company_id: companyId,
      mood,
    });

    setSaving(false);

    if (dbError) {
      // Unique violation just means another tab/request already recorded
      // today's check-in — treat that as success rather than an error.
      if (dbError.code === "23505") {
        setPicked(mood);
        return;
      }
      setError("Couldn't save that — try again.");
      return;
    }

    setPicked(mood);
  }

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
        <>
          <div className="flex gap-2.5">
            {options.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => handlePick(opt.id)}
                disabled={saving}
                aria-label={opt.label}
                className="w-11 h-11 rounded-xl border border-black/10 bg-white text-lg flex items-center justify-center transition-transform duration-150 hover:scale-105 active:scale-90 disabled:opacity-60"
                style={{ transitionTimingFunction: "var(--ease-out)" }}
              >
                {opt.emoji}
              </button>
            ))}
          </div>
          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
        </>
      )}
    </div>
  );
}
