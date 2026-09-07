import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Phase 13 — a deliberate, audited, admin-triggered purge of an exited
// employee's sensitive documents (passport, ID, medical record, bank
// evidence) and avatar photo. Deliberately NOT an automatic timer —
// the exact retention period is a legal question for the company to
// confirm with a Nigerian privacy professional, not something this app
// should guess at. This just gives HR the tool to act once they know
// their real number.
//
// Only ever reachable for an employee already in an exit status (a
// second, server-side guard — never trust the button not being shown
// as the only thing stopping this on an active employee).
export async function POST(request) {
  try {
    return await handle(request);
  } catch (err) {
    console.error("purge-documents route threw:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Something went wrong." },
      { status: 500 }
    );
  }
}

async function handle(request) {
  const { employeeId, reason } = await request.json();

  if (!employeeId) {
    return NextResponse.json({ error: "Missing employeeId" }, { status: 400 });
  }
  if (!reason || !reason.trim()) {
    return NextResponse.json({ error: "A reason is required to purge documents." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("role, company_id, full_name")
    .eq("id", user.id)
    .single();

  if (callerProfile?.role !== "admin") {
    return NextResponse.json({ error: "Only admins can purge documents" }, { status: 403 });
  }

  // RLS confirms company match; the exit-status check is the extra
  // guard specific to this action — purging an active employee's
  // documents is never allowed through this route regardless of who's
  // asking.
  const { data: employee } = await supabase
    .from("employees")
    .select("id, first_name, last_name, status, avatar_path, company_id")
    .eq("id", employeeId)
    .single();

  if (!employee) {
    return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  }

  const { data: statusMeta } = await supabase
    .from("employee_statuses")
    .select("is_exit")
    .eq("company_id", callerProfile.company_id)
    .eq("name", employee.status)
    .maybeSingle();

  if (!statusMeta?.is_exit) {
    return NextResponse.json(
      { error: "Documents can only be purged for an employee who has exited." },
      { status: 400 }
    );
  }

  const { data: documents } = await supabase
    .from("employee_documents")
    .select("id, file_path, doc_type")
    .eq("employee_id", employeeId);

  const admin = createAdminClient();

  const paths = (documents ?? []).map((d) => d.file_path);
  if (paths.length > 0) {
    const { error: removeError } = await admin.storage.from("employee-documents").remove(paths);
    if (removeError) {
      return NextResponse.json({ error: removeError.message }, { status: 500 });
    }
  }

  if (employee.avatar_path) {
    await admin.storage.from("employee-avatars").remove([employee.avatar_path]);
  }

  if (documents && documents.length > 0) {
    await admin
      .from("employee_documents")
      .delete()
      .in("id", documents.map((d) => d.id));
  }

  if (employee.avatar_path) {
    await admin.from("employees").update({ avatar_path: null }).eq("id", employeeId);
  }

  // Written directly (not through the generic log_audit_change trigger
  // reuse pattern) — that helper reads its "reason" off a NEW row's
  // change_reason column, which doesn't exist for a DELETE with no new
  // row. This is a deliberate one-off action with its own reason, so
  // it gets its own explicit audit_log entry instead.
  await admin.from("audit_log").insert({
    company_id: callerProfile.company_id,
    actor_id: user.id,
    actor_name: callerProfile.full_name,
    action: "documents_purged",
    entity_type: "employee_documents",
    entity_id: employeeId,
    employee_id: employeeId,
    reason: reason.trim(),
    notes: `Purged ${documents?.length ?? 0} document(s)${
      documents?.length ? ` (${documents.map((d) => d.doc_type).join(", ")})` : ""
    }${employee.avatar_path ? " + avatar photo" : ""} for ${employee.first_name} ${employee.last_name}.`,
  });

  return NextResponse.json({ success: true, purgedCount: documents?.length ?? 0 });
}
