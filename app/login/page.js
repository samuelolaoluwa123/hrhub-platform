"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (authError) {
      setError(authError.message);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="min-h-screen md:grid md:grid-cols-2">
      {/* Brand panel — desktop only. On mobile this whole panel is dropped
          in favor of the centered-card layout below. */}
      <div className="hidden md:flex relative bg-[var(--color-hero-bg)] p-14 flex-col justify-between items-start overflow-hidden min-h-screen">
        <FloatingCards />

        <div className="relative z-10">
          <Image
            src="/hrhub-logo-white.png"
            alt="HRhub"
            width={110}
            height={35}
            priority
            className="h-8 w-auto"
          />
        </div>

        <div className="relative z-10">
          <p className="font-display font-semibold text-4xl text-white leading-snug max-w-md">
            HR, <span className="text-[var(--color-accent)]">organized</span>.
          </p>
          <p className="text-[var(--color-primary-light)] mt-4 max-w-sm">
            One login for your whole team — records, leave, and payroll, all in one place.
          </p>
        </div>

        <div className="relative z-10 h-6" />
      </div>

      {/* Form side — centered card on mobile, edge-to-edge panel on desktop */}
      <div
        className="
          min-h-screen flex flex-col items-center justify-center
          bg-[var(--color-violet-tint)] md:bg-[var(--color-surface)]
          px-5 py-10 md:p-14
        "
      >
        {/* Logo above the card — mobile only, desktop already has it in the brand panel */}
        <div className="md:hidden mb-7">
          <Image
            src="/hrhub-logo-full-color.png"
            alt="HRhub"
            width={92}
            height={29}
            priority
            className="h-6 w-auto"
          />
        </div>

        <div
          className="
            w-full max-w-sm animate-[fadeUp_500ms_var(--ease-out)]
            bg-white rounded-2xl shadow-[0_1px_2px_rgba(19,4,34,0.06)] p-6
            md:bg-transparent md:shadow-none md:p-0 md:rounded-none
          "
        >
          <h1 className="font-display text-2xl font-semibold text-[var(--color-text-primary)]">
            Welcome back
          </h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1 mb-8">
            Sign in to your company's HR dashboard.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="name@company.com"
                className="w-full border border-black/10 rounded-xl px-4 py-2.5 outline-none transition-shadow duration-150"
                style={{ transitionTimingFunction: "var(--ease-out)" }}
                onFocus={(e) => (e.target.style.boxShadow = "0 0 0 2px var(--color-accent)")}
                onBlur={(e) => (e.target.style.boxShadow = "none")}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-sm font-medium text-[var(--color-text-primary)]">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium text-[var(--color-primary)] hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full border border-black/10 rounded-xl px-4 py-2.5 pr-16 outline-none transition-shadow duration-150"
                  style={{ transitionTimingFunction: "var(--ease-out)" }}
                  onFocus={(e) => (e.target.style.boxShadow = "0 0 0 2px var(--color-accent)")}
                  onBlur={(e) => (e.target.style.boxShadow = "none")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors duration-150"
                  style={{ transitionTimingFunction: "var(--ease-out)" }}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 animate-[fadeIn_200ms_var(--ease-out)]" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl py-2.5 text-white font-medium transition-transform duration-150 hover:scale-[1.02] active:scale-95 disabled:opacity-60"
              style={{
                backgroundColor: "var(--color-primary)",
                transitionTimingFunction: "var(--ease-out)",
              }}
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

// Lightweight CSS-only ambient motif — deliberately not the full 3D
// scene, since this page is visited far more often than the landing
// page and doesn't need that weight. Desktop-only, same as the brand
// panel it lives in.
function FloatingCards() {
  const cards = [
    { top: "12%", left: "8%", size: 46, delay: "0s" },
    { top: "60%", left: "70%", size: 38, delay: "1.5s" },
    { top: "75%", left: "18%", size: 42, delay: "3s" },
    { top: "10%", left: "62%", size: 34, delay: "0.7s" },
  ];
  return (
    <>
      {cards.map((c, i) => (
        <div
          key={i}
          className="absolute rounded-lg border border-white/[0.15] bg-white/[0.06]"
          style={{
            top: c.top,
            left: c.left,
            width: c.size,
            height: c.size * 1.3,
            animation: `drift 9s ease-in-out infinite`,
            animationDelay: c.delay,
          }}
        />
      ))}
    </>
  );
}