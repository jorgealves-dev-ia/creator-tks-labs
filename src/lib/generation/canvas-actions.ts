"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { imageRealCostCents } from "@/lib/ai/pricing";
import { parseSheet, type CharacterSheet } from "@/lib/character-sheet/schema";
import { loadImagePayloads } from "@/lib/generation/asset-payloads";
import { distinctHandles, findMentions, sceneWithoutMentions } from "@/lib/generation/mentions";
import { CANVAS_IMAGE_SIZE, maxReferences, resolveFormat } from "@/lib/generation/presets";
import { REFERENCE_KINDS } from "@/lib/generation/references";
import {
  buildCanvasPrompt,
  type CanvasPromptStructure,
  type CanvasReferenceInput,
} from "@/lib/prompt/canvas";
import { translateItems } from "@/lib/prompt/translator";
import { isProviderConfigured } from "@/lib/providers/keys";
import { findImageProvider } from "@/lib/providers/registry";
import { ProviderError, providerErrorDetail } from "@/lib/providers/types";
import { CENTS_PER_SPARK } from "@/lib/sparks";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Generating an image from a canvas node — docs/nodes-geracao.md §6.
 *
 * The canonical generator next door proved the order of operations that keeps a
 * paid generation honest; this one keeps it and adds the three things a scene has
 * that a reference sheet does not:
 *
 *   the `@`          resolved **here**, never in the browser. The browser sends
 *                    the sentence the user typed; which frozen snapshot that
 *                    sentence names is a decision only the server may take,
 *                    because a client that could choose the version could choose
 *                    an unfrozen one (rule 2 of the versioning specification).
 *
 *   the translation  run before anything is spent, and fatal if it fails. Sending
 *                    the Portuguese through would quietly produce a worse image
 *                    and charge full price for it, so a failed translation stops
 *                    the whole thing: nothing generated, nothing charged, and no
 *                    row written — no image model ever ran.
 *
 *   the references   loaded from Storage by id, in the exact order the compiler
 *                    numbered them.
 */

const SIGNED_URL_TTL_SECONDS = 60 * 60;

/**
 * What was asked of the API, as stored in generations.params. Named so the
 * failure path records exactly the same shape the success path does — a history
 * where a failed row is missing half the question is a history that cannot
 * answer why it failed.
 */
type GenerationParams = {
  preset_id: string;
  aspect_ratio: string;
  /** What the channel wanted, when the model had to approximate it. */
  proporcao_pedida: string;
  image_size: string;
  reference_asset_ids: string[];
};

/** Error codes raised by public.record_generation — see the migrations. */
const CHARGE_ERROR_CODES: Record<string, CanvasGenerationFailure> = {
  GN001: "insufficient_balance",
  GN002: "invalid",
  GN003: "invalid",
  GN004: "invalid",
};

const referenceSchema = z.object({
  assetId: z.uuid(),
  kind: z.enum(REFERENCE_KINDS.map((kind) => kind.key) as [string, ...string[]]).nullable(),
  instrucao: z.string().max(400),
  origem: z.enum(["upload", "galeria", "resultado"]),
});

const generateSchema = z.object({
  projectId: z.uuid(),
  /** The React Flow node id, so the history can point back at what produced it. */
  nodeId: z.string().min(1).max(200),
  prompt: z.string().max(2000),
  modelId: z.uuid(),
  presetId: z.string().min(1).max(80),
  /** The node's style override; null means "inherit". */
  estiloKey: z.string().min(1).max(80).nullable(),
  // A ceiling far above any model's, so a malformed request is refused before it
  // costs a database round trip. The real limit is the model's and is checked
  // once the model is known.
  references: z.array(referenceSchema).max(12),
});

export type CanvasGenerationFailure =
  | "invalid"
  | "not_configured"
  | "insufficient_balance"
  | "empty_request"
  | "empty_character"
  | "unknown_handle"
  | "no_version"
  | "unknown_version"
  | "multiple_characters"
  | "too_many_references"
  | "missing_reference"
  | "translation_failed"
  | "refused"
  | "error";

