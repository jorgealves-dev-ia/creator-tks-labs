import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { publicEnv } from "@/lib/env";

/** Paths reachable without a session. Everything else requires sign-in. */
const PUBLIC_PATH_PREFIXES = ["/login", "/auth"] as const;

function isPublicPath(pathname: string) {
  return PUBLIC_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * Refreshes the Supabase auth session on every navigation and enforces the
 * public/private route split.
 *
 * Two rules from the Supabase guide are load-bearing here:
 *  1. Never run code between `createServerClient` and `getClaims()` — doing so
 *     causes hard-to-debug random sign-outs.
 *  2. Always return `supabaseResponse` as-is, or copy its cookies onto whatever
 *     response replaces it, otherwise browser and server drift out of sync.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          supabaseResponse = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            supabaseResponse.cookies.set(name, value, options);
          }
          // No-cache headers: a cached response carrying Set-Cookie would hand
          // one user's session to another.
          for (const [key, value] of Object.entries(headers)) {
            supabaseResponse.headers.set(key, value);
          }
        },
      },
    },
  );

  // `getClaims` verifies the JWT rather than trusting the cookie contents.
  const { data } = await supabase.auth.getClaims();
  const isSignedIn = Boolean(data?.claims);

  const { pathname } = request.nextUrl;

  if (!isSignedIn && !isPublicPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return withSessionCookies(NextResponse.redirect(url), supabaseResponse);
  }

  if (isSignedIn && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return withSessionCookies(NextResponse.redirect(url), supabaseResponse);
  }

  return supabaseResponse;
}

/** Carries refreshed auth cookies onto a response that replaces the original. */
function withSessionCookies(
  response: NextResponse,
  supabaseResponse: NextResponse,
) {
  for (const cookie of supabaseResponse.cookies.getAll()) {
    response.cookies.set(cookie);
  }
  return response;
}
