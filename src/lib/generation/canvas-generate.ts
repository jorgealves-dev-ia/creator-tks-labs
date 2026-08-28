import "server-only";

import { z } from "zod";

import { imageRealCostCents } from "@/lib/ai/pricing";
import { forgetSignedUrls, signWithThumbnails } from "@/lib/assets/signing";
import { storeThumbnail } from "@/lib/assets/thumbnail";
import { IMMUTABLE_CACHE_CONTROL, thumbnailPath } from "@/lib/assets/thumbnail-path";
import { SUBJECT_BY_GENERO, type GeneroApresentacao } from "@/lib/character-sheet/dictionary";
import { parseSheet, type CharacterSheet } from "@/lib/character-sheet/schema";
import { loadImagePayloads } from "@/lib/generation/asset-payloads";
import type {
  CanvasGenerationFailure,
  CanvasGenerationResult,
} from "@/lib/generation/canvas-contract";
import {
  distinctHandles,
  findMentions,
  sceneWithoutMentions,
  sceneWithSubject,
} from "@/lib/generation/mentions";
import { rewritePossessives } from "@/lib/generation/possessive";
import {
  DEFAULT_IMAGE_SIZE,
  IMAGE_SIZES,
  maxReferences,
  resolveFormat,
} from "@/lib/generation/presets";
import { REFERENCE_KINDS } from "@/lib/generation/references";
import {
  buildCanvasPrompt,
  type CanvasPromptStructure,
  type CanvasReferenceInput,
} from "@/lib/prompt/canvas";
import { translateItems } from "@/lib/prompt/translator";
import { isProviderConfigured } from "@/lib/providers/keys";
import { findImageProvider } from "@/lib/providers/registry";
import { buildSceneDirective } from "@/lib/storyboard/scene-prompt";
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
  // Unreachable in practice — the size is checked against the catalogue before
  // anything is generated, precisely so this never fires after we have paid the
  // provider. Mapped anyway: the database is the authority on the price, and an
  // authority whose refusal has no name on this side becomes "erro inesperado".
  GN005: "unsupported_size",
};

const referenceSchema = z.object({
  assetId: z.uuid(),
  kind: z.enum(REFERENCE_KINDS.map((kind) => kind.key) as [string, ...string[]]).nullable(),
  instrucao: z.string().max(400),
  origem: z.enum(["upload", "galeria", "resultado", "produto", "input"]),
  /**
   * The group this image belongs to, when it arrived with others that count as
   * one thing. Defaulted rather than required: a browser still running
   * yesterday's bundle sends nothing here, and nothing means "a lone image".
   *
   * Only the id travels. What the group is *called* is resolved on this side —
   * it goes into the audit trail, and an audit trail that believes whatever the
   * browser called something is not an audit trail.
   */
  groupId: z.uuid().nullable().default(null),
  /**
   * What the group is called. Cosmetic, capped, and never read by anything that
   * decides behaviour — see the contract for why naming is allowed and widening
   * is not.
   */
  groupLabel: z.string().max(120).default(""),
  /**
   * Which specialised input handed this over. A closed list, because it selects
   * a fixed English clause from the dictionary — the browser names a role, never
   * a sentence.
   */
  papel: z.enum(["pose", "folha"]).nullable().default(null),
});

