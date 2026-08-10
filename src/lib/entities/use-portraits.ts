"use client";

import { useEffect, useState } from "react";

import { signAssetUrls } from "@/lib/assets/actions";
import { useEntitiesStore } from "@/lib/entities/store";

/**
 * The face of every character that has one, by character id.
 *
 * The complete sheet is the character's own picture — the thing the initials in
 * the sidebar were standing in for since the character screen was built. It
 * lives in the draft's `imagens_canonicas`, so it updates the moment a new sheet
 * is generated, without anything having to remember to refresh it.
 *
 * Signed in one request for every character at once, and re-signed only when the
 * *set of images* changes — not when a name is edited or a field is typed. The
 * links expire in an hour, which outlasts any session anyone spends on a canvas.
 */
export function useCharacterPortraits(): Record<string, string> {
  const characters = useEntitiesStore((state) => state.characters);
  const [urls, setUrls] = useState<Record<string, string>>({});

  const pairs = Object.values(characters)
    .map((character) => [character.id, character.sheet.imagens_canonicas.folha_completa] as const)
    .filter((pair): pair is readonly [string, string] => pair[1] !== null);

  // The dependency is the content, not the object: the store hands back a new
  // `characters` record on every keystroke of the sheet editor.
  const key = pairs.map(([id, assetId]) => `${id}:${assetId}`).join(",");

  useEffect(() => {
    if (pairs.length === 0) return;

    let cancelled = false;

    void signAssetUrls(pairs.map(([, assetId]) => assetId)).then((signed) => {
      if (cancelled) return;

      setUrls(
        Object.fromEntries(
          pairs
            .map(([id, assetId]) => [id, signed[assetId]] as const)
            .filter((entry): entry is readonly [string, string] => typeof entry[1] === "string"),
        ),
      );
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return urls;
}
