/**
 * The provider-key probe — does each AI provider accept the key this machine has?
 *
 *   npm run probe:keys
 *
 * Born on 2026-09-26, when the Anthropic key had expired silently (it was created
 * on 08/08 with a programmed expiry) and nothing in the product said so: every
 * paid gesture is refused BEFORE it charges, so not even the ledger showed it. A
 * phase-0 harness found it by accident. The owner asked for the improvised
 * diagnostic to become a script anyone can rerun.
 *
 * ---------------------------------------------------------------------------
 * 0 Sparks — every call asks, none of them generates
 * ---------------------------------------------------------------------------
 *
 * Each provider gets the cheapest authenticated question it answers for free: a
 * model listing, or — for fal — the status of a job that does not exist (the
 * method of the video front's phase 0, 13/08/2026).
 *
 * And each answer is read against a CONTROL: the same call with a key that is
 * certainly wrong. A 200 only means "the key was accepted" when the fake key, on
 * the same endpoint, is refused. The happy path is proved by the sad one beside it.
 *
 * ---------------------------------------------------------------------------
 * What it proves, and what it does NOT
 * ---------------------------------------------------------------------------
 *
 * It proves the KEY. It does not prove the BALANCE: on 26/09 Google answered a
 * model listing with 200 while refusing every generation with 402 (prepaid credit
 * too low). fal is the exception — a locked account answers 403 even here, and
 * the probe says so.
 *
 * Keys come from the environment (`--env-file-if-exists=.env.local`), are sent
 * only in request headers, and are never printed: every line of output passes
 * through `redact`, which would replace a key value that leaked into a message.
 *
 * ---------------------------------------------------------------------------
 * And rule 7 of the security section — checked, not asserted (27/09/2026)
 * ---------------------------------------------------------------------------
 *
 * CLAUDE.md said "GitHub com secret scanning + push protection ativados". On
 * 27/09 the API said both were OFF — on a PUBLIC repository whose Anthropic key
 * does not expire. A rule nobody checks is a sentence, the same lesson as the
 * «SAI ANTES DO COMMIT» mark that became a `git grep`. So the probe asks GitHub
 * too, through the `gh` CLI (its credential lives in the system credential
 * manager, never in a file): either protection off is a ✗ and a non-zero exit,
 * and "could not check" is a ?, never an ✓.
 */

import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

type Verdict = "ok" | "rejected" | "unclear";

type Recipe = {
  /** Matches ai_providers.slug. */
  provider: string;
  /** Matches ai_providers.env_var_name. */
  envVar: string;
  /** The free question, in words — shown next to the verdict. */
  question: string;
  request: (key: string) => { url: string; headers: Record<string, string> };
  /** Reads one answer. Only called for the real key; the control is read by `rejects`. */
  read: (status: number) => { verdict: Verdict; note: string };
  /** Whether an answer means "this key was refused" — what the control must show. */
  rejects: (status: number) => boolean;
};

const REQUEST_TIMEOUT_MS = 20_000;
const FAKE_KEY = "sonda-chave-falsa-000000000000";

const RECIPES: readonly Recipe[] = [
  {
    provider: "anthropic",
    envVar: "ANTHROPIC_API_KEY",
    question: "lista de modelos",
    request: (key) => ({
      url: "https://api.anthropic.com/v1/models?limit=1",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01" },
    }),
    read: (status) =>
      status === 200
        ? { verdict: "ok", note: "chave aceita" }
        : status === 401
          ? { verdict: "rejected", note: "chave recusada — inválida, revogada ou expirada" }
          : { verdict: "unclear", note: `resposta inesperada (${status})` },
    rejects: (status) => status === 401 || status === 403,
  },
  {
    provider: "google",
    envVar: "GEMINI_API_KEY",
    question: "lista de modelos",
    request: (key) => ({
      url: "https://generativelanguage.googleapis.com/v1beta/models?pageSize=1",
      headers: { "x-goog-api-key": key },
    }),
    read: (status) =>
      status === 200
        ? { verdict: "ok", note: "chave aceita — o saldo pré-pago NÃO aparece aqui" }
        : status === 400 || status === 401 || status === 403
          ? { verdict: "rejected", note: "chave recusada" }
          : { verdict: "unclear", note: `resposta inesperada (${status})` },
    rejects: (status) => status === 400 || status === 401 || status === 403,
  },
  {
    provider: "fal",
    envVar: "FAL_KEY",
    question: "status de um trabalho que não existe",
    request: (key) => ({
      url: `https://queue.fal.run/fal-ai/kling-video/requests/${randomUUID()}/status`,
      headers: { Authorization: `Key ${key}` },
    }),
    read: (status) =>
      status === 404
        ? { verdict: "ok", note: "chave aceita (o trabalho inventado não existe, como devia)" }
        : status === 401
          ? { verdict: "rejected", note: "chave recusada" }
          : status === 403
            ? { verdict: "rejected", note: "conta TRAVADA — saldo pré-pago abaixo do mínimo (TOP_UP)" }
            : { verdict: "unclear", note: `resposta inesperada (${status})` },
    rejects: (status) => status === 401,
  },
  {
    provider: "openai",
    envVar: "OPENAI_API_KEY",
    question: "lista de modelos",
    request: (key) => ({
      url: "https://api.openai.com/v1/models",
      headers: { Authorization: `Bearer ${key}` },
    }),
    read: (status) =>
      status === 200
        ? { verdict: "ok", note: "chave aceita" }
        : status === 401
          ? { verdict: "rejected", note: "chave recusada" }
          : { verdict: "unclear", note: `resposta inesperada (${status})` },
    rejects: (status) => status === 401,
  },
  {
    provider: "xai",
    envVar: "XAI_API_KEY",
    question: "lista de modelos",
    request: (key) => ({
      url: "https://api.x.ai/v1/models",
      headers: { Authorization: `Bearer ${key}` },
    }),
    read: (status) =>
      status === 200
        ? { verdict: "ok", note: "chave aceita" }
        : status === 400 || status === 401 || status === 403
          ? { verdict: "rejected", note: "chave recusada" }
          : { verdict: "unclear", note: `resposta inesperada (${status})` },
    rejects: (status) => status === 400 || status === 401 || status === 403,
  },
];

