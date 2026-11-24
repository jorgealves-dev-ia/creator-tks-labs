/**
 * The migration door — applies `supabase/migrations/` to the project's database
 * without the connection string ever reaching a chat, a log or a terminal.
 *
 *   npm run db:push                               what WOULD be applied — applies nothing
 *   npm run db:push -- --aplicar <version> [...]  applies, and ONLY those versions
 *   npm run db:push -- --autoteste                the redaction, proved offline
 *   npm run db:push -- --versao                   the CLI answers through the same runner
 *
 * Born on 2026-11-21. Until then every migration was applied by the owner, by
 * hand, because the command carries the database password. He asked to delegate
 * it. The MCP was read-only by design then (it writes data since the same night,
 * never schema) — and its migration tool would stamp the version with the time
 * it runs, not with the file's, so the remote history would drift from this
 * folder. For schema, the CLI is the only door.
 *
 * ---------------------------------------------------------------------------
 * Where the secret lives, and what this script does with it
 * ---------------------------------------------------------------------------
 *
 * `SUPABASE_DB_URL`, in `.env.local` — written there by the owner, once. The file
 * is gitignored and blocked from the agent's reading. This script receives the
 * value from the environment (`--env-file-if-exists=.env.local`), hands it to the
 * CLI as a process argument — no shell in between — and prints NOTHING that
 * contains it: every line of CLI output passes through `redact` before it is
 * shown. What it does print is where it is going: the project and the port.
 *
 * ---------------------------------------------------------------------------
 * The brakes
 * ---------------------------------------------------------------------------
 *
 * 1. It only talks to THIS project. The user of the connection string must be
 *    `postgres.<ref>`, with the ref read from `.mcp.json` — the same file that
 *    scopes the read-only MCP. A string from another project is refused offline.
 * 2. Session pooler only (port 5432): the direct connection is IPv6 and fails on
 *    this network; the transaction pooler (6543) cannot run migrations.
 * 3. A wrong shape is refused BEFORE any connection. Supabase bans an address
 *    after a few wrong passwords — a typo must not cost half an hour.
 * 4. Applying is a closed list (the house's R2.4, for the database): `--aplicar`
 *    names the versions, a dry run asks the database what it would push, and the
 *    push only happens if the two sets are the same. A stray file in the folder
 *    never rides along.
 */
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CLI = join(ROOT, "node_modules", "supabase", "dist", "supabase.js");
const ENV_NAME = "SUPABASE_DB_URL";
const HIDDEN = "<oculto>";
const DRY_RUN_TIMEOUT_MS = 150_000;

type Target = { url: string; secrets: string[]; ref: string; host: string };
type Check = { ok: true; target: Target } | { ok: false; why: string };
type Run = { code: number; output: string; timedOut: boolean };

function projectRef(): string | null {
  try {
    const text = readFileSync(join(ROOT, ".mcp.json"), "utf8");
    return /project_ref=([a-z0-9]+)/.exec(text)?.[1] ?? null;
  } catch {
    return null;
  }
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** Offline. Never includes the value in what it says. */
function checkTarget(raw: string | undefined, ref: string | null): Check {
  if (ref === null) return { ok: false, why: "não achei o project_ref no .mcp.json — sem ele não sei qual é o banco deste projeto" };
  if (raw === undefined || raw.trim() === "") {
    return { ok: false, why: `${ENV_NAME} não está no ambiente — falta a linha no .env.local` };
  }
  const value = raw.trim();
  if (/YOUR-PASSWORD|\[.*\]/i.test(value)) {
    return { ok: false, why: "a string ainda traz o marcador [YOUR-PASSWORD] (ou colchetes) — troque pelo valor da senha, sem os colchetes" };
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return { ok: false, why: "a string não é um endereço válido — confira aspas, espaços e se a senha tem caractere especial sem codificar" };
  }
  if (url.protocol !== "postgresql:" && url.protocol !== "postgres:") {
    return { ok: false, why: "a string precisa começar com postgresql://" };
  }
  if (!url.hostname.endsWith(".pooler.supabase.com")) {
    return { ok: false, why: "o endereço não é o do pooler do Supabase — use a opção «Session pooler», não a «Direct connection»" };
  }
  if (url.port !== "5432") {
    return { ok: false, why: `a porta é ${url.port || "(vazia)"} — a do Session pooler é 5432 (a 6543 é o Transaction pooler, que não aplica migration)` };
  }
  if (safeDecode(url.username) !== `postgres.${ref}`) {
    return { ok: false, why: `o usuário da string não é postgres.${ref} — ela é de outro projeto, ou não é a do pooler` };
  }
  if (url.password === "") return { ok: false, why: "a string está sem senha" };
  const secrets = [value, url.password, safeDecode(url.password)];
  return { ok: true, target: { url: value, secrets, ref, host: url.hostname } };
}

function redact(text: string, secrets: readonly string[]): string {
  let out = text;
  // Longest first: the whole string before the password inside it.
  for (const secret of [...new Set(secrets)].sort((a, b) => b.length - a.length)) {
    if (secret.length >= 4) out = out.split(secret).join(HIDDEN);
  }
  return out;
}

/** Runs the CLI with no shell, printing each line only after it was redacted. */
function runCli(args: readonly string[], secrets: readonly string[], timeoutMs: number | null): Promise<Run> {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [CLI, ...args], {
      cwd: ROOT,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    let output = "";
    let pending = "";
    let timedOut = false;
    const flush = (final: boolean) => {
      const lines = pending.split(/\r?\n/);
      pending = final ? "" : (lines.pop() ?? "");
      for (const line of lines) {
        const clean = redact(line, secrets);
        output += `${clean}\n`;
        if (clean.trim() !== "") console.log(`   ${clean}`);
      }
    };
    const onData = (chunk: Buffer) => {
      pending += chunk.toString("utf8");
      flush(false);
    };
    child.stdout.on("data", onData);
    child.stderr.on("data", onData);
    const timer = timeoutMs === null ? null : setTimeout(() => {
      timedOut = true;
      child.kill();
    }, timeoutMs);
    child.on("error", (error) => {
      if (timer) clearTimeout(timer);
      flush(true);
      console.log(`   ${redact(String(error), secrets)}`);
      resolve({ code: 1, output, timedOut });
    });
    child.on("close", (code) => {
      if (timer) clearTimeout(timer);
      flush(true);
      resolve({ code: code ?? 1, output, timedOut });
    });
  });
}

function versionsIn(text: string): string[] {
  return [...new Set([...text.matchAll(/\b(\d{14})_[A-Za-z0-9_]+\.sql\b/g)].map((match) => match[1] ?? ""))].sort();
}

function selfTest(): number {
  const password = "S3nh@ de/ensaio#42";
  const encoded = encodeURIComponent(password);
  const url = `postgresql://postgres.abcdefghijklmnopqrst:${encoded}@aws-0-sa-east-1.pooler.supabase.com:5432/postgres`;
  const check = checkTarget(url, "abcdefghijklmnopqrst");
  const secrets = check.ok ? check.target.secrets : [];
  const cases: [string, boolean][] = [
    ["a string de ensaio passa na conferência de forma", check.ok],
    ["a string inteira some de uma linha", !redact(`failed to connect to ${url}: timeout`, secrets).includes(encoded)],
    ["a senha codificada, sozinha, some", !redact(`password=${encoded}`, secrets).includes(encoded)],
    ["a senha decodificada, sozinha, some", !redact(`senha "${password}" recusada`, secrets).includes(password)],
    ["o que não é segredo fica", redact("Applying migration 20261002121933_product_readings.sql", secrets) === "Applying migration 20261002121933_product_readings.sql"],
    ["o marcador [YOUR-PASSWORD] é recusado", !checkTarget(url.replace(encoded, "[YOUR-PASSWORD]"), "abcdefghijklmnopqrst").ok],
    ["a string de outro projeto é recusada", !checkTarget(url, "zzzzzzzzzzzzzzzzzzzz").ok],
    ["a porta 6543 é recusada", !checkTarget(url.replace(":5432/", ":6543/"), "abcdefghijklmnopqrst").ok],
    ["a conexão direta é recusada", !checkTarget(url.replace("aws-0-sa-east-1.pooler.supabase.com", "db.abcdefghijklmnopqrst.supabase.co"), "abcdefghijklmnopqrst").ok],
    ["variável ausente é recusada", !checkTarget(undefined, "abcdefghijklmnopqrst").ok],
    ["as versões saem da lista do ensaio", versionsIn(" • 20261002121933_product_readings.sql\n • 20261101000000_x.sql").join() === "20261002121933,20261101000000"],
  ];
  let failed = 0;
  for (const [name, pass] of cases) {
    if (!pass) failed += 1;
    console.log(`${pass ? "✓" : "✗"}  ${name}`);
  }
  console.log(`\nautoteste: ${cases.length - failed} de ${cases.length} — nenhuma conexão foi aberta.`);
  return failed === 0 ? 0 : 1;
}

async function main(): Promise<number> {
  const args = process.argv.slice(2);
  if (args.includes("--autoteste")) return selfTest();
  if (!existsSync(CLI)) {
    console.log(`✗  não achei o Supabase CLI em node_modules — rode npm install`);
    return 1;
  }
  if (args.includes("--versao")) {
    console.log("Supabase CLI, pelo mesmo caminho que o push usa:");
    return (await runCli(["--version"], [], 30_000)).code;
  }

  const applyAt = args.indexOf("--aplicar");
  const wanted = applyAt === -1 ? [] : args.slice(applyAt + 1).filter((arg) => !arg.startsWith("--"));
  if (applyAt !== -1 && (wanted.length === 0 || wanted.some((version) => !/^\d{14}$/.test(version)))) {
    console.log("✗  --aplicar pede a versão de cada migration, com 14 dígitos — ex.: --aplicar 20261002121933");
    return 1;
  }

  const check = checkTarget(process.env[ENV_NAME], projectRef());
  if (!check.ok) {
    console.log(`✗  ${check.why}`);
    console.log("   Nada foi enviado: a conferência é feita antes de qualquer conexão.");
    return 1;
  }
  const { target } = check;
  console.log(`Destino: projeto ${target.ref} · Session pooler · porta 5432 · ${target.host}`);

  console.log("\n1 · O ensaio — o que o banco diz que falta aplicar (não aplica nada):");
  const dry = await runCli(["db", "push", "--dry-run", "--db-url", target.url], target.secrets, DRY_RUN_TIMEOUT_MS);
  if (dry.timedOut) {
    console.log("✗  o ensaio não respondeu a tempo. Banco frio depois de semanas parado responde na segunda tentativa.");
    return 1;
  }
  if (dry.code !== 0) {
    console.log("✗  o ensaio falhou — nada foi aplicado. Se a mensagem acima fala em senha, NÃO repita: confira a string antes.");
    return dry.code;
  }
  const pending = versionsIn(dry.output);
  console.log(`\n   a aplicar, segundo o banco: ${pending.length === 0 ? "nenhuma" : pending.join(", ")}`);

  if (applyAt === -1) {
    console.log("\nFoi só o ensaio. Para aplicar: npm run db:push -- --aplicar <versão> [<versão> ...]");
    return 0;
  }

  const expected = [...new Set(wanted)].sort();
  if (expected.join() !== pending.join()) {
    console.log(`✗  o pedido (${expected.join(", ")}) não é igual ao que o banco aplicaria (${pending.join(", ") || "nenhuma"}).`);
    console.log("   Nada foi aplicado: o push só sai quando as duas listas são a mesma.");
    return 1;
  }

  console.log(`\n2 · O push — ${expected.length} migration(s): ${expected.join(", ")}`);
  const push = await runCli(["db", "push", "--yes", "--db-url", target.url], target.secrets, null);
  if (push.code !== 0) {
    console.log("✗  o push falhou. Leia a mensagem acima e confira o estado pelo MCP antes de qualquer nova tentativa.");
    return push.code;
  }
  console.log("\n✓  aplicado. Falta conferir, só por leitura: as travas da migration e os números de antes e depois.");
  return 0;
}

process.exitCode = await main();
