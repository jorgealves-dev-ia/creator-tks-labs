"use client";

import { useReactFlow } from "@xyflow/react";
import { useState } from "react";

import { CharacterWizard } from "@/components/character-sheet/character-wizard";
import { Portrait, VersionBadge } from "@/components/character-sheet/identity";
import { NodeIcon, type NodeKind } from "@/components/nodes/node-icons";
import { NODE_TYPE_MIME } from "@/lib/canvas/drag";
import { useReferencePicker } from "@/lib/canvas/reference-picker-store";
import { useCanvasStore } from "@/lib/canvas/store";
import { useEntitiesStore } from "@/lib/entities/store";
import { useCharacterPortraits } from "@/lib/entities/use-portraits";
import { t } from "@/lib/i18n/pt-BR";

/**
 * Collapsed rail that widens when the pointer gets close. `focus-within` gives
 * keyboard users the same reach.
 *
 * Collapsed, a character is its portrait; expanded, it is a full row. That is
 * what makes the rail useful at 56px wide instead of merely present.
 */
export function NodeSidebar() {
  const { screenToFlowPosition } = useReactFlow();
  const characters = useEntitiesStore((state) => state.characters);
  const order = useEntitiesStore((state) => state.order);
  const openEditor = useEntitiesStore((state) => state.openEditor);
  const nodes = useCanvasStore((state) => state.nodes);
  const projectId = useCanvasStore((state) => state.projectId);
  const portraits = useCharacterPortraits();

  const [creating, setCreating] = useState(false);

  const onCanvas = new Set(
    nodes
      .map((node) => node.data.entityId)
      .filter((entityId): entityId is string => typeof entityId === "string"),
  );

  /** Dropped where the user is looking, nudged so blocks added in a row do not
   *  land exactly on top of each other. */
  function dropPosition(nudgeStep: number) {
    const nudge = (nudgeStep % 5) * 28;

    return screenToFlowPosition({
      x: window.innerWidth / 2 + nudge,
      y: window.innerHeight / 2 + nudge,
    });
  }

  function addNode(type: string, data: Record<string, unknown>, nudgeStep: number) {
    useCanvasStore.getState().onNodesChange([
      {
        type: "add",
        item: {
          id: crypto.randomUUID(),
          type,
          position: dropPosition(nudgeStep),
          data,
        },
      },
    ]);
  }

  function addToCanvas(entityId: string) {
    addNode("character", { entityId }, onCanvas.size);
  }

  function addGenerator() {
    // The block starts empty on purpose: an empty prompt with no mention is the
    // one state the button explains rather than the one it hides.
    addNode("generator", {}, nodes.length);
  }

  return (
    <>
      <aside
        aria-label={t.studio.sidebarTitle}
        className="rail group absolute bottom-3 left-3 top-20 z-10 flex w-14 flex-col
                   overflow-hidden rounded-xl border border-line bg-surface/70
                   shadow-lg shadow-black/30 backdrop-blur-xl
                   transition-[width] duration-200 ease-out
                   hover:w-64 focus-within:w-64"
      >
        <div className="flex h-14 shrink-0 items-center gap-3 px-4">
          <svg viewBox="0 0 16 16" className="size-4 shrink-0 text-ink-muted" aria-hidden>
            <rect x="1.5" y="1.5" width="5" height="5" rx="1.5"
                  stroke="currentColor" strokeWidth="1.3" fill="none" />
            <rect x="9.5" y="1.5" width="5" height="5" rx="1.5"
                  stroke="currentColor" strokeWidth="1.3" fill="none" />
            <rect x="1.5" y="9.5" width="5" height="5" rx="1.5"
                  stroke="currentColor" strokeWidth="1.3" fill="none" />
            <rect x="9.5" y="9.5" width="5" height="5" rx="1.5"
                  stroke="currentColor" strokeWidth="1.3" fill="none" />
          </svg>
          <span className={revealed("text-sm font-medium text-ink")}>
            {t.studio.sidebarTitle}
          </span>
        </div>

        <div className="rail-scroll flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden pb-2">
          <RailSection label={t.characterSheet.sidebar.title} first />

          {order.length === 0 ? (
            <p className={onlyWhenOpen("px-4 py-1 text-xs leading-relaxed text-ink-faint")}>
              {t.characterSheet.sidebar.empty}
            </p>
          ) : null}

          {order.map((id) => {
            const character = characters[id];
            if (!character) return null;

            const isOnCanvas = onCanvas.has(id);

            return (
              <div key={id} className="flex items-center gap-3 px-3 py-1">
                <button
                  type="button"
                  onClick={() => openEditor(id)}
                  title={character.displayName}
                  className="flex min-w-0 flex-1 items-center gap-3 rounded-lg py-1 text-left
                             transition-colors hover:bg-surface-hover"
                >
                  <Portrait
                    name={character.displayName}
                    src={portraits[character.id]}
                    className="size-8"
                  />

                  <span className={revealed("min-w-0 flex-1")}>
                    <span className="block truncate text-xs font-medium text-ink">
                      {character.displayName}
                    </span>
                    <span className="block truncate text-[11px] text-ink-faint">
                      @{character.handle}
                    </span>
                  </span>

                  <span className={revealed("")}>
                    <VersionBadge versionNumber={character.activeVersion?.number ?? null} />
                  </span>
                </button>

                <span className={revealed("shrink-0")}>
                  {isOnCanvas ? (
                    <span className="text-[11px] text-ink-faint">
                      {t.characterSheet.sidebar.onCanvas}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => addToCanvas(id)}
                      title={t.characterSheet.sidebar.addToCanvas}
                      aria-label={t.characterSheet.sidebar.addToCanvas}
                      className="flex size-6 items-center justify-center rounded-md border
                                 border-line text-ink-muted transition-colors
                                 hover:border-line-strong hover:text-ink"
                    >
                      <svg viewBox="0 0 14 14" className="size-3" aria-hidden>
                        <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.6"
                              strokeLinecap="round" />
                      </svg>
                    </button>
                  )}
                </span>
              </div>
            );
          })}

          <div className="px-3 pt-2">
            <button
              type="button"
              onClick={() => setCreating(true)}
              title={t.characterSheet.sidebar.newCharacter}
              className="flex w-full items-center gap-3 rounded-lg py-1.5 text-left
                         transition-colors hover:bg-surface-hover"
            >
              <span
                aria-hidden
                className="flex size-8 shrink-0 items-center justify-center rounded-lg
                           border border-dashed border-line-strong text-ink-muted"
              >
                <svg viewBox="0 0 14 14" className="size-3" aria-hidden>
                  <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.6"
                        strokeLinecap="round" />
                </svg>
              </span>
              <span className={revealed("truncate text-xs font-medium text-ink-muted")}>
                {t.characterSheet.sidebar.newCharacter}
              </span>
            </button>
          </div>

          <RailSection label={t.inputs.sidebarTitle} />

          {/*
            A shelf of *types*, not of things.
            Nothing is configured here: no name, no images, no instruction. The
            rail offers a kind of card and the card holds everything else —
            which is the whole reversal of this cycle. A product is rotativo;
            keeping a permanent shelf of its photos meant registering something
            before you could use it, for the sake of a list nobody wanted.
          */}
          <div className="px-3">
            {INPUT_TYPES.map((type) => (
              <button
                key={type.kind}
                type="button"
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.setData(NODE_TYPE_MIME, type.kind);
                  event.dataTransfer.effectAllowed = "move";
                }}
                onClick={() => addNode(type.kind, {}, nodes.length)}
                title={type.hint}
                className="flex w-full items-center gap-3 rounded-lg py-1.5 text-left
                           transition-colors hover:bg-surface-hover"
              >
                <span
                  aria-hidden
                  className="flex size-8 shrink-0 items-center justify-center rounded-lg
                             border border-line bg-surface text-ink-muted"
                >
                  <NodeIcon kind={type.kind} className="size-3.5" />
                </span>
                <span className={revealed("truncate text-xs font-medium text-ink")}>
                  {type.label}
                </span>
              </button>
            ))}
          </div>

          {/*
            A Galeria (§4b da D1).
            Fica com os Blocos e não com os Inputs porque não é uma coisa que se
            arrasta para o canvas: é uma janela para o que este projeto já
            produziu. Sem projeto aberto não há o que mostrar, e o item some em
            vez de abrir uma grade vazia.
          */}
          {projectId ? (
            <>
              <RailSection label={t.generation.gallery.sidebar} />

              <div className="px-3">
                <button
                  type="button"
                  onClick={() => useReferencePicker.getState().browse({ projectId })}
                  title={t.generation.gallery.sidebarHint}
                  className="flex w-full items-center gap-3 rounded-lg py-1.5 text-left
                             transition-colors hover:bg-surface-hover"
                >
                  <span
                    aria-hidden
                    className="flex size-8 shrink-0 items-center justify-center rounded-lg
                               border border-line bg-surface text-ink-muted"
                  >
                    <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden>
                      <rect x="1.5" y="2.5" width="13" height="11" rx="2" stroke="currentColor"
                            strokeWidth="1.3" fill="none" />
                      <path d="M1.5 11l3.2-3.2 2.4 2.4 3-3 4.4 4.4" stroke="currentColor"
                            strokeWidth="1.3" fill="none" strokeLinecap="round"
                            strokeLinejoin="round" />
                      <circle cx="10.4" cy="6" r="1.1" fill="currentColor" />
                    </svg>
                  </span>
                  <span className={revealed("min-w-0 flex-1")}>
                    <span className="block truncate text-xs font-medium text-ink">
                      {t.generation.gallery.sidebar}
                    </span>
                    <span className="block truncate text-[11px] text-ink-faint">
                      {t.generation.gallery.sidebarHint}
                    </span>
                  </span>
                </button>
              </div>
            </>
          ) : null}

          <RailSection label={t.studio.sidebarBlocks} />

          <div className="px-3">
            <button
              type="button"
              onClick={addGenerator}
              title={t.generation.node.sidebarHint}
              className="flex w-full items-center gap-3 rounded-lg py-1.5 text-left
                         transition-colors hover:bg-surface-hover"
            >
              <span
                aria-hidden
                className="flex size-8 shrink-0 items-center justify-center rounded-lg
                           border border-line bg-accent-soft text-ink-muted"
              >
                {/* The same glyph the block wears on the canvas: the rail is
                    where you learn what to look for out there. */}
                <NodeIcon kind="generator" className="size-3.5" />
              </span>
              <span className={revealed("min-w-0 flex-1")}>
                <span className="block truncate text-xs font-medium text-ink">
                  {t.generation.node.title}
                </span>
                <span className="block truncate text-[11px] text-ink-faint">
                  {t.generation.node.sidebarHint}
                </span>
              </span>
            </button>
          </div>

          <p className={onlyWhenOpen("mt-3 px-4 text-[11px] leading-relaxed text-ink-faint")}>
            {t.studio.sidebarComingSoon}
          </p>
        </div>
      </aside>

      {creating ? (
        <CharacterWizard
          onClose={() => setCreating(false)}
          // The card appears as soon as the character exists, not only at the
          // end: the wizard can be abandoned, and a draft character is a
          // legitimate state that must not be invisible.
          onCreated={(character) => addToCanvas(character.id)}
        />
      ) : null}
    </>
  );
}

