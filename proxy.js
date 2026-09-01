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

  const {
    data: { user },
  } = await supabase.auth.getUser();

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