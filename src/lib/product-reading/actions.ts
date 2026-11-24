"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { loadProductReadingCatalog } from "@/lib/ai/catalog";
import type { CatalogProvider } from "@/lib/ai/catalog-types";
import { readingRealCostCents } from "@/lib/ai/pricing";
import { findAudienceTerms } from "@/lib/product-reading/audience-terms";
import {
  PRODUCT_READING_CONTRACT_VERSION,
  PRODUCT_READING_SCHEMA,
  PRODUCT_READING_SYSTEM_PROMPT,
  productReadingAnswerSchema,
} from "@/lib/product-reading/contract";
import { planFill } from "@/lib/product-reading/fill";
import { photoForReading } from "@/lib/product-reading/photo";
import { isProviderConfigured } from "@/lib/providers/keys";
import { findProductReadingProvider } from "@/lib/providers/registry";
import { ProviderError, providerErrorDetail } from "@/lib/providers/types";
import { CENTS_PER_SPARK } from "@/lib/sparks";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Reading a product photo: a photo in, a name and a description out, Sparks
 * debited. Frente 1, F1 — docs/plano-produto-diz.md.
 *
 * The browser NAMES four things — the project, the card, the photo, the model —
 * and says two more: which of the card's fields are empty, and the price its
 * button was showing. The server DECIDES everything that costs. The order below
 * is the interesting part, because each step exists to make one specific way of
 * being wrong impossible:
 *
 *   1. nothing to write        a reading that could fill no field is refused
 *                              before anything else — it would be paid for nothing
 *   2. the price               read from the catalogue, never from the request.
 *                              The number the browser sends can only REFUSE the
 *                              reading (the button showed another price); it can
 *                              never lower it
 *   3. the project, the photo  both must be the caller's. Asked through RLS here,
 *                              and again inside the charging function, which runs
 *                              without it
 *   4. the balance             checked BEFORE the provider is called, so nobody is
 *                              told "saldo insuficiente" after we spent on them
 *   5. the photo               from Storage, with the type read in its BYTES
 *   6. one call                the only place a provider is spoken to
 *   7. the answer              validated before it is a reading. What does not
 *                              pass is a failure — and a failure is free
 *   8. one write               the reading and its debit, in a single database
 *                              call (`record_product_reading`): a paid reading is
 *                              always a recorded one, and the price it charges is
 *                              the one the database reads from the catalogue
 *
 * A refusal before step 6 leaves nothing behind: no row, no debit, no provider
 * asked. A failure at step 6 or 7 leaves a row — what was tried, what came back
 * — and charges nothing.
 */

const readSchema = z.object({
  projectId: z.uuid(),
  /** The card's id on the canvas — where the reading is filed. */
  nodeId: z.string().trim().min(1).max(200),
  /** The photo to read: the first one of the card. */
  assetId: z.uuid(),
  modelId: z.uuid(),
  /**
   * The price the button was showing when it was clicked.
   *
   * It decides nothing about what is charged. It is what makes R1 a mechanism
   * instead of a sentence: *if the number the gate shows is not the number the
   * click will cost, the click does not happen.*
   */
  precoVisto: z.int().positive().max(100_000),
  /** Which of the card's two fields are empty — the only ones a reading writes. */
  nomeVazio: z.boolean(),
  descricaoVazia: z.boolean(),
  /**
   * The click's own id, made by the browser — one per click.
   *
   * Recorded with the reading, and nothing else: it is how a card whose answer
   * was lost on the way back asks for THAT reading again (`recoverProductReading`)
   * without a clock on either side having to agree with the other.
   */
  tentativa: z.uuid(),
});

/**
 * Everything the card has to be able to say in plain words.
 *
 * Every one of these means **nothing was charged** — except `unconfirmed`, which
 * means nobody on this side knows: the reading was made, the call that records
 * and charges it was sent, and no answer came back from the database. The card
 * never turns that into "nada foi cobrado"; it asks for the reading of that
 * click instead (`recoverProductReading`), for free.
 */
export type ProductReadingFailure =
  | "invalid"
  | "nothing_to_fill"
  | "price_changed"
  | "insufficient_balance"
  | "not_configured"
  | "unreadable"
  | "refused"
  | "invalid_answer"
  | "unconfirmed"
  | "error";

