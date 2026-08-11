import { create } from "zustand";

/**
 * Who has the image picker open, and what to do with what they choose.
 *
 * The picker lives here rather than inside the screen that opens it for a
 * concrete reason: React Flow puts every node inside a transformed container,
 * and a `position: fixed` element inside a `transform` is positioned against
 * that container instead of the window — and scaled with the zoom. A modal
 * opened from a node would therefore drift and shrink with the canvas.
 *
 * So the modal is rendered once, at the top of the studio. It was written for
 * the generating block; the product editor needs exactly the same thing —
 * "upload a file, or reach into everything you already have" — so what the modal
 * knows about its caller became a callback and a ceiling instead of a node id.
 * One picker, two callers, and neither of them owning the other.
 */

/** One image the user picked. Enough for both callers; nothing more travels. */
export type PickedImage = {
  assetId: string;
  /** Where the file came from — the `origem` a node records for the audit. */
  source: "upload" | "generation";
};

/** Which screen asked, so the modal can explain the ceiling it enforces. */
export type PickerScope = "geracao" | "produto" | "input";

/**
 * What the modal is for this time (§4b da D1).
 *
 * `select` é o de sempre: escolher imagens para alguém. `browse` é a Galeria —
 * a mesma grade, o mesmo jeito de rolar, **sem ação de seleção**: sem contador,
 * sem confirmar, sem enviar arquivo, e o clique amplia em vez de marcar.
 *
 * Um modo e não uma segunda tela porque a diferença entre as duas é justamente
 * a ação — e duas telas iguais menos um botão são duas telas que vão divergir
 * na primeira vez que alguém mexer em uma delas.
 */
export type PickerMode = "select" | "browse";

type ReferencePickerState = {
  /**
   * Non-null while the modal is open, and the React key that resets it: opening
   * it for a different block must start from a clean selection rather than carry
   * one caller's choices into another's.
   */
  key: string | null;
  mode: PickerMode;
  scope: PickerScope;
  /** How many more images the caller may accept. Zero e ignorado em `browse`. */
  remaining: number;
  /** The caller's full ceiling, so the modal can explain the number it enforces. */
  limit: number;
  /** Qual projeto a Galeria mostra. Null fora do modo `browse`. */
  projectId: string | null;
  onConfirm: ((picked: PickedImage[]) => void) | null;

  open: (input: {
    key: string;
    scope: PickerScope;
    remaining: number;
    limit: number;
    onConfirm: (picked: PickedImage[]) => void;
  }) => void;
  /** A Galeria: a mesma grade, sem nada para escolher. */
  browse: (input: { projectId: string }) => void;
  close: () => void;
};

export const useReferencePicker = create<ReferencePickerState>((set) => ({
  key: null,
  mode: "select",
  scope: "geracao",
  remaining: 0,
  limit: 0,
  projectId: null,
  onConfirm: null,

  open: ({ key, scope, remaining, limit, onConfirm }) =>
    set({ key, mode: "select", scope, remaining, limit, projectId: null, onConfirm }),

  // A chave leva o id do projeto: trocar de aba com a galeria aberta tem que
  // remontar a grade, e não continuar mostrando as imagens do projeto anterior.
  browse: ({ projectId }) =>
    set({
      key: `galeria:${projectId}`,
      mode: "browse",
      remaining: 0,
      limit: 0,
      projectId,
      onConfirm: null,
    }),

  close: () =>
    set({ key: null, mode: "select", remaining: 0, limit: 0, projectId: null, onConfirm: null }),
}));
