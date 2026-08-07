/**
 * Money is accounted in BRL cents everywhere in the system. A Spark is only a
 * display unit, so the conversion rate lives here and nowhere else — change
 * this constant and every screen follows.
 */
export const CENTS_PER_SPARK = 1;

export function centsToSparks(cents: number): number {
  return Math.floor(cents / CENTS_PER_SPARK);
}

export function sparksToCents(sparks: number): number {
  return Math.round(sparks * CENTS_PER_SPARK);
}

export function formatSparks(cents: number): string {
  return new Intl.NumberFormat("pt-BR").format(centsToSparks(cents));
}

export function formatBRL(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}
