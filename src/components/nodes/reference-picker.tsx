"use client";

import { useEffect, useRef, useState } from "react";

import { useLightbox } from "@/components/nodes/lightbox";
import { ImageGrid } from "@/components/ui/image-grid";
import {
  listGalleryAssets,
  registerUploadedAsset,
  type GalleryItem,
} from "@/lib/assets/actions";
import { IMMUTABLE_CACHE_CONTROL } from "@/lib/assets/thumbnail-path";
import { storeThumbnailInBrowser } from "@/lib/assets/thumbnail-client";
import { useReferencePicker } from "@/lib/canvas/reference-picker-store";
import { listProjectGallery } from "@/lib/generation/history";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { t } from "@/lib/i18n/pt-BR";

/**
 * The image picker — §4 of docs/nodes-geracao.md.
 *
 * Two sources, one modal: send a new file, or reach into everything you already
 * have. The second is the point of the feature — an image used once stays in the
 * gallery forever, so a product photo is uploaded on the day it exists and used
 * in the hundred generations after it.
 *
 * Written for the generating block, and now also the product editor's way of
 * adding photos: the two callers want the identical thing, and a second uploader
 * would have been a second place for "10 MB" and "must be an image" to drift.
 * What the modal knows about its caller is a ceiling and a callback — see
 * lib/canvas/reference-picker-store.ts.
 *
 * Rendered once, at the top of the studio, for the reason written in that same
 * file: a modal inside a React Flow node is inside a CSS transform, and would
 * drift and scale with the canvas.
 */

const copy = t.generation.picker;

/** The bucket allows 50 MB; a reference photo has no business being near that. */
const MAX_BYTES = 10 * 1024 * 1024;

type Filter = "todas" | "geradas" | "enviadas";

export function ReferencePicker() {
  const key = useReferencePicker((state) => state.key);

  if (!key) return null;

  // Keyed by caller so switching blocks starts with a clean selection instead of
  // carrying one block's choices into another's.
  return <PickerDialog key={key} />;
}

