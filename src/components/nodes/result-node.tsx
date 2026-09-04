"use client";

import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { useEffect, useState } from "react";

import { useLightbox } from "@/components/nodes/lightbox";
import { NodeHeader } from "@/components/nodes/node-header";
import { signAssets } from "@/lib/assets/sign-batch";
import { usePromptInspector } from "@/lib/canvas/prompt-inspector-store";
import { useCanvasStore } from "@/lib/canvas/store";
import { signAssetDownload } from "@/lib/generation/history";
import { t } from "@/lib/i18n/pt-BR";

/**
 * "Resultado" — a finished image, as a piece of the flow (§5).
 *
 * It stores an asset id and nothing else that could go stale: the link is signed
 * on mount, because a private bucket has no permanent address and a saved graph
 * must never carry a URL that expires tomorrow.
 *
 * Its output handle is what turns a canvas from a pile of attempts into a flow:
 * wired into a generating block, this image becomes that block's reference. And
 * "usar como referência" is that same wire as one click, for when there is no
 * block to wire it to yet.
 */

const copy = t.generation.result;

export type ResultNodeData = {
  assetId: string;
  generationId?: string | null;
  /** Which character was in it, for the caption. Null when there was no `@`. */
  handle?: string | null;
  versionNumber?: number | null;
  aspectRatio?: string | null;
  /**
   * Imagem ou vídeo — e o padrão é imagem, porque todo cartão que existia antes
   * de 04/09/2026 é uma.
   *
   * **Nasceu de um cartão quebrado na tela.** O filme montado entrou aqui como
   * qualquer resultado, e o cartão fez o que sempre fez: pediu a MINIATURA e
   * desenhou um `<img>`. Vídeo não tem miniatura e não é imagem — o resultado
   * foi um ícone de imagem partida no canvas, apontando para um MP4 de 11 MB que
   * estava perfeitamente inteiro no Storage.
   *
   * *Um cartão que não sabe o que mostra desenha errado com toda a confiança do
   * mundo.*
   */
  kind?: "image" | "video" | null;
  /** The block that made it — how a second attempt knows to sit below the first. */
  sourceNodeId?: string;
};

export type ResultNodeType = Node<ResultNodeData, "result">;

