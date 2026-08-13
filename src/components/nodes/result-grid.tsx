"use client";

import { t } from "@/lib/i18n/pt-BR";

/**
 * "Recentes" — a grade de dezesseis caixinhas sob a moldura.
 *
 * Era uma faixa de quatro miniaturas do que o bloco já produziu, lida do banco
 * (§4a da D1). Continua sendo isso, e passou a ser mais uma coisa: **a caixinha é
 * o visual da fila** (13/08/2026). O mesmo quadradinho que hoje mostra uma imagem
 * pronta mostra, um instante antes, o trabalho que a estava gerando — e, quando
 * dá errado, mostra a recusa em vez de sumir e deixar a pessoa contando imagens.
 *
 * Cinco estados, e nenhum deles muda a altura do bloco:
 *
 *   vazia      um lugar que existe e ainda não foi ocupado
 *   na fila    pedida, ainda não começou — e por isso ainda não custa nada
 *   gerando    barra indeterminada — ver o comentário da animação abaixo
 *   pronta     a miniatura, que se clica para promover à moldura
 *   recusada   discreta, com o motivo no hover
 *
 * **"Na fila" precisa ser diferente de "vazia"**, e o briefing desenhava as duas
 * iguais. Se um trabalho esperando parecesse um lugar livre, a grade estaria
 * escondendo justamente a fila que ela existe para mostrar — e três cliques
 * enfileirados não teriam nenhuma marca na tela até o primeiro começar. A
 * diferença é quieta de propósito: borda inteira em vez de tracejada, e um ponto
 * no meio. É "reservado", não "acontecendo".
 *
 * **A grade é sempre de dezesseis, cheia ou vazia.** É a mesma decisão que mantém
 * a moldura quadrada de tamanho fixo: um bloco que crescesse a cada imagem que
 * chega faria os controles da esquerda pularem sob o ponteiro no exato momento em
 * que a pessoa está olhando para a direita. Dezesseis caixas discretas num bloco
 * novo também dizem, sem uma frase, onde as imagens vão aparecer.
 *
 * **Ordem: mais recente primeiro**, o que põe o que está gerando no topo e
 * empurra o histórico para baixo. Quem monta a lista é o bloco; esta grade
 * apenas completa com vazias o que faltar para dezesseis — a regra da fila é que
 * **o histórico não consome vaga de trabalho vivo**: ele entra depois e o que não
 * couber transborda para o "Ver todas".
 *
 * **Clicar promove para a moldura, e promover é só ver** (decisão do Jorge,
 * 11/08/2026): nada é gravado. Uma grade que reescrevesse o documento a cada
 * olhada obrigaria a pensar antes de olhar, que é o contrário do que ela existe
 * para fazer.
 */

const copy = t.generation.recent;

/** Quantas caixinhas a grade desenha, sempre. Quatro fileiras de quatro. */
export const RESULT_GRID_SIZE = 16;

/**
 * O que uma caixinha mostra.
 *
 * `ready` é uma imagem — da leva de agora, com o link que a resposta trouxe, ou
 * do banco, com o link que a consulta assinou. As outras duas são notícias sobre
 * uma requisição, e por isso não sobrevivem a um recarregamento: o que fica é a
 * imagem, o que passou é o que aconteceu com o pedido.
 */
export type ResultBoxState =
  | { status: "queued" }
  | { status: "running" }
  | { status: "failed"; message: string }
  | {
      status: "ready";
      assetId: string;
      generationId: string | null;
      url: string | null;
      label: string | null;
    };

