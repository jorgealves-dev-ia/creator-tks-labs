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
 * THE INVARIANT this stands on — and the guard that checks it every run
 * ---------------------------------------------------------------------------
 *
 * "No row points at it" is only true if the sweep looks at EVERY place a row can
 * point from. Today there is one: `assets.storage_path`. Every other table
 * reaches a file through an asset id — a foreign key to `assets(id)` —, and an
 * object with no row has no id for anything to hold.
 *
 * That is a fact about the schema as it is, and a schema changes. The day
 * somebody adds a column that stores a path — a product photo, an avatar, a
 * cover —, a file in use would be listed here as an orphan, with a confirmation
 * code ready to delete it. So the sweep does not take the invariant on trust:
 * before it lists anything, it reads every other text and jsonb column of
 * `public` looking for a bucket path, and if it finds one it REFUSES — it says
 * where, lists nothing and deletes nothing. A column that stores a path enters
 * the sweep by being declared in `PATH_COLUMNS`, below, and in no other way.
 *
 * (On 01/10/2026 the owner asked, before approving the first deletion, which
 * tables the sweep had crossed. The answer was "one" — and it was only safe
 * because a search of the whole database, made by hand that day, said so. This
 * guard is that search, made every time.)
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

export type PathColumn = {
  table: string;
  column: string;
  /** The column that says which bucket the path belongs to, when the table has one. */
  bucketColumn: string | null;
};

/**
 * Every column of the database that stores the path of a file in Storage.
 *
 * ONE, today. A new column that stores a path is added HERE — that is what
 * "entering the sweep" means: its values become paths that account for an
 * object, and the guard stops refusing because of it.
 */
export const PATH_COLUMNS: readonly PathColumn[] = [
  { table: "assets", column: "storage_path", bucketColumn: "storage_bucket" },
];

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
// The guard of the invariant
// ---------------------------------------------------------------------------

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

const escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * What a path of THIS bucket looks like, as a regular expression — built from
 * what the bucket actually holds: `<owner>/<folder>/…`.
 *
 * The owner is a user id, so it is matched by shape (any uuid), and the folder
 * by name (the folders that exist). Both are needed: `generations.params` is
 * full of uuids followed by a slash — the addresses of the provider's queue,
 * `…/requests/<uuid>/status` —, and they are not paths of anything here.
 *
 * The same expression is run by Postgres (text columns) and by this script
 * (structured ones), so it stays inside what both understand.
 *
 * Null when the bucket is empty: there is nothing to recognise, and nothing to
 * sweep.
 */
export function bucketPathPattern(objects: readonly StoredObject[]): string | null {
  const owners = new Set<string>();
  const folders = new Set<string>();
  const loose = new Set<string>();

  for (const { name } of objects) {
    const parts = name.split("/");

    if (parts.length >= 3) {
      owners.add(parts[0]);
      folders.add(parts[1]);
    } else {
      // Right under the root, or right under an owner: recognised by its whole name.
      loose.add(name);
    }
  }

  const alternatives: string[] = [];

  if (folders.size > 0) {
    const isUuid = new RegExp(`^${UUID}$`);
    const named = [...owners].filter((owner) => !isUuid.test(owner)).sort().map(escapeRegex);
    const anyOwner = [...([...owners].some((owner) => isUuid.test(owner)) ? [UUID] : []), ...named];

    alternatives.push(`(?:${anyOwner.join("|")})/(?:${[...folders].sort().map(escapeRegex).join("|")})/`);
  }

  alternatives.push(...[...loose].sort().map(escapeRegex));

  return alternatives.length > 0 ? alternatives.join("|") : null;
}

export type ColumnRef = {
  table: string;
  column: string;
  /** `text`: the database matches. `structured` (json, jsonb, arrays): read and matched here. */
  kind: "text" | "structured";
};

export type Stray = { table: string; column: string; rows: number; sample: string };

export type GuardVerdict =
  | { ok: true; columns: number; tables: number; known: number }
  | { ok: false; reason: "stray"; stray: Stray[] }
  /** The check itself could not be trusted — which is a refusal, never a pass. */
  | { ok: false; reason: "blind"; detail: string };

