"use client";

import type { GenerationThumb } from "@/lib/generation/history";
import { t } from "@/lib/i18n/pt-BR";

/**
 * "Recentes" — o que este bloco já produziu, sob a moldura (§4a da D1).
 *
 * O bloco guarda apenas a última leva no grafo, então tudo que veio antes só
 * existia como cartão Resultado espalhado pelo canvas. Quem arruma o canvas
 * apagando cartões perdia o rastro de vista — e o rastro nunca esteve no
 * canvas, está no banco. Esta faixa é a lembrança que o node não tinha.
 *
 * **Clicar promove para a moldura, e promover é só ver** (decisão do Jorge,
 * 11/08/2026): nada é gravado, o que o projeto guarda continua sendo a última
 * leva gerada. Uma faixa que reescrevesse o documento a cada olhada obrigaria
 * a pensar antes de olhar, que é o contrário do que ela existe para fazer.
 */

const copy = t.generation.recent;

export function RecentStrip({
  items,
  promotedAssetId,
  onPromote,
  onSeeAll,
}: {
  items: readonly GenerationThumb[];
  /** A imagem que está ocupando a moldura, quando não é o resultado da vez. */
  promotedAssetId: string | null;
  /** Clicar na miniatura promovida devolve a moldura ao último resultado. */
  onPromote: (assetId: string | null) => void;
  onSeeAll: () => void;
}) {
  if (items.length === 0) return null;

  return (
    <div className="mt-2">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="text-[10px] font-medium uppercase tracking-wide text-ink-faint">
          {copy.title}
        </span>

        <button
          type="button"
          onClick={onSeeAll}
          title={copy.seeAllHint}
          className="nodrag shrink-0 text-[10px] text-ink-faint underline underline-offset-2
                     transition-colors hover:text-ink"
        >
          {copy.seeAll}
        </button>
      </div>

      <div className="flex flex-wrap gap-1">
        {items.map((item) => {
          const promoted = item.assetId === promotedAssetId;

          return (
            <button
              key={item.generationId}
              type="button"
              onClick={() => onPromote(promoted ? null : item.assetId)}
              title={item.label ?? copy.promoteHint}
              className={`nodrag block size-11 overflow-hidden rounded border transition-colors ${
                promoted ? "border-accent" : "border-line hover:border-line-strong"
              }`}
            >
              {/* Link assinado de bucket privado — nada para o otimizador cachear. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.url} alt="" className="size-full object-cover" />
            </button>
          );
        })}
      </div>

      {promotedAssetId ? (
        <p className="mt-1 text-[10px] leading-relaxed text-ink-faint">
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
