import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { lagosLocalParts } from "@/lib/attendanceEvidence";
import AttendancePage from "@/components/dashboard/attendance/AttendancePage";

export default async function AttendanceRoute() {
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

  const canManage = profile?.role === "admin" || profile?.role === "manager";
  const isAdmin = profile?.role === "admin";

  const { data: myEmployeeRow } = await supabase
    .from("employees")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle();

  const employeeId = myEmployeeRow?.id ?? null;
  const { workDate: today } = lagosLocalParts();

  // Full evidence set — everything AttendanceRecordDrawer needs to
  // show the "employee says 8:01am, here's what was actually
  // recorded" comparison (6.3). Both admin-facing lists below use it,
  // since either can be the row that opens that drawer.
  const evidenceSelect =
    "id, work_date, clock_in, clock_out, work_location, status, flagged, flag_reason, " +
    "clock_in_ip, clock_in_device, clock_in_session_id, clock_out_ip, clock_out_device, clock_out_session_id, " +
    "verified_at, verification_note, employees(first_name, last_name)";

  const [
    { data: todaysRecord },
    { data: myHistory },
    { data: companyToday },
    { data: flaggedRecords },
    { data: employees },
    { data: trustedNetworks },
    { data: company },
  ] = await Promise.all([
    employeeId
      ? supabase
          .from("attendance_records")
          .select("id, clock_in, clock_out, work_location, status")
          .eq("employee_id", employeeId)
          .eq("work_date", today)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    employeeId
      ? supabase
          .from("attendance_records")
          .select("id, work_date, clock_in, clock_out, work_location, status, flagged")
          .eq("employee_id", employeeId)
          .order("work_date", { ascending: false })
          .limit(30)
      : Promise.resolve({ data: [] }),
    canManage
      ? supabase
          .from("attendance_records")
          .select(evidenceSelect)
          .eq("company_id", profile.company_id)
          .eq("work_date", today)
          .order("clock_in", { ascending: true })
      : Promise.resolve({ data: [] }),
    canManage
      ? supabase
          .from("attendance_records")
          .select(evidenceSelect)
          .eq("company_id", profile.company_id)
          .eq("flagged", true)
          .order("work_date", { ascending: false })
          .limit(50)
      : Promise.resolve({ data: [] }),
    canManage
      ? supabase.from("employees").select("id, first_name, last_name").order("first_name")
      : Promise.resolve({ data: [] }),
    isAdmin
      ? supabase.from("attendance_trusted_networks").select("id, label, ip_prefix").order("created_at")
      : Promise.resolve({ data: [] }),
    isAdmin
      ? supabase.from("companies").select("standard_start_time, late_grace_minutes").eq("id", profile.company_id).single()
      : Promise.resolve({ data: null }),
  ]);

  return (
    <AttendancePage
      canManage={canManage}
      isAdmin={isAdmin}
      employeeId={employeeId}
      companyId={profile?.company_id}
      profileId={user.id}
      todaysRecord={todaysRecord ?? null}
      myHistory={myHistory ?? []}
      companyToday={companyToday ?? []}
      flaggedRecords={flaggedRecords ?? []}
      employees={employees ?? []}
      trustedNetworks={trustedNetworks ?? []}
      company={company}
    />
  );
}
