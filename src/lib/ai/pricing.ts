/**
 * What an AI call actually cost us, in BRL cents.
 *
 * This is the honest half of decision E2: the user pays a fixed price in Sparks,
 * and every extraction also records what it really cost. The gap between the two
 * is what will set the real price later — with data instead of a guess.
 *
 * Prices are per million tokens, in US dollars, read from Anthropic's official
 * model documentation on 2026-08-08. Cent precision is the goal; nothing here
 * pretends to be accounting.
 */

/**
 * Approximate USD → BRL, in BRL cents per dollar. One number, one place.
 *
 * Deliberately a constant and not a live quote: a rate that moves during the day
 * would make two identical extractions record two different costs, which is
 * exactly the noise that would ruin the calibration this table exists for. Update
 * it by hand when the rate has drifted enough to matter.
 */
const BRL_CENTS_PER_USD = 550;

/** Dollars per million tokens, input and output, for one model. */
type TokenPrice = { input: number; output: number };

/**
 * Keyed by the same slug the catalogue stores, so a model priced here and a model
 * offered in ai_models are the same string or the lookup misses loudly.
 *
 * Claude Sonnet is on introductory pricing until 2026-08-31 ($2 / $10) and
 * settles at its list price of $3 / $15 from 2026-09-01. The list price is what is
 * recorded, deliberately: until the changeover the recorded cost is up to 1.5x the
 * real invoice, which over-states our cost instead of under-pricing the product —
 * and nothing has to be remembered on the day the promotion ends.
 */
const TOKEN_PRICES_USD_PER_MTOK: Record<string, TokenPrice> = {
  "claude-opus-5": { input: 5, output: 25 },
  // Introductory $2 / $10 through 2026-08-31; list $3 / $15 from 2026-09-01.
  "claude-sonnet-5": { input: 3, output: 15 },
  "claude-haiku-4-5": { input: 1, output: 5 },
};

const TOKENS_PER_MTOK = 1_000_000;

/**
 * The cost of one call, in BRL cents, rounded up.
 *
 * Rounded up rather than to nearest so a cheap call never records as costing
 * nothing: an extraction that cost half a cent did cost something, and a column
 * full of zeros would be a comfortable lie.
 *
 * Returns null for a model with no price on file. The caller writes null to
 * extractions.real_cost_cents rather than guessing — an absent cost is honest,
 * an invented one is not.
 */
export function realCostCents(
  modelSlug: string,
  usage: { inputTokens: number; outputTokens: number },
): number | null {
  const price = TOKEN_PRICES_USD_PER_MTOK[modelSlug];

  if (!price) return null;

  const usd =
    (usage.inputTokens * price.input + usage.outputTokens * price.output) / TOKENS_PER_MTOK;

  return Math.ceil(usd * BRL_CENTS_PER_USD);
}

/** Whether we can price this model at all — used to explain a null cost. */
export function hasTokenPrice(modelSlug: string): boolean {
  return modelSlug in TOKEN_PRICES_USD_PER_MTOK;
}
