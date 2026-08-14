"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { loadCatalog } from "@/lib/ai/catalog";
import type { CatalogProvider } from "@/lib/ai/catalog-types";
import { imageRealCostCents } from "@/lib/ai/pricing";
import {
  isFolhaSlot,
  slotLabel,
  type ImagemCanonicaSlot,
} from "@/lib/character-sheet/dictionary";
import { sheetsEqual } from "@/lib/character-sheet/diff";
import { loadImagePayload } from "@/lib/generation/asset-payloads";
import {
  CANONICAL_SLOT_KEYS,
  parseSheet,
  sheetToJson,
  type CharacterSheet,
} from "@/lib/character-sheet/schema";
import { pendingTranslations } from "@/lib/character-sheet/translation";
import { buildCanonicalPrompt } from "@/lib/prompt/canonical";
import { isProviderConfigured } from "@/lib/providers/keys";
import { findImageProvider } from "@/lib/providers/registry";
import {
  ProviderError,
  providerErrorDetail,
  type ImagePayload,
} from "@/lib/providers/types";
import { CENTS_PER_SPARK } from "@/lib/sparks";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * The canonical image generator — §4.4 of docs/geracao-canonica.md.
 *
 * The order of operations is the interesting part, because each step exists to
 * make a specific way of being wrong impossible:
 *
 *   1. the anchor is required before a view, so a view can never be generated
 *      against nothing (decision G3)
 *   2. the free text must already have its English, because the compiler may not
 *      go and fetch it (§3.3)
 *   3. the balance is checked BEFORE the provider is called, so nobody is told
 *      "insufficient balance" after we already spent money on their behalf
 *   4. a refusal triggers exactly one retry, in the compression outfit, and the
 *      fact that it happened is recorded and shown (§5.22, compilation rule 10)
 *   5. the image is stored and linked BEFORE it is charged, so a process that
 *      dies between the two leaves a free image rather than a paid absence —
 *      the error that costs us a cent instead of costing the user one
 *   6. a failed charge takes the image back down with it, so nobody keeps
 *      something they were told they could not have
 *
 * A failure of the provider is recorded too, and charges nothing.
 */

const SIGNED_URL_TTL_SECONDS = 60 * 60;

/** The outfit §5.22 falls back to when a model refuses the canonical one. */
const FALLBACK_OUTFIT = "compressao_esportiva";

const generateSchema = z.object({
  entityId: z.uuid(),
  slot: z.enum(CANONICAL_SLOT_KEYS as [string, ...string[]]),
  modelId: z.uuid(),
});

export type CanonicalFailure =
  | "invalid"
  | "insufficient_balance"
  | "not_configured"
  | "needs_sheet"
  | "translating"
  | "empty_sheet"
  | "refused"
  | "error";

export type GenerateCanonicalResult =
  | {
      ok: true;
      slot: ImagemCanonicaSlot;
      assetId: string;
      url: string;
      sparksCharged: number;
      balanceSparks: number;
      /** True when §5.22's fallback had to run — always said out loud. */
      usedFallbackOutfit: boolean;
    }
  | {
      ok: false;
      reason: CanonicalFailure;
      neededSparks?: number;
      balanceSparks?: number;
    };

