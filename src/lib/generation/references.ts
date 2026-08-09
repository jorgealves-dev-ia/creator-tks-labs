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
};

export const REFERENCE_KINDS = [
  { key: "produto", pt: "Produto", en: "the product shown in reference image {n}" },
  { key: "roupa", pt: "Roupa", en: "the outfit shown in reference image {n}" },
  { key: "cenario", pt: "Cenário", en: "the setting shown in reference image {n}" },
  { key: "pose", pt: "Pose", en: "the pose shown in reference image {n}" },
  { key: "outro", pt: "Outro", en: "reference image {n}" },
] as const satisfies readonly ReferenceKindOption[];

export function findReferenceKind(key: string | null): ReferenceKindOption | null {
  return REFERENCE_KINDS.find((kind) => kind.key === key) ?? null;
}

/**
 * The noun phrase for one attached image. An unknown or absent kind falls back to
 * naming the image itself, which says less but can never say something wrong.
 */
export function referenceSubject(kind: string | null, position: number): string {
  const option = findReferenceKind(kind) ?? findReferenceKind("outro")!;

  return option.en.replaceAll(REFERENCE_POSITION_PLACEHOLDER, String(position));
}
