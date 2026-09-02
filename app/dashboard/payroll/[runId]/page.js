import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import RunDetail from "@/components/dashboard/payroll/RunDetail";

export default async function PayrollRunPage({ params }) {
  const { runId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

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

  const [{ data: employees }, { data: payslips }, { data: structures }, { data: loans }, { data: statuses }] = await Promise.all([
    // Bug: this used to check status = 'active' (lowercase) — a
    // literal from before Phase 1 made statuses configurable with
    // real capitalized names ('Active', 'Probation', ...). No
    // employee has matched that literal since Phase 1 shipped, so
    // every payroll run's employee list has rendered empty this whole
    // time (confirmed live: even the already-"Paid" August run with 7
    // real payslips shows 0 employees on this page). Same
    // employee_statuses.is_active_headcount fix as the Phase 8
    // birthday-widget bug.
    supabase
      .from("employees")
      .select("id, first_name, last_name, email, profile_id, status")
      .order("first_name"),
    supabase
      .from("payslips")
      .select("id, employee_id, net_pay")
      .eq("payroll_run_id", runId),
    supabase
      .from("salary_structures")
      .select("employee_id, base_salary, allowances, pension_employee_rate"),
    supabase
      .from("loans")
      .select("id, employee_id, amount, amount_repaid, monthly_deduction")
      .eq("status", "approved"),
    supabase.from("employee_statuses").select("name, is_active_headcount"),
  ]);

  const activeStatusNames = new Set((statuses ?? []).filter((s) => s.is_active_headcount).map((s) => s.name));
  const activeEmployees = (employees ?? []).filter((e) => activeStatusNames.has(e.status));

  const payslipByEmployee = {};
  (payslips ?? []).forEach((p) => {
    payslipByEmployee[p.employee_id] = p;
  });

  const structureByEmployee = {};
  (structures ?? []).forEach((s) => {
    structureByEmployee[s.employee_id] = s;
  });

  const loansByEmployee = {};
  (loans ?? []).forEach((l) => {
    (loansByEmployee[l.employee_id] ??= []).push(l);
  });

  const employeesWithPayslips = activeEmployees.map((e) => ({
    ...e,
    payslip: payslipByEmployee[e.id] ?? null,
    structure: structureByEmployee[e.id] ?? null,
    activeLoans: loansByEmployee[e.id] ?? [],
  }));

  return (
    <RunDetail run={run} employeesWithPayslips={employeesWithPayslips} companyId={profile?.company_id} />
  );
}