const generateSchema = z.object({
  projectId: z.uuid(),
  /** The React Flow node id, so the history can point back at what produced it. */
  nodeId: z.string().min(1).max(200),
  prompt: z.string().max(2000),
  modelId: z.uuid(),
  presetId: z.string().min(1).max(80),
  /**
   * The resolution asked for. Defaulted rather than required: a browser still
   * running yesterday's bundle sends nothing, and nothing has always meant 2K.
   * The *price* of this size is never sent — it is looked up here, from the
   * catalogue, like every other price in this system.
   */
  imageSize: z.enum(IMAGE_SIZES).default(DEFAULT_IMAGE_SIZE),
  /** The node's style override; null means "inherit". */
  estiloKey: z.string().min(1).max(80).nullable(),
  // The scene adjustments (§6 rule 4). Defaulted rather than required: a browser
  // still running yesterday's bundle sends nothing here, and "Auto" is exactly
  // what nothing means.
  anguloKey: z.string().min(1).max(80).nullable().default(null),
  iluminacaoKey: z.string().min(1).max(80).nullable().default(null),
  expressaoKey: z.string().min(1).max(80).nullable().default(null),
  // A ceiling far above any model's, so a malformed request is refused before it
  // costs a database round trip. The real limit is the model's and is checked
  // once the model is known.
  references: z.array(referenceSchema).max(12),
  /**
   * The switch of §5. Defaults to **false**, which is both the resting state of
   * the control and the safe reading of a request that does not mention it: a
   * browser holding an older bundle sends nothing, and nothing must never mean
   * "put four images the caller did not ask about into a paid generation".
   */
  referencesEnabled: z.boolean().default(false),
  /**
   * A ficha de cena, quando quem chama é a Máquina — Ciclo 3 · Fase 2.
   *
   * Só o id e a instrução daquela tentativa. A **diretiva não vem daqui**: ela é
   * recomposta abaixo, da própria ficha, porque é a base de comparação do selo
   * "desatualizada" (D3) e uma base escrita pelo cliente é uma base que ele pode
   * envenenar.
   */
  scene: z
    .object({ id: z.uuid(), instrucaoPt: z.string().max(1000).nullable().default(null) })
    .nullish()
    .default(null),
});

/**
 * One image, start to finish.
 *
 * Called by the route handler and by nothing else. It never redirects and never
 * throws: it is one of up to four running at once, and a caller holding four
 * promises needs four answers, not one exception that cancels the others.
 */
