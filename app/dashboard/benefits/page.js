import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BenefitsPage from "@/components/dashboard/benefits/BenefitsPage";

export default async function BenefitsRoute() {
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

  // Admins/managers see every plan (including retired ones, so they can
  // reactivate); everyone else only sees what's currently offered.
  const plansQuery = canManage
    ? supabase.from("benefit_plans").select("*").order("category").order("name")
    : supabase.from("benefit_plans").select("*").eq("is_active", true).order("category").order("name");

  const [{ data: plans }, { data: myEnrollments }, { data: allEnrollments }] = await Promise.all([
    plansQuery,
    employeeId
      ? supabase.from("benefit_enrollments").select("id, plan_id, status").eq("employee_id", employeeId)
      : Promise.resolve({ data: [] }),
    canManage
      ? supabase.from("benefit_enrollments").select("plan_id, status").eq("status", "enrolled")
      : Promise.resolve({ data: [] }),
  ]);

  // Enrolled-count per plan, computed in JS — same approach as the
  // payslip-per-run counts on the Payroll page.
  const enrolledCountByPlan = {};
  (allEnrollments ?? []).forEach((e) => {
    enrolledCountByPlan[e.plan_id] = (enrolledCountByPlan[e.plan_id] ?? 0) + 1;
  });

  return (
    <BenefitsPage
      canManage={canManage}
      employeeId={employeeId}
      companyId={profile?.company_id}
      plans={plans ?? []}
      myEnrollments={myEnrollments ?? []}
      enrolledCountByPlan={enrolledCountByPlan}
    />
  );
}
