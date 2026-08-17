import "server-only";

import type {
  Capability,
  CatalogProvider,
  ModelImageSize,
  ModelTextJob,
  ModelVideoDuration,
  ProviderStatus,
} from "@/lib/ai/catalog-types";
import {
  extractionProviderStatus,
  imageProviderStatus,
  textProviderStatus,
  videoProviderStatus,
} from "@/lib/providers/registry";
import type { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Reading the catalogue for one capability.
 *
 * Extraction and image generation ask the same question of the same two tables
 * and differ in exactly three details: which capability to filter on, which
 * price column holds the answer, and which registry knows whether an adapter
 * exists. Those three live in one table below rather than in two copies of this
 * query — because a copy that got one of them wrong would not fail loudly, it
 * would quietly offer a model at the other capability's price.
 *
 * Decision E5 holds throughout: the status is computed here, on the server, and
 * what travels to the browser is the word "ready" — never a key, and not even
 * the name of the variable that holds one.
 */

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

/** The four things that differ between capabilities, in one place. */
const CAPABILITY_READERS: Record<
  Capability,
  {
    /** The value stored in ai_models.capabilities. */
    flag: string;
    /**
     * O que precifica esta capacidade.
     *
     * Duas delas leem uma **coluna** de `ai_models`; vídeo lê a **tabela** de
     * durações, porque não existe `video_sparks` e não deve existir — duração é
     * a unidade de compra de um vídeo, e um preço avulso ao lado da tabela seria
     * uma segunda verdade sobre o mesmo número.
     */
    price: (model: {
      extraction_sparks: number | null;
      image_sparks: number | null;
      ai_model_video_prices: { duration_seconds: number; sparks: number }[];
      ai_model_text_prices: { job_kind: string; sparks: number }[];
    }) => number | null;
    /**
     * Which resolutions it sells. Only image generation has any: an extraction
     * has no size, and answering with the image prices anyway would offer the
     * extraction panel a choice that means nothing.
     */
    sizes: (model: {
      ai_model_image_prices: { image_size: string; sparks: number; sort_order: number }[];
    }) => ModelImageSize[];
    /**
     * Quais durações ela vende. Só vídeo tem alguma — e é a lista vazia das
     * outras duas que impede um seletor de duração de aparecer onde duração
     * não significa nada.
     */
    durations: (model: {
      ai_model_video_prices: {
        duration_seconds: number;
        resolution: string;
        sparks: number;
        sort_order: number;
      }[];
    }) => ModelVideoDuration[];
    /**
     * Quais tipos de trabalho ela vende. Só texto tem algum — e, como as
     * resoluções e as durações, a lista é ao mesmo tempo o preço e a **oferta**:
     * não existe oferecer um trabalho que não se sabe cobrar.
     */
    jobs: (model: {
      ai_model_text_prices: { job_kind: string; sparks: number; sort_order: number }[];
    }) => ModelTextJob[];
    status: (slug: string, envVarName: string) => ProviderStatus;
  }
> = {
  extraction: {
    flag: "extraction",
    price: (model) => model.extraction_sparks,
    sizes: () => [],
    durations: () => [],
    jobs: () => [],
    status: extractionProviderStatus,
  },
  image_gen: {
    flag: "image_gen",
    price: (model) => model.image_sparks,
    sizes: (model) =>
      [...model.ai_model_image_prices]
        // By sort_order, which the catalogue set from smallest to largest —
        // the order somebody thinks about resolution in, and not the
        // alphabetical order in which 4K comes before 1K.
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((price) => ({ size: price.image_size, sparks: price.sparks })),
    durations: () => [],
    jobs: () => [],
    status: imageProviderStatus,
  },
  video_gen: {
    flag: "video_gen",
    /**
     * O preço-base de um modelo de vídeo é o da **duração mais curta que ele
     * vende**, e não uma coluna própria: `ai_models` não tem `video_sparks`,
     * de propósito. Duração é a unidade de compra de um vídeo do mesmo jeito
     * que resolução é a de uma imagem, e um preço avulso ao lado da tabela
     * seria uma segunda verdade sobre o mesmo número.
     *
     * `null` quando não há linha nenhuma — e o filtro abaixo tira o modelo da
     * lista, que é o comportamento certo: um modelo que não sabemos precificar
     * não pode ser selecionável.
     */
    price: (model) => cheapestDuration(model.ai_model_video_prices)?.sparks ?? null,
    sizes: () => [],
    durations: (model) =>
      [...model.ai_model_video_prices]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((price) => ({
          seconds: price.duration_seconds,
          resolution: price.resolution,
          sparks: price.sparks,
        })),
    jobs: () => [],
    status: videoProviderStatus,
  },
  text_gen: {
    flag: "text_gen",
    /**
     * O preço-base de um modelo de texto é o do trabalho **mais barato** que ele
     * vende, e não uma coluna própria: `ai_models` não tem `text_sparks`, de
     * propósito, pela mesma razão de não ter `video_sparks`. Tipo de trabalho é
     * a unidade de compra aqui, e um preço avulso ao lado da tabela seria uma
     * segunda verdade sobre o mesmo número.
     *
     * `null` quando não há linha nenhuma, e o filtro abaixo tira o modelo da
     * lista — um modelo que não sabemos precificar não pode ser selecionável.
     */
    price: (model) => cheapestJob(model.ai_model_text_prices)?.sparks ?? null,
    sizes: () => [],
    durations: () => [],
    jobs: (model) =>
      [...model.ai_model_text_prices]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((price) => ({ jobKind: price.job_kind, sparks: price.sparks })),
    status: textProviderStatus,
  },
};

function cheapestJob(
  prices: readonly { sparks: number }[],
): { sparks: number } | null {
  return [...prices].sort((a, b) => a.sparks - b.sparks)[0] ?? null;
}

function cheapestDuration(
  prices: readonly { duration_seconds: number; sparks: number }[],
): { sparks: number } | null {
  return [...prices].sort((a, b) => a.duration_seconds - b.duration_seconds)[0] ?? null;
}

export async function loadCatalog(
  supabase: SupabaseServerClient,
  capability: Capability,
): Promise<CatalogProvider[]> {
  const reader = CAPABILITY_READERS[capability];

  // One literal string, not a concatenation: the Supabase client infers the
  // shape of the result from the text of the select, and a built-up string is
  // opaque to it — which costs the types of every column it names.
  const { data } = await supabase
    .from("ai_providers")
    .select(
      "slug, display_name, enabled, env_var_name, sort_order, ai_models (id, slug, display_name, extraction_sparks, image_sparks, is_default, enabled, capabilities, sort_order, ai_model_image_prices (image_size, sparks, sort_order), ai_model_video_prices (duration_seconds, resolution, sparks, sort_order), ai_model_text_prices (job_kind, sparks, sort_order))",
    )
    .eq("enabled", true)
    .order("sort_order");

  return (data ?? [])
    .map((provider) => ({
      slug: provider.slug,
      displayName: provider.display_name,
      status: reader.status(provider.slug, provider.env_var_name),
      models: (provider.ai_models ?? [])
        .filter((model) => model.enabled && model.capabilities.includes(reader.flag))
        // A model with the capability but no price is a catalogue row that the
        // charging function could not price. The database constraint makes that
        // impossible; this filter is what keeps it impossible if the constraint
        // is ever relaxed.
        .filter((model) => reader.price(model) !== null)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((model) => ({
          id: model.id,
          slug: model.slug,
          displayName: model.display_name,
          sparks: reader.price(model) ?? 0,
          isDefault: model.is_default,
          sizes: reader.sizes(model),
          durations: reader.durations(model),
          jobs: reader.jobs(model),
        })),
    }))
    .filter((provider) => provider.models.length > 0);
}
