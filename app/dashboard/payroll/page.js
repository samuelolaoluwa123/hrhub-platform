import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PayrollPage from "@/components/dashboard/payroll/PayrollPage";

export default async function PayrollRoute() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, company_id, full_name, companies(name, address, rc_number)")
    .eq("id", user.id)
    .single();

  const canManage = profile?.role === "admin";

  const { data: myEmployeeRow } = await supabase
    .from("employees")
    .select("id, job_title, department, bank_name, bank_account_number")
    .eq("profile_id", user.id)
    .maybeSingle();

  const employeeId = myEmployeeRow?.id ?? null;

  // Statuses are company-configurable now (Phase 1.1) — "active" isn't
  // a fixed string anymore, so payroll eligibility has to look up which
  // status names currently count as active headcount for this company.
  let activeStatusNames = [];
  if (canManage) {
    const { data: activeStatuses } = await supabase
      .from("employee_statuses")
      .select("name")
      .eq("is_active_headcount", true);
    activeStatusNames = (activeStatuses ?? []).map((s) => s.name);
  }

  // Employee headcount goes through an RPC rather than a row count —
  // employees can now only SELECT their own row (and their manager's),
  // so a direct count would silently undercount for anyone but
  // admin/manager. The function returns just the number, no rows.
  const [
    { data: runs },
    { data: totalActiveEmployees },
    { data: allPayslips },
    { data: myPayslips },
    { data: structures },
    { data: employees },
    { data: myLoanRepayments },
  ] = await Promise.all([
    canManage
      ? supabase
          .from("payroll_runs")
          .select("id, period_month, period_year, status")
          .order("period_year", { ascending: false })
          .order("period_month", { ascending: false })
      : Promise.resolve({ data: [] }),
    supabase.rpc("active_employee_count"),
    canManage
      ? supabase.from("payslips").select("id, payroll_run_id")
      : Promise.resolve({ data: [] }),
    employeeId
      ? supabase
          .from("payslips")
          .select("id, gross_pay, deductions, net_pay, breakdown, created_at, payroll_runs(period_month, period_year)")
          .eq("employee_id", employeeId)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    canManage
      ? supabase
          .from("salary_structures")
          .select("id, employee_id, base_salary, allowances, pension_employee_rate, employees(first_name, last_name)")
      : Promise.resolve({ data: [] }),
    canManage && activeStatusNames.length
      ? supabase.from("employees").select("id, first_name, last_name").in("status", activeStatusNames).order("first_name")
      : Promise.resolve({ data: [] }),
    // Real loan deductions this employee's own payslips actually
    // carried — RLS already lets them see their own repayment history
    // (Phase 9), reused here for the payslip PDF's "Loans" line.
    employeeId
      ? supabase
          .from("loan_repayments")
          .select("payslip_id, amount, loans(loan_type)")
          .eq("employee_id", employeeId)
      : Promise.resolve({ data: [] }),
  ]);

  // Count payslips per run in plain JS — simpler and just as fast as a
  // group-by RPC for the small row counts a company this size will have.
  const countsByRun = {};
  (allPayslips ?? []).forEach((p) => {
    countsByRun[p.payroll_run_id] = (countsByRun[p.payroll_run_id] ?? 0) + 1;
  });
  const runsWithCounts = (runs ?? []).map((r) => ({
    ...r,
    payslip_count: countsByRun[r.id] ?? 0,
  }));

  const loanRepaymentsByPayslip = {};
  (myLoanRepayments ?? []).forEach((r) => {
    (loanRepaymentsByPayslip[r.payslip_id] ??= []).push({
      label: r.loans?.loan_type === "advance" ? "Salary advance repayment" : "Staff loan repayment",
      amount: r.amount,
    });
  });
  const myPayslipsWithLoans = (myPayslips ?? []).map((p) => ({
    ...p,
    loanRepayments: loanRepaymentsByPayslip[p.id] ?? [],
  }));

  return (
    <PayrollPage
      canManage={canManage}
      runs={runsWithCounts}
      myPayslips={myPayslipsWithLoans}
      totalActiveEmployees={totalActiveEmployees ?? 0}
      companyId={profile?.company_id}
      employeeName={profile?.full_name}
      companyName={profile?.companies?.name}
      companyAddress={profile?.companies?.address}
      companyRcNumber={profile?.companies?.rc_number}
      myEmployee={myEmployeeRow}
      structures={structures ?? []}
      employees={employees ?? []}
      profileId={user.id}
    />
  );
}