export type ProductReadingResult =
  | {
      ok: true;
      /** The row in `extractions` — what the canvas remembers the reading by. */
      readingId: string;
      nome: string;
      /** The description in Portuguese. The English stays on the server, in that row. */
      descricao: string;
      /** What the database charged, in Sparks. */
      sparksCharged: number;
      /** The wallet after the charge, in cents — the figure, not a subtraction. */
      balanceCents: number;
    }
  | {
      ok: false;
      reason: ProductReadingFailure;
      /** On `insufficient_balance` and `price_changed`: the price, so the sentence can be specific. */
      neededSparks?: number;
      /** On `insufficient_balance`: what the wallet has. */
      balanceSparks?: number;
    };

/** Error codes raised by public.record_product_reading — see the migration. */
const CHARGE_ERROR_CODES: Record<string, ProductReadingFailure> = {
  EX001: "insufficient_balance",
  EX003: "invalid",
  EX004: "invalid",
  EX005: "invalid",
};

/**
 * A refusal with a name: the database (a five-character SQLSTATE — ours are
 * `EX001`…, Postgres's own are `23514`, `P0001`…) or the API in front of it
 * (`PGRST…`) answered, and said no.
 *
 * It is what separates the two ways the charging call can come back without a
 * row. A refusal that has a code was SAID by something that ran: the function's
 * transaction rolled back, and nothing was charged. Anything else — no code, a
 * gateway's page, a connection that dropped — is silence, and silence after a
 * write was sent is not a refusal.
 */
const NAMED_REFUSAL = /^(?:[0-9A-Z]{5}|PGRST\d+)$/;

async function requireSession() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;

  if (!userId) {
    redirect("/login");
  }

  return { supabase, userId };
}

/**
 * The models that can read a product photo, with why each is or is not usable.
 *
 * The status is computed here, from the key and the product-reading registry
 * (decision E5): the key never leaves this process, and neither does the name of
 * the variable that holds it.
 */
export async function listProductReadingProviders(): Promise<CatalogProvider[]> {
  const { supabase } = await requireSession();

  return loadProductReadingCatalog(supabase);
}

