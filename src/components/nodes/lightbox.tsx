"use client";

import { useEffect, useRef, useState } from "react";
import { create } from "zustand";

import { signAssetUrls } from "@/lib/assets/actions";
import { t } from "@/lib/i18n/pt-BR";

/**
 * The image, big.
 *
 * A 2K generation shown inside a 256px node cannot be judged — and judging it is
 * the entire point of having generated it. Until this existed, the only way to
 * actually look at a result was to download the file and open it elsewhere,
 * which takes the user out of the studio to do the one thing the studio is for.
 *
 * Lives above the canvas, like the other overlays, because a React Flow node
 * sits inside a CSS transform and a `fixed` child of one is positioned against
 * the canvas and scaled with the zoom.
 */

const copy = t.generation.lightbox;

/**
 * Quem abre diz **o que** está abrindo.
 *
 * O overlay recebe um id de asset e nada mais, então sozinho ele não tem como
 * saber se aquilo se olha ou se assiste — e um `<img src="…mp4">` não falha com
 * erro, desenha o ícone de imagem quebrada. Perguntar ao servidor custaria uma
 * segunda viagem por um booleano; quem chamou **já sabe**, porque acabou de
 * desenhar a miniatura.
 *
 * O parâmetro é opcional e vale `false` por omissão: os quatro chamadores de
 * imagem continuam como estavam. O dia em que um cartão Resultado mostrar vídeo,
 * é aqui que ele precisa passar `isVideo` — e este parágrafo é o aviso.
 */
/**
 * Um item da FILA — o asset e como ele se chama para quem assiste.
 *
 * O rótulo existe porque uma fila que avança sozinha **precisa dizer onde
 * chegou**: sem ele, o vídeo troca de conteúdo no meio e quem está olhando não
 * sabe se aquilo é a cena 2 ou um defeito da cena 1.
 */
export type ItemDaFila = { assetId: string; rotulo: string };

type LightboxState = {
  assetId: string | null;
  isVideo: boolean;
  /**
   * A fila, quando quem abriu tinha uma. Vazia = um asset solto, como sempre.
   *
   * **É a Fase 2 do «vídeo final», e ela existe por uma régua do dono:** *"o
   * player é o instrumento do veredito do elo; ele precisa deixar ver os três
   * clipes em sequência sem esforço — se para ver o clipe 2 depois do 1 eu tiver
   * que caçar o botão, o instrumento não serve para o que existe."*
   *
   * Um player por cartão teria entregue três vídeos **clicados um por um**, que
   * é o gesto de hoje numa tela menor. A fila entrega a pergunta respondida: os
   * clipes emendam?
   */
  fila: readonly ItemDaFila[];
  indice: number;
  open: (assetId: string, options?: { isVideo?: boolean }) => void;
  /** Abre a fila na posição pedida. Fora do intervalo, não abre nada. */
  openFila: (fila: readonly ItemDaFila[], indice: number) => void;
  irPara: (indice: number) => void;
  close: () => void;
};

export const useLightbox = create<LightboxState>((set, get) => ({
  assetId: null,
  isVideo: false,
  fila: [],
  indice: 0,
  open: (assetId, options) =>
    set({ assetId, isVideo: options?.isVideo ?? false, fila: [], indice: 0 }),
  openFila: (fila, indice) => {
    const alvo = fila[indice];

    if (!alvo) return;

    set({ assetId: alvo.assetId, isVideo: true, fila, indice });
  },
  /**
   * Avançar/voltar **não fecha a fila no fim**: chegar ao último e o vídeo
   * acabar deixa o último quadro parado, que é o que se quer depois de assistir
   * — fechar sozinho tiraria da tela justamente a emenda que a pessoa foi ver.
   */
  irPara: (indice) => {
    const { fila } = get();
    const alvo = fila[indice];

    if (!alvo) return;

    set({ assetId: alvo.assetId, indice });
  },
  close: () => set({ assetId: null, isVideo: false, fila: [], indice: 0 }),
}));

export function Lightbox() {
  const assetId = useLightbox((state) => state.assetId);
  const isVideo = useLightbox((state) => state.isVideo);

  if (!assetId) return null;

  return <LightboxView key={assetId} assetId={assetId} isVideo={isVideo} />;
}

/** Quantos itens a fila tem — 0 quando o overlay abriu um asset solto. */
export function useTamanhoDaFila() {
  return useLightbox((state) => state.fila.length);
}

