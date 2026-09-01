import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import InterviewPanelPage from "@/components/dashboard/interview-panel/InterviewPanelPage";

// 4.5 — deliberately not role-gated. A panel member can be anyone in
// the company (the Head of HR's own example puts the CEO and CTO on a
// panel), so this page has to be reachable by any authenticated user,
// not just admin/manager. get_my_interview_panels() is what actually
// keeps it scoped — it only ever returns interviews this specific
// person was assigned to, empty otherwise.
export default async function InterviewPanelRoute() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .single();

  const { data: panels } = await supabase.rpc("get_my_interview_panels");

  return <InterviewPanelPage panels={panels ?? []} companyId={profile?.company_id} profileId={user.id} />;
}
