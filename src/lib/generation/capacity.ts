import type { CharacterEntity } from "@/lib/entities/types";
import { findMentions } from "@/lib/generation/mentions";
import { maxReferences } from "@/lib/generation/presets";

/**
 * How much room a generating block has left, in one place.
 *
 * The arithmetic is three lines and used to live in three: the strip counting
 * "4 de 6", the picker deciding how many more images it may accept, and now the
 * wire from a product card, which has to refuse before it attaches rather than
 * after. Three copies of a number the user is about to be told out loud is three
 * chances for the screen to promise one thing and the server to enforce another.
 *
 * Pure, and deliberately ignorant of where its inputs came from: the model's
 * slug, how many images are attached, and whether the mentioned character brings
 * a sheet. Nothing here knows about React Flow or about the catalogue.
 */

/**
 * How long a scene may be, in characters.
 *
 * Lives here rather than in the Server Action's Zod schema alone so the box and
 * the validator count to the same number: a field that lets someone type 2001
 * characters and then refuses the whole generation is a field that wasted the
 * sentence. The textarea stops at this number; the server checks it again,
 * because a Server Action is a public endpoint and nothing typed in a browser is
 * evidence of anything.
 */
export const PROMPT_MAX_LENGTH = 2000;

export type GeneratorCapacity = {
  /** The model's ceiling for one generation, the sheet included. */
  limit: number;
  /** 1 when a mentioned character contributes its complete sheet as image 1. */
  reserved: number;
  /** What is already spoken for — attachments plus the sheet. */
  used: number;
  /** How many more images this block can take. Never negative. */
  free: number;
};

export function generatorCapacity(input: {
  /** The provider's own model identifier; null while the catalogue is loading. */
  modelSlug: string | null;
  referenceCount: number;
  reserved: number;
}): GeneratorCapacity {
  // The conservative default of an unknown model is one image — the same floor
  // presets.ts applies, and for the same reason: promise only what is certain.
  const limit = input.modelSlug ? maxReferences(input.modelSlug) : 1;
  const used = input.referenceCount + input.reserved;

  return { limit, reserved: input.reserved, used, free: Math.max(0, limit - used) };
}

/**
 * The character a prompt mentions, as far as the browser can tell.
 *
 * Advisory only, and it has to stay that way: which frozen version `@luna`
 * resolves to is a decision only the server may take (rule 2 of the versioning
 * spec). What this answers is the smaller question the screen needs before the
 * click — is a sheet about to occupy one of the slots?
 */
export function mentionedCharacter(
  prompt: string,
  characters: Record<string, CharacterEntity>,
): CharacterEntity | null {
  const mention = findMentions(prompt)[0];

  if (!mention) return null;

  return (
    Object.values(characters).find((character) => character.handle === mention.handle) ?? null
  );
}

/** 1 when this character's active version has a complete sheet to anchor with. */
export function sheetAnchorSlots(character: CharacterEntity | null): number {
  return character?.activeVersion?.sheet.imagens_canonicas.folha_completa ? 1 : 0;
}
