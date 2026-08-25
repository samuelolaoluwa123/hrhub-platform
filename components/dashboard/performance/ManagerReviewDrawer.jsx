"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ManagerReviewDrawer({ open, onClose, onSaved, cycleId, employee, review, companyId }) {
  const supabase = createClient();
  const [feedback, setFeedback] = useState(review?.manager_feedback ?? "");
  const [rating, setRating] = useState(review?.rating ?? 3);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      manager_feedback: feedback,
      rating: Number(rating),
      manager_review_submitted_at: new Date().toISOString(),
      status: "completed",
    };

    const { error: dbError } = review
      ? await supabase.from("performance_reviews").update(payload).eq("id", review.id)
      : await supabase.from("performance_reviews").insert({
          company_id: companyId,
          cycle_id: cycleId,
          employee_id: employee.id,
          ...payload,
        });

    setSaving(false);

    if (dbError) {
      setError(dbError.message);
      return;
    }

    onSaved();
    onClose();
  }

  if (!open) return null;

  const inputClass =
    "w-full border border-black/10 rounded-lg px-3 py-2 text-sm outline-none transition-shadow duration-150";
  const focusRing = (e) => (e.target.style.boxShadow = "0 0 0 2px var(--color-accent)");
  const clearRing = (e) => (e.target.style.boxShadow = "none");

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/35 animate-[fadeIn_200ms_var(--ease-out)]" onClick={onClose} />
      <div className="absolute top-0 right-0 bottom-0 w-full max-w-[420px] bg-white p-7 overflow-y-auto shadow-2xl animate-[slideIn_280ms_var(--ease-out)]">
        <h2 className="font-display text-lg font-semibold text-[var(--color-text-primary)]">
          Review {employee.first_name} {employee.last_name}
        </h2>

        {review?.self_assessment ? (
          <div className="mt-4 mb-6 rounded-lg bg-[var(--color-violet-tint)] px-4 py-3.5">
            <p className="text-[10.5px] font-semibold tracking-wide uppercase text-[var(--color-primary)] mb-1.5">
              Their self-assessment
            </p>
            <p className="text-sm text-[var(--color-text-primary)] whitespace-pre-wrap">{review.self_assessment}</p>
          </div>
        ) : (
          <p className="text-sm text-[var(--color-text-muted)] mt-1 mb-6">
            No self-assessment submitted yet — you can still leave feedback.
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">Rating</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  className={`w-9 h-9 rounded-lg text-sm font-medium border transition-colors duration-150 ${
                    Number(rating) === n
                      ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]"
                      : "border-black/10 text-[var(--color-text-muted)] hover:bg-black/[0.03]"
                  }`}
                  style={{ transitionTimingFunction: "var(--ease-out)" }}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">Your feedback</label>
            <textarea
              required
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={8}
              className={inputClass}
              onFocus={focusRing}
              onBlur={clearRing}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-black/10 rounded-lg py-2.5 text-sm font-medium text-[var(--color-text-muted)] hover:bg-black/[0.03] transition-colors duration-150"
              style={{ transitionTimingFunction: "var(--ease-out)" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-[1.4] rounded-lg py-2.5 text-sm font-medium text-white transition-transform duration-150 hover:scale-[1.02] active:scale-95 disabled:opacity-60"
              style={{ backgroundColor: "var(--color-primary)", transitionTimingFunction: "var(--ease-out)" }}
            >
              {saving ? "Saving..." : "Complete review"}
            </button>
          </div>
        </form>
      </div>

      <style jsx global>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
