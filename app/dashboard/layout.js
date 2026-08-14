import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Sidebar from "@/components/dashboard/Sidebar";
import Topbar from "@/components/dashboard/Topbar";

export default async function DashboardLayout({ children }) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, companies(name)")
    .eq("id", user.id)
    .single();

  const { data: notifications } = await supabase
    .from("notifications")
    .select("id, message, link, is_read, created_at")
    .order("created_at", { ascending: false })
    .limit(15);

  return (
    <div className="md:flex min-h-screen bg-[var(--color-surface)]">
      <Sidebar fullName={profile?.full_name} role={profile?.role} />

      <div className="flex-1 min-w-0">
        <Topbar companyName={profile?.companies?.name} notifications={notifications ?? []} />
        <main className="p-6 md:p-9 animate-[fadeIn_300ms_var(--ease-out)]">
          {children}
        </main>
      </div>
    </div>
  );
}