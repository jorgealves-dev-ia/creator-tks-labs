"use client";

import { useState } from "react";

import { useLightbox } from "@/components/nodes/lightbox";
import { ImageGrid, type ImageGridItem } from "@/components/ui/image-grid";
import {
  listGeneralGallery,
  type GalleryEntry,
  type GeneralGalleryPage,
} from "@/lib/generation/history";
import { t } from "@/lib/i18n/pt-BR";

const copy = t.dashboard.gallery;

/**
 * A Galeria geral, do lado do navegador.
 *
 * A primeira página vem pronta do servidor — quem chega vê imagens em vez de
 * "Carregando…". Daqui para baixo é só rolar e pedir mais, com o mesmo cursor
 * por `created_at` que a galeria do projeto já usava.
 *
 * O clique amplia, e nada mais: esta tela não seleciona nada, porque não há
 * ninguém esperando uma escolha. É a mesma decisão do modo `browse` do seletor.
 */
export function GalleryBrowser({ initial }: { initial: GeneralGalleryPage }) {
  const [page, setPage] = useState(initial);
  const [loading, setLoading] = useState(false);
  const openLightbox = useLightbox((state) => state.open);

  async function loadMore() {
    const last = page.items[page.items.length - 1];

    if (!last || loading) return;

    setLoading(true);

    const next = await listGeneralGallery({ before: last.createdAt });

    setPage((current) => ({
      items: [...current.items, ...next.items],
      hasMore: next.hasMore,
    }));
    setLoading(false);
  }

  if (page.items.length === 0) {
    return (
      <div className="mt-6 rounded-xl border border-dashed border-line bg-surface/40 px-6 py-12 text-center">
        <p className="text-sm font-medium text-ink">{copy.emptyTitle}</p>
        <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-ink-faint">
          {copy.emptyBody}
        </p>
      </div>
    );
  }

  return (
    <>
      <ImageGrid
        items={page.items.map(toGridItem)}
        onPick={(item) => openLightbox(item.assetId)}
        hint={copy.openHint}
        untitled={copy.untitled}
        className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6"
      />

      <div className="mt-5 flex items-center gap-3">
        {page.hasMore ? (
          <button
            type="button"
            disabled={loading}
            onClick={() => void loadMore()}
            className="rounded-lg border border-line px-3 py-1.5 text-[11px] text-ink-muted
                       transition-colors hover:border-line-strong hover:text-ink
                       disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? copy.loading : copy.loadMore}
          </button>
        ) : null}

        <p className="text-[11px] text-ink-faint">
          {page.items.length}{" "}
          {page.items.length === 1 ? copy.countOne : copy.countSuffix}
        </p>
      </div>
    </>
  );
}

/**
 * Uma geração, vista como item de grade — com o selo já traduzido.
 *
 * A tradução acontece aqui e não no servidor de propósito: a consulta devolve a
 * **origem** (`project` / `canonical` / `orphan`), que é um fato, e não uma
 * frase. Quem transforma fato em português é a camada que já conhece o
 * `pt-BR.ts` — do contrário o texto da tela ficaria escrito dentro de uma
 * consulta de banco, longe de todas as outras palavras do produto.
 */
function toGridItem(entry: GalleryEntry): ImageGridItem {
  return {
    assetId: entry.assetId,
    url: entry.url,
    label: entry.label,
    badge:
      entry.origin.kind === "project"
        ? entry.origin.name
        : entry.origin.kind === "canonical"
          ? copy.origin.canonical
          : copy.origin.orphan,
  };
}
