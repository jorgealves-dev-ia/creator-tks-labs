"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import {
  characterSheetSchema,
  createEmptySheet,
  parseSheet,
  sheetToJson,
  type CharacterSheet,
} from "@/lib/character-sheet/schema";
import { HANDLE_PATTERN } from "@/lib/entities/handle";
import type { ActiveVersion, CharacterEntity, VersionSummary } from "@/lib/entities/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Writes to a character: creating one, and saving its draft.
 *
 * Saving a *version* is not here — it is a single atomic step in the database
 * (function public.save_entity_version), because an INSERT plus a pointer UPDATE
 * done as two round trips could leave @handle pointing at the wrong snapshot.
 *
 * Every action re-checks the session. A Server Action is a public HTTP endpoint
 * and must never rely on the proxy having run.
 */

/** Postgres unique violation — here, a handle the user already used. */
const UNIQUE_VIOLATION = "23505";

const displayNameSchema = z.string().trim().min(1).max(120);
const handleSchema = z.string().trim().regex(HANDLE_PATTERN);

const createCharacterSchema = z.object({
  displayName: displayNameSchema,
  handle: handleSchema,
  genero: z.enum(["feminino", "masculino", "androgino"]).optional(),
  /**
   * Onde ela nasce. Criar uma personagem dentro de um projeto **vincula**: é o
   * único lugar do produto em que a intenção é evidente sem perguntar nada.
   *
   * Opcional porque criar sem projeto aberto continua sendo possível — a
   * personagem é do usuário, não da aba. Nesse caso ela nasce sem vínculo
   * nenhum, e a galeria é como ela entra em algum lugar.
   */
  projectId: z.uuid().optional(),
});

const saveDraftSchema = z.object({
  entityId: z.uuid(),
  displayName: displayNameSchema,
  sheet: characterSheetSchema,
});

export type CreateCharacterResult =
  | {
      ok: true;
      character: CharacterEntity;
      /**
       * Se ela já entrou neste projeto. Falso quando não havia projeto aberto —
       * e também quando o vínculo falhou, que é o caso que esta flag existe para
       * conseguir dizer em voz alta.
       *
       * A personagem **não** é desfeita nesse caso, de propósito: ela existe, é
       * do usuário, e um rollback aqui destruiria o que a pessoa acabou de
       * nomear por causa de uma segunda escrita que se conserta com um clique
       * na galeria. Meio-caminho honesto vence tudo-ou-nada caro.
       */
      linked: boolean;
    }
  | { ok: false; reason: "invalid" | "handle_taken" | "error" };

export type SaveDraftResult = { ok: true } | { ok: false; reason: "invalid" | "error" };

export type HandleCheckResult = { available: boolean };

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
 * Creates a character with an empty sheet: honest defaults on layer 2, an
 * untouched DNA, and no version at all. A character with no saved version
 * cannot be mentioned with @ yet — that is the point of "save as v1".
 *
 * Criada dentro de um projeto, ela **já nasce vinculada** a ele (Etapa D2).
 * São duas escritas e não uma transação, e isso é uma escolha: o precedente de
 * `save_entity_version` existe porque um meio-caminho lá deixaria `@handle`
 * apontando para o retrato errado — risco de correção. Aqui o meio-caminho
 * deixa uma personagem que se traz de volta com um clique na galeria, e a
 * resposta diz `linked: false` em vez de fingir que deu certo.
 */
export async function createCharacter(input: unknown): Promise<CreateCharacterResult> {
  const parsed = createCharacterSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, reason: "invalid" };
  }

  const { supabase, userId } = await requireSession();
  const sheet = createEmptySheet(parsed.data.genero);

  const { data, error } = await supabase
    .from("entities")
    .insert({
      user_id: userId,
      kind: "character",
      // No project here, and there is no longer a column for one: a character
      // belongs to the user, and which projects she works in is a row in
      // project_entities. See 20260811140000_project_entities.sql, which drops
      // entities.project_id — this line has to be gone before that lands, and it
      // was already a no-op before it, because the column was nullable with no
      // default. Correct in both schemas is what makes the order safe.
      handle: parsed.data.handle,
      display_name: parsed.data.displayName,
      sheet: sheetToJson(sheet),
    })
    .select("id, handle, display_name, sheet, cover_asset_id")
    .single();

  if (error) {
    return { ok: false, reason: error.code === UNIQUE_VIOLATION ? "handle_taken" : "error" };
  }

  let linked = false;

  if (parsed.data.projectId) {
    const { error: linkError } = await supabase.from("project_entities").insert({
      project_id: parsed.data.projectId,
      entity_id: data.id,
      user_id: userId,
    });

    // A posse das duas pontas é garantida pelas FKs compostas da tabela, então
    // um projeto que não é deste usuário é recusado pelo banco e chega aqui
    // como erro — não como um vínculo torto que ninguém veria.
    linked = !linkError;
  }

  return {
    ok: true,
    linked,
    character: {
      id: data.id,
      handle: data.handle,
      displayName: data.display_name,
      sheet: parseSheet(data.sheet),
      activeVersion: null,
      coverAssetId: data.cover_asset_id,
    },
  };
}

