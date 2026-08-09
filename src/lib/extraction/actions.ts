"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { loadCatalog } from "@/lib/ai/catalog";
import type { CatalogModel, CatalogProvider } from "@/lib/ai/catalog-types";
import { realCostCents } from "@/lib/ai/pricing";
import { parseSheet, sheetToJson, type CharacterSheet } from "@/lib/character-sheet/schema";
import { validateExtraction } from "@/lib/extraction/answer";
import { applyExtraction, summaryToJson, type ExtractionSummary } from "@/lib/extraction/apply";
import {
  ACCEPTED_IMAGE_MIME_TYPES,
  MAX_IMAGE_BYTES,
  MAX_SOURCE_TEXT_LENGTH,
} from "@/lib/extraction/contract";
import { buildSystemPrompt } from "@/lib/extraction/prompt";
import { isProviderConfigured } from "@/lib/providers/keys";
import { findExtractionProvider } from "@/lib/providers/registry";
import { ProviderError, type ExtractionInput } from "@/lib/providers/types";
import { CENTS_PER_SPARK } from "@/lib/sparks";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * The extraction engine: reference in, filled draft out, Sparks debited.
 *
 * The order of operations is the interesting part, because each step exists to
 * make a specific way of being wrong impossible:
 *
 *   1. the balance is checked BEFORE the provider is called, so nobody is told
 *      "insufficient balance" after we already spent money on their behalf
 *   2. the photo is registered BEFORE the call, so even a failed extraction can
 *      answer "what did it try to read?"
 *   3. the answer is validated against the dictionary BEFORE it touches the sheet
 *   4. the charge happens in one database call together with the log, so a paid
 *      extraction is always a recorded one (see public.record_extraction)
 *   5. the new draft is returned to the caller either way, so a paid extraction
 *      can never be lost to a failed write
 *
 * A failure of the provider is recorded too, and charges nothing (spec §4.4).
 */

const entityIdSchema = z.uuid();

const photoInputSchema = z.object({
  source: z.literal("photo"),
  entityId: entityIdSchema,
  modelId: z.uuid(),
  storagePath: z.string().min(1),
  mimeType: z.enum(ACCEPTED_IMAGE_MIME_TYPES),
  byteSize: z.int().positive().max(MAX_IMAGE_BYTES),
});

const textInputSchema = z.object({
  source: z.literal("text"),
  entityId: entityIdSchema,
  modelId: z.uuid(),
  text: z.string().trim().min(20).max(MAX_SOURCE_TEXT_LENGTH),
});

const extractionInputSchema = z.discriminatedUnion("source", [photoInputSchema, textInputSchema]);

/** Everything the interface has to be able to say in plain words. */
export type ExtractionFailure =
  | "invalid"
  | "insufficient_balance"
  | "not_configured"
  | "refused"
  | "unreadable"
  | "error";

export type ExtractionResult =
  | {
      ok: true;
      sheet: CharacterSheet;
      summary: ExtractionSummary;
      sparksCharged: number;
    }
  | {
      ok: false;
      reason: ExtractionFailure;
      /** Present on insufficient_balance, so the message can be specific. */
      neededSparks?: number;
      balanceSparks?: number;
    };

/** Error codes raised by public.record_extraction — see the migration. */
const CHARGE_ERROR_CODES: Record<string, ExtractionFailure> = {
  EX001: "insufficient_balance",
  EX002: "invalid",
  EX003: "invalid",
};

async function requireSession() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;

  if (!userId) {
    redirect("/login");
  }

  return { supabase, userId };
}

// ---------------------------------------------------------------------------
// The catalogue, as the selector needs it
// ---------------------------------------------------------------------------

/**
 * Kept as names of their own so the extraction panel does not have to learn the
 * catalogue's vocabulary — but they are the shared shapes, because a selector
 * that works for one capability and not the other would not be a shared selector.
 */
export type ExtractionModelOption = CatalogModel;
export type ExtractionProviderOption = CatalogProvider;

/**
 * The providers and models that can extract, with why each is or is not usable.
 *
 * The status is computed on the server, from the key and the registry — decision
 * E5. The key never leaves this process, and the name of the variable that holds
 * it is not sent either: the interface has no use for it.
 */
export async function listExtractionProviders(): Promise<ExtractionProviderOption[]> {
  const { supabase } = await requireSession();

  return loadCatalog(supabase, "extraction");
}

/** The user's balance in Sparks — for the cost confirmation of spec §4.1. */
export async function getSparkBalance(): Promise<number> {
  const { supabase, userId } = await requireSession();

  const { data } = await supabase
    .from("wallets")
    .select("balance_cents")
    .eq("user_id", userId)
    .maybeSingle();

  return Math.floor((data?.balance_cents ?? 0) / CENTS_PER_SPARK);
}

// ---------------------------------------------------------------------------
// The engine
// ---------------------------------------------------------------------------

