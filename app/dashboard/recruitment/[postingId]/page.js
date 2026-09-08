import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PostingDetail from "@/components/dashboard/recruitment/PostingDetail";

export default async function PostingDetailRoute({ params }) {
  const { postingId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, company_id")
    .eq("id", user.id)
    .single();

  const canManage = profile?.role === "admin" || profile?.role === "manager";
  if (!canManage) {
    redirect("/unauthorized");
  }

  const { data: posting } = await supabase
    .from("job_postings")
    .select("id, title, department, employment_type, location, description, requirements, status, created_at")
    .eq("id", postingId)
    .single();

  if (!posting) {
    redirect("/dashboard/recruitment");
  }

  // Everyone in the company is a potential panelist — the CEO/CTO in
  // your Head of HR's example don't have to be admin/manager, they
  // just need a login. get_my_interview_panels() + the RLS on
  // interview_evaluations are what actually keep their access scoped
  // once picked, not this list.
  //
  // Phase 16 — "interview panel member removed after assignment": an
  // exited employee's profile row is never deleted (only their login
  // is banned, per Phase 13), so without this the picker would happily
  // let HR assign someone who can no longer log in to ever submit a
  // scorecard — a silent dead end. Each profile's linked employee
  // status (if any) is embedded so both the picker and already-scheduled
  // interviews below can tell.
  const [{ data: applications }, { data: panelCandidates }, { data: exitStatuses }] = await Promise.all([
    supabase
      .from("applications")
      .select(
        `id, status, score, notes, offered_salary, offer_sent_at, offer_status, applied_at, hired_employee_id,
         candidates(id, first_name, last_name, email, phone, resume_path, source),
         interviews(id, scheduled_at, mode, duration_minutes, location, notes, status,
           interview_panelists(id, profile_id, panelist:profile_id(full_name, employees!employees_profile_id_fkey(status))),
           interview_evaluations(id, technical_score, communication_score, problem_solving_score, experience_score, culture_fit_score, recommendation, comments, submitted_at, evaluator:evaluator_id(full_name)))`
      )
      .eq("job_posting_id", postingId)
      .order("applied_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("id, full_name, role, email, employees!employees_profile_id_fkey(status)")
      .eq("company_id", profile?.company_id)
      .order("full_name"),
    supabase.from("employee_statuses").select("name").eq("company_id", profile?.company_id).eq("is_exit", true),
  ]);

  const exitStatusNames = new Set((exitStatuses ?? []).map((s) => s.name));
  const isExited = (employeesEmbed) => (employeesEmbed ?? []).some((e) => exitStatusNames.has(e.status));

  // Only exclude someone with an actual exited employee record — a
  // profile with no employee row at all (an admin-only login, per the
  // comment above) is still a legitimate panelist and stays included.
  const activePanelCandidates = (panelCandidates ?? []).filter((p) => !isExited(p.employees));

  // Tag (not hide) already-scheduled panelists who've since exited, so
  // an interview that already happened still shows who sat on it.
  const applicationsWithPanelistFlags = (applications ?? []).map((app) => ({
    ...app,
    interviews: (app.interviews ?? []).map((iv) => ({
      ...iv,
      interview_panelists: (iv.interview_panelists ?? []).map((p) => ({
        ...p,
        panelist: p.panelist ? { ...p.panelist, exited: isExited(p.panelist.employees) } : p.panelist,
      })),
    })),
  }));

  return (
    <PostingDetail
      posting={posting}
      applications={applicationsWithPanelistFlags}
      panelCandidates={activePanelCandidates}
      companyId={profile?.company_id}
      profileId={user.id}
    />
  );
}