function LightboxView({ assetId, isVideo }: { assetId: string; isVideo: boolean }) {
  const close = useLightbox((state) => state.close);
  const fila = useLightbox((state) => state.fila);
  const indice = useLightbox((state) => state.indice);
  const irPara = useLightbox((state) => state.irPara);
  const [url, setUrl] = useState<string | null>(null);
  const [zoomed, setZoomed] = useState(false);
  const dialogo = useRef<HTMLDialogElement>(null);

  const emFila = fila.length > 1;
  const temAnterior = emFila && indice > 0;
  const temProximo = emFila && indice < fila.length - 1;

  useEffect(() => {
    let cancelled = false;

    // Direto, sem o coletor de `sign-batch` — e de propósito, não por
    // esquecimento. O Lightbox abre por clique, sozinho, muito depois da carga
    // do canvas: não há com quem formar lote, e um lote de um é só uma
    // indireção a mais. Ele é também o **único** chamador que quer o `full`, e
    // deixá-lo à parte mantém isso visível no código — a Fase 3 perdeu tempo
    // com um alarme falso justamente porque esta URL parece um vazamento e é a
    // regra.
    void signAssetUrls([assetId]).then((signed) => {
      // `full`, e nunca `thumb`: esta é a tela do zoom. A grade atrás dela
      // mostra 20 kB para caber na página; quem clicou pediu a imagem inteira,
      // e é aqui que a faxina de egress **não** se aplica.
      if (!cancelled) setUrl(signed[assetId]?.full ?? null);
    });

    return () => {
      cancelled = true;
    };
  }, [assetId]);

  /**
   * O overlay entra no TOP LAYER, e isto é conserto de um defeito medido.
   *
   * ---------------------------------------------------------------------------
   * A causa não era o `z-index` — e essa é a lição
   * ---------------------------------------------------------------------------
   *
   * O dono relatou *"o vídeo abre por baixo do modal da galeria"*. Com um `div
   * fixed z-50`, medido em 04/09/2026: a galeria é um `<dialog>` aberto com
   * `showModal()`, então ela é `:modal` e vive no **top layer** — uma camada do
   * navegador **acima de todo o documento**, onde `z-index` não chega. O
   * `elementFromPoint` no meio da tela devolvia o `div` de rolagem da galeria com
   * o lightbox aberto por baixo dele.
   *
   * **Subir `z-50` para `z-[9999]` não mudaria nada.** Nenhum número resolve,
   * porque a disputa não é de número: é de camada. O único jeito de ficar por
   * cima de um elemento do top layer é **estar no top layer também** — e aí quem
   * ganha é quem entrou por último, que é sempre o overlay recém-aberto.
   *
   * *O plano avisou antes de a fase começar: "consertar o z-index sem medir — a
   * causa provável raramente é a causa". Era o caso.*
   *
   * `onClose` existe porque o Escape nativo do `<dialog>` fecha o elemento sem
   * avisar o store: sem ele, o overlay some da tela e o estado continua dizendo
   * que há um asset aberto.
   */
  useEffect(() => {
    const alvo = dialogo.current;

    if (alvo && !alvo.open) alvo.showModal();
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") close();
      // As setas só existem quando há fila. Num asset solto elas não fazem nada,
      // e não fazer nada é melhor que fazer algo inesperado.
      if (event.key === "ArrowRight") irPara(indice + 1);
      if (event.key === "ArrowLeft") irPara(indice - 1);
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close, irPara, indice]);

  return (
    <dialog
      ref={dialogo}
      aria-label={isVideo ? copy.videoTitle : copy.title}
      onClose={close}
      onClick={close}
      /*
        `overflow-hidden` é declaração, não estilo: a folha do navegador dá
        `overflow: auto` a todo `<dialog>`, e foi ela que transformou um vídeo
        grande demais em **rolagem** — com os controles abaixo da dobra. Aqui a
        página não rola; quem cede é o vídeo.
      */
      className="fixed inset-0 z-50 m-0 flex size-full max-h-none max-w-none flex-col
                 overflow-hidden border-0 bg-canvas/95 p-0 text-ink backdrop-blur-sm
                 backdrop:bg-transparent"
    >
      <div className="flex shrink-0 items-center justify-between px-5 py-3">
        <div className="flex items-center gap-3">
          {/*
            Onde se está, e só quando há fila.
            Uma fila que avança sozinha PRECISA dizer onde chegou: sem isto, o
            vídeo troca de conteúdo no meio e quem assiste não sabe se aquilo é a
            cena 2 ou um defeito da cena 1.
          */}
          {emFila ? (
            <span className="rounded-md border border-line bg-surface px-2 py-1 text-xs font-medium text-ink">
              {fila[indice]?.rotulo} {copy.filaPosicao(indice + 1, fila.length)}
            </span>
          ) : null}

          <p className="text-xs text-ink-faint">
            {emFila ? copy.filaHint : isVideo ? copy.videoHint : zoomed ? copy.zoomedHint : copy.hint}
          </p>
        </div>

        <button
          type="button"
          onClick={close}
          aria-label={copy.close}
          className="rounded-lg px-2 py-1 text-xs text-ink-muted transition-colors
                     hover:bg-surface-hover hover:text-ink"
        >
          ✕
        </button>
      </div>

      <div
        className={`min-h-0 flex-1 ${zoomed ? "overflow-auto" : "flex items-center justify-center"} px-5 pb-5`}
        onClick={(event) => {
          // Clicking the image toggles zoom; clicking the space around it closes.
          // Stopping propagation only on the image is what keeps both true.
          if (event.target === event.currentTarget) close();
        }}
      >
        {url && isVideo ? (
          /*
            Vídeo não tem zoom, e a ausência é a decisão: ampliar existe para
            olhar de perto o que a miniatura não mostra, e num clipe o que a
            miniatura não mostra é o **movimento** — quem responde por isso é o
            play, não a lupa. Um clique que às vezes amplia e às vezes pausa
            seria o mesmo gesto com dois significados.

            `stopPropagation` porque o clique no fundo fecha o overlay, e sem
            ele arrastar a barra de progresso fecharia o vídeo no meio.
          */
          /*
            O embrulho não limita nada, e é honesto que não pretenda: ele existe
            para as setas terem um `relative` de referência. Quem limita é o
            próprio vídeo, contra a JANELA — ver abaixo.
          */
          <div className="relative flex items-center" onClick={(event) => event.stopPropagation()}>
            <video
              key={assetId}
              src={url}
              controls
              // `autoPlay` só na fila: num clipe aberto sozinho, começar a tocar
              // sem ninguém pedir é um vídeo falando por conta própria. Na fila é
              // o contrário — ela existe PARA tocar sozinha, e parar entre uma
              // cena e outra seria a mesma caçada ao botão que ela veio resolver.
              autoPlay={emFila}
              preload="metadata"
              aria-label={copy.videoTitle}
              /*
                ── O VÍDEO CEDE, A PÁGINA NÃO ROLA — 04/09/2026 ──────────────

                Medido no veredito da PARADA: um clipe em pé (716×1284) saía com
                **1284 px de altura numa janela de 709**, transbordando 303 px, e
                os controles ficavam abaixo da dobra. O dono precisava rolar para
                achar o play.

                **A causa era uma cadeia de `max-height` percentual quebrada.** O
                `max-h-full` do vídeo resolvia contra o embrulho, cuja altura é
                `auto` — e **porcentagem contra altura automática não resolve**,
                então o limite era simplesmente ignorado e o vídeo ficava com seu
                tamanho intrínseco. O embrulho entrou na Fase 2, para as setas; a
                quebra veio com ele.

                O conserto não conserta a cadeia: **descarta a cadeia**. O limite
                passa a ser a JANELA — `100dvh` menos o cabeçalho (50 px) e a
                folga de baixo (20 px) —, que não depende de ancestral nenhum ter
                altura definida.

                `h-auto w-auto` para o vídeo encolher pelos dois lados mantendo a
                proporção, e `object-contain` para o que sobrar virar barra preta.
                **É o que a tela cheia do navegador faz**, e foi o comportamento
                que o dono apontou como referência.
              */
              onEnded={() => {
                // O coração da Fase 2: acabou a cena, começa a seguinte. Sem
                // clique. No fim da fila o último quadro fica parado — fechar
                // sozinho tiraria da tela justamente a emenda que se foi ver.
                if (temProximo) irPara(indice + 1);
              }}
              className="h-auto max-h-[calc(100dvh-4.5rem)] w-auto max-w-[100vw] object-contain"
            />

            {emFila ? (
              <>
                <button
                  type="button"
                  onClick={() => irPara(indice - 1)}
                  disabled={!temAnterior}
                  aria-label={copy.filaAnterior}
                  title={copy.filaAnterior}
                  className="absolute left-2 flex size-9 items-center justify-center rounded-full
                             border border-line bg-canvas/80 text-ink-muted backdrop-blur-sm
                             transition-colors hover:text-ink disabled:opacity-25"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={() => irPara(indice + 1)}
                  disabled={!temProximo}
                  aria-label={copy.filaProximo}
                  title={copy.filaProximo}
                  className="absolute right-2 flex size-9 items-center justify-center rounded-full
                             border border-line bg-canvas/80 text-ink-muted backdrop-blur-sm
                             transition-colors hover:text-ink disabled:opacity-25"
                >
                  ›
                </button>
              </>
            ) : null}
          </div>
        ) : url ? (
          /* Short-lived signed URL for a private bucket. */
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={copy.title}
            onClick={(event) => {
              event.stopPropagation();
              setZoomed((current) => !current);
            }}
            className={
              zoomed
                ? "max-w-none cursor-zoom-out"
                : "h-auto max-h-[calc(100dvh-4.5rem)] w-auto max-w-[100vw] cursor-zoom-in object-contain"
            }
          />
        ) : (
          <p className="text-xs text-ink-faint">{copy.loading}</p>
        )}
      </div>
    </dialog>
  );
}
