/**
 * What an attached reference *is* — the optional chip of §3 of
 * docs/nodes-geracao.md.
 *
 * A closed list with a fixed English phrase, exactly like the character sheet's
 * own lists and for the same reason: the sentence the model reads must be the
 * same sentence every time, so that "produto" behaves identically in the
 * hundredth generation and in the first.
 *
 * `{n}` is the position of the image in the call. It is filled in by the
 * compiler, which is also what decides the order the images travel in — the
 * number in the sentence and the image it points at are produced by one piece of
 * code so they cannot drift apart.
 */

export type ReferenceKind = "produto" | "roupa" | "cenario" | "pose" | "outro";

/** Where an attached image came from. Audit only; it changes no behaviour. */
export type ReferenceOrigin = "personagem" | "upload" | "galeria" | "resultado";

export const REFERENCE_POSITION_PLACEHOLDER = "{n}";

export type ReferenceKindOption = {
  readonly key: ReferenceKind;
  readonly pt: string;
  readonly en: string;
  /**
   * The fidelity clause — what "use this image" must not be allowed to mean.
   *
   * Added on 2026-08-09 from a real generation: a bikini attached as a product
   * came back with one red strap and one blue one. The model had not ignored the
   * reference; it had treated it as inspiration. Naming the properties that may
   * not change is the difference between showing a model a picture and telling
   * it what about the picture is the point.
   *
   * Honest expectation, written here so nobody has to rediscover it: this raises
   * the hit rate, it does not guarantee it. No prompt makes an image model
   * deterministic, and the same clause will occasionally still produce a wrong
   * strap. What it does is make the wrong strap rarer, and make the instruction
   * that was violated visible in the stored prompt afterwards.
   *
   * Null for `outro`: an image nobody labelled has no property we can honestly
   * insist on.
   */
  readonly fidelidade: string | null;
};

export const REFERENCE_KINDS = [
  {
    key: "produto",
    pt: "Produto",
    en: "the product shown in reference image {n}",
    fidelidade:
      "Reproduce the exact product shown in reference image {n} — same colors, " +
      "pattern, materials and details, without alteration",
  },
  {
    key: "roupa",
    pt: "Roupa",
    en: "the outfit shown in reference image {n}",
    fidelidade:
      "The clothing must be worn exactly as shown in reference image {n} — same " +
      "colors, pattern, cut, fabric and details, without alteration",
  },
  {
    key: "cenario",
    pt: "Cenário",
    en: "the setting shown in reference image {n}",
    fidelidade:
      "Keep the setting of reference image {n} — same place, architecture, " +
      "materials and colors",
  },
  {
    key: "pose",
    pt: "Pose",
    en: "the pose shown in reference image {n}",
    fidelidade:
      "Match the body position and limb placement of reference image {n} exactly",
  },
  { key: "outro", pt: "Outro", en: "reference image {n}", fidelidade: null },
] as const satisfies readonly ReferenceKindOption[];

export function findReferenceKind(key: string | null): ReferenceKindOption | null {
  return REFERENCE_KINDS.find((kind) => kind.key === key) ?? null;
}

function atPosition(phrase: string, position: number): string {
  return phrase.replaceAll(REFERENCE_POSITION_PLACEHOLDER, String(position));
}

/**
 * The noun phrase for one attached image. An unknown or absent kind falls back to
 * naming the image itself, which says less but can never say something wrong.
 */
export function referenceSubject(kind: string | null, position: number): string {
  const option = findReferenceKind(kind) ?? findReferenceKind("outro")!;

  return atPosition(option.en, position);
}

/** The fidelity clause for one attached image, or null when there is none. */
export function referenceFidelity(kind: string | null, position: number): string | null {
  const option = findReferenceKind(kind);

  return option?.fidelidade ? atPosition(option.fidelidade, position) : null;
}
