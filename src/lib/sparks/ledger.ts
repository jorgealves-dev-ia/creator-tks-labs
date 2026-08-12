"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Ler o extrato — e **só ler**.
 *
 * O ledger é a verdade sobre o dinheiro do usuário, e é append-only por trigger
 * no banco: correção é transação nova de estorno, nunca UPDATE ou DELETE
 * (invariante 5). Este arquivo não tem, e não deve ganhar, nada que escreva.
 * O saldo da carteira é projeção dessas linhas, então a tela mostra as duas
 * coisas lado a lado e elas têm que fechar — se um dia não fecharem, o errado é
 * o saldo, e a resposta está aqui.
 */

/** Uma tela de extrato, com folga para rolar antes de pedir mais. */
const LEDGER_PAGE_SIZE = 20;

export type LedgerEntry = {
  id: string;
  createdAt: string;
  kind: string;
  /** Centavos, com sinal: negativo é débito. Spark é só exibição. */
  amountCents: number;
  description: string | null;
};

export type LedgerPage = { items: LedgerEntry[]; hasMore: boolean };

const ledgerSchema = z.object({
  /**
   * `created_at` da última linha já mostrada — o cursor do "carregar mais".
   *
   * Cursor e não `offset` de propósito: o ledger cresce **pela frente** (linha
   * nova é sempre a mais recente), e um `offset` empurraria tudo para baixo no
   * meio da paginação, fazendo a mesma transação aparecer duas vezes. Num
   * extrato, uma linha duplicada não é incômodo visual — é alguém achando que
   * pagou duas vezes.
   *
   * O cursor tem a fraqueza simétrica: duas linhas no **mesmo instante** ficam
   * na fronteira. Medido neste banco antes de escolher — 36 transações, 36
   * instantes distintos, zero repetição —, e é estrutural: cada débito nasce de
   * uma requisição própria, com `created_at` em microssegundos. Se um dia
   * transações em lote gravarem no mesmo instante, a saída é ordenar e paginar
   * por `(created_at, id)`, não voltar para offset.
   */
  before: z.string().optional(),
});

export async function listLedgerEntries(input: unknown): Promise<LedgerPage> {
  const parsed = ledgerSchema.safeParse(input);

  if (!parsed.success) return { items: [], hasMore: false };

  const supabase = await createSupabaseServerClient();
  const { data: claims } = await supabase.auth.getClaims();

  if (!claims?.claims) {
    redirect("/login");
  }

  // O RLS já limita ao dono (`ledger_transactions_select_own`), e não há
  // política de INSERT, UPDATE ou DELETE para o usuário — daqui não sai
  // escrita nem por engano.
  let query = supabase
    .from("ledger_transactions")
    .select("id, created_at, kind, amount_cents, description")
    .order("created_at", { ascending: false })
    .limit(LEDGER_PAGE_SIZE + 1);

  if (parsed.data.before) {
    query = query.lt("created_at", parsed.data.before);
  }

  const { data: rows } = await query;

  if (!rows || rows.length === 0) return { items: [], hasMore: false };

  const hasMore = rows.length > LEDGER_PAGE_SIZE;
  const page = hasMore ? rows.slice(0, LEDGER_PAGE_SIZE) : rows;

  return {
    items: page.map((row) => ({
      id: row.id,
      createdAt: row.created_at,
      kind: row.kind,
      amountCents: row.amount_cents,
      description: row.description,
    })),
    hasMore,
  };
}
