"use client";

import { create } from "zustand";

import type { CatalogModel } from "@/lib/ai/catalog-types";
import { useCanvasStore } from "@/lib/canvas/store";
import {
  readProductPhoto,
  recoverProductReading,
  type ProductReadingFailure,
  type ProductReadingResult,
  type RecoveredReading,
} from "@/lib/product-reading/actions";
import { refreshReadingCatalog } from "@/lib/product-reading/catalog-store";
import { applyReading, type FillPlan } from "@/lib/product-reading/fill";
import { readingGate } from "@/lib/product-reading/gate";
import { centsToSparks } from "@/lib/sparks";
import { useBalance } from "@/lib/sparks/balance-store";

/**
 * What the click on «Ler a foto · N ⚡» DOES — the part of the product card that
 * is not about drawing. Frente 1, F1.
 *
 * Outside the component for the reason `image-gesture.ts` is outside its hook:
 * so it can be proved without a browser. And because the three rules below are
 * about money, and a rule about money should not live in a render:
 *
 *   one click, at most one call    the card is marked as reading BEFORE the
 *                                  first `await`, so a second click in the same
 *                                  instant finds the mark and stops. It comes
 *                                  down in every ending — no `finally` left to
 *                                  forget, each branch sets the next state.
 *
 *   never a retry                  nothing here calls the reading twice for one
 *                                  click. What a failed reading offers is the
 *                                  button again — a click, never an effect.
 *
 *   a lost answer is not a         when the call REJECTS, the reading may have
 *   failed reading                 been made and charged anyway: the answer was
 *                                  lost on the way back. The card does not say
 *                                  "nada foi cobrado" — it does not know —, and
 *                                  it does not let the person pay again to find
 *                                  out: the button stays off, and the card asks
 *                                  the server, for free, for the reading of
 *                                  THAT click.
 *
 * ---------------------------------------------------------------------------
 * None of this is part of the document
 * ---------------------------------------------------------------------------
 *
 * "Reading…", the tally of the last reading, a refusal: things that just
 * happened, not things the card IS. They live in this store and never in the
 * node's `data`, which the autosave writes — a refusal saved into a workflow
 * would be on the card tomorrow, about a click nobody remembers.
 *
 * What a reading DOES write to the card is the text, the id of the reading that
 * wrote the description, and nothing else.
 */

/**
 * How long after a click the server can still be working on it.
 *
 * The reading is a Server Action of the studio page, which the platform ends at
 * 60 seconds (`maxDuration`), and the slowest adapter gives up on its own a
 * little after 100 (Anthropic: 50 seconds, once more on a failure). Past this,
 * a reading that is not in the database is a reading that will never be — which
 * is the only moment the card may say "nada foi cobrado" about a click whose
 * answer it never received.
 */
export const LOST_SETTLE_MS = 120_000;

/** What a click that reached the server came back with. */
type Delivered = {
  readingId: string;
  nome: string;
  descricao: string;
  sparksCharged: number;
};

/** Only the four fields — whichever answer they came in, nothing else is kept. */
function delivered(source: Delivered): Delivered {
  return {
    readingId: source.readingId,
    nome: source.nome,
    descricao: source.descricao,
    sparksCharged: source.sparksCharged,
  };
}

export type CardReading =
  /** A reading of this card is on its way. */
  | { phase: "reading" }
  /** The last reading: what it charged and what it wrote. */
  | { phase: "done"; charged: number; plan: FillPlan }
  /** The reading did not happen, or failed. Nothing was charged. */
  | {
      phase: "refused";
      reason: Exclude<ProductReadingFailure, "unconfirmed">;
      neededSparks: number | null;
      balanceSparks: number | null;
    }
  /**
   * The answer never arrived, and asking for it has found nothing — yet. The
   * button stays off: a second click here could be a second charge for the same
   * photo. `checked` counts the times somebody asked again.
   */
  | {
      phase: "lost";
      projectId: string;
      tentativa: string;
      /** When the click happened, by this browser's clock. */
      since: number;
      checking: boolean;
      checked: number;
    }
  /**
   * The answer never arrived, the server was asked after it could no longer be
   * working, and there is no such reading: nothing was made, nothing charged.
   */
  | { phase: "never_made" };

/**
 * The card is waiting for an answer about a click — the reading itself, or the
 * question of whether it was made. Either way, another click is not allowed.
 */
export function isWaiting(state: CardReading | undefined): boolean {
  return state?.phase === "reading" || state?.phase === "lost";
}

type ReadingsState = {
  byCard: Record<string, CardReading>;
  /**
   * Readings that arrived while their card was not on the canvas — another
   * project had been opened in the meantime. Paid, and kept: the card takes it
   * when it is on screen again (`claimParkedReading`).
   */
  parked: Record<string, Delivered & { projectId: string }>;
  set: (nodeId: string, state: CardReading | null) => void;
  park: (nodeId: string, reading: Delivered & { projectId: string }) => void;
  unpark: (nodeId: string) => void;
};

