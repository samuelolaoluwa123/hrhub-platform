"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import UploadDocumentDrawer from "@/components/dashboard/documents/UploadDocumentDrawer";
import FieldRequirementDrawer from "./FieldRequirementDrawer";

function progressOf(requirements) {
  const total = requirements.length;
  const satisfied = requirements.filter((r) => r.is_satisfied).length;
  const pct = total ? Math.round((satisfied / total) * 100) : 0;
  const missing = requirements.filter((r) => r.is_required && !r.is_satisfied).map((r) => r.title);
  const complete = total > 0 && requirements.every((r) => !r.is_required || r.is_satisfied);
  return { total, satisfied, pct, missing, complete };
}

export default function OnboardingPage({
  canManage,
  myProfileId,
  myEmployeeId,
  myEmployee,
  myRequirements,
  teamProgress,
  templates,
  companyId,
  myName,
}) {
  const router = useRouter();
  const supabase = createClient();
  const [expandedEmployeeId, setExpandedEmployeeId] = useState(null);

  async function handleManualAssign(employeeId, templateId) {
    if (!templateId) return;

    const [{ data: tasks }, { data: existing }] = await Promise.all([
      supabase.from("onboarding_tasks").select("id").eq("template_id", templateId),
      supabase.from("employee_onboarding").select("task_id").eq("employee_id", employeeId),
    ]);

    if (!tasks?.length) {
      alert("This template has no requirements yet — add some under Manage templates first.");
      return;
    }

    const alreadyAssignedIds = new Set((existing ?? []).map((e) => e.task_id));
    const newTasks = tasks.filter((t) => !alreadyAssignedIds.has(t.id));

    if (newTasks.length === 0) {
      alert("This employee already has every requirement from this template.");
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

  const my = progressOf(myRequirements);

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
            <p className="text-[var(--color-text-muted)] text-sm mt-0.5">
              Requirements are confirmed automatically from real documents and data — not self-reported.
            </p>
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
                  const p = progressOf(emp.requirements);
                  const isExpanded = expandedEmployeeId === emp.id;
                  return (
                    <li key={emp.id} className="border-t border-black/[0.05] first:border-t-0">
                      <div className="flex items-center justify-between px-4 py-3 gap-3">
                        <button
                          onClick={() => setExpandedEmployeeId(isExpanded ? null : emp.id)}
                          className="text-sm text-[var(--color-text-primary)] text-left hover:underline min-w-0 truncate"
                        >
                          {emp.first_name} {emp.last_name}
                        </button>
                        <div className="flex items-center gap-2.5 shrink-0">
                          {p.total > 0 && (
                            <div className="flex items-center gap-2 w-28">
                              <div className="flex-1 h-1.5 bg-[var(--color-violet-tint)] rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-300"
                                  style={{
                                    width: `${p.pct}%`,
                                    backgroundColor: p.complete ? "#1a9c5f" : "var(--color-primary)",
                                  }}
                                />
                              </div>
                              <span className="text-xs text-[var(--color-text-muted)] w-9 text-right">{p.pct}%</span>
                            </div>
                          )}
                          {templates.length > 0 ? (
                            <select
                              defaultValue=""
                              onChange={(e) => handleManualAssign(emp.id, e.target.value)}
                              className="text-xs border border-black/10 rounded-md px-2 py-1.5 outline-none text-[var(--color-text-muted)]"
                            >
                              <option value="" disabled>
                                {p.total === 0 ? "Assign a template..." : "Add requirements..."}
                              </option>
                              {templates.map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            p.total === 0 && <span className="text-xs text-[var(--color-text-muted)]">No templates yet</span>
                          )}
                        </div>
                      </div>
                      {p.total > 0 && !p.complete && p.missing.length > 0 && !isExpanded && (
                        <p className="text-xs text-[var(--color-text-muted)] px-4 pb-3 -mt-1.5">
                          Missing: {p.missing.join(", ")}
                        </p>
                      )}
                      {isExpanded && (
                        <div className="px-4 pb-3 -mt-1">
                          <RequirementsList
                            requirements={emp.requirements}
                            employeeId={emp.id}
                            companyId={companyId}
                            canMarkManual
                            onChanged={() => router.refresh()}
                          />
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}

      {myEmployeeId && (
        <div>
          <p className="font-mono text-[10.5px] tracking-wide uppercase text-[var(--color-accent)] mb-1">Your checklist</p>
          <div className="flex items-center justify-between mb-3">
            <p className="font-display text-base font-semibold text-[var(--color-text-primary)]">My onboarding</p>
            {my.total > 0 && (
              <span
                className={`text-xs font-medium px-2.5 py-1 rounded-md ${
                  my.complete ? "bg-[#e8f9f0] text-[#1a9c5f]" : "bg-[var(--color-violet-tint)] text-[var(--color-primary)]"
                }`}
              >
                {my.complete ? "Onboarding complete" : `${my.total - my.satisfied} requirement${my.total - my.satisfied === 1 ? "" : "s"} remaining`}
              </span>
            )}
          </div>
          <div className="bg-white border border-black/[0.06] rounded-2xl overflow-hidden">
            {myRequirements.length === 0 ? (
              <p className="text-center py-9 text-sm text-[var(--color-text-muted)]">
                No onboarding requirements assigned to you yet.
              </p>
            ) : (
              <>
                <div className="px-4 py-3 border-b border-black/[0.05] flex items-center gap-3">
                  <div className="flex-1 h-1.5 bg-[var(--color-violet-tint)] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${my.pct}%`, backgroundColor: my.complete ? "#1a9c5f" : "var(--color-primary)" }}
                    />
                  </div>
                  <span className="text-xs text-[var(--color-text-muted)] font-mono">
                    {my.satisfied}/{my.total} · {my.pct}%
                  </span>
                </div>
                <div className="p-4">
                  <RequirementsList
                    requirements={myRequirements}
                    employeeId={myEmployeeId}
                    companyId={companyId}
                    profileId={myProfileId}
                    currentValues={myEmployee}
                    canSubmitDocuments
                    canSubmitFields
                    onChanged={() => router.refresh()}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Shared between "my onboarding" (self, can submit documents/fields) and
// the admin team view (can only confirm manual, undigitizable items —
// never document/field ones, which are never directly toggleable by
// anyone, they're only ever true when the real data is).
function RequirementsList({ requirements, employeeId, companyId, profileId, currentValues, canSubmitDocuments, canSubmitFields, canMarkManual, onChanged }) {
  const supabase = createClient();
  const [uploadTarget, setUploadTarget] = useState(null);
  const [fieldTarget, setFieldTarget] = useState(null);

  async function toggleManual(taskId, current) {
    await supabase
      .from("employee_onboarding")
      .update({ is_complete: !current, completed_at: !current ? new Date().toISOString() : null })
      .eq("employee_id", employeeId)
      .eq("task_id", taskId);
    onChanged();
  }

  return (
    <>
      <ul className="space-y-1.5">
        {requirements.map((r) => (
          <li
            key={r.task_id}
            className="flex items-center justify-between gap-3 bg-[var(--color-violet-tint)] rounded-lg px-3 py-2.5"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-[var(--color-text-primary)] truncate">{r.title}</span>
                {!r.is_required && (
                  <span className="text-[10px] font-medium text-[var(--color-text-muted)] bg-white px-1.5 py-0.5 rounded">
                    Optional
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {r.is_satisfied ? (
                <span className="text-[11px] font-medium text-[#1a9c5f] bg-[#e8f9f0] px-2 py-1 rounded-md flex items-center gap-1">
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  {r.verification_type === "manual" ? "Confirmed" : "Verified"}
                </span>
              ) : r.verification_type === "document" && canSubmitDocuments ? (
                <button
                  onClick={() => setUploadTarget(r)}
                  className="text-[11px] font-medium text-white bg-[var(--color-primary)] px-2.5 py-1.5 rounded-md hover:scale-[1.03] transition-transform duration-150"
                >
                  Upload
                </button>
              ) : r.verification_type === "field" && canSubmitFields ? (
                <button
                  onClick={() => setFieldTarget(r)}
                  className="text-[11px] font-medium text-white bg-[var(--color-primary)] px-2.5 py-1.5 rounded-md hover:scale-[1.03] transition-transform duration-150"
                >
                  Fill in
                </button>
              ) : r.verification_type === "manual" && canMarkManual ? (
                <button
                  onClick={() => toggleManual(r.task_id, false)}
                  className="text-[11px] font-medium text-[var(--color-primary)] bg-white border border-[var(--color-primary)]/30 px-2.5 py-1.5 rounded-md hover:bg-[var(--color-primary)] hover:text-white transition-colors duration-150"
                >
                  Mark complete
                </button>
              ) : (
                <span className="text-[11px] font-medium text-[var(--color-text-muted)] bg-white px-2 py-1 rounded-md">
                  {r.verification_type === "manual" ? "Awaiting HR" : "Not yet"}
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>

      {canSubmitDocuments && (
        <UploadDocumentDrawer
          open={!!uploadTarget}
          onClose={() => setUploadTarget(null)}
          onSaved={onChanged}
          canManage={false}
          employees={[]}
          employeeId={employeeId}
          companyId={companyId}
          profileId={profileId}
          lockedDocType={uploadTarget?.document_type}
        />
      )}

      {canSubmitFields && (
        <FieldRequirementDrawer
          open={!!fieldTarget}
          onClose={() => setFieldTarget(null)}
          onSaved={onChanged}
          employeeId={employeeId}
          fieldGroup={fieldTarget?.field_group}
          currentValues={currentValues}
        />
      )}
    </>
  );
}
