"use client";

import Link from "next/link";
import { useRef, useState } from "react";

import { formatDay } from "@/lib/format/date";
import { t } from "@/lib/i18n/pt-BR";
import { deleteProject, renameProject } from "@/lib/projects/actions";
import type { ProjectCard as ProjectCardData } from "@/lib/projects/queries";

const copy = t.dashboard.card;

/**
 * Um projeto, como cartão.
 *
 * O cartão inteiro é o link — não um botão "abrir" dentro dele. Num vestíbulo,
 * a coisa que se faz com um projeto é entrar nele; exigir mira num alvo pequeno
 * seria cobrar precisão pela ação óbvia. Renomear e excluir são as ações que
 * **não** são óbvias, e por isso aparecem no hover, pequenas, no canto — o mesmo
 * gesto que a aba do canvas já ensinou.
 *
 * A capa é a geração bem-sucedida mais recente. Uma imagem responde "o que é
 * este projeto?" antes de qualquer nome que alguém tenha digitado às pressas —
 * e "Projeto sem título 3" com a foto da Luna dentro é reconhecível, enquanto
 * "Projeto sem título 3" sozinho não é.
 *
 * ---------------------------------------------------------------------------
 * Por que os botões são irmãos do link, e não filhos dele
 * ---------------------------------------------------------------------------
 *
 * Um `<button>` dentro de um `<a>` é HTML inválido, e o navegador resolve o
 * conflito do jeito dele: em alguns, clicar no botão navega também. Os controles
 * ficam **ao lado** do link, posicionados por cima dele — assim o cartão inteiro
 * continua clicável e os dois cliques nunca disputam o mesmo gesto.
 */
type CardMode = "idle" | "renaming" | "confirming-delete";

export function ProjectCard({ project }: { project: ProjectCardData }) {
  const [mode, setMode] = useState<CardMode>("idle");

  const body = (
    <>
      <div className="relative aspect-video overflow-hidden bg-canvas">
        {project.coverUrl ? (
          /* URL assinada de vida curta, de um bucket privado. */
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={project.coverUrl}
            alt=""
            className="size-full object-cover transition-transform duration-300
                       group-hover:scale-[1.02]"
          />
        ) : (
          <EmptyCover />
        )}
      </div>

      <div className="p-4">
        {mode === "renaming" ? (
          <RenameForm project={project} onDone={() => setMode("idle")} />
        ) : (
          <p className="truncate text-sm font-medium text-ink">{project.name}</p>
        )}

        <p className="mt-1 text-[11px] text-ink-faint">
          <Count value={project.imageCount} one={copy.imageOne} many={copy.imageMany} />
          {" · "}
          <Count
            value={project.characterCount}
            one={copy.characterOne}
            many={copy.characterMany}
          />
        </p>

        <p className="mt-2 text-[11px] text-ink-faint">
          {copy.lastActivity} {formatDay(project.lastActivityAt)}
        </p>
      </div>
    </>
  );

  const frame =
    "block overflow-hidden rounded-xl border border-line bg-surface transition-colors";

  return (
    <div className="group relative">
      {/* Enquanto se renomeia o cartão deixa de ser link: um clique no campo de
          texto não pode virar navegação no meio de uma palavra. */}
      {mode === "renaming" ? (
        <div className={`${frame} border-accent`}>{body}</div>
      ) : (
        <Link
          href={`/studio?p=${project.id}`}
          title={t.dashboard.openHint}
          className={`${frame} hover:border-line-strong hover:bg-surface-hover`}
        >
          {body}
        </Link>
      )}

      {mode === "idle" ? (
        <div
          className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity
                     group-hover:opacity-100 group-focus-within:opacity-100"
        >
          <IconButton
            label={`${copy.rename}: ${project.name}`}
            onClick={() => setMode("renaming")}
          >
            <path
              d="M2.5 9.5l7-7 2 2-7 7-2.5.5.5-2.5z"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinejoin="round"
              fill="none"
            />
          </IconButton>

          <IconButton
            label={`${copy.remove.action}: ${project.name}`}
            onClick={() => setMode("confirming-delete")}
            danger
          >
            <path
              d="M3.5 3.5l7 7M10.5 3.5l-7 7"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </IconButton>
        </div>
      ) : null}

      {mode === "confirming-delete" ? (
        <ConfirmDelete project={project} onCancel={() => setMode("idle")} />
      ) : null}
    </div>
  );
}

/**
 * O nome, editável no lugar.
 *
 * `onBlur` submete e `Escape` cancela — as mesmas teclas da aba do canvas, para
 * que renomear signifique a mesma coisa nas duas telas. Quem aprendeu numa não
 * precisa reaprender na outra.
 */