export async function readProductPhoto(input: unknown): Promise<ProductReadingResult> {
  const parsed = readSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, reason: "invalid" };
  }

  const request = parsed.data;
  const { supabase, userId } = await requireSession();

  // 1. Only into what is empty (invariant 11). The button is off when both
  //    fields are filled; this is the same rule for a request that did not come
  //    from the button.
  const plan = planFill({ nome: request.nomeVazio, descricao: request.descricaoVazia });

  if (plan.preenchidos === 0) {
    return { ok: false, reason: "nothing_to_fill" };
  }

  // 2. The model, its price and its provider — from the catalogue, never from
  //    the browser. The browser only names an id.
  const { data: model } = await supabase
    .from("ai_models")
    .select(
      "id, slug, extraction_sparks, enabled, capabilities, ai_providers (slug, env_var_name, enabled)",
    )
    .eq("id", request.modelId)
    .maybeSingle();

  const providerRow = model?.ai_providers;

  if (
    !model ||
    !providerRow ||
    !model.enabled ||
    !providerRow.enabled ||
    !model.capabilities.includes("extraction") ||
    model.extraction_sparks === null
  ) {
    return { ok: false, reason: "invalid" };
  }

  const provider = findProductReadingProvider(providerRow.slug);

  if (!provider || !isProviderConfigured(providerRow.env_var_name)) {
    return { ok: false, reason: "not_configured" };
  }

  const priceSparks = model.extraction_sparks;

  // 2b. The price the button showed has to be the price this will cost. A page
  //     left open across a catalogue change would otherwise turn «Ler a foto ·
  //     4 ⚡» into a charge of another amount.
  if (request.precoVisto !== priceSparks) {
    return { ok: false, reason: "price_changed", neededSparks: priceSparks };
  }

  // 3. The project and the photo are the caller's. RLS answers both: somebody
  //    else's row simply is not there.
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", request.projectId)
    .maybeSingle();

  if (!project) {
    return { ok: false, reason: "invalid" };
  }

  // The asset's LABEL is deliberately not selected: a file name never becomes
  // a product's name and never reaches a model (the label invariant, owner,
  // 27/09/2026). What the reading knows about the photo is the photo.
  const { data: asset } = await supabase
    .from("assets")
    .select("id, kind, storage_path")
    .eq("id", request.assetId)
    .maybeSingle();

  if (!asset || asset.kind !== "image") {
    return { ok: false, reason: "invalid" };
  }

  // 4. Balance first: a friendly refusal before the call, never after.
  const { data: wallet, error: walletError } = await supabase
    .from("wallets")
    .select("balance_cents")
    .eq("user_id", userId)
    .maybeSingle();

  // A wallet that could not be read is not a wallet with nothing in it. Reading
  // a failed query as zero would put "saldo insuficiente: a carteira tem 0 ⚡" on
  // the screen of somebody with three thousand — the screen lying about money
  // because a query failed. The reading stops, and says only that it failed.
  if (walletError || !wallet) {
    return { ok: false, reason: "error" };
  }

  const balanceCents = wallet.balance_cents;
  const balanceSparks = Math.floor(balanceCents / CENTS_PER_SPARK);

  if (balanceSparks < priceSparks) {
    return {
      ok: false,
      reason: "insufficient_balance",
      neededSparks: priceSparks,
      balanceSparks,
    };
  }

  // 5. The photo, from Storage — the file the card points at, never bytes the
  //    browser sent. Its type is read in the bytes.
  const { data: file } = await supabase.storage.from("assets").download(asset.storage_path);

  if (!file) {
    return { ok: false, reason: "unreadable" };
  }

  const photo = await photoForReading(Buffer.from(await file.arrayBuffer()));

  if (!photo) {
    return { ok: false, reason: "unreadable" };
  }

  const filed = {
    p_project_id: request.projectId,
    p_node_id: request.nodeId,
    p_model_id: model.id,
    p_reference_asset_id: asset.id,
  };

  // 6. The call itself — one, and the only place a provider is spoken to.
  let answer;

  try {
    answer = await provider.extract({
      model: { slug: model.slug },
      input: { kind: "photo", mimeType: photo.mimeType, base64: photo.base64 },
      systemPrompt: PRODUCT_READING_SYSTEM_PROMPT,
      schema: PRODUCT_READING_SCHEMA,
    });
  } catch (error) {
    const kind = error instanceof ProviderError ? error.kind : "provider";
    // The provider's own sentence, not our summary of it — kept in the row so a
    // failed reading can be diagnosed months later, from the row alone. Never a
    // credential: it is the response body, never the request.
    const detail = providerErrorDetail(error);

    if (process.env.NODE_ENV !== "production") {
      console.error(`[product-reading] ${model.slug} failed — ${detail}`);
    }

    // Recorded, and free: a failure is nobody's bill.
    await supabase.rpc("record_product_reading", {
      ...filed,
      p_status: "failed",
      p_error_message: detail.slice(0, 500),
    });

    return {
      ok: false,
      reason:
        kind === "not_configured"
          ? "not_configured"
          : kind === "refused"
            ? "refused"
            : kind === "invalid_answer"
              ? "invalid_answer"
              : "error",
    };
  }

  const realCostCents = readingRealCostCents(model.slug, answer.usage) ?? undefined;

  // 7. Three sentences, none empty, within the card's ceilings — or it is not a
  //    reading. The provider was paid for this answer; the person is not charged
  //    for it.
  const reading = productReadingAnswerSchema.safeParse(answer.fields);

  if (!reading.success) {
    const detail = `invalid answer: ${reading.error.issues
      .map((issue) => `${issue.path.join(".") || "(raiz)"} ${issue.code}`)
      .join("; ")}`;

    if (process.env.NODE_ENV !== "production") {
      console.error(`[product-reading] ${model.slug} answered, and it was not a reading — ${detail}`);
    }

    await supabase.rpc("record_product_reading", {
      ...filed,
      p_status: "failed",
      p_input_tokens: answer.usage.inputTokens,
      p_output_tokens: answer.usage.outputTokens,
      p_real_cost_cents: realCostCents,
      p_error_message: detail.slice(0, 500),
    });

    return { ok: false, reason: "invalid_answer" };
  }

  // 8. Charge and log, in one transaction. The price is not sent: the function
  //    reads it from the catalogue.
  const { data: recorded, error: chargeError } = await supabase.rpc("record_product_reading", {
    ...filed,
    p_status: "succeeded",
    p_reading: reading.data,
    p_input_tokens: answer.usage.inputTokens,
    p_output_tokens: answer.usage.outputTokens,
    p_real_cost_cents: realCostCents,
    p_summary: {
      contrato: PRODUCT_READING_CONTRACT_VERSION,
      tentativa: request.tentativa,
      preenchidos: plan.preenchidos,
      preservados: plan.preservados,
      campos: {
        nome: plan.nome ? "preenchido" : "preservado",
        descricao: plan.descricao ? "preenchido" : "preservado",
      },
      foto_reduzida: photo.reduced,
      // What the audience warning finds in this answer, at the moment it was
      // written. The card warns about the Portuguese on screen; this keeps the
      // measure — how often a model names an audience the photo does not show —
      // for the English too, which the card never displays.
      publico: {
        nome: findAudienceTerms(reading.data.nome).map((match) => match.text),
        descricao_pt: findAudienceTerms(reading.data.descricao_pt).map((match) => match.text),
        descricao_en: findAudienceTerms(reading.data.descricao_en).map((match) => match.text),
      },
    },
  });

  if (chargeError || !recorded) {
    const code = chargeError?.code ?? "";

    // The database said no, by name: nothing was written and nothing charged.
    // Nobody keeps a text they were just told they could not pay for.
    if (NAMED_REFUSAL.test(code)) {
      return { ok: false, reason: CHARGE_ERROR_CODES[code] ?? "error" };
    }

    // No answer. The write was sent and may have landed: this is the one ending
    // where "nothing was charged" would be a guess, so it is not said. The card
    // asks for the reading of this click by its id, which reads and charges
    // nothing.
    return { ok: false, reason: "unconfirmed" };
  }

  // The wallet as it is NOW, after the debit — the figure the screen should
  // show, rather than a subtraction from a balance read before the call.
  const { data: after } = await supabase
    .from("wallets")
    .select("balance_cents")
    .eq("user_id", userId)
    .maybeSingle();

  return {
    ok: true,
    readingId: recorded.id,
    nome: reading.data.nome,
    descricao: reading.data.descricao_pt,
    sparksCharged: recorded.sparks_charged,
    balanceCents:
      after?.balance_cents ?? balanceCents - recorded.sparks_charged * CENTS_PER_SPARK,
  };
}

