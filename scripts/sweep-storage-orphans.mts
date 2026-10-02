/**
 * The orphan sweep — objects in the `assets` bucket that no row in `assets`
 * accounts for.
 *
 *   npm run sweep:orphans                                   report only (the default)
 *   npm run sweep:orphans -- --saida <arquivo.json>         report, and save the list
 *   npm run sweep:orphans -- --apagar <arquivo.json> --confirmar <código>
 *
 * Born on 2026-10-01, from the owner's decision of the same day. On 27/09 an
 * upload that hung left two objects in the bucket with no row — the file and its
 * thumbnail —, and nothing in the product could see them, let alone remove them.
 * The cleanup on the failure path (`src/lib/assets/discard-upload.ts`) stops new
 * ones at the source; what it cannot reach by construction is what this finds:
 *
 *   a tab closed between the upload and the registration — no page code runs;
 *   a registration call that never answered — nobody knew whether a row existed.
 *
 * ---------------------------------------------------------------------------
 * What an orphan is
 * ---------------------------------------------------------------------------
 *
 * An object is accounted for when a row of `assets` points at it, or when it is
 * the thumbnail (`<path>.thumb.webp`) of one that is. Everything else has no
 * owner in the database. Of those, only what is OLDER THAN 24 HOURS is an
 * orphan: a younger object may be an upload still on its way to its row, and
 * the report lists it apart, never as something to delete.
 *
 * The report also counts the opposite — a row whose file is missing. That is not
 * an orphan and nothing here touches it, but it is the failure that shows on
 * screen as a broken frame, and a sweep that only looked one way would never
 * say so.
 *
 * ---------------------------------------------------------------------------
 * Deleting is a second, separate act — and it is the owner's
 * ---------------------------------------------------------------------------
 *
 * The default run reads and prints. Deleting needs the list a previous report
 * SAVED, plus the confirmation code that report printed — so what goes is what
 * somebody looked at, never whatever the bucket holds at the moment of the
 * command. And every path is checked again right before it is removed: still
 * there, still without a row, still older than 24 hours, still the same object
 * (same creation time and size). Anything that no longer matches is skipped and
 * named. Running it twice removes nothing the second time.
 *
 * The service-role key comes from the environment (`--env-file-if-exists`), is
 * sent only to this project's own Supabase, and is never printed: every line of
 * output passes through `redact`.
 */

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const BUCKET = "assets";

/** Younger than this, an object with no row may be an upload still in progress. */
export const MIN_AGE_HOURS = 24;

/**
 * The rule of `src/lib/assets/thumbnail-path.ts`, restated — a script run by
 * plain Node cannot import the app's modules. `assertSameThumbnailRule` reads
 * that file at start-up and refuses to run if the two ever disagree: a rule in
 * two places is a rule that drifts, and this one decides what gets deleted.
 */
const THUMBNAIL_SUFFIX = ".thumb.webp";

const PAGE = 1000;

export type StoredObject = {
  /** The full path inside the bucket. */
  name: string;
  createdAt: string;
  bytes: number | null;
};

export type Sweep = {
  objects: number;
  rows: number;
  /** No row, and older than the minimum age — what a deletion may take. */
  orphans: StoredObject[];
  /** No row, but too young to judge. Listed, never deleted. */
  recent: StoredObject[];
  /** The opposite failure: a row whose file is not in the bucket. */
  rowsWithoutFile: string[];
};

/** Whether a row accounts for `name` — as the file itself, or as the thumbnail of one. */
function isAccountedFor(name: string, registered: ReadonlySet<string>): boolean {
  if (registered.has(name)) return true;

  return name.endsWith(THUMBNAIL_SUFFIX) && registered.has(name.slice(0, -THUMBNAIL_SUFFIX.length));
}

/**
 * The whole judgement, pure: what is in the bucket, what the table knows, and
 * the moment of asking. No network, so a harness proves every branch.
 */
export function classify(
  objects: readonly StoredObject[],
  registeredPaths: readonly string[],
  now: Date,
): Sweep {
  const registered = new Set(registeredPaths);
  const present = new Set(objects.map((object) => object.name));
  const youngest = now.getTime() - MIN_AGE_HOURS * 60 * 60 * 1000;

  const orphans: StoredObject[] = [];
  const recent: StoredObject[] = [];

  for (const object of objects) {
    if (isAccountedFor(object.name, registered)) continue;

    const created = Date.parse(object.createdAt);

    // An unreadable date is not "old": what cannot be dated cannot be judged.
    if (Number.isFinite(created) && created <= youngest) orphans.push(object);
    else recent.push(object);
  }

  const byName = (a: StoredObject, b: StoredObject) => a.name.localeCompare(b.name);

  return {
    objects: objects.length,
    rows: registeredPaths.length,
    orphans: orphans.sort(byName),
    recent: recent.sort(byName),
    rowsWithoutFile: registeredPaths.filter((path) => !present.has(path)).sort(),
  };
}

