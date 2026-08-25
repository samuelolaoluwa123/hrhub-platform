import { createClient } from "@/lib/supabase/server";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "GOOD MORNING";
  if (hour < 18) return "GOOD AFTERNOON";
  return "GOOD EVENING";
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, company_id")
    .eq("id", user.id)
    .single();

  // RLS already scopes these to the caller's own company — the
  // .eq() below is just an explicit, readable filter on top of that.
  // Employee headcount goes through an RPC rather than a row count:
  // employees can now only SELECT their own row (and their manager's),
  // so a direct count would silently undercount for anyone but
  // admin/manager. The function returns just the number, no rows.
  const [{ data: employeeCount }, { count: pendingLeaveCount }, { data: nextPayrollRun }] =
    await Promise.all([
      supabase.rpc("active_employee_count"),
      supabase
        .from("leave_requests")
        .select("id", { count: "exact", head: true })
        .eq("company_id", profile?.company_id)
        .eq("status", "pending"),
      supabase
        .from("payroll_runs")
        .select("period_month, period_year")
        .eq("company_id", profile?.company_id)
        .neq("status", "paid")
        .order("period_year", { ascending: true })
        .order("period_month", { ascending: true })
        .limit(1)
        .maybeSingle(),
    ]);

  const payrollLabel = nextPayrollRun
    ? new Date(nextPayrollRun.period_year, nextPayrollRun.period_month - 1).toLocaleDateString(
        "en-US",
        { month: "short", year: "numeric" }
      )
    : "Not scheduled";

  return (
    <div>
      <p className="font-mono text-[11px] tracking-wide text-[var(--color-accent)]">
        {getGreeting()}
      </p>
      <h1 className="font-display text-[27px] font-semibold text-[var(--color-text-primary)] mt-1">
        Welcome back, {profile?.full_name ?? "there"}
      </h1>
      <p className="text-[var(--color-text-muted)] mt-1 mb-7">
        Here's what's happening across your company.
      </p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          iconBg="#f3e9fc"
          iconColor="#8224e3"
          icon={
            <>
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
            </>
          }
          value={employeeCount ?? 0}
          label="Active employees"
        />
        <StatCard
          iconBg="#fef3e2"
          iconColor="#d68a1f"
          icon={
            <>
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </>
          }
          value={pendingLeaveCount ?? 0}
          label="Pending leave requests"
          trend={pendingLeaveCount > 0 ? "needs review" : null}
        />
        <StatCard
          iconBg="#e8f9f0"
          iconColor="#1a9c5f"
          isNaira
          value={payrollLabel}
          label="Next payroll run"
        />
      </div>
    </div>
  );
}

function StatCard({ iconBg, iconColor, icon, isNaira, value, label, trend }) {
  return (
    <div className="bg-white border border-black/[0.06] rounded-2xl p-5 transition-transform duration-200 hover:-translate-y-[3px]" style={{ transitionTimingFunction: "var(--ease-out)" }}>
      <div className="flex items-start justify-between mb-3.5">
        <div
          className="w-9 h-9 rounded-[10px] flex items-center justify-center"
          style={{ backgroundColor: iconBg }}
        >
          {isNaira ? (
            <span className="font-display font-semibold text-base" style={{ color: iconColor }}>
              ₦
            </span>
          ) : (
            <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2">
              {icon}
            </svg>
          )}
        </div>
        {trend && (
          <span className="font-mono text-[11px] font-medium px-2 py-0.5 rounded-md bg-[#fef3e2] text-[#d68a1f]">
            {trend}
          </span>
        )}
      </div>
      <p className="font-display text-[28px] font-semibold text-[var(--color-text-primary)]">
        {value}
      </p>
      <p className="text-[13px] text-[var(--color-text-muted)] mt-0.5">{label}</p>
    </div>
  );
}