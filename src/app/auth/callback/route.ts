import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Lands the user after they click a link in a Supabase e-mail.
 *
 * Handles both template styles: the PKCE flow (`?code=`) and the token-hash
 * flow (`?token_hash=&type=`), so it keeps working whichever e-mail template
 * the project is configured with.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = safeRedirectPath(searchParams.get("next"));

  const supabase = await createSupabaseServerClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(absoluteUrl(request, next));
    }
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type: type as EmailOtpType,
      token_hash: tokenHash,
    });
    if (!error) {
      return NextResponse.redirect(absoluteUrl(request, next));
    }
  }

  return NextResponse.redirect(absoluteUrl(request, "/login?erro=confirmacao"));
}

/**
 * Only same-site paths are accepted. Without this, `?next=https://evil.example`
 * would turn this route into an open redirect.
 */
function safeRedirectPath(candidate: string | null): string {
  if (!candidate) return "/";
  if (!candidate.startsWith("/")) return "/";
  if (candidate.startsWith("//")) return "/";
  return candidate;
}

/**
 * Behind Vercel's proxy the request origin is the internal host, so the
 * forwarded host is the one the user actually typed.
 */
function absoluteUrl(request: NextRequest, path: string): URL {
  const forwardedHost = request.headers.get("x-forwarded-host");

  if (forwardedHost && process.env.NODE_ENV !== "development") {
    return new URL(path, `https://${forwardedHost}`);
  }
  return new URL(path, request.nextUrl.origin);
}
