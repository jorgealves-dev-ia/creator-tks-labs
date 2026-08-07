import { createBrowserClient } from "@supabase/ssr";

import { publicEnv } from "@/lib/env";

/**
 * Supabase client for browser (Client Component) code.
 *
 * Uses the anon key, which is public by design — every read and write it
 * performs is constrained by Row Level Security. Safe to call repeatedly:
 * `createBrowserClient` returns a singleton per browser session.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