/** What ties a deletion to the exact list a report showed. */
export function confirmationCode(orphans: readonly StoredObject[]): string {
  const lines = orphans.map((object) => `${object.name}\t${object.createdAt}\t${object.bytes ?? ""}`).sort();

  return createHash("md5").update(lines.join("\n")).digest("hex").slice(0, 12);
}

export type Manifest = {
  bucket: string;
  scannedAt: string;
  minAgeHours: number;
  code: string;
  orphans: StoredObject[];
};

export type Skipped = { name: string; why: string };

export type DeletionPlan = { remove: StoredObject[]; skipped: Skipped[] };

/**
 * What of a saved report may still be removed NOW.
 *
 * Each path is judged again against the bucket and the table as they are at
 * this moment — the report may be hours old, and in those hours a path may have
 * been registered, replaced or removed.
 */
export function planDeletion(manifest: Manifest, current: Sweep, objects: readonly StoredObject[]): DeletionPlan {
  const stillOrphan = new Map(current.orphans.map((object) => [object.name, object]));
  const present = new Map(objects.map((object) => [object.name, object]));

  const remove: StoredObject[] = [];
  const skipped: Skipped[] = [];

  for (const listed of manifest.orphans) {
    const now = present.get(listed.name);

    if (!now) {
      skipped.push({ name: listed.name, why: "já não existe no bucket" });
      continue;
    }

    if (now.createdAt !== listed.createdAt || now.bytes !== listed.bytes) {
      skipped.push({ name: listed.name, why: "não é mais o mesmo objeto do relatório (data ou tamanho mudaram)" });
      continue;
    }

    if (!stillOrphan.has(listed.name)) {
      skipped.push({ name: listed.name, why: "deixou de ser órfão — ganhou linha em assets" });
      continue;
    }

    remove.push(now);
  }

  return { remove, skipped };
}

// ---------------------------------------------------------------------------
// I/O — the only part that talks to Supabase
// ---------------------------------------------------------------------------

/** Every object of the bucket, folder by folder. A folder is an entry without an id. */
async function listObjects(supabase: SupabaseClient, prefix = ""): Promise<StoredObject[]> {
  const found: StoredObject[] = [];

  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list(prefix, { limit: PAGE, offset, sortBy: { column: "name", order: "asc" } });

    if (error || !data) throw new Error(`não deu para listar «${prefix || "/"}»: ${error?.message ?? "sem resposta"}`);

    for (const entry of data) {
      const name = prefix ? `${prefix}/${entry.name}` : entry.name;

      if (entry.id === null) {
        found.push(...(await listObjects(supabase, name)));
      } else {
        const size = (entry.metadata as { size?: unknown } | null)?.size;

        found.push({ name, createdAt: entry.created_at ?? "", bytes: typeof size === "number" ? size : null });
      }
    }

    if (data.length < PAGE) return found;
  }
}

/** Every path a row of `assets` points at, in this bucket. */
async function listRegisteredPaths(supabase: SupabaseClient): Promise<string[]> {
  const paths: string[] = [];

  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("assets")
      .select("storage_path")
      .eq("storage_bucket", BUCKET)
      .order("storage_path", { ascending: true })
      .range(from, from + PAGE - 1);

    if (error || !data) throw new Error(`não deu para ler a tabela assets: ${error?.message ?? "sem resposta"}`);

    for (const row of data as { storage_path: string }[]) paths.push(row.storage_path);

    if (data.length < PAGE) return paths;
  }
}

async function scan(supabase: SupabaseClient): Promise<{ sweep: Sweep; objects: StoredObject[] }> {
  // The table BEFORE the bucket. An upload that lands between the two reads
  // then shows as an object with no row — young, so it goes to `recent` and is
  // never listed for deletion. Read the other way round it would show as a row
  // whose file is missing: a false alarm in the one count that means something
  // is broken.
  const registered = await listRegisteredPaths(supabase);
  const objects = await listObjects(supabase);

  return { sweep: classify(objects, registered, new Date()), objects };
}

// ---------------------------------------------------------------------------
// The report
// ---------------------------------------------------------------------------

const bytesOf = (objects: readonly StoredObject[]) => objects.reduce((sum, object) => sum + (object.bytes ?? 0), 0);
const thousands = (value: number) => value.toLocaleString("pt-BR");
const when = (iso: string) => (iso ? `${iso.slice(0, 16).replace("T", " ")} UTC` : "sem data");

function describe(objects: readonly StoredObject[]): string[] {
  return objects.map(
    (object) => `    ${when(object.createdAt)}  ${thousands(object.bytes ?? 0).padStart(11)} bytes  ${object.name}`,
  );
}

export function reportLines(sweep: Sweep): string[] {
  const lines = [
    `bucket «${BUCKET}»: ${thousands(sweep.objects)} objetos · ${thousands(sweep.rows)} linhas em assets`,
    "",
    `ÓRFÃOS — sem linha em assets, há mais de ${MIN_AGE_HOURS} h: ${sweep.orphans.length} objeto(s) · ${thousands(bytesOf(sweep.orphans))} bytes`,
    ...describe(sweep.orphans),
    "",
    `recentes — sem linha, há menos de ${MIN_AGE_HOURS} h (pode ser um envio em curso; nunca entram na lista): ${sweep.recent.length}`,
    ...describe(sweep.recent),
    "",
    `o inverso — linhas de assets cujo arquivo NÃO está no bucket: ${sweep.rowsWithoutFile.length}`,
    ...sweep.rowsWithoutFile.map((path) => `    ${path}`),
  ];

  if (sweep.orphans.length > 0) {
    lines.push("", `código de confirmação desta lista: ${confirmationCode(sweep.orphans)}`);
  }

  return lines;
}

