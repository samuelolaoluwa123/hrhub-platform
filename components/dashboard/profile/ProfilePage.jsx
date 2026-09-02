"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import EmployeeAvatar from "@/components/dashboard/EmployeeAvatar";

const EMPLOYMENT_LABEL = { full_time: "Full-time", part_time: "Part-time", contract: "Contract" };
const ROLE_LABEL = { admin: "Admin", manager: "Manager", employee: "Employee" };
const LEVEL_LABEL = {
  entry: "Entry", junior: "Junior", mid: "Mid", senior: "Senior",
  lead: "Lead", manager: "Manager", director: "Director", executive: "Executive",
};

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function Field({ label, value }) {
  return (
    <div>
      <p className="text-[10.5px] font-semibold tracking-wide uppercase text-[#9089a0] mb-1">{label}</p>
      <p className="text-sm text-[var(--color-text-primary)]">{value || "—"}</p>
    </div>
  );
}

const inputClass = "w-full border border-black/10 rounded-lg px-3 py-2 text-sm outline-none transition-shadow duration-150";
const focusRing = (e) => (e.target.style.boxShadow = "0 0 0 2px var(--color-accent)");
const clearRing = (e) => (e.target.style.boxShadow = "none");

export default function ProfilePage({ profile, employee }) {
  const router = useRouter();
  const supabase = createClient();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    phone: employee?.phone ?? "",
    address: employee?.address ?? "",
    emergency_contact_name: employee?.emergency_contact_name ?? "",
    emergency_contact_phone: employee?.emergency_contact_phone ?? "",
    emergency_contact_relationship: employee?.emergency_contact_relationship ?? "",
  });

  const fullName = profile?.full_name || (employee ? `${employee.first_name} ${employee.last_name}` : "—");

  function openEdit() {
    setForm({
      phone: employee?.phone ?? "",
      address: employee?.address ?? "",
      emergency_contact_name: employee?.emergency_contact_name ?? "",
      emergency_contact_phone: employee?.emergency_contact_phone ?? "",
      emergency_contact_relationship: employee?.emergency_contact_relationship ?? "",
    });
    setError(null);
    setEditing(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    // RLS + a trigger scope this to exactly these columns on the
    // caller's own row — job title, status, salary, etc. aren't
    // reachable through this path even if someone tried.
    const { error: dbError } = await supabase
      .from("employees")
      .update({
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
        emergency_contact_name: form.emergency_contact_name.trim() || null,
        emergency_contact_phone: form.emergency_contact_phone.trim() || null,
        emergency_contact_relationship: form.emergency_contact_relationship.trim() || null,
      })
      .eq("id", employee.id);

    setSaving(false);

    if (dbError) {
      setError(dbError.message);
      return;
    }

    setEditing(false);
    router.refresh();
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-7">
        <div className="w-10 h-10 rounded-xl bg-[var(--color-violet-tint)] flex items-center justify-center shrink-0">
          <svg className="w-[19px] h-[19px] text-[var(--color-primary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 20a8 8 0 0 1 16 0" />
          </svg>
        </div>
        <div>
          <h1 className="font-display text-2xl font-semibold text-[var(--color-text-primary)]">My Profile</h1>
          <p className="text-[var(--color-text-muted)] text-sm mt-0.5">Your own details — no one else's.</p>
        </div>
      </div>

      <div className="rounded-2xl bg-white border border-black/[0.06] overflow-hidden">
        <div className="flex items-center gap-4 px-6 py-6 md:px-7 md:py-7 border-b border-black/[0.05]">
          <EmployeeAvatar
            firstName={employee?.first_name || fullName}
            lastName={employee?.last_name || ""}
            avatarPath={employee?.avatar_path}
            size={56}
          />
          <div className="min-w-0">
            <p className="font-display text-lg font-semibold text-[var(--color-text-primary)] truncate">{fullName}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-medium px-2.5 py-1 rounded-md bg-[var(--color-violet-tint)] text-[var(--color-primary)]">
                {ROLE_LABEL[profile?.role] ?? profile?.role ?? "—"}
              </span>
              {profile?.companies?.name && (
                <span className="text-xs text-[var(--color-text-muted)]">{profile.companies.name}</span>
              )}
            </div>
          </div>
        </div>

        {!employee ? (
          <p className="text-center py-9 text-sm text-[var(--color-text-muted)]">
            You're not linked to an employee record yet — job details will show here once you are.
          </p>
        ) : (
          <>
            <div className="px-6 py-6 md:px-7 md:py-7 border-b border-black/[0.05]">
              <p className="font-mono text-[10.5px] tracking-wide uppercase text-[var(--color-accent)] mb-4">
                Employment — set by HR
              </p>
              <div className="grid sm:grid-cols-2 gap-x-6 gap-y-5">
                <Field label="Job title" value={employee.job_title} />
                <Field label="Department" value={employee.department} />
                <Field label="Employment type" value={EMPLOYMENT_LABEL[employee.employment_type] ?? employee.employment_type} />
                <Field
                  label="Status"
                  value={
                    <span className="text-xs font-medium px-2.5 py-1 rounded-md bg-[var(--color-violet-tint)] text-[var(--color-primary)]">
                      {employee.status}
                    </span>
                  }
                />
                <Field label="Employment level" value={LEVEL_LABEL[employee.employment_level] ?? "—"} />
                <Field label="Start date" value={formatDate(employee.start_date)} />
                <Field label="Manager" value={employee.manager ? `${employee.manager.first_name} ${employee.manager.last_name}` : "—"} />
                <Field label="Email" value={employee.email || profile?.email} />
              </div>

              {(employee.job_description || employee.responsibilities) && (
                <div className="grid sm:grid-cols-2 gap-x-6 gap-y-5 mt-5 pt-5 border-t border-black/[0.05]">
                  {employee.job_description && (
                    <div className="sm:col-span-2">
                      <p className="text-[10.5px] font-semibold tracking-wide uppercase text-[#9089a0] mb-1">Job description</p>
                      <p className="text-sm text-[var(--color-text-primary)] whitespace-pre-wrap">{employee.job_description}</p>
                    </div>
                  )}
                  {employee.responsibilities && (
                    <div className="sm:col-span-2">
                      <p className="text-[10.5px] font-semibold tracking-wide uppercase text-[#9089a0] mb-1">Responsibilities</p>
                      <p className="text-sm text-[var(--color-text-primary)] whitespace-pre-wrap">{employee.responsibilities}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="px-6 py-6 md:px-7 md:py-7">
              <div className="flex items-center justify-between mb-4">
                <p className="font-mono text-[10.5px] tracking-wide uppercase text-[var(--color-accent)]">
                  Personal information — you keep this current
                </p>
                {!editing && (
                  <button
                    onClick={openEdit}
                    className="text-xs font-medium text-[var(--color-primary)] hover:underline"
                  >
                    Edit
                  </button>
                )}
              </div>

              {!editing ? (
                <div className="grid sm:grid-cols-2 gap-x-6 gap-y-5">
                  <Field label="Phone" value={employee.phone} />
                  <Field label="Address" value={employee.address} />
                  <Field label="Emergency contact" value={employee.emergency_contact_name} />
                  <Field
                    label="Emergency contact details"
                    value={
                      employee.emergency_contact_phone || employee.emergency_contact_relationship
                        ? `${employee.emergency_contact_phone ?? ""}${
                            employee.emergency_contact_relationship ? ` · ${employee.emergency_contact_relationship}` : ""
                          }`
                        : null
                    }
                  />
                </div>
              ) : (
                <form onSubmit={handleSave} className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">Phone</label>
                      <input
                        value={form.phone}
                        onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                        placeholder="+234..."
                        className={inputClass}
                        onFocus={focusRing}
                        onBlur={clearRing}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">Address</label>
                      <input
                        value={form.address}
                        onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                        placeholder="Where you currently live"
                        className={inputClass}
                        onFocus={focusRing}
                        onBlur={clearRing}
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">
                        Emergency contact name
                      </label>
                      <input
                        value={form.emergency_contact_name}
                        onChange={(e) => setForm((f) => ({ ...f, emergency_contact_name: e.target.value }))}
                        className={inputClass}
                        onFocus={focusRing}
                        onBlur={clearRing}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">
                        Their phone
                      </label>
                      <input
                        value={form.emergency_contact_phone}
                        onChange={(e) => setForm((f) => ({ ...f, emergency_contact_phone: e.target.value }))}
                        placeholder="+234..."
                        className={inputClass}
                        onFocus={focusRing}
                        onBlur={clearRing}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[var(--color-text-primary)] mb-1.5">
                        Relationship
                      </label>
                      <input
                        value={form.emergency_contact_relationship}
                        onChange={(e) => setForm((f) => ({ ...f, emergency_contact_relationship: e.target.value }))}
                        placeholder="e.g. Spouse, Parent"
                        className={inputClass}
                        onFocus={focusRing}
                        onBlur={clearRing}
                      />
                    </div>
                  </div>

                  {error && <p className="text-sm text-red-600">{error}</p>}

                  <div className="flex gap-2.5">
                    <button
                      type="button"
                      onClick={() => setEditing(false)}
                      className="border border-black/10 rounded-lg px-4 py-2 text-sm font-medium text-[var(--color-text-muted)] hover:bg-black/[0.03] transition-colors duration-150"
                      style={{ transitionTimingFunction: "var(--ease-out)" }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="rounded-lg px-4 py-2 text-sm font-medium text-white transition-transform duration-150 hover:scale-[1.02] active:scale-95 disabled:opacity-60"
                      style={{ backgroundColor: "var(--color-primary)", transitionTimingFunction: "var(--ease-out)" }}
                    >
                      {saving ? "Saving..." : "Save changes"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </>
        )}
      </div>

      <p className="text-xs text-[var(--color-text-muted)] mt-4">
        Job title, department, status, and salary are set by HR — reach out to your admin or manager to update those.
      </p>
    </div>
  );
}