export const useProductReadings = create<ReadingsState>()((set) => ({
  byCard: {},
  parked: {},

  set: (nodeId, state) =>
    set((current) => {
      const byCard = { ...current.byCard };

      if (state === null) delete byCard[nodeId];
      else byCard[nodeId] = state;

      return { byCard };
    }),

  park: (nodeId, reading) => set((current) => ({ parked: { ...current.parked, [nodeId]: reading } })),

  unpark: (nodeId) =>
    set((current) => {
      const parked = { ...current.parked };

      delete parked[nodeId];

      return { parked };
    }),
}));

type ProductCard = { nome: string; descricao: string; assetIds: string[] };

/** The product card as the canvas holds it right now — or null when it is not there. */
function cardOnCanvas(nodeId: string, projectId: string): ProductCard | null {
  const canvas = useCanvasStore.getState();

  if (canvas.projectId !== projectId) return null;

  const node = canvas.nodes.find((entry) => entry.id === nodeId && entry.type === "input-product");

  if (!node) return null;

  return {
    nome: typeof node.data.nome === "string" ? node.data.nome : "",
    // The description lives under the key the «Instrução» always had, so a card
    // made before the field was renamed keeps its text (owner's answer 9.1).
    descricao: typeof node.data.instrucao === "string" ? node.data.instrucao : "",
    assetIds: Array.isArray(node.data.assetIds)
      ? node.data.assetIds.filter((id): id is string => typeof id === "string")
      : [],
  };
}

/**
 * The wallet's figure after a reading — taken only when it brings the number on
 * screen DOWN.
 *
 * Assignment and not `spend`, because the wallet feed already delivers the
 * figure the moment the debit lands: subtracting on top of it would take the
 * same four Sparks off the screen twice.
 *
 * And only downwards, because answers can cross. Two cards read at once, the
 * first answer is delayed, and it arrives carrying the balance from BEFORE the
 * second debit — assigned blindly, the screen would show money the wallet no
 * longer has. A reading can only ever lower a balance, so a figure above the
 * one on screen is an old one. Whatever raises a balance — a top-up, a refund —
 * arrives by the feed, never by here.
 */
function lowerBalanceTo(balanceCents: number | null): void {
  // Unknown stays unknown: the screen is never told "zero" because a read failed.
  if (balanceCents === null) return;

  const shown = useBalance.getState().sparks;

  if (shown === null || centsToSparks(balanceCents) < shown) {
    useBalance.getState().seed(balanceCents);
  }
}

/**
 * Puts a reading on its card — only into what is empty AT THIS MOMENT.
 *
 * Returns false when the card is not on the canvas: the caller keeps the
 * reading for later rather than writing into a graph that is not the card's.
 */
function place(nodeId: string, projectId: string, reading: Delivered): boolean {
  const card = cardOnCanvas(nodeId, projectId);

  if (!card) return false;

  const { text, plan } = applyReading(card, { nome: reading.nome, descricao: reading.descricao });

  if (plan.preenchidos > 0) {
    useCanvasStore.getState().updateNodeData(nodeId, {
      ...(plan.nome ? { nome: text.nome } : {}),
      // The id of the reading travels with the description it wrote, and only
      // with it: it is how the generation will know, later, whose English this
      // Portuguese has.
      ...(plan.descricao ? { instrucao: text.descricao, readingId: reading.readingId } : {}),
    });
  }

  // The tally is of what was DONE here, which is what the placard shows. The
  // row's own summary was written at the click, from what was empty then — the
  // two agree whenever the fields were not touched in between, and the card
  // locks them while it reads.
  useProductReadings.getState().set(nodeId, { phase: "done", charged: reading.sparksCharged, plan });

  return true;
}

/**
 * A reading that reached this side: the balance now, the text onto its card —
 * or kept until the card is back.
 *
 * The balance is taken HERE and never when a kept reading is finally placed:
 * by then the figure is old, and an old figure is the one thing this must not
 * paint.
 */
function arrive(
  nodeId: string,
  projectId: string,
  reading: Delivered,
  balanceCents: number | null,
): void {
  lowerBalanceTo(balanceCents);

  if (place(nodeId, projectId, reading)) return;

  // Another project is on the canvas now. The reading is paid; it waits.
  useProductReadings.getState().park(nodeId, { ...reading, projectId });
  useProductReadings.getState().set(nodeId, null);
}

/**
 * The click.
 *
 * `model` is the one the card's selector is on — what the button's price was
 * read from. The gate is asked again here, against the card as it is at this
 * instant: the button is only its rendering, and a click that got through a
 * stale render still stops.
 */
