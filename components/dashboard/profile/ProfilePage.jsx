const STATUS_BADGE = {
  active: "bg-[#e8f9f0] text-[#1a9c5f]",
  on_leave: "bg-[#fef3e2] text-[#d68a1f]",
  terminated: "bg-[#f3f2f5] text-[#706f83]",
};
const STATUS_LABEL = { active: "Active", on_leave: "On leave", terminated: "Terminated" };
const EMPLOYMENT_LABEL = { full_time: "Full-time", part_time: "Part-time", contract: "Contract" };
const ROLE_LABEL = { admin: "Admin", manager: "Manager", employee: "Employee" };

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

export default function ProfilePage({ profile, employee }) {
  const fullName = profile?.full_name || (employee ? `${employee.first_name} ${employee.last_name}` : "—");
  const initial = (fullName || "?").charAt(0).toUpperCase();

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
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-semibold shrink-0"
            style={{ background: "linear-gradient(135deg, var(--color-accent), var(--color-primary))" }}
          >
            {initial}
          </div>
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
          <div className="grid sm:grid-cols-2 gap-x-6 gap-y-5 px-6 py-6 md:px-7 md:py-7">
            <Field label="Job title" value={employee.job_title} />
            <Field label="Department" value={employee.department} />
            <Field label="Employment type" value={EMPLOYMENT_LABEL[employee.employment_type] ?? employee.employment_type} />
            <Field
              label="Status"
              value={
                <span className={`text-xs font-medium px-2.5 py-1 rounded-md ${STATUS_BADGE[employee.status] ?? ""}`}>
                  {STATUS_LABEL[employee.status] ?? employee.status}
                </span>
              }
            />
            <Field label="Start date" value={formatDate(employee.start_date)} />
            <Field label="Manager" value={employee.manager ? `${employee.manager.first_name} ${employee.manager.last_name}` : "—"} />
            <Field label="Email" value={employee.email || profile?.email} />
            <Field label="Phone" value={employee.phone} />
          </div>
        )}
      </div>

      <p className="text-xs text-[var(--color-text-muted)] mt-4">
        Need something changed here? Ask your admin or manager — this page is read-only for now.
      </p>
    </div>
  );
}