export function ResultGrid({
  items,
  promotedAssetId,
  onPromote,
  onSeeAll,
}: {
  /** Já ordenados, mais recente primeiro, e já cortados em dezesseis. */
  items: readonly ResultBoxState[];
  /** A imagem que a pessoa promoveu à moldura de propósito. */
  promotedAssetId: string | null;
  /** Clicar na miniatura promovida devolve a moldura ao resultado da vez. */
  onPromote: (assetId: string | null) => void;
  onSeeAll: () => void;
}) {
  const filled = items.slice(0, RESULT_GRID_SIZE);
  const empties = RESULT_GRID_SIZE - filled.length;

  return (
    <div className="mt-2">
      <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-ink-faint">
        {copy.title}
      </p>

      <div className="grid grid-cols-4 gap-1">
        {filled.map((item, index) => (
          <ResultBox
            // A posição é a chave certa aqui: a lista é uma fila ordenada, e uma
            // caixinha que troca de conteúdo na mesma posição é exatamente o que
            // deve acontecer quando o trabalho dela termina.
            key={index}
            item={item}
            promoted={item.status === "ready" && item.assetId === promotedAssetId}
            onPromote={onPromote}
          />
        ))}

        {Array.from({ length: empties }, (_unused, index) => (
          <EmptyBox key={`empty-${index}`} />
        ))}
      </div>

      <button
        type="button"
        onClick={onSeeAll}
        title={copy.seeAllHint}
        className="nodrag mt-1.5 block w-full text-center text-[11px] text-ink-faint underline
                   underline-offset-2 transition-colors hover:text-ink"
      >
        {copy.seeAll}
      </button>

      {promotedAssetId ? (
        <p className="mt-1 text-center text-[10px] leading-relaxed text-ink-faint">
          {copy.promoted} ·{" "}
          <button
            type="button"
            onClick={() => onPromote(null)}
            className="nodrag underline underline-offset-2 transition-colors hover:text-ink"
          >
            {copy.back}
          </button>
        </p>
      ) : null}
    </div>
  );
}

const BOX_CLASS = "aspect-square overflow-hidden rounded border";

function EmptyBox() {
  return <div className={`${BOX_CLASS} border-dashed border-line/70 bg-surface/40`} />;
}

function ResultBox({
  item,
  promoted,
  onPromote,
}: {
  item: ResultBoxState;
  promoted: boolean;
  onPromote: (assetId: string | null) => void;
}) {
  if (item.status === "queued") {
    return (
      <div
        className={`${BOX_CLASS} flex items-center justify-center border-line bg-surface/50`}
        title={copy.queuedHint}
      >
        <span className="size-1.5 rounded-full bg-ink-faint" />
        <span className="sr-only">{copy.queuedHint}</span>
      </div>
    );
  }

  if (item.status === "running") {
    return (
      <div
        className={`${BOX_CLASS} flex items-center justify-center border-line bg-surface/60 px-1.5`}
        title={copy.runningHint}
      >
        {/* Indeterminada, e é a verdade que temos: o provedor não emite
            progresso nenhum, então uma barra que enchesse até 90% e esperasse
            estaria inventando um número. O tempo real está dito em texto sob o
            botão, onde cabe uma frase. */}
        <div className="h-1 w-full overflow-hidden rounded-full bg-line">
          <div className="animate-result-bar h-full w-1/3 rounded-full bg-accent" />
        </div>
      </div>
    );
  }

  if (item.status === "failed") {
    return (
      <div
        className={`${BOX_CLASS} flex items-center justify-center border-line bg-surface/60`}
        title={item.message}
      >
        {/* Discreta de propósito. A recusa de um slot não é um alarme do bloco:
            é o registro de que aquela vaga não virou imagem, e o motivo está a
            um hover de distância para quem quiser saber. */}
        <svg viewBox="0 0 16 16" className="size-3.5 text-warning" aria-hidden>
          <path
            d="M8 4.5v4M8 11.2v.3"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.2" fill="none" />
        </svg>
        <span className="sr-only">{item.message}</span>
      </div>
    );
  }

  if (!item.url) {
    // O asset existe e o link ainda não. Uma caixa quieta, não um "gerando":
    // o trabalho acabou, e a barra diria que não.
    return <div className={`${BOX_CLASS} border-line bg-surface/60`} />;
  }

  return (
    <button
      type="button"
      onClick={() => onPromote(promoted ? null : item.assetId)}
      title={item.label ?? copy.promoteHint}
      className={`${BOX_CLASS} nodrag block transition-colors ${
        promoted ? "border-accent" : "border-line hover:border-line-strong"
      }`}
    >
      {/* Link assinado de bucket privado — nada para o otimizador cachear. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={item.url} alt="" className="size-full object-cover" />
    </button>
  );
}
