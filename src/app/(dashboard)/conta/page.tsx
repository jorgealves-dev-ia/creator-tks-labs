import { redirect } from "next/navigation";

import { LedgerTable } from "@/components/dashboard/ledger-table";
import { t } from "@/lib/i18n/pt-BR";
import { formatBRL, formatSparks } from "@/lib/sparks";
import { listLedgerEntries } from "@/lib/sparks/ledger";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const copy = t.dashboard.account;

/**
 * A Conta — o saldo e o extrato, e nada mais.
 *
 * **Só leitura, e a ausência é o conteúdo.** Não há recarga nem pagamento aqui
 * porque não existe billing no produto; uma tela que oferecesse "comprar mais"
 * sem ter para onde levar o clique seria pior do que uma que informa e cala.
 *
 * O saldo e o extrato vêm de dois lugares diferentes de propósito: o número
 * grande é `wallets.balance_cents` e as linhas são `ledger_transactions`. A
 * carteira é **projeção** do ledger, mantida por trigger — mostrar os dois lados
 * juntos é o que permite alguém notar, um dia, que eles discordam. Se isso
 * acontecer, o errado é o saldo, e a verdade é a lista embaixo dele.
 */
export default async function ContaPage() {
  const supabase = await createSupabaseServerClient();

  const { data: claims } = await supabase.auth.getClaims();

  if (!claims?.claims) {
    redirect("/login");
  }

  const [walletResult, firstPage] = await Promise.all([
    supabase
      .from("wallets")
      .select("balance_cents")
      .eq("user_id", claims.claims.sub)
      .maybeSingle(),
    listLedgerEntries({}),
  ]);

  const balanceCents = walletResult.data?.balance_cents ?? 0;

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-8">
      <div>
        <h1 className="text-lg font-medium text-ink">{copy.title}</h1>
        <p className="mt-1 text-xs text-ink-muted">{copy.subtitle}</p>
      </div>

      <section
        aria-label={copy.balanceLabel}
        className="mt-6 rounded-xl border border-line bg-surface p-5"
      >
        <p className="text-[10px] font-medium uppercase tracking-wide text-ink-faint">
          {copy.balanceLabel}
        </p>

        <p className="mt-1.5 flex items-baseline gap-2">
          <span className="text-3xl font-semibold tabular-nums text-ink">
            {formatSparks(balanceCents)}
          </span>
          <span aria-hidden className="text-xl">
            ⚡
          </span>
          <span className="sr-only">{t.studio.sparksLabel}</span>
        </p>

        {/* O mesmo número em reais, para o Spark não virar moeda de brinquedo:
            quem gasta precisa saber quanto custou de verdade. */}
        <p className="mt-1 text-[11px] text-ink-faint">
          {copy.balanceInBRL} {formatBRL(balanceCents)}
        </p>
      </section>

      <section aria-label={copy.statementTitle} className="mt-8">
        <h2 className="text-sm font-medium text-ink">{copy.statementTitle}</h2>
        <p className="mt-0.5 text-[11px] text-ink-faint">{copy.statementSubtitle}</p>

        <LedgerTable initial={firstPage} />
      </section>
    </main>
  );
}