/**
 * The Inputs shelf, as data.
 *
 * One entry per type, and adding the next three is three lines here plus a node
 * component — which is the point of the shelf being types rather than things.
 */
const INPUT_TYPES: readonly { kind: NodeKind; label: string; hint: string }[] = [
  {
    kind: "input-image",
    label: t.inputs.image.title,
    hint: t.inputs.sidebarHint,
  },
  {
    kind: "input-product",
    label: t.inputs.product.title,
    hint: t.inputs.sidebarHint,
  },
  {
    kind: "input-pose",
    label: t.inputs.pose.title,
    hint: t.inputs.sidebarHint,
  },
  {
    kind: "input-sheet",
    label: t.inputs.sheet.title,
    hint: t.inputs.sidebarHint,
  },
];

/**
 * Text that only exists once the rail is open. Kept in one place so every label
 * fades in together instead of each remembering its own set of classes.
 *
 * Only for text that sits **beside** something — a name next to a portrait, a
 * badge at the end of a row. It hides by opacity, so whatever it is applied to
 * keeps its size; on a line whose height comes from an icon that costs nothing,
 * and on a paragraph of its own it costs the paragraph's whole height. See
 * `onlyWhenOpen` and `RailSection` for the two cases where that matters.
 */
function revealed(className: string): string {
  return `${className} whitespace-nowrap opacity-0 transition-opacity duration-150
          group-hover:opacity-100 group-focus-within:opacity-100`;
}