// ---------------------------------------------------------------------------
// O vínculo com o projeto (Etapa D2)
// ---------------------------------------------------------------------------

const linkSchema = z.object({
  entityId: z.uuid(),
  projectId: z.uuid(),
});

export type LinkCharacterResult = { ok: true } | { ok: false; reason: "invalid" | "error" };

/**
 * Traz uma personagem para um projeto.
 *
 * Idempotente por construção: a chave primária é o par `(project_id, entity_id)`,
 * então clicar duas vezes não cria dois vínculos — o segundo conflita e é
 * absorvido. Um clique repetido numa lista é acidente comum, e transformar
 * acidente em erro na tela seria punir a pessoa por a rede estar lenta.
 *
 * A posse das duas pontas é do banco, não daqui: as FKs compostas de
 * `project_entities` recusam o par em que o projeto é de um usuário e a
 * personagem é de outro. O RLS faz o resto.
 */
export async function linkCharacterToProject(input: unknown): Promise<LinkCharacterResult> {
  const parsed = linkSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, reason: "invalid" };
  }

  const { supabase, userId } = await requireSession();

  const { error } = await supabase
    .from("project_entities")
    .upsert(
      {
        project_id: parsed.data.projectId,
        entity_id: parsed.data.entityId,
        user_id: userId,
      },
      { onConflict: "project_id,entity_id", ignoreDuplicates: true },
    );

  return error ? { ok: false, reason: "error" } : { ok: true };
}

/**
 * Saves the draft — the notebook that stays open. Called by the editor's
 * autosave, so it is deliberately cheap and has no side effects beyond the row:
 * no revalidation, no redirect, nothing that would yank the canvas around while
 * the user is typing.
 *
 * The display name rides along because the editor lets the user rename in place.
 */
export async function saveCharacterDraft(input: unknown): Promise<SaveDraftResult> {
  const parsed = saveDraftSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, reason: "invalid" };
  }

  const { supabase } = await requireSession();

  const { data, error } = await supabase
    .from("entities")
    .update({
      sheet: sheetToJson(parsed.data.sheet),
      display_name: parsed.data.displayName,
    })
    .eq("id", parsed.data.entityId)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return { ok: false, reason: "error" };
  }

  return { ok: true };
}

/**
 * The custom error codes raised by public.save_entity_version. PostgREST passes
 * the SQLSTATE straight through, which is what lets the interface say "nothing
 * changed since v3" instead of "something went wrong".
 * See supabase/migrations/20260807190000_save_entity_version.sql.
 */
const VERSION_ERROR_CODES: Record<string, SaveVersionFailure> = {
  CT001: "unchanged",
  CT002: "archived",
  CT003: "not_found",
};

type SaveVersionFailure = "unchanged" | "archived" | "not_found" | "invalid" | "error";

const saveVersionSchema = z.object({
  entityId: z.uuid(),
  label: z.string().trim().max(120).optional(),
});

export type SavedVersion = {
  id: string;
  number: number;
  label: string | null;
  createdAt: string;
  sheet: CharacterSheet;
};

export type SaveVersionResult =
  | { ok: true; version: SavedVersion }
  | { ok: false; reason: SaveVersionFailure };

/**
 * Freezes the draft into a new version and moves the active pointer onto it.
 *
 * Both writes happen inside public.save_entity_version, in one transaction. The
 * two of them must be all-or-nothing: a version written without the pointer
 * moving — or a pointer moved to a version that was never written — would leave
 * @handle resolving to the wrong snapshot, which is the one thing this whole
 * mechanism exists to prevent.
 *
 * The snapshot is read from entities.sheet by the function itself; the caller
 * flushes its pending autosave first so that what gets framed is exactly what
 * the notebook holds.
 */
export async function saveCharacterVersion(input: unknown): Promise<SaveVersionResult> {
  const parsed = saveVersionSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, reason: "invalid" };
  }

  const { supabase } = await requireSession();

  const { data, error } = await supabase.rpc("save_entity_version", {
    p_entity_id: parsed.data.entityId,
    p_label: parsed.data.label === "" ? undefined : parsed.data.label,
  });

  if (error) {
    return { ok: false, reason: VERSION_ERROR_CODES[error.code ?? ""] ?? "error" };
  }

  if (!data) {
    return { ok: false, reason: "error" };
  }

  return {
    ok: true,
    version: {
      id: data.id,
      number: data.version_number,
      label: data.label,
      createdAt: data.created_at,
      sheet: parseSheet(data.sheet),
    },
  };
}

/**
 * The saved versions of a character, newest first. Summaries only: the frozen
 * sheets are fetched one at a time, when a version is actually opened.
 */
