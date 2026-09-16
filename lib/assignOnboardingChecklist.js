// Shared between EmployeeDrawer's manual "Add employee" and the CSV
// bulk importer — both create real employees, and this is the one
// place "zero-template problem" handling (Phase 7) lives, so every
// creation path notifies admins the same way instead of silently
// leaving a new hire with no onboarding checklist assigned.
export async function assignOnboardingChecklist(employeeId, employeeName, department, companyId, supabase) {
  const { data: templates } = await supabase
    .from("onboarding_templates")
    .select("id, name, is_default")
    .eq("company_id", companyId)
    .eq("is_active", true);

  const matched =
    templates?.length &&
    (templates.find((t) => t.name.toLowerCase() === (department || "").toLowerCase()) ||
      templates.find((t) => t.is_default));

  const tasks = matched
    ? (
        await supabase
          .from("onboarding_tasks")
          .select("id")
          .eq("template_id", matched.id)
          .eq("is_active", true)
      ).data
    : null;

  if (matched && tasks?.length) {
    await supabase.from("employee_onboarding").insert(
      tasks.map((task) => ({
        company_id: companyId,
        employee_id: employeeId,
        task_id: task.id,
        is_complete: false,
      }))
    );
    return true;
  }

  const { data: admins } = await supabase.from("profiles").select("id").eq("company_id", companyId).eq("role", "admin");
  if (admins?.length) {
    await supabase.from("notifications").insert(
      admins.map((a) => ({
        company_id: companyId,
        profile_id: a.id,
        type: "onboarding",
        message: `${employeeName} was added with no onboarding checklist assigned — set one up manually.`,
        link: "/dashboard/onboarding",
      }))
    );
  }
  return false;
}
