"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import GoalDrawer from "./GoalDrawer";
import CycleDrawer from "./CycleDrawer";
import SelfAssessmentDrawer from "./SelfAssessmentDrawer";
import ManagerReviewDrawer from "./ManagerReviewDrawer";

const GOAL_STATUS_BADGE = {
  not_started: "bg-[#f3f2f5] text-[#706f83]",
  in_progress: "bg-[#fef3e2] text-[#d68a1f]",
  completed: "bg-[#e8f9f0] text-[#1a9c5f]",
  cancelled: "bg-[#fde8e8] text-[#cc3333]",
};
const GOAL_STATUS_LABEL = { not_started: "Not started", in_progress: "In progress", completed: "Completed", cancelled: "Cancelled" };

const REVIEW_STATUS_BADGE = {
  not_started: "bg-[#f3f2f5] text-[#706f83]",
  self_assessment_submitted: "bg-[#fef3e2] text-[#d68a1f]",
  completed: "bg-[#e8f9f0] text-[#1a9c5f]",
};
const REVIEW_STATUS_LABEL = { not_started: "Not started", self_assessment_submitted: "Awaiting manager", completed: "Completed" };

const CYCLE_TYPE_LABEL = { quarterly: "Quarterly", annual: "Annual", probation: "Probation", custom: "Custom" };

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function PerformancePage({
  canManage,
  employeeId,
  companyId,
  myGoals,
  teamGoals,
  cycles,
  myReviews,
  teamReviews,
  employees,
  profileId,
}) {
  const router = useRouter();
  const supabase = createClient();

  const [goalDrawerOpen, setGoalDrawerOpen] = useState(false);
  const [cycleDrawerOpen, setCycleDrawerOpen] = useState(false);
  const [selfDrawerCycle, setSelfDrawerCycle] = useState(null);
  const [managerDrawer, setManagerDrawer] = useState(null); // { cycle, employee, review }
  const [selectedCycleId, setSelectedCycleId] = useState(cycles[0]?.id ?? "");
  const [updatingGoal, setUpdatingGoal] = useState(null);

  const myReviewByCycle = useMemo(() => {
    const map = {};
    myReviews.forEach((r) => (map[r.cycle_id] = r));
    return map;
  }, [myReviews]);

  const visibleCyclesForEmployee = cycles.filter(
    (c) => c.status === "open" || myReviewByCycle[c.id]
  );

  const teamReviewsForSelectedCycle = teamReviews.filter((r) => r.cycle_id === selectedCycleId);
  const reviewByEmployeeId = {};
  teamReviewsForSelectedCycle.forEach((r) => (reviewByEmployeeId[r.employee_id] = r));

  async function handleGoalStatusChange(goal, status) {
    setUpdatingGoal(goal.id);
    await supabase.from("performance_goals").update({ status, updated_at: new Date().toISOString() }).eq("id", goal.id);
    setUpdatingGoal(null);
    router.refresh();
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-7">
        <div className="w-10 h-10 rounded-xl bg-[var(--color-violet-tint)] flex items-center justify-center shrink-0">
          <svg className="w-[19px] h-[19px] text-[var(--color-primary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 3v18h18M7 15l4-4 3 3 5-6" />
          </svg>
        </div>
        <div>
          <h1 className="font-display text-2xl font-semibold text-[var(--color-text-primary)]">Performance</h1>
          <p className="text-[var(--color-text-muted)] text-sm mt-0.5">
            {canManage ? "Goals, review cycles, and your team's progress." : "Your goals and performance reviews."}
          </p>
        </div>
      </div>

      {/* My goals */}
      <Section
        eyebrow="Set by you"
        title="My goals"
        action={
          employeeId && (
            <button onClick={() => setGoalDrawerOpen(true)} className="text-xs font-medium px-3 py-1.5 rounded-md bg-[var(--color-primary)] text-white hover:scale-[1.03] transition-transform duration-150" style={{ transitionTimingFunction: "var(--ease-out)" }}>
              + Add goal
            </button>
          )
        }
      >
        {!employeeId ? (
          <EmptyRow text="You're not linked to an employee record yet." />
        ) : myGoals.length === 0 ? (
          <EmptyRow text="No goals yet — add one to start tracking." />
        ) : (
          <div className="divide-y divide-black/[0.05]">
            {myGoals.map((g, i) => (
              <div key={g.id} className="px-5 py-4 flex flex-wrap items-center justify-between gap-3" style={{ animation: `rowIn 400ms var(--ease-out) ${i * 0.05}s both` }}>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--color-text-primary)]">{g.title}</p>
                  {g.description && <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{g.description}</p>}
                  {g.target_date && <p className="text-[11px] font-mono text-[var(--color-text-muted)] mt-1">Target: {formatDate(g.target_date)}</p>}
                </div>
                <select
                  value={g.status}
                  disabled={updatingGoal === g.id}
                  onChange={(e) => handleGoalStatusChange(g, e.target.value)}
                  className={`text-xs font-medium px-2.5 py-1.5 rounded-md border-0 outline-none disabled:opacity-50 ${GOAL_STATUS_BADGE[g.status]}`}
                >
                  {Object.entries(GOAL_STATUS_LABEL).map(([id, label]) => (
                    <option key={id} value={id}>{label}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Team goals (oversight only, admin/manager) */}
      {canManage && (
        <Section eyebrow="Oversight" title="Team goals" count={teamGoals.length}>
          {teamGoals.length === 0 ? (
            <EmptyRow text="No one has set a goal yet." />
          ) : (
            <table className="w-full text-sm min-w-[520px]">
              <thead>
                <tr className="text-left text-[10.5px] font-semibold tracking-wide uppercase text-[#9089a0]">
                  <th className="py-3.5 px-3.5">Employee</th>
                  <th className="py-3.5 px-3.5">Goal</th>
                  <th className="py-3.5 px-3.5">Target</th>
                  <th className="py-3.5 px-3.5">Status</th>
                </tr>
              </thead>
              <tbody>
                {teamGoals.map((g) => (
                  <tr key={g.id} className="border-t border-black/[0.05]">
                    <td className="py-3.5 px-3.5">{g.employees ? `${g.employees.first_name} ${g.employees.last_name}` : "—"}</td>
                    <td className="py-3.5 px-3.5 text-[var(--color-text-muted)]">{g.title}</td>
                    <td className="py-3.5 px-3.5 font-mono text-xs text-[var(--color-text-muted)]">{formatDate(g.target_date)}</td>
                    <td className="py-3.5 px-3.5">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-md ${GOAL_STATUS_BADGE[g.status]}`}>{GOAL_STATUS_LABEL[g.status]}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>
      )}

      {/* My reviews */}
      {employeeId && (
        <Section eyebrow="Cycle-based" title="My reviews">
          {visibleCyclesForEmployee.length === 0 ? (
            <EmptyRow text="No review cycle has been opened yet." />
          ) : (
            <div className="divide-y divide-black/[0.05]">
              {visibleCyclesForEmployee.map((cycle, i) => {
                const review = myReviewByCycle[cycle.id];
                const status = review?.status ?? "not_started";
                return (
                  <div key={cycle.id} className="px-5 py-4 flex flex-wrap items-center justify-between gap-3" style={{ animation: `rowIn 400ms var(--ease-out) ${i * 0.05}s both` }}>
                    <div>
                      <p className="text-sm font-medium text-[var(--color-text-primary)]">{cycle.name}</p>
                      <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                        {CYCLE_TYPE_LABEL[cycle.cycle_type]} &middot; {formatDate(cycle.start_date)} – {formatDate(cycle.end_date)}
                      </p>
                      {review?.rating && (
                        <p className="text-xs text-[var(--color-primary)] mt-1 font-medium">Rating: {review.rating}/5</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-md ${REVIEW_STATUS_BADGE[status]}`}>{REVIEW_STATUS_LABEL[status]}</span>
                      {cycle.status === "open" && status !== "completed" && (
                        <button
                          onClick={() => setSelfDrawerCycle({ cycle, review })}
                          className="text-xs font-medium px-3 py-1.5 rounded-md bg-[var(--color-violet-tint)] text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white transition-colors duration-150"
                          style={{ transitionTimingFunction: "var(--ease-out)" }}
                        >
                          {status === "not_started" ? "Start self-assessment" : "Edit"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Section>
      )}

      {/* Review cycles + team review management */}
      {canManage && (
        <Section
          eyebrow="Admin"
          title="Review cycles"
          action={
            <button onClick={() => setCycleDrawerOpen(true)} className="text-xs font-medium px-3 py-1.5 rounded-md bg-[var(--color-primary)] text-white hover:scale-[1.03] transition-transform duration-150" style={{ transitionTimingFunction: "var(--ease-out)" }}>
              + New cycle
            </button>
          }
        >
          {cycles.length === 0 ? (
            <EmptyRow text="No cycles yet — create one to start collecting reviews." />
          ) : (
            <div className="px-5 py-4 space-y-4">
              <select
                value={selectedCycleId}
                onChange={(e) => setSelectedCycleId(e.target.value)}
                className="border border-black/10 rounded-lg px-3 py-2 text-sm outline-none"
              >
                {cycles.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} &middot; {CYCLE_TYPE_LABEL[c.cycle_type]} &middot; {c.status}
                  </option>
                ))}
              </select>

              {employees.length === 0 ? (
                <EmptyRow text="No employees yet." />
              ) : (
                <table className="w-full text-sm min-w-[520px]">
                  <thead>
                    <tr className="text-left text-[10.5px] font-semibold tracking-wide uppercase text-[#9089a0]">
                      <th className="py-2.5">Employee</th>
                      <th className="py-2.5">Status</th>
                      <th className="py-2.5">Rating</th>
                      <th className="py-2.5"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((emp) => {
                      const review = reviewByEmployeeId[emp.id];
                      const status = review?.status ?? "not_started";
                      return (
                        <tr key={emp.id} className="border-t border-black/[0.05]">
                          <td className="py-2.5">{emp.first_name} {emp.last_name}</td>
                          <td className="py-2.5">
                            <span className={`text-xs font-medium px-2.5 py-1 rounded-md ${REVIEW_STATUS_BADGE[status]}`}>{REVIEW_STATUS_LABEL[status]}</span>
                          </td>
                          <td className="py-2.5 text-[var(--color-text-muted)]">{review?.rating ? `${review.rating}/5` : "—"}</td>
                          <td className="py-2.5 text-right">
                            <button
                              onClick={() => setManagerDrawer({ cycleId: selectedCycleId, employee: emp, review })}
                              className="text-xs font-medium px-3 py-1.5 rounded-md bg-[var(--color-violet-tint)] text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white transition-colors duration-150"
                              style={{ transitionTimingFunction: "var(--ease-out)" }}
                            >
                              Review
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </Section>
      )}

      {employeeId && (
        <GoalDrawer
          open={goalDrawerOpen}
          onClose={() => setGoalDrawerOpen(false)}
          onSaved={() => router.refresh()}
          employeeId={employeeId}
          companyId={companyId}
          profileId={profileId}
        />
      )}

      {canManage && (
        <CycleDrawer
          open={cycleDrawerOpen}
          onClose={() => setCycleDrawerOpen(false)}
          onSaved={() => router.refresh()}
          companyId={companyId}
        />
      )}

      {selfDrawerCycle && (
        <SelfAssessmentDrawer
          open={Boolean(selfDrawerCycle)}
          onClose={() => setSelfDrawerCycle(null)}
          onSaved={() => router.refresh()}
          cycle={selfDrawerCycle.cycle}
          review={selfDrawerCycle.review}
          employeeId={employeeId}
          companyId={companyId}
        />
      )}

      {managerDrawer && (
        <ManagerReviewDrawer
          open={Boolean(managerDrawer)}
          onClose={() => setManagerDrawer(null)}
          onSaved={() => router.refresh()}
          cycleId={managerDrawer.cycleId}
          employee={managerDrawer.employee}
          review={managerDrawer.review}
          companyId={companyId}
        />
      )}

      <style jsx global>{`
        @keyframes rowIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

function Section({ eyebrow, title, count, action, children }) {
  return (
    <div className="mb-7">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="font-mono text-[10.5px] tracking-wide uppercase text-[var(--color-accent)] mb-1">{eyebrow}</p>
          <p className="font-display text-base font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
            {title}
            {count > 0 && (
              <span className="font-sans text-[11px] font-semibold bg-[#fef3e2] text-[#d68a1f] px-2 py-0.5 rounded-full">{count}</span>
            )}
          </p>
        </div>
        {action}
      </div>
      <div className="bg-white border border-black/[0.06] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">{children}</div>
      </div>
    </div>
  );
}

function EmptyRow({ text }) {
  return <p className="text-center py-9 text-sm text-[var(--color-text-muted)]">{text}</p>;
}
