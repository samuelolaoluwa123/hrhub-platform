import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DocumentsPage from "@/components/dashboard/documents/DocumentsPage";

export default async function DocumentsRoute() {
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
  const isAdmin = profile?.role === "admin";

  // Same "self-service eligible" check used on the Leave page — an admin
  // with no employees row can still manage everyone else's documents,
  // just can't upload one for themselves yet.
  const { data: myEmployeeRow } = await supabase
    .from("employees")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle();

  const employeeId = myEmployeeRow?.id ?? null;

  const [{ data: myDocuments }, { data: allDocuments }, { data: employees }] = await Promise.all([
    employeeId
      ? supabase
          .from("employee_documents")
          .select(
            "id, doc_type, file_path, created_at, status, verified_at, verifier:verified_by(full_name)"
          )
          .eq("employee_id", employeeId)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    canManage
      ? supabase
          .from("employee_documents")
          .select(
            "id, doc_type, file_path, created_at, status, verified_at, employee_id, employees(first_name, last_name), verifier:verified_by(full_name)"
          )
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    canManage
      ? supabase.from("employees").select("id, first_name, last_name").order("first_name")
      : Promise.resolve({ data: [] }),
  ]);

  return (
    <DocumentsPage
      canManage={canManage}
      isAdmin={isAdmin}
      myDocuments={myDocuments ?? []}
      allDocuments={allDocuments ?? []}
      employees={employees ?? []}
      employeeId={employeeId}
      companyId={profile?.company_id}
      profileId={user.id}
    />
  );
}