export function ResultNode({ id, data, selected }: NodeProps<ResultNodeType>) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  const addChainedGenerator = useCanvasStore((state) => state.addChainedGenerator);
  const inspect = usePromptInspector((state) => state.open);
  const openLightbox = useLightbox((state) => state.open);

  const assetId = data.assetId;
  const ehVideo = data.kind === "video";

  useEffect(() => {
    let cancelled = false;

    void signAssets([assetId]).then((urls) => {
      if (cancelled) return;

      // Vídeo pede o ARQUIVO; imagem pede a miniatura. Não é otimização ao
      // contrário: um vídeo não tem miniatura para pedir, e insistir nela é
      // exatamente o que fazia o cartão nascer partido.
      setUrl((ehVideo ? urls[assetId]?.full : urls[assetId]?.thumb) ?? null);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [assetId, ehVideo]);

  return (
    <div
      className={`group/node w-64 rounded-xl border bg-surface-raised shadow-lg
                  shadow-black/30 transition-colors
                  ${selected ? "border-accent" : "border-line"}`}
    >
      <NodeHeader
        nodeId={id}
        kind="result"
        title={copy.title}
        removeHint={copy.remove}
        duplicateDisabledReason={copy.noDuplicate}
        meta={
          data.handle ? (
            <span className="text-[11px] text-ink-faint">
              @{data.handle}
              {data.versionNumber ? ` v${data.versionNumber}` : ""}
            </span>
          ) : null
        }
      />

      <div
        className="group/image relative flex items-center justify-center overflow-hidden
                   bg-canvas text-[11px] text-ink-faint"
        style={{ aspectRatio: proporcaoCss(data.aspectRatio) }}
        onDoubleClick={() => {
          // A lightbox é de imagem. Um vídeo se assiste no próprio cartão, pelos
          // controles — abrir um MP4 num visualizador de imagem seria trocar um
          // cartão partido por um modal partido.
          if (url && !ehVideo) openLightbox(assetId);
        }}
      >
        {url ? (
          <>
            {ehVideo ? (
              /*
               * `controls` porque um vídeo que não se pode tocar é um retângulo
               * preto, e `preload="metadata"` porque é o que faz o navegador
               * mostrar o primeiro quadro sem baixar os 11 MB inteiros — o
               * pôster de graça. `muted` para o dia em que houver áudio: um
               * canvas com dez cartões não pode começar a falar sozinho.
               *
               * O player de verdade — barra de progresso desenhada por nós, o
               * mudo com botão — é a Fase 2. Isto é o mínimo para o cartão não
               * nascer quebrado.
               */
              <video
                src={url}
                controls
                muted
                playsInline
                preload="metadata"
                className="nodrag size-full object-contain"
              />
            ) : (
              <>
                {/* A plain img: short-lived signed URLs for a private bucket. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={copy.alt} className="size-full object-contain" />
              </>
            )}

            {/* Two ways in: a double-click, which nobody discovers on their own,
                and a button, which everybody does. */}
            {ehVideo ? null : (
            <button
              type="button"
              onClick={() => openLightbox(assetId)}
              title={t.generation.lightbox.openHint}
              aria-label={t.generation.lightbox.openHint}
              className="nodrag absolute right-1.5 top-1.5 flex size-6 items-center justify-center
                         rounded-md border border-line bg-canvas/80 text-ink-muted opacity-0
                         backdrop-blur-sm transition-opacity hover:text-ink focus:opacity-100
                         group-hover/image:opacity-100"
            >
              <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden>
                <path
                  d="M6.5 2.5h-4v4M9.5 13.5h4v-4M13.5 6.5v-4h-4M2.5 9.5v4h4"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            )}
          </>
        ) : (
          <span className="px-4 text-center leading-relaxed">
            {loading ? copy.loading : copy.missing}
          </span>
        )}
      </div>

      {!loading && !url ? (
        <p className="border-t border-line px-3 py-2 text-[10px] leading-relaxed text-ink-faint">
          {copy.missingHint}
        </p>
      ) : (
        <div className="flex items-center justify-between gap-1 border-t border-line px-2 py-1.5">
          <button
            type="button"
            disabled={downloading}
            onClick={async () => {
              setDownloading(true);

              const href = await signAssetDownload(assetId);

              setDownloading(false);

              // An ordinary anchor: the disposition is signed into the URL, so
              // the browser saves the file without the bytes passing through
              // this page at all.
              if (href) {
                const anchor = document.createElement("a");
                anchor.href = href;
                anchor.rel = "noopener";
                anchor.click();
              }
            }}
            className="nodrag rounded px-1.5 py-1 text-[10px] text-ink-faint transition-colors
                       hover:bg-surface-hover hover:text-ink disabled:opacity-50"
          >
            {downloading ? copy.downloading : copy.download}
          </button>

          <button
            type="button"
            title={copy.useAsReferenceHint}
            onClick={() => addChainedGenerator({ resultNodeId: id })}
            className="nodrag rounded px-1.5 py-1 text-[10px] text-ink-faint transition-colors
                       hover:bg-surface-hover hover:text-ink"
          >
            {copy.useAsReference}
          </button>

          <button
            type="button"
            disabled={!data.generationId}
            title={data.generationId ? undefined : copy.noGeneration}
            onClick={() => {
              if (data.generationId) inspect(data.generationId);
            }}
            className="nodrag rounded px-1.5 py-1 text-[10px] text-ink-faint transition-colors
                       hover:bg-surface-hover hover:text-ink
                       disabled:cursor-not-allowed disabled:opacity-40"
          >
            {copy.seePrompt}
          </button>
        </div>
      )}

      <Handle
        type="target"
        position={Position.Left}
        title={copy.inputHandle}
        className="!size-2.5 !border-2 !border-canvas !bg-accent"
      />

      {/* The wire that makes this image the input of the next block. */}
      <Handle
        type="source"
        position={Position.Right}
        title={copy.outputHandle}
        className="!size-2.5 !border-2 !border-canvas !bg-accent"
      />
    </div>
  );
}

/**
 * "9:16" → "9 / 16", e qualquer outra coisa → o quadrado.
 *
 * **Não confia no que vem do grafo, e isso não é zelo — é conserto de uma tela
 * derrubada.** `workflows.graph` é `jsonb`: o que está lá dentro foi escrito por
 * alguma versão do código, e nem toda versão escreveu a mesma coisa. Em
 * 04/09/2026 a montagem gravou um **número** neste campo, o `.replace` estourou,
 * e o canvas inteiro caiu no ErrorBoundary — o servidor tinha feito tudo certo,
 * o filme estava no Storage e a linhagem no banco, e a pessoa via *"Algo deu
 * errado"*.
 *
 * Quem escreveu errado já foi consertado. Isto existe para o grafo que **já
 * está salvo**, e para o próximo campo que alguém gravar torto: um cartão pode
 * aparecer quadrado, jamais derrubar a tela.
 */
function proporcaoCss(valor: unknown): string {
  return typeof valor === "string" && valor.includes(":")
    ? valor.replace(":", " / ")
    : "1 / 1";
}
