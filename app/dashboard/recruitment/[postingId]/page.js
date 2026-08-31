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

  const { data: applications } = await supabase
    .from("applications")
    .select(
      "id, status, score, notes, offered_salary, offer_sent_at, offer_status, applied_at, candidates(id, first_name, last_name, email, phone, resume_path, source), interviews(id, scheduled_at, mode, interviewer_id, status, rating, feedback, profiles(full_name))"
    )
    .eq("job_posting_id", postingId)
    .order("applied_at", { ascending: false });

  return (
    <PostingDetail
      posting={posting}
      applications={applications ?? []}
      companyId={profile?.company_id}
      profileId={user.id}
    />
  );
}