export async function runCanvasGeneration(input: unknown): Promise<CanvasGenerationResult> {
  const parsed = generateSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, reason: "invalid" };
  }

  const request = parsed.data;
  const supabase = await createSupabaseServerClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;

  // Answered, never redirected — see the proxy, which says the same thing for
  // the same reason and gets there first. This check is the one that survives if
  // the matcher ever changes: a Server Action or a route is a public endpoint,
  // and neither may rely on the proxy having run.
  if (!userId) {
    return { ok: false, reason: "unauthenticated" };
  }

  // 1. The model, its price and its provider — from the catalogue, never from the
  //    browser. The browser only names an id.
  const { data: model } = await supabase
    .from("ai_models")
    .select(
      "id, slug, image_sparks, enabled, capabilities, ai_providers (slug, env_var_name, enabled), ai_model_image_prices (image_size, sparks)",
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

  // 1b. The price of *this size*, from the catalogue.
  //
  //     Checked here rather than left to record_generation, even though the
  //     database refuses the same case with GN005: that refusal arrives after
  //     the image exists, which means after Google has been paid for it. The
  //     order that errs in nobody's favour is to find out first.
  //
  //     No fallback to image_sparks. A model whose catalogue does not price the
  //     requested size cannot draw it for a price we can name, and naming a
  //     different one is how a 4K image gets billed as a 2K.
  const sizePrice = model.ai_model_image_prices.find(
    (price) => price.image_size === request.imageSize,
  );

  if (!sizePrice) {
    return { ok: false, reason: "unsupported_size" };
  }

  const priceSparks = sizePrice.sparks;

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
    const resolved = await resolveCharacter(supabase, userId, mention.handle, {
      versionNumber: mention.versionNumber,
      projectId: request.projectId,
    });

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

  // -------------------------------------------------------------------------
  // 2b. A cena, quando a Máquina é quem chama — e a recusa mora AQUI.
  //
  //     Ao lado do `@` pelo mesmo motivo aritmético que o `resolveCharacter`
  //     comenta: **aqui é antes do saldo e muito antes do provedor**, então uma
  //     ficha que não é desta pessoa ou não é deste projeto custa zero. O GN008
  //     do banco é o cadeado de baixo — ele existe para o dia em que um caminho
  //     novo esquecer desta linha, e não deveria disparar nunca.
  //
  //     A diretiva é **recomposta da ficha**, e é ela que vai para o registro.
  //     `buildSceneDirective` é a mesma função pura que a ponte do Ciclo 2 usa,
  //     chamada aqui pela mesma razão de lá: uma segunda maneira de compor o
  //     texto seria uma segunda chance de as duas discordarem.
  // -------------------------------------------------------------------------
  let sceneProvenance: { ordem: number; diretiva_pt: string; instrucao_pt: string | null } | null =
    null;

  if (request.scene) {
    const { data: ficha } = await supabase
      .from("storyboard_scenes")
      .select(
        "ordem, acao, cenario, movimento, enquadramento, personagem_handle, produto, storyboards!inner (project_id)",
      )
      .eq("id", request.scene.id)
      .eq("user_id", userId)
      .eq("storyboards.project_id", request.projectId)
      .maybeSingle();

    if (!ficha) {
      return { ok: false, reason: "unknown_scene" };
    }

    sceneProvenance = {
      ordem: ficha.ordem,
      diretiva_pt: buildSceneDirective({
        ordem: ficha.ordem,
        acao: ficha.acao,
        cenario: ficha.cenario,
        movimento: ficha.movimento,
        enquadramento: ficha.enquadramento,
        personagem: ficha.personagem_handle,
        produto: ficha.produto,
      }).prompt,
      instrucao_pt: request.scene.instrucaoPt,
    };
  }

  // 3. Nothing to draw. Style alone would produce "a photograph" and bill for it.
  if (scene === "" && !character) {
    return { ok: false, reason: "empty_request" };
  }

  /**
   * 3b. The mention, turned into a subject the sentence can use — item 3d.
   *
   * Emptiness is judged above, on the scene with the mention *removed*, because
   * that is what decides which half of the director rule runs. What gets
   * translated is built here instead, with the mention *replaced*: deleting it
   * left "está no seu quarto gamer", and a translator handed a sentence with no
   * subject invents one — "their" on one run and "his" on the next, for a
   * character whose sheet says feminino.
   *
   * The gender comes from the frozen snapshot, like everything else the mention
   * resolves to, and an undecided one reads as the neutral noun rather than a
   * guess. Nothing here is empty that was not already empty, so the director
   * rule cannot flip: a prompt of nothing but `@luna` still means "show me her".
   */
  const generoKey = character?.sheet.dna_visual.genero_apresentacao.valor ?? null;
  const subject =
    typeof generoKey === "string" && generoKey in SUBJECT_BY_GENERO
      ? SUBJECT_BY_GENERO[generoKey as GeneroApresentacao]
      : SUBJECT_BY_GENERO.androgino;

  const withSubject = scene === "" ? "" : sceneWithSubject(request.prompt, mentions, subject);

  /**
   * 3c. And the possessive — item 3b, the half the subject substitution does
   * not reach.
   *
   * Measured on this very database: with the subject already fixed, the same
   * sentence came back "in her gamer room" on one run and "in his gamer
   * bedroom" on the next. "Seu" is ambiguous in Portuguese by construction, and
   * a translator facing ambiguity does not return ambiguity — it picks.
   *
   * `unicaPessoa` is the caller's half of the contract: only a resolved mention,
   * and v1 allows exactly one. Everything else the rule refuses on its own, and
   * refusing is most of what it does — see possessive.ts for the asymmetry that
   * makes that the right default.
   */
  const possessives = rewritePossessives(withSubject, subject, {
    unicaPessoa: character !== null,
  });

  const sceneForModel = possessives.text;

  // What the `@` became, recorded rather than left to be inferred from a
  // sentence that no longer contains it.
  const mencaoSujeito =
    character && scene !== ""
      ? {
          handle: character.handle,
          sujeito: subject.sujeito,
          possessivos: possessives.reescritos,
        }
      : null;

  // 4. The reference ceiling of the chosen model, counting the character's own
  //    sheet — it is an image in the same call and occupies the same room.
  const limit = maxReferences(model.slug);
  // 3b. The mute (§5).
  //
  //     One list from here on, so no step downstream has to remember to ask.
  //     Muted means the images do not travel, are not translated, are not
  //     numbered and are not paid for as input tokens — but they are recorded,
  //     because "four references were attached and none was used" is a different
  //     fact from "there were no references", and only one of them explains why
  //     an image came out the way it did.
  //
  //     The `@` is untouched either way: a mentioned character's sheet is the
  //     anchor of the mention, not a reference input, and the switch has no
  //     opinion about it.
  const heard = request.referencesEnabled ? request.references : [];
  const silenced = request.referencesEnabled
    ? []
    : request.references.map((reference) => reference.assetId);

  const total = heard.length + (character?.folhaAssetId ? 1 : 0);

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

  // 5b. The products on the wires, named here rather than taken on trust. One
  //     query for all of them, and a product the user does not own simply comes
  //     back nameless — RLS answers that question, not this code.
  const productNames = await loadProductNames(supabase, heard);

  // Which photo of each product speaks for it. The rest are numbered and sent,
  // but they do not repeat the sentence — three copies of "reproduce the exact
  // product" would describe three products. Mirrors buildCanvasPrompt, which is
  // the authority; this is only what decides what needs translating.
  const groupLeaders = new Set<number>();
  const seenGroups = new Set<string>();

  heard.forEach((reference, index) => {
    if (!reference.groupId) {
      groupLeaders.add(index);
      return;
    }

    if (seenGroups.has(reference.groupId)) return;

    seenGroups.add(reference.groupId);
    groupLeaders.add(index);
  });

  // 6. Portuguese in, English out — before a single Spark is at risk.
  const items = [
    // The sentence with a subject, never the one with a hole in it.
    ...(sceneForModel === "" ? [] : [{ id: "cena", text: sceneForModel }]),
    ...heard
      .map((reference, index) => ({
        id: `ref.${index}`,
        text: groupLeaders.has(index) ? reference.instrucao.trim() : "",
      }))
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
  const references: CanvasReferenceInput[] = heard.map((reference, index) => ({
    assetId: reference.assetId,
    kind: (reference.kind as CanvasReferenceInput["kind"]) ?? null,
    instrucaoPt: reference.instrucao.trim(),
    instrucaoEn: (translation.translations[`ref.${index}`] ?? "").trim(),
    origem: reference.origem,
    papel: reference.papel,
    grupoId: reference.groupId,
    // The row wins when there is a row. A product in the old Arsenal has a name
    // this side can verify, and a verified name beats a supplied one every time;
    // a card on the canvas has none, so the supplied one is the only name there
    // is. Naming, never widening.
    grupoRotulo: reference.groupId
      ? (productNames.get(reference.groupId) ?? reference.groupLabel.trim())
      : null,
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
    // The Portuguese recorded is the Portuguese that was translated — the
    // sentence with the subject in it. What the user actually typed, mention
    // and all, is in `prompt_user_pt`, which is the other half of the audit.
    cenaPt: sceneForModel,
    cenaEn: (translation.translations.cena ?? "").trim(),
    mencaoSujeito,
    estiloKey: request.estiloKey,
    anguloKey: request.anguloKey,
    iluminacaoKey: request.iluminacaoKey,
    expressaoKey: request.expressaoKey,
    referencias: references,
    referenciasSilenciadas: silenced,
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
    image_size: request.imageSize,
    reference_asset_ids: prompt.referenceAssetIds,
  };

  const summary = {
    handle: character?.handle ?? null,
    versao: character?.versionNumber ?? null,
    estilo: prompt.structure.estilo.chave,
    estilo_origem: prompt.structure.estilo.origem,
    regra_diretor: prompt.structure.regra_diretor,
    referencias: prompt.referenceAssetIds.length,
    // Zero here with a number here is the mute; zero in both is a block with
    // nothing attached. The summary is what the history lists by, so it has to
    // be able to tell the two apart without opening the compiled prompt.
    referencias_mudas: silenced.length,
    formato_aproximado: format.approximated,
    sem_folha: character !== null && character.folhaAssetId === null,
  };

  // A procedência é anexada AQUI e não no compilador: ela não muda um caractere
  // do que o modelo lê, e o compilador é função pura do que vai ao modelo.
  const promptCompiled = {
    text: prompt.text,
    structure: sceneProvenance
      ? { ...prompt.structure, storyboard: sceneProvenance }
      : prompt.structure,
  };

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
        imageSize: request.imageSize,
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
    .upload(storagePath, bytes, {
      contentType: image.mimeType,
      cacheControl: IMMUTABLE_CACHE_CONTROL,
    });

  if (uploadError) {
    return { ok: false, reason: "error" };
  }

  // A miniatura, dos bytes que já estão na mão — nenhum download a mais. Falha
  // aqui devolve `null` e nada além disso: uma geração paga não se perde por
  // causa de um derivado de 50 KB, e a tela cai para o original sozinha.
  const source = await storeThumbnail(supabase, storagePath, bytes);

  const { data: asset } = await supabase
    .from("assets")
    .insert({
      user_id: userId,
      kind: "image",
      source: "generation",
      storage_path: storagePath,
      mime_type: image.mimeType,
      byte_size: bytes.byteLength,
      // Sai de graça da decodificação que a miniatura já fez. Estas duas linhas
      // eram `null` desde sempre, e é a ausência delas que fez um `max()` sobre
      // 51 de 52 linhas vazias virar "960×960" num documento.
      width: source?.width ?? null,
      height: source?.height ?? null,
      // The gallery caption is the user's own sentence, not a description we
      // invented for it — which also makes the search find an image by what
      // was asked for rather than by what we decided to call it.
      label: galleryLabel(request.prompt, character?.handle ?? null),
    })
    .select("id")
    .single();

  if (!asset) {
    await supabase.storage.from("assets").remove([storagePath, thumbnailPath(storagePath)]);
    // O cache de URLs guarda só acertos, e este caminho deixou de existir: sem
    // esquecê-lo, ele produziria link por dias e a tela mostraria moldura
    // quebrada em vez de cair no estado vazio.
    forgetSignedUrls([storagePath, thumbnailPath(storagePath)]);
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
    p_real_cost_cents: imageRealCostCents(model.slug, request.imageSize, usage) ?? undefined,
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
    // The size, so the function prices *this* image rather than the model's
    // base. Naming the size is not naming the price — the catalogue still
    // answers that, which is the whole shape of this rule.
    p_image_size: request.imageSize,
    p_scene_id: request.scene?.id ?? undefined,
  });

  if (chargeError || !generation) {
    // Nobody keeps an image they were just told they could not afford.
    await supabase.from("assets").delete().eq("id", asset.id);
    await supabase.storage.from("assets").remove([storagePath, thumbnailPath(storagePath)]);
    // O cache de URLs guarda só acertos, e este caminho deixou de existir: sem
    // esquecê-lo, ele produziria link por dias e a tela mostraria moldura
    // quebrada em vez de cair no estado vazio.
    forgetSignedUrls([storagePath, thumbnailPath(storagePath)]);

    return { ok: false, reason: CHARGE_ERROR_CODES[chargeError?.code ?? ""] ?? "error" };
  }

  // A tela desenha esta imagem assim que ela chega, num card. Devolver o
  // original aqui seria abrir um buraco de 2,5 MB na **primeira** visualização
  // de cada geração — justamente a que sempre acontece.
  const signed = await signWithThumbnails(supabase, [storagePath]);
  const pair = signed.get(storagePath);

  if (!pair) {
    return { ok: false, reason: "error" };
  }

  return {
    ok: true,
    generationId: generation.id,
    assetId: asset.id,
    url: pair.thumb,
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

/** The column allows 200; a caption is a line, not a paragraph. */
const MAX_LABEL_LENGTH = 120;

/**
 * What the gallery will call this image. The user's own sentence, shortened —
 * and, when there was no sentence at all (an empty prompt with a mention), the
 * only true thing left to say about it.
 */
function galleryLabel(prompt: string, handle: string | null): string {
  const written = prompt.trim().replace(/\s+/g, " ");

  if (written !== "") {
    return written.length > MAX_LABEL_LENGTH
      ? `${written.slice(0, MAX_LABEL_LENGTH - 1)}…`
      : written;
  }

  return handle ? `@${handle} nos padrões dela` : "Imagem no canvas";
}

// ---------------------------------------------------------------------------
// Resolving the products on the wires
// ---------------------------------------------------------------------------

/**
 * The display name of every product a wire brought in, by id.
 *
 * Groups no longer come only from product cards — an input node on the canvas
 * makes one too, and its id is a node id, not an entity id. Those simply find
 * nothing here and are recorded nameless, which is correct: there is no row to
 * ask, and inventing a name from what the browser sent is the one thing this
 * function exists to avoid.
 *
 * The browser sends ids and this side supplies the words, for the same reason
 * the `@` is resolved here: what goes into the permanent record of a generation
 * has to be what the database says, not what a page happened to be showing.
 *
 * RLS scopes the lookup, so an id belonging to somebody else simply finds
 * nothing and the group is recorded nameless — the images themselves are already
 * protected by the same rule in loadImagePayloads.
 */
async function loadProductNames(
  supabase: Supabase,
  references: readonly { groupId: string | null }[],
): Promise<Map<string, string>> {
  const ids = [
    ...new Set(
      references
        .map((reference) => reference.groupId)
        .filter((id): id is string => id !== null),
    ),
  ];

  if (ids.length === 0) return new Map();

  const { data } = await supabase
    .from("entities")
    .select("id, display_name")
    .eq("kind", "product")
    .in("id", ids);

  return new Map((data ?? []).map((row) => [row.id, row.display_name]));
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
 * (decision D2 do versionamento). A character with no saved version cannot be
 * mentioned at all, and the interface says so in the one sentence that fixes it.
 *
 * ---------------------------------------------------------------------------
 * E ela tem de trabalhar **neste** projeto — Etapa D2, item 2.2
 * ---------------------------------------------------------------------------
 *
 * A lista de sugestões do `@` já esconde quem não está vinculada, e isso não é
 * suficiente: **a interface não é fronteira de segurança.** Uma menção digitada
 * à mão, um prompt copiado de outro projeto ou uma aba aberta desde antes de um
 * desvincular chegam aqui exatamente iguais a uma escolhida na lista.
 *
 * A recusa mora neste passo por um motivo aritmético: aqui é antes da leitura
 * do saldo, antes da tradução (que custa uma fração de centavo) e antes do
 * provedor. Uma menção recusada não escreve linha em `generations`, não toca no
 * ledger e não chama ninguém — **zero Spark, e não "quase zero"**. O mesmo
 * raciocínio que fez o preço por resolução ser conferido aqui em vez de deixado
 * para o GN005: descobrir depois é descobrir com a imagem já paga.
 *
 * Há um segundo cadeado no banco (GN006, em record_generation), e ele existe
 * para o dia em que um caminho novo esquecer desta linha. Este é o que
 * dispara; aquele é o que não deveria precisar disparar nunca.
 */
async function resolveCharacter(
  supabase: Supabase,
  userId: string,
  handle: string,
  scope: { versionNumber: number | null; projectId: string },
): Promise<
  | { ok: true; character: ResolvedCharacter }
  | { ok: false; reason: "unknown_handle" | "not_linked" | "no_version" | "unknown_version" }
> {
  const { versionNumber, projectId } = scope;

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

  // Antes da versão, de propósito: "ela não está neste projeto" e "ela não tem
  // versão salva" são dois problemas com dois consertos, e quem não está aqui
  // não deve receber a instrução de salvar uma v1 que não resolveria nada.
  const { data: link } = await supabase
    .from("project_entities")
    .select("entity_id")
    .eq("project_id", projectId)
    .eq("entity_id", entity.id)
    .maybeSingle();

  if (!link) {
    return { ok: false, reason: "not_linked" };
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
    // A failed generation is free, so this changes no money — it is recorded so
    // the history can answer "which size was being attempted when it broke?".
    p_image_size: input.request.imageSize,
    p_scene_id: input.request.scene?.id ?? undefined,
  });
}

