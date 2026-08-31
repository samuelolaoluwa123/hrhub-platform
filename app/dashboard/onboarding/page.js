import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import OnboardingPage from "@/components/dashboard/onboarding/OnboardingPage";

export default async function OnboardingRoute() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, company_id, full_name")
    .eq("id", user.id)
    .single();

  const canManage = profile?.role === "admin" || profile?.role === "manager";

  const { data: myEmployeeRow } = await supabase
    .from("employees")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle();

  const employeeId = myEmployeeRow?.id ?? null;

  const [{ data: myTasks }, { data: teamProgress }, { data: templates }] = await Promise.all([
    employeeId
      ? supabase
          .from("employee_onboarding")
          .select("id, is_complete, onboarding_tasks(title, sort_order)")
          .eq("employee_id", employeeId)
      : Promise.resolve({ data: [] }),
    canManage
      ? supabase
          .from("employees")
          .select("id, first_name, last_name, employee_onboarding(is_complete)")
          .eq("status", "active")
          .order("first_name")
      : Promise.resolve({ data: [] }),
    canManage
      ? supabase.from("onboarding_templates").select("id, name").order("name")
      : Promise.resolve({ data: [] }),
  ]);

  const sortedMyTasks = (myTasks ?? []).sort(
    (a, b) => a.onboarding_tasks.sort_order - b.onboarding_tasks.sort_order
  );

  return (
    <OnboardingPage
      canManage={canManage}
      myTasks={sortedMyTasks}
      teamProgress={teamProgress ?? []}
      templates={templates ?? []}
      companyId={profile?.company_id}
      myName={profile?.full_name}
    />
  );
}