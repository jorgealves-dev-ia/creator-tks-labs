import { z } from "zod";

/**
 * Public environment variables — safe to reach the browser bundle.
 *
 * Validated at import time so a missing or malformed value fails immediately
 * with a clear message, instead of surfacing later as an opaque network error.
 *
 * Server-only secrets (SUPABASE_SERVICE_ROLE_KEY, provider API keys) must NEVER
 * be added to this file: it is imported by client code.
 */
const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url({
    error: "NEXT_PUBLIC_SUPABASE_URL is missing or is not a valid URL.",
  }),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, {
    error: "NEXT_PUBLIC_SUPABASE_ANON_KEY is missing.",
  }),
});

/**
 * `process.env.X` is referenced statically on purpose: Next.js only inlines
 * NEXT_PUBLIC_* variables into the client bundle when accessed that way.
 */
export const publicEnv = publicEnvSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
});
