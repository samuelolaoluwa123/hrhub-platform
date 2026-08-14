"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignOutButton() {
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleSignOut}
      className="ml-1.5 text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-black/[0.05] px-3.5 py-2 rounded-lg transition-colors duration-150"
      style={{ transitionTimingFunction: "var(--ease-out)" }}
    >
      Sign out
    </button>
  );
}
