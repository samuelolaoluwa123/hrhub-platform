import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import RunDetail from "@/components/dashboard/payroll/RunDetail";

export default async function PayrollRunPage({ params }) {
  const { runId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id, role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    redirect("/dashboard/payroll");
  }

  const { data: run } = await supabase
    .from("payroll_runs")
    .select("id, period_month, period_year, status")
    .eq("id", runId)
    .single();

  // RLS already prevents fetching a run from another company, but a
  // deleted/bad id would come back null — bounce to the list instead
  // of rendering a broken page.
  if (!run) {
    redirect("/dashboard/payroll");
  }

  const [{ data: employees }, { data: payslips }, { data: structures }] = await Promise.all([
    supabase
      .from("employees")
      .select("id, first_name, last_name, email, profile_id")
      .eq("status", "active")
      .order("first_name"),
    supabase
      .from("payslips")
      .select("id, employee_id, net_pay")
      .eq("payroll_run_id", runId),
    supabase
      .from("salary_structures")
      .select("employee_id, base_salary, allowances, pension_employee_rate"),
  ]);

  const payslipByEmployee = {};
  (payslips ?? []).forEach((p) => {
    payslipByEmployee[p.employee_id] = p;
  });

  const structureByEmployee = {};
  (structures ?? []).forEach((s) => {
    structureByEmployee[s.employee_id] = s;
  });

  const employeesWithPayslips = (employees ?? []).map((e) => ({
    ...e,
    payslip: payslipByEmployee[e.id] ?? null,
    structure: structureByEmployee[e.id] ?? null,
  }));

  return (
    <RunDetail run={run} employeesWithPayslips={employeesWithPayslips} companyId={profile?.company_id} />
  );
}