// ---------------------------------------------------------------------------
// The command line
// ---------------------------------------------------------------------------

function argument(flag: string): string | null {
  const index = process.argv.indexOf(flag);

  return index === -1 ? null : (process.argv[index + 1] ?? "");
}

function assertSameThumbnailRule(): void {
  const source = resolve(fileURLToPath(import.meta.url), "../../src/lib/assets/thumbnail-path.ts");
  const text = readFileSync(source, "utf8");

  if (!text.includes(`export const THUMBNAIL_SUFFIX = "${THUMBNAIL_SUFFIX}";`)) {
    throw new Error(
      "a regra do caminho da miniatura mudou em src/lib/assets/thumbnail-path.ts e este script não acompanhou — " +
        "a varredura não roda com uma regra diferente da do produto",
    );
  }
}

/** The key value never reaches a line of output, whatever message carries it. */
function redact(text: string): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  return key && key.length >= 8 ? text.split(key).join("<CHAVE>") : text;
}

function say(...lines: string[]): void {
  for (const line of lines) console.log(redact(line));
}

async function main(): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    say("NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não estão no ambiente (.env.local).");
    process.exitCode = 1;
    return;
  }

  assertSameThumbnailRule();

  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const manifestPath = argument("--apagar");

  // ── Report ────────────────────────────────────────────────────────────────
  if (manifestPath === null) {
    const { sweep } = await scan(supabase);
    const savePath = argument("--saida");

    say("Varredura de órfãos do Storage — SÓ RELATÓRIO: nada é apagado.", "", ...reportLines(sweep));

    if (savePath) {
      const manifest: Manifest = {
        bucket: BUCKET,
        scannedAt: new Date().toISOString(),
        minAgeHours: MIN_AGE_HOURS,
        code: confirmationCode(sweep.orphans),
        orphans: sweep.orphans,
      };

      writeFileSync(resolve(savePath), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
      say("", `lista salva em: ${resolve(savePath)}`);
    }

    return;
  }

  // ── Deletion — only what a saved report listed, and only with its code ────
  const manifest = JSON.parse(readFileSync(resolve(manifestPath), "utf8")) as Manifest;
  const given = argument("--confirmar");

  if (manifest.bucket !== BUCKET || given !== confirmationCode(manifest.orphans) || given !== manifest.code) {
    say(
      "RECUSADO: o código de confirmação não é o desta lista. Nada foi apagado.",
      "O código é o que o relatório imprimiu ao salvar a lista — e só o dono o usa.",
    );
    process.exitCode = 1;
    return;
  }

  const before = await scan(supabase);
  const plan = planDeletion(manifest, before.sweep, before.objects);

  say(
    `Apagando órfãos da lista de ${when(manifest.scannedAt)} — código ${manifest.code}.`,
    "",
    `antes:  ${thousands(before.sweep.objects)} objetos · ${before.sweep.orphans.length} órfão(s)`,
    `da lista (${manifest.orphans.length}): ${plan.remove.length} a apagar · ${plan.skipped.length} pulado(s)`,
    ...plan.skipped.map((skipped) => `    pulado: ${skipped.name} — ${skipped.why}`),
  );

  if (plan.remove.length > 0) {
    const { data, error } = await supabase.storage.from(BUCKET).remove(plan.remove.map((object) => object.name));

    if (error) {
      say("", `O Storage recusou a remoção: ${error.message}. Rode o relatório de novo para ver o que ficou.`);
      process.exitCode = 1;
      return;
    }

    say(...describe(plan.remove), `apagados pelo Storage: ${data?.length ?? 0}`);
  }

  const after = await scan(supabase);

  say(
    "",
    `depois: ${thousands(after.sweep.objects)} objetos · ${after.sweep.orphans.length} órfão(s) · ` +
      `${after.sweep.rowsWithoutFile.length} linha(s) sem arquivo`,
  );

  // A deletion that created a row without a file would be this script's own
  // defect — said out loud, and with a failing exit code.
  if (after.sweep.rowsWithoutFile.length > before.sweep.rowsWithoutFile.length) {
    say("⚠ o número de linhas sem arquivo AUMENTOU durante a remoção. Pare e confira antes de qualquer outro gesto.");
    process.exitCode = 1;
  }
}

// Run only as the entry point (`npm run sweep:orphans`), so a harness can
// import `classify` and `planDeletion` without touching the bucket.
const isEntryPoint =
  process.argv[1] !== undefined &&
  resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase();

if (isEntryPoint) {
  main().catch((error: unknown) => {
    say(`A varredura parou: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}
