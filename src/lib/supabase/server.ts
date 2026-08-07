import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { publicEnv } from "@/lib/env";
import type { Database } from "./database.types";

/**
 * Supabase client for server code: Server Components, Server Actions and
 * Route Handlers.
 *
 * Still uses the anon key, so Row Level Security applies — this client acts
 * as the signed-in user, never as an administrator. A separate service-role
 * client will be added later, only for webhook handlers that must bypass RLS.
 *
 * A new client is created per request because it is bound to that request's
 * cookies. Never hoist it into a module-level variable.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Server Components cannot write cookies. Ignoring is safe because
            // src/proxy.ts refreshes the session on every navigation.
          }
        },
      },
    },
  );
}
