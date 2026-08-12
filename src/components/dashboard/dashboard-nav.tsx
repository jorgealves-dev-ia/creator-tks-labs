"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { t } from "@/lib/i18n/pt-BR";

/**
 * As telas do vestíbulo, e qual delas você está vendo.
 *
 * Client component só por causa do `usePathname` — marcar a aba atual é a única
 * coisa aqui que o servidor não sabe responder de graça. O resto do cabeçalho
 * continua no servidor.
 */
const LINKS = [
  { href: "/", label: t.dashboard.nav.projects },
  { href: "/galeria", label: t.dashboard.nav.gallery },
  { href: "/conta", label: t.dashboard.nav.account },
] as const;

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav aria-label={t.dashboard.nav.label} className="flex items-center gap-1">
      {LINKS.map((link) => {
        // Comparação exata: com `startsWith`, "/" seria considerado ativo em
        // toda tela do grupo, e as duas abas acenderiam ao mesmo tempo.
        const active = pathname === link.href;

        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-lg px-2.5 py-1 text-xs transition-colors ${
              active
                ? "bg-surface-raised text-ink"
                : "text-ink-muted hover:bg-surface-hover hover:text-ink"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
