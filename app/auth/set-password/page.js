"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);
    // Both the invite link and the "forgot password" reset link land
    // here and already establish a session in the browser when this
    // page loads — updateUser just sets the real password on that
    // already-authenticated account.
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[var(--color-violet-tint)] p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm space-y-5 animate-[fadeUp_500ms_var(--ease-out)]"
      >
        <div>
          <p className="font-display font-semibold text-lg text-[var(--color-primary)] mb-4">HRhub</p>
          <h1 className="font-display text-xl font-semibold text-[var(--color-text-primary)]">
            Set your password
          </h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            Choose a password to sign in with going forward.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
            New password
          </label>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-black/10 rounded-lg px-3 py-2.5 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
            Confirm password
          </label>
          <input
            type="password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
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
          {loading ? "Setting password..." : "Set password & continue"}
        </button>
      </form>
    </main>
  );
}