import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSetupStatus } from "@/lib/setupStatus";
import SetupChecklist from "@/components/dashboard/setup/SetupChecklist";

export default async function SetupRoute() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, company_id, companies(name)")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    redirect("/unauthorized");
  }

  const steps = await getSetupStatus(supabase, profile.company_id);

  return <SetupChecklist steps={steps} companyName={profile.companies?.name} />;
}
