"use client";

import Link from "next/link";

import { signOut } from "@/lib/auth/actions";
import { t } from "@/lib/i18n/pt-BR";
import { createProject } from "@/lib/projects/actions";
import { useProjectStatusFeed } from "@/lib/projects/status-feed";
import { formatBRL, formatSparks, sparksToCents } from "@/lib/sparks";
import { useBalance } from "@/lib/sparks/balance-store";
import { useWalletFeed } from "@/lib/sparks/wallet-feed";

import { ProjectTab, type ProjectTabData } from "./project-tab";
import { SaveIndicator } from "./save-indicator";

type StudioHeaderProps = {
  projects: ProjectTabData[];
  activeProjectId: string | null;
  balanceCents: number;
  /** De quem são estas abas — o filtro do canal que as mantém ao vivo. */
  userId: string;
};

/**
 * Floats above the canvas rather than sitting in a layout row, so the canvas
 * keeps the full viewport underneath it.
 */
export function StudioHeader({
  projects,
  activeProjectId,
  balanceCents,
  userId,
}: StudioHeaderProps) {
  /**
   * A barra é a única leitora de `projects`, então é ela quem abre o canal.
   *
   * Aqui e não no canvas de propósito: o canal de gerações vive no `FlowCanvas`
   * porque é do projeto aberto, e o `FlowCanvas` só existe quando há um. As abas
   * existem sempre — inclusive na tela de "nenhum projeto ainda" —, e o que este
   * canal escuta é o usuário, não o projeto.
   */
  useProjectStatusFeed(userId, projects);

  /**
   * O saldo, ao vivo — e o cabeçalho passa a ler o store, não a `prop`.
   *
   * Ler a prop era o que o deixava surdo: ela só muda quando o servidor
   * renderiza de novo, e a cobrança de um vídeo acontece no webhook, sem
   * resposta nenhuma voltando para o navegador. O número ficava parado com o
   * dinheiro já debitado — a tela mentindo sobre dinheiro, que é a única
   * mentira que este produto não pode contar.
   *
   * A prop continua sendo o lastro do primeiro quadro: a semeadura acontece num
   * efeito, então antes dela quem responde é o que o servidor renderizou.
   */
  useWalletFeed(userId);

  const liveSparks = useBalance((state) => state.sparks);

  // De volta a centavos, que é a unidade de tudo que é dinheiro aqui e a que o
  // `formatBRL` do título espera. A ida e volta é exata: `CENTS_PER_SPARK` é a
  // única definição da taxa, e mudá-la já obriga a varrer todas as telas.
  const cents = liveSparks === null ? balanceCents : sparksToCents(liveSparks);

  return (
    <header
      className="absolute inset-x-3 top-3 z-20 flex h-14 items-center gap-3 rounded-xl
                 border border-line bg-surface/70 px-3 shadow-lg shadow-black/30
                 backdrop-blur-xl"
    >
      {/* A chama é o caminho de volta ao vestíbulo. Era enfeite (`aria-hidden`)
          enquanto o canvas era a única tela; virou navegação no dia em que
          passou a existir um lugar para onde voltar. */}
      <Link
        href="/"
        title={t.dashboard.backHint}
        className="flex size-7 shrink-0 items-center justify-center rounded-lg
                   bg-accent text-xs font-semibold text-white transition-colors
                   hover:bg-accent-hover"
      >
        <span aria-hidden>⚡</span>
        <span className="sr-only">{t.dashboard.backHint}</span>
      </Link>

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
          title={`${t.studio.sparksTooltip} — ${formatBRL(cents)}`}
          className="flex items-center gap-1.5 rounded-lg border border-line
                     bg-surface-raised px-2.5 py-1"
        >
          <span aria-hidden className="text-xs">
            ⚡
          </span>
          <span className="text-xs font-medium tabular-nums text-ink">
            {formatSparks(cents)}
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
