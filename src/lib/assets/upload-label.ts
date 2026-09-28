/**
 * The gallery label of an image someone sends — the rule the owner set on
 * 27/09/2026 for the F1a.
 *
 *   a file with a name of its own — chosen in the button, dragged, or copied
 *   in the Explorer and pasted — keeps that name, without the extension, as
 *   it always did;
 *
 *   an image WITHOUT a name — a screenshot, an image copied from a web page —
 *   becomes «Colada · dd/mm hh:mm:ss», in the LOCAL time of whoever pasted it.
 *
 * ---------------------------------------------------------------------------
 * The label is only a gallery label
 * ---------------------------------------------------------------------------
 *
 * It lives in `assets.label` and nowhere else: the search of the gallery finds
 * by it, the card on the canvas holds an asset id and never a name, the compiled
 * prompt never reads it, and it never fills the Nome of a product card. That is
 * the other half of the owner's rule, and it holds by construction — nothing
 * on the way to a provider selects this column.
 *
 * ---------------------------------------------------------------------------
 * Why local time, and why it is computed HERE
 * ---------------------------------------------------------------------------
 *
 * The person reading the gallery knows when they pasted in their own clock. The
 * server runs in UTC: at 23:30 in São Paulo it is already 02:30 of the next day
 * there, and a label written by the server would name a day that, for the
 * person, has not started. So the label is made in the browser, from the moment
 * of the gesture, and travels to the server as text.
 *
 * ---------------------------------------------------------------------------
 * How "without a name" is recognised
 * ---------------------------------------------------------------------------
 *
 * The clipboard has no file name for a bitmap, and the browsers invent one:
 * Chrome, Edge and Firefox all hand the page `image.png`. That invented name is
 * what is recognised — only on PASTE, the one gesture where it can appear. A
 * file chosen in the button or dragged in always carries the name it has on the
 * disk, even if that name happens to be `image.png`.
 *
 * Known limit, accepted: a file really named `image.png`, copied in the
 * Explorer and pasted, reads as nameless and is labelled «Colada · …». The
 * label is a caption for the search, not an identity — nothing else depends on
 * it.
 */

export type UploadOrigin = "botao" | "soltar" | "colar";

export const PASTED_LABEL_PREFIX = "Colada";

/** The name a browser gives a clipboard bitmap. Matched on the whole name, with any image extension. */
const CLIPBOARD_PLACEHOLDER = /^image\.(png|jpe?g|webp|gif|bmp|tiff?)$/i;

/** The `assets_label_length` constraint. */
const MAX_LABEL = 200;

const two = (value: number) => String(value).padStart(2, "0");

/** «Colada · 27/09 14:32:05» — day, month and time in the clock of whoever pasted. */
export function pastedLabel(moment: Date): string {
  const date = `${two(moment.getDate())}/${two(moment.getMonth() + 1)}`;
  const time = `${two(moment.getHours())}:${two(moment.getMinutes())}:${two(moment.getSeconds())}`;

  return `${PASTED_LABEL_PREFIX} · ${date} ${time}`;
}

/** Whether a pasted file came without a name of its own. */
export function isUnnamedPaste(name: string): boolean {
  const trimmed = name.trim();

  return trimmed === "" || CLIPBOARD_PLACEHOLDER.test(trimmed);
}

/**
 * The label for one file, given how it arrived and the moment of the gesture.
 *
 * `moment` is passed in, never read from the clock here: every image of one
 * gesture shares the gesture's moment, and a harness can prove the rule at any
 * hour without waiting for it.
 */
export function uploadLabel(file: { name: string }, origin: UploadOrigin, moment: Date): string {
  if (origin === "colar" && isUnnamedPaste(file.name)) {
    return pastedLabel(moment);
  }

  // The name the file already had, as the button always did: nobody has to
  // think of a caption, and the search finds it by the word the person
  // themselves put on the disk.
  const label = file.name.replace(/\.[^.]+$/, "").trim();

  return label.length > MAX_LABEL ? `${label.slice(0, MAX_LABEL - 1)}…` : label;
}
