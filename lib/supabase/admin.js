import { createClient } from "@supabase/supabase-js";

// This client bypasses RLS entirely using the service role key.
// It must only ever be used inside API routes / server code — never
// imported into a "use client" file, or the key would ship to the
// browser and anyone could read or write any company's data.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    }
  );
}