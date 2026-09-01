import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProfilePage from "@/components/dashboard/profile/ProfilePage";

export default async function ProfileRoute() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, role, companies(name)")
    .eq("id", user.id)
    .single();

  // manager:employees!<constraint_name>(...) is the documented syntax
  // for a self-referencing embed, but PostgREST wasn't resolving it on
  // this project (PGRST200 "relationship not found" even though the FK
  // genuinely exists and is unambiguous). Hinting by column name instead
  // of constraint name works around it.
  const { data: employeeRow } = await supabase
    .from("employees")
    .select(
      "id, first_name, last_name, email, phone, job_title, department, employment_type, start_date, status, manager_id, address, emergency_contact_name, emergency_contact_phone, emergency_contact_relationship, avatar_path"
    )
    .eq("profile_id", user.id)
    .maybeSingle();

  let employee = employeeRow;
  if (employeeRow?.manager_id) {
    const { data: manager } = await supabase
      .from("employees")
      .select("first_name, last_name")
      .eq("id", employeeRow.manager_id)
      .maybeSingle();
    employee = { ...employeeRow, manager };
  }

  return <ProfilePage profile={profile} employee={employee} />;
}
