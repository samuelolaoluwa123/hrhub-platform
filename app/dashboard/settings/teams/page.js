import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import OrgUnitsPage from "@/components/dashboard/settings/OrgUnitsPage";

export default async function TeamsRoute() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();

  if (profile?.role !== "admin") {
    redirect("/unauthorized");
  }

  const { data: teams } = await supabase.from("teams").select("*").order("sort_order");

  return (
    <OrgUnitsPage
      kind="team"
      title="Teams"
      description="A narrower grouping than department — suggested on Employees and announcement targeting. Renaming one updates every employee and targeted announcement using it."
      items={teams ?? []}
    />
  );
}
