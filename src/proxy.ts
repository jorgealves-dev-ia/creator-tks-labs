import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

/**
 * Next.js 16 renamed `middleware` to `proxy`. Runs before every matched
 * request; here it only keeps the Supabase session fresh and guards routes.
 */
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  /*
   * Skips static assets and provider webhooks. Webhooks arrive without a
   * session and authenticate with their own shared secret, so a session
   * refresh (and the redirect to /login) must not apply to them.
   */
  matcher: [
    "/((?!api/webhooks|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
