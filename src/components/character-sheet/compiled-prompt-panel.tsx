"use client";

import { useMemo, useState } from "react";

import type { CharacterSheet } from "@/lib/character-sheet/schema";
import { pendingTranslations } from "@/lib/character-sheet/translation";
import { compilePrompt, type CompilationExclusions } from "@/lib/prompt/compile";
import { t } from "@/lib/i18n/pt-BR";

/**
 * "Prompt compilado" — the live preview of §3.4 of docs/geracao-canonica.md.
 *
 * It recompiles on every keystroke, which it can afford because the compiler is a
 * pure function over an object already in memory: no request, no debounce, no
 * cost. That is the whole reason §3.3 pushed translation to save time.
 *
 * Visible always, editable never. Editing a prompt happens in the generation
 * nodes; here, changing the prompt means changing a field — which is exactly what
 * keeps the closed lists closed.
 *
 * The honesty scoreboard is not decoration. A prompt you cannot audit is a prompt
 * you have to trust, and the point of the whole state system is that you never
 * have to: what was left out says so, and says why.
 */

type CompiledPromptPanelProps = {
  sheet: CharacterSheet;
  /** A frozen version is on screen — the preview compiles it, not the draft. */
  isVersion: boolean;
};

export function CompiledPromptPanel({ sheet, isVersion }: CompiledPromptPanelProps) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"text" | "structure">("text");
  const [copied, setCopied] = useState(false);

  const compiled = useMemo(() => compilePrompt(sheet), [sheet]);
  const awaiting = useMemo(() => pendingTranslations(sheet).length, [sheet]);

  const copy = t.characterSheet.compiled;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(
        view === "text" ? compiled.text : JSON.stringify(compiled.structure, null, 2),
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // A blocked clipboard is not worth an error message: the text is on screen
      // and selectable, which is the fallback the platform already provides.
    }
  }

  return (
    <section className="shrink-0 border-t border-line bg-surface/60">
      <div className="flex items-center gap-3 px-6 py-2">
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
          className="flex items-center gap-1.5 text-xs font-medium text-ink-muted
                     transition-colors hover:text-ink"
        >
          <svg
            viewBox="0 0 10 10"
            className={`size-2.5 transition-transform ${open ? "rotate-90" : ""}`}
            aria-hidden
          >
            <path d="M3 1l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.5" />
          </svg>
          {copy.title}
        </button>

        {awaiting > 0 ? (
          <span
            title={copy.translatingTooltip}
            className="rounded bg-accent-soft px-1.5 py-0.5 text-[11px] text-ink-muted"
          >
            {copy.translating}
          </span>
        ) : null}

        <p className="ml-auto truncate text-[11px] text-ink-faint">
          {exclusionsLine(compiled.exclusions, awaiting)}
        </p>
      </div>

      {open ? (
        <div className="border-t border-line px-6 py-3">
          <div className="mb-2 flex items-center gap-2">
            {(
              [
                ["text", copy.viewText],
                ["structure", copy.viewStructure],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                aria-pressed={view === id}
                onClick={() => setView(id)}
                className={`rounded-lg px-2 py-1 text-[11px] transition-colors ${
                  view === id
                    ? "bg-accent-soft text-ink"
                    : "text-ink-faint hover:text-ink"
                }`}
              >
                {label}
              </button>
            ))}

            <button
              type="button"
              onClick={() => void handleCopy()}
              disabled={compiled.text === ""}
              className="ml-auto rounded-lg px-2 py-1 text-[11px] text-ink-faint
                         transition-colors hover:text-ink
                         disabled:cursor-not-allowed disabled:opacity-40"
            >
              {copied ? copy.copied : copy.copy}
            </button>
          </div>

          {isVersion ? (
            <p className="mb-2 text-[11px] text-ink-faint">{copy.versionNotice}</p>
          ) : null}

          {compiled.text === "" ? (
            <p className="py-2 text-xs text-ink-faint">{copy.empty}</p>
          ) : (
            <pre
              className="max-h-44 overflow-auto rounded-lg border border-line bg-canvas px-3 py-2
                         font-mono text-[11px] leading-relaxed text-ink-muted
                         whitespace-pre-wrap break-words"
            >
              {view === "text" ? compiled.text : JSON.stringify(compiled.structure, null, 2)}
            </pre>
          )}

          <p className="mt-2 text-[11px] leading-relaxed text-ink-faint">{copy.subtitle}</p>
        </div>
      ) : null}
    </section>
  );
}

/**
 * The scoreboard of §3.4, in the words the specification used: "não entram: 3
 * inferidos aguardando confirmação, 9 em branco".
 *
 * `awaiting` is counted from the sheet rather than taken from the compiler's own
 * tally: the compiler only counts the fragments it actually tried to read, and a
 * field left out for being inferred also has a detail nobody will translate. The
 * number the user needs is "how much free text is still without English", which
 * is a property of the sheet.
 */
function exclusionsLine(exclusions: CompilationExclusions, awaiting: number): string {
  const words = t.characterSheet.compiled.excluded;
  const parts: string[] = [];

  if (exclusions.inferidos > 0) {
    parts.push(
      exclusions.inferidos === 1
        ? words.inferidosOne
        : `${exclusions.inferidos}${words.inferidosSuffix}`,
    );
  }

  if (exclusions.vazios > 0) {
    parts.push(
      exclusions.vazios === 1 ? words.vaziosOne : `${exclusions.vazios}${words.vaziosSuffix}`,
    );
  }

  if (awaiting > 0) {
    parts.push(awaiting === 1 ? words.traducaoOne : `${awaiting}${words.traducaoSuffix}`);
  }

  if (exclusions.temNotasGerais) {
    parts.push(words.notas);
  }

  return parts.length === 0 ? words.none : `${words.prefix} ${parts.join(", ")}`;
}
