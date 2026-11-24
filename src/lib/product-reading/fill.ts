/**
 * Only into what is empty — invariant 11, for the product card.
 *
 * A reading of the photo writes a Name and a Description. It never overwrites
 * either: a field somebody typed, pasted, or kept from an earlier reading stays
 * exactly as it is. Three doors lead into those two fields — the reading, a
 * pasted page, the keyboard — and "what is in the fields when you generate is
 * what goes in" (owner, 21/09/2026) only holds if no door can undo another.
 *
 * Pure, and with a truth table of four rows:
 *
 *   Nome    Descrição   the reading…
 *   empty   empty       fills both                 "2 preenchidos"
 *   full    empty       fills the description      "1 preenchido · 1 preservado"
 *   empty   full        fills the name             "1 preenchido · 1 preservado"
 *   full    full        does not exist as a click  the button is off, and says why
 *
 * The last row is the one about money: a reading that can write nothing is a
 * reading paid for nothing. It is refused before the click, and again on the
 * server — which never trusts that the button was off.
 */

/** A field is empty when there is nothing in it but space. */
export function isBlank(value: string | null | undefined): boolean {
  return (value ?? "").trim() === "";
}

export type FillPlan = {
  /** The reading may write the name. */
  nome: boolean;
  /** The reading may write the description. */
  descricao: boolean;
  /** How many of the two it may write: 0, 1 or 2. */
  preenchidos: number;
  /** How many it must leave alone. */
  preservados: number;
};

/** What a reading would be allowed to write, given which fields are empty NOW. */
export function planFill(empty: { nome: boolean; descricao: boolean }): FillPlan {
  const preenchidos = Number(empty.nome) + Number(empty.descricao);

  return {
    nome: empty.nome,
    descricao: empty.descricao,
    preenchidos,
    preservados: 2 - preenchidos,
  };
}

export type ProductText = { nome: string; descricao: string };

/**
 * The card's two fields after a reading — and the tally of what happened.
 *
 * Decided against the fields as they are AT THIS MOMENT, not as they were when
 * the reading was asked for: the answer takes seconds to arrive, and whatever
 * reached a field in the meantime wins. The tally describes what was done, so
 * the placard on the card can never claim a field it did not write.
 */
export function applyReading(
  current: ProductText,
  reading: ProductText,
): { text: ProductText; plan: FillPlan } {
  const plan = planFill({ nome: isBlank(current.nome), descricao: isBlank(current.descricao) });

  return {
    text: {
      nome: plan.nome ? reading.nome : current.nome,
      descricao: plan.descricao ? reading.descricao : current.descricao,
    },
    plan,
  };
}
