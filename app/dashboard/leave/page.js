import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LeavePage from "@/components/dashboard/leave/LeavePage";

export default async function LeaveRoute() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, company_id")
    .eq("id", user.id)
    .single();

  const canApprove = profile?.role === "admin" || profile?.role === "manager";

  // A user is only "self-service eligible" if an employees row links
  // back to their own profile — an admin with no employee record can
  // still approve others' requests, just can't submit their own yet.
  const { data: myEmployeeRow } = await supabase
    .from("employees")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle();

  const employeeId = myEmployeeRow?.id ?? null;

  // 7.3 — every leave type ever created (admin manages this list,
  // including reactivating one) vs. just the ones actually offered
  // when requesting new leave (is_active filters out anything HR has
  // removed from the current workflow, e.g. Personal Leave).
  const { data: leaveTypes } = await supabase
    .from("leave_types")
    .select("id, name, default_days_per_year, is_active")
    .order("name");
  const activeLeaveTypes = (leaveTypes ?? []).filter((t) => t.is_active);

  const currentYear = new Date().getFullYear();

  const [
    { data: pendingRequests },
    { data: myRequests },
    { data: myBalances },
    { data: teamBalances },
    { data: employees },
    { data: allPendingByEmployee },
  ] = await Promise.all([
    canApprove
      ? supabase
          .from("leave_requests")
          .select(
            "id, start_date, end_date, days_requested, reason, created_at, employee_id, leave_type_id, employees(first_name, last_name, email, profile_id, company_id), leave_types(name)"
          )
          .eq("status", "pending")
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [] }),
    employeeId
      ? supabase
          .from("leave_requests")
          .select("id, start_date, end_date, days_requested, reason, status, decision_comment, reviewed_at, leave_types(name)")
          .eq("employee_id", employeeId)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    employeeId
      ? supabase
          .from("leave_balances")
          .select("id, year, leave_type_id, days_allocated, days_used, leave_types(name)")
          .eq("employee_id", employeeId)
          .eq("year", currentYear)
      : Promise.resolve({ data: [] }),
    canApprove
      ? supabase
          .from("leave_balances")
          .select("id, year, employee_id, leave_type_id, days_allocated, days_used, employees(first_name, last_name), leave_types(name)")
          .eq("year", currentYear)
          .order("first_name", { referencedTable: "employees" })
      : Promise.resolve({ data: [] }),
    canApprove
      ? supabase.from("employees").select("id, first_name, last_name").order("first_name")
      : Promise.resolve({ data: [] }),
    // 7.1 — "Pending" is computed live from open requests rather than
    // a separately-maintained column, so it can never drift out of
    // sync with reality. One company-wide query covers both the
    // employee's own pending days and (for admin/manager) everyone
    // else's, grouped client-side.
    supabase
      .from("leave_requests")
      .select("employee_id, leave_type_id, days_requested")
      .eq("company_id", profile?.company_id)
      .eq("status", "pending"),
  ]);

  const pendingByEmployeeAndType = new Map();
  for (const r of allPendingByEmployee ?? []) {
    const key = `${r.employee_id}:${r.leave_type_id}`;
    pendingByEmployeeAndType.set(key, (pendingByEmployeeAndType.get(key) ?? 0) + Number(r.days_requested));
  }

  return (
    <LeavePage
      canApprove={canApprove}
      pendingRequests={pendingRequests ?? []}
      myRequests={myRequests ?? []}
      leaveTypes={leaveTypes ?? []}
      activeLeaveTypes={activeLeaveTypes}
      employeeId={employeeId}
      profileId={user.id}
      companyId={profile?.company_id}
      myBalances={myBalances ?? []}
      teamBalances={teamBalances ?? []}
      employees={employees ?? []}
      currentYear={currentYear}
      pendingByEmployeeAndType={Object.fromEntries(pendingByEmployeeAndType)}
    />
  );
}
