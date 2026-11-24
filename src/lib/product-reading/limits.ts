/**
 * The two ceilings of the product card's text — Frente 1, F1.
 *
 * In a file of their own because three sides read them and only one of them is
 * the server: the card (the fields stop here), the generation route (it accepts
 * up to here) and the reading contract (an answer longer than this is not a
 * reading). The contract also carries the system prompt, which has no business
 * in a browser bundle — so the numbers live apart from it.
 */

/** The ceiling of the card's Nome — and of what a reading may write into it. */
export const PRODUCT_NAME_MAX = 120;

/**
 * The ceiling of the card's Descrição: the same as the block's own prompt.
 *
 * A marketplace page does not fit in the 400 characters the old «Instrução» had,
 * and pasting one is one of the three doors into this field (owner, 21/09/2026).
 * Never truncated in silence: the field counts, and stops at the ceiling.
 */
export const PRODUCT_DESCRIPTION_MAX = 2000;
