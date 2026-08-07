"use client";

import { signOut } from "@/lib/auth/actions";
import { t } from "@/lib/i18n/pt-BR";
import { createProject } from "@/lib/projects/actions";
import { formatBRL, formatSparks } from "@/lib/sparks";

import { ProjectTab, type ProjectTabData } from "./project-tab";
import { SaveIndicator } from "./save-indicator";

type StudioHeaderProps = {
  projects: ProjectTabData[];
  activeProjectId: string | null;
  balanceCents: number;
};

/**
 * Floats above the canvas rather than sitting in a layout row, so the canvas
 * keeps the full viewport underneath it.
 */
export function StudioHeader({
  projects,
  activeProjectId,
  balanceCents,
}: StudioHeaderProps) {
  return (
    <header
      className="absolute inset-x-3 top-3 z-20 flex h-14 items-center gap-3 rounded-xl
                 border border-line bg-surface/70 px-3 shadow-lg shadow-black/30
                 backdrop-blur-xl"
    >
      <span
        aria-hidden
        className="flex size-7 shrink-0 items-center justify-center rounded-lg
                   bg-accent text-xs font-semibold text-white"
      >
        ⚡
      </span>
      <span className="sr-only">{t.app.name}</span>

      <div className="h-6 w-px shrink-0 bg-line" />

      <nav
        aria-label="Projetos"
        className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto"
      >
        {projects.map((project) => (
          <ProjectTab
            key={project.id}
            project={project}
            isActive={project.id === activeProjectId}
          />
        ))}

        <form action={createProject} className="shrink-0">
          <button
            type="submit"
            aria-label={t.studio.newProject}
            title={t.studio.newProject}
            className="flex size-8 items-center justify-center rounded-lg text-ink-muted
                       transition-colors hover:bg-surface-hover hover:text-ink"
          >
            <svg viewBox="0 0 14 14" className="size-3.5" aria-hidden>
              <path
                d="M7 2v10M2 7h10"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </form>
      </nav>

      <div className="flex shrink-0 items-center gap-3">
        {activeProjectId ? <SaveIndicator /> : null}

        <div
          title={`${t.studio.sparksTooltip} — ${formatBRL(balanceCents)}`}
          className="flex items-center gap-1.5 rounded-lg border border-line
                     bg-surface-raised px-2.5 py-1"
        >
          <span aria-hidden className="text-xs">
            ⚡
          </span>
          <span className="text-xs font-medium tabular-nums text-ink">
            {formatSparks(balanceCents)}
          </span>
          <span className="sr-only">{t.studio.sparksLabel}</span>
        </div>

        <form action={signOut}>
          <button
            type="submit"
            className="rounded-lg px-2 py-1 text-xs text-ink-muted transition-colors
                       hover:bg-surface-hover hover:text-ink"
          >
            {t.auth.signOut}
          </button>
        </form>
      </div>
    </header>
  );
}
