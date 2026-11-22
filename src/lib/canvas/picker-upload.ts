import type { GalleryItem } from "@/lib/assets/actions";
import {
  failureMessage,
  isRetryable,
  prepareImages,
  refusalMessage,
  uploadPreparedImage,
} from "@/lib/assets/upload-client";
import { uploadLabel } from "@/lib/assets/upload-label";
import { useLocalPreviews } from "@/lib/canvas/local-previews";

/**
 * What the picker's «Enviar imagem» DOES with the file somebody chose — the
 * part of the button that is not about the modal's own state.
 *
 * Pulled out of `reference-picker.tsx` on 02/10/2026 for the reason
 * `image-gesture.ts` was pulled out of its hook the day before: so it can be
 * proved without a browser. The modal keeps what is the modal's — the message,
 * the «Enviando…», the selection — and calls this.
 *
 * It is the house's one upload road (`upload-client.ts`), unchanged: the type is
 * read in the file's first bytes, never in its name, and the label is the name
 * the file already had.
 *
 * ---------------------------------------------------------------------------
 * The picture, lent to whoever receives the asset
 * ---------------------------------------------------------------------------
 *
 * A file sent from here is still in this browser's hands when the upload ends.
 * So the card that receives the asset — Input de Imagem, Pose, Character Sheet,
 * a photo of a Produto — can draw it at once, instead of reading «Carregando…»
 * while a signed link is made and a thumbnail downloaded. It is what a paste on
 * the canvas has done since 01/10/2026, reaching the three cards a paste never
 * lands on: their pictures arrive through this modal, and only through it.
 *
 * Lent by asset id, outside the graph (`local-previews.ts`): an object URL is
 * the address of bytes in this tab's memory and a saved canvas must never carry
 * one. Whoever claims it lets it go when the real picture has loaded; nobody
 * claiming it — the selection undone, the modal cancelled — lets it go by
 * itself. Nothing is lent when the upload fails: there is no asset to lend it to.
 */

export type PickerUpload =
  | { ok: true; item: GalleryItem }
  | {
      ok: false;
      /** Why, in words. Null for "nothing to do" — a gesture with no file. */
      message: string | null;
      /** True when what failed is the network: sending the same file again can work. */
      retryable: boolean;
    };

/**
 * Checks the file, sends it, and lends its picture to the asset it became.
 *
 * `onSending` fires once the file passed the checks and its first byte is about
 * to leave — a refused file never shows «Enviando…», because nothing was sent.
 *
 * Never throws: neither `prepareImages` nor `uploadPreparedImage` does.
 */
export async function sendFromPicker(file: File, onSending: () => void): Promise<PickerUpload> {
  const prepared = await prepareImages([file]);

  if (!prepared.ok) {
    return { ok: false, message: refusalMessage(prepared), retryable: false };
  }

  onSending();

  const result = await uploadPreparedImage(prepared.images[0], uploadLabel(file, "botao", new Date()));

  if (!result.ok) {
    return { ok: false, message: failureMessage(result.reason), retryable: isRetryable(result.reason) };
  }

  useLocalPreviews.getState().offer(result.item.assetId, URL.createObjectURL(file));

  return { ok: true, item: result.item };
}
