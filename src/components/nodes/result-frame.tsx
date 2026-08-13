"use client";

import { useLightbox } from "@/components/nodes/lightbox";
import { t } from "@/lib/i18n/pt-BR";

/**
 * A moldura: uma imagem, no topo da coluna de resultados.
 *
 * **A moldura nunca muda de tamanho.** É um quadrado, qualquer que seja a
 * proporção gerada, e a imagem se ajusta dentro (`contain`). Uma moldura que
 * tomasse a forma do preset escolhido faria o bloco inteiro crescer e encolher
 * quando alguém trocasse de Stories para Feed — os controles da esquerda
 * pulariam sob o ponteiro por um motivo que nada tem a ver com eles.
 *
 * **Ela mostra uma imagem, não quatro** *(12/08/2026)*. Até aqui o painel se
 * dividia em até quatro slots, um por imagem da leva, cada um com o seu estado.
 * O estado por imagem não sumiu — mudou de lugar: quem o mostra agora é a
 * **grade** logo abaixo, onde a caixinha é o visual da fila. A moldura ficou com
 * o trabalho que só ela faz bem, que é mostrar **uma** imagem grande o bastante
 * para se julgar. Quatro miniaturas de 100px dentro de um quadrado nunca
 * responderam à pergunta "ficou boa?".
 *
 * **"Usar no fluxo"** *(13/08/2026 — a inversão do cartão).* A geração não nasce
 * mais como cartão no canvas: nasce aqui. O cartão passou a ser um ato
 * deliberado, e este é o botão que o comete. Sem ele, cada imagem gerada plantava
 * um cartão que ninguém pediu, e quatro cliques de quantidade 4 plantavam
 * dezesseis — o canvas virava o depósito das tentativas em vez do desenho do
 * fluxo.
 */

const copy = t.generation.node;

/** A imagem que está na moldura, venha da leva de agora ou do banco. */
export type FrameImage = {
  assetId: string;
  /** Null só para o que foi gerado antes de a geração guardar o id. */
  generationId: string | null;
  /** Null enquanto o link assinado não chegou. */
  url: string | null;
};

export function ResultFrame({
  image,
  attaching,
  onUseInFlow,
}: {
  image: FrameImage | null;
  /** O clique em "Usar no fluxo" está buscando a legenda do cartão. */
  attaching: boolean;
  onUseInFlow: () => void;
}) {
  const openLightbox = useLightbox((state) => state.open);

  if (!image) {
    return (
      <div
        className="flex aspect-square w-full items-center justify-center rounded-lg border
                   border-dashed border-line px-4 text-center text-[11px] leading-relaxed
                   text-ink-faint"
      >
        {copy.emptyResult}
      </div>
    );
  }

  return (
    <div
      className="group/frame relative aspect-square w-full overflow-hidden rounded-lg border
                 border-line bg-canvas"
    >
      {image.url ? (
        <>
          <button
            type="button"
            onClick={() => openLightbox(image.assetId)}
            title={t.generation.lightbox.openHint}
            className="nodrag size-full"
          >
            {/* Um img simples: links assinados de bucket privado, de vida curta,
                então não há nada que o otimizador pudesse cachear. `contain` é o
                que deixa um quadrado fixo abrigar retrato, paisagem e quadrado
                sem cortar nenhum dos três. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image.url}
              alt={copy.resultAlt}
              className="size-full object-contain"
            />
          </button>

          {/* Aparece no hover e no foco pelo mesmo motivo do botão de ampliar do
              cartão Resultado: é uma ação sobre a imagem, e uma ação sobre a
              imagem não deve morar por cima dela o tempo todo. */}
          <button
            type="button"
            disabled={attaching}
            onClick={onUseInFlow}
            title={copy.useInFlowHint}
            aria-label={copy.useInFlow}
            className="nodrag absolute bottom-1.5 right-1.5 flex h-6 items-center gap-1 rounded-md
                       border border-line bg-canvas/85 px-1.5 text-[10px] text-ink-muted
                       opacity-0 backdrop-blur-sm transition-opacity hover:text-ink
                       focus:opacity-100 disabled:opacity-50 group-hover/frame:opacity-100"
          >
            <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden>
              {/* Uma seta que sai da imagem e entra num cartão: o gesto exato. */}
              <path
                d="M2 8h6M6 5.5L8.5 8 6 10.5"
                stroke="currentColor"
                strokeWidth="1.4"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <rect
                x="10.5"
                y="3.5"
                width="4"
                height="9"
                rx="1"
                stroke="currentColor"
                strokeWidth="1.4"
                fill="none"
              />
            </svg>
            {copy.useInFlow}
          </button>
        </>
      ) : (
        // O asset existe; o link assinado ainda não voltou. Em branco de
        // propósito, e não com um "Gerando…": o trabalho acabou, e dizer o
        // contrário recomeçaria um relógio que já parou.
        <div className="size-full" />
      )}
    </div>
  );
}
