import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TemplatesPage from "@/components/dashboard/onboarding/TemplatesPage";

export default async function OnboardingTemplatesRoute() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, company_id")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    redirect("/dashboard/onboarding");
  }

  const { data: templates } = await supabase
    .from("onboarding_templates")
    .select("id, name, is_default, onboarding_tasks(id, title, sort_order)")
    .order("name");

  return <TemplatesPage templates={templates ?? []} companyId={profile?.company_id} />;
}