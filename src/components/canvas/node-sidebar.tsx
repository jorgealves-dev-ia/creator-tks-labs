import { t } from "@/lib/i18n/pt-BR";

/**
 * Collapsed rail that widens when the pointer gets close. `focus-within` gives
 * keyboard users the same reach once the rail holds focusable blocks.
 */
export function NodeSidebar() {
  return (
    <aside
      aria-label={t.studio.sidebarTitle}
      className="group absolute bottom-3 left-3 top-20 z-10 flex w-14 flex-col
                 overflow-hidden rounded-xl border border-line bg-surface/70
                 shadow-lg shadow-black/30 backdrop-blur-xl
                 transition-[width] duration-200 ease-out
                 hover:w-64 focus-within:w-64"
    >
      <div className="flex h-14 shrink-0 items-center gap-3 px-4">
        <svg viewBox="0 0 16 16" className="size-4 shrink-0 text-ink-muted" aria-hidden>
          <rect x="1.5" y="1.5" width="5" height="5" rx="1.5"
                stroke="currentColor" strokeWidth="1.3" fill="none" />
          <rect x="9.5" y="1.5" width="5" height="5" rx="1.5"
                stroke="currentColor" strokeWidth="1.3" fill="none" />
          <rect x="1.5" y="9.5" width="5" height="5" rx="1.5"
                stroke="currentColor" strokeWidth="1.3" fill="none" />
          <rect x="9.5" y="9.5" width="5" height="5" rx="1.5"
                stroke="currentColor" strokeWidth="1.3" fill="none" />
        </svg>
        <span
          className="whitespace-nowrap text-sm font-medium text-ink opacity-0
                     transition-opacity duration-150
                     group-hover:opacity-100 group-focus-within:opacity-100"
        >
          {t.studio.sidebarTitle}
        </span>
      </div>

      <p
        className="w-64 px-4 text-xs leading-relaxed text-ink-faint opacity-0
                   transition-opacity duration-150
                   group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {t.studio.sidebarComingSoon}
      </p>
    </aside>
  );
}
