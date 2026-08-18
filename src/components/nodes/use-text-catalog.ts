"use client";

import { useEffect, useState } from "react";

import type { CatalogProvider } from "@/lib/ai/catalog-types";
import { listTextProviders } from "@/lib/storyboard/actions";

/**
 * Os modelos que sabem escrever, buscados uma vez por página.
 *
 * Terceiro irmão de `useImageCatalog` e `useVideoCatalog`, com a mesma promessa
 * em cache de módulo: vários blocos de Roteiro num canvas fazem a mesma pergunta
 * a um catálogo que não muda enquanto alguém olha para ele.
 *
 * Separado dos outros dois, e não um hook com parâmetro, pela razão que a camada
 * de adaptadores já usa: saber desenhar, saber animar e saber escrever são três
 * capacidades, e um cache compartilhado entre elas guardaria a resposta de uma na
 * chave da outra no primeiro descuido.
 */
let inFlight: Promise<CatalogProvider[]> | null = null;

export function useTextCatalog(): CatalogProvider[] {
  const [providers, setProviders] = useState<CatalogProvider[]>([]);

  useEffect(() => {
    inFlight ??= listTextProviders();

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
