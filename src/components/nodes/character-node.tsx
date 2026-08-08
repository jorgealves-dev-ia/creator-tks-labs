"use client";

import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";

import { DirtyDot, Portrait, VersionBadge } from "@/components/character-sheet/identity";
import { isDraftDirty } from "@/lib/character-sheet/diff";
import { useEntitiesStore } from "@/lib/entities/store";
import { t } from "@/lib/i18n/pt-BR";

/**
 * The character on the canvas: a compact card, never the editor (U1).
 *
 * The node stores only the character's id. Everything shown here is read live
 * from the store, so renaming a character or saving a version updates the card
 * at once — and the saved graph never carries a stale copy of a sheet.
 */

export type CharacterNodeData = { entityId: string };
export type CharacterNodeType = Node<CharacterNodeData, "character">;

export function CharacterNode({ data, selected }: NodeProps<CharacterNodeType>) {
  const character = useEntitiesStore((state) => state.characters[data.entityId]);
  const seeded = useEntitiesStore((state) => state.seeded);
  const openEditor = useEntitiesStore((state) => state.openEditor);

  if (!seeded) {
    // One frame while the store receives the server's list. Quiet on purpose:
    // "not loaded yet" must never look like "this character is gone".
    return <div className="h-[5.75rem] w-56 rounded-xl border border-line bg-surface-raised" />;
  }

  if (!character) {
    return (
      <div className="w-56 rounded-xl border border-dashed border-line bg-surface-raised p-3">
        <p className="text-xs font-medium text-ink-muted">{t.characterSheet.card.missing}</p>
        <p className="mt-1 text-[11px] leading-relaxed text-ink-faint">
          {t.characterSheet.card.missingHint}
        </p>
      </div>
    );
  }

  const dirty = isDraftDirty(character.sheet, character.activeVersion?.sheet ?? null);

  return (
    <div
      onDoubleClick={() => openEditor(character.id)}
      title={t.characterSheet.card.editHint}
      className={`w-56 rounded-xl border bg-surface-raised shadow-lg shadow-black/30
                  transition-colors ${selected ? "border-accent" : "border-line"}`}
    >
      <div className="flex items-center gap-2.5 p-3">
        <Portrait name={character.displayName} className="size-11" />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-sm font-medium text-ink">{character.displayName}</p>
            {dirty ? <DirtyDot /> : null}
          </div>
          <p className="truncate text-xs text-ink-faint">@{character.handle}</p>
        </div>

        <VersionBadge versionNumber={character.activeVersion?.number ?? null} />
      </div>

      <div className="border-t border-line p-2">
        <button
          type="button"
          onClick={() => openEditor(character.id)}
          className="w-full rounded-lg py-1.5 text-xs font-medium text-ink-muted
                     transition-colors hover:bg-surface-hover hover:text-ink"
        >
          {t.characterSheet.card.edit}
        </button>
      </div>

      {/* Plugs the character into a generating block. What the block does with
          the mention belongs to the generation phase, not to this screen. */}
      <Handle
        type="source"
        position={Position.Right}
        title={t.characterSheet.card.outputHandle}
        className="!size-2.5 !border-2 !border-canvas !bg-accent"
      />
    </div>
  );
}
