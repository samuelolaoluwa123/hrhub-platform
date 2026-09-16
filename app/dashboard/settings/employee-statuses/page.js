import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EmployeeStatusesPage from "@/components/dashboard/settings/EmployeeStatusesPage";

export default async function EmployeeStatusesRoute() {
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

  if (profile?.role !== "admin") {
    redirect("/unauthorized");
  }

  // Every status, including deactivated ones — this is the management
  // view, unlike every other page in the app which only ever reads the
  // active ones for a dropdown.
  const { data: statuses } = await supabase
    .from("employee_statuses")
    .select("*")
    .order("sort_order");

  return <EmployeeStatusesPage statuses={statuses ?? []} companyId={profile?.company_id} />;
}
