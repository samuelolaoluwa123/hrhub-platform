"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { sendNotificationEmail } from "@/lib/sendNotificationEmail";

export default function OnboardingPage({ canManage, myTasks, teamProgress, templates, companyId, myName }) {
  const router = useRouter();
  const supabase = createClient();

  async function handleManualAssign(employeeId, templateId) {
    if (!templateId) return;

    const [{ data: tasks }, { data: existing }] = await Promise.all([
      supabase.from("onboarding_tasks").select("id").eq("template_id", templateId),
      supabase.from("employee_onboarding").select("task_id").eq("employee_id", employeeId),
    ]);

    if (!tasks?.length) {
      alert("This template has no tasks yet — add some under Manage templates first.");
      return;
    }

    const alreadyAssignedIds = new Set((existing ?? []).map((e) => e.task_id));
    const newTasks = tasks.filter((t) => !alreadyAssignedIds.has(t.id));

    if (newTasks.length === 0) {
      alert("This employee already has every task from this template.");
      return;
    }

    await supabase.from("employee_onboarding").insert(
      newTasks.map((task) => ({
        company_id: companyId,
        employee_id: employeeId,
        task_id: task.id,
        is_complete: false,
      }))
    );

    router.refresh();
  }

  async function toggleTask(taskRowId, currentValue) {
    const newValue = !currentValue;

    await supabase
      .from("employee_onboarding")
      .update({ is_complete: newValue, completed_at: newValue ? new Date().toISOString() : null })
      .eq("id", taskRowId);

    // Only fires the moment the LAST remaining task gets checked —
    // every other task must already be complete for this to be true.
    if (newValue) {
      const justFinished = myTasks
        .filter((t) => t.id !== taskRowId)
        .every((t) => t.is_complete);

      if (justFinished) {
        const { data: approvers } = await supabase
          .from("profiles")
          .select("id, email")
          .eq("company_id", companyId)
          .in("role", ["admin", "manager"]);

        if (approvers?.length) {
          await supabase.from("notifications").insert(
            approvers.map((a) => ({
              company_id: companyId,
              profile_id: a.id,
              message: `${myName} completed their onboarding checklist.`,
              link: "/dashboard/onboarding",
            }))
          );

          approvers.forEach((a) =>
            sendNotificationEmail({
              to: a.email,
              subject: `${myName} completed onboarding`,
              message: `${myName} has finished every task on their onboarding checklist.`,
              link: "/dashboard/onboarding",
            })
          );
        }
      }
    }

    router.refresh();
  }

  const myCompleteCount = myTasks.filter((t) => t.is_complete).length;
  const myProgressPct = myTasks.length ? Math.round((myCompleteCount / myTasks.length) * 100) : 0;

  return (
    <div>
      <div className="flex flex-wrap justify-between items-start gap-3 mb-7">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--color-violet-tint)] flex items-center justify-center shrink-0">
            <svg className="w-[19px] h-[19px] text-[var(--color-primary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
          </div>
          <div>
            <h1 className="font-display text-2xl font-semibold text-[var(--color-text-primary)]">Onboarding</h1>
            <p className="text-[var(--color-text-muted)] text-sm mt-0.5">Checklists for getting new hires started.</p>
          </div>
        </div>
        {canManage && (
          <Link
            href="/dashboard/onboarding/templates"
            className="text-sm font-medium px-4 py-2.5 rounded-lg border border-black/10 text-[var(--color-text-muted)] hover:bg-black/[0.03] transition-colors duration-150"
            style={{ transitionTimingFunction: "var(--ease-out)" }}
          >
            Manage templates
          </Link>
        )}
      </div>

      {canManage && (
        <div className="mb-7">
          <p className="font-mono text-[10.5px] tracking-wide uppercase text-[var(--color-accent)] mb-1">Team</p>
          <p className="font-display text-base font-semibold text-[var(--color-text-primary)] mb-3">Onboarding progress</p>
          <div className="bg-white border border-black/[0.06] rounded-2xl overflow-hidden">
            {teamProgress.length === 0 ? (
              <p className="text-center py-9 text-sm text-[var(--color-text-muted)]">No active employees yet.</p>
            ) : (
              <ul>
                {teamProgress.map((emp) => {
                  const tasks = emp.employee_onboarding ?? [];
                  const done = tasks.filter((t) => t.is_complete).length;
                  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : null;
                  return (
                    <li key={emp.id} className="flex items-center justify-between px-4 py-3 border-t border-black/[0.05] first:border-t-0">
                      <span className="text-sm text-[var(--color-text-primary)]">
                        {emp.first_name} {emp.last_name}
                      </span>
                      <div className="flex items-center gap-2.5">
                        {pct !== null && (
                          <div className="flex items-center gap-2 w-28">
                            <div className="flex-1 h-1.5 bg-[var(--color-violet-tint)] rounded-full overflow-hidden">
                              <div
                                className="h-full bg-[var(--color-primary)] rounded-full transition-all duration-300"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-xs text-[var(--color-text-muted)] w-9 text-right">{pct}%</span>
                          </div>
                        )}
                        {templates.length > 0 ? (
                          <select
                            defaultValue=""
                            onChange={(e) => handleManualAssign(emp.id, e.target.value)}
                            className="text-xs border border-black/10 rounded-md px-2 py-1.5 outline-none text-[var(--color-text-muted)]"
                          >
                            <option value="" disabled>
                              {pct === null ? "Assign a template..." : "Add tasks..."}
                            </option>
                            {templates.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          pct === null && (
                            <span className="text-xs text-[var(--color-text-muted)]">No templates yet</span>
                          )
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}

      <div>
        <p className="font-mono text-[10.5px] tracking-wide uppercase text-[var(--color-accent)] mb-1">Your checklist</p>
        <p className="font-display text-base font-semibold text-[var(--color-text-primary)] mb-3">My onboarding</p>
        <div className="bg-white border border-black/[0.06] rounded-2xl overflow-hidden">
          {myTasks.length === 0 ? (
            <p className="text-center py-9 text-sm text-[var(--color-text-muted)]">
              No onboarding checklist assigned to you.
            </p>
          ) : (
            <>
              <div className="px-4 py-3 border-b border-black/[0.05] flex items-center gap-3">
                <div className="flex-1 h-1.5 bg-[var(--color-violet-tint)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[var(--color-primary)] rounded-full transition-all duration-300"
                    style={{ width: `${myProgressPct}%` }}
                  />
                </div>
                <span className="text-xs text-[var(--color-text-muted)] font-mono">
                  {myCompleteCount}/{myTasks.length}
                </span>
              </div>
              <ul>
                {myTasks.map((t) => (
                  <li key={t.id} className="flex items-center gap-3 px-4 py-3 border-t border-black/[0.05] first:border-t-0">
                    <input
                      type="checkbox"
                      checked={t.is_complete}
                      onChange={() => toggleTask(t.id, t.is_complete)}
                      className="accent-[var(--color-primary)] w-4 h-4"
                    />
                    <span
                      className={`text-sm ${
                        t.is_complete ? "text-[var(--color-text-muted)] line-through" : "text-[var(--color-text-primary)]"
                      }`}
                    >
                      {t.onboarding_tasks.title}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
