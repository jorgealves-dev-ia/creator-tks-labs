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
export type PickerScope = "geracao" | "produto";

type ReferencePickerState = {
  /**
   * Non-null while the modal is open, and the React key that resets it: opening
   * it for a different block must start from a clean selection rather than carry
   * one caller's choices into another's.
   */
  key: string | null;
  scope: PickerScope;
  /** How many more images the caller may accept. */
  remaining: number;
  /** The caller's full ceiling, so the modal can explain the number it enforces. */
  limit: number;
  onConfirm: ((picked: PickedImage[]) => void) | null;

  open: (input: {
    key: string;
    scope: PickerScope;
    remaining: number;
    limit: number;
    onConfirm: (picked: PickedImage[]) => void;
  }) => void;
  close: () => void;
};

export const useReferencePicker = create<ReferencePickerState>((set) => ({
  key: null,
  scope: "geracao",
  remaining: 0,
  limit: 0,
  onConfirm: null,

  open: ({ key, scope, remaining, limit, onConfirm }) =>
    set({ key, scope, remaining, limit, onConfirm }),

  close: () => set({ key: null, remaining: 0, limit: 0, onConfirm: null }),
}));
