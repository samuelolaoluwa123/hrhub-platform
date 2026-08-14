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
    .select("id, name")
    .order("name");

  const [{ data: pendingRequests }, { data: myRequests }] = await Promise.all([
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
  ]);

  return (
    <LeavePage
      canApprove={canApprove}
      pendingRequests={pendingRequests ?? []}
      myRequests={myRequests ?? []}
      leaveTypes={leaveTypes ?? []}
      employeeId={employeeId}
      companyId={profile?.company_id}
    />
  );
}