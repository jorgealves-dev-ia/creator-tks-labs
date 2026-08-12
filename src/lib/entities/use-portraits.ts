"use client";

import { useEffect, useState } from "react";

import { signAssetUrls } from "@/lib/assets/actions";
import { useEntitiesStore } from "@/lib/entities/store";

/**
 * The face of every character that has one, by character id.
 *
 * ---------------------------------------------------------------------------
 * A ordem: avatar > folha congelada > iniciais (Etapa D2, Fase 3)
 * ---------------------------------------------------------------------------
 *
 * O **avatar** (`entities.cover_asset_id`) é uma sobreposição opcional, e a
 * palavra é exata: ele não substitui a folha, ele passa na frente dela. Remover
 * o avatar não deixa a personagem sem cara — devolve a folha, sem uma linha de
 * código para lembrar disso, porque o padrão continua sendo calculado aqui e
 * não copiado para lugar nenhum.
 *
 * Ele mora em `entities` e não em `entity_versions` de propósito: **avatar é
 * apresentação, não identidade.** Congelar uma v5 muda a folha que a menção
 * ancora e não muda a cara que a pessoa escolheu para reconhecê-la na lista.
 * As duas coisas mudam por motivos diferentes, então mudam em lugares
 * diferentes.
 *
 * Abaixo dele, a regra antiga continua valendo palavra por palavra:
 *
 * The complete sheet is the character's own picture — the thing the initials in
 * the sidebar were standing in for since the character screen was built.
 *
 * **Read from the frozen version, never from the draft**, and that is a fix
 * rather than a preference. `sheetAnchorSlots` has always taken the anchor of
 * an `@` from `activeVersion`, while this hook took the face from the draft —
 * so a character who generated a new sheet without saving a version showed one
 * folha in the rail and sent a different one to the model. Luna was in exactly
 * that state on 11/08/2026: `2c88aadb…` in the draft, `3027e537…` in the v3 the
 * mention actually resolves to. One image is the identity; two is a screen
 * disagreeing with the bill.
 *
 * It also turns the portrait into a state anyone can read at a glance: a face
 * means there is a frozen sheet to generate from, initials mean there is not —
 * either because nothing was ever saved as a version, or because the version
 * that was saved has no complete sheet yet. Both are honestly "not ready to be
 * mentioned as a picture", which is the only thing this mark can promise.
 *
 * Signed in one request for every character at once, and re-signed only when the
 * *set of images* changes — not when a name is edited or a field is typed. The
 * links expire in an hour, which outlasts any session anyone spends on a canvas.
 */
export function useCharacterPortraits(): Record<string, string> {
  const characters = useEntitiesStore((state) => state.characters);
  const [urls, setUrls] = useState<Record<string, string>>({});

  const pairs = Object.values(characters)
    .map(
      (character) =>
        [
          character.id,
          // O avatar primeiro; a folha da versão congelada quando não há avatar.
          // Uma imagem por personagem em qualquer caso, então o custo de
          // assinatura não muda com esta fase.
          character.coverAssetId ??
            character.activeVersion?.sheet.imagens_canonicas.folha_completa ??
            null,
        ] as const,
    )
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
