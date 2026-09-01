import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AuditLogPage from "@/components/dashboard/audit-log/AuditLogPage";

export default async function AuditLogRoute() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    redirect("/unauthorized");
  }

  // RLS already restricts this to admin-in-this-company — the query
  // itself has no company_id filter because it doesn't need one.
  const { data: entries } = await supabase
    .from("audit_log")
    .select("*, employees!audit_log_employee_id_fkey(first_name, last_name)")
    .order("created_at", { ascending: false })
    .limit(200);

  return <AuditLogPage entries={entries ?? []} />;
}
