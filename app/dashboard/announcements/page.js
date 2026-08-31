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

  const { data: announcements } = await supabase
    .from("announcements")
    .select("id, title, body, category, event_date, pinned, created_at, profiles(full_name)")
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false });

  return (
    <AnnouncementsPage
      canManage={canManage}
      announcements={announcements ?? []}
      companyId={profile?.company_id}
      profileId={user.id}
    />
  );
}
