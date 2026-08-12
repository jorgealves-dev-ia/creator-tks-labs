import { redirect } from "next/navigation";

import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * A concha do vestíbulo — a faixa de cima e a navegação entre suas telas.
 *
 * O grupo de rotas `(dashboard)` não aparece na URL: `/`, `/galeria` e, na 2b,
 * `/conta` continuam sendo endereços de primeiro nível. O que ele agrupa é
 * **isto aqui** — o cabeçalho, o saldo e o "Sair" que as três compartilham.
 *
 * Nasceu na 2a e não na 1a de propósito: um layout com uma página só é
 * indireção sem ninguém para dividir. Ele passa a existir no momento em que
 * existe uma segunda tela — que é também o momento em que a alternativa
 * (repetir o cabeçalho em cada página) começaria a criar duas versões dele.
 *
 * O canvas fica **fora** do grupo, e continua com o header próprio: o dele
 * flutua sobre um plano infinito, e essa diferença é de fundo, não de estilo.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();

  const { data: claims } = await supabase.auth.getClaims();

  if (!claims?.claims) {
    redirect("/login");
  }

  const { data: wallet } = await supabase
    .from("wallets")
    .select("balance_cents")
    .eq("user_id", claims.claims.sub)
    .maybeSingle();

  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <DashboardHeader balanceCents={wallet?.balance_cents ?? 0} />
      {children}
    </div>
  );
}
