import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EmployeesTable from "@/components/dashboard/employees/EmployeesTable";

export default async function EmployeesPage() {
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

  // RLS already scopes this to the caller's own company.
  const { data: employees } = await supabase
    .from("employees")
    .select("*, profiles!employees_profile_id_fkey(role)")
    .order("created_at", { ascending: false });

  const canManage = profile?.role === "admin" || profile?.role === "manager";

  return (
    <EmployeesTable
      initialEmployees={employees ?? []}
      canManage={canManage}
      isAdmin={profile?.role === "admin"}
      currentProfileId={user.id}
      companyId={profile?.company_id}
    />
  );
}