import { createClient } from "@/lib/supabase/server";
import PayrollPage from "@/components/dashboard/payroll/PayrollPage";

export default async function PayrollRoute() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

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

  const [{ data: runs }, { count: totalActiveEmployees }, { data: allPayslips }, { data: myPayslips }] =
    await Promise.all([
      canManage
        ? supabase
            .from("payroll_runs")
            .select("id, period_month, period_year, status")
            .order("period_year", { ascending: false })
            .order("period_month", { ascending: false })
        : Promise.resolve({ data: [] }),
      supabase
        .from("employees")
        .select("id", { count: "exact", head: true })
        .eq("status", "active"),
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
    />
  );
}