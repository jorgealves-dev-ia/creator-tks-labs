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
  /** From the server-rendered page, in BRL cents. The authority. */
  seed: (balanceCents: number) => void;
  /**
   * Subtracts what a generation just charged.
   *
   * Subtraction rather than assignment, and that is the whole point. Each
   * generation answers with the balance *it* saw, and four running at once all
   * read the same starting figure — so four results carrying "1000 − 75 = 925"
   * would leave the screen showing 925 after 300 Sparks were spent. Applying the
   * charges instead of the readings is the same arithmetic the ledger did, in
   * the same order, so it lands on the same number.
   *
   * Optimistic and self-correcting: the page refreshes after a batch and reseeds
   * this with what the wallet actually says.
   */
  spend: (sparks: number) => void;
};

export const useBalance = create<BalanceState>((set) => ({
  sparks: null,
  seed: (balanceCents) => set({ sparks: centsToSparks(balanceCents) }),
  spend: (sparks) =>
    set((state) => ({
      // Never below zero on screen. The wallet itself cannot go negative — a
      // constraint enforces it — so a negative here could only ever be an
      // artefact of a stale seed.
      sparks: state.sparks === null ? null : Math.max(0, state.sparks - sparks),
    })),
}));
