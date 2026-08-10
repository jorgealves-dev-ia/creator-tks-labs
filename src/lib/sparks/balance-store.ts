import { create } from "zustand";

import { centsToSparks } from "@/lib/sparks";

/**
 * The user's balance, on the client, in Sparks.
 *
 * It exists because of where the cost line moved to. While the price sat in the
 * corner of the block's header it was a label, and a label may reasonably say
 * nothing until there is something to say. Under the button it is a price, and a
 * price whose "· Saldo: —" only fills in *after* the first generation is exactly
 * the half-promise this project keeps refusing to make: the whole point of
 * putting the number before the click is that it is there before the click.
 *
 * Seeded from the server-rendered page, which is the only place that reads the
 * wallet, and updated by each generation from the balance the charge itself
 * returns — the same number the ledger just projected, not a second opinion
 * about it. `null` means "not seeded yet", which the interface says by showing
 * only the cost, never by showing a zero.
 *
 * The header keeps its own server-rendered figure. Two readers of one fact, and
 * neither is a second source of truth: both are copies of the wallet, refreshed
 * from it.
 */
type BalanceState = {
  /** In Sparks — the unit shown on screen. Null until the page seeds it. */
  sparks: number | null;
  /** From the server-rendered page, in BRL cents. */
  seed: (balanceCents: number) => void;
  /** From a generation that just charged, already in Sparks. */
  set: (sparks: number) => void;
};

export const useBalance = create<BalanceState>((set) => ({
  sparks: null,
  seed: (balanceCents) => set({ sparks: centsToSparks(balanceCents) }),
  set: (sparks) => set({ sparks }),
}));
