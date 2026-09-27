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
 */

import { randomUUID } from "node:crypto";

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

  for (const line of lines) console.log(redact(line));

  process.exitCode = failures === 0 ? 0 : 1;
}

void main();