export type CanvasGenerationResult =
  | {
      ok: true;
      generationId: string;
      assetId: string;
      url: string;
      sparksCharged: number;
      balanceSparks: number;
      /** What the API was actually asked for — shown next to the preset label. */
      aspectRatio: string;
      /** True when the model had no exact match for the channel's proportion. */
      approximated: boolean;
      character: {
        handle: string;
        versionNumber: number;
        /** False when that version was saved before it had a complete sheet. */
        hasSheetImage: boolean;
      } | null;
    }
  | {
      ok: false;
      reason: CanvasGenerationFailure;
      /** The handle that could not be resolved, so the message can name it. */
      handle?: string;
      versionNumber?: number;
      neededSparks?: number;
      balanceSparks?: number;
      limit?: number;
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

export async function generateFromNode(input: unknown): Promise<CanvasGenerationResult> {
  const parsed = generateSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, reason: "invalid" };
  }

  const request = parsed.data;
  const { supabase, userId } = await requireSession();

  // 1. The model, its price and its provider — from the catalogue, never from the
  //    browser. The browser only names an id.
  const { data: model } = await supabase
    .from("ai_models")
    .select(
      "id, slug, image_sparks, enabled, capabilities, ai_providers (slug, env_var_name, enabled)",
    )
    .eq("id", request.modelId)
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

  // 2. The `@`. One character per generation in v1 — keeping two identities
  //    consistent in one image is its own problem, and half-solving it here would
  //    look like a feature until the day it did not.
  const mentions = findMentions(request.prompt);
  const handles = distinctHandles(mentions);

  if (handles.length > 1) {
    return { ok: false, reason: "multiple_characters" };
  }

  const mention = mentions[0] ?? null;
  let character: ResolvedCharacter | null = null;

  if (mention) {
    const resolved = await resolveCharacter(supabase, userId, mention.handle, mention.versionNumber);

    if (!resolved.ok) {
      return {
        ok: false,
        reason: resolved.reason,
        handle: mention.handle,
        versionNumber: mention.versionNumber ?? undefined,
      };
    }

    character = resolved.character;
  }

  // The scene is the prompt minus the mentions: `@luna` alone means "show me
  // her", not a stage direction to translate.
  const scene = sceneWithoutMentions(request.prompt, mentions);

  // 3. Nothing to draw. Style alone would produce "a photograph" and bill for it.
  if (scene === "" && !character) {
    return { ok: false, reason: "empty_request" };
  }

  // 4. The reference ceiling of the chosen model, counting the character's own
  //    sheet — it is an image in the same call and occupies the same room.
  const limit = maxReferences(model.slug);
  const total = request.references.length + (character?.folhaAssetId ? 1 : 0);

  if (total > limit) {
    return { ok: false, reason: "too_many_references", limit };
  }

  // 5. Balance first: a friendly block before anything is spent — including the
  //    fraction of a cent the translation costs us, which there is no reason to
  //    spend on somebody who is about to be told no.
  const { data: wallet } = await supabase
    .from("wallets")
    .select("balance_cents")
    .eq("user_id", userId)
    .maybeSingle();

  const balanceSparks = Math.floor((wallet?.balance_cents ?? 0) / CENTS_PER_SPARK);

  if (balanceSparks < priceSparks) {
    return { ok: false, reason: "insufficient_balance", neededSparks: priceSparks, balanceSparks };
  }

  // 6. Portuguese in, English out — before a single Spark is at risk.
  const items = [
    ...(scene === "" ? [] : [{ id: "cena", text: scene }]),
    ...request.references
      .map((reference, index) => ({ id: `ref.${index}`, text: reference.instrucao.trim() }))
      .filter((item) => item.text !== ""),
  ];

  const translation = await translateItems(supabase, items);

  if (!translation.ok) {
    return { ok: false, reason: "translation_failed" };
  }

  // A sentence that went out and did not come back is not something to paper
  // over: the user would pay full price for an image missing what they asked for.
  const missing = items.some((item) => (translation.translations[item.id] ?? "").trim() === "");

  if (missing) {
    return { ok: false, reason: "translation_failed" };
  }

  // 7. The prompt. Pure function, and the source of the reference ordering.
  const references: CanvasReferenceInput[] = request.references.map((reference, index) => ({
    assetId: reference.assetId,
    kind: (reference.kind as CanvasReferenceInput["kind"]) ?? null,
    instrucaoPt: reference.instrucao.trim(),
    instrucaoEn: (translation.translations[`ref.${index}`] ?? "").trim(),
    origem: reference.origem,
  }));

  const prompt = buildCanvasPrompt({
    personagem: character
      ? {
          handle: character.handle,
          versionNumber: character.versionNumber,
          entityVersionId: character.versionId,
          sheet: character.sheet,
          folhaAssetId: character.folhaAssetId,
        }
      : null,
    cenaPt: scene,
    cenaEn: (translation.translations.cena ?? "").trim(),
    estiloKey: request.estiloKey,
    referencias: references,
  });

  // 8. A mention that contributes nothing is a mention that will disappoint. With
  //    neither a compiled identity nor a sheet image, `@luna` is decoration on a
  //    bill — better said before the click than discovered in the result.
  if (character && !character.folhaAssetId && prompt.structure.identidade.length === 0) {
    return { ok: false, reason: "empty_character", handle: character.handle };
  }

  // 9. The images, in the order the directives were numbered in.
  const payloads = await loadImagePayloads(supabase, prompt.referenceAssetIds);

  if (!payloads) {
    return { ok: false, reason: "missing_reference" };
  }

  const format = resolveFormat(model.slug, request.presetId);

  const params: GenerationParams = {
    preset_id: format.preset.id,
    aspect_ratio: format.ratio,
    proporcao_pedida: format.preset.ratio,
    image_size: CANVAS_IMAGE_SIZE,
    reference_asset_ids: prompt.referenceAssetIds,
  };

  const summary = {
    handle: character?.handle ?? null,
    versao: character?.versionNumber ?? null,
    estilo: prompt.structure.estilo.chave,
    estilo_origem: prompt.structure.estilo.origem,
    regra_diretor: prompt.structure.regra_diretor,
    referencias: prompt.referenceAssetIds.length,
    formato_aproximado: format.approximated,
    sem_folha: character !== null && character.folhaAssetId === null,
  };

  const promptCompiled = { text: prompt.text, structure: prompt.structure };

  // 10. The call. No retry: a repeated image generation is a second image billed
  //     by the provider, which cannot know the first may have succeeded on their
  //     side. The outfit fallback of §5.22 does not apply here — the canonical
  //     outfit never reaches a directed scene in the first place.
  let image;
  let usage;

  try {
    const result = await provider.generateImage({
      model: { slug: model.slug },
      input: {
        prompt: prompt.text,
        references: payloads.length > 0 ? payloads : undefined,
        aspectRatio: format.ratio,
        imageSize: CANVAS_IMAGE_SIZE,
      },
    });

    image = result.image;
    usage = result.usage;
  } catch (error) {
    const kind = error instanceof ProviderError ? error.kind : "provider";

    await recordFailure(supabase, {
      request,
      modelId: model.id,
      character,
      promptCompiled,
      params,
      detail: providerErrorDetail(error),
    });

    return {
      ok: false,
      reason: kind === "not_configured" ? "not_configured" : kind === "refused" ? "refused" : "error",
    };
  }

  // 11. Storage, then the asset row, then the charge — the order that errs in the
  //     user's favour: a process that dies in the middle leaves a free image
  //     rather than a paid absence.
  const extension = image.mimeType.includes("jpeg") ? "jpg" : "png";
  const storagePath = `${userId}/canvas/${request.projectId}/${crypto.randomUUID()}.${extension}`;
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
    })
    .select("id")
    .single();

  if (!asset) {
    await supabase.storage.from("assets").remove([storagePath]);
    return { ok: false, reason: "error" };
  }

  const { data: generation, error: chargeError } = await supabase.rpc("record_generation", {
    p_model_id: model.id,
    p_status: "succeeded",
    p_entity_id: character?.entityId ?? undefined,
    p_prompt_compiled: promptCompiled,
    p_params: params,
    p_input_tokens: usage.inputTokens,
    p_output_tokens: usage.outputTokens,
    p_real_cost_cents: imageRealCostCents(model.slug, CANVAS_IMAGE_SIZE, usage) ?? undefined,
    p_result_asset_id: asset.id,
    p_entity_version_id: character?.versionId ?? undefined,
    // A mention only ever resolves to a frozen snapshot, so this is never
    // 'draft' — which is precisely what makes a canvas image reproducible.
    p_sheet_source: character ? "version" : undefined,
    p_summary: summary,
    // The sentence as it was typed, mentions and all — what the user would
    // recognise as "what I wrote". The scene the compiler actually worked from
    // is inside prompt_compiled, next to its English.
    p_prompt_user_pt: request.prompt.trim() === "" ? undefined : request.prompt.trim(),
    p_project_id: request.projectId,
    p_node_id: request.nodeId,
  });

  if (chargeError || !generation) {
    // Nobody keeps an image they were just told they could not afford.
    await supabase.from("assets").delete().eq("id", asset.id);
    await supabase.storage.from("assets").remove([storagePath]);

    return { ok: false, reason: CHARGE_ERROR_CODES[chargeError?.code ?? ""] ?? "error" };
  }

  const { data: signed } = await supabase.storage
    .from("assets")
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);

  if (!signed) {
    return { ok: false, reason: "error" };
  }

  return {
    ok: true,
    generationId: generation.id,
    assetId: asset.id,
    url: signed.signedUrl,
    sparksCharged: priceSparks,
    balanceSparks: balanceSparks - priceSparks,
    aspectRatio: format.ratio,
    approximated: format.approximated,
    character: character
      ? {
          handle: character.handle,
          versionNumber: character.versionNumber,
          hasSheetImage: character.folhaAssetId !== null,
        }
      : null,
  };
}

