"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AddPlanDrawer from "./AddPlanDrawer";

export const CATEGORY_LABEL = {
  health: "Health",
  dental: "Dental",
  vision: "Vision",
  life: "Life insurance",
  retirement: "Retirement",
  other: "Other",
};

function formatCost(value) {
  const n = Number(value || 0);
  if (n === 0) return "No cost to you";
  return `₦${n.toLocaleString()}/mo`;
}

export default function BenefitsPage({ canManage, employeeId, companyId, plans, myEnrollments, enrolledCountByPlan }) {
  const router = useRouter();
  const supabase = createClient();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [actingOn, setActingOn] = useState(null);
  const [error, setError] = useState(null);

  const enrollmentByPlan = {};
  myEnrollments.forEach((e) => (enrollmentByPlan[e.plan_id] = e));

  async function handleEnroll(plan) {
    setActingOn(plan.id);
    setError(null);

    const existing = enrollmentByPlan[plan.id];
    const { error: dbError } = existing
      ? await supabase.from("benefit_enrollments").update({ status: "enrolled" }).eq("id", existing.id)
      : await supabase.from("benefit_enrollments").insert({
          employee_id: employeeId,
          company_id: companyId,
          plan_id: plan.id,
          status: "enrolled",
        });

    setActingOn(null);
    if (dbError) {
      setError(dbError.message);
      return;
    }
    router.refresh();
  }

  async function handleOptOut(plan) {
    setActingOn(plan.id);
    setError(null);

    const existing = enrollmentByPlan[plan.id];
    const { error: dbError } = await supabase
      .from("benefit_enrollments")
      .update({ status: "declined" })
      .eq("id", existing.id);

    setActingOn(null);
    if (dbError) {
      setError(dbError.message);
      return;
    }
    router.refresh();
  }

  async function handleToggleActive(plan) {
    setActingOn(plan.id);
    setError(null);

    const { error: dbError } = await supabase
      .from("benefit_plans")
      .update({ is_active: !plan.is_active })
      .eq("id", plan.id);

    setActingOn(null);
    if (dbError) {
      setError(dbError.message);
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <div className="flex flex-wrap justify-between items-start gap-3 mb-7">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--color-violet-tint)] flex items-center justify-center shrink-0">
            <svg className="w-[19px] h-[19px] text-[var(--color-primary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 21s-7-4.5-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6c-2.5 4.5-9.5 9-9.5 9Z" />
            </svg>
          </div>
          <div>
            <h1 className="font-display text-2xl font-semibold text-[var(--color-text-primary)]">Benefits</h1>
            <p className="text-[var(--color-text-muted)] text-sm mt-0.5">
              {canManage ? "Manage the plans your company offers." : "Review and manage your enrollment."}
            </p>
          </div>
        </div>
        {canManage && (
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-transform duration-150 hover:scale-[1.03] active:scale-95"
            style={{ backgroundColor: "var(--color-primary)", transitionTimingFunction: "var(--ease-out)" }}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Add plan
          </button>
        )}
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {plans.length === 0 ? (
        <div className="rounded-2xl bg-black/[0.02] border border-dashed border-black/[0.08] px-6 py-9 text-center">
          <p className="text-sm text-[var(--color-text-muted)]">
            {canManage ? "No plans yet — add one to get started." : "No benefits are being offered yet."}
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map((plan, i) => {
            const enrollment = enrollmentByPlan[plan.id];
            const status = enrollment?.status ?? "not_enrolled";

            return (
              <div
                key={plan.id}
                className={`rounded-2xl border px-5 py-5 bg-white ${plan.is_active ? "border-black/[0.06]" : "border-dashed border-black/[0.1] opacity-60"}`}
                style={{ animation: `fadeUp 400ms var(--ease-out) ${i * 0.05}s both` }}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <p className="font-display text-base font-semibold text-[var(--color-text-primary)]">{plan.name}</p>
                  <span className="shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full bg-[var(--color-violet-tint)] text-[var(--color-primary)]">
                    {CATEGORY_LABEL[plan.category] ?? plan.category}
                  </span>
                </div>
                {plan.provider && <p className="text-xs text-[var(--color-text-muted)] mb-1">{plan.provider}</p>}
                {plan.description && (
                  <p className="text-xs text-[var(--color-text-muted)] mb-3 line-clamp-2">{plan.description}</p>
                )}
                <p className="text-sm font-medium text-[var(--color-text-primary)] mb-4">{formatCost(plan.employee_monthly_cost)}</p>

                {!plan.is_active && (
                  <p className="text-xs text-[var(--color-text-muted)] mb-3">No longer offered.</p>
                )}

                <div className="flex items-center gap-2">
                  {employeeId && plan.is_active && (
                    status === "enrolled" ? (
                      <>
                        <span className="text-xs font-medium px-2.5 py-1.5 rounded-md bg-[#e8f9f0] text-[#1a9c5f]">Enrolled</span>
                        <button
                          onClick={() => handleOptOut(plan)}
                          disabled={actingOn === plan.id}
                          className="text-xs font-medium px-3 py-1.5 rounded-md bg-black/[0.04] text-[var(--color-text-muted)] hover:bg-black/[0.08] transition-colors duration-150 disabled:opacity-50"
                          style={{ transitionTimingFunction: "var(--ease-out)" }}
                        >
                          Opt out
                        </button>
                      </>
                    ) : (
                      <>
                        {status === "declined" && (
                          <span className="text-xs font-medium px-2.5 py-1.5 rounded-md bg-black/[0.04] text-[var(--color-text-muted)]">Opted out</span>
                        )}
                        <button
                          onClick={() => handleEnroll(plan)}
                          disabled={actingOn === plan.id}
                          className="text-xs font-medium px-3 py-1.5 rounded-md bg-[var(--color-violet-tint)] text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white transition-colors duration-150 disabled:opacity-50"
                          style={{ transitionTimingFunction: "var(--ease-out)" }}
                        >
                          Enroll
                        </button>
                      </>
                    )
                  )}
                  {canManage && (
                    <button
                      onClick={() => handleToggleActive(plan)}
                      disabled={actingOn === plan.id}
                      className="ml-auto text-xs font-medium px-3 py-1.5 rounded-md border border-black/10 text-[var(--color-text-muted)] hover:bg-black/[0.03] transition-colors duration-150 disabled:opacity-50"
                      style={{ transitionTimingFunction: "var(--ease-out)" }}
                    >
                      {plan.is_active ? "Deactivate" : "Reactivate"}
                    </button>
                  )}
                </div>

                {canManage && (
                  <p className="mt-3 text-[10.5px] text-[var(--color-text-muted)]">
                    {enrolledCountByPlan[plan.id] ?? 0} enrolled
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {canManage && (
        <AddPlanDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          onSaved={() => router.refresh()}
          companyId={companyId}
        />
      )}

      <style jsx global>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
