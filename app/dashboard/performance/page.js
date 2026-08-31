import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PerformancePage from "@/components/dashboard/performance/PerformancePage";

export default async function PerformanceRoute() {
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

  const { data: myEmployeeRow } = await supabase
    .from("employees")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle();

  const employeeId = myEmployeeRow?.id ?? null;

  const [
    { data: myGoals },
    { data: teamGoals },
    { data: cycles },
    { data: myReviews },
    { data: teamReviews },
    { data: employees },
  ] = await Promise.all([
    employeeId
      ? supabase
          .from("performance_goals")
          .select("id, title, description, target_date, status, created_at")
          .eq("employee_id", employeeId)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    canManage
      ? supabase
          .from("performance_goals")
          .select("id, title, target_date, status, employees(first_name, last_name)")
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    supabase
      .from("review_cycles")
      .select("id, name, cycle_type, start_date, end_date, status")
      .order("created_at", { ascending: false }),
    employeeId
      ? supabase
          .from("performance_reviews")
          .select("id, cycle_id, self_assessment, self_assessment_submitted_at, manager_feedback, rating, status, review_cycles(name, status)")
          .eq("employee_id", employeeId)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    canManage
      ? supabase
          .from("performance_reviews")
          .select("id, cycle_id, employee_id, status, rating, self_assessment, manager_feedback, employees(first_name, last_name)")
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    canManage
      ? supabase.from("employees").select("id, first_name, last_name").order("first_name")
      : Promise.resolve({ data: [] }),
  ]);

  return (
    <PerformancePage
      canManage={canManage}
      employeeId={employeeId}
      companyId={profile?.company_id}
      myGoals={myGoals ?? []}
      teamGoals={teamGoals ?? []}
      cycles={cycles ?? []}
      myReviews={myReviews ?? []}
      teamReviews={teamReviews ?? []}
      employees={employees ?? []}
      profileId={user.id}
    />
  );
}
