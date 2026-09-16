// Every check here is derived from real data, never a self-reported
// checkbox — same philosophy the employee onboarding checklist already
// uses ("confirmed automatically... not self-reported"). Nothing here
// blocks access to the rest of the app; it's a nudge, shown via the
// Overview banner and the /dashboard/setup checklist, never a gate.
export async function getSetupStatus(supabase, companyId) {
  const [{ data: company }, { count: departmentCount }, { count: leaveTypeCount }, { data: templates }, { count: employeeCount }] =
    await Promise.all([
      supabase.from("companies").select("address, rc_number").eq("id", companyId).single(),
      supabase.from("departments").select("id", { count: "exact", head: true }).eq("company_id", companyId),
      supabase.from("leave_types").select("id", { count: "exact", head: true }).eq("company_id", companyId).eq("is_active", true),
      supabase.from("onboarding_templates").select("id, onboarding_tasks(id)").eq("company_id", companyId),
      supabase.from("employees").select("id", { count: "exact", head: true }).eq("company_id", companyId),
    ]);

  const hasOnboardingTemplate = (templates ?? []).some((t) => (t.onboarding_tasks ?? []).length > 0);

  return [
    {
      id: "company_details",
      label: "Add your company details",
      description: "Address and RC number — shown on every payslip PDF.",
      done: Boolean(company?.address && company?.rc_number),
      href: "/dashboard/payroll",
      cta: "Go to Payroll",
    },
    {
      id: "departments",
      label: "Set up at least one department",
      description: "Used across employees, requisitions, and announcements.",
      done: (departmentCount ?? 0) > 0,
      href: "/dashboard/settings/departments",
      cta: "Go to Departments",
    },
    {
      id: "leave_types",
      label: "Set up at least one leave type",
      description: "Employees can't request leave until a type exists.",
      done: (leaveTypeCount ?? 0) > 0,
      href: "/dashboard/leave",
      cta: "Go to Leave",
    },
    {
      id: "onboarding_template",
      label: "Create an onboarding template",
      description: "Without one, new hires get zero requirements assigned — silently.",
      done: hasOnboardingTemplate,
      href: "/dashboard/onboarding/templates",
      cta: "Go to Onboarding",
    },
    {
      id: "employees",
      label: "Add your team",
      description: "Bring in the people who'll actually use HRhub day to day.",
      done: (employeeCount ?? 0) > 1,
      href: "/dashboard/employees",
      cta: "Go to Employees",
    },
  ];
}
