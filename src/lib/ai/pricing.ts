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

// ---------------------------------------------------------------------------
// Image generation
// ---------------------------------------------------------------------------

/**
 * Image models bill in two currencies at once: a published price per finished
 * image, which depends on its size, plus the usual per-token price for whatever
 * went in — and for a separate view, what goes in includes the whole reference
 * sheet.
 *
 * Prices in US dollars, read from Google's official pricing page on 2026-08-09.
 * Only models with an adapter are listed: a price for a model nothing can call
 * would be a number nobody could ever check.
 */
type ImagePrice = {
  /** Dollars per finished image, by the size vocabulary the API uses. */
  perImage: Record<string, number>;
  /** Dollars per million input tokens (text and image both). */
  input: number;
};

const IMAGE_PRICES_USD: Record<string, ImagePrice> = {
  "gemini-3-pro-image": {
    perImage: { "1K": 0.134, "2K": 0.134, "4K": 0.24 },
    input: 2,
  },
  "gemini-3.1-flash-image": {
    perImage: { "512": 0.045, "1K": 0.067, "2K": 0.101, "4K": 0.151 },
    input: 0.5,
  },
};

/**
 * What one generated image really cost us, in BRL cents, rounded up.
 *
 * The published per-image price already contains the image's own output tokens,
 * so only the input is added on top — and for a separate view the input includes
 * the whole reference sheet, which is the part worth measuring.
 *
 * What is deliberately NOT counted: the model's thinking tokens, which arrive
 * mixed into the same total_output_tokens as the image itself and are billed at
 * a different rate. Measured on a real 2K generation they came to about one cent
 * in twenty. Counting them would mean guessing at the split; leaving them out
 * keeps this figure reconcilable line by line with the invoice Google actually
 * sends, which is what makes it usable for calibrating the Spark price at all.
 * A number you can check beats a number that is complete.
 *
 * Returns null for a model or size with no price on file, and the caller records
 * null rather than inventing a figure.
 */
export function imageRealCostCents(
  modelSlug: string,
  imageSize: string,
  usage: { inputTokens: number },
): number | null {
  const price = IMAGE_PRICES_USD[modelSlug];
  const perImage = price?.perImage[imageSize];

  if (!price || perImage === undefined) return null;

  const usd = perImage + (usage.inputTokens * price.input) / TOKENS_PER_MTOK;

  return Math.ceil(usd * BRL_CENTS_PER_USD);
}
