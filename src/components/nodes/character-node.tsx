"use client";

import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { useState } from "react";

import { DirtyDot, Portrait, VersionBadge } from "@/components/character-sheet/identity";
import { NodeHeader } from "@/components/nodes/node-header";
import { useCanvasStore } from "@/lib/canvas/store";
import { isDraftDirty } from "@/lib/character-sheet/diff";
import { linkCharacterToProject } from "@/lib/entities/actions";
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
  const linkedIds = useEntitiesStore((state) => state.linkedIds);
  const link = useEntitiesStore((state) => state.link);
  const openEditor = useEntitiesStore((state) => state.openEditor);
  const projectId = useCanvasStore((state) => state.projectId);
  const portraits = useCharacterPortraits();

  const [collapsing, setCollapsing] = useState(false);
  const [relinking, setRelinking] = useState(false);
  const [relinkFailed, setRelinkFailed] = useState(false);

  async function relink() {
    if (!projectId) return;

    setRelinking(true);
    setRelinkFailed(false);

    const result = await linkCharacterToProject({ entityId: data.entityId, projectId });

    setRelinking(false);

    if (!result.ok) {
      setRelinkFailed(true);
      return;
    }

    link(data.entityId);
  }

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

  /**
   * Ela existe, é sua, e não trabalha aqui — item 2.3.
   *
   * Um estado **diferente** do de cima, e a diferença é o conserto. "Não
   * encontrada" é o que uma personagem arquivada produz, e não tem volta pela
   * tela: a única saída é tirar o cartão. "Não vinculada" tem volta, e é um
   * botão — porque desvincular é reversível por definição, e uma tela que
   * apresentasse as duas coisas com a mesma cara transformaria a ação leve na
   * ação pesada aos olhos de quem lê.
   *
   * O cartão fica no canvas, com o nome e o retrato dela. Sumir com ele seria
   * a segunda coisa que desvincular não faz: o desenho do fluxo é do usuário,
   * e mexer nele por causa de um vínculo seria o produto reorganizando a mesa
   * de trabalho de alguém sem pedir.
   */
  if (!linkedIds.has(character.id)) {
    return (
      <div
        className={`w-56 rounded-xl border border-dashed border-warning/50 bg-surface-raised
                    ${selected ? "ring-1 ring-accent" : ""}`}
      >
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
            className="size-11 opacity-60"
          />

          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium leading-tight text-warning">
              {t.characterSheet.card.unlinked}
            </p>
            <p className="truncate text-[11px] text-ink-faint">@{character.handle}</p>
          </div>
        </div>

        <p className="px-3 pb-2 text-[11px] leading-relaxed text-ink-faint">
          {t.characterSheet.card.unlinkedHint}
        </p>

        <div className="border-t border-line p-2">
          <button
            type="button"
            disabled={relinking || !projectId}
            onClick={() => void relink()}
            className="w-full rounded-lg bg-accent py-1.5 text-xs font-medium text-canvas
                       transition-colors hover:bg-accent-hover
                       disabled:cursor-not-allowed disabled:opacity-60"
          >
            {relinking ? t.characterSheet.card.relinking : t.characterSheet.card.relink}
          </button>

          {relinkFailed ? (
            <p className="mt-1.5 text-center text-[10px] text-warning">
              {t.characterSheet.card.relinkFailed}
            </p>
          ) : null}
        </div>

        {/* O fio continua existindo: o cartão está mudo para a geração, não
            desconectado do desenho. Tirar o handle apagaria as arestas que o
            usuário desenhou, por causa de algo que um clique desfaz. */}
        <Handle
          type="source"
          position={Position.Right}
          title={t.characterSheet.card.outputHandle}
          className="!size-2.5 !border-2 !border-canvas !bg-ink-faint"
        />
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
