import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ReportsPage from "@/components/dashboard/reports/ReportsPage";

export default async function ReportsRoute() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, company_id")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.role === "admin";
  if (!isAdmin && profile?.role !== "manager") {
    redirect("/unauthorized");
  }

  // Employee Directory has no filter, so it's fetched once up front —
  // manager_id is resolved against this same list client-side rather
  // than a self-join embed (PostgREST won't resolve those reliably on
  // this schema — see EmployeeDrawer's manager picker for the same
  // workaround).
  const { data: employees } = await supabase
    .from("employees")
    .select("id, first_name, last_name, email, job_title, department, team, status, start_date, manager_id")
    .order("first_name");

  const { data: exitStatusRows } = await supabase
    .from("employee_statuses")
    .select("name")
    .eq("is_exit", true);
  const exitStatusNames = (exitStatusRows ?? []).map((s) => s.name);

  // Payroll Register is admin-only (matches Payroll's own gating) and
  // needs a run to report on — the run list is cheap and load-bearing
  // for the picker, so it's fetched up front too.
  const { data: payrollRuns } = isAdmin
    ? await supabase
        .from("payroll_runs")
        .select("id, period_month, period_year, status")
        .order("period_year", { ascending: false })
        .order("period_month", { ascending: false })
    : { data: [] };

  const { data: leaveTypes } = await supabase.from("leave_types").select("id, name").order("name");

  return (
    <ReportsPage
      isAdmin={isAdmin}
      companyId={profile?.company_id}
      employees={employees ?? []}
      exitStatusNames={exitStatusNames}
      payrollRuns={payrollRuns ?? []}
      leaveTypes={leaveTypes ?? []}
    />
  );
}
