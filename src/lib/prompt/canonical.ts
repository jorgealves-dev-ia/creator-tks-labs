import type { ImagemCanonicaSlot } from "@/lib/character-sheet/dictionary";
import type { CharacterSheet } from "@/lib/character-sheet/schema";
import {
  compilePrompt,
  type CenaPadraoKey,
  type CompiledPrompt,
  type CompileOverrides,
} from "@/lib/prompt/compile";

/**
 * The prompt of a canonical image — §4.2 and §4.3 of docs/geracao-canonica.md.
 *
 * This is the compiler's identity block wrapped in two things it deliberately
 * knows nothing about: the reference-sheet framing of §5.22, and the instruction
 * that says which view (or which grid of views) is wanted.
 *
 * Why the framing exists at all is worth restating, because it looks like
 * decoration and is not. The canonical outfit is swimwear — the only way to see
 * a silhouette and its proportions honestly. A prompt that simply asked for that
 * would read, to a model, like a request for something else entirely. So the
 * prompt opens in the technical language of the industry, which models recognise
 * as the legitimate purpose it is: a character reference sheet, for consistency
 * of silhouette and proportion. No suggestive word, and no mention of skin
 * beyond its tone. When a model refuses anyway, §5.22's fallback runs the same
 * generation once more in athletic compression wear — and says so on screen.
 *
 * Still pure: no network, no clock. The same sheet and slot produce the same
 * prompt forever, which is what makes generations.prompt_compiled worth storing.
 */

/**
 * §5.22 · The framing, verbatim from the specification. Always the first thing
 * the model reads.
 */
const REFERENCE_SHEET_FRAMING =
  "Professional full-body character reference sheet, neutral studio background, " +
  "even lighting, for character silhouette and proportion consistency";

/**
 * The grid of §4.2: every canonical view on one sheet, which is what makes it
 * the anchor everything else references.
 *
 * "the same person" is repeated because that is the single instruction the whole
 * feature depends on: a grid of six slightly different people would be worse
 * than no sheet at all.
 */
const SHEET_GRID_INSTRUCTION =
  "Compose one single sheet divided into clearly separated cells, all showing " +
  "the same person: full-body front view, full-body three-quarter view, " +
  "full-body side profile view, full-body back view, a head-and-shoulders " +
  "close-up of the face, and a row of facial expression studies. Identical " +
  "face, identical body, identical outfit, identical lighting in every cell. " +
  "No text, no labels, no watermarks, no measurement lines";

/**
 * The slot list is the dictionary's, not a second copy of it. Keying the recipes
 * below by that union is what turns "a new slot needs a prompt" from something
 * to remember into a compiler error.
 */
type SlotRecipe = {
  /** What to draw. Replaces the grid instruction on the single views. */
  instruction: string;
  aspectRatio: string;
  /**
   * Layer-2 fields this instruction states itself, so the sheet default does not
   * repeat them — compilation rule 4, applied to a generation that is its own
   * node. A front view fixes the pose; saying "standing, facing the camera"
   * twice can only produce a contradiction later.
   */
  omit: readonly CenaPadraoKey[];
};

const VIEW_OMIT: readonly CenaPadraoKey[] = ["pose", "enquadramento"];
const GRID_OMIT: readonly CenaPadraoKey[] = ["pose", "expressao", "enquadramento"];

