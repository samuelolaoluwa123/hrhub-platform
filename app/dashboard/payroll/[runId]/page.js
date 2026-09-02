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

  const [
    { data: company },
    { data: employees },
    { data: payslips },
    { data: structures },
    { data: loans },
    { data: statuses },
    { data: loanRepayments },
    { data: adjustments },
  ] = await Promise.all([
      supabase.from("companies").select("name, address, rc_number").eq("id", profile.company_id).single(),
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
        .select(
          "id, first_name, last_name, email, profile_id, status, job_title, department, bank_name, bank_account_number"
        )
        .order("first_name"),
      supabase
        .from("payslips")
        .select("id, employee_id, gross_pay, deductions, net_pay, breakdown, created_at")
        .eq("payroll_run_id", runId),
      supabase
        .from("salary_structures")
        .select("employee_id, base_salary, allowances, pension_employee_rate, pension_employer_rate"),
      supabase
        .from("loans")
        .select("id, employee_id, loan_type, amount, amount_repaid, monthly_deduction")
        .eq("status", "approved"),
      supabase.from("employee_statuses").select("name, is_active_headcount"),
      supabase.from("loan_repayments").select("id, loan_id, payslip_id, amount").eq("payroll_run_id", runId),
      supabase.from("payslip_adjustments").select("*").order("created_at", { ascending: false }),
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
  const loanTypeById = {};
  (loans ?? []).forEach((l) => {
    (loansByEmployee[l.employee_id] ??= []).push(l);
    loanTypeById[l.id] = l.loan_type;
  });

  // Every loan deduction that actually hit a given payslip — the real
  // "Loans" line item on the payslip PDF, not a re-derived guess.
  const loanRepaymentsByPayslip = {};
  (loanRepayments ?? []).forEach((r) => {
    (loanRepaymentsByPayslip[r.payslip_id] ??= []).push({
      label: loanTypeById[r.loan_id] === "advance" ? "Salary advance repayment" : "Staff loan repayment",
      amount: r.amount,
    });
  });

  const adjustmentsByPayslip = {};
  (adjustments ?? []).forEach((a) => {
    (adjustmentsByPayslip[a.payslip_id] ??= []).push(a);
  });

  const employeesWithPayslips = activeEmployees.map((e) => ({
    ...e,
    payslip: payslipByEmployee[e.id] ?? null,
    structure: structureByEmployee[e.id] ?? null,
    activeLoans: loansByEmployee[e.id] ?? [],
    payslipLoanRepayments: payslipByEmployee[e.id] ? loanRepaymentsByPayslip[payslipByEmployee[e.id].id] ?? [] : [],
    payslipAdjustments: payslipByEmployee[e.id] ? adjustmentsByPayslip[payslipByEmployee[e.id].id] ?? [] : [],
  }));

  return (
    <RunDetail
      run={run}
      employeesWithPayslips={employeesWithPayslips}
      companyId={profile?.company_id}
      company={company}
      profileId={user.id}
    />
  );
}
