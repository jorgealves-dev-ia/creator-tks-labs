import { redirect } from "next/navigation";

import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { ProjectCard } from "@/components/dashboard/project-card";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n/pt-BR";
import { createProject } from "@/lib/projects/actions";
import { loadProjectCards } from "@/lib/projects/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * O vestíbulo — a porta da frente do estúdio.
 *
 * Até 12/08/2026 esta rota era o canvas, e cair direto num plano infinito é
 * hostil para quem chega: não há o que ler, e a primeira decisão pedida é
 * "arraste um bloco". O canvas mudou para `/studio?p=`, e `/` passou a ser o
 * lugar onde se escolhe **em que** trabalhar antes de trabalhar.
 *
 * Nada aqui é conceito novo do banco: são os mesmos `projects` que as abas do
 * header sempre mostraram, numa tela em vez de numa faixa — com a capa, as
 * contagens e a data que a faixa nunca teve espaço para dizer (1b). Renomear e
 * excluir chegam na 1c.
 */
export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();

  const { data: claims } = await supabase.auth.getClaims();

  // O proxy já barra visitante anônimo; isto impede a página de renderizar sem
  // sessão verificada caso aquilo mude. Mesma guarda do canvas, pelo mesmo motivo.
  if (!claims?.claims) {
    redirect("/login");
  }

  const userId = claims.claims.sub;

  const [projects, walletResult] = await Promise.all([
    loadProjectCards(userId),
    supabase
      .from("wallets")
      .select("balance_cents")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <DashboardHeader balanceCents={walletResult.data?.balance_cents ?? 0} />

      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-lg font-medium text-ink">{t.dashboard.title}</h1>
            <p className="mt-1 text-xs text-ink-muted">{t.dashboard.subtitle}</p>
          </div>

          <form action={createProject} className="shrink-0">
            <Button type="submit" className="h-9 px-4">
              {t.studio.newProject}
            </Button>
          </form>
        </div>

        {projects.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <li key={project.id}>
                <ProjectCard project={project} />
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

/**
 * Conta vazia, e a mesma frase que o canvas já dizia.
 *
 * Reaproveitada de `t.studio` em vez de reescrita: são a mesma situação vista de
 * duas telas, e duas cópias da mesma frase divergem na primeira vez que alguém
 * melhorar uma delas.
 */
function EmptyState() {
  return (
    <div className="mt-6 rounded-xl border border-dashed border-line bg-surface/40 px-6 py-12 text-center">
      <p className="text-sm font-medium text-ink">{t.studio.noProjectsTitle}</p>
      <p className="mx-auto mt-1.5 max-w-xs text-xs leading-relaxed text-ink-faint">
        {t.studio.noProjectsBody}
      </p>
      <form action={createProject} className="mt-5">
        <Button type="submit" className="h-9 px-4">
          {t.studio.newProject}
        </Button>
      </form>
    </div>
  );
}
