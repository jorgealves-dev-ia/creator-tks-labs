/**
 * Whether a pasted TEXT is the address of an image, rather than an image.
 *
 * ---------------------------------------------------------------------------
 * Why the canvas needs to tell (01/10/2026)
 * ---------------------------------------------------------------------------
 *
 * The right-click menu of a browser offers two things side by side: «Copiar
 * imagem» and «Copiar endereço da imagem». The first puts a picture on the
 * clipboard, and pasting it on the canvas makes a card. The second puts a line
 * of text — and the canvas takes no text, so that paste did nothing and said
 * nothing. Someone who picked the wrong one of two neighbouring items was left
 * looking at a canvas that had apparently ignored them.
 *
 * The canvas still does not fetch the address: that would be a second road in,
 * and a server reaching for third-party URLs — the same reason a link dragged
 * from another tab is refused in words (F1a). What changes is that the paste
 * now gets its sentence too.
 *
 * ---------------------------------------------------------------------------
 * What counts
 * ---------------------------------------------------------------------------
 *
 * One address and nothing else: no spaces, no line breaks in the middle, and one
 * of the schemes «Copiar endereço da imagem» can produce — a web address, an
 * inline `data:image/…`, a `blob:` or a `file:`. Whether it ENDS in `.png` is
 * not asked: the addresses of a marketplace's pictures rarely do.
 *
 * Anything else — a sentence, a sentence with a link in it, a bare domain — is
 * plain text pasted where text has no use, and stays the silence it always was:
 * a message for every stray paste would be noise.
 *
 * Pure: it takes the text and answers.
 */
const ADDRESS = /^(https?:\/\/|data:image\/|blob:|file:\/\/)\S+$/i;

export function isPastedAddress(text: string): boolean {
  return ADDRESS.test(text.trim());
}
