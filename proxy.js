import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

// Routes that require an authenticated session at all.
const PROTECTED_PREFIXES = ["/dashboard"];

// Routes that require a specific role. Checked after auth.
// The actual data access is still enforced by RLS — this is just
// a UX guard so the wrong role never even sees the page shell.
const ROLE_ONLY_PREFIXES = [
  { prefix: "/dashboard/admin", roles: ["admin"] },
  { prefix: "/dashboard/payroll/", roles: ["admin"] },
  { prefix: "/dashboard/approvals", roles: ["admin", "manager"] },
  { prefix: "/dashboard/employees", roles: ["admin", "manager"] },
  { prefix: "/dashboard/audit-log", roles: ["admin"] },
];

// Phase 2.4: a not-fully-onboarded employee can only reach these —
// everything else (Payroll, Leave, Benefits, other employees' info,
// the rest of the dashboard) is off-limits until onboarding is done.
// This is the real authorization gate, not just hidden nav links —
// RLS backs it up at the database level too (payslips specifically).
const ONBOARDING_ALLOWED_PREFIXES = [
  "/dashboard/me",
  "/dashboard/onboarding",
  "/dashboard/profile",
  "/dashboard/documents",
  "/dashboard/announcements",
  // 4.5 — an interview panel assignment can land on someone who hasn't
  // finished their own onboarding yet (a recent hire tapped for a
  // panel); it shouldn't have to wait on unrelated onboarding tasks.
  "/dashboard/interview-panel",
];

export async function proxy(request) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getUser() makes a real network call out to Supabase's auth server
  // (deliberately — it revalidates server-side rather than trusting a
  // locally-decoded JWT). If that call fails for a transient reason
  // (a dropped connection, a momentary blip — not a real "this session
  // is invalid" rejection), the SDK surfaces it as an
  // AuthRetryableFetchError, distinct from a genuine auth rejection.
  // Before this, that distinction was thrown away — any error at all
  // meant `user` came back null and got treated identically to "not
  // logged in," bouncing someone with a perfectly valid session to
  // /login. Caught live: a session died mid-testing with 50+ minutes
  // left on its actual token, and the failing request's auth-check step
  // took ~17ms against a normal 400-1200ms — too fast to have been a
  // real check, consistent with an immediate network-level failure.
  //
  // One bounded retry after a short pause resolves a single transient
  // blip without adding latency to the normal case (this path only
  // runs when the first attempt already failed) and without ever
  // failing open — a real rejection is never retryable, and two
  // failures in a row still correctly requires signing in again rather
  // than guessing.
  async function getUserResilient() {
    let { data, error } = await supabase.auth.getUser();
    if (error?.name === "AuthRetryableFetchError") {
      await new Promise((resolve) => setTimeout(resolve, 250));
      ({ data, error } = await supabase.auth.getUser());
    }
    return data?.user ?? null;
  }

  const user = await getUserResilient();

  const path = request.nextUrl.pathname;
  const needsAuth = PROTECTED_PREFIXES.some((p) => path.startsWith(p));

  if (needsAuth && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && path.startsWith("/dashboard")) {
    const roleRule = ROLE_ONLY_PREFIXES.find((r) => path.startsWith(r.prefix));
    const needsOnboardingCheck = !ONBOARDING_ALLOWED_PREFIXES.some((p) => path.startsWith(p));

    // One query covers both checks — role-restricted routes need the
    // role either way, and onboarding status only matters for an
    // employee (admin/manager are never gated by it).
    if (roleRule || needsOnboardingCheck) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (roleRule && (!profile || !roleRule.roles.includes(profile.role))) {
        const url = request.nextUrl.clone();
        url.pathname = "/unauthorized";
        return NextResponse.redirect(url);
      }

      if (needsOnboardingCheck && profile?.role === "employee") {
        const { data: employee } = await supabase
          .from("employees")
          .select("onboarding_complete")
          .eq("profile_id", user.id)
          .maybeSingle();

        if (employee && employee.onboarding_complete === false) {
          const url = request.nextUrl.clone();
          url.pathname = "/dashboard/onboarding";
          return NextResponse.redirect(url);
        }
      }
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};