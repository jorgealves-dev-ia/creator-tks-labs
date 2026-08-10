"use client";

import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { useState } from "react";

import { DirtyDot, Portrait, VersionBadge } from "@/components/character-sheet/identity";
import { NodeHeader } from "@/components/nodes/node-header";
import { useCanvasStore } from "@/lib/canvas/store";
import { isDraftDirty } from "@/lib/character-sheet/diff";
import { useEntitiesStore } from "@/lib/entities/store";
import { useCharacterPortraits } from "@/lib/entities/use-portraits";
import { t } from "@/lib/i18n/pt-BR";

/** Long enough to read as leaving, short enough not to be a wait. */
const COLLAPSE_MS = 180;

/**
 * The character on the canvas: a compact card, never the editor (U1).
 *
 * The node stores only the character's id. Everything shown here is read live
 * from the store, so renaming a character or saving a version updates the card
 * at once — and the saved graph never carries a stale copy of a sheet.
 */

export type CharacterNodeData = { entityId: string };
export type CharacterNodeType = Node<CharacterNodeData, "character">;

export function CharacterNode({ id, data, selected }: NodeProps<CharacterNodeType>) {
  const character = useEntitiesStore((state) => state.characters[data.entityId]);
  const seeded = useEntitiesStore((state) => state.seeded);
  const openEditor = useEntitiesStore((state) => state.openEditor);
  const portraits = useCharacterPortraits();

  const [collapsing, setCollapsing] = useState(false);

  /**
   * Puts the card away — back into the Arsenal, where it has been all along.
   *
   * Taking a character off the canvas never deleted anything (decision of
   * 08/08/2026: the character belongs to the user, the canvas is a workbench),
   * but the only way to do it was the Delete key, which reads as destruction.
   * A named action that shrinks away says the true thing: it went back to the
   * rail, and the "+" there brings it out again.
   */
  function collapse() {
    setCollapsing(true);

    setTimeout(() => {
      useCanvasStore.getState().onNodesChange([{ type: "remove", id }]);
    }, COLLAPSE_MS);
  }

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
      className={`group/node relative w-56 rounded-xl border bg-surface-raised shadow-lg
                  shadow-black/30 transition-all duration-150 ease-out
                  ${selected ? "border-accent" : "border-line"}
                  ${collapsing ? "scale-90 opacity-0" : "scale-100 opacity-100"}`}
    >
      {/* Removing a character is putting it away, so the card keeps its own
          shrinking exit instead of the header's plain removal. */}
      <NodeHeader
        nodeId={id}
        kind="character"
        title={character.displayName}
        removeHint={t.characterSheet.card.collapse}
        onRemove={collapse}
      />

      <div className="flex items-center gap-2.5 p-3">
        <Portrait
          name={character.displayName}
          src={portraits[character.id]}
          className="size-11"
        />

        {/* The name moved up into the header, so what is left here is the part
            the header cannot say: the handle a prompt calls her by. */}
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <p className="truncate text-sm text-ink-muted">@{character.handle}</p>
          {dirty ? <DirtyDot /> : null}
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
