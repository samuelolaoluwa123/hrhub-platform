import { createClient } from "@/lib/supabase/server";
import LeavePage from "@/components/dashboard/leave/LeavePage";

export default async function LeaveRoute() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

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

  const { data: leaveTypes } = await supabase
    .from("leave_types")
    .select("id, name, default_days_per_year")
    .order("name");

  const currentYear = new Date().getFullYear();

  const [{ data: pendingRequests }, { data: myRequests }, { data: myBalances }, { data: teamBalances }, { data: employees }] =
    await Promise.all([
      canApprove
        ? supabase
            .from("leave_requests")
            .select("id, start_date, end_date, days_requested, reason, employees(first_name, last_name, email, profile_id, company_id), leave_types(name)")
            .eq("status", "pending")
            .order("created_at", { ascending: true })
        : Promise.resolve({ data: [] }),
      employeeId
        ? supabase
            .from("leave_requests")
            .select("id, start_date, end_date, days_requested, reason, status, leave_types(name)")
            .eq("employee_id", employeeId)
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [] }),
      employeeId
        ? supabase
            .from("leave_balances")
            .select("id, year, days_allocated, days_used, leave_types(name)")
            .eq("employee_id", employeeId)
            .eq("year", currentYear)
        : Promise.resolve({ data: [] }),
      canApprove
        ? supabase
            .from("leave_balances")
            .select("id, year, days_allocated, days_used, employees(first_name, last_name), leave_types(name)")
            .eq("year", currentYear)
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [] }),
      canApprove
        ? supabase.from("employees").select("id, first_name, last_name").order("first_name")
        : Promise.resolve({ data: [] }),
    ]);

  return (
    <LeavePage
      canApprove={canApprove}
      pendingRequests={pendingRequests ?? []}
      myRequests={myRequests ?? []}
      leaveTypes={leaveTypes ?? []}
      employeeId={employeeId}
      companyId={profile?.company_id}
      myBalances={myBalances ?? []}
      teamBalances={teamBalances ?? []}
      employees={employees ?? []}
      currentYear={currentYear}
    />
  );
}