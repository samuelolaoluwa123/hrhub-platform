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

  // avatar_path is fetched for everyone with an employee row (an admin
  // or manager can have one too, not just employees) so the sidebar
  // badge shows their real photo once they've uploaded one. The
  // nav-hiding onboarding gate below is UX polish (no dead-end links) —
  // proxy.js is the actual authorization gate regardless of what this
  // returns.
  const { data: employee } = await supabase
    .from("employees")
    .select("onboarding_complete, avatar_path, first_name, last_name")
    .eq("profile_id", user.id)
    .maybeSingle();

  const onboardingComplete = profile?.role === "employee" ? employee?.onboarding_complete ?? true : true;

  return (
    <div className="md:flex md:h-screen md:overflow-hidden min-h-screen bg-[var(--color-surface)]">
      <Sidebar
        fullName={profile?.full_name}
        role={profile?.role}
        onboardingComplete={onboardingComplete}
        avatarPath={employee?.avatar_path}
      />

      <div className="flex-1 min-w-0 md:h-screen md:overflow-y-auto">
        <Topbar companyName={profile?.companies?.name} notifications={notifications ?? []} />
        <main className="p-6 md:p-9 animate-[fadeIn_300ms_var(--ease-out)]">
          {children}
        </main>
      </div>
    </div>
  );
}