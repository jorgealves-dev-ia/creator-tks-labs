import "server-only";

import type { createSupabaseServerClient } from "@/lib/supabase/server";

import { SNIFF_BYTES } from "./image-bytes";

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

/** Long enough for one request, short enough to be worthless afterwards. */
const HEAD_URL_TTL_SECONDS = 60;

/**
 * The whole read — connection and sixteen bytes — must finish inside this, or
 * the head counts as unreadable and the registration is refused. An upload that
 * waits forever on its own check is worse than one refused with a sentence.
 */
const HEAD_TIMEOUT_MS = 10_000;

/**
 * The first bytes of an object already in Storage — what the server reads
 * before it believes the type a browser declared (F1a).
 *
 * Asked with a `Range` header, the same one the scan of 26/09 used on all 104
 * files: the check costs sixteen bytes of egress, not the file. If a server
 * ever ignores the range and starts sending the whole thing, the first chunk
 * is read and the connection is cancelled.
 *
 * Signed with the caller's own session, so the Storage policy applies: a path
 * outside the caller's folder produces no link, and no bytes.
 *
 * Null means "could not read", never "read and found nothing" — the caller
 * refuses both, but only the second is a mismatch.
 */
export async function readStoredHead(
  supabase: SupabaseServerClient,
  storagePath: string,
): Promise<Uint8Array | null> {
  const { data } = await supabase.storage
    .from("assets")
    .createSignedUrl(storagePath, HEAD_URL_TTL_SECONDS);

  if (!data?.signedUrl) return null;

  // ABORTED, never awaited-cancel — the lesson of the live validation of 27/09.
  // The first version ended with `await reader.cancel()`, which returned at once
  // in plain Node (the harness) and HUNG FOREVER inside the Next server: there
  // the response body is teed for fetch caching/deduplication, and by the Streams
  // spec cancelling one branch of a tee only settles once the other branch is
  // cancelled too. The upload sat on «Enviando 1 imagem…» with the file already
  // in Storage and no row ever written. Aborting the request stops the transfer
  // without waiting on anybody; the timer makes a stuck read a refusal.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HEAD_TIMEOUT_MS);

  try {
    const response = await fetch(data.signedUrl, {
      headers: { Range: `bytes=0-${SNIFF_BYTES - 1}` },
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok || !response.body) return null;

    const reader = response.body.getReader();
    const head = new Uint8Array(SNIFF_BYTES);
    let filled = 0;

    while (filled < SNIFF_BYTES) {
      const { done, value } = await reader.read();

      if (done || !value) break;

      const take = Math.min(value.length, SNIFF_BYTES - filled);
      head.set(value.subarray(0, take), filled);
      filled += take;
    }

    return head.subarray(0, filled);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
}