// ---------------------------------------------------------------------------
// Resolving the mention
// ---------------------------------------------------------------------------

type Supabase = Awaited<ReturnType<typeof createSupabaseServerClient>>;

type ResolvedCharacter = {
  entityId: string;
  handle: string;
  versionId: string;
  versionNumber: number;
  sheet: CharacterSheet;
  folhaAssetId: string | null;
};

/**
 * `@luna` → the active version; `@luna@v2` → that one; the draft → never
 * (decision D2). A character with no saved version cannot be mentioned at all,
 * and the interface says so in the one sentence that fixes it.
 */
async function resolveCharacter(
  supabase: Supabase,
  userId: string,
  handle: string,
  versionNumber: number | null,
): Promise<
  | { ok: true; character: ResolvedCharacter }
  | { ok: false; reason: "unknown_handle" | "no_version" | "unknown_version" }
> {
  const { data: entity } = await supabase
    .from("entities")
    .select("id, handle, active_version_id")
    .eq("user_id", userId)
    .eq("kind", "character")
    .eq("handle", handle)
    .is("archived_at", null)
    .maybeSingle();

  if (!entity) {
    return { ok: false, reason: "unknown_handle" };
  }

  const query = supabase
    .from("entity_versions")
    .select("id, version_number, sheet")
    .eq("entity_id", entity.id);

  const { data: version } = versionNumber
    ? await query.eq("version_number", versionNumber).maybeSingle()
    : entity.active_version_id
      ? await query.eq("id", entity.active_version_id).maybeSingle()
      : { data: null };

  if (!version) {
    return {
      ok: false,
      // Two different situations with two different fixes: save a first version,
      // or ask for a version that exists.
      reason: versionNumber ? "unknown_version" : "no_version",
    };
  }

  const sheet = parseSheet(version.sheet);

  return {
    ok: true,
    character: {
      entityId: entity.id,
      handle: entity.handle,
      versionId: version.id,
      versionNumber: version.version_number,
      sheet,
      folhaAssetId: sheet.imagens_canonicas.folha_completa,
    },
  };
}

// ---------------------------------------------------------------------------
// Failures
// ---------------------------------------------------------------------------

/** A failed generation is recorded and free — the rule extractions already keeps. */
async function recordFailure(
  supabase: Supabase,
  input: {
    request: z.infer<typeof generateSchema>;
    modelId: string;
    character: ResolvedCharacter | null;
    promptCompiled: { text: string; structure: CanvasPromptStructure };
    params: GenerationParams;
    detail: string;
  },
): Promise<void> {
  if (process.env.NODE_ENV !== "production") {
    console.error(`[generation] canvas node ${input.request.nodeId} failed — ${input.detail}`);
  }

  await supabase.rpc("record_generation", {
    p_model_id: input.modelId,
    p_status: "failed",
    p_entity_id: input.character?.entityId ?? undefined,
    p_prompt_compiled: input.promptCompiled,
    p_params: input.params,
    p_entity_version_id: input.character?.versionId ?? undefined,
    p_sheet_source: input.character ? "version" : undefined,
    p_error_message: input.detail.slice(0, 500),
    p_prompt_user_pt: input.request.prompt.trim() === "" ? undefined : input.request.prompt.trim(),
    p_project_id: input.request.projectId,
    p_node_id: input.request.nodeId,
  });
}