export async function readProductCard(
  input: { nodeId: string; model: CatalogModel | null },
  clock: () => number = Date.now,
): Promise<void> {
  const { nodeId, model } = input;
  const projectId = useCanvasStore.getState().projectId;

  if (!projectId) return;

  const card = cardOnCanvas(nodeId, projectId);

  if (!card) return;

  const gate = readingGate({
    lendo: isWaiting(useProductReadings.getState().byCard[nodeId]),
    fotos: card.assetIds.length,
    nome: card.nome,
    descricao: card.descricao,
    modelo: model,
    saldo: useBalance.getState().sparks,
  });

  if (!gate.pode || !model) return;

  // Up before the first `await`: two clicks in the same instant cannot both
  // get through.
  useProductReadings.getState().set(nodeId, { phase: "reading" });

  const click = { projectId, tentativa: crypto.randomUUID(), since: clock() };

  let result: ProductReadingResult;

  try {
    result = await readProductPhoto({
      projectId,
      nodeId,
      // The first photo of the card — the one that speaks for the product.
      assetId: card.assetIds[0],
      modelId: model.id,
      precoVisto: gate.preco,
      nomeVazio: gate.plano.nome,
      descricaoVazia: gate.plano.descricao,
      tentativa: click.tentativa,
    });
  } catch {
    // The call rejected: the request may never have left, or the answer may
    // have been lost after the reading was made and charged. Asked, for free.
    await settleLost(nodeId, { ...click, checked: 0 }, clock);

    return;
  }

  if (result.ok) {
    arrive(nodeId, projectId, delivered(result), result.balanceCents);

    return;
  }

  // The server made the reading, sent it to be recorded, and heard nothing
  // back. The same uncertainty as a lost answer, one hop further in — and the
  // same way out.
  if (result.reason === "unconfirmed") {
    await settleLost(nodeId, { ...click, checked: 0 }, clock);

    return;
  }

  // The button showed a price the catalogue no longer has. Asked again, so the
  // next click is made against the real number — on every card, not only this.
  if (result.reason === "price_changed") void refreshReadingCatalog();

  useProductReadings.getState().set(nodeId, {
    phase: "refused",
    reason: result.reason,
    neededSparks: result.neededSparks ?? null,
    balanceSparks: result.balanceSparks ?? null,
  });
}

/**
 * Asks the server for the reading of one click, and settles the card on the
 * answer:
 *
 *   it was made          the text goes onto the card — paid once, received once
 *   it was not, and the  nothing was charged, and the card says so: the button
 *   server is done       is the person's again
 *   anything else        "lost", with the click's id kept, so the card can ask
 *                        again without paying
 *
 * "Anything else" includes not being able to ask. A question that got no answer
 * proves nothing, however long ago the click was.
 */
async function settleLost(
  nodeId: string,
  click: { projectId: string; tentativa: string; since: number; checked: number },
  clock: () => number,
): Promise<void> {
  let answer: RecoveredReading | null;

  try {
    answer = await recoverProductReading({
      projectId: click.projectId,
      nodeId,
      tentativa: click.tentativa,
    });
  } catch {
    answer = null;
  }

  if (answer?.found) {
    arrive(nodeId, click.projectId, delivered(answer), answer.balanceCents);

    return;
  }

  // Read after the answer, not before the question: what matters is how old the
  // click is at the moment somebody KNOWS there is no reading.
  if (answer !== null && answer.certain && clock() - click.since >= LOST_SETTLE_MS) {
    useProductReadings.getState().set(nodeId, { phase: "never_made" });

    return;
  }

  useProductReadings.getState().set(nodeId, { phase: "lost", ...click, checking: false });
}

/**
 * «Conferir · 0 ⚡» — asks again for the reading of the click whose answer was
 * lost. A click, never an effect; it reads, and charges nothing.
 */
export async function checkLostReading(
  nodeId: string,
  clock: () => number = Date.now,
): Promise<void> {
  const state = useProductReadings.getState().byCard[nodeId];

  if (state?.phase !== "lost" || state.checking) return;

  useProductReadings.getState().set(nodeId, { ...state, checking: true });

  await settleLost(
    nodeId,
    {
      projectId: state.projectId,
      tentativa: state.tentativa,
      since: state.since,
      checked: state.checked + 1,
    },
    clock,
  );
}

/**
 * The card is on screen again: if a reading of it was kept, it takes it.
 *
 * Called by the card when it mounts. Nothing is asked of the server — the
 * reading was already here, paid, waiting for a canvas to be written on.
 */
export function claimParkedReading(nodeId: string): void {
  const parked = useProductReadings.getState().parked[nodeId];

  if (!parked) return;

  if (place(nodeId, parked.projectId, parked)) {
    useProductReadings.getState().unpark(nodeId);
  }
}
