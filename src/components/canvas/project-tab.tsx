"use client";

import Link from "next/link";
import { useRef, useState } from "react";

import { t } from "@/lib/i18n/pt-BR";
import { deleteProject, renameProject } from "@/lib/projects/actions";
import type { Enums } from "@/lib/supabase/database.types";

export type ProjectTabData = {
  id: string;
  name: string;
  status: Enums<"project_status">;
};

const STATUS_DOT: Record<Enums<"project_status">, string> = {
  idle: "bg-ink-faint",
  generating: "bg-warning",
  generated: "bg-positive",
  error: "bg-negative",
};

type TabMode = "idle" | "renaming" | "confirming-delete";

export function ProjectTab({
  project,
  isActive,
}: {
  project: ProjectTabData;
  isActive: boolean;
}) {
  const [mode, setMode] = useState<TabMode>("idle");
  const formRef = useRef<HTMLFormElement>(null);

  if (mode === "renaming") {
    return (
      <form
        ref={formRef}
        action={renameProject}
        onSubmit={() => setMode("idle")}
        className="shrink-0"
      >
        <input type="hidden" name="projectId" value={project.id} />
        <input
          name="name"
          defaultValue={project.name}
          autoFocus
          maxLength={80}
          aria-label={t.studio.renameProject}
          onBlur={() => formRef.current?.requestSubmit()}
          onKeyDown={(event) => {
            if (event.key === "Escape") setMode("idle");
          }}
          className="h-8 w-36 rounded-lg border border-accent bg-surface-raised px-2.5
                     text-sm text-ink focus:outline-none"
        />
      </form>
    );
  }

  if (mode === "confirming-delete") {
    return (
      <div className="flex h-8 shrink-0 items-center gap-1 rounded-lg border border-negative/50 bg-negative/10 pl-2.5 pr-1">
        <span className="text-xs text-ink-muted">Excluir?</span>
        <form action={deleteProject} className="flex">
          <input type="hidden" name="projectId" value={project.id} />
          <button
            type="submit"
            aria-label={t.studio.deleteProject}
            className="rounded px-1.5 text-xs text-negative hover:bg-negative/20"
          >
            Sim
          </button>
        </form>
        <button
          type="button"
          onClick={() => setMode("idle")}
          className="rounded px-1.5 text-xs text-ink-muted hover:bg-surface-hover"
        >
          Não
        </button>
      </div>
    );
  }

  return (
    <div
      className={`group flex h-8 shrink-0 items-center rounded-lg border pl-2.5 pr-1 transition-colors ${
        isActive
          ? "border-line-strong bg-surface-raised"
          : "border-transparent hover:bg-surface-hover"
      }`}
    >
      <StatusDot status={project.status} />

      <Link
        href={`/studio?p=${project.id}`}
        onDoubleClick={(event) => {
          event.preventDefault();
          setMode("renaming");
        }}
        title={project.name}
        aria-current={isActive ? "page" : undefined}
        className={`max-w-40 truncate px-2 text-sm ${
          isActive ? "text-ink" : "text-ink-muted"
        }`}
      >
        {project.name}
      </Link>

      <button
        type="button"
        onClick={() => setMode("confirming-delete")}
        aria-label={`${t.studio.deleteProject}: ${project.name}`}
        className="rounded p-1 text-ink-faint opacity-0 transition-opacity
                   hover:bg-surface-hover hover:text-ink
                   group-hover:opacity-100 focus-visible:opacity-100"
      >
        <svg viewBox="0 0 12 12" className="size-3" aria-hidden>
          <path
            d="M3 3l6 6M9 3l-6 6"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  );
}

function StatusDot({ status }: { status: Enums<"project_status"> }) {
  return (
    <span
      className="relative flex size-1.5 shrink-0"
      title={t.studio.status[status]}
    >
      {status === "generating" ? (
        <span
          className={`absolute inline-flex size-full animate-ping rounded-full ${STATUS_DOT[status]} opacity-75`}
          aria-hidden
        />
      ) : null}
      <span
        className={`relative inline-flex size-1.5 rounded-full ${STATUS_DOT[status]}`}
      />
      <span className="sr-only">{t.studio.status[status]}</span>
    </span>
  );
}