export async function runExtraction(input: unknown): Promise<ExtractionResult> {
  const parsed = extractionInputSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, reason: "invalid" };
  }

  const request = parsed.data;
  const { supabase, userId } = await requireSession();

  // 1. The model, its price and its provider — from the catalogue, never from
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

  const provider = findExtractionProvider(providerRow.slug);

  if (!provider || !isProviderConfigured(providerRow.env_var_name)) {
    return { ok: false, reason: "not_configured" };
  }

  const priceSparks = model.extraction_sparks;

  // 2. The character and the draft the extraction will land on. Read from the
  //    database rather than sent by the browser, for the same reason a version is
  //    photographed from the stored draft: the draft is the only thing there is.
  const { data: entity } = await supabase
    .from("entities")
    .select("id, sheet")
    .eq("id", request.entityId)
    .eq("user_id", userId)
    .is("archived_at", null)
    .maybeSingle();

  if (!entity) {
    return { ok: false, reason: "invalid" };
  }

  const sheet = parseSheet(entity.sheet);

  // 3. Balance first (spec §4.4): a friendly block before the call, never after.
  const { data: wallet } = await supabase
    .from("wallets")
    .select("balance_cents")
    .eq("user_id", userId)
    .maybeSingle();

  const balanceSparks = Math.floor((wallet?.balance_cents ?? 0) / CENTS_PER_SPARK);

  if (balanceSparks < priceSparks) {
    return {
      ok: false,
      reason: "insufficient_balance",
      neededSparks: priceSparks,
      balanceSparks,
    };
  }

  // 4. The input. A photo is registered as an asset before the call, so a failed
  //    extraction still records what it was pointed at.
  let providerInput: ExtractionInput;
  let referenceAssetId: string | null = null;
  let sourceText: string | null = null;

  if (request.source === "photo") {
    if (!request.storagePath.startsWith(`${userId}/`)) {
      return { ok: false, reason: "invalid" };
    }

    const { data: asset } = await supabase
      .from("assets")
      .insert({
        user_id: userId,
        kind: "image",
        source: "upload",
        storage_path: request.storagePath,
        mime_type: request.mimeType,
        byte_size: request.byteSize,
        width: null,
        height: null,
      })
      .select("id")
      .single();

    if (!asset) {
      return { ok: false, reason: "error" };
    }

    referenceAssetId = asset.id;

    // The browser uploaded straight to Storage — the same path the canonical
    // images take, and the only one that avoids the 1 MB body limit of a Server
    // Action. Reading it back here is an internal hop, and it is what lets the
    // photo be stored once and used twice: as the API input and as the audit
    // trail.
    const { data: file } = await supabase.storage.from("assets").download(request.storagePath);

    if (!file) {
      return { ok: false, reason: "unreadable" };
    }

    providerInput = {
      kind: "photo",
      mimeType: request.mimeType,
      base64: Buffer.from(await file.arrayBuffer()).toString("base64"),
    };
  } else {
    sourceText = request.text;
    providerInput = { kind: "text", text: request.text };
  }

  // 5. The call itself — the only place a provider is spoken to.
  let answer;

  try {
    answer = await provider.extract({
      model: { slug: model.slug },
      input: providerInput,
      systemPrompt: buildSystemPrompt(sheet),
    });
  } catch (error) {
    const kind = error instanceof ProviderError ? error.kind : "provider";

    // The provider's own sentence, not our summary of it. A failure that only
    // says "returned 400" costs an afternoon; the API's own message names the
    // field and the rule. Kept in the log so a failed extraction can be
    // diagnosed months later, from the row alone.
    const detail =
      error instanceof ProviderError
        ? `${error.message}: ${error.detail ?? "no detail"}`
        : error instanceof Error
          ? error.message
          : String(error);

    // In development it also goes to the terminal, where whoever is looking at
    // the screen is also looking. Never contains a credential: this is the
    // response body, never the request.
    if (process.env.NODE_ENV !== "production") {
      console.error(`[extraction] ${model.slug} failed — ${detail}`);
    }

    // Recorded, and free: an API failure is nobody's bill.
    await supabase.rpc("record_extraction", {
      p_entity_id: request.entityId,
      p_model_id: model.id,
      p_source: request.source,
      p_status: "failed",
      p_reference_asset_id: referenceAssetId ?? undefined,
      p_source_text: sourceText ?? undefined,
      p_error_message: detail.slice(0, 500),
    });

    return {
      ok: false,
      reason: kind === "not_configured" ? "not_configured" : kind === "refused" ? "refused" : "error",
    };
  }

  // 6. Validate against the dictionary, then fill only what is empty.
  const validated = validateExtraction(sheet, answer.fields);
  const { sheet: filled, summary } = applyExtraction(sheet, validated);

  // 7. Charge and log, in one transaction.
  const { error: chargeError } = await supabase.rpc("record_extraction", {
    p_entity_id: request.entityId,
    p_model_id: model.id,
    p_source: request.source,
    p_status: "succeeded",
    p_input_tokens: answer.usage.inputTokens,
    p_output_tokens: answer.usage.outputTokens,
    p_real_cost_cents: realCostCents(model.slug, answer.usage) ?? undefined,
    p_reference_asset_id: referenceAssetId ?? undefined,
    p_source_text: sourceText ?? undefined,
    p_summary: summaryToJson(summary),
  });

  if (chargeError) {
    return { ok: false, reason: CHARGE_ERROR_CODES[chargeError.code ?? ""] ?? "error" };
  }

  // 8. Persist the draft — best effort. The caller receives the sheet regardless
  //    and its own autosave writes it, so a paid extraction survives a failed
  //    write here. Charging before this line is deliberate for the same reason:
  //    the charge and its record are the pair that must not come apart.
  await supabase
    .from("entities")
    .update({ sheet: sheetToJson(filled) })
    .eq("id", request.entityId);

  return { ok: true, sheet: filled, summary, sparksCharged: priceSparks };
}
