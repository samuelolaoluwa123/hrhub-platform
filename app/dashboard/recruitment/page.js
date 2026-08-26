import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import RecruitmentPage from "@/components/dashboard/recruitment/RecruitmentPage";

export default async function RecruitmentRoute() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, company_id")
    .eq("id", user.id)
    .single();

  const canManage = profile?.role === "admin" || profile?.role === "manager";
  if (!canManage) {
    redirect("/unauthorized");
  }

  const [{ data: requisitions }, { data: postings }] = await Promise.all([
    supabase
      .from("job_requisitions")
      .select("id, title, department, employment_type, headcount, justification, status, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("job_postings")
      .select("id, title, department, employment_type, location, status, created_at, applications(id)")
      .order("created_at", { ascending: false }),
  ]);

  return (
    <RecruitmentPage
      role={profile?.role}
      requisitions={requisitions ?? []}
      postings={postings ?? []}
      companyId={profile?.company_id}
      profileId={user.id}
    />
  );
}
