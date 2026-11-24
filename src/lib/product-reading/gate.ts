import type { CatalogModel, CatalogProvider } from "@/lib/ai/catalog-types";
import { isBlank, planFill, type FillPlan } from "@/lib/product-reading/fill";

/**
 * The gate of «Ler a foto · N ⚡» — whether the click may happen, and what it
 * will cost, decided BEFORE the click. Frente 1, F1.
 *
 * Pure: it reads the card, the catalogue and the balance, and answers. The
 * button is a rendering of this answer and nothing else, which is what lets the
 * rule be proved without a browser — and what keeps the sentence under the
 * button and the state of the button from ever disagreeing.
 *
 * It is the first of two gates. The server takes none of this on trust: the
 * price is read from the catalogue again, the balance from the wallet again, and
 * a request that should not have been possible is refused there too
 * (`actions.ts`). This one exists so that a refusal is a sentence on the card
 * instead of an error after a wait.
 */

/**
 * The model the reading opens on when nobody chose: the one the catalogue marks
 * as the product default — the Gemini 3.7 Flash, at 4 ⚡ (owner, 27/09/2026) —,
 * when its provider can run.
 *
 * And NOTHING when it cannot. This is the one place where the house's usual
 * fallback ("else, the first usable model") is wrong on purpose: the first
 * usable model of the list is Claude Sonnet, at 20 ⚡, and the owner's rule is
 * that Sonnet is never the default for a product (answer 9.4). A default is what
 * happens when nobody chooses — so with no default able to run, nothing happens
 * until somebody does.
 */
export function productReadingDefaultModelId(providers: readonly CatalogProvider[]): string | null {
  for (const provider of providers) {
    if (provider.status !== "ready") continue;

    const marked = provider.models.find((model) => model.isDefault);

    if (marked) return marked.id;
  }

  return null;
}

/** A model of the list, when it is one somebody can select right now. */
function selectable(providers: readonly CatalogProvider[], modelId: string | null): CatalogModel | null {
  if (!modelId) return null;

  for (const provider of providers) {
    if (provider.status !== "ready") continue;

    const model = provider.models.find((entry) => entry.id === modelId);

    if (model) return model;
  }

  return null;
}

/**
 * The model the card's selector is on: the one the card remembers — the model of
 * its last choice, as the Máquina remembers its own —, while it can still be
 * selected; otherwise the default; otherwise none.
 *
 * A remembered model that left the list, or whose provider lost its key, is not
 * silently replaced by something more expensive: it falls to the DEFAULT, and
 * the default's fallback is nothing.
 */
export function readingModelFor(
  providers: readonly CatalogProvider[],
  rememberedId: string | null | undefined,
): CatalogModel | null {
  return (
    selectable(providers, rememberedId ?? null) ??
    selectable(providers, productReadingDefaultModelId(providers))
  );
}

export type ReadingRefusal =
  /** A reading of this card is already on its way. */
  | "lendo"
  /** The card has no photo to read. */
  | "sem_foto"
  /** Name and description are both filled: nothing the reading could write. */
  | "campos_cheios"
  /** No model can be selected — the catalogue is still loading, or no provider can run. */
  | "sem_modelo"
  /** The balance does not cover the price. */
  | "sem_saldo";

export type ReadingGate =
  | {
      pode: true;
      /** What this click will cost, in Sparks — the catalogue's price for the chosen model. */
      preco: number;
      /** What the reading will be allowed to write. */
      plano: FillPlan;
    }
  | {
      pode: false;
      motivo: ReadingRefusal;
      /** The price, when a model is chosen — so the button still says what it would cost. */
      preco: number | null;
      /** How many Sparks are missing. Only on `sem_saldo`. */
      faltam: number | null;
    };

/**
 * May the click happen?
 *
 * The order of the refusals is the order somebody would fix them in: a reading
 * under way first (nothing to fix — wait), then what the card lacks, then what
 * the catalogue lacks, then the wallet.
 *
 * `saldo` null means the page has not seeded the balance yet. It does not block:
 * a balance nobody knows is not a balance of zero, and the server checks the
 * wallet itself before anything is spent.
 */
export function readingGate(input: {
  lendo: boolean;
  fotos: number;
  nome: string;
  descricao: string;
  modelo: CatalogModel | null;
  saldo: number | null;
}): ReadingGate {
  const preco = input.modelo?.sparks ?? null;
  const refuse = (motivo: ReadingRefusal, faltam: number | null = null): ReadingGate => ({
    pode: false,
    motivo,
    preco,
    faltam,
  });

  if (input.lendo) return refuse("lendo");

  if (input.fotos < 1) return refuse("sem_foto");

  const plano = planFill({ nome: isBlank(input.nome), descricao: isBlank(input.descricao) });

  if (plano.preenchidos === 0) return refuse("campos_cheios");

  if (preco === null) return refuse("sem_modelo");

  if (input.saldo !== null && input.saldo < preco) return refuse("sem_saldo", preco - input.saldo);

  return { pode: true, preco, plano };
}
