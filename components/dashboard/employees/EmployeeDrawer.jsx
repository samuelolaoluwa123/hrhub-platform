"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/dashboard/ToastProvider";

const EMPLOYMENT_LEVELS = [
  { id: "entry", label: "Entry" },
  { id: "junior", label: "Junior" },
  { id: "mid", label: "Mid" },
  { id: "senior", label: "Senior" },
  { id: "lead", label: "Lead" },
  { id: "manager", label: "Manager" },
  { id: "director", label: "Director" },
  { id: "executive", label: "Executive" },
];

const EMPTY_FORM = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  job_title: "",
  department: "",
  team: "",
  employment_type: "full_time",
  employment_level: "",
  job_description: "",
  responsibilities: "",
  start_date: "",
  manager_id: "",
  birth_date: "",
  access_level: "employee",
};

export default function EmployeeDrawer({ open, onClose, onSaved, editingEmployee, companyId, employees, isAdmin, currentProfileId, statuses = [] }) {
  const supabase = createClient();
  const toast = useToast();
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Only an admin can change access level, only for someone who already
  // has portal access (a role only means something once there's a login
  // to attach it to), and never for their own row here — self-demotion
  // through this form is confusing UX; the last-admin safeguard is a DB
  // trigger regardless, but this keeps someone from locking themselves
  // out of admin-only pages mid-edit.
  const canEditAccessLevel =
    isAdmin && !!editingEmployee?.profile_id && editingEmployee.profile_id !== currentProfileId;

  // Reset (or populate, for edit) the form each time the drawer opens
  useEffect(() => {
    if (!open) return;
    setError(null);
    if (editingEmployee) {
      setForm({
        first_name: editingEmployee.first_name ?? "",
        last_name: editingEmployee.last_name ?? "",
        email: editingEmployee.email ?? "",
        phone: editingEmployee.phone ?? "",
        job_title: editingEmployee.job_title ?? "",
        department: editingEmployee.department ?? "",
        team: editingEmployee.team ?? "",
        employment_type: editingEmployee.employment_type ?? "full_time",
        employment_level: editingEmployee.employment_level ?? "",
        job_description: editingEmployee.job_description ?? "",
        responsibilities: editingEmployee.responsibilities ?? "",
        start_date: editingEmployee.start_date ?? "",
        manager_id: editingEmployee.manager_id ?? "",
        birth_date: editingEmployee.birth_date ?? "",
        access_level: editingEmployee.profiles?.role ?? "employee",
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [open, editingEmployee]);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);

    const { access_level, ...employeeFields } = form;
    const payload = {
      ...employeeFields,
      start_date: form.start_date || null,
      manager_id: form.manager_id || null,
      birth_date: form.birth_date || null,
      // employment_level has a fixed CHECK list — an empty string
      // isn't a valid value in it, only NULL or one of the levels.
      employment_level: form.employment_level || null,
      job_description: form.job_description.trim() || null,
      responsibilities: form.responsibilities.trim() || null,
    };

    // Phase 15 — real bug found while testing: this form never set
    // `status` on insert, so a brand-new employee fell through to the
    // employees table's own column default — a leftover literal
    // 'active' (lowercase) from before Phase 1.1 made statuses
    // per-company and capitalized. No company's real status list has
    // ever matched that literal since, so validate_employee_status()
    // rejected every single "Add employee" submission with "Invalid
    // employee status \"active\" for this company" — creating a new
    // employee from scratch has been completely broken. Same
    // first-active-headcount-status-with-'Active'-fallback logic
    // hire_candidate() already uses, so a new hire looks the same
    // regardless of which path created them.
    if (!editingEmployee) {
      const activeStatus = statuses
        .filter((s) => s.is_active_headcount && !s.is_exit)
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))[0];
      payload.status = activeStatus?.name ?? "Active";
    }

    // RLS enforces that only admin/manager can write here. On insert,
    // company_id must be set explicitly (it has no default) — omitting
    // it makes the row's company_id NULL, which fails the RLS check
    // rather than the row landing in the wrong company. On update, we
    // deliberately don't touch company_id — an edit should never be
    // able to move a record to a different tenant.
    let dbError;
    let conflict = false;

    if (editingEmployee) {
      // Phase 16 — "two admins edit the same employee at once": without
      // this, whoever saves second silently overwrites whoever saved
      // first with no warning at all. The row's own updated_at (bumped
      // by a DB trigger on every update, so it can't be spoofed by a
      // stale client) is captured when the drawer opened; the update
      // only applies if it still matches. If someone else's save has
      // already moved it, zero rows match — not an error, just nothing
      // written — and that's the signal to tell the admin their changes
      // weren't saved rather than let them believe they were.
      const { data: updated, error: updateError } = await supabase
        .from("employees")
        .update(payload)
        .eq("id", editingEmployee.id)
        .eq("updated_at", editingEmployee.updated_at)
        .select("id");
      dbError = updateError;
      if (!updateError && updated?.length === 0) conflict = true;

      // Access level lives on profiles, not employees — a separate write,
      // and only attempted if this drawer actually offered the control
      // and the value changed (avoids a no-op update tripping the
      // last-admin trigger on an unrelated field change).
      if (!dbError && !conflict && canEditAccessLevel && access_level !== (editingEmployee.profiles?.role ?? "employee")) {
        const { error: roleError } = await supabase
          .from("profiles")
          .update({ role: access_level })
          .eq("id", editingEmployee.profile_id);
        dbError = roleError;
      }
    } else {
      const { data: newEmployee, error: insertError } = await supabase
        .from("employees")
        .insert({ ...payload, company_id: companyId })
        .select("id")
        .single();
      dbError = insertError;

      if (!insertError && newEmployee) {
        await assignOnboardingChecklist(newEmployee.id, payload.department, companyId, supabase);
      }
    }

    setSaving(false);

    if (conflict) {
      setError(
        "Someone else updated this employee's record while you had it open, so your changes weren't saved. Close this, reopen it to see the latest version, and re-enter your changes."
      );
      return;
    }

    if (dbError) {
      // Phase 15 — employees_company_email_unique (added because a
      // duplicate employee/email was previously accepted with zero
      // rejection) surfaces as a raw Postgres constraint-violation
      // string by default; translated into the actual message this
      // situation calls for instead.
      setError(
        dbError.code === "23505"
          ? "An employee with this email already exists in your company."
          : dbError.message
      );
      return;
    }

    toast.showSuccess(editingEmployee ? "Employee updated successfully." : "Employee created successfully.");
    onSaved();
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/35 animate-[fadeIn_200ms_var(--ease-out)]"
        onClick={onClose}
      />
      <div className="absolute top-0 right-0 bottom-0 w-full max-w-[380px] bg-white p-7 overflow-y-auto shadow-2xl animate-[slideIn_280ms_var(--ease-out)]">
        <h2 className="font-display text-lg font-semibold text-[var(--color-text-primary)]">
          {editingEmployee ? "Edit employee" : "Add employee"}
        </h2>
        <p className="text-sm text-[var(--color-text-muted)] mt-1 mb-6">
          {editingEmployee ? "Update their details below." : "They'll be added to your company."}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="First name">
              <input
                required
                value={form.first_name}
                onChange={(e) => update("first_name", e.target.value)}
                placeholder="Ada"
                className={inputClass}
                onFocus={focusRing}
                onBlur={clearRing}
              />
            </Field>
            <Field label="Last name">
              <input
                required
                value={form.last_name}
                onChange={(e) => update("last_name", e.target.value)}
                placeholder="Obi"
                className={inputClass}
                onFocus={focusRing}
                onBlur={clearRing}
              />
            </Field>
          </div>

          <Field label="Email">
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              placeholder="ada@company.com"
              className={inputClass}
              onFocus={focusRing}
              onBlur={clearRing}
            />
          </Field>

          <Field label="Phone">
            <input
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
              placeholder="+234..."
              className={inputClass}
              onFocus={focusRing}
              onBlur={clearRing}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Job title">
              <input
                value={form.job_title}
                onChange={(e) => update("job_title", e.target.value)}
                placeholder="Product Designer"
                className={inputClass}
                onFocus={focusRing}
                onBlur={clearRing}
              />
            </Field>
            <Field label="Department">
              <input
                value={form.department}
                onChange={(e) => update("department", e.target.value)}
                placeholder="Design"
                className={inputClass}
                onFocus={focusRing}
                onBlur={clearRing}
              />
            </Field>
          </div>

          <Field label="Team">
            <input
              value={form.team}
              onChange={(e) => update("team", e.target.value)}
              placeholder="e.g. Design Systems (optional, narrower than department)"
              className={inputClass}
              onFocus={focusRing}
              onBlur={clearRing}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Employment type">
              <select
                value={form.employment_type}
                onChange={(e) => update("employment_type", e.target.value)}
                className={inputClass}
                onFocus={focusRing}
                onBlur={clearRing}
              >
                <option value="full_time">Full-time</option>
                <option value="part_time">Part-time</option>
                <option value="contract">Contract</option>
              </select>
            </Field>
            <Field label="Employment level">
              <select
                value={form.employment_level}
                onChange={(e) => update("employment_level", e.target.value)}
                className={inputClass}
                onFocus={focusRing}
                onBlur={clearRing}
              >
                <option value="">Not set</option>
                {EMPLOYMENT_LEVELS.map((l) => (
                  <option key={l.id} value={l.id}>{l.label}</option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Start date">
            <input
              type="date"
              value={form.start_date}
              onChange={(e) => update("start_date", e.target.value)}
              className={inputClass}
              onFocus={focusRing}
              onBlur={clearRing}
            />
          </Field>

          <Field label="Job description">
            <textarea
              value={form.job_description}
              onChange={(e) => update("job_description", e.target.value)}
              rows={3}
              placeholder="What this role is for, at a glance"
              className={inputClass}
              onFocus={focusRing}
              onBlur={clearRing}
            />
          </Field>

          <Field label="Responsibilities">
            <textarea
              value={form.responsibilities}
              onChange={(e) => update("responsibilities", e.target.value)}
              rows={4}
              placeholder="One per line works well"
              className={inputClass}
              onFocus={focusRing}
              onBlur={clearRing}
            />
          </Field>

          <Field label="Birthday">
            <input
              type="date"
              value={form.birth_date}
              onChange={(e) => update("birth_date", e.target.value)}
              className={inputClass}
              onFocus={focusRing}
              onBlur={clearRing}
            />
            <p className="text-[11px] text-[var(--color-text-muted)] mt-1">
              Only the month and day are ever shown to anyone — used for the birthday reminder on Overview.
            </p>
          </Field>

          <Field label="Manager">
            <select
              value={form.manager_id}
              onChange={(e) => update("manager_id", e.target.value)}
              className={inputClass}
              onFocus={focusRing}
              onBlur={clearRing}
            >
              <option value="">No manager</option>
              {employees
                .filter((emp) => emp.id !== editingEmployee?.id)
                .map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.first_name} {emp.last_name}
                  </option>
                ))}
            </select>
          </Field>

          {canEditAccessLevel && (
            <Field label="Access level">
              <select
                value={form.access_level}
                onChange={(e) => update("access_level", e.target.value)}
                className={inputClass}
                onFocus={focusRing}
                onBlur={clearRing}
              >
                <option value="employee">Employee</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
              <p className="text-[11px] text-[var(--color-text-muted)] mt-1">
                Controls what they can see and manage — Admin and Manager can access Payroll, Recruitment, and company-wide records.
              </p>
            </Field>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-black/10 rounded-lg py-2.5 text-sm font-medium text-[var(--color-text-muted)] hover:bg-black/[0.03] transition-colors duration-150"
              style={{ transitionTimingFunction: "var(--ease-out)" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-[1.4] rounded-lg py-2.5 text-sm font-medium text-white transition-transform duration-150 hover:scale-[1.02] active:scale-95 disabled:opacity-60"
              style={{
                backgroundColor: "var(--color-primary)",
                transitionTimingFunction: "var(--ease-out)",
              }}
            >
              {saving ? "Saving..." : editingEmployee ? "Save changes" : "Add employee"}
            </button>
          </div>
        </form>
      </div>

      <style jsx global>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}

const inputClass =
  "w-full border border-black/10 rounded-lg px-3 py-2 text-sm outline-none transition-shadow duration-150";

function focusRing(e) {
  e.target.style.boxShadow = "0 0 0 2px var(--color-accent)";
}
function clearRing(e) {
  e.target.style.boxShadow = "none";
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}

// Matches the new employee's department to a template of the same
// name (case-insensitive); falls back to whichever template is
// marked default. Silently does nothing if no template matches at
// all — that's a real possible outcome, not an error.
async function assignOnboardingChecklist(employeeId, department, companyId, supabase) {
  const { data: templates } = await supabase
    .from("onboarding_templates")
    .select("id, name, is_default")
    .eq("company_id", companyId);

  if (!templates?.length) return;

  const matched =
    templates.find((t) => t.name.toLowerCase() === (department || "").toLowerCase()) ||
    templates.find((t) => t.is_default);

  if (!matched) return;

  const { data: tasks } = await supabase
    .from("onboarding_tasks")
    .select("id")
    .eq("template_id", matched.id);

  if (!tasks?.length) return;

  await supabase.from("employee_onboarding").insert(
    tasks.map((task) => ({
      company_id: companyId,
      employee_id: employeeId,
      task_id: task.id,
      is_complete: false,
    }))
  );
}