const recoverSchema = z.object({
  projectId: z.uuid(),
  nodeId: z.string().trim().min(1).max(200),
  /** The id of the click whose answer was lost. */
  tentativa: z.uuid(),
});

export type RecoveredReading =
  | {
      found: true;
      readingId: string;
      nome: string;
      descricao: string;
      sparksCharged: number;
      /** Null when the wallet could not be read: an unknown balance is not a balance of zero. */
      balanceCents: number | null;
    }
  | {
      found: false;
      /**
       * True when the database was asked and answered that there is no such
       * reading. False when the question could not be asked, or the answer could
       * not be read — which says nothing about whether the reading exists.
       *
       * The card needs the difference: only a certain "no" lets it tell the
       * person that nothing was charged.
       */
      certain: boolean;
    };

/**
 * A reading whose answer never reached the card — asked for again, for free.
 *
 * `readProductPhoto` can finish on the server and still fail to answer: the
 * connection drops on the way back. The reading was paid and recorded, and the
 * card is still empty. Without this, the only way to get the text would be to
 * pay for it a second time.
 *
 * So when the answer is lost, the card asks for the reading of THAT click, by
 * the id the click carried. It reads; it charges nothing and calls no provider.
 * RLS answers for the owner. By id and not by time: "a reading of this card in
 * the last minute" would also find the one the person just erased in order to
 * read again.
 */
export async function recoverProductReading(input: unknown): Promise<RecoveredReading> {
  const parsed = recoverSchema.safeParse(input);

  if (!parsed.success) return { found: false, certain: false };

  const { supabase, userId } = await requireSession();

  const { data: row, error } = await supabase
    .from("extractions")
    .select("id, reading, sparks_charged")
    .eq("subject", "product")
    .eq("status", "succeeded")
    .eq("project_id", parsed.data.projectId)
    .eq("node_id", parsed.data.nodeId)
    .eq("summary->>tentativa", parsed.data.tentativa)
    .limit(1)
    .maybeSingle();

  // The question did not get an answer. That is not a "no".
  if (error) return { found: false, certain: false };

  // Asked and answered: there is no reading of that click.
  if (!row) return { found: false, certain: true };

  // The row's text is `jsonb` — data from a column, validated like data from
  // anywhere else. A row that is there and cannot be read is a paid reading the
  // card cannot show: never reported as "there is none".
  const reading = productReadingAnswerSchema.safeParse(row.reading);

  if (!reading.success) return { found: false, certain: false };

  const { data: wallet } = await supabase
    .from("wallets")
    .select("balance_cents")
    .eq("user_id", userId)
    .maybeSingle();

  return {
    found: true,
    readingId: row.id,
    nome: reading.data.nome,
    descricao: reading.data.descricao_pt,
    sparksCharged: row.sparks_charged,
    balanceCents: wallet?.balance_cents ?? null,
  };
}
