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
    .select(
      "id, bank_name, bank_account_number, bank_account_name, guarantor_name, guarantor_phone, guarantor_relationship, guarantor_address"
    )
    .eq("profile_id", user.id)
    .maybeSingle();

  const employeeId = myEmployeeRow?.id ?? null;

  // Active-headcount status names, same lookup Payroll uses — team
  // progress only makes sense for people currently employed.
  let activeStatusNames = [];
  if (canManage) {
    const { data: activeStatuses } = await supabase
      .from("employee_statuses")
      .select("name")
      .eq("is_active_headcount", true);
    activeStatusNames = (activeStatuses ?? []).map((s) => s.name);
  }

  const [{ data: myRequirements }, { data: teamEmployees }, { data: templates }] = await Promise.all([
    employeeId
      ? supabase.rpc("onboarding_requirement_status", { p_employee_id: employeeId })
      : Promise.resolve({ data: [] }),
    canManage && activeStatusNames.length
      ? supabase.from("employees").select("id, first_name, last_name").in("status", activeStatusNames).order("first_name")
      : Promise.resolve({ data: [] }),
    canManage
      ? supabase.from("onboarding_templates").select("id, name").order("name")
      : Promise.resolve({ data: [] }),
  ]);

  // One RPC call per employee — fine at the size this product handles
  // today, would want a batched version if a company's headcount grows
  // a lot.
  const teamProgress = canManage
    ? await Promise.all(
        (teamEmployees ?? []).map(async (emp) => {
          const { data: requirements } = await supabase.rpc("onboarding_requirement_status", {
            p_employee_id: emp.id,
          });
          return { ...emp, requirements: requirements ?? [] };
        })
      )
    : [];

  return (
    <OnboardingPage
      canManage={canManage}
      myProfileId={user.id}
      myEmployeeId={employeeId}
      myEmployee={myEmployeeRow}
      myRequirements={myRequirements ?? []}
      teamProgress={teamProgress}
      templates={templates ?? []}
      companyId={profile?.company_id}
      myName={profile?.full_name}
    />
  );
}
