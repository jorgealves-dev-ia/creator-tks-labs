"use client";

import { useEffect } from "react";
import { create } from "zustand";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * "Nasceu uma geração neste projeto" — o aviso que a tela não tinha.
 *
 * ---------------------------------------------------------------------------
 * O buraco que isto fecha
 * ---------------------------------------------------------------------------
 *
 * A coluna de resultados lê o banco **na montagem e quando a fila esvazia**, e
 * os dois momentos são do próprio bloco. Recarregar a página no meio de uma fila
 * cai fora dos dois: as requisições em voo morrem com a aba, mas **o servidor
 * não para** — ele termina, grava e cobra. A página recarregada consulta uma vez,
 * pega o que já terminou, e as retardatárias caem no banco segundos depois sem
 * ninguém para escutar. A tela ficava mostrando 3 de 4 até alguém mexer.
 *
 * Não dá para o bloco resolver sozinho: depois de um reload ele não sabe que
 * havia uma fila, então não tem o que esperar nem o que perguntar. **Quem sabe é
 * o banco**, e é por isso que a resposta certa aqui é ele avisar.
 *
 * ---------------------------------------------------------------------------
 * Uma assinatura por projeto, não uma por bloco
 * ---------------------------------------------------------------------------
 *
 * Um canvas com seis geradores abriria seis canais para ouvir a mesma tabela com
 * o mesmo filtro. O canal é do projeto; o que cada bloco quer saber é apenas se
 * o `node_id` que chegou é o dele — e isso é uma consulta a um dicionário, não
 * uma conexão.
 *
 * O contador por node existe para o efeito de histórico do bloco ter do que
 * depender. Um contador e não a linha: o que o bloco faz ao ser avisado é
 * **reler**, e reler é o que garante links assinados frescos e a mesma ordem que
 * a consulta usa em todo lugar. Empurrar a linha do Realtime direto para a tela
 * seria uma segunda maneira de montar a mesma lista, com uma segunda chance de
 * ela divergir.
 *
 * ---------------------------------------------------------------------------
 * O RLS é a autorização, e ele já está de pé
 * ---------------------------------------------------------------------------
 *
 * A publicação existe desde a Fase 0 (`20260807140600_enable_realtime.sql`) e o
 * comentário dela já dizia para que era: *"as duas tabelas que o canvas escuta"*.
 * Realtime honra RLS, então um assinante só recebe as próprias linhas — o filtro
 * por projeto abaixo é recorte de produto, não de segurança.
 *
 * **Esta é também a peça que a frente de vídeo herda inteira.** Lá o webhook do
 * provedor grava a linha e é exatamente este canal que avisa a tela; aqui ele
 * cobre o reload. Mesmo mecanismo, dois usos — e o de hoje é o que o coloca no
 * ar antes de haver vídeo para depender dele.
 */

type FeedState = {
  /** Quantas vezes cada node foi avisado. Só o número importa. */
  ticks: Record<string, number>;
  bump: (nodeId: string) => void;
};

const useFeed = create<FeedState>((set) => ({
  ticks: {},
  bump: (nodeId) =>
    set((state) => ({
      ticks: { ...state.ticks, [nodeId]: (state.ticks[nodeId] ?? 0) + 1 },
    })),
}));

/** Quantas vezes este bloco foi avisado de que nasceu geração dele. */
export function useGenerationTick(nodeId: string): number {
  return useFeed((state) => state.ticks[nodeId] ?? 0);
}

/**
 * Abre o canal do projeto enquanto o canvas estiver montado.
 *
 * Chamado uma vez, pelo canvas. Trocar de projeto fecha o canal anterior e abre
 * o do novo — o `projectId` é dependência, e o retorno do efeito é o `unsubscribe`
 * que evita dois canais escutando ao mesmo tempo depois de uma troca de aba.
 */
export function useGenerationFeed(projectId: string | null): void {
  useEffect(() => {
    if (!projectId) return;

    const supabase = createSupabaseBrowserClient();

    const channel = supabase
      .channel(`generations:${projectId}`)
      .on(
        "postgres_changes",
        {
          /**
           * INSERT **e** UPDATE, e o UPDATE é o que o vídeo trouxe.
           *
           * Escutar só INSERT bastava enquanto toda geração nascia pronta: a
           * imagem é gravada uma vez, já com o resultado dentro. O vídeo nasce
           * `queued` e **termina por UPDATE**, quando o webhook chega — então um
           * canal surdo a updates veria a linha nascer e nunca veria acabar,
           * que é o defeito de antes com um nome novo.
           *
           * `*` em vez dos dois eventos nomeados porque DELETE é inofensivo
           * aqui: o Postgres entrega só a chave primária num delete (a réplica
           * é `DEFAULT`), então `node_id` vem indefinido e o bump não acontece.
           * Nomear dois eventos seria uma lista para alguém esquecer de
           * atualizar no dia em que houver um terceiro.
           */
          event: "*",
          schema: "public",
          table: "generations",
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          // A linha chega inteira, mas a única coisa lida aqui é de quem ela é.
          // Tudo o mais o bloco relê do banco, pela consulta de sempre.
          const nodeId = (payload.new as { node_id?: string | null }).node_id;

          if (typeof nodeId === "string" && nodeId !== "") {
            useFeed.getState().bump(nodeId);
          }
        },
      )
      /**
       * O status do canal, dito em voz alta no desenvolvimento.
       *
       * Um canal que não sobe **falha em silêncio**: nada quebra, nada aparece,
       * e a tela simplesmente volta a não se atualizar sozinha — que é
       * exatamente o defeito de antes, agora com código novo por cima. Um canal
       * é a única peça deste ciclo cujo mau funcionamento é indistinguível de
       * não existir, e por isso é a única que ganha uma linha de log.
       *
       * Só em desenvolvimento, no mesmo padrão do erro de geração em
       * `canvas-generate.ts`: em produção não há ninguém lendo console.
       *
       * Em desenvolvimento a linha aparece **duas vezes** — `CLOSED` e depois
       * `SUBSCRIBED` —, e isso é o StrictMode montando o efeito, limpando e
       * montando de novo. Não é o canal piscando; é a prova de que a limpeza
       * funciona. Em produção o efeito roda uma vez só.
       */
      .subscribe((status) => {
        if (process.env.NODE_ENV !== "production") {
          console.info(`[realtime] generations:${projectId} → ${status}`);
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [projectId]);
}
