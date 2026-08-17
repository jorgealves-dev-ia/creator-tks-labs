import "server-only";

import {
  anthropicExtractionProvider,
  anthropicTranslationProvider,
} from "@/lib/providers/anthropic";
import type { ProviderStatus } from "@/lib/ai/catalog-types";
import { falVideoProvider } from "@/lib/providers/fal";
import { googleImageProvider, googleTextProvider } from "@/lib/providers/google";
import { isProviderConfigured } from "@/lib/providers/keys";
import type {
  ExtractionProvider,
  ImageGenerationProvider,
  TextGenerationProvider,
  TranslationProvider,
  VideoGenerationProvider,
} from "@/lib/providers/types";

/**
 * Which adapter answers for which provider slug.
 *
 * This map is the whole of the "new provider = new file" promise (architecture
 * decision 2): the engine looks a provider up here and gets an interface, so it
 * never learns any provider's name. A slug in the catalogue with no entry here is
 * simply a provider whose adapter has not been written yet — the selector already
 * greys it out for lack of a key, so it can never be reached.
 */
const EXTRACTION_PROVIDERS: Record<string, ExtractionProvider> = {
  [anthropicExtractionProvider.slug]: anthropicExtractionProvider,
};

/**
 * The same promise for the second capability. Translation of the sheet's free
 * text (§3.3 of docs/geracao-canonica.md) is uncharged internal work, but it is
 * still a model call — so it goes through the layer like everything else, and a
 * second provider would be a second entry here and nothing more.
 */
const TRANSLATION_PROVIDERS: Record<string, TranslationProvider> = {
  [anthropicTranslationProvider.slug]: anthropicTranslationProvider,
};

export function findExtractionProvider(slug: string): ExtractionProvider | null {
  return EXTRACTION_PROVIDERS[slug] ?? null;
}

/**
 * And for image generation. Google is the only entry in this phase (decision
 * G2); OpenAI and xAI are already in the catalogue, so the selector shows them
 * greyed out as "(em breve)" — the missing line here is the whole reason why.
 */
const IMAGE_PROVIDERS: Record<string, ImageGenerationProvider> = {
  [googleImageProvider.slug]: googleImageProvider,
};

export function findTranslationProvider(slug: string): TranslationProvider | null {
  return TRANSLATION_PROVIDERS[slug] ?? null;
}

export function findImageProvider(slug: string): ImageGenerationProvider | null {
  return IMAGE_PROVIDERS[slug] ?? null;
}

/**
 * E para vídeo — a quarta capacidade, e a primeira assíncrona.
 *
 * A fal é a única entrada, e é o **primeiro agregador** deste catálogo. Ela está
 * aqui pelo critério da Decisão 2: acesso direto ao Kling exigiria conta de
 * desenvolvedor chinesa, o que é fricção real. Agregador de infraestrutura é
 * aceitável; revendedor de camada de produto continua vetado.
 */
const VIDEO_PROVIDERS: Record<string, VideoGenerationProvider> = {
  [falVideoProvider.slug]: falVideoProvider,
};

export function findVideoProvider(slug: string): VideoGenerationProvider | null {
  return VIDEO_PROVIDERS[slug] ?? null;
}

/**
 * E para texto — a quinta capacidade.
 *
 * O Google é a única entrada, e é o mesmo arquivo que já desenha: um provedor
 * pode perfeitamente saber escrever e não saber desenhar, e vice-versa, então
 * os dois mapas são separados mesmo apontando para `google.ts`. É o que permite
 * um dia trocar o redator sem tocar no desenhista.
 */
const TEXT_PROVIDERS: Record<string, TextGenerationProvider> = {
  [googleTextProvider.slug]: googleTextProvider,
};

export function findTextProvider(slug: string): TextGenerationProvider | null {
  return TEXT_PROVIDERS[slug] ?? null;
}

/** Whether a text adapter exists at all — the second half of "usable". */
export function hasTextAdapter(slug: string): boolean {
  return slug in TEXT_PROVIDERS;
}

/**
 * Por que um fornecedor de texto está ou não usável. Mesma resposta em duas
 * partes das outras quatro capacidades.
 */
export function textProviderStatus(slug: string, envVarName: string): ProviderStatus {
  if (!hasTextAdapter(slug)) return "no_adapter";

  return isProviderConfigured(envVarName) ? "ready" : "missing_key";
}

/** Whether a video adapter exists at all — the second half of "usable". */
export function hasVideoAdapter(slug: string): boolean {
  return slug in VIDEO_PROVIDERS;
}

/**
 * Por que um fornecedor de vídeo está ou não usável. Mesma resposta em duas
 * partes das outras duas capacidades, e separada delas pela mesma razão: saber
 * ler uma foto, saber desenhar uma e saber animá-la são três coisas.
 */
export function videoProviderStatus(slug: string, envVarName: string): ProviderStatus {
  if (!hasVideoAdapter(slug)) return "no_adapter";

  return isProviderConfigured(envVarName) ? "ready" : "missing_key";
}

/** Whether an image adapter exists at all — the second half of "usable". */
export function hasImageAdapter(slug: string): boolean {
  return slug in IMAGE_PROVIDERS;
}

/**
 * Why an image provider is or is not usable. Same two-part answer as
 * extractionProviderStatus, and separate from it because a provider can perfectly
 * well be ready to read a photo and not yet able to draw one.
 */
export function imageProviderStatus(slug: string, envVarName: string): ProviderStatus {
  if (!hasImageAdapter(slug)) return "no_adapter";

  return isProviderConfigured(envVarName) ? "ready" : "missing_key";
}

/** Whether an adapter exists at all — the second half of "usable" after the key. */
export function hasExtractionAdapter(slug: string): boolean {
  return slug in EXTRACTION_PROVIDERS;
}

// ProviderStatus is defined in lib/ai/catalog-types.ts, next to the rest of what
// the selector reads: this file may not be imported by a client component, and a
// type the interface needs has no business living behind that wall.
export type { ProviderStatus };

/**
 * Usable means **both**: an adapter here and a key on the server. The two fail
 * for different reasons and the interface has to say which, so this returns a
 * reason rather than a boolean — a provider whose key the user has already set
 * must never be told to set it.
 *
 * The adapter is checked first: with no adapter, whether a key exists is beside
 * the point.
 *
 * Lives next to the registry because the registry owns half the answer, and
 * because putting it here lets it be exercised directly instead of through a
 * server action that needs a session.
 */
export function extractionProviderStatus(slug: string, envVarName: string): ProviderStatus {
  if (!hasExtractionAdapter(slug)) return "no_adapter";

  return isProviderConfigured(envVarName) ? "ready" : "missing_key";
}