function PickerDialog() {
  const mode = useReferencePicker((state) => state.mode);
  const scope = useReferencePicker((state) => state.scope);
  const projectId = useReferencePicker((state) => state.projectId);
  const remaining = useReferencePicker((state) => state.remaining);
  const limit = useReferencePicker((state) => state.limit);
  const close = useReferencePicker((state) => state.close);
  const onConfirm = useReferencePicker((state) => state.onConfirm);
  const openLightbox = useLightbox((state) => state.open);

  /**
   * A Galeria (§4b): a mesma grade, sem ação de seleção.
   *
   * O que muda é pouco e está todo aqui: de onde vem a lista, o que o clique
   * faz, e o rodapé. O resto — a moldura, o jeito de rolar, a paginação, o
   * Escape — é o mesmo código, que é exatamente o motivo de ser um modo e não
   * uma segunda tela.
   */
  const browsing = mode === "browse";
  const galleryCopy = t.generation.gallery;

  const scopeCopy = copy.scopes[scope];

  const [filter, setFilter] = useState<Filter>("todas");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<GalleryItem[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  /**
   * The page, remembered together with the request that produced it.
   *
   * Stored as a pair so "am I loading?" is a comparison rather than a flag some
   * effect has to remember to raise and lower — the flag version answers wrongly
   * for one render every time the filter changes, which is exactly the moment
   * someone is looking.
   */
  const [page, setPage] = useState<{
    key: string;
    items: GalleryItem[];
    hasMore: boolean;
  } | null>(null);

  const requestKey = browsing ? `browse ${projectId}` : `${filter} ${query}`;
  const loading = page?.key !== requestKey;
  const items = page?.key === requestKey ? page.items : [];
  const hasMore = page?.key === requestKey && page.hasMore;

  const fileRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    let cancelled = false;

    // Debounced: typing in the search should not fire a request per keystroke.
    // A Galeria não tem busca, e o atraso passa despercebido nela.
    const timer = setTimeout(() => {
      const request = browsing
        ? listProjectGallery({ projectId }).then((result) => ({
            items: result.items.map(toGalleryItem),
            hasMore: result.hasMore,
          }))
        : listGalleryAssets({ filter, query });

      void request.then((result) => {
        if (cancelled) return;

        setPage({ key: requestKey, items: result.items, hasMore: result.hasMore });
      });
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // requestKey já é a composição de tudo que muda a consulta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey]);

  /**
   * Aberto como `<dialog>` nativo, e isso é uma correção de 11/08/2026.
   *
   * Ele era um `div` com `fixed inset-0 z-50`, o que basta enquanto quem o abre
   * é um node do canvas. Deixou de bastar quando o editor da personagem passou
   * a chamá-lo (a foto de perfil, Fase 3 da D2): o editor é um
   * `<dialog>.showModal()`, e um dialog modal vive na **top layer** do
   * navegador, acima de qualquer `z-index` da página. O seletor abria — estava
   * no DOM, montado, funcionando — e era pintado por baixo.
   *
   * A top layer empilha por ordem de abertura, então um dialog aberto depois
   * fica acima do anterior. É a mesma receita que o SheetEditor já usava, e o
   * `p-0` mais o `backdrop:` são o que tiram os estilos que o `<dialog>` traz
   * de fábrica.
   *
   * De brinde vem o que se estava fazendo à mão: Escape fecha nativamente (via
   * `onClose`, que também cobre o fechamento por qualquer outro caminho) e o
   * foco fica preso dentro do modal.
   */
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  /** Uma geração, vista como item da grade. A grade não precisa saber a diferença. */
  function toGalleryItem(thumb: {
    assetId: string;
    url: string;
    label: string | null;
    createdAt: string;
    /**
     * O campo que faltava aqui, e que fazia a Galeria do projeto abrir vídeo
     * como imagem. `GenerationThumb` sempre o trouxe; era este parâmetro que
     * não o pedia, e por isso ele se perdia na conversão.
     */
    isVideo: boolean;
  }): GalleryItem {
    // `derivedFromAssetId` é sempre nulo aqui, e não por omissão: a Galeria do
    // projeto lê `generations`, e um quadro derivado não tem geração nenhuma —
    // ele nunca aparece por este caminho. É o mesmo recorte que já deixa as
    // folhas canônicas de fora, e o seletor (que lê `assets`) é onde ele mora.
    return { ...thumb, source: "generation", derivedFromAssetId: null };
  }

  function toggle(item: GalleryItem) {
    // Na Galeria o clique amplia: não há nada para selecionar, e uma grade que
    // marcasse itens prometeria uma ação que este modo não tem.
    if (browsing) {
      // Com `isVideo`, o mesmo visualizador da /galeria: um caminho de exibição,
      // não dois.
      openLightbox(item.assetId, { isVideo: item.isVideo });
      return;
    }

    setMessage(null);

    setSelected((current) => {
      const already = current.some((entry) => entry.assetId === item.assetId);

      if (already) {
        return current.filter((entry) => entry.assetId !== item.assetId);
      }

      if (current.length >= remaining) {
        setMessage(`${scopeCopy.limitPrefix} ${limit} ${scopeCopy.limitSuffix}`);
        return current;
      }

      return [...current, item];
    });
  }

  async function loadMore() {
    const last = items[items.length - 1];

    if (!last) return;

    const next = browsing
      ? await listProjectGallery({ projectId, before: last.createdAt }).then((result) => ({
          items: result.items.map(toGalleryItem),
          hasMore: result.hasMore,
        }))
      : await listGalleryAssets({ filter, query, before: last.createdAt });

    setPage((current) =>
      current === null
        ? current
        : { ...current, items: [...current.items, ...next.items], hasMore: next.hasMore },
    );
  }

  async function handleUpload(file: File) {
    setMessage(null);

    if (!file.type.startsWith("image/")) {
      setMessage(copy.notAnImage);
      return;
    }

    if (file.size > MAX_BYTES) {
      setMessage(copy.tooLarge);
      return;
    }

    setUploading(true);

    const supabase = createSupabaseBrowserClient();
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;

    if (!userId) {
      setUploading(false);
      setMessage(copy.uploadFailed);
      return;
    }

    // The first folder segment is the owner — the convention the bucket policies
    // of 20260807140500 rely on.
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "png";
    const storagePath = `${userId}/references/${crypto.randomUUID()}.${extension}`;

    const { error } = await supabase.storage
      .from("assets")
      .upload(storagePath, file, { contentType: file.type, cacheControl: IMMUTABLE_CACHE_CONTROL });

    if (error) {
      setUploading(false);
      setMessage(copy.uploadFailed);
      return;
    }

    // A miniatura, do arquivo que já está na mão. Best-effort: se falhar, o
    // envio segue e a grade cai para o original.
    const source = await storeThumbnailInBrowser(storagePath, file);

    const result = await registerUploadedAsset({
      storagePath,
      mimeType: file.type,
      byteSize: file.size,
      width: source?.width ?? null,
      height: source?.height ?? null,
      // The name the file already had. Nobody has to think of a caption, and the
      // search finds it by the word the user themselves put on the disk.
      label: file.name.replace(/\.[^.]+$/, ""),
    });

    setUploading(false);

    if (!result.ok) {
      setMessage(copy.uploadFailed);
      return;
    }

    setPage((current) =>
      current === null ? current : { ...current, items: [result.item, ...current.items] },
    );

    // Uploading is an act of choosing: the file lands already selected, because
    // nobody uploads a reference in order to then not use it.
    setSelected((current) =>
      current.length >= remaining ? current : [...current, result.item],
    );
  }

  function confirm() {
    // What is done with the choice belongs to whoever opened the modal. The
    // picker's job ends at "these images, in this order".
    onConfirm?.(selected.map((item) => ({ assetId: item.assetId, source: item.source })));
    close();
  }

  return (
    <dialog
      ref={dialogRef}
      aria-label={browsing ? galleryCopy.title : scopeCopy.title}
      onClose={close}
      // Clicar fora fecha: num `<dialog>`, o clique no vão em volta tem o
      // próprio dialog como alvo, então comparar com o ref é o que distingue
      // "cliquei ao lado" de "cliquei dentro". Mesma receita do SheetEditor.
      onClick={(event) => {
        if (event.target === dialogRef.current) dialogRef.current?.close();
      }}
      className="fixed inset-0 m-auto h-[36rem] w-full max-w-3xl overflow-hidden rounded-xl
                 border border-line bg-surface p-0 text-ink shadow-2xl shadow-black/50
                 backdrop:bg-canvas/80 backdrop:backdrop-blur-sm"
    >
      <div className="flex h-full w-full flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <div>
            <h2 className="text-sm font-medium text-ink">
              {browsing ? galleryCopy.title : scopeCopy.title}
            </h2>
            <p className="mt-0.5 text-[11px] text-ink-faint">
              {browsing ? (
                galleryCopy.subtitle
              ) : (
                <>
                  {copy.remainingPrefix} {remaining} {scopeCopy.remainingSuffix} {limit}.
                </>
              )}
            </p>
          </div>

          <button
            type="button"
            onClick={close}
            aria-label={copy.close}
            className="rounded-lg px-2 py-1 text-xs text-ink-faint transition-colors hover:bg-surface-hover hover:text-ink"
          >
            ✕
          </button>
        </div>

        {/* A barra inteira é sobre escolher: filtrar o acervo, procurar nele e
            enviar arquivo. Nada disso existe numa tela que só mostra o que este
            projeto gerou, então ela não aparece — em vez de aparecer inerte. */}
        <div
          className={`flex flex-wrap items-center gap-2 border-b border-line px-5 py-3 ${
            browsing ? "hidden" : ""
          }`}
        >
          {(["todas", "geradas", "enviadas"] as const).map((entry) => (
            <button
              key={entry}
              type="button"
              onClick={() => setFilter(entry)}
              className={`rounded-full border px-3 py-1 text-[11px] transition-colors ${
                filter === entry
                  ? "border-accent bg-accent-soft text-ink"
                  : "border-line text-ink-muted hover:border-line-strong hover:text-ink"
              }`}
            >
              {copy.filters[entry]}
            </button>
          ))}

          <input
            type="search"
            value={query}
            placeholder={copy.searchPlaceholder}
            onChange={(event) => setQuery(event.target.value)}
            className="ml-auto w-56 rounded-lg border border-line bg-surface-raised px-3 py-1.5 text-xs
                       text-ink placeholder:text-ink-faint transition-colors
                       hover:border-line-strong focus:border-accent focus:outline-none"
          />

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleUpload(file);
              event.target.value = "";
            }}
          />

          <button
            type="button"
            disabled={uploading || selected.length >= remaining}
            title={
              selected.length >= remaining
                ? `${scopeCopy.limitPrefix} ${limit} ${scopeCopy.limitSuffix}`
                : undefined
            }
            onClick={() => fileRef.current?.click()}
            className="rounded-lg border border-line px-3 py-1.5 text-[11px] text-ink-muted
                       transition-colors hover:border-line-strong hover:text-ink
                       disabled:cursor-not-allowed disabled:opacity-50"
          >
            {uploading ? copy.uploading : copy.upload}
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {loading ? (
            <p className="text-xs text-ink-faint">
              {browsing ? galleryCopy.loading : copy.loading}
            </p>
          ) : items.length === 0 ? (
            <div className="max-w-sm">
              <p className="text-xs text-ink-muted">
                {browsing ? galleryCopy.empty : copy.empty}
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-ink-faint">
                {browsing ? galleryCopy.emptyHint : copy.emptyHint}
              </p>
            </div>
          ) : (
            <>
              {/* A grade é compartilhada com a Galeria geral do dashboard — ver
                  components/ui/image-grid.tsx. O que este modal guarda para si é
                  o que o clique faz e o teto que ele impõe. */}
              {/*
                O selo do quadro derivado — a única coisa que a grade acrescenta
                aqui, e ela vem do **dado**: `derivedFromAssetId`, não do rótulo
                nem do `source`. Uma imagem que é o quadro final de um vídeo
                parece uma foto qualquer numa miniatura de 100px, e a diferença
                importa antes do clique.
              */}
              <ImageGrid
                items={items.map((item) =>
                  item.derivedFromAssetId ? { ...item, badge: copy.derivedBadge } : item,
                )}
                onPick={toggle}
                pickedIds={new Set(selected.map((entry) => entry.assetId))}
                hint={browsing ? galleryCopy.openHint : undefined}
                untitled={copy.untitled}
              />

              {hasMore ? (
                <button
                  type="button"
                  onClick={() => void loadMore()}
                  className="mt-4 rounded-lg border border-line px-3 py-1.5 text-[11px] text-ink-muted
                             transition-colors hover:border-line-strong hover:text-ink"
                >
                  {copy.loadMore}
                </button>
              ) : null}
            </>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-3">
          {/* Numa tela de navegação, o rodapé conta o que há — não o que foi
              escolhido, porque não há escolha nenhuma para relatar. */}
          <p className="text-[11px] text-ink-faint">
            {browsing
              ? `${items.length} ${items.length === 1 ? galleryCopy.countOne : galleryCopy.countSuffix}`
              : (message ?? `${selected.length} ${copy.selected}`)}
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={close}
              className="rounded-lg px-3 py-1.5 text-xs text-ink-muted transition-colors hover:text-ink"
            >
              {browsing ? galleryCopy.close : copy.cancel}
            </button>

            {browsing ? null : (
              <button
                type="button"
                disabled={selected.length === 0}
                onClick={confirm}
                className="rounded-lg bg-accent px-4 py-1.5 text-xs font-medium text-canvas
                           transition-colors hover:bg-accent-hover
                           disabled:cursor-not-allowed disabled:bg-surface-hover disabled:text-ink-faint"
              >
                {copy.confirm}
              </button>
            )}
          </div>
        </div>
      </div>
    </dialog>
  );
}
