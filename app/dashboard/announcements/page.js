import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AnnouncementsPage from "@/components/dashboard/announcements/AnnouncementsPage";

export default async function AnnouncementsRoute() {
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

  const [{ data: announcements }, { data: employees }] = await Promise.all([
    supabase
      .from("announcements")
      .select(
        "id, title, body, category, event_date, pinned, created_at, audience_type, audience_value, audience_employee_id, profiles(full_name)"
      )
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false }),
    // 8.1 — the audience picker (department/team/individual) is built
    // from real employee data, not a free-typed guess at what
    // departments/teams exist.
    canManage
      ? supabase.from("employees").select("id, first_name, last_name, email, profile_id, department, team").order("first_name")
      : Promise.resolve({ data: [] }),
  ]);

  return (
    <AnnouncementsPage
      canManage={canManage}
      announcements={announcements ?? []}
      employees={employees ?? []}
      companyId={profile?.company_id}
      profileId={user.id}
    />
  );
}
