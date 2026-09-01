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
  const [{ data: applications }, { data: panelCandidates }] = await Promise.all([
    supabase
      .from("applications")
      .select(
        `id, status, score, notes, offered_salary, offer_sent_at, offer_status, applied_at, hired_employee_id,
         candidates(id, first_name, last_name, email, phone, resume_path, source),
         interviews(id, scheduled_at, mode, duration_minutes, location, notes, status,
           interview_panelists(id, profile_id, panelist:profile_id(full_name)),
           interview_evaluations(id, technical_score, communication_score, problem_solving_score, experience_score, culture_fit_score, recommendation, comments, submitted_at, evaluator:evaluator_id(full_name)))`
      )
      .eq("job_posting_id", postingId)
      .order("applied_at", { ascending: false }),
    supabase.from("profiles").select("id, full_name, role, email").eq("company_id", profile?.company_id).order("full_name"),
  ]);

  return (
    <PostingDetail
      posting={posting}
      applications={applications ?? []}
      panelCandidates={panelCandidates ?? []}
      companyId={profile?.company_id}
      profileId={user.id}
    />
  );
}
