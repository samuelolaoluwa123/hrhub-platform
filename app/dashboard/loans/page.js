import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LoansPage from "@/components/dashboard/loans/LoansPage";

export default async function LoansRoute() {
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

  const canManage = profile?.role === "admin" || profile?.role === "manager";

  const { data: myEmployeeRow } = await supabase
    .from("employees")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle();

  const employeeId = myEmployeeRow?.id ?? null;

  const [{ data: myLoans }, { data: pendingLoans }, { data: allLoans }, { data: repayments }] = await Promise.all([
    employeeId
      ? supabase
          .from("loans")
          .select("id, loan_type, amount, reason, repayment_months, monthly_deduction, amount_repaid, status, requested_at")
          .eq("employee_id", employeeId)
          .order("requested_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    canManage
      ? supabase
          .from("loans")
          .select("id, loan_type, amount, reason, repayment_months, requested_at, employees(first_name, last_name)")
          .eq("status", "pending")
          .order("requested_at", { ascending: true })
      : Promise.resolve({ data: [] }),
    canManage
      ? supabase
          .from("loans")
          .select("id, loan_type, amount, monthly_deduction, amount_repaid, status, employees(first_name, last_name)")
          .neq("status", "pending")
          .order("requested_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    // The real "repayment schedule" — one row per payroll run a loan
    // was actually deducted in. RLS scopes this to the caller's own
    // loans unless they're admin/manager (who see every loan's
    // history), same shape as the loans table itself.
    supabase
      .from("loan_repayments")
      .select("id, loan_id, amount, created_at, payroll_runs(period_month, period_year)")
      .order("created_at", { ascending: false }),
  ]);

  const repaymentsByLoan = {};
  (repayments ?? []).forEach((r) => {
    (repaymentsByLoan[r.loan_id] ??= []).push(r);
  });

  return (
    <LoansPage
      canManage={canManage}
      employeeId={employeeId}
      companyId={profile?.company_id}
      myLoans={myLoans ?? []}
      pendingLoans={pendingLoans ?? []}
      allLoans={allLoans ?? []}
      repaymentsByLoan={repaymentsByLoan}
      profileId={user.id}
    />
  );
}
