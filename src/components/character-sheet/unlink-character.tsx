"use client";

import { useState } from "react";

import { useCanvasStore } from "@/lib/canvas/store";
import { unlinkCharacterFromProject } from "@/lib/entities/actions";
import { useEntitiesStore } from "@/lib/entities/store";
import { findMentions } from "@/lib/generation/mentions";
import { t } from "@/lib/i18n/pt-BR";

/**
 * "Tirar deste projeto" — Etapa D2, item 2.4.
 *
 * ---------------------------------------------------------------------------
 * Duas ações, dois pesos, duas UIs
 * ---------------------------------------------------------------------------
 *
 * O irmão deste componente é `ArchiveCharacter`, e a diferença entre os dois é
 * a tese da etapa. Arquivar é global e não se desfaz pela tela: mora no editor,
 * em vermelho, com dois painéis. Desvincular é local e se desfaz com um clique:
 * mora na linha do trilho, sem vermelho, e o texto diz que é reversível.
 *
 * Apresentar as duas com a mesma cara faria a ação leve parecer a pesada — e o
 * custo disso não é estético. Uma pessoa que hesita em desvincular por achar
 * que vai perder a personagem simplesmente não usa o escopo por projeto, e a
 * etapa inteira vira uma tabela que ninguém preenche.
 *
 * ---------------------------------------------------------------------------
 * O diálogo conta, e só conta o que existe
 * ---------------------------------------------------------------------------
 *
 * A varredura do canvas é local e barata — `findMentions` é a mesma função pura
 * que o servidor usa para ler o `@`, então o número que aparece aqui e a menção
 * que o servidor recusa são uma leitura só da mesma frase.
 *
 * E a linha só aparece quando há o que contar. "0 cartões e 0 blocos" é ruído
 * com cara de aviso: ensina a ignorar a frase justamente nas vezes em que ela
 * traz um número que importa.
 */

const copy = t.characterSheet.unlink;

export function UnlinkCharacter({
  entityId,
  handle,
  onDone,
}: {
  entityId: string;
  handle: string;
  onDone: () => void;
}) {
  const projectId = useCanvasStore((state) => state.projectId);
  const nodes = useCanvasStore((state) => state.nodes);
  const unlink = useEntitiesStore((state) => state.unlink);

  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const cards = nodes.filter((node) => node.data.entityId === entityId).length;

  const mentions = nodes.filter((node) => {
    const prompt = node.data.prompt;

    if (typeof prompt !== "string") return false;

    return findMentions(prompt).some((mention) => mention.handle === handle);
  }).length;

  async function confirm() {
    if (!projectId) return;

    setBusy(true);
    setFailed(false);

    const result = await unlinkCharacterFromProject({ entityId, projectId });

    if (!result.ok) {
      setBusy(false);
      setFailed(true);
      return;
    }

    // Só o vínculo. A personagem continua na store — é do usuário, e é
    // justamente por continuar lá que o cartão dela sabe dizer "não vinculada"
    // em vez de "não encontrada".
    unlink(entityId);
    onDone();
  }

  return (
    <div
      role="alertdialog"
      aria-label={copy.title}
      className="absolute left-3 top-3 z-30 w-80 rounded-xl border border-line
                 bg-surface-raised p-3 shadow-2xl shadow-black/50"
    >
      <p className="text-xs font-medium text-ink">{copy.title}</p>

      <div className="mt-2 rounded-lg border border-line bg-surface p-2">
        <p className="text-[10px] font-medium uppercase tracking-wide text-ink-faint">
          {copy.changesTitle}
        </p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-ink-muted">
          {copy.changes.replaceAll("{handle}", handle)}
        </p>
      </div>

      <div className="mt-1.5 rounded-lg border border-line bg-surface p-2">
        <p className="text-[10px] font-medium uppercase tracking-wide text-ink-faint">
          {copy.keptTitle}
        </p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-ink-muted">{copy.kept}</p>
      </div>

      {cards > 0 || mentions > 0 ? (
        <p className="mt-1.5 text-[11px] leading-relaxed text-warning">
          {copy.inUsePrefix}{" "}
          {cards > 0 ? `${cards} ${copy.inUseCards}` : null}
          {cards > 0 && mentions > 0 ? ", " : null}
          {mentions > 0 ? `${mentions} ${copy.inUseMentions.replaceAll("{handle}", handle)}` : null}
          . {copy.inUseSuffix}
        </p>
      ) : null}

      <p className="mt-1.5 text-[10px] leading-relaxed text-ink-faint">{copy.reversible}</p>

      {failed ? (
        <p className="mt-1.5 text-[10px] leading-relaxed text-warning">{copy.failed}</p>
      ) : null}

      <div className="mt-2.5 flex items-center justify-end gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={onDone}
          autoFocus
          className="rounded-lg px-2.5 py-1 text-[11px] text-ink-muted transition-colors
                     hover:bg-surface-hover hover:text-ink disabled:opacity-50"
        >
          {copy.cancel}
        </button>

        <button
          type="button"
          disabled={busy || !projectId}
          onClick={() => void confirm()}
          className="rounded-lg border border-line-strong px-2.5 py-1 text-[11px] font-medium
                     text-ink transition-colors hover:bg-surface-hover disabled:opacity-50"
        >
          {busy ? copy.working : copy.confirm}
        </button>
      </div>
    </div>
  );
}
