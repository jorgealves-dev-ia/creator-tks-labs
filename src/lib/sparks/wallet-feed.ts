"use client";

import { useEffect } from "react";

import { openChannelWhenAuthed } from "@/lib/supabase/realtime";

import { useBalance } from "./balance-store";

/**
 * "A carteira mudou" — o aviso que faltava para o dinheiro na tela parar de mentir.
 *
 * ---------------------------------------------------------------------------
 * O defeito, medido em produção
 * ---------------------------------------------------------------------------
 *
 * Depois de um vídeo concluído e cobrado, o saldo continuava dizendo 7.165 ⚡
 * nos **dois** lugares em que aparece no estúdio — o número do cabeçalho e o
 * "Saldo:" no rodapé do bloco. Só um F5 corrigia. O ledger estava certo, a
 * carteira estava certa; a tela é que não sabia.
 *
 * Os dois leitores ficaram surdos pelo mesmo motivo, por caminhos diferentes:
 *
 * - o **cabeçalho** lia a `prop` do servidor, que só muda quando o servidor
 *   renderiza de novo;
 * - o **rodapé do bloco** lia este store, que era semeado por aquela mesma prop
 *   e só se mexia sozinho pela subtração otimista da fila de **imagens**.
 *
 * E a cobrança do vídeo não passa por nenhum dos dois: ela acontece no webhook
 * da fal, servidor puro. Nenhuma resposta volta ao navegador, nenhuma subtração
 * roda, nenhuma página re-renderiza. **O dinheiro se move num lugar onde a tela
 * não tem ninguém escutando.**
 *
 * ---------------------------------------------------------------------------
 * Escutar a carteira, e não o fim da geração
 * ---------------------------------------------------------------------------
 *
 * A correção óbvia seria reagir ao término de uma geração — o canal de
 * `generations` já está aberto ali do lado. Seria consertar o sintoma que
 * apareceu e deixar de pé todos os outros: estorno, recarga, correção
 * administrativa, extração. **A carteira é o fato; a geração é só um dos
 * motivos**, e escutar o fato cobre os motivos que ainda não existem.
 *
 * É também a peça que faltava para o saldo ficar honesto com uma aba aberta e
 * outra trabalhando: duas abas do mesmo usuário passam a convergir para o mesmo
 * número sem ninguém recarregar nada.
 *
 * ---------------------------------------------------------------------------
 * `seed`, e não `spend`
 * ---------------------------------------------------------------------------
 *
 * O que chega do banco é a **figura da carteira**, não um delta — então ela
 * entra por `seed`, que é assinalamento, e passa por cima de qualquer subtração
 * otimista pendente. É exatamente a relação que o store já descrevia: a
 * subtração existe para o número se mexer no clique, e "a página atualiza depois
 * do lote e re-semeia isto com o que a carteira realmente diz". A diferença é
 * que agora quem re-semeia é o banco, na hora, sem depender de uma página
 * inteira ser refeita.
 *
 * Só INSERT e UPDATE: um DELETE de carteira só acontece na cascata de exclusão
 * de conta, e nesse caminho não há mais tela para atualizar.
 */
export function useWalletFeed(userId: string): void {
  useEffect(
    () =>
      openChannelWhenAuthed((supabase) =>
        supabase
          .channel(`wallets:${userId}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "wallets",
              filter: `user_id=eq.${userId}`,
            },
            (payload) => {
              const row = payload.new as { balance_cents?: unknown };

              // Inteiro em centavos, como tudo que é dinheiro neste produto.
              // Um `null` só apareceria num DELETE, e ali não há o que semear.
              if (typeof row.balance_cents === "number") {
                useBalance.getState().seed(row.balance_cents);
              }
            },
          )
          .subscribe((status) => {
            if (process.env.NODE_ENV !== "production") {
              console.info(`[realtime] wallets:${userId} → ${status}`);
            }
          }),
      ),
    [userId],
  );
}