function RenameForm({
  project,
  onDone,
}: {
  project: ProjectCardData;
  onDone: () => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={renameProject} onSubmit={onDone}>
      <input type="hidden" name="projectId" value={project.id} />
      <input
        name="name"
        defaultValue={project.name}
        autoFocus
        maxLength={80}
        aria-label={copy.rename}
        onBlur={() => formRef.current?.requestSubmit()}
        onKeyDown={(event) => {
          if (event.key === "Escape") onDone();
        }}
        className="w-full rounded-lg border border-accent bg-surface-raised px-2 py-1
                   text-sm text-ink focus:outline-none"
      />
      <p className="mt-1 text-[10px] text-ink-faint">{copy.renameHint}</p>
    </form>
  );
}

/**
 * A confirmação que diz o que fica.
 *
 * Duas metades, como no diálogo da personagem e pelo mesmo motivo: a palavra
 * "excluir" faz qualquer pessoa supor que as imagens vão junto — e elas não vão.
 * Uma confirmação que só pergunta "tem certeza?" testa coragem; uma que diz o
 * que se perde **e o que fica** testa entendimento, que é a única coisa que vale
 * testar antes de um gesto que a interface não desfaz.
 *
 * O `from` no formulário é o que mantém quem excluiu aqui **aqui**: o cartão
 * some, a lista continua, e ninguém é levado para o canvas de um projeto que não
 * pediu para abrir.
 */
function ConfirmDelete({
  project,
  onCancel,
}: {
  project: ProjectCardData;
  onCancel: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const remove = copy.remove;

  return (
    <div
      role="alertdialog"
      aria-label={remove.title}
      className="absolute inset-0 z-10 flex flex-col overflow-y-auto rounded-xl
                 border border-negative/40 bg-surface p-3 shadow-2xl shadow-black/50"
    >
      <p className="text-xs font-medium text-ink">{remove.title}</p>

      <div className="mt-2 rounded-lg border border-negative/40 bg-negative/5 p-2">
        <p className="text-[10px] font-medium uppercase tracking-wide text-negative">
          {remove.lostTitle}
        </p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-ink-muted">{remove.lost}</p>
      </div>

      <div className="mt-1.5 rounded-lg border border-line bg-surface-raised p-2">
        <p className="text-[10px] font-medium uppercase tracking-wide text-ink-faint">
          {remove.keptTitle}
        </p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-ink-muted">{remove.kept}</p>
      </div>

      <p className="mt-1.5 text-[10px] leading-relaxed text-ink-faint">
        {remove.irreversible}
      </p>

      <form
        action={deleteProject}
        onSubmit={() => setBusy(true)}
        className="mt-auto flex items-center justify-end gap-2 pt-2.5"
      >
        <input type="hidden" name="projectId" value={project.id} />
        <input type="hidden" name="from" value="dashboard" />

        <button
          type="button"
          disabled={busy}
          onClick={onCancel}
          autoFocus
          className="rounded-lg px-2.5 py-1 text-[11px] text-ink-muted transition-colors
                     hover:bg-surface-hover hover:text-ink disabled:opacity-50"
        >
          {remove.cancel}
        </button>

        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-negative px-2.5 py-1 text-[11px] font-medium text-white
                     transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {busy ? remove.working : remove.confirm}
        </button>
      </form>
    </div>
  );
}

/** Os controles do canto: pequenos, e só quando a pessoa se aproxima do cartão. */
function IconButton({
  label,
  onClick,
  danger = false,
  children,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex size-6 items-center justify-center rounded-lg border border-line
                  bg-surface/90 text-ink-muted backdrop-blur transition-colors
                  hover:border-line-strong ${
                    danger ? "hover:text-negative" : "hover:text-ink"
                  }`}
    >
      <svg viewBox="0 0 14 14" className="size-3" aria-hidden>
        {children}
      </svg>
    </button>
  );
}

/**
 * A moldura de um projeto que ainda não gerou nada.
 *
 * Quieta de propósito: um traço e uma frase, na mesma proporção da capa que vai
 * ocupar o lugar dela. Sem ícone de erro, sem cinza de "faltando" — o vazio de
 * um projeto novo é o estado correto dele, e a tela que trata isso como falha
 * ensina a pessoa a se sentir atrasada no primeiro minuto.
 */
function EmptyCover() {
  return (
    <div className="flex size-full items-center justify-center bg-surface-raised/40">
      <div className="text-center">
        <svg
          viewBox="0 0 24 24"
          className="mx-auto size-6 text-line-strong"
          fill="none"
          aria-hidden
        >
          <rect
            x="3"
            y="5"
            width="18"
            height="14"
            rx="2"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <circle cx="8.5" cy="10" r="1.5" fill="currentColor" />
          <path
            d="M3 16l4.5-4 4 3.5L15 12l6 5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <p className="mt-1.5 text-[11px] text-ink-faint">{copy.noCover}</p>
      </div>
    </div>
  );
}

/** `1 imagem` / `12 imagens` — o plural do português, sem biblioteca. */
function Count({ value, one, many }: { value: number; one: string; many: string }) {
  return (
    <span className="tabular-nums">
      {value} {value === 1 ? one : many}
    </span>
  );
}
