import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth/actions";
import { t } from "@/lib/i18n/pt-BR";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Placeholder home. The canvas replaces this in the next step; for now it only
 * proves the session round-trip works.
 */
export default async function HomePage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getClaims();

  // The proxy already redirects anonymous visitors; this is the belt to its
  // braces, so the page never renders without a verified session.
  if (!data?.claims) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", data.claims.sub)
    .maybeSingle();

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4">
      <p className="text-sm text-ink-muted">
        Sessão ativa: {profile?.display_name ?? data.claims.sub}
      </p>
      <form action={signOut}>
        <Button type="submit" variant="ghost" className="h-9 px-4">
          {t.auth.signOut}
        </Button>
      </form>
    </main>
  );
}
