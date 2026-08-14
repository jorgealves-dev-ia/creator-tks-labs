"use client";

import { useEffect, useState } from "react";

import type { CatalogProvider } from "@/lib/ai/catalog-types";
import { listVideoProviders } from "@/lib/generation/actions";

/**
 * Os modelos de vídeo disponíveis, buscados uma vez por página.
 *
 * Irmão de `useImageCatalog`, com a mesma promessa em cache de módulo: um canvas
 * com vários blocos faz a mesma pergunta a um catálogo que não muda enquanto
 * alguém olha para ele.
 *
 * Separado do de imagem, e não um hook com parâmetro, pela razão que a camada de
 * adaptadores já usa: saber desenhar e saber animar são duas capacidades, e um
 * cache compartilhado entre elas guardaria a resposta de uma na chave da outra
 * no primeiro descuido.
 */
let inFlight: Promise<CatalogProvider[]> | null = null;

export function useVideoCatalog(): CatalogProvider[] {
  const [providers, setProviders] = useState<CatalogProvider[]>([]);

  useEffect(() => {
    inFlight ??= listVideoProviders();

    let cancelled = false;

    void inFlight.then((loaded) => {
      if (!cancelled) setProviders(loaded);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return providers;
}
