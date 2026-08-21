import { createClient } from "@/lib/supabase/server";
import AttendancePage from "@/components/dashboard/attendance/AttendancePage";

export default async function AttendanceRoute() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, company_id")
    .eq("id", user.id)
    .single();

  const canManage = profile?.role === "admin" || profile?.role === "manager";

  const { data: myEmployeeRow } = await supabase
    .from("employees")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle();

  const employeeId = myEmployeeRow?.id ?? null;
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: todaysRecord }, { data: myHistory }, { data: companyToday }] = await Promise.all([
    employeeId
      ? supabase
          .from("attendance_records")
          .select("id, clock_in, clock_out")
          .eq("employee_id", employeeId)
          .eq("work_date", today)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    employeeId
      ? supabase
          .from("attendance_records")
          .select("id, work_date, clock_in, clock_out")
          .eq("employee_id", employeeId)
          .order("work_date", { ascending: false })
          .limit(30)
      : Promise.resolve({ data: [] }),
    canManage
      ? supabase
          .from("attendance_records")
          .select("id, clock_in, clock_out, employees(first_name, last_name)")
          .eq("work_date", today)
          .order("clock_in", { ascending: true })
      : Promise.resolve({ data: [] }),
  ]);

  return (
    <AttendancePage
      canManage={canManage}
      employeeId={employeeId}
      companyId={profile?.company_id}
      todaysRecord={todaysRecord ?? null}
      myHistory={myHistory ?? []}
      companyToday={companyToday ?? []}
    />
  );
}