/**
 * Block-level text that must take **no room at all** while the rail is shut.
 *
 * The difference from `revealed` is the whole of bug 1a. A paragraph faded to
 * zero opacity is still a paragraph: it keeps its height, and in a rail 56px
 * wide those invisible lines added up to a column of blank space between the
 * portraits and the input icons. A gap with no icon in it does not read as
 * "text you cannot see yet" — it reads as an item that is missing, which is
 * exactly what somebody who has just archived a character will conclude.
 *
 * `hidden` rather than a height animation on purpose: these two are a hint and
 * an empty state, and neither is worth making the icons below them slide.
 */
function onlyWhenOpen(className: string): string {
  return `${className} hidden group-hover:block group-focus-within:block`;
}

/**
 * The band that separates the sections of the rail — "Personagens", "Inputs",
 * "Blocos".
 *
 * The same height open or shut, which is the point: nothing below it moves when
 * the rail widens. What changes is what the band *is*. Open, it is the name of
 * the section; shut, it is a hairline — still a separator, still saying "a
 * different kind of thing starts here", in the 20 pixels a rail of icons can
 * afford. The title used to say it in both states and be invisible in one of
 * them, which is a gap doing the work of a divider without looking like one.
 */
function RailSection({ label, first = false }: { label: string; first?: boolean }) {
  return (
    <div className={`relative mb-1 flex h-5 items-center px-4 ${first ? "" : "mt-3"}`}>
      <span
        aria-hidden
        className="absolute inset-x-4 h-px bg-line transition-opacity duration-150
                   group-hover:opacity-0 group-focus-within:opacity-0"
      />

      {/* Above the hairline it replaces, so the two never overlap mid-fade. */}
      <span
        className={revealed(
          "relative text-[11px] font-medium uppercase tracking-wide text-ink-faint",
        )}
      >
        {label}
      </span>
    </div>
  );
}