/** What the sweep needs from the outside world. The real one talks to Supabase; a harness passes a simulation. */
export type Io = {
  listObjects(): Promise<StoredObject[]>;
  /** Every value of a declared path column, for this bucket. */
  readPaths(column: PathColumn): Promise<string[]>;
  /** Every column of `public` that can hold a path: text-like and structured. */
  listColumns(): Promise<ColumnRef[]>;
  /** How many rows of a TEXT column match — the database does the matching — and one of them. */
  matchText(ref: ColumnRef, pattern: string): Promise<{ rows: number; sample: string | null }>;
  /** Every non-null value of a STRUCTURED column, as JSON text — with how many rows were read and how many exist. */
  readStructured(ref: ColumnRef): Promise<{ values: string[]; rowsRead: number; tableRows: number }>;
  removeObjects(names: string[]): Promise<number>;
};

const snippet = (text: string, at: number) => text.slice(Math.max(0, at - 30), at + 90).replace(/\s+/g, " ");

/**
 * Checks the invariant: a path of the bucket appears in the declared columns
 * and NOWHERE else in `public`.
 *
 * Two ways to fail, and both stop the sweep:
 *
 *   stray   a path was found in another column. The sweep does not know that
 *           column, so its "no row points at it" would be false.
 *   blind   the check could not see — a declared column that does not exist, a
 *           table not read to the end, or the CONTROL failing: the pattern is
 *           run first against the declared columns, where the paths are known
 *           to be, and it has to find them. A search that finds nothing where
 *           something certainly is proves nothing where it finds nothing.
 */
export async function guardPathColumns(
  io: Io,
  objects: readonly StoredObject[],
  registered: ReadonlyMap<PathColumn, readonly string[]>,
): Promise<GuardVerdict> {
  const pattern = bucketPathPattern(objects);

  if (pattern === null) return { ok: true, columns: 0, tables: 0, known: 0 };

  const columns = await io.listColumns();
  const present = new Set(objects.map((object) => object.name));
  const declared = new Set<string>();
  let known = 0;

  for (const [pathColumn, paths] of registered) {
    const name = `${pathColumn.table}.${pathColumn.column}`;
    const ref = columns.find((column) => column.table === pathColumn.table && column.column === pathColumn.column);

    declared.add(name);

    if (!ref || ref.kind !== "text") {
      return { ok: false, reason: "blind", detail: `a coluna declarada ${name} não existe em public como coluna de texto` };
    }

    // The control. Only the paths whose file exists are owed a match: a row
    // whose file is gone may sit in a folder the bucket no longer has, and that
    // is the report's finding, not a reason to stop.
    const expected = paths.filter((path) => present.has(path)).length;
    const { rows } = await io.matchText(ref, pattern);

    if (rows < expected) {
      return {
        ok: false,
        reason: "blind",
        detail: `o padrão reconheceu ${rows} de ${expected} caminhos que ESTÃO em ${name} — uma busca que não acha o que existe não prova nada`,
      };
    }

    known += rows;
  }

  const regex = new RegExp(pattern);
  const others = columns.filter((column) => !declared.has(`${column.table}.${column.column}`));
  const stray: Stray[] = [];

  for (const ref of others) {
    if (ref.kind === "text") {
      const { rows, sample } = await io.matchText(ref, pattern);

      if (rows > 0) {
        const text = sample ?? "";

        stray.push({ table: ref.table, column: ref.column, rows, sample: snippet(text, Math.max(0, text.search(regex))) });
      }

      continue;
    }

    const { values, rowsRead, tableRows } = await io.readStructured(ref);

    if (rowsRead !== tableRows) {
      return {
        ok: false,
        reason: "blind",
        detail: `${ref.table}.${ref.column}: li ${rowsRead} de ${tableRows} linhas — sem a tabela inteira, "não achei" não vale`,
      };
    }

    const hits = values.filter((value) => regex.test(value));

    if (hits.length > 0) {
      stray.push({ table: ref.table, column: ref.column, rows: hits.length, sample: snippet(hits[0], hits[0].search(regex)) });
    }
  }

  if (stray.length > 0) return { ok: false, reason: "stray", stray };

  return { ok: true, columns: others.length, tables: new Set(others.map((column) => column.table)).size, known };
}

const declaredNames = (pathColumns: readonly PathColumn[]) =>
  pathColumns.map((column) => `${column.table}.${column.column}`).join(", ");

function refusalLines(verdict: Extract<GuardVerdict, { ok: false }>, pathColumns: readonly PathColumn[]): string[] {
  if (verdict.reason === "blind") {
    return [
      "RECUSADO: não deu para conferir o invariante da varredura. Nada foi listado; nada foi apagado.",
      `    ${verdict.detail}`,
    ];
  }

  const known = pathColumns.length === 1 ? "a única coluna que a varredura conhece" : "as colunas que a varredura conhece";

  return [
    `RECUSADO: há caminho do bucket fora de ${declaredNames(pathColumns)} — ${known}.`,
    ...verdict.stray.map(
      (found) => `    ${found.table}.${found.column} — ${found.rows} linha(s) · ex.: «${found.sample}»`,
    ),
    "",
    "A varredura decide que um arquivo não tem dono olhando só para as colunas declaradas. Com caminho em outra",
    "coluna, um arquivo EM USO seria listado como órfão. Declare a coluna nova em PATH_COLUMNS",
    "(scripts/sweep-storage-orphans.mts) — ou corrija o dado — e rode de novo.",
    "Nada foi listado; nada foi apagado.",
  ];
}

// ---------------------------------------------------------------------------
// The scan
// ---------------------------------------------------------------------------

type Scan =
  | { ok: true; sweep: Sweep; objects: StoredObject[]; guard: Extract<GuardVerdict, { ok: true }> | null }
  | { ok: false; verdict: Extract<GuardVerdict, { ok: false }> };

