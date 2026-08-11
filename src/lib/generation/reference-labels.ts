import { t } from "@/lib/i18n/pt-BR";

/**
 * What handed this image over — in the words the canvas already uses.
 *
 * Two screens ask this question and used to answer it differently. The strip
 * inside a generating block assumed every grouped image was a product, so a
 * character sheet handed over by an Input de Character Sheet was labelled
 * "Produto:" with an empty name — every input card stamps its node id as a
 * group id, and a group of one is still a group. The "Ver prompt" panel had the
 * opposite problem: it labelled nothing at all, so a reference read "Imagem 2"
 * and stopped there.
 *
 * One table answers both now. That is the point of it being a table rather than
 * two `if` chains: the screen is the manual, and a manual that calls the same
 * card by two names is a manual that has to be checked against the product.
 *
 * ---------------------------------------------------------------------------
 * Why the live canvas and the stored history read different fields
 * ---------------------------------------------------------------------------
 *
 * On the canvas the answer is exact: the reference carries `inputType`, the node
 * type of the card that contributed it, rewritten on every edit by the store.
 *
 * In history there is no such field — a generation from last week recorded what
 * the compiler needed (`papel`, `tipo`, `grupo`), not what the interface would
 * later want to say. So the stored shape is *read back through the same table*,
 * from the marks it does carry, and the four input types are all recoverable:
 * `papel` names the sheet and the pose, `tipo: "produto"` names the product, and
 * what is left is a plain image. Nothing is invented and nothing is rewritten —
 * an old row keeps saying exactly what it said.
 */

const copy = t.generation.referenceSources;

export type ReferenceSource = {
  /** The node type of the input card, when the canvas is the one asking. */
  inputType?: string | null;
  /** The role the compiler recorded — "folha" or "pose". History has this. */
  papel?: string | null;
  /** The chip: what the picture shows. */
  kind?: string | null;
  /** What the group is called, when it has a name of its own. */
  groupLabel?: string | null;
  /** Where the image came from, for the sources that are not input cards. */
  origem?: string | null;
};

export type ReferenceSourceLabel = {
  /** "Character Sheet" — for a line that already begins with "Imagem 2 ·". */
  short: string;
  /** "Input de Character Sheet" — for a tooltip that appears with no context. */
  long: string;
  /** The product's own name, when it has one. */
  name: string | null;
};

export function referenceSourceLabel(source: ReferenceSource): ReferenceSourceLabel {
  const name = source.groupLabel?.trim() ? source.groupLabel.trim() : null;

  if (source.inputType === "input-sheet" || source.papel === "folha") {
    return { short: copy.sheet, long: copy.sheetLong, name: null };
  }

  if (source.inputType === "input-pose" || source.papel === "pose") {
    return { short: copy.pose, long: copy.poseLong, name: null };
  }

  if (source.inputType === "input-product" || source.kind === "produto") {
    return { short: copy.product, long: copy.productLong, name };
  }

  // A Resultado wired straight into the block. It has a node like everything
  // else, but it is not one of the four cards on the shelf, so it says what it
  // is rather than borrowing a name from them.
  if (source.inputType === "result" || source.origem === "resultado") {
    return { short: copy.result, long: copy.resultLong, name: null };
  }

  return { short: copy.image, long: copy.imageLong, name };
}

/** "Input de Produto: Pijama" — the tooltip form, name included when there is one. */
export function referenceSourceTooltip(source: ReferenceSource): string {
  const label = referenceSourceLabel(source);

  return label.name ? `${label.long}: ${label.name}` : label.long;
}

/**
 * "Imagem 2" · "Imagens 3 e 4" · "Imagens 2, 3 e 4".
 *
 * The Portuguese mirror of `positionPhrase` in references.ts, which writes the
 * same thing in English for the model. The two exist separately because one is
 * read by a person and the other by a model, and they must agree on the only
 * part that matters: the numbers.
 */
export function positionsLabel(positions: readonly number[]): string {
  if (positions.length <= 1) return `${copy.imageOne} ${positions[0] ?? 1}`;

  const head = positions.slice(0, -1).join(", ");

  return `${copy.imageMany} ${head} ${copy.and} ${positions[positions.length - 1]}`;
}

/**
 * "Folha da @luna · âncora".
 *
 * The one image in a generation that belongs to no input card: it arrives with
 * the mention, occupies the first slot, and is why the first *attached*
 * reference is numbered 2. Saying so is what makes that number explicable
 * instead of merely correct.
 */
export function anchorLabel(handle: string): string {
  return `${copy.anchorPrefix}${handle} · ${copy.anchorSuffix}`;
}
