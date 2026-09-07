import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Phase 13 — "what happens to an employee's data after they leave."
// Nothing currently disabled a departed employee's login at all: their
// profile and Supabase Auth account stayed fully live forever, so they
// could keep signing in and viewing their own historical data
// indefinitely after resigning/being terminated. This bans (not
// deletes) their auth account — the historical records stay completely
// intact (payslips, audit log, leave history, everything that
// references their profile_id by foreign key), only the ability to
// authenticate is cut. `restore: true` is the symmetric undo, used
// when an admin reactivates someone via ChangeStatusDrawer (a
// mis-recorded exit, or a genuine rehire).
export async function POST(request) {
  try {
    return await handle(request);
  } catch (err) {
    console.error("portal-access route threw:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Something went wrong." },
      { status: 500 }
    );
  }
}

async function handle(request) {
  const { employeeId, restore = false } = await request.json();

  if (!employeeId) {
    return NextResponse.json({ error: "Missing employeeId" }, { status: 400 });
  }

  // Verify the caller is actually an admin, using the normal
  // RLS-respecting client — same pattern as /api/invite-employee.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (callerProfile?.role !== "admin") {
    return NextResponse.json({ error: "Only admins can change portal access" }, { status: 403 });
  }

  // RLS confirms this employee actually belongs to the caller's own
  // company — a cross-company id just comes back null, not another
  // company's row.
  const { data: employee } = await supabase
    .from("employees")
    .select("id, profile_id")
    .eq("id", employeeId)
    .single();

  if (!employee) {
    return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  }

  if (!employee.profile_id) {
    // Never had portal access in the first place — nothing to do.
    return NextResponse.json({ success: true, skipped: true });
  }

  const admin = createAdminClient();

  // Supabase Auth has no "permanent" ban — ~100 years is the
  // conventional stand-in for "indefinite" (and easy to recognize as
  // intentional if anyone ever inspects it directly).
  const { error: banError } = await admin.auth.admin.updateUserById(employee.profile_id, {
    ban_duration: restore ? "none" : "876000h",
  });

  if (banError) {
    return NextResponse.json({ error: banError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
