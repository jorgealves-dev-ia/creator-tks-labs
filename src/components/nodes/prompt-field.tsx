"use client";

import { useLayoutEffect, useRef, useState } from "react";

import { Portrait, VersionBadge } from "@/components/character-sheet/identity";
import {
  activeMentionQuery,
  applyMention,
  findMentions,
  type MentionQuery,
} from "@/lib/generation/mentions";
import { useEntitiesStore } from "@/lib/entities/store";
import { t } from "@/lib/i18n/pt-BR";

/**
 * The scene, in Portuguese, with `@` in it.
 *
 * Three things happen in one control, and the way they are layered is the whole
 * design:
 *
 *   a real textarea      — not a contenteditable. Undo, selection, accents and
 *                          IME all work because the browser is still doing them.
 *   a mirror behind it   — the same text, same font, same padding, painted
 *                          transparent except for a pill behind each mention.
 *                          That is the chip: it moves and wraps with the text
 *                          because it *is* the text, drawn twice.
 *   a suggestion list    — opened by `@`, closed by a space.
 *
 * The list offers characters that have a saved version, and shows the ones that
 * do not — greyed, with the sentence that fixes them. A character missing from a
 * list is a mystery; a character present and explained is an instruction (§5.2:
 * a mention never resolves to a draft).
 */

const copy = t.generation;

/**
 * Shared by the textarea and its mirror. Any difference in font, padding or line
 * height would show up as a pill sliding away from its word.
 */
const TEXT_LAYOUT =
  "w-full px-2.5 py-2 text-xs leading-relaxed font-sans whitespace-pre-wrap break-words";

type PromptFieldProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

export function PromptField({ id, value, onChange, disabled }: PromptFieldProps) {
  const characters = useEntitiesStore((state) => state.characters);
  const order = useEntitiesStore((state) => state.order);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mirrorRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState<MentionQuery | null>(null);
  /**
   * The keyboard selection, remembered together with the term it belongs to.
   *
   * Stored as a pair rather than reset by an effect: a highlight that survived a
   * change of term would point at a different character than the one under the
   * cursor, and deriving the answer makes that state unrepresentable instead of
   * merely corrected one render later.
   */
  const [highlight, setHighlight] = useState<{ term: string; index: number }>({
    term: "",
    index: 0,
  });
  /** Where to put the caret after a suggestion is accepted — see below. */
  const pendingCaret = useRef<number | null>(null);

  const suggestions = order
    .map((id) => characters[id])
    .filter((character) => character !== undefined)
    .filter((character) =>
      query === null ? true : character.handle.startsWith(query.term),
    )
    // Mentionable first: the ones that work are what the list is for, and the
    // rest are there to explain themselves.
    .sort((a, b) => Number(Boolean(b.activeVersion)) - Number(Boolean(a.activeVersion)))
    .slice(0, 6);

  const term = query?.term ?? "";
  const highlighted = highlight.term === term ? highlight.index : 0;

  /**
   * The caret has to be placed *after* the new text has rendered — setting it in
   * the handler would move it inside the old value, and React would then paint
   * over it. A ref rather than state because nothing here needs a re-render: the
   * DOM is being told something, not the interface.
   */
  useLayoutEffect(() => {
    const caret = pendingCaret.current;

    if (caret === null) return;

    pendingCaret.current = null;
    textareaRef.current?.setSelectionRange(caret, caret);
  });

  function syncQuery(element: HTMLTextAreaElement) {
    setQuery(activeMentionQuery(element.value, element.selectionStart ?? 0));
  }

  function moveHighlight(index: number) {
    setHighlight({ term, index });
  }

  function accept(handle: string) {
    if (!query) return;

    const next = applyMention(value, query, handle);

    onChange(next.text);
    setQuery(null);
    pendingCaret.current = next.caret;
    textareaRef.current?.focus();
  }

  const open = query !== null && suggestions.length > 0;

  return (
    <div className="relative">
      {/*
        The frame — border and background live here, not on the textarea.
        That is not cosmetic: an opaque textarea paints over the mirror behind it
        and the pills simply never appear. Found on screen, not in review.
      */}
      <div
        className="relative rounded-lg border border-line bg-surface transition-colors
                   hover:border-line-strong focus-within:border-accent"
      >
        {/* aria-hidden: the textarea already announces the text. This copy exists
            only to paint the pills, and a screen reader reading it would hear
            everything twice. */}
        <div
          ref={mirrorRef}
          aria-hidden
          className={`${TEXT_LAYOUT} pointer-events-none absolute inset-0 overflow-hidden
                      text-transparent`}
        >
          {highlightedSegments(value)}
          {/* A trailing newline is not rendered by a div; without this the mirror
              is one line shorter than the textarea and the two stop lining up. */}
          {"\n"}
        </div>

        <textarea
          ref={textareaRef}
          id={id}
          value={value}
          disabled={disabled}
          rows={3}
          spellCheck
          placeholder={copy.node.promptPlaceholder}
          onChange={(event) => {
            onChange(event.target.value);
            syncQuery(event.target);
          }}
          onKeyUp={(event) => syncQuery(event.currentTarget)}
          onClick={(event) => syncQuery(event.currentTarget)}
          onBlur={() => setQuery(null)}
          onScroll={(event) => {
            if (mirrorRef.current) {
              mirrorRef.current.scrollTop = event.currentTarget.scrollTop;
            }
          }}
          onKeyDown={(event) => {
            if (!open) return;

            if (event.key === "ArrowDown") {
              event.preventDefault();
              moveHighlight((highlighted + 1) % suggestions.length);
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              moveHighlight((highlighted - 1 + suggestions.length) % suggestions.length);
            } else if (event.key === "Enter" || event.key === "Tab") {
              const character = suggestions[highlighted];

              // Only a mentionable character can be accepted — pressing Enter on
              // one without a version would insert a mention the server refuses.
              if (character?.activeVersion) {
                event.preventDefault();
                accept(character.handle);
              }
            } else if (event.key === "Escape") {
              event.preventDefault();
              setQuery(null);
            }
          }}
          // nodrag keeps a text selection from panning the canvas; nowheel keeps
          // scrolling the box from zooming it.
          className={`${TEXT_LAYOUT} nodrag nowheel relative resize-none border-0
                      bg-transparent text-ink placeholder:text-ink-faint focus:outline-none
                      disabled:cursor-not-allowed disabled:opacity-60`}
        />
      </div>

      {open ? (
        <ul
          className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-lg
                     border border-line bg-surface-raised shadow-lg shadow-black/40"
        >
          <li className="px-2.5 pt-1.5 text-[10px] font-medium uppercase tracking-wide text-ink-faint">
            {copy.mention.title}
          </li>

          {suggestions.map((character, index) => {
            const mentionable = character.activeVersion !== null;

            return (
              <li key={character.id}>
                <button
                  type="button"
                  disabled={!mentionable}
                  title={mentionable ? undefined : copy.mention.noVersionTooltip}
                  // onMouseDown, not onClick: the textarea's blur would close the
                  // list before a click could land.
                  onMouseDown={(event) => {
                    event.preventDefault();
                    if (mentionable) accept(character.handle);
                  }}
                  onMouseEnter={() => moveHighlight(index)}
                  className={`flex w-full items-center gap-2 px-2.5 py-1.5 text-left transition-colors
                              ${index === highlighted && mentionable ? "bg-surface-hover" : ""}
                              ${mentionable ? "" : "cursor-not-allowed opacity-50"}`}
                >
                  <Portrait name={character.displayName} className="size-6" />

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs text-ink">
                      @{character.handle}
                    </span>
                    <span className="block truncate text-[10px] text-ink-faint">
                      {character.displayName}
                    </span>
                  </span>

                  {mentionable ? (
                    <VersionBadge versionNumber={character.activeVersion?.number ?? null} />
                  ) : (
                    <span className="shrink-0 text-[10px] text-ink-faint">
                      {copy.mention.noVersionSuffix}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

/**
 * The text split into plain runs and mentions, so the mirror can put a pill
 * behind each one. Uses the same parser the server resolves with — the pill and
 * the character that ends up in the image are one reading of the sentence, not
 * two.
 */
function highlightedSegments(text: string) {
  const mentions = findMentions(text);
  const segments: React.ReactNode[] = [];
  let cursor = 0;

  mentions.forEach((mention, index) => {
    if (mention.start > cursor) {
      segments.push(text.slice(cursor, mention.start));
    }

    segments.push(
      <span
        key={`${mention.start}-${index}`}
        className="rounded bg-accent/25 ring-1 ring-inset ring-accent/40"
      >
        {mention.raw}
      </span>,
    );

    cursor = mention.end;
  });

  if (cursor < text.length) {
    segments.push(text.slice(cursor));
  }

  return segments;
}
