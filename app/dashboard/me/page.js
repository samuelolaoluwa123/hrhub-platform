import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import PulseCheckin from "@/components/dashboard/PulseCheckin";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default async function MyHubPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, company_id")
    .eq("id", user.id)
    .single();

  const today = new Date().toISOString().slice(0, 10);
  const { data: todaysCheckin } = await supabase
    .from("pulse_checkins")
    .select("mood")
    .eq("profile_id", user.id)
    .eq("checkin_date", today)
    .maybeSingle();

  const { data: employee } = await supabase
    .from("employees")
    .select("id, first_name, last_name, job_title, department, start_date")
    .eq("profile_id", user.id)
    .maybeSingle();

  let latestPayslip = null;
  let pendingLeaveCount = 0;
  let onboardingTotal = 0;
  let onboardingComplete = 0;

  if (employee) {
    const [{ data: payslipData }, { count: leaveCount }, { data: onboardingRows }] =
      await Promise.all([
        supabase
          .from("payslips")
          .select("net_pay, created_at, payroll_runs(period_month, period_year)")
          .eq("employee_id", employee.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("leave_requests")
          .select("id", { count: "exact", head: true })
          .eq("employee_id", employee.id)
          .eq("status", "pending"),
        supabase
          .from("employee_onboarding")
          .select("is_complete")
          .eq("employee_id", employee.id),
      ]);

    latestPayslip = payslipData;
    pendingLeaveCount = leaveCount ?? 0;
    onboardingTotal = onboardingRows?.length ?? 0;
    onboardingComplete = onboardingRows?.filter((r) => r.is_complete).length ?? 0;
  }

  const firstName = (profile?.full_name || employee?.first_name || "there").split(" ")[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const payslipLabel = latestPayslip
    ? `${MONTHS[latestPayslip.payroll_runs?.period_month - 1] ?? ""} ready`
    : "None yet";

  const onboardingLabel =
    onboardingTotal === 0
      ? "Not assigned"
      : onboardingComplete === onboardingTotal
      ? "Complete"
      : `${onboardingComplete}/${onboardingTotal} done`;

  const cards = [
    {
      href: "/dashboard/employees",
      label: "My profile",
      icon: <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 20a8 8 0 0 1 16 0" />,
      available: true,
    },
    {
      href: "/dashboard/payroll",
      label: "My payslips",
      icon: <path d="M6 3h9l3 3v15H6zM9 8h6M9 12h6M9 16h4" />,
      available: true,
    },
    {
      href: "/dashboard/leave",
      label: "My leave",
      icon: <><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>,
      available: true,
    },
    {
      href: "/dashboard/onboarding",
      label: "My onboarding",
      icon: <path d="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />,
      available: true,
    },
    {
      href: "/dashboard/documents",
      label: "My documents",
      icon: <path d="M6 3h9l3 3v15H6zM9 12h6M9 16h6" />,
      available: true,
    },
    {
      href: "/dashboard/attendance",
      label: "My attendance",
      icon: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></>,
      available: true,
    },
    {
      href: "/dashboard/benefits",
      label: "My benefits",
      icon: <path d="M12 21s-7-4.5-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6c-2.5 4.5-9.5 9-9.5 9Z" />,
      available: true,
    },
    { label: "My performance", icon: <path d="M3 3v18h18M7 15l4-4 3 3 5-6" />, available: false },
  ];

  return (
    <div className="space-y-8">
      {/* Hero band — dark, matches the sidebar/login brand treatment */}
      <div className="relative overflow-hidden rounded-2xl bg-[var(--color-hero-bg)] px-7 py-9 md:px-10 md:py-11">
        <div
          className="absolute -top-24 -right-16 w-72 h-72 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(130,36,227,0.28), transparent 70%)" }}
        />
        <p className="relative z-10 text-[var(--color-primary-light)] text-sm mb-1 animate-[fadeUp_400ms_var(--ease-out)]">
          {greeting}
        </p>
        <h1 className="relative z-10 font-display text-3xl md:text-4xl font-semibold text-white mb-8 animate-[fadeUp_450ms_var(--ease-out)]">
          {firstName}
        </h1>

        <div className="relative z-10 grid sm:grid-cols-3 gap-4">
          <div className="rounded-xl bg-white/[0.06] border border-white/[0.1] px-5 py-4 animate-[fadeUp_500ms_var(--ease-out)]">
            <p className="text-[var(--color-primary-light)] text-xs mb-1.5">Pending leave</p>
            <p className="text-white text-xl font-semibold">
              {pendingLeaveCount} request{pendingLeaveCount === 1 ? "" : "s"}
            </p>
          </div>
          <div
            className="rounded-xl bg-white/[0.06] border border-white/[0.1] px-5 py-4 animate-[fadeUp_500ms_var(--ease-out)]"
            style={{ animationDelay: "60ms" }}
          >
            <p className="text-[var(--color-primary-light)] text-xs mb-1.5">Latest payslip</p>
            <p className="text-white text-xl font-semibold">{payslipLabel}</p>
          </div>
          <div
            className="rounded-xl bg-white/[0.06] border border-white/[0.1] px-5 py-4 animate-[fadeUp_500ms_var(--ease-out)]"
            style={{ animationDelay: "120ms" }}
          >
            <p className="text-[var(--color-primary-light)] text-xs mb-1.5">Onboarding</p>
            <p className="text-white text-xl font-semibold">{onboardingLabel}</p>
          </div>
        </div>
      </div>

      {/* Card grid — light surface, matches the rest of the dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((card, i) => {
          const content = (
            <div
              className={`
                group rounded-2xl border px-5 py-6 transition-[transform,border-color,box-shadow] duration-200
                ${
                  card.available
                    ? "bg-white border-black/[0.06] hover:-translate-y-1 hover:border-[var(--color-primary)]/40 hover:shadow-[0_8px_24px_rgba(130,36,227,0.12)] cursor-pointer"
                    : "bg-black/[0.02] border-dashed border-black/[0.08]"
                }
              `}
              style={{ transitionTimingFunction: "var(--ease-out)" }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={`w-6 h-6 ${card.available ? "text-[var(--color-primary)]" : "text-[var(--color-text-muted)]"}`}
              >
                {card.icon}
              </svg>
              <p
                className={`mt-4 text-sm font-medium ${
                  card.available ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-muted)]"
                }`}
              >
                {card.label}
              </p>
              {!card.available && (
                <span className="mt-1 inline-block text-[10px] font-medium text-[var(--color-primary)]">
                  Coming soon
                </span>
              )}
            </div>
          );

          return card.available ? (
            <Link key={card.label} href={card.href}>
              {content}
            </Link>
          ) : (
            <div key={card.label}>{content}</div>
          );
        })}
      </div>

      {/* Company pulse — preview only, see PulseCheckin.jsx */}
      <div className="rounded-2xl bg-white border border-black/[0.06] px-6 py-6 md:px-7 md:py-7">
        <p className="text-xs font-semibold tracking-wide text-[var(--color-primary)] uppercase mb-2">
          Company pulse
        </p>
        <h3 className="font-display text-lg font-semibold text-[var(--color-text-primary)] mb-4">
          How's your day going?
        </h3>
        <PulseCheckin
          profileId={user.id}
          companyId={profile?.company_id}
          initialMood={todaysCheckin?.mood ?? null}
        />
      </div>
    </div>
  );
}