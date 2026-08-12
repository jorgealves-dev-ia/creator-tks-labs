"use client";

import { useState } from "react";

import { Portrait } from "@/components/character-sheet/identity";
import { useReferencePicker } from "@/lib/canvas/reference-picker-store";
import { setCharacterAvatar } from "@/lib/entities/actions";
import { useEntitiesStore } from "@/lib/entities/store";
import { useCharacterPortraits } from "@/lib/entities/use-portraits";
import { t } from "@/lib/i18n/pt-BR";

/**
 * O retrato do editor, e o botão que o troca — Etapa D2, Fase 3.
 *
 * ---------------------------------------------------------------------------
 * Reusa o seletor de referências, e isso não é economia de código
 * ---------------------------------------------------------------------------
 *
 * O que a foto de perfil precisa é literalmente o que aquele modal já faz:
 * "envie um arquivo, ou pegue algo que você já tem". Escrever um segundo
 * seletor daria um segundo lugar para "10 MB" e "precisa ser imagem"
 * divergirem — que é exatamente o motivo pelo qual o editor de produto passou a
 * usar o mesmo modal em vez de ganhar o seu.
 *
 * O escopo `avatar` tem teto 1, e o modal explica esse teto sozinho.
 *
 * ---------------------------------------------------------------------------
 * Sobreposição, e a tela diz isso
 * ---------------------------------------------------------------------------
 *
 * "Remover foto de perfil" vem com "Volta para a folha da versão ativa" ao
 * lado. A frase existe porque **remover não deixa a personagem sem cara**, e um
 * botão de remover que não diz para onde a coisa volta é lido como perda. O que
 * o botão faz é gravar `null`; quem decide o retrato continua sendo o hook, na
 * ordem avatar > folha > iniciais.
 */

const copy = t.characterSheet.avatar;

export function AvatarPicker({ entityId }: { entityId: string }) {
  const character = useEntitiesStore((state) => state.characters[entityId]);
  const setAvatar = useEntitiesStore((state) => state.setAvatar);
  const portraits = useCharacterPortraits();

  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  if (!character) return null;

  const hasAvatar = character.coverAssetId !== null;

  async function save(assetId: string | null) {
    setBusy(true);
    setFailed(false);

    const result = await setCharacterAvatar({ entityId, assetId });

    setBusy(false);

    if (!result.ok) {
      setFailed(true);
      return;
    }

    // O valor que o servidor confirmou ter gravado, não o que pedimos — a
    // diferença só apareceria num bug, e é justamente aí que ela importa.
    setAvatar(entityId, result.assetId);
  }

  function open() {
    useReferencePicker.getState().open({
      key: `avatar:${entityId}`,
      scope: "avatar",
      remaining: 1,
      limit: 1,
      onConfirm: (picked) => {
        const first = picked[0];
        if (first) void save(first.assetId);
      },
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Portrait name={character.displayName} src={portraits[entityId]} />

      <div className="flex flex-col items-start gap-0.5">
        <button
          type="button"
          disabled={busy}
          onClick={open}
          className="rounded-lg px-1.5 py-0.5 text-[11px] text-ink-muted transition-colors
                     hover:bg-surface-hover hover:text-ink disabled:opacity-50"
        >
          {busy ? copy.saving : hasAvatar ? copy.change : copy.choose}
        </button>

        {hasAvatar ? (
          <button
            type="button"
            disabled={busy}
            title={copy.removeHint}
            onClick={() => void save(null)}
            className="rounded-lg px-1.5 py-0.5 text-[10px] text-ink-faint transition-colors
                       hover:bg-surface-hover hover:text-ink disabled:opacity-50"
          >
            {copy.remove}
          </button>
        ) : null}

        {failed ? <span className="px-1.5 text-[10px] text-warning">{copy.failed}</span> : null}
      </div>
    </div>
  );
}
