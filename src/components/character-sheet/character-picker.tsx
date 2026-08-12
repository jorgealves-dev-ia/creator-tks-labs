"use client";

import { useEffect, useState } from "react";

import { Portrait, VersionBadge } from "@/components/character-sheet/identity";
import { linkCharacterToProject } from "@/lib/entities/actions";
import { useEntitiesStore } from "@/lib/entities/store";
import { useCharacterPortraits } from "@/lib/entities/use-portraits";
import { t } from "@/lib/i18n/pt-BR";

/**
 * "Adicionar existente" — a galeria de personagens do usuário (Etapa D2, 1.4).
 *
 * É a porta que faz a tese da etapa ser verdade na prática. Sem ela, um projeto
 * novo só poderia receber personagens novas, e a personagem voltaria a ser do
 * projeto por falta de caminho — que é precisamente o que esta etapa desfaz.
 *
 * ---------------------------------------------------------------------------
 * Por que não lê nada do servidor
 * ---------------------------------------------------------------------------
 *
 * A lista já está no navegador: `characters` é a lista do **usuário** e foi
 * semeada no carregamento da página, exatamente porque a personagem não é do
 * projeto. Buscar de novo aqui produziria uma segunda cópia da mesma pessoa
 * para as duas telas discordarem sobre qual está certa — e um estado de
 * carregamento para uma resposta que já está na memória.
 *
 * As arquivadas não aparecem porque `loadCharacters` não as trouxe. É a ordem
 * certa: quem decide o que existe é a consulta, não esta grade.
 */

const copy = t.characterSheet.picker;

export function CharacterPicker({
  projectId,
  onClose,
}: {
  projectId: string;
  onClose: () => void;
}) {
  const characters = useEntitiesStore((state) => state.characters);
  const order = useEntitiesStore((state) => state.order);
  const linkedIds = useEntitiesStore((state) => state.linkedIds);
  const link = useEntitiesStore((state) => state.link);
  const portraits = useCharacterPortraits();

  /** Quem está sendo vinculada agora, para a linha dela dizer isso. */
  const [busyId, setBusyId] = useState<string | null>(null);
  const [failedId, setFailedId] = useState<string | null>(null);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  /**
   * Todas, e não só as que faltam.
   *
   * As já vinculadas ficam na grade, marcadas e sem ação — porque a pergunta que
   * traz alguém aqui é "quem está neste projeto?" tanto quanto "quem falta?", e
   * uma lista que esconde metade da resposta obriga a fechar o modal para
   * conferir o trilho.
   */
  const rows = order
    .map((id) => characters[id])
    .filter((character) => character !== undefined);

  const nothingToAdd = rows.length > 0 && rows.every((character) => linkedIds.has(character.id));

  async function add(entityId: string) {
    setBusyId(entityId);
    setFailedId(null);

    const result = await linkCharacterToProject({ entityId, projectId });

    setBusyId(null);

    if (!result.ok) {
      setFailedId(entityId);
      return;
    }

    // Só depois da confirmação do servidor. O otimismo aqui poria alguém no
    // trilho que o próximo carregamento não encontraria.
    link(entityId);
  }

  return (
    <div
      role="dialog"
      aria-modal
      aria-label={copy.title}
      className="fixed inset-0 z-50 flex items-center justify-center bg-canvas/80 p-6 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="flex h-[32rem] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-2xl shadow-black/50">
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <div>
            <h2 className="text-sm font-medium text-ink">{copy.title}</h2>
            <p className="mt-0.5 text-[11px] text-ink-faint">{copy.subtitle}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={copy.close}
            className="rounded-lg px-2 py-1 text-xs text-ink-faint transition-colors hover:bg-surface-hover hover:text-ink"
          >
            ✕
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {rows.length === 0 ? (
            <div className="max-w-sm">
              <p className="text-xs text-ink-muted">{copy.empty}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-ink-faint">{copy.emptyHint}</p>
            </div>
          ) : (
            <>
              {nothingToAdd ? (
                <div className="mb-4 max-w-sm">
                  <p className="text-xs text-ink-muted">{copy.allLinked}</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-ink-faint">
                    {copy.allLinkedHint}
                  </p>
                </div>
              ) : null}

              <ul className="flex flex-col gap-1">
                {rows.map((character) => {
                  const isLinked = linkedIds.has(character.id);
                  const busy = busyId === character.id;

                  return (
                    <li
                      key={character.id}
                      className="flex items-center gap-3 rounded-lg border border-line
                                 bg-surface-raised px-3 py-2"
                    >
                      <Portrait
                        name={character.displayName}
                        src={portraits[character.id]}
                        className="size-9"
                      />

                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-medium text-ink">
                          {character.displayName}
                        </span>
                        <span className="block truncate text-[11px] text-ink-faint">
                          @{character.handle}
                        </span>
                      </span>

                      <VersionBadge versionNumber={character.activeVersion?.number ?? null} />

                      {isLinked ? (
                        <span className="shrink-0 rounded-md bg-positive/15 px-2 py-1 text-[11px] font-medium text-positive">
                          {copy.linked}
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void add(character.id)}
                          className="shrink-0 rounded-lg bg-accent px-3 py-1 text-[11px] font-medium
                                     text-canvas transition-colors hover:bg-accent-hover
                                     disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {busy ? copy.adding : copy.add}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>

              {failedId ? (
                <p className="mt-3 text-[11px] leading-relaxed text-warning">{copy.failed}</p>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
