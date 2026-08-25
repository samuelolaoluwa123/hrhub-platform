"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // redirectTo is what actually makes the reset land on the
    // "set your password" screen instead of falling back to whatever
    // Supabase's dashboard-configured default Site URL is — that
    // fallback is what silently broke this flow before.
    const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/set-password`,
    });

    setLoading(false);

    // Show the same success state whether or not the email exists —
    // don't let this form be used to probe for registered accounts.
    if (authError) {
      setError(authError.message);
      return;
    }
    setSent(true);
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[var(--color-violet-tint)] p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm space-y-5 animate-[fadeUp_500ms_var(--ease-out)]">
        <div>
          <p className="font-display font-semibold text-lg text-[var(--color-primary)] mb-4">HRhub</p>
          <h1 className="font-display text-xl font-semibold text-[var(--color-text-primary)]">
            Reset your password
          </h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            We'll email you a link to choose a new one.
          </p>
        </div>

        {sent ? (
          <p className="text-sm text-[var(--color-text-primary)] bg-[var(--color-violet-tint)] rounded-lg px-4 py-3">
            If an account exists for <span className="font-medium">{email}</span>, a reset link is on its way.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-black/10 rounded-lg px-3 py-2.5 outline-none"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg py-2.5 text-white font-medium transition-transform duration-150 hover:scale-[1.02] active:scale-95 disabled:opacity-60"
              style={{ backgroundColor: "var(--color-primary)", transitionTimingFunction: "var(--ease-out)" }}
            >
              {loading ? "Sending..." : "Send reset link"}
            </button>
          </form>
        )}

        <Link
          href="/login"
          className="block text-center text-sm font-medium text-[var(--color-primary)] hover:underline"
        >
          Back to sign in
        </Link>
      </div>
    </main>
  );
}
