import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import OrgUnitsPage from "@/components/dashboard/settings/OrgUnitsPage";

export default async function DepartmentsRoute() {
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

  const { data: departments } = await supabase.from("departments").select("*").order("sort_order");

  return (
    <OrgUnitsPage
      kind="department"
      title="Departments"
      description="Suggested wherever a department comes up — Employees, job requisitions, postings, and announcement targeting. Renaming one updates every real record using it."
      items={departments ?? []}
    />
  );
}
