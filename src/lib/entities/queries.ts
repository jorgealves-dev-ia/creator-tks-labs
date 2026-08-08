import { parseSheet } from "@/lib/character-sheet/schema";
import type { CharacterEntity } from "@/lib/entities/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Every character the signed-in user owns, with the snapshot @handle currently
 * resolves to.
 *
 * Characters are deliberately not scoped to a project: an influencer is a
 * reusable asset and a project is a workbench, so the same character can appear
 * on the canvas of any project. Decision of 2026-08-07, recorded in
 * docs/decisoes.md.
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
