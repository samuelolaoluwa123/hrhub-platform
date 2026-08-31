import { createBrowserClient } from "@supabase/ssr";

// Used inside 'use client' components — runs in the browser,
// reads the session from cookies automatically.
//
// Cached as a module-level singleton: 37+ components call createClient(),
// and createBrowserClient() spins up its own GoTrueClient with its own
// background auto-refresh timer on every call. With that many components
// mounted on a single dashboard page, uncached calls meant several
// independent timers racing to refresh the same (single-use, rotating)
// refresh token — whichever lost the race got its session invalidated,
// which is what was causing the random logouts. One shared client means
// one refresh timer.
let client;

export function createClient() {
  if (client) return client;
  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  return client;
}