export async function listCharacterVersions(input: unknown): Promise<VersionSummary[]> {
  const parsed = z.uuid().safeParse(input);

  if (!parsed.success) return [];

  const { supabase } = await requireSession();

  const { data } = await supabase
    .from("entity_versions")
    .select("id, version_number, label, created_at")
    .eq("entity_id", parsed.data)
    .order("version_number", { ascending: false });

  return (data ?? []).map((row) => ({
    id: row.id,
    number: row.version_number,
    label: row.label,
    createdAt: row.created_at,
  }));
}

export type VersionSheetResult =
  | { ok: true; sheet: CharacterSheet }
  | { ok: false; reason: "invalid" | "error" };

/** The frozen snapshot of one version — for viewing it, or loading it into the draft. */
export async function getCharacterVersionSheet(input: unknown): Promise<VersionSheetResult> {
  const parsed = z.uuid().safeParse(input);

  if (!parsed.success) {
    return { ok: false, reason: "invalid" };
  }

  const { supabase } = await requireSession();

  const { data, error } = await supabase
    .from("entity_versions")
    .select("sheet")
    .eq("id", parsed.data)
    .maybeSingle();

  if (error || !data) {
    return { ok: false, reason: "error" };
  }

  return { ok: true, sheet: parseSheet(data.sheet) };
}

const activateVersionSchema = z.object({
  entityId: z.uuid(),
  versionId: z.uuid(),
});

export type ActivateVersionResult =
  | { ok: true; version: ActiveVersion }
  | { ok: false; reason: "invalid" | "error" };

/**
 * Rollback (rule 5.3): activating an older version moves the pointer and
 * nothing else. Nothing is erased and nothing is rewritten.
 *
 * A plain UPDATE is safe here without a transaction — the composite foreign key
 * on (active_version_id, id) makes the database itself refuse a pointer to
 * another character's version, so there is no cross-entity mistake to guard
 * against in code.
 */
export async function activateCharacterVersion(input: unknown): Promise<ActivateVersionResult> {
  const parsed = activateVersionSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, reason: "invalid" };
  }

  const { supabase } = await requireSession();

  const { data: version, error: versionError } = await supabase
    .from("entity_versions")
    .select("id, version_number, sheet")
    .eq("id", parsed.data.versionId)
    .eq("entity_id", parsed.data.entityId)
    .maybeSingle();

  if (versionError || !version) {
    return { ok: false, reason: "error" };
  }

  const { data, error } = await supabase
    .from("entities")
    .update({ active_version_id: parsed.data.versionId })
    .eq("id", parsed.data.entityId)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return { ok: false, reason: "error" };
  }

  return {
    ok: true,
    version: {
      id: version.id,
      number: version.version_number,
      sheet: parseSheet(version.sheet),
    },
  };
}

/**
 * Whether a handle is still free for this user. Advisory only — the real
 * guarantee is the unique constraint, and createCharacter reports the violation
 * if someone takes the handle between this check and the insert.
 */
export async function isHandleAvailable(input: unknown): Promise<HandleCheckResult> {
  const parsed = handleSchema.safeParse(input);

  if (!parsed.success) {
    return { available: false };
  }

  const { supabase, userId } = await requireSession();

  const { data } = await supabase
    .from("entities")
    .select("id")
    .eq("user_id", userId)
    .eq("handle", parsed.data)
    .maybeSingle();

  return { available: !data };
}

// ---------------------------------------------------------------------------
// Putting a character away
// ---------------------------------------------------------------------------

export type ArchiveCharacterResult = { ok: true } | { ok: false; reason: "invalid" | "error" };

/**
 * Archives a character: it leaves the Arsenal and every list, and everything it
 * ever touched is preserved.
 *
 * **Archived and not deleted**, and the reason here is measured rather than
 * assumed. `generations.entity_id` references `entities` with ON DELETE CASCADE,
 * so a real delete would take **every image she was ever in** with her — the
 * rows, not the files. `entity_versions` cascades the same way, so the frozen
 * snapshots would go too. And `ledger_transactions.generation_id` is ON DELETE
 * SET NULL, so the money would stay in the ledger pointing at nothing: orphan
 * debits in an append-only book, which is the one thing a financial record may
 * never contain.
 *
 * What the user loses is real and is said out loud on the screen that calls
 * this: she leaves the Arsenal, and `@luna` stops resolving in new generations —
 * `resolveCharacter` filters on `archived_at is null`, so the mention simply
 * finds nothing from here on. What they keep is everything already made.
 *
 * RLS scopes the update, and `kind` is pinned so this can only ever archive a
 * character — the same shape every other write in this file has.
 */
export async function archiveCharacter(input: unknown): Promise<ArchiveCharacterResult> {
  const parsed = z.uuid().safeParse(input);

  if (!parsed.success) {
    return { ok: false, reason: "invalid" };
  }

  const { supabase } = await requireSession();

  const { data, error } = await supabase
    .from("entities")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", parsed.data)
    .eq("kind", "character")
    .select("id")
    .maybeSingle();

  return error || !data ? { ok: false, reason: "error" } : { ok: true };
}
