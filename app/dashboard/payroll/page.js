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
    .select("role, company_id, full_name, companies(name)")
    .eq("id", user.id)
    .single();

  const canManage = profile?.role === "admin";

  const { data: myEmployeeRow } = await supabase
    .from("employees")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle();

  const employeeId = myEmployeeRow?.id ?? null;

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
          .select("id, gross_pay, deductions, net_pay, payroll_runs(period_month, period_year)")
          .eq("employee_id", employeeId)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    canManage
      ? supabase
          .from("salary_structures")
          .select("id, employee_id, base_salary, allowances, pension_employee_rate, employees(first_name, last_name)")
      : Promise.resolve({ data: [] }),
    canManage
      ? supabase.from("employees").select("id, first_name, last_name").eq("status", "active").order("first_name")
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

  return (
    <PayrollPage
      canManage={canManage}
      runs={runsWithCounts}
      myPayslips={myPayslips ?? []}
      totalActiveEmployees={totalActiveEmployees ?? 0}
      companyId={profile?.company_id}
      employeeName={profile?.full_name}
      companyName={profile?.companies?.name}
      structures={structures ?? []}
      employees={employees ?? []}
      profileId={user.id}
    />
  );
}