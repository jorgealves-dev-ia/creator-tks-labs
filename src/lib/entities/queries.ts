import { parseSheet } from "@/lib/character-sheet/schema";
import type { CharacterEntity } from "@/lib/entities/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Every character the signed-in user owns, with the snapshot @handle currently
 * resolves to.
 *
 * **All of them, not the ones linked to the open project** — and that stayed
 * true through the D2 rescoping, on purpose. A character belongs to the user;
 * which projects she works in is `project_entities`, read separately by
 * `loadProjectCharacterIds`. The list and the links have two different
 * lifetimes, and the store keeps them as two different things: see the comment
 * on `linkedIds` for the two reasons, one of which is a draft that must survive
 * a change of tab.
 *
 * Archived characters are left out — spec 5.5: archiving hides, never erases.
 */
export async function loadCharacters(userId: string): Promise<CharacterEntity[]> {
  const supabase = await createSupabaseServerClient();

  const { data: rows } = await supabase
    .from("entities")
    .select("id, handle, display_name, sheet, active_version_id, cover_asset_id")
    .eq("user_id", userId)
    .eq("kind", "character")
    .is("archived_at", null)
    .order("created_at");

  if (!rows || rows.length === 0) {
    return [];
  }

  // One extra query rather than one per character. The active snapshot travels
  // with the character so the canvas card can tell "draft with unsaved changes"
  // without asking the server again.
  const activeVersionIds = rows
    .map((row) => row.active_version_id)
    .filter((id): id is string => id !== null);

  const versionsById = new Map<string, { number: number; sheet: unknown }>();

  if (activeVersionIds.length > 0) {
    const { data: versions } = await supabase
      .from("entity_versions")
      .select("id, version_number, sheet")
      .in("id", activeVersionIds);

    for (const version of versions ?? []) {
      versionsById.set(version.id, { number: version.version_number, sheet: version.sheet });
    }
  }

  return rows.map((row) => {
    const active = row.active_version_id ? versionsById.get(row.active_version_id) : undefined;

    return {
      id: row.id,
      handle: row.handle,
      displayName: row.display_name,
      sheet: parseSheet(row.sheet),
      activeVersion:
        row.active_version_id && active
          ? {
              id: row.active_version_id,
              number: active.number,
              sheet: parseSheet(active.sheet),
            }
          : null,
      coverAssetId: row.cover_asset_id,
    };
  });
}

/**
 * Quais personagens trabalham neste projeto — os ids, e nada além deles.
 *
 * Só ids porque quem tem os dados é `loadCharacters`: pedir aqui o nome e a
 * folha de novo seria carregar a mesma personagem duas vezes por request, e
 * criaria uma segunda cópia dela para as duas telas discordarem sobre qual está
 * certa. Uma lista de nomes e um conjunto de vínculos.
 *
 * Sem filtro de `archived_at` de propósito: o vínculo de uma personagem
 * arquivada continua existindo e continua verdadeiro. Quem some da tela some
 * porque `loadCharacters` não a trouxe — um id sem personagem simplesmente não
 * encontra nada no cruzamento, e essa é a ordem certa das responsabilidades.
 *
 * O RLS já limita ao dono; o `project_id` é o recorte do produto.
 */
export async function loadProjectCharacterIds(projectId: string): Promise<string[]> {
  const supabase = await createSupabaseServerClient();

  const { data } = await supabase
    .from("project_entities")
    .select("entity_id")
    .eq("project_id", projectId);

  return (data ?? []).map((row) => row.entity_id);
}
