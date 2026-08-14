"use client";

import { useEffect } from "react";
import { create } from "zustand";

import type { Enums } from "@/lib/supabase/database.types";
import { openChannelWhenAuthed } from "@/lib/supabase/realtime";

/**
 * "O status desta aba mudou" — o aviso que fecha a distância que a 3b nomeou.
 *
 * ---------------------------------------------------------------------------
 * A pendência, dita antes de existir
 * ---------------------------------------------------------------------------
 *
 * A 3b deu escritor a `projects.status` — um gatilho, porque projeção mora no
 * banco — e fechou registrando o que **não** entregava: a bolinha passava a
 * contar a verdade *no carregamento da página*, e não se mexia sozinha.
 * `projects` está na publicação do Realtime desde a Fase 0, mas nenhum cliente
 * assinava essa tabela; o único canal existente escuta `generations`, e é o que
 * move o bloco. O node andava ao vivo e a bolinha esperava um F5.
 *
 * Este arquivo é a assinatura que faltava. Ele chega junto com a geração paga
 * que o exercita, porque é ali que ele se prova: um vídeo leva minutos, e
 * minutos é tempo de sobra para alguém olhar a aba e concluir que ela mente.
 *
 * ---------------------------------------------------------------------------
 * Por que a linha vai direto para a tela aqui, e não em `generations`
 * ---------------------------------------------------------------------------
 *
 * O canal de gerações **não** empurra a linha recebida para a tela: ele conta
 * uma batida e o bloco relê o banco. O motivo está escrito lá — reler é o que
 * garante links assinados frescos e uma ordenação só, e empurrar seria uma
 * segunda maneira de montar a mesma lista.
 *
 * Aqui nada disso se aplica. A verdade inteira da bolinha é **um escalar que o
 * payload já carrega**: `status`. Não há lista para montar, nem link para
 * assinar, nem ordem para divergir. Reler seria pedir ao servidor um dado que
 * chegou completo.
 *
 * E a alternativa preguiçosa — `router.refresh()` a cada evento — custa caro
 * por um ponto de 1,5px: refaz a página inteira do estúdio (projetos, carteira,
 * personagens, workflow e vínculos) várias vezes por lote, e **re-semeia o saldo
 * no meio do lote**. A subtração otimista do saldo foi desenhada para ser
 * corrigida pela atualização que vem *depois* do lote, num momento escolhido —
 * não por uma que chega quando o gatilho resolver disparar.
 *
 * ---------------------------------------------------------------------------
 * Duas fontes, e a de cima é sempre o servidor
 * ---------------------------------------------------------------------------
 *
 * O servidor semeia; o Realtime atualiza entre uma semeadura e outra. É a mesma
 * disposição do saldo em `useSeedArsenal`, e existe pelo mesmo motivo: um canal
 * que cai não repõe o que perdeu, então o overlay ao vivo precisa de algo por
 * cima dele. Sem a semeadura, um cochilo do notebook deixaria a bolinha errada
 * até o próximo F5 — e a troca de aba, que é navegação do cliente, não a
 * consertaria.
 *
 * A semeadura depende do **conteúdo** da lista, não do array: o servidor devolve
 * uma lista nova a cada render, e comparar por identidade re-semearia à toa. Do
 * conteúdo vem também a vantagem silenciosa — enquanto a resposta do servidor
 * não muda, a semeadura não roda, e não há como ela passar por cima de um evento
 * mais novo que já chegou.
 *
 * O RLS é a autorização: o Realtime o honra, então um assinante só recebe as
 * próprias linhas. O filtro por `user_id` abaixo é economia, não segurança —
 * sem ele o servidor avaliaria RLS para toda mudança de `projects` de todo
 * mundo, para descartar quase tudo.
 */

type ProjectStatus = Enums<"project_status">;

/**
 * Os quatro estados, por extenso, para narrar o que chega de fora.
 *
 * Um valor novo no enum do banco não passa por aqui despercebido: `STATUS_DOT`,
 * em `project-tab.tsx`, é um `Record` com todas as chaves obrigatórias, e é ele
 * que para o build no dia em que houver um quinto estado.
 */
const PROJECT_STATUSES = [
  "idle",
  "generating",
  "generated",
  "error",
] as const satisfies readonly ProjectStatus[];

/** Aceita só o que é status de verdade — venha do payload ou da chave. */
function asStatus(value: unknown): ProjectStatus | null {
  if (typeof value !== "string") return null;
  return PROJECT_STATUSES.find((status) => status === value) ?? null;
}

type StatusState = {
  /** O que se sabe hoje sobre cada aba. Ausente = ninguém avisou nada ainda. */
  byProject: Record<string, ProjectStatus>;
  /** A resposta do servidor, inteira. Ela manda. */
  seed: (entries: Array<[string, ProjectStatus]>) => void;
  /** Um aviso do banco sobre uma aba só. */
  observe: (projectId: string, status: ProjectStatus) => void;
};

const useStatuses = create<StatusState>((set) => ({
  byProject: {},
  // Substitui o mapa inteiro em vez de mesclar: projeto excluído sai da lista do
  // servidor e precisa sair daqui junto, senão o mapa cresce para sempre com
  // abas que não existem mais.
  seed: (entries) => set({ byProject: Object.fromEntries(entries) }),
  observe: (projectId, status) =>
    set((state) => ({
      byProject: { ...state.byProject, [projectId]: status },
    })),
}));

/**
 * O status ao vivo de uma aba, ou `undefined` antes da primeira semeadura.
 *
 * Assinado por aba, e não pela barra inteira: quem lê é cada `ProjectTab`, então
 * um aviso sobre um projeto re-renderiza um ponto, não a fileira toda. Mesma
 * disposição de `useGenerationTick`, pelo mesmo motivo.
 *
 * O `undefined` do primeiro render é de propósito. A semeadura roda num efeito
 * — nunca durante o render, porque o store é um singleton de módulo e no
 * servidor esse módulo é compartilhado por todas as requisições do processo —,
 * então na primeira pintura quem responde é o valor que o servidor renderizou.
 */
export function useProjectStatus(projectId: string): ProjectStatus | undefined {
  return useStatuses((state) => state.byProject[projectId]);
}

/**
 * Mantém a barra de abas ouvindo o banco enquanto o estúdio estiver aberto.
 *
 * Chamado uma vez, pela barra de abas — a única leitora de `projects`.
 */
export function useProjectStatusFeed(
  userId: string,
  projects: ReadonlyArray<{ id: string; status: ProjectStatus }>,
): void {
  // A chave é o conteúdo da lista. O efeito a reconstrói em vez de fechar sobre
  // `projects`, que é array novo a cada render — mesmo truque de `linkKey` em
  // `useSeedArsenal`.
  const seedKey = projects
    .map((project) => `${project.id}:${project.status}`)
    .join(",");

  useEffect(() => {
    const entries = seedKey === "" ? [] : seedKey.split(",");

    useStatuses.getState().seed(
      entries.flatMap((entry) => {
        const separator = entry.lastIndexOf(":");
        const status = asStatus(entry.slice(separator + 1));

        // `flatMap` com lista vazia para descartar: um id sem status legível não
        // tem o que semear, e semear `idle` no lugar seria inventar um desfecho.
        return status ? [[entry.slice(0, separator), status] as const] : [];
      }),
    );
  }, [seedKey]);

  /**
   * `openChannelWhenAuthed` e não um `subscribe` direto: um canal assinado
   * durante a hidratação entra no ar e não escuta nada, porque o token do
   * usuário ainda não chegou ao Realtime. O porquê inteiro, com a medição que
   * o provou, está em `lib/supabase/realtime.ts`.
   */
  useEffect(
    () =>
      openChannelWhenAuthed((supabase) =>
        supabase
          .channel(`projects:${userId}`)
          .on(
            "postgres_changes",
            {
              /**
               * `*` porque UPDATE é o que interessa e os outros dois são
               * inofensivos.
               *
               * INSERT chega com `idle` numa aba que a lista do servidor ainda
               * vai trazer — semear `idle` cedo não muda nada. DELETE não chega:
               * a réplica é `DEFAULT`, então o Postgres entrega só a chave
               * primária, e um registro sem `user_id` nem passa pelo filtro.
               *
               * Nomear os eventos que importam seria uma lista para alguém
               * esquecer de atualizar. Mesma escolha do canal de gerações.
               */
              event: "*",
              schema: "public",
              table: "projects",
              filter: `user_id=eq.${userId}`,
            },
            (payload) => {
              const row = payload.new as { id?: unknown; status?: unknown };
              const status = asStatus(row.status);

              if (typeof row.id === "string" && row.id !== "" && status) {
                useStatuses.getState().observe(row.id, status);
              }
            },
          )
          /**
           * O status do canal, dito em voz alta no desenvolvimento — pelo mesmo
           * motivo do canal de gerações: um canal que não sobe falha em
           * silêncio, e o sintoma é indistinguível de ele não existir. Que é,
           * aliás, exatamente o defeito que este arquivo veio consertar.
           */
          .subscribe((status) => {
            if (process.env.NODE_ENV !== "production") {
              console.info(`[realtime] projects:${userId} → ${status}`);
            }
          }),
      ),
    [userId],
  );
}
