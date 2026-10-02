/**
 * How long each step of an upload may take before the upload is given up on —
 * 01/10/2026, the owner's decision on "the transfer has no ceiling of ours".
 *
 * ---------------------------------------------------------------------------
 * What was open
 * ---------------------------------------------------------------------------
 *
 * The only ceiling the upload had was the server's 10 seconds to read sixteen
 * bytes (`stored-head.ts`). Everything the BROWSER waits for had none: a network
 * that stalled mid-transfer left «Enviando…» on screen until the browser itself
 * gave up or the page was reloaded — and, on the canvas, every paste in the
 * meantime was refused with «Ainda enviando…».
 *
 * ---------------------------------------------------------------------------
 * A ceiling by size, because the library reports no progress
 * ---------------------------------------------------------------------------
 *
 * The decision asked for stall detection — no progress for a while, cancel —
 * and named its own fallback: *if the library does not report progress, a
 * generous ceiling proportional to the size*. It does not: `upload` in
 * `@supabase/storage-js` 2.112.2 is a plain `fetch`, with no progress event and
 * no way to pass an abort signal (`uploadOrUpdate`, read on 01/10). So the
 * ceiling is what there is.
 *
 * "Generous" is the whole design. The one outcome worse than waiting too long is
 * cancelling an upload that was still moving — the false refusal on a slow line
 * the owner asked about on 27/09. So the ceiling assumes a line far slower than
 * any that is usable, and adds a fixed minute on top for what even an empty file
 * costs (the connection, the server writing the object):
 *
 *   a 137 kB print    64 s
 *   1 MB              92 s
 *   10 MB (the max)   380 s — at 32 kB/s the file itself takes 320
 *
 * The price of generosity is slowness to notice: a dead line on a 10 MB photo is
 * only called dead after six minutes. Real progress detection would notice in
 * seconds, at any size; it needs the transfer to stop going through the library.
 *
 * ---------------------------------------------------------------------------
 * "Cancelled" means given up on, and cleaned after
 * ---------------------------------------------------------------------------
 *
 * With no abort signal, the request that was given up on is still out there.
 * `within` stops WAITING for it; whoever calls arranges for whatever it leaves
 * behind to be removed when it finally ends (`upload-client.ts`).
 */

/** A transfer slower than this is treated as not moving at all: 32 kB/s, about 256 kbit/s. */
const MIN_TRANSFER_BYTES_PER_SECOND = 32 * 1024;

/** What even an empty file costs: the connection and the server writing the object. */
const TRANSFER_FLOOR_MS = 60_000;

/** The thumbnail is at most 512 px of WebP — a few kilobytes. */
export const THUMBNAIL_CEILING_MS = 30_000;

/**
 * The registration is a Server Action bounded by the page's own `maxDuration`
 * of 60 s: past 75, the server has either answered or been stopped.
 */
export const REGISTER_CEILING_MS = 75_000;

/** Asking who is signed in — one small request, before anything is sent. */
export const SESSION_CEILING_MS = 20_000;

/** The ceiling for sending a file of `bytes` to Storage. */
export function transferCeilingMs(bytes: number): number {
  return TRANSFER_FLOOR_MS + Math.ceil((Math.max(0, bytes) / MIN_TRANSFER_BYTES_PER_SECOND) * 1000);
}

export type Bounded<T> = { timedOut: false; value: T } | { timedOut: true };

/**
 * Waits for `work` up to `ms`, and says which of the two ended first.
 *
 * It does not stop `work` — nothing here can. A rejection that arrives after the
 * ceiling is swallowed on purpose: by then nobody is listening, and it must not
 * surface as an unhandled rejection.
 */
export function within<T>(work: PromiseLike<T>, ms: number): Promise<Bounded<T>> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => resolve({ timedOut: true }), ms);

    Promise.resolve(work).then(
      (value) => {
        clearTimeout(timer);
        resolve({ timedOut: false, value });
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}