const RECIPES: Record<ImagemCanonicaSlot, SlotRecipe> = {
  // Portrait by default (decision G3): a stack of full-body cells wants height.
  folha_completa: {
    instruction: SHEET_GRID_INSTRUCTION,
    aspectRatio: "3:4",
    omit: GRID_OMIT,
  },
  folha_completa_horizontal: {
    instruction: SHEET_GRID_INSTRUCTION,
    aspectRatio: "4:3",
    omit: GRID_OMIT,
  },
  turnaround_frente: {
    instruction:
      "A single full-body view of one person, standing straight, facing the " +
      "camera directly, arms relaxed at the sides, feet visible. No text, no labels",
    aspectRatio: "3:4",
    omit: VIEW_OMIT,
  },
  turnaround_tres_quartos: {
    instruction:
      "A single full-body view of one person, standing straight at a " +
      "three-quarter angle to the camera, arms relaxed at the sides, feet " +
      "visible. No text, no labels",
    aspectRatio: "3:4",
    omit: VIEW_OMIT,
  },
  turnaround_perfil: {
    instruction:
      "A single full-body view of one person, standing straight in exact side " +
      "profile, arms relaxed at the sides, feet visible. No text, no labels",
    aspectRatio: "3:4",
    omit: VIEW_OMIT,
  },
  turnaround_costas: {
    instruction:
      "A single full-body view of one person seen from directly behind, " +
      "standing straight, arms relaxed at the sides, feet visible. No text, no labels",
    aspectRatio: "3:4",
    omit: VIEW_OMIT,
  },
  folha_expressoes: {
    instruction:
      "A grid of head-and-shoulders portraits of the same person, same lighting " +
      "and same framing in every cell, showing these expressions: neutral, soft " +
      "closed-lip smile, warm open smile, serious, surprised, thoughtful. " +
      "Identical face in every cell. No text, no labels",
    aspectRatio: "1:1",
    omit: GRID_OMIT,
  },
  paleta_cores: {
    instruction:
      "A colour palette board for this character: flat rectangular colour " +
      "swatches of their skin tone, hair colour, eye colour and the colours of " +
      "their canonical outfit, arranged in a row on a neutral background. " +
      "Swatches only, no person, no text, no labels",
    aspectRatio: "4:3",
    omit: GRID_OMIT,
  },
};

/**
 * 1K and 2K cost exactly the same on the default model, so there is no reason to
 * ask for the smaller one. Named rather than inlined because it is the single
 * number that decides both the bill and the quality.
 */
export const CANONICAL_IMAGE_SIZE = "2K";

export type CanonicalPrompt = {
  /** What goes to the API. */
  text: string;
  /** The identity block on its own — stored as generations.prompt_compiled. */
  compiled: CompiledPrompt;
  aspectRatio: string;
  imageSize: string;
};

export type BuildCanonicalPromptOptions = {
  sheet: CharacterSheet;
  slot: ImagemCanonicaSlot;
  /**
   * The §5.22 fallback: the same generation, once more, in opaque athletic
   * compression wear. Passed through to the compiler so that the outfit is the
   * only thing that changes — an attempt that also moved something else would
   * prove nothing about why the first one failed.
   */
  trajeCanonico?: string;
};

export function buildCanonicalPrompt({
  sheet,
  slot,
  trajeCanonico,
}: BuildCanonicalPromptOptions): CanonicalPrompt {
  const recipe = RECIPES[slot];

  const overrides: CompileOverrides = {
    omitirCenaPadrao: recipe.omit,
    ...(trajeCanonico ? { trajeCanonico } : {}),
  };

  const compiled = compilePrompt(sheet, overrides);

  // Framing, then what to draw, then who it is. The order of §4.2, and the order
  // that matters: the model should know it is drawing a reference sheet before
  // it knows anything about the body on it.
  //
  // The compiled block already ends in a full stop and the two fixed parts do
  // not, so every part is normalised without one and the sentence is closed once
  // at the end — otherwise an empty sheet would produce a prompt ending in "..".
  const joined = [REFERENCE_SHEET_FRAMING, recipe.instruction, compiled.text]
    .map((part) => part.trim().replace(/\.$/, ""))
    .filter((part) => part !== "")
    .join(". ");

  const text = joined === "" ? "" : `${joined}.`;

  return {
    text,
    compiled,
    aspectRatio: recipe.aspectRatio,
    imageSize: CANONICAL_IMAGE_SIZE,
  };
}
