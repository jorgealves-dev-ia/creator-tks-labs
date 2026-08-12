import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import { signOut } from "@/lib/auth/actions";
import { t } from "@/lib/i18n/pt-BR";
import { formatBRL, formatSparks } from "@/lib/sparks";

/**
 * A faixa de cima do vestíbulo.
 *
 * Parecida com a do canvas de propósito — mesma chama, mesmo saldo, mesmo
 * "Sair", nos mesmos cantos —, e ainda assim outro componente. A do canvas
 * **flutua** sobre um mapa infinito (`absolute inset-x-3 top-3`), porque lá
 * embaixo dela há um plano que precisa do viewport inteiro; esta é uma linha de
 * uma página que rola. Unificar as duas significaria uma prop `floating` e dois
 * comportamentos de posicionamento no mesmo arquivo, que é a forma cara de
 * economizar trinta linhas.
 *
 * O que **não** se repete é a chama: aqui ela não é link, porque já estamos em
 * casa. No canvas ela é o caminho de volta.
 */
export function DashboardHeader({ balanceCents }: { balanceCents: number }) {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-canvas/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-5">
        <span
          aria-hidden
          className="flex size-7 shrink-0 items-center justify-center rounded-lg
                     bg-accent text-xs font-semibold text-white"
        >
          ⚡
        </span>
        <span className="text-sm font-medium text-ink">{t.app.name}</span>

        <div className="ml-4 h-6 w-px shrink-0 bg-line" />

        <DashboardNav />

        <div className="ml-auto flex shrink-0 items-center gap-3">
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
      </div>
    </header>
  );
}
