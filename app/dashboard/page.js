import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { lagosLocalParts } from "@/lib/attendanceEvidence";

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const PAYROLL_STATUS_LABEL = { draft: "Draft", processed: "Processed", paid: "Paid" };

// Applications past this point are no longer "in the pipeline" — a
// hired/rejected/withdrawn candidate shouldn't count toward "how many
// candidates are we actively working right now."
const TERMINAL_APPLICATION_STATUSES = ["hired", "rejected", "withdrawn"];

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

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, company_id, role")
    .eq("id", user.id)
    .single();

  const canManage = profile?.role === "admin" || profile?.role === "manager";

  // Company-wide by design, but through an RPC that returns only
  // name + month/day — never the birth year, never anything else
  // about the person. See upcoming_celebrations() in the migration.
  const { data: celebrations } = await supabase.rpc("upcoming_celebrations", { days_ahead: 30 });

  if (!canManage) {
    // Plain employees keep the original, simple welcome view —
    // reporting below is HR/admin-scoped and would just be noise here.
    const [{ data: employeeCount }, { count: pendingLeaveCount }, { data: nextPayrollRun }] = await Promise.all([
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
        <Greeting fullName={profile?.full_name} />

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            iconBg="#f3e9fc"
            iconColor="#8224e3"
            icon={<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></>}
            value={employeeCount ?? 0}
            label="Active employees"
          />
          <StatCard
            iconBg="#fef3e2"
            iconColor="#d68a1f"
            icon={<><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>}
            value={pendingLeaveCount ?? 0}
            label="Pending leave requests"
            trend={pendingLeaveCount > 0 ? "needs review" : null}
          />
          <StatCard iconBg="#e8f9f0" iconColor="#1a9c5f" isNaira value={payrollLabel} label="Next payroll run" />
        </div>

        <CelebrationsWidget celebrations={celebrations} />
      </div>
    );
  }

  // ---- HR dashboard (admin/manager) — Phase 12 ----
  // "HR should be able to answer quickly" means this replaces the
  // generic 3-card view entirely rather than sitting alongside it —
  // Active employees/Pending leave would otherwise show up twice.
  const companyId = profile.company_id;
  const { workDate: today } = lagosLocalParts();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [
    { count: totalEmployees },
    { data: activeEmployeeCount },
    { count: newHires },
    { count: exits },
    { data: activeStatuses },
    { count: pendingLeaveCount },
    { count: clockedInToday },
    { count: flaggedToday },
    { data: latestPayrollRun },
    { count: openVacancies },
    { data: activeApplications },
    { data: openCycles },
    { data: approvedLoans },
  ] = await Promise.all([
    supabase.from("employees").select("id", { count: "exact", head: true }),
    supabase.rpc("active_employee_count"),
    supabase.from("employees").select("id", { count: "exact", head: true }).gte("start_date", thirtyDaysAgo),
    supabase.from("employee_exits").select("id", { count: "exact", head: true }).gte("exit_date", thirtyDaysAgo),
    supabase.from("employee_statuses").select("name, is_active_headcount"),
    supabase
      .from("leave_requests")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("status", "pending"),
    supabase
      .from("attendance_records")
      .select("id", { count: "exact", head: true })
      .eq("work_date", today)
      .not("clock_in", "is", null),
    supabase.from("attendance_records").select("id", { count: "exact", head: true }).eq("work_date", today).eq("flagged", true),
    supabase
      .from("payroll_runs")
      .select("period_month, period_year, status")
      .order("period_year", { ascending: false })
      .order("period_month", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("job_postings").select("id", { count: "exact", head: true }).eq("status", "open"),
    supabase.from("applications").select("candidate_id, status"),
    supabase.from("review_cycles").select("id").eq("status", "open"),
    supabase.from("loans").select("amount, amount_repaid").eq("status", "approved"),
  ]);

  // Onboarding completion is only meaningful against people currently
  // employed — an exited employee's checklist isn't "incomplete work."
  const activeStatusNames = (activeStatuses ?? []).filter((s) => s.is_active_headcount).map((s) => s.name);
  const { count: onboardedCount } = activeStatusNames.length
    ? await supabase
        .from("employees")
        .select("id", { count: "exact", head: true })
        .eq("onboarding_complete", true)
        .in("status", activeStatusNames)
    : { count: 0 };

  const activeHeadcount = activeEmployeeCount ?? 0;
  const onboardingPct = activeHeadcount > 0 ? Math.round(((onboardedCount ?? 0) / activeHeadcount) * 100) : null;

  const activeCandidateIds = new Set(
    (activeApplications ?? [])
      .filter((a) => !TERMINAL_APPLICATION_STATUSES.includes(a.status))
      .map((a) => a.candidate_id)
  );

  // "Pending" has to mean "not yet completed," not "has a non-completed
  // row" — an employee who hasn't started their review at all has no
  // performance_reviews row yet (PerformancePage derives "Not started"
  // client-side for the missing case), so counting existing rows with
  // status <> 'completed' would silently miss everyone who hasn't
  // started. Counting down from active headcount catches them too.
  const openCycleIds = (openCycles ?? []).map((c) => c.id);
  const { count: completedInOpenCycles } = openCycleIds.length
    ? await supabase
        .from("performance_reviews")
        .select("id", { count: "exact", head: true })
        .in("cycle_id", openCycleIds)
        .eq("status", "completed")
    : { count: 0 };
  const pendingKpiReviews = openCycleIds.length ? Math.max(0, activeHeadcount - (completedInOpenCycles ?? 0)) : 0;

  const activeLoanCount = approvedLoans?.length ?? 0;
  const outstandingLoanBalance = (approvedLoans ?? []).reduce(
    (sum, l) => sum + (Number(l.amount) - Number(l.amount_repaid)),
    0
  );

  const payrollLabel = latestPayrollRun
    ? `${MONTH_NAMES[latestPayrollRun.period_month - 1]} ${latestPayrollRun.period_year}`
    : "Not started";
  const payrollStatus = latestPayrollRun ? PAYROLL_STATUS_LABEL[latestPayrollRun.status] : null;

  return (
    <div>
      <Greeting fullName={profile?.full_name} />

      <p className="text-[10.5px] font-semibold tracking-wide text-[var(--color-text-muted)] uppercase mb-3">
        Workforce
      </p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard
          iconBg="#f3e9fc" iconColor="#8224e3"
          icon={<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></>}
          value={totalEmployees ?? 0}
          label="Total employees"
          sub={`${activeHeadcount} active`}
        />
        <StatCard
          iconBg="#e8f9f0" iconColor="#1a9c5f"
          icon={<><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M19 8v6M22 11h-6" /></>}
          value={newHires ?? 0}
          label="New hires"
          sub="last 30 days"
        />
        <StatCard
          iconBg="#fdeeee" iconColor="#cc3333"
          icon={<><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M17 8l5 5M22 8l-5 5" /></>}
          value={exits ?? 0}
          label="Exits"
          sub="last 30 days"
        />
        <StatCard
          iconBg="#e8f4fd" iconColor="#1f7fd6"
          icon={<><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></>}
          value={onboardingPct != null ? `${onboardingPct}%` : "—"}
          label="Onboarding completion"
          sub={activeHeadcount > 0 ? `${onboardedCount ?? 0} of ${activeHeadcount} active` : "no active employees"}
        />
        <StatCard
          iconBg="#fef3e2" iconColor="#d68a1f"
          icon={<><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>}
          value={pendingLeaveCount ?? 0}
          label="Pending leave"
          trend={pendingLeaveCount > 0 ? "needs review" : null}
        />
        <StatCard
          iconBg="#f3e9fc" iconColor="#8224e3"
          icon={<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></>}
          value={activeHeadcount > 0 ? `${clockedInToday ?? 0} of ${activeHeadcount}` : "—"}
          label="Clocked in today"
          trend={flaggedToday > 0 ? `${flaggedToday} flagged` : null}
        />
      </div>

      <p className="text-[10.5px] font-semibold tracking-wide text-[var(--color-text-muted)] uppercase mb-3">
        Payroll &amp; recruitment
      </p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard iconBg="#e8f9f0" iconColor="#1a9c5f" isNaira value={payrollLabel} label="Latest payroll run" sub={payrollStatus} />
        <StatCard
          iconBg="#e8f4fd" iconColor="#1f7fd6"
          icon={<><path d="M20 7h-9M20 12H9M20 17H9M4 7l3-3-3-3M4 17l3 3-3 3" /></>}
          value={openVacancies ?? 0}
          label="Open vacancies"
        />
        <StatCard
          iconBg="#f3e9fc" iconColor="#8224e3"
          icon={<><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></>}
          value={activeCandidateIds.size}
          label="Candidates in pipeline"
        />
      </div>

      <p className="text-[10.5px] font-semibold tracking-wide text-[var(--color-text-muted)] uppercase mb-3">
        Performance &amp; loans
      </p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          iconBg="#fef3e2" iconColor="#d68a1f"
          icon={<><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></>}
          value={pendingKpiReviews ?? 0}
          label="KPI reviews pending"
          trend={pendingKpiReviews > 0 ? "this cycle" : null}
        />
        <StatCard
          iconBg="#e8f9f0" iconColor="#1a9c5f"
          isNaira
          value={activeLoanCount}
          label="Active loans"
          sub={`${naira(outstandingLoanBalance)} outstanding`}
        />
      </div>

      <CelebrationsWidget celebrations={celebrations} />
    </div>
  );
}

function naira(n) {
  return `₦${(Number(n) || 0).toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;
}

function Greeting({ fullName }) {
  return (
    <>
      <p className="font-mono text-[11px] tracking-wide text-[var(--color-accent)]">{getGreeting()}</p>
      <h1 className="font-display text-[27px] font-semibold text-[var(--color-text-primary)] mt-1">
        Welcome back, {fullName ?? "there"}
      </h1>
      <p className="text-[var(--color-text-muted)] mt-1 mb-7">Here's what's happening across your company.</p>
    </>
  );
}

function CelebrationsWidget({ celebrations }) {
  if (!celebrations?.length) return null;
  return (
    <div className="mt-6 bg-white border border-black/[0.06] rounded-2xl p-5">
      <p className="text-[13px] font-semibold text-[var(--color-text-primary)] mb-3.5">Coming up</p>
      <div className="space-y-2.5">
        {celebrations.map((c) => (
          <div key={`${c.employee_id}-${c.kind}`} className="flex items-center gap-3 text-sm">
            <span className="text-lg leading-none">{c.kind === "birthday" ? "🎂" : "🎉"}</span>
            <span className="text-[var(--color-text-primary)]">
              {c.first_name} {c.last_name}
            </span>
            <span className="text-[var(--color-text-muted)]">
              {c.kind === "birthday" ? "birthday" : `${c.years}-year anniversary`}
            </span>
            <span className="ml-auto font-mono text-xs text-[var(--color-text-muted)]">
              {MONTH_NAMES[c.month - 1]} {c.day}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({ iconBg, iconColor, icon, isNaira, value, label, trend, sub }) {
  return (
    <div className="bg-white border border-black/[0.06] rounded-2xl p-5 transition-transform duration-200 hover:-translate-y-[3px]" style={{ transitionTimingFunction: "var(--ease-out)" }}>
      <div className="flex items-start justify-between mb-3.5">
        <div className="w-9 h-9 rounded-[10px] flex items-center justify-center" style={{ backgroundColor: iconBg }}>
          {isNaira ? (
            <span className="font-display font-semibold text-base" style={{ color: iconColor }}>₦</span>
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
      <p className="font-display text-[28px] font-semibold text-[var(--color-text-primary)]">{value}</p>
      <p className="text-[13px] text-[var(--color-text-muted)] mt-0.5">{label}</p>
      {sub && <p className="text-[11px] text-[var(--color-text-muted)] mt-1.5 font-mono">{sub}</p>}
    </div>
  );
}