/** Error codes raised by public.record_generation — see the migration. */
const CHARGE_ERROR_CODES: Record<string, CanonicalFailure> = {
  GN001: "insufficient_balance",
  GN002: "invalid",
  GN003: "invalid",
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

/** The providers and models that can draw, with why each is or is not usable. */
export async function listImageProviders(): Promise<CatalogProvider[]> {
  const { supabase } = await requireSession();

  return loadCatalog(supabase, "image_gen");
}

/**
 * E os que sabem animar. Mesma consulta, outra capability — a lista de durações
 * vem junto, e é ela que diz o que o bloco pode oferecer.
 */
export async function listVideoProviders(): Promise<CatalogProvider[]> {
  const { supabase } = await requireSession();

  return loadCatalog(supabase, "video_gen");
}

export async function generateCanonicalImage(
  input: unknown,
): Promise<GenerateCanonicalResult> {
  const parsed = generateSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, reason: "invalid" };
  }

  const slot = parsed.data.slot as ImagemCanonicaSlot;
  const { supabase, userId } = await requireSession();

  // 1. The model, its price and its provider — from the catalogue, never from
  //    the browser. The browser only names an id.
  const { data: model } = await supabase
    .from("ai_models")
    .select("id, slug, image_sparks, enabled, capabilities, ai_providers (slug, env_var_name, enabled)")
    .eq("id", parsed.data.modelId)
    .maybeSingle();

  const providerRow = model?.ai_providers;

  if (
    !model ||
    !providerRow ||
    !model.enabled ||
    !providerRow.enabled ||
    !model.capabilities.includes("image_gen") ||
    model.image_sparks === null
  ) {
    return { ok: false, reason: "invalid" };
  }

  const provider = findImageProvider(providerRow.slug);

  if (!provider || !isProviderConfigured(providerRow.env_var_name)) {
    return { ok: false, reason: "not_configured" };
  }

  const priceSparks = model.image_sparks;

  // 2. The character and the draft this will be generated from. Read from the
  //    database rather than sent by the browser, for the same reason a version is
  //    photographed from the stored draft: the draft is the only thing there is.
  const { data: entity } = await supabase
    .from("entities")
    .select("id, handle, sheet, active_version_id")
    .eq("id", parsed.data.entityId)
    .eq("user_id", userId)
    .is("archived_at", null)
    .maybeSingle();

  if (!entity) {
    return { ok: false, reason: "invalid" };
  }

  const sheet = parseSheet(entity.sheet);

  // 3. Decision G3, enforced rather than merely suggested by a disabled button:
  //    a separate view exists to reference the anchor, so without the anchor
  //    there is nothing to generate against.
  const anchorAssetId = sheet.imagens_canonicas.folha_completa;

  if (!isFolhaSlot(slot) && !anchorAssetId) {
    return { ok: false, reason: "needs_sheet" };
  }

  // 4. §3.3: the compiler reads a cache and may not go and fetch one, so a sheet
  //    whose free text has not been translated yet waits. It is a second or two
  //    behind the autosave, never longer.
  if (pendingTranslations(sheet).length > 0) {
    return { ok: false, reason: "translating" };
  }

  // 5. Balance first: a friendly block before the call, never after.
  const { data: wallet } = await supabase
    .from("wallets")
    .select("balance_cents")
    .eq("user_id", userId)
    .maybeSingle();

  const balanceSparks = Math.floor((wallet?.balance_cents ?? 0) / CENTS_PER_SPARK);

  if (balanceSparks < priceSparks) {
    return { ok: false, reason: "insufficient_balance", neededSparks: priceSparks, balanceSparks };
  }

  // 6. The prompt. An empty DNA compiles to an empty identity block, and asking
  //    a model to draw "a reference sheet of nobody" would burn Sparks on noise.
  const prompt = buildCanonicalPrompt({ sheet, slot });

  if (prompt.compiled.structure.identidade.length === 0) {
    return { ok: false, reason: "empty_sheet" };
  }

  // 7. The anchor itself, for a view. Downloaded here rather than passed by the
  //    browser: the reference has to be the file the sheet actually points at.
  let references: ImagePayload[] | undefined;

  if (!isFolhaSlot(slot) && anchorAssetId) {
    const reference = await loadImagePayload(supabase, anchorAssetId);

    if (!reference) {
      return { ok: false, reason: "needs_sheet" };
    }

    references = [reference];
  }

  // 8. The call, with the one retry §5.22 allows.
  let image: ImagePayload;
  let usage: { inputTokens: number; outputTokens: number };
  let usedFallbackOutfit = false;

  const attempt = (text: string) =>
    provider.generateImage({
      model: { slug: model.slug },
      input: {
        prompt: text,
        references,
        aspectRatio: prompt.aspectRatio,
        imageSize: prompt.imageSize,
      },
    });

  try {
    const result = await attempt(prompt.text);
    image = result.image;
    usage = result.usage;
  } catch (error) {
    const kind = error instanceof ProviderError ? error.kind : "provider";
    const detail = providerErrorDetail(error);

    const alreadyCompression =
      sheet.padroes_variaveis.traje_canonico.valor === FALLBACK_OUTFIT;

    // Compilation rule 10: one retry, in the opaque compression outfit, and only
    // for a refusal. Retrying a network error would just be a second bill.
    if (kind !== "refused" || alreadyCompression) {
      await recordFailure(supabase, parsed.data, model.id, slot, prompt, detail);
      return { ok: false, reason: kind === "not_configured" ? "not_configured" : kind === "refused" ? "refused" : "error" };
    }

    const fallbackPrompt = buildCanonicalPrompt({
      sheet,
      slot,
      trajeCanonico: FALLBACK_OUTFIT,
    });

    try {
      const result = await attempt(fallbackPrompt.text);
      image = result.image;
      usage = result.usage;
      usedFallbackOutfit = true;
    } catch (fallbackError) {
      await recordFailure(
        supabase,
        parsed.data,
        model.id,
        slot,
        prompt,
        `${detail} | fallback: ${providerErrorDetail(fallbackError)}`,
      );

      const fallbackKind =
        fallbackError instanceof ProviderError ? fallbackError.kind : "provider";

      return { ok: false, reason: fallbackKind === "refused" ? "refused" : "error" };
    }
  }

  // 9. Storage, then the asset row, then the link — the same bookkeeping an
  //    uploaded canonical image goes through (architecture invariant 3: a
  //    provider URL is never the source of truth).
  const extension = image.mimeType.includes("jpeg") ? "jpg" : "png";
  const storagePath = `${userId}/entities/${parsed.data.entityId}/canonical-${slot}-${crypto.randomUUID()}.${extension}`;
  const bytes = Buffer.from(image.base64, "base64");

  const { error: uploadError } = await supabase.storage
    .from("assets")
    .upload(storagePath, bytes, { contentType: image.mimeType });

  if (uploadError) {
    return { ok: false, reason: "error" };
  }

  const { data: asset } = await supabase
    .from("assets")
    .insert({
      user_id: userId,
      kind: "image",
      source: "generation",
      storage_path: storagePath,
      mime_type: image.mimeType,
      byte_size: bytes.byteLength,
      width: null,
      height: null,
      // What this image is, in the words the gallery will show it with.
      label: `${slotLabel(slot)} · @${entity.handle}`,
    })
    .select("id")
    .single();

  if (!asset) {
    await supabase.storage.from("assets").remove([storagePath]);
    return { ok: false, reason: "error" };
  }

  await supabase.from("entity_images").insert({
    entity_id: parsed.data.entityId,
    asset_id: asset.id,
    user_id: userId,
    role: slot,
    sort_order: CANONICAL_SLOT_KEYS.indexOf(slot),
  });

  // 10. Which sheet this came from, for the audit trail. The draft is what was
  //     read; when it happens to be identical to the active version, that is
  //     worth recording, because it means the image is reproducible from a
  //     frozen snapshot rather than from a notebook that will move on.
  const provenance = await sheetProvenance(supabase, entity.active_version_id, sheet);

  // 11. Charge and log, in one transaction.
  const { error: chargeError } = await supabase.rpc("record_generation", {
    p_model_id: model.id,
    p_status: "succeeded",
    p_entity_id: parsed.data.entityId,
    p_prompt_compiled: {
      text: prompt.text,
      structure: prompt.compiled.structure,
    },
    p_params: {
      slot,
      aspect_ratio: prompt.aspectRatio,
      image_size: prompt.imageSize,
      reference_asset_id: anchorAssetId,
    },
    p_input_tokens: usage.inputTokens,
    p_output_tokens: usage.outputTokens,
    p_real_cost_cents: imageRealCostCents(model.slug, prompt.imageSize, usage) ?? undefined,
    p_result_asset_id: asset.id,
    p_entity_version_id: provenance.versionId ?? undefined,
    p_sheet_source: provenance.source,
    p_summary: {
      slot,
      traje: usedFallbackOutfit
        ? FALLBACK_OUTFIT
        : sheet.padroes_variaveis.traje_canonico.valor,
      fallback_de_traje: usedFallbackOutfit,
    },
  });

  if (chargeError) {
    // Nobody keeps an image they were just told they could not afford. Deleting
    // the asset cascades into entity_images, so the link goes with it.
    await supabase.from("assets").delete().eq("id", asset.id);
    await supabase.storage.from("assets").remove([storagePath]);

    return { ok: false, reason: CHARGE_ERROR_CODES[chargeError.code ?? ""] ?? "error" };
  }

  // 12. Point the draft at the new image — best effort. The caller receives the
  //     id regardless and its own autosave writes it, so a paid generation
  //     survives a failed write here.
  const nextSheet: CharacterSheet = structuredClone(sheet);
  nextSheet.imagens_canonicas[slot] = asset.id;

  await supabase
    .from("entities")
    .update({ sheet: sheetToJson(nextSheet) })
    .eq("id", parsed.data.entityId);

  const { data: signed } = await supabase.storage
    .from("assets")
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);

  if (!signed) {
    return { ok: false, reason: "error" };
  }

  return {
    ok: true,
    slot,
    assetId: asset.id,
    url: signed.signedUrl,
    sparksCharged: priceSparks,
    balanceSparks: balanceSparks - priceSparks,
    usedFallbackOutfit,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type Supabase = Awaited<ReturnType<typeof createSupabaseServerClient>>;

/**
 * Whether this generation can be reproduced from a frozen snapshot.
 *
 * Invariant 9 allows generating from the draft and requires saying so. The extra
 * honesty here is the other direction: when the draft has not moved since the
 * active version was saved, the image really did come from that version, and
 * recording it means the audit trail can answer "which Julia was this?" with a
 * number instead of "the notebook, as it was that day".
 */
async function sheetProvenance(
  supabase: Supabase,
  activeVersionId: string | null,
  draft: CharacterSheet,
): Promise<{ source: "version" | "draft"; versionId: string | null }> {
  if (!activeVersionId) return { source: "draft", versionId: null };

  const { data: version } = await supabase
    .from("entity_versions")
    .select("id, sheet")
    .eq("id", activeVersionId)
    .maybeSingle();

  if (!version) return { source: "draft", versionId: null };

  return sheetsEqual(draft, parseSheet(version.sheet))
    ? { source: "version", versionId: version.id }
    : { source: "draft", versionId: null };
}

/** A failed generation is recorded and free — the rule extractions already keeps. */
async function recordFailure(
  supabase: Supabase,
  request: { entityId: string },
  modelId: string,
  slot: ImagemCanonicaSlot,
  prompt: ReturnType<typeof buildCanonicalPrompt>,
  detail: string,
): Promise<void> {
  if (process.env.NODE_ENV !== "production") {
    console.error(`[generation] ${slot} failed — ${detail}`);
  }

  await supabase.rpc("record_generation", {
    p_model_id: modelId,
    p_status: "failed",
    p_entity_id: request.entityId,
    p_prompt_compiled: { text: prompt.text, structure: prompt.compiled.structure },
    p_params: { slot, aspect_ratio: prompt.aspectRatio, image_size: prompt.imageSize },
    p_error_message: detail.slice(0, 500),
  });
}
