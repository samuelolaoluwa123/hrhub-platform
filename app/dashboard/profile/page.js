import { createClient } from "@/lib/supabase/server";
import ProfilePage from "@/components/dashboard/profile/ProfilePage";

export default async function ProfileRoute() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, role, companies(name)")
    .eq("id", user.id)
    .single();

  const { data: employee } = await supabase
    .from("employees")
    .select("first_name, last_name, email, phone, job_title, department, employment_type, start_date, status")
    .eq("profile_id", user.id)
    .maybeSingle();

  return <ProfilePage profile={profile} employee={employee} />;
}
