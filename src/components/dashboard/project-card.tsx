import Link from "next/link";

import { formatDay } from "@/lib/format/date";
import { t } from "@/lib/i18n/pt-BR";
import type { ProjectCard as ProjectCardData } from "@/lib/projects/queries";

const copy = t.dashboard.card;

/**
 * Um projeto, como cartão.
 *
 * O cartão inteiro é o link — não um botão "abrir" dentro dele. Num vestíbulo,
 * a coisa que se faz com um projeto é entrar nele; exigir mira num alvo pequeno
 * seria cobrar precisão pela ação óbvia. As ações que **não** são óbvias
 * (renomear, excluir) chegam na 1c, e é por elas que este componente é o lugar
 * certo para crescer.
 *
 * A capa é a geração bem-sucedida mais recente. Uma imagem responde "o que é
 * este projeto?" antes de qualquer nome que alguém tenha digitado às pressas —
 * e "Projeto sem título 3" com a foto da Luna dentro é reconhecível, enquanto
 * "Projeto sem título 3" sozinho não é.
 */
export function ProjectCard({ project }: { project: ProjectCardData }) {
  return (
    <Link
      href={`/studio?p=${project.id}`}
      title={t.dashboard.openHint}
      className="group block overflow-hidden rounded-xl border border-line bg-surface
                 transition-colors hover:border-line-strong hover:bg-surface-hover"
    >
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
        <p className="truncate text-sm font-medium text-ink">{project.name}</p>

        <p className="mt-1 text-[11px] text-ink-faint">
          <Count
            value={project.imageCount}
            one={copy.imageOne}
            many={copy.imageMany}
          />
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
    </Link>
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
