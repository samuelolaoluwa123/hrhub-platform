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

  if (user) {
    const roleRule = ROLE_ONLY_PREFIXES.find((r) => path.startsWith(r.prefix));
    if (roleRule) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (!profile || !roleRule.roles.includes(profile.role)) {
        const url = request.nextUrl.clone();
        url.pathname = "/unauthorized";
        return NextResponse.redirect(url);
      }
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};