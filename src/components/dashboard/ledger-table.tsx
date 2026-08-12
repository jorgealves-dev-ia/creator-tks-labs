"use client";

import { useState } from "react";

import { formatDayAndTime } from "@/lib/format/date";
import { t } from "@/lib/i18n/pt-BR";
import { formatSparks } from "@/lib/sparks";
import { listLedgerEntries, type LedgerEntry, type LedgerPage } from "@/lib/sparks/ledger";

const copy = t.dashboard.account;

/**
 * O extrato — as linhas do ledger, como o usuário as lê.
 *
 * Só leitura, e por invariante: o ledger é append-only no banco, e correção é
 * transação nova de estorno. Não há aqui um botão que edite nada porque não
 * existe, em lugar nenhum do sistema, o conceito de "corrigir uma linha".
 *
 * A primeira página vem pronta do servidor; daqui para baixo é o mesmo
 * "carregar mais" da Galeria, com cursor por `created_at`.
 */
export function LedgerTable({ initial }: { initial: LedgerPage }) {
  const [page, setPage] = useState(initial);
  const [loading, setLoading] = useState(false);

  async function loadMore() {
    const last = page.items[page.items.length - 1];

    if (!last || loading) return;

    setLoading(true);

    const next = await listLedgerEntries({ before: last.createdAt });

    setPage((current) => ({
      items: [...current.items, ...next.items],
      hasMore: next.hasMore,
    }));
    setLoading(false);
  }

  if (page.items.length === 0) {
    return (
      <div className="mt-4 rounded-xl border border-dashed border-line bg-surface/40 px-6 py-12 text-center">
        <p className="text-sm font-medium text-ink">{copy.emptyTitle}</p>
        <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-ink-faint">
          {copy.emptyBody}
        </p>
      </div>
    );
  }

  return (
    <>
      {/* A tabela rola sozinha em tela estreita, para a página nunca rolar de
          lado inteira. */}
      <div className="mt-4 overflow-x-auto rounded-xl border border-line">
        <table className="w-full min-w-[34rem] border-collapse text-left">
          <thead>
            <tr className="border-b border-line bg-surface">
              <Th className="w-40">{copy.colDate}</Th>
              <Th>{copy.colDescription}</Th>
              <Th className="w-28 text-right">{copy.colAmount}</Th>
            </tr>
          </thead>

          <tbody>
            {page.items.map((entry) => (
              <Row key={entry.id} entry={entry} />
            ))}
          </tbody>
        </table>
      </div>

      {page.hasMore ? (
        <button
          type="button"
          disabled={loading}
          onClick={() => void loadMore()}
          className="mt-4 rounded-lg border border-line px-3 py-1.5 text-[11px] text-ink-muted
                     transition-colors hover:border-line-strong hover:text-ink
                     disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? copy.loading : copy.loadMore}
        </button>
      ) : null}
    </>
  );
}

function Row({ entry }: { entry: LedgerEntry }) {
  const credit = entry.amountCents >= 0;

  // O tipo vem do enum `ledger_kind`. Um valor que a tela ainda não conhece cai
  // no próprio nome cru em vez de sumir: uma linha de extrato sem rótulo é um
  // problema visível, e uma linha que não aparece é dinheiro que ninguém vê.
  const kindLabel =
    copy.kinds[entry.kind as keyof typeof copy.kinds] ?? entry.kind;

  return (
    <tr className="border-b border-line/60 last:border-b-0">
      <Td className="whitespace-nowrap text-ink-faint tabular-nums">
        {formatDayAndTime(entry.createdAt)}
      </Td>

      <Td>
        <span className="text-ink">{entry.description ?? copy.noDescription}</span>
        <span className="ml-2 rounded border border-line px-1.5 py-0.5 text-[10px] text-ink-faint">
          {kindLabel}
        </span>
      </Td>

      <Td
        className={`whitespace-nowrap text-right font-medium tabular-nums ${
          credit ? "text-positive" : "text-ink"
        }`}
      >
        {/* O sinal é explícito nos dois lados: num extrato, "50" sozinho não diz
            se entrou ou saiu, e a cor não pode ser a única a dizer. */}
        {credit ? "+" : "−"}
        {formatSparks(Math.abs(entry.amountCents))} ⚡
      </Td>
    </tr>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      scope="col"
      className={`px-4 py-2.5 text-[10px] font-medium uppercase tracking-wide text-ink-faint ${className}`}
    >
      {children}
    </th>
  );
}

function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-2.5 text-xs ${className}`}>{children}</td>;
}
