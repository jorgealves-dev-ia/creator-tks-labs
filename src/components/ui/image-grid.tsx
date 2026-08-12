"use client";

/**
 * A grade de miniaturas — uma só, para as duas telas que mostram imagens.
 *
 * Ela nasceu dentro do seletor de referências e saiu de lá quando a Galeria
 * geral do dashboard passou a precisar da mesma coisa. O motivo de extrair está
 * escrito no próprio seletor, sobre a decisão de fazer a Galeria do projeto um
 * **modo** em vez de uma segunda tela: *"duas telas iguais menos um botão são
 * duas telas que vão divergir na primeira vez que alguém mexer em uma delas."*
 * Valia para o modo, vale igual para a grade.
 *
 * O que ficou aqui é só a apresentação: a moldura, a proporção quadrada, a
 * legenda que trunca e a marca de selecionado. **De onde vêm as imagens, o que o
 * clique faz e o que a paginação significa continuam com quem chama** — é isso
 * que deixa o mesmo componente servir um seletor (clique marca) e uma galeria
 * (clique amplia) sem saber a diferença.
 */

export type ImageGridItem = {
  assetId: string;
  url: string;
  label: string | null;
  /** Um selo discreto no canto — a origem, na Galeria geral. Ausente no seletor. */
  badge?: string | null;
};

/**
 * Genérico no item de propósito: quem chama recebe de volta **o seu próprio
 * objeto**, com os campos que só ele conhece — a `source` que o seletor precisa
 * gravar como origem, a `origin` que a galeria usa no selo. Sem isso, o clique
 * devolveria uma versão podada e quem chamou teria que reencontrar o item na
 * lista para recuperar o que a grade descartou.
 */
type ImageGridProps<T extends ImageGridItem> = {
  items: readonly T[];
  onPick: (item: T) => void;
  /** Quais estão marcados. Ausente numa grade que não seleciona. */
  pickedIds?: ReadonlySet<string>;
  /** O `title` da miniatura quando a imagem não tem legenda. */
  hint?: string;
  /** Como chamar uma imagem sem rótulo. */
  untitled: string;
  /** As colunas são de quem chama: um modal e uma página não cabem igual. */
  className?: string;
};

export function ImageGrid<T extends ImageGridItem>({
  items,
  onPick,
  pickedIds,
  hint,
  untitled,
  className = "grid grid-cols-4 gap-3 sm:grid-cols-6",
}: ImageGridProps<T>) {
  return (
    <ul className={className}>
      {items.map((item) => {
        const picked = pickedIds?.has(item.assetId) ?? false;

        return (
          <li key={item.assetId}>
            <button
              type="button"
              onClick={() => onPick(item)}
              title={item.label ?? hint}
              className={`block w-full overflow-hidden rounded-lg border transition-colors ${
                picked ? "border-accent" : "border-line hover:border-line-strong"
              }`}
            >
              <span className="relative block aspect-square bg-canvas">
                {/* URLs assinadas de vida curta, de um bucket privado. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.url}
                  alt={item.label ?? untitled}
                  className="size-full object-cover"
                />

                {picked ? (
                  <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-accent text-[9px] font-bold text-canvas">
                    ✓
                  </span>
                ) : null}

                {/* O selo fica sobre a imagem, embaixo, onde não disputa espaço
                    com a marca de selecionado — as duas podem coexistir. */}
                {item.badge ? (
                  <span className="absolute inset-x-1 bottom-1 truncate rounded bg-canvas/80 px-1 py-0.5 text-[9px] text-ink-muted backdrop-blur-sm">
                    {item.badge}
                  </span>
                ) : null}
              </span>

              <span className="block truncate px-1.5 py-1 text-left text-[10px] text-ink-faint">
                {item.label ?? untitled}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
