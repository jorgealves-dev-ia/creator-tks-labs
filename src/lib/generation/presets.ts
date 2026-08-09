import { z } from "zod";

import presetsFile from "@/config/format-presets.json";

/**
 * Formats by channel (decision N3) and the limits of the models that draw them.
 *
 * Two different kinds of fact live here on purpose, because they only mean
 * something together:
 *
 *   the preset  — an intention the user has ("Stories"), with the aspect ratio
 *                 that intention implies
 *   the model   — what a given image model actually accepts
 *
 * A preset is never allowed to lie about the second. When a model has no exact
 * match for the wanted ratio, the closest supported one is used and the *real*
 * number is what the interface shows — the specification's own words: never
 * misrepresent the proportion.
 *
 * The presets are data (architecture decision 6), in config/format-presets.json,
 * so adding "Banner 728x90" is one line and no deploy of logic. The model limits
 * are code, next to lib/ai/pricing.ts and for the same reason: they are facts
 * about a provider's API, read from its official documentation, and they change
 * when a model changes — not when the product does.
 */

// ---------------------------------------------------------------------------
// The presets
// ---------------------------------------------------------------------------

const presetSchema = z.object({
  id: z.string().min(1),
  /** Label in the user's language — intention first, ratio appended by the UI. */
  pt: z.string().min(1),
  /** "4:5" — the ratio the channel wants, before any model has an opinion. */
  ratio: z.string().regex(/^\d{1,2}:\d{1,2}$/),
});

/**
 * Validated at import, in the spirit of lib/env.ts: a typo in the JSON breaks
 * the boot, where someone is looking, rather than a generation at 2am.
 */
const parsed = z
  .object({ default: z.string().min(1), presets: z.array(presetSchema).min(1) })
  .parse(presetsFile);

export type FormatPreset = z.infer<typeof presetSchema>;

export const FORMAT_PRESETS: readonly FormatPreset[] = parsed.presets;

export const DEFAULT_PRESET_ID =
  FORMAT_PRESETS.find((preset) => preset.id === parsed.default)?.id ?? FORMAT_PRESETS[0].id;

export function findPreset(id: string | null): FormatPreset | null {
  return FORMAT_PRESETS.find((preset) => preset.id === id) ?? null;
}

// ---------------------------------------------------------------------------
// What each model can actually do
// ---------------------------------------------------------------------------

type ImageModelLimits = {
  /** Aspect ratios the API accepts, verbatim from the provider. */
  aspectRatios: readonly string[];
  /**
   * How many reference images may travel in one call.
   *
   * Google documents two separate ceilings per model — objects and characters —
   * rather than one total. This is a single number because the screen has no
   * business teaching anyone Google's categories, and because six satisfies both
   * ceilings under any mix the product can produce: at most one character (the
   * `@` of decision N2, one per generation in v1) plus five objects.
   *
   * Raising it is one line here, which is exactly why it is a table and not a
   * constant buried in the action.
   */
  maxReferences: number;
};

/**
 * Read from Google's official image-generation documentation and from the types
 * of @google/genai on 2026-08-09.
 *
 *   gemini-3-pro-image      up to 6 images of objects, up to 5 of characters
 *   gemini-3.1-flash-image  up to 10 images of objects, up to 4 of characters
 *
 * Both accept the same ratio list, and every preset above maps to one of them
 * exactly — including 4:5, which the specification expected might need
 * approximating. The approximation machinery below is therefore built and
 * unused, which is the right order: it is the guarantee for the first model that
 * arrives with a shorter list.
 */
const GOOGLE_ASPECT_RATIOS = [
  "1:1",
  "2:3",
  "3:2",
  "3:4",
  "4:3",
  "4:5",
  "5:4",
  "9:16",
  "16:9",
  "21:9",
] as const;

const MODEL_LIMITS: Record<string, ImageModelLimits> = {
  "gemini-3-pro-image": { aspectRatios: GOOGLE_ASPECT_RATIOS, maxReferences: 6 },
  "gemini-3.1-flash-image": { aspectRatios: GOOGLE_ASPECT_RATIOS, maxReferences: 6 },
};

/**
 * What a model with no entry above is assumed to do: the five ratios every image
 * API on the market supports, and the single reference the product has already
 * proven in production (the anchor of a canonical view).
 *
 * Deliberately conservative rather than optimistic. A model added to the
 * catalogue without a line here still works; it just cannot promise more than
 * what is certainly true of it, and the interface shows that smaller number
 * instead of discovering it as an API error after the click.
 */
const CONSERVATIVE_LIMITS: ImageModelLimits = {
  aspectRatios: ["1:1", "3:4", "4:3", "9:16", "16:9"],
  maxReferences: 1,
};

export function modelLimits(modelSlug: string): ImageModelLimits {
  return MODEL_LIMITS[modelSlug] ?? CONSERVATIVE_LIMITS;
}

export function maxReferences(modelSlug: string): number {
  return modelLimits(modelSlug).maxReferences;
}

// ---------------------------------------------------------------------------
// Putting the two together
// ---------------------------------------------------------------------------

export type ResolvedFormat = {
  preset: FormatPreset;
  /** What goes to the API. */
  ratio: string;
  /** True when the model had no exact match and the closest one was used. */
  approximated: boolean;
};

/** "4:5" → 0.8. Returns null for anything that is not two positive numbers. */
function ratioValue(ratio: string): number | null {
  const [width, height] = ratio.split(":").map(Number);

  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return null;
  }

  return width / height;
}

/**
 * The ratio this model will actually draw for this preset.
 *
 * The honest half is the `approximated` flag: the caller shows the real number
 * either way, and says out loud when it is not the one the channel asked for.
 */
export function resolveFormat(modelSlug: string, presetId: string | null): ResolvedFormat {
  const preset = findPreset(presetId) ?? findPreset(DEFAULT_PRESET_ID) ?? FORMAT_PRESETS[0];
  const supported = modelLimits(modelSlug).aspectRatios;

  if (supported.includes(preset.ratio)) {
    return { preset, ratio: preset.ratio, approximated: false };
  }

  const wanted = ratioValue(preset.ratio);

  if (wanted === null) {
    return { preset, ratio: supported[0], approximated: true };
  }

  // Closest by shape, not by string. Comparing "4:5" to "5:4" as text would find
  // a near match that is a quarter turn away from what the user asked for.
  const closest = supported.reduce((best, candidate) => {
    const bestValue = ratioValue(best);
    const candidateValue = ratioValue(candidate);

    if (candidateValue === null) return best;
    if (bestValue === null) return candidate;

    return Math.abs(candidateValue - wanted) < Math.abs(bestValue - wanted) ? candidate : best;
  }, supported[0]);

  return { preset, ratio: closest, approximated: closest !== preset.ratio };
}

/**
 * The single resolution of v1 (§3 of docs/nodes-geracao.md). 1K and 2K cost
 * exactly the same on the default model, so asking for the smaller one would be
 * paying full price for less.
 */
export const CANVAS_IMAGE_SIZE = "2K";
