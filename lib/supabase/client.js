import { createBrowserClient } from "@supabase/ssr";

// Used inside 'use client' components — runs in the browser,
// reads the session from cookies automatically.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}