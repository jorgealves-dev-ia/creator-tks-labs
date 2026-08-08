"use client";

import { IMAGENS_CANONICAS_SLOTS } from "@/lib/character-sheet/dictionary";
import type { CharacterSheet } from "@/lib/character-sheet/schema";
import { t } from "@/lib/i18n/pt-BR";

type CanonicalImagesColumnProps = {
  sheet: CharacterSheet;
};

/**
 * The canonical images — the real anchor of the identity. Always visible, on all
 * three tabs, because they belong to the whole character rather than to a layer.
 *
 * Uploading them arrives in the next step; the column already shows the six
 * named slots so the shape of what is missing is visible from the start.
 */
export function CanonicalImagesColumn({ sheet }: CanonicalImagesColumnProps) {
  return (
    <aside className="flex w-64 shrink-0 flex-col border-l border-line bg-surface/60">
      <div className="border-b border-line px-4 py-3">
        <h3 className="text-sm font-medium text-ink">{t.characterSheet.editor.images.title}</h3>
        <p className="mt-0.5 text-xs text-ink-faint">
          {t.characterSheet.editor.images.subtitle}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 overflow-y-auto p-4">
        {IMAGENS_CANONICAS_SLOTS.map((slot) => {
          const assetId = sheet.imagens_canonicas[slot.key];

          return (
            <div key={slot.key}>
              <div
                className={`flex aspect-[3/4] items-center justify-center rounded-lg text-[11px]
                            ${
                              assetId
                                ? "border border-line bg-surface-raised text-ink-muted"
                                : "border border-dashed border-line text-ink-faint"
                            }`}
              >
                {assetId ? "•" : t.characterSheet.editor.images.emptySlot}
              </div>
              <p className="mt-1 text-center text-[11px] text-ink-muted">{slot.pt}</p>
            </div>
          );
        })}
      </div>

      <p className="mt-auto border-t border-line px-4 py-3 text-[11px] leading-relaxed text-ink-faint">
        {t.characterSheet.editor.images.comingSoon}
      </p>
    </aside>
  );
}
