/**
 * What an attached reference *is* — the optional chip of §3 of
 * docs/nodes-geracao.md.
 *
 * A closed list with a fixed English phrase, exactly like the character sheet's
 * own lists and for the same reason: the sentence the model reads must be the
 * same sentence every time, so that "produto" behaves identically in the
 * hundredth generation and in the first.
 *
 * `{n}` is where the image is in the call — "image 2", or "images 2, 3 and 4"
 * when several photos are the same object. It is filled in by the compiler,
 * which is also what decides the order the images travel in: the number in the
 * sentence and the image it points at are produced by one piece of code, so they
 * cannot drift apart.
 */

export type ReferenceKind =
  | "produto"
  | "roupa"
  | "cenario"
  | "pose"
  | "estilo_visual"
  | "outro";

/** Where an attached image came from. Audit only; it changes no behaviour. */
export type ReferenceOrigin =
  | "personagem"
  | "upload"
  | "galeria"
  | "resultado"
  | "produto";

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
    en: "the product shown in reference {n}",
    fidelidade:
      "Reproduce the exact product shown in reference {n} — same colors, " +
      "pattern, materials and details, without alteration",
  },
  {
    key: "roupa",
    pt: "Roupa",
    en: "the outfit shown in reference {n}",
    fidelidade:
      "The clothing must be worn exactly as shown in reference {n} — same " +
      "colors, pattern, cut, fabric and details, without alteration",
  },
  {
    key: "cenario",
    pt: "Cenário",
    en: "the setting shown in reference {n}",
    fidelidade:
      "Keep the setting of reference {n} — same place, architecture, " +
      "materials and colors",
  },
  {
    key: "pose",
    pt: "Pose",
    en: "the pose shown in reference {n}",
    fidelidade:
      "Match the body position and limb placement of reference {n} exactly",
  },
  {
    // The first kind about the *how* rather than the *what*. The clause names
    // what to match (style, mood, grading, light) and forbids what to copy
    // (subject, content) — without the prohibition, "use the style" degenerates
    // into "copy the image".
    key: "estilo_visual",
    pt: "Estilo visual",
    en: "the visual style of reference {n}",
    fidelidade:
      "Match the visual style, mood, color grading and lighting of " +
      "reference {n} — do not copy its subject or content",
  },
  { key: "outro", pt: "Outro", en: "reference {n}", fidelidade: null },
] as const satisfies readonly ReferenceKindOption[];

export function findReferenceKind(key: string | null): ReferenceKindOption | null {
  return REFERENCE_KINDS.find((kind) => kind.key === key) ?? null;
}

/**
 * "image 2" · "images 2 and 3" · "images 2, 3 and 4".
 *
 * The word `image` lives here rather than in the phrases above so a directive
 * can name one picture or five with the same sentence — and so that a single
 * image still produces exactly the text it always produced.
 */
function positionPhrase(positions: readonly number[]): string {
  if (positions.length <= 1) return `image ${positions[0] ?? 1}`;
  if (positions.length === 2) return `images ${positions[0]} and ${positions[1]}`;

  return `images ${positions.slice(0, -1).join(", ")} and ${positions[positions.length - 1]}`;
}

function atPositions(phrase: string, positions: readonly number[]): string {
  return phrase.replaceAll(REFERENCE_POSITION_PLACEHOLDER, positionPhrase(positions));
}

/**
 * The noun phrase for one attached image, or for several that are the same
 * object. An unknown or absent kind falls back to naming the image itself, which
 * says less but can never say something wrong.
 */
export function referenceSubject(kind: string | null, positions: readonly number[]): string {
  const option = findReferenceKind(kind) ?? findReferenceKind("outro")!;

  return atPositions(option.en, positions);
}

/** The fidelity clause for the attached image(s), or null when there is none. */
export function referenceFidelity(
  kind: string | null,
  positions: readonly number[],
): string | null {
  const option = findReferenceKind(kind);

  return option?.fidelidade ? atPositions(option.fidelidade, positions) : null;
}

/**
 * The clause that turns several photos into one object.
 *
 * Without it, three photos of a bikini carrying three independent "reproduce the
 * exact product shown in reference image N" clauses tell the model there are
 * three products — and it will happily put three of them in the frame, or blend
 * them into a fourth. Naming the images as one subject *before* insisting on
 * fidelity is what makes the insistence mean what it should.
 *
 * Null for a single image: there is nothing there to unify, and a sentence that
 * explains an absent problem is a sentence that invents one.
 */
export function referenceUnity(positions: readonly number[]): string | null {
  if (positions.length < 2) return null;

  return (
    `Reference ${positionPhrase(positions)} are the same single object ` +
    `photographed from different angles — show it once, not several times`
  );
}
