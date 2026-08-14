import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request) {
  const { employeeId } = await request.json();

  if (!employeeId) {
    return NextResponse.json({ error: "Missing employeeId" }, { status: 400 });
  }

  // Verify the caller is actually an admin of the company this
  // employee belongs to — using the normal (RLS-respecting) server
  // client for this check, before ever touching the admin client.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("role, company_id")
    .eq("id", user.id)
    .single();

  if (callerProfile?.role !== "admin") {
    return NextResponse.json({ error: "Only admins can send invites" }, { status: 403 });
  }

  // RLS on this select confirms the employee actually belongs to the
  // caller's own company — a non-match returns null, not another
  // company's row.
  const { data: employee } = await supabase
    .from("employees")
    .select("id, first_name, last_name, email, company_id, profile_id")
    .eq("id", employeeId)
    .single();

  if (!employee) {
    return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  }

  if (employee.profile_id) {
    return NextResponse.json({ error: "This employee already has portal access" }, { status: 400 });
  }

  const admin = createAdminClient();
  const origin = request.headers.get("origin");

  const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(
    employee.email,
    { redirectTo: `${origin}/auth/set-password` }
  );

  if (inviteError) {
    return NextResponse.json({ error: inviteError.message }, { status: 500 });
  }

  const newUserId = inviteData.user.id;

  // Create their profile and link the employee record — using the
  // admin client here too, since this happens before they've ever
  // logged in (no session yet to satisfy normal RLS with).
  const { error: profileError } = await admin.from("profiles").insert({
    id: newUserId,
    company_id: employee.company_id,
    role: "employee",
    full_name: `${employee.first_name} ${employee.last_name}`,
    email: employee.email,
  });

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  const { error: linkError } = await admin
    .from("employees")
    .update({ profile_id: newUserId })
    .eq("id", employeeId);

  if (linkError) {
    return NextResponse.json({ error: linkError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}