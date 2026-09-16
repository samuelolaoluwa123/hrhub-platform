# HRhub manual QA checklist

Walk through this before shipping anything that touches the areas below,
and again as a full pass before onboarding a new pilot customer. No
automated tests exist for this app (a deliberate choice — see the
Testing phase note in memory), so this is the actual regression net.

Two kinds of items are mixed together on purpose:

- **Golden path** — does the basic feature still work at all.
- **Known-fragile** — a real bug was found and fixed here before. These
  don't throw an error if they regress; they fail *silently*, which is
  exactly why they're worth re-checking by hand. Each one says why.

Use a real test account, not a demo screenshot. The Sunridge Foods Ltd
tenant (`demo.admin@hrhub.ng`) is safe to test destructively — restore
anything you change afterward so it stays screenshot-ready. Never test
destructively against a real customer's data.

---

## Auth & sessions

- [ ] Log in, log out, log back in.
- [ ] Open the app in two tabs, sign out in one — the other should stop
      working on its next request, not silently keep going.
- [ ] Directly visit a `/dashboard/*` URL while signed out — should
      redirect to `/login`, not error or show a blank page.
- [ ] **Known-fragile**: rapid navigation across several pages in a row
      shouldn't randomly log you out. (Two different root causes were
      found and fixed for this historically — a stale `@supabase/ssr`
      version and a proxy.js network-retry gap — if it comes back,
      check `proxy.ts` timing in the server logs first: abnormally fast
      (<50ms) points at the network-retry class, normal-but-failing
      timing means the session is genuinely invalid.)

## Multi-tenancy

- [ ] Log in as an admin from one real company, confirm you cannot see
      another company's employees, payroll, documents, or anything
      else — not even by guessing a direct URL or ID.

## Roles (RBAC)

- [ ] A plain employee cannot reach `/dashboard/settings`,
      `/dashboard/audit-log`, `/dashboard/payroll`, or the admin
      sections of Recruitment/Leave/Loans.
- [ ] **Known-fragile**: a user cannot change their own `role` by
      editing their profile (self-escalation to admin). This was once
      a real, live, exploitable bug — worth re-testing after *any*
      change to the `profiles` table or its triggers.

## Employees

- [ ] Add a new employee by hand — confirm it succeeds (this exact flow
      was completely broken once, from a stale default value).
- [ ] Import a small CSV (2-3 rows, one deliberately missing a required
      field) — the bad row should be flagged and skipped, the good rows
      should import with onboarding auto-assigned.
- [ ] Deactivate/change an employee's status — confirm portal access is
      revoked or restored correctly depending on the new status's
      `blocks_login` flag.
- [ ] **Known-fragile**: exit an employee who has direct reports (or
      check one that already exists) — you should see a warning naming
      who reports to them. `manager_id` is never touched automatically
      on exit; check the Reports > Employee Directory export shows
      `(left)` next to any exited manager rather than silently looking
      current.

## Onboarding

- [ ] Assign a template to a new hire, confirm requirements show up on
      their own Onboarding page.
- [ ] **Known-fragile**: hire someone (via "Add employee" or via
      Recruitment's Hire action) into a department with no matching
      template *and* no default template set — you should get an admin
      notification, not silence. This is the "zero-template problem"
      and it was the headline fix of its own phase.
- [ ] **Known-fragile**: try deleting a requirement or template that's
      already assigned to a real employee — should be blocked with a
      message suggesting Deactivate instead. Deleting used to silently
      cascade-delete that employee's completion history.

## Documents

- [ ] Upload a document, verify/reject it as admin, download it.
- [ ] **Known-fragile**: a manager should never see review controls on
      a `medical_record` document, and should not be able to delete one
      either.

## Recruitment

- [ ] Submit a requisition as a manager, confirm you cannot approve
      your own requisition (no button for it, and the database itself
      refuses the change if attempted directly).
- [ ] Approve a requisition as admin, publish a posting from it, add a
      candidate, schedule an interview with a panel, submit an
      evaluation as a panelist, hire the candidate.
- [ ] **Known-fragile**: a plain employee added to an interview panel
      can see *only* their assigned candidate's contact info and resume
      — nothing else about the pipeline.

## Leave

- [ ] Submit a leave request, approve/reject it as admin or manager.
- [ ] **Known-fragile**: a manager cannot approve their own leave
      request — it should not even be actionable in their own "Pending
      approvals" queue.

## Attendance

- [ ] Clock in, clock out, confirm the record appears with the right
      evidence (IP/device/location) for an admin reviewing it.
- [ ] **Known-fragile**: an employee cannot self-edit their own
      attendance record's status, location, or mark themselves
      "reviewed" — only the clock-out fields should ever be
      self-writable.

## Payroll

- [ ] Run payroll for a real (or test) period, generate a payslip PDF,
      confirm the numbers and the ₦ symbol render correctly (not a
      broken box glyph).
- [ ] Try reverting a "Paid" run's status without a reason — should be
      blocked.
- [ ] Confirm a payslip, once created, cannot be edited directly (only
      via a `payslip_adjustments` correction, which shows on the
      original payslip as an "Adjusted" badge).

## Loans

- [ ] Request a loan as an employee, approve it as admin/manager, set a
      repayment schedule, run a payroll cycle and confirm the
      deduction actually appears on the resulting payslip.
- [ ] **Known-fragile**: a manager cannot approve their own loan
      request (same class of bug as Leave, fixed the same way).

## Performance & KPI

- [ ] Complete a self-assessment as an employee, then score/complete
      the review as their manager.
- [ ] **Known-fragile**: a manager cannot score or complete *their own*
      performance review — this was a real, live, exploitable bug even
      after a first attempt at fixing it (the first fix only blocked
      plain employees, not managers reviewing themselves).

## Announcements & notifications

- [ ] Post a department-targeted and a team-targeted announcement,
      confirm only the right people see it.
- [ ] **Known-fragile**: try inserting a notification with an external
      link (e.g. via the browser console) — should be rejected. Every
      real notification in this app only ever links to an in-app page.

## Reports

- [ ] Export each of the four reports (Employee Directory, Payroll
      Register, Leave, Attendance) to CSV and open the file — numbers
      should match what's on screen.

## Offboarding

- [ ] Record a real exit end to end: status changes, portal access is
      revoked, the exit shows in the audit log.

## Setup checklist

- [ ] On a company missing a step (check Settings or the Overview
      banner), confirm the checklist correctly shows it as incomplete,
      and correctly flips to done once the real data exists — this is
      derived live from real data, never a self-reported checkbox, so
      it should never be possible for it to say "done" when it isn't.

## Cross-cutting

- [ ] **Known-fragile — the single most common regression class in
      this codebase's history**: any place that filters or compares
      `employees.status` (or joins against it) must use
      `employee_statuses.is_active_headcount` / `.is_exit`, never a
      hardcoded literal like `'active'`. This exact mistake has caused
      completely-empty pages (birthday widget, payroll's employee list,
      the onboarding progress view) at least four separate times.
      Grep for `status = 'active'` or `.eq("status", "active")`
      (lowercase, literal) if anything suddenly renders empty that
      obviously shouldn't.
- [ ] Any new drawer/modal that stays permanently mounted (parent only
      toggles an `open` prop, not `{open && <Drawer/>}`) needs a
      `useEffect` to reset its `useState` when the target record
      changes — a plain `useState(prop ?? fallback)` initializer only
      ever runs once and goes stale. This has bitten status-change
      drawers, review drawers, and settings drawers independently.
