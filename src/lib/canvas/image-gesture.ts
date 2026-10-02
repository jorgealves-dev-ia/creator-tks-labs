import {
  failureMessage,
  uploadPreparedImage,
  type PreparedImage,
  type UploadOutcome,
} from "@/lib/assets/upload-client";
import { uploadLabel, type UploadOrigin } from "@/lib/assets/upload-label";
import { useLocalPreviews } from "@/lib/canvas/local-previews";
import { imageInputSlots, useCanvasStore } from "@/lib/canvas/store";
import { t } from "@/lib/i18n/pt-BR";

/**
 * What a paste or a drop of images DOES, once the files were checked — the part
 * of the gesture that is not about events.
 *
 * Pulled out of the hook on 01/10/2026 so it can be proved without a browser:
 * it takes prepared images and a point, and reports what is on screen through a
 * callback. `use-image-gestures.ts` keeps the listening — clipboard, pointer,
 * drag — and calls this.
 *
 * ---------------------------------------------------------------------------
 * The picture first, the upload after
 * ---------------------------------------------------------------------------
 *
 * Until now the canvas answered a paste with a line of text — «Enviando 1
 * imagem…» — and the card appeared when everything had finished: the upload,
 * the thumbnail, the registration, the signed link, the download of the
 * thumbnail. The file was already in the browser's hands the whole time.
 *
 * So a PREVIEW goes up at once, drawn from the file itself, standing where the
 * card will be born. It is not a card: it is not in the canvas store, the
 * autosave never sees it, it cannot be wired, moved or saved. A card exists when
 * its asset exists — and a gesture that fails leaves the graph exactly as it was.
 *
 * When the upload ends, the card takes over on the same spot and is lent the
 * same object URL (`local-previews.ts`), so the frame does not blink while the
 * real link is made. When it fails, the preview leaves — and the files it stood
 * for have already left Storage (`discard-upload.ts`).
 */

const copy = t.generation.upload;

export type GestureStatus = { tone: "busy" | "done" | "refused"; text: string };

/** A picture shown from the person's own machine while its file travels. */
export type UploadPreview = {
  key: string;
  /** An object URL of the file. Lives in this tab's memory; never saved. */
  url: string;
  /** Where the card will be born, in canvas coordinates. */
  position: { x: number; y: number };
};

export type UploadFailure = Extract<UploadOutcome, { ok: false }>["reason"];

export type ImageGesture = {
  images: readonly PreparedImage[];
  origin: UploadOrigin;
  /** The moment of the gesture — it names a pasted image, and every image of one gesture shares it. */
  moment: Date;
  /** The point of the gesture, already in canvas coordinates. */
  position: { x: number; y: number };
};

export type GestureOutcome = {
  /** The cards that were born, in the order of the files. */
  placed: string[];
  /** What did not get in, and why — in the order of the files. */
  failed: { image: PreparedImage; reason: UploadFailure }[];
};

/**
 * Shows the previews, sends the files one after the other, and turns each one
 * that arrives into a card.
 *
 * One after the other: five files of up to 10 MB in parallel would race for the
 * same connection, and the order of the cards should be the order of the files.
 *
 * Never throws — `uploadPreparedImage` does not, and nothing else here talks to
 * the network.
 */
export async function sendImagesToCanvas(
  gesture: ImageGesture,
  showPreviews: (previews: UploadPreview[]) => void,
): Promise<GestureOutcome> {
  const canvas = useCanvasStore.getState();
  const projectId = canvas.projectId;
  const slots = imageInputSlots(canvas.nodes, gesture.position, gesture.images.length);

  let previews: UploadPreview[] = gesture.images.map((image, index) => ({
    key: crypto.randomUUID(),
    url: URL.createObjectURL(image.file),
    position: slots[index],
  }));

  const mine = [...previews];

  showPreviews(previews);

  const sent: { assetId: string; url: string }[] = [];
  const failed: GestureOutcome["failed"] = [];

  for (const [index, image] of gesture.images.entries()) {
    const preview = mine[index];
    const result = await uploadPreparedImage(image, uploadLabel(image.file, gesture.origin, gesture.moment));

    if (result.ok) {
      sent.push({ assetId: result.item.assetId, url: preview.url });
      continue;
    }

    // The upload failed, and what it had put in Storage is already gone. The
    // picture goes with it: a preview left standing would promise a card.
    failed.push({ image, reason: result.reason });
    URL.revokeObjectURL(preview.url);
    previews = previews.filter((entry) => entry.key !== preview.key);
    showPreviews(previews);
  }

  // Another project is on the canvas now: the tab was switched while the files
  // travelled. The store holds THAT project's graph, and a card added here would
  // land in it. The images are in the gallery — that part succeeded — and the
  // canvas they were pasted on is no longer the one on screen.
  if (useCanvasStore.getState().projectId !== projectId) {
    for (const entry of sent) URL.revokeObjectURL(entry.url);
    showPreviews([]);

    return { placed: [], failed };
  }

  // The cards first, the previews after: for an instant both are on the same
  // spot showing the same picture, which looks like nothing happening. The other
  // order would be a frame with no picture at all.
  for (const entry of sent) useLocalPreviews.getState().offer(entry.assetId, entry.url);

  const placed = useCanvasStore.getState().addImageInputs({
    assetIds: sent.map((entry) => entry.assetId),
    position: gesture.position,
  });

  showPreviews([]);

  return { placed, failed };
}

/**
 * What the canvas says when a gesture ends.
 *
 * Never truncated in silence: when only some of the images got in, the sentence
 * says how many did and that the rest did not.
 */
export function gestureVerdict(total: number, outcome: GestureOutcome): GestureStatus {
  const placed = outcome.placed.length;

  if (placed === total) return { tone: "done", text: copy.done(placed) };

  if (placed > 0) return { tone: "refused", text: copy.partial(placed, total) };

  const last = outcome.failed.at(-1);

  return { tone: "refused", text: last ? failureMessage(last.reason) : copy.failed };
}