/** Every configured key value, so no line of output can ever carry one. */
const KEY_VALUES = RECIPES.map((recipe) => process.env[recipe.envVar]).filter(
  (value): value is string => typeof value === "string" && value.length >= 8,
);

function redact(text: string): string {
  return KEY_VALUES.reduce((acc, value) => acc.split(value).join("<CHAVE>"), text);
}

/** The HTTP status, or 0 when the network never answered. Bodies are never read. */
async function ask(recipe: Recipe, key: string): Promise<number> {
  const { url, headers } = recipe.request(key);

  try {
    const response = await fetch(url, { headers, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    await response.body?.cancel();
    return response.status;
  } catch {
    return 0;
  }
}

const SYMBOL: Record<Verdict, string> = { ok: "✓", rejected: "✗", unclear: "?" };

/** The two protections rule 7 promises, as GitHub reports them for this repository. */
const GITHUB_PROTECTIONS = [
  { field: "secret_scanning", name: "secret scanning" },
  { field: "secret_scanning_push_protection", name: "push protection" },
] as const;

/** What `gh` answers for this repository's `security_and_analysis` — the only I/O of the check. */
function readGithubSecuritySettings(): string {
  return execFileSync("gh", ["api", "repos/{owner}/{repo}", "--jq", ".security_and_analysis"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
    timeout: REQUEST_TIMEOUT_MS,
  }).trim();
}

/**
 * Rule 7, asked of GitHub. `security_and_analysis` only comes back to an admin
 * of the repository — its absence is "could not check", not "off".
 *
 * `read` is injectable so a harness can prove every verdict without touching
 * GitHub's settings — the red path included.
 */
export function checkGithubRule7(read: () => string = readGithubSecuritySettings): { verdict: Verdict; note: string } {
  let raw: string;

  try {
    raw = read();
  } catch {
    return { verdict: "unclear", note: "não deu para perguntar ao GitHub — o `gh` está instalado e autenticado?" };
  }

  let parsed: unknown = null;

  try {
    parsed = raw === "" ? null : JSON.parse(raw);
  } catch {
    parsed = null;
  }

  if (parsed === null || typeof parsed !== "object") {
    return { verdict: "unclear", note: "o GitHub não mostrou as configurações de segurança — o `gh` precisa ser de um admin do repositório" };
  }

  const settings = parsed as Record<string, { status?: unknown } | undefined>;
  const states = GITHUB_PROTECTIONS.map((p) => {
    const status = settings[p.field]?.status;

    return { ...p, status: typeof status === "string" ? status : "ausente" };
  });
  const off = states.filter((s) => s.status !== "enabled");
  const summary = states.map((s) => `${s.name}: ${s.status}`).join(" · ");

  return off.length === 0
    ? { verdict: "ok", note: summary }
    : { verdict: "rejected", note: `${summary} — DESLIGADO: ${off.map((s) => s.name).join(" e ")}. A regra 7 do CLAUDE.md não está valendo` };
}

async function main() {
  const lines: string[] = [
    "Sonda de chaves por fornecedor — 0 ⚡: cada chamada pergunta, nenhuma gera.",
    "Prova a CHAVE, não o SALDO (exceto a fal, que acusa a conta travada).",
    "",
  ];
  let failures = 0;

  for (const recipe of RECIPES) {
    const key = process.env[recipe.envVar];

    if (!key) {
      lines.push(`—  ${recipe.provider.padEnd(9)} ${recipe.envVar} não está no ambiente`);
      continue;
    }

    const control = await ask(recipe, FAKE_KEY);
    const real = await ask(recipe, key);

    let { verdict, note } = real === 0 ? { verdict: "unclear" as const, note: "sem resposta da rede" } : recipe.read(real);

    // The control has to be refused, or a 200 means nothing.
    if (verdict === "ok" && !recipe.rejects(control)) {
      verdict = "unclear";
      note = `o controle com chave falsa não foi recusado (${control}) — este endpoint não prova a chave`;
    }

    if (verdict !== "ok") failures += 1;

    lines.push(
      `${SYMBOL[verdict]}  ${recipe.provider.padEnd(9)} ${String(real).padEnd(4)} ${note}  ` +
        `[${recipe.question}; controle com chave falsa: ${control}]`,
    );
  }

  const github = checkGithubRule7();

  if (github.verdict !== "ok") failures += 1;

  lines.push(
    "",
    "Regra 7 de Segurança — o repositório é PÚBLICO: o GitHub precisa varrer segredos e barrar o push de um.",
    `${SYMBOL[github.verdict]}  ${"github".padEnd(9)} ${"".padEnd(4)} ${github.note}  [gh api repos/{owner}/{repo} → security_and_analysis]`,
  );

  for (const line of lines) console.log(redact(line));

  process.exitCode = failures === 0 ? 0 : 1;
}

// Run only as the entry point (`npm run probe:keys`), so a harness can import
// `checkGithubRule7` without the probe calling every provider.
const isEntryPoint =
  process.argv[1] !== undefined &&
  resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase();

if (isEntryPoint) void main();