async function scan(io: Io, pathColumns: readonly PathColumn[], now: Date, guarded: boolean): Promise<Scan> {
  // The table BEFORE the bucket. An upload that lands between the two reads
  // then shows as an object with no row — young, so it goes to `recent` and is
  // never listed for deletion. Read the other way round it would show as a row
  // whose file is missing: a false alarm in the one count that means something
  // is broken.
  const registered = new Map<PathColumn, string[]>();

  for (const column of pathColumns) registered.set(column, await io.readPaths(column));

  const objects = await io.listObjects();
  let guard: Extract<GuardVerdict, { ok: true }> | null = null;

  if (guarded) {
    const verdict = await guardPathColumns(io, objects, registered);

    if (!verdict.ok) return { ok: false, verdict };

    guard = verdict;
  }

  return { ok: true, sweep: classify(objects, [...registered.values()].flat(), now), objects, guard };
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

function guardLine(guard: Extract<GuardVerdict, { ok: true }> | null, pathColumns: readonly PathColumn[]): string {
  if (!guard || guard.columns === 0) return "invariante: bucket vazio — nada a conferir.";

  return (
    `invariante: caminho do bucket só em ${declaredNames(pathColumns)} — conferidas ${guard.columns} outras colunas ` +
    `de texto e jsonb, em ${guard.tables} tabelas de public: 0 com caminho. (controle: o padrão reconheceu ` +
    `${thousands(guard.known)} caminhos na coluna declarada.)`
  );
}

// ---------------------------------------------------------------------------
// The sweep itself — everything but the outside world
// ---------------------------------------------------------------------------

export type SweepRequest =
  | { mode: "report"; save: ((manifest: Manifest) => string) | null }
  | { mode: "delete"; manifest: Manifest; code: string | null };

/**
 * Runs a report or a deletion against `io`, speaking through `say`. Returns the
 * exit code.
 *
 * The guard runs before anything is listed and before anything is removed — in
 * both modes. A deletion checks it again on its own, even though the report
 * that produced its list already did: the list may be hours old.
 */
export async function runSweep(
  io: Io,
  request: SweepRequest,
  say: (...lines: string[]) => void,
  pathColumns: readonly PathColumn[] = PATH_COLUMNS,
  now: () => Date = () => new Date(),
): Promise<number> {
  if (request.mode === "report") {
    const result = await scan(io, pathColumns, now(), true);

    if (!result.ok) {
      say("Varredura de órfãos do Storage — SÓ RELATÓRIO: nada é apagado.", "", ...refusalLines(result.verdict, pathColumns));
      return 1;
    }

    say(
      "Varredura de órfãos do Storage — SÓ RELATÓRIO: nada é apagado.",
      "",
      guardLine(result.guard, pathColumns),
      "",
      ...reportLines(result.sweep),
    );

    if (request.save) {
      const saved = request.save({
        bucket: BUCKET,
        scannedAt: now().toISOString(),
        minAgeHours: MIN_AGE_HOURS,
        code: confirmationCode(result.sweep.orphans),
        orphans: result.sweep.orphans,
      });

      say("", `lista salva em: ${saved}`);
    }

    return 0;
  }

  // ── Deletion — only what a saved report listed, and only with its code ────
  const { manifest, code } = request;

  if (manifest.bucket !== BUCKET || code !== confirmationCode(manifest.orphans) || code !== manifest.code) {
    say(
      "RECUSADO: o código de confirmação não é o desta lista. Nada foi apagado.",
      "O código é o que o relatório imprimiu ao salvar a lista — e só o dono o usa.",
    );
    return 1;
  }

  const before = await scan(io, pathColumns, now(), true);

  if (!before.ok) {
    say(...refusalLines(before.verdict, pathColumns));
    return 1;
  }

  const plan = planDeletion(manifest, before.sweep, before.objects);

  say(
    `Apagando órfãos da lista de ${when(manifest.scannedAt)} — código ${manifest.code}.`,
    "",
    guardLine(before.guard, pathColumns),
    "",
    `antes:  ${thousands(before.sweep.objects)} objetos · ${before.sweep.orphans.length} órfão(s)`,
    `da lista (${manifest.orphans.length}): ${plan.remove.length} a apagar · ${plan.skipped.length} pulado(s)`,
    ...plan.skipped.map((skipped) => `    pulado: ${skipped.name} — ${skipped.why}`),
  );

  if (plan.remove.length > 0) {
    const removed = await io.removeObjects(plan.remove.map((object) => object.name));

    say(...describe(plan.remove), `apagados pelo Storage: ${removed}`);
  }

  // The invariant was checked a moment ago; this second look only counts.
  const after = await scan(io, pathColumns, now(), false);

  if (!after.ok) return 1;

  say(
    "",
    `depois: ${thousands(after.sweep.objects)} objetos · ${after.sweep.orphans.length} órfão(s) · ` +
      `${after.sweep.rowsWithoutFile.length} linha(s) sem arquivo`,
  );

  // A deletion that created a row without a file would be this script's own
  // defect — said out loud, and with a failing exit code.
  if (after.sweep.rowsWithoutFile.length > before.sweep.rowsWithoutFile.length) {
    say("⚠ o número de linhas sem arquivo AUMENTOU durante a remoção. Pare e confira antes de qualquer outro gesto.");
    return 1;
  }

  return 0;
}

// ---------------------------------------------------------------------------
// I/O — the only part that talks to Supabase
// ---------------------------------------------------------------------------

/** The types of a column that can hold a path. Everything else is skipped — numbers, dates, uuids, closed lists. */
const TEXT_FORMATS = new Set(["text", "character varying", "character", "name", "citext"]);
const STRUCTURED_FORMATS = new Set(["json", "jsonb"]);

type OpenApiColumn = { type?: string; format?: string; enum?: unknown[]; description?: string };

function supabaseIo(supabase: SupabaseClient, url: string, key: string): Io {
  /** The primary key of each table, read from the same description — to page a table in a stable order. */
  const keys = new Map<string, string[]>();

  async function listObjects(prefix = ""): Promise<StoredObject[]> {
    const found: StoredObject[] = [];

    for (let offset = 0; ; offset += PAGE) {
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .list(prefix, { limit: PAGE, offset, sortBy: { column: "name", order: "asc" } });

      if (error || !data) throw new Error(`não deu para listar «${prefix || "/"}»: ${error?.message ?? "sem resposta"}`);

      for (const entry of data) {
        const name = prefix ? `${prefix}/${entry.name}` : entry.name;

        // A folder is an entry without an id.
        if (entry.id === null) {
          found.push(...(await listObjects(name)));
        } else {
          const size = (entry.metadata as { size?: unknown } | null)?.size;

          found.push({ name, createdAt: entry.created_at ?? "", bytes: typeof size === "number" ? size : null });
        }
      }

      if (data.length < PAGE) return found;
    }
  }

  return {
    listObjects: () => listObjects(),

    async readPaths(column) {
      const paths: string[] = [];

      for (let from = 0; ; from += PAGE) {
        let query = supabase.from(column.table).select(column.column);

        if (column.bucketColumn) query = query.eq(column.bucketColumn, BUCKET);

        const { data, error } = await query.order(column.column, { ascending: true }).range(from, from + PAGE - 1);

        if (error || !data) {
          throw new Error(`não deu para ler ${column.table}.${column.column}: ${error?.message ?? "sem resposta"}`);
        }

        for (const row of data as unknown as Record<string, unknown>[]) {
          const value = row[column.column];

          if (typeof value === "string") paths.push(value);
        }

        if (data.length < PAGE) return paths;
      }
    },

    // PostgREST describes every table of `public` at its root — the one place
    // this script can learn the schema from without a function in the database.
    async listColumns() {
      const response = await fetch(`${url}/rest/v1/`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });

      if (!response.ok) throw new Error(`não deu para ler a descrição do banco (HTTP ${response.status})`);

      const spec = (await response.json()) as { definitions?: Record<string, { properties?: Record<string, OpenApiColumn> }> };
      const columns: ColumnRef[] = [];

      for (const [table, definition] of Object.entries(spec.definitions ?? {})) {
        const properties = Object.entries(definition.properties ?? {});

        keys.set(table, properties.filter(([, column]) => /<pk\/>/.test(column.description ?? "")).map(([name]) => name));

        for (const [column, described] of properties) {
          const format = described.format ?? "";

          // A closed list of values cannot hold a path.
          if (described.enum) continue;

          if (TEXT_FORMATS.has(format)) columns.push({ table, column, kind: "text" });
          else if (STRUCTURED_FORMATS.has(format) || format.endsWith("[]")) columns.push({ table, column, kind: "structured" });
        }
      }

      if (columns.length === 0) throw new Error("a descrição do banco veio sem nenhuma coluna de texto — não dá para conferir nada");

      return columns;
    },

    async matchText(ref, pattern) {
      const { count, error } = await supabase
        .from(ref.table)
        .select(ref.column, { count: "exact", head: true })
        .filter(ref.column, "match", pattern);

      if (error || count === null) {
        throw new Error(`não deu para procurar em ${ref.table}.${ref.column}: ${error?.message ?? "sem contagem"}`);
      }

      if (count === 0) return { rows: 0, sample: null };

      const { data } = await supabase.from(ref.table).select(ref.column).filter(ref.column, "match", pattern).limit(1);
      const first = (data as unknown as Record<string, unknown>[] | null)?.[0]?.[ref.column];

      return { rows: count, sample: typeof first === "string" ? first : null };
    },

    async readStructured(ref) {
      const values: string[] = [];
      const order = keys.get(ref.table) ?? [];
      let rowsRead = 0;
      let tableRows = 0;

      for (let from = 0; ; from += PAGE) {
        let query = supabase.from(ref.table).select(ref.column, { count: "exact" });

        for (const column of order) query = query.order(column, { ascending: true });

        const { data, count, error } = await query.range(from, from + PAGE - 1);

        if (error || !data || count === null) {
          throw new Error(`não deu para ler ${ref.table}.${ref.column}: ${error?.message ?? "sem resposta"}`);
        }

        tableRows = count;
        rowsRead += data.length;

        for (const row of data as unknown as Record<string, unknown>[]) {
          const value = row[ref.column];

          if (value !== null && value !== undefined) values.push(JSON.stringify(value));
        }

        if (data.length < PAGE) return { values, rowsRead, tableRows };
      }
    },

    async removeObjects(names) {
      const { data, error } = await supabase.storage.from(BUCKET).remove(names);

      if (error) throw new Error(`o Storage recusou a remoção: ${error.message}. Rode o relatório de novo para ver o que ficou.`);

      return data?.length ?? 0;
    },
  };
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

  const io = supabaseIo(createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }), url, key);
  const manifestPath = argument("--apagar");

  if (manifestPath === null) {
    const savePath = argument("--saida");

    process.exitCode = await runSweep(
      io,
      {
        mode: "report",
        save: savePath
          ? (manifest) => {
              writeFileSync(resolve(savePath), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

              return resolve(savePath);
            }
          : null,
      },
      say,
    );

    return;
  }

  process.exitCode = await runSweep(
    io,
    {
      mode: "delete",
      manifest: JSON.parse(readFileSync(resolve(manifestPath), "utf8")) as Manifest,
      code: argument("--confirmar"),
    },
    say,
  );
}

// Run only as the entry point (`npm run sweep:orphans`), so a harness can
// import the judgement, the guard and the flow without touching the bucket.
const isEntryPoint =
  process.argv[1] !== undefined &&
  resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase();

if (isEntryPoint) {
  main().catch((error: unknown) => {
    say(`A varredura parou: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}
