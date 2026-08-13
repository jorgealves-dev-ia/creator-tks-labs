import "server-only";

import { createHash, createPublicKey, verify as verifySignature } from "node:crypto";

import { readProviderKey } from "@/lib/providers/keys";
import { ProviderError, type VideoPayload } from "@/lib/providers/types";

/**
 * A fila da fal.ai — genérica por endpoint, cega ao modelo.
 *
 * ---------------------------------------------------------------------------
 * O que este arquivo é, e o que ele deliberadamente não sabe
 * ---------------------------------------------------------------------------
 *
 * Ele sabe **submeter** a uma fila, **conferir** o estado de um trabalho,
 * **verificar a assinatura** de um retorno e **baixar** o arquivo. Não sabe o
 * que é Kling, não sabe o que é vídeo, e não sabe o formato de nenhum payload
 * de modelo.
 *
 * Essa fronteira é o critério de prova do ciclo, escrito como código: **um
 * segundo modelo da fal deve ser linha de catálogo mais configuração, sem tocar
 * no motor.** Se um modelo novo obrigasse a editar este arquivo, a fronteira
 * estaria no lugar errado.
 *
 * ---------------------------------------------------------------------------
 * A fechadura é a assinatura, e nada mais
 * ---------------------------------------------------------------------------
 *
 * O endpoint de retorno é público na internet e chega **sem credencial nossa**.
 * Quem garante que a entrega é da fal é a assinatura ED25519 sobre o corpo
 * bruto, conferida contra o JWKS público deles.
 *
 * O bypass da Vercel que viaja na URL **não é fechadura** — ele passa só pela
 * borda da plataforma, e vive guardado no sistema de outra empresa. As faixas de
 * IP também não: elas mudam, e um IP é uma afirmação sobre a rede, não sobre o
 * conteúdo. A assinatura é a única coisa que um atacante não pode produzir.
 */

/** Mirrors ai_providers.env_var_name for this provider. */
const API_KEY_ENV_VAR = "FAL_KEY";

/** Onde se enfileira. O endpoint completo vai no path. */
const QUEUE_BASE = "https://queue.fal.run";

/** As chaves públicas que assinam os webhooks. */
const JWKS_URL = "https://rest.fal.ai/.well-known/jwks.json";

/**
 * A documentação manda não cachear por mais de 24h, porque as chaves rodam.
 * Cache por instância: numa função serverless cada instância busca a sua, o que
 * custa uma requisição fria e não precisa de coordenação nenhuma.
 */
const JWKS_MAX_AGE_MS = 12 * 60 * 60 * 1000;

/**
 * A janela de tolerância do timestamp, como a documentação define: ±5 minutos.
 *
 * Ela existe contra **replay**: sem ela, uma entrega legítima capturada hoje
 * continuaria válida para sempre, porque a assinatura dela é eternamente
 * correta. Cinco minutos é o número deles, não um que a gente escolheu.
 */
const TIMESTAMP_TOLERANCE_SECONDS = 300;

/** Submeter é rápido — é só enfileirar. Se demora isto, algo está errado. */
const SUBMIT_TIMEOUT_MS = 20_000;

/** Consultar status é mais rápido ainda. */
const STATUS_TIMEOUT_MS = 20_000;

/**
 * Baixar o vídeo é a parte pesada do webhook, e tem que caber no `maxDuration`
 * da rota com folga para o upload ao Storage depois dela.
 */
const DOWNLOAD_TIMEOUT_MS = 45_000;

/**
 * Teto do arquivo aceito, casado com o limite do bucket `assets` (50 MB no
 * plano atual). Conferido **antes** de materializar os bytes: um vídeo maior que
 * o bucket falharia no upload de qualquer jeito, e falhar depois de baixar
 * quarenta megabytes é gastar tempo de função para chegar na mesma resposta.
 */
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

// ---------------------------------------------------------------------------
// Submissão
// ---------------------------------------------------------------------------

export type FalSubmission = {
  requestId: string;
  statusUrl: string | null;
  responseUrl: string | null;
  cancelUrl: string | null;
};

/**
 * Enfileira um trabalho e devolve o protocolo. **Nunca espera o resultado.**
 *
 * As URLs devolvidas são repassadas como vieram, e é isso que a camada acima
 * guarda. Medido em 13/08/2026: o path de `requests/` usa o **app base id**
 * (`fal-ai/kling-video`) e não o endpoint versionado, então uma URL construída a
 * partir do slug do modelo responde 405. Quem constrói acerta em desenvolvimento
 * e erra na reconciliação, que é o pior lugar para descobrir.
 */
export async function submitToQueue(request: {
  endpoint: string;
  input: Record<string, unknown>;
  webhookUrl: string;
}): Promise<FalSubmission> {
  const apiKey = requireKey();

  const url = new URL(`${QUEUE_BASE}/${request.endpoint}`);
  url.searchParams.set("fal_webhook", request.webhookUrl);

  let response: Response;

  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        authorization: `Key ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(request.input),
      signal: AbortSignal.timeout(SUBMIT_TIMEOUT_MS),
    });
  } catch (error) {
    throw new ProviderError(
      "provider",
      "the provider could not be reached",
      error instanceof Error ? error.message : String(error),
    );
  }

  const body = await response.text();

  if (!response.ok) {
    throw classifyHttpError(response.status, body);
  }

  const parsed = safeJson(body);
  const requestId = readString(parsed, "request_id");

  if (!requestId) {
    throw new ProviderError(
      "invalid_answer",
      "the provider accepted the job without a request id",
      truncate(body),
    );
  }

  return {
    requestId,
    statusUrl: readString(parsed, "status_url"),
    responseUrl: readString(parsed, "response_url"),
    cancelUrl: readString(parsed, "cancel_url"),
  };
}

// ---------------------------------------------------------------------------
// Consulta — o caminho da reconciliação
// ---------------------------------------------------------------------------

export type FalQueueStatus =
  | { kind: "pending" }
  | { kind: "completed"; payload: unknown }
  | { kind: "failed"; detail: string }
  | { kind: "unknown" };

/**
 * Pergunta à fila o que houve com um trabalho — a peça que garante que **nenhum
 * node fica "Gerando" para sempre**.
 *
 * Um 404 vira `unknown` em vez de `failed`, e a diferença é de dinheiro: a fal
 * guarda o resultado por cerca de uma hora, então um trabalho antigo some da
 * fila sem nunca ter falhado. Chamar isso de falha marcaria como perdido um
 * vídeo que pode ter sido entregue — e o teto de tempo da camada acima é quem
 * decide o que fazer com um desconhecido, com a idade dele na mão.
 */
export async function readQueueStatus(input: {
  statusUrl: string | null;
  responseUrl: string | null;
}): Promise<FalQueueStatus> {
  if (!input.statusUrl) return { kind: "unknown" };

  const status = await getJson(input.statusUrl);

  if (status.httpStatus === 404) return { kind: "unknown" };

  if (status.httpStatus >= 400) {
    return { kind: "failed", detail: `status ${status.httpStatus}: ${truncate(status.body)}` };
  }

  const parsed = safeJson(status.body);
  const state = readString(parsed, "status");

  if (state === "IN_QUEUE" || state === "IN_PROGRESS") return { kind: "pending" };

  if (state !== "COMPLETED") {
    // Um estado que a documentação não lista é desconhecido, não falho: inventar
    // uma conclusão a partir de uma palavra que ninguém leu é como um trabalho
    // vivo vira perdido.
    return { kind: "unknown" };
  }

  // COMPLETED não significa "deu certo" — significa "não está mais correndo".
  // O erro, quando há, vem no corpo do resultado.
  if (!input.responseUrl) return { kind: "unknown" };

  const result = await getJson(input.responseUrl);

  if (result.httpStatus === 404) return { kind: "unknown" };

  if (result.httpStatus >= 400) {
    return { kind: "failed", detail: `result ${result.httpStatus}: ${truncate(result.body)}` };
  }

  return { kind: "completed", payload: safeJson(result.body) };
}

async function getJson(url: string): Promise<{ httpStatus: number; body: string }> {
  const apiKey = requireKey();

  try {
    const response = await fetch(url, {
      headers: { authorization: `Key ${apiKey}` },
      signal: AbortSignal.timeout(STATUS_TIMEOUT_MS),
    });

    return { httpStatus: response.status, body: await response.text() };
  } catch (error) {
    throw new ProviderError(
      "provider",
      "the provider could not be reached",
      error instanceof Error ? error.message : String(error),
    );
  }
}

// ---------------------------------------------------------------------------
// Download
// ---------------------------------------------------------------------------

/**
 * Baixa o arquivo do CDN da fal.
 *
 * A invariante 3 é o motivo desta função existir: **URL de provedor expira**, e
 * o asset nosso é a verdade. O link da fal vive dias; o vídeo tem que viver
 * enquanto o usuário quiser.
 */
export async function downloadFile(url: string): Promise<VideoPayload> {
  let response: Response;

  try {
    response = await fetch(url, { signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS) });
  } catch (error) {
    throw new ProviderError(
      "provider",
      "the finished file could not be downloaded",
      error instanceof Error ? error.message : String(error),
    );
  }

  if (!response.ok) {
    throw new ProviderError(
      "provider",
      "the finished file could not be downloaded",
      `status ${response.status}`,
    );
  }

  // Conferido pelo cabeçalho antes de materializar, quando ele existe: recusar
  // por tamanho depois de trazer o arquivo inteiro gasta o tempo da função para
  // chegar exatamente na mesma resposta.
  const declared = Number(response.headers.get("content-length") ?? "0");

  if (declared > MAX_VIDEO_BYTES) {
    throw new ProviderError(
      "provider",
      "the finished file is larger than we can store",
      `${declared} bytes`,
    );
  }

  const bytes = new Uint8Array(await response.arrayBuffer());

  if (bytes.byteLength > MAX_VIDEO_BYTES) {
    throw new ProviderError(
      "provider",
      "the finished file is larger than we can store",
      `${bytes.byteLength} bytes`,
    );
  }

  return {
    // Lido de volta em vez de suposto, como no adaptador do Google: o provedor é
    // livre para responder mp4 ou webm, e o arquivo entra no Storage sendo o que
    // de fato é.
    mimeType: response.headers.get("content-type")?.split(";")[0]?.trim() || "video/mp4",
    bytes,
  };
}

// ---------------------------------------------------------------------------
// A assinatura do webhook
// ---------------------------------------------------------------------------

export type FalWebhookHeaders = {
  requestId: string | null;
  userId: string | null;
  timestamp: string | null;
  signature: string | null;
};

export type WebhookVerification =
  | { ok: true }
  | { ok: false; reason: "missing_headers" | "stale_timestamp" | "bad_signature" | "no_keys" };

/** Os quatro cabeçalhos, lidos de uma requisição. Nomes verbatim da fal. */
export function readWebhookHeaders(headers: Headers): FalWebhookHeaders {
  return {
    requestId: headers.get("x-fal-webhook-request-id"),
    userId: headers.get("x-fal-webhook-user-id"),
    timestamp: headers.get("x-fal-webhook-timestamp"),
    signature: headers.get("x-fal-webhook-signature"),
  };
}

/**
 * Verifica que esta entrega veio mesmo da fal.
 *
 * A mensagem assinada é, na ordem exata e separada por `\n`:
 *
 *     x-fal-webhook-request-id
 *     x-fal-webhook-user-id
 *     x-fal-webhook-timestamp
 *     hex(sha256(corpo BRUTO))
 *
 * **Bruto importa.** O hash é sobre os bytes que chegaram, então qualquer
 * reserialização — um `JSON.parse` seguido de `JSON.stringify`, uma chave
 * reordenada, um espaço a mais — produz um hash diferente e derruba uma entrega
 * legítima. Quem chama esta função lê `await request.text()` uma vez e passa
 * aquela string, e é dela também que o JSON é lido depois.
 *
 * Devolve **por que** falhou, e não um booleano: as quatro recusas têm causas
 * diferentes, e um log que diz "inválida" não distingue relógio fora de hora de
 * ataque. Nenhuma delas chega à tela — o webhook não tem tela — mas todas
 * chegam ao log de quem for investigar.
 */
export async function verifyWebhook(input: {
  headers: FalWebhookHeaders;
  rawBody: string;
  /** Injetável só para o harness de sabotagem poder mover o relógio. */
  nowSeconds?: number;
}): Promise<WebhookVerification> {
  const { requestId, userId, timestamp, signature } = input.headers;

  if (!requestId || !userId || !timestamp || !signature) {
    return { ok: false, reason: "missing_headers" };
  }

  const sent = Number.parseInt(timestamp, 10);

  if (!Number.isFinite(sent)) return { ok: false, reason: "stale_timestamp" };

  const now = input.nowSeconds ?? Math.floor(Date.now() / 1000);

  if (Math.abs(now - sent) > TIMESTAMP_TOLERANCE_SECONDS) {
    return { ok: false, reason: "stale_timestamp" };
  }

  const digest = createHash("sha256").update(input.rawBody, "utf8").digest("hex");
  const message = Buffer.from([requestId, userId, timestamp, digest].join("\n"), "utf8");

  let signatureBytes: Buffer;

  try {
    signatureBytes = Buffer.from(signature, "hex");
    // `Buffer.from(…, "hex")` não lança em lixo — ele para na primeira dupla
    // inválida e devolve o que deu. Uma assinatura Ed25519 tem 64 bytes, e
    // qualquer outra coisa é entrada malformada, não assinatura errada.
    if (signatureBytes.byteLength !== 64) return { ok: false, reason: "bad_signature" };
  } catch {
    return { ok: false, reason: "bad_signature" };
  }

  const keys = await loadPublicKeys();

  if (keys.length === 0) return { ok: false, reason: "no_keys" };

  // Qualquer chave que valide serve: a fal publica mais de uma porque elas
  // rodam, e durante a rotação as duas são legítimas.
  for (const key of keys) {
    if (verifySignature(null, message, key, signatureBytes)) return { ok: true };
  }

  return { ok: false, reason: "bad_signature" };
}

type CachedJwks = { keys: ReturnType<typeof createPublicKey>[]; fetchedAt: number };

let jwksCache: CachedJwks | null = null;

async function loadPublicKeys(): Promise<CachedJwks["keys"]> {
  if (jwksCache && Date.now() - jwksCache.fetchedAt < JWKS_MAX_AGE_MS) {
    return jwksCache.keys;
  }

  let raw: string;

  try {
    const response = await fetch(JWKS_URL, { signal: AbortSignal.timeout(STATUS_TIMEOUT_MS) });

    if (!response.ok) throw new Error(`status ${response.status}`);

    raw = await response.text();
  } catch {
    // Um JWKS que não veio não invalida o cache antigo: durante uma queda deles,
    // uma chave de doze horas atrás ainda verifica entregas legítimas, e a
    // alternativa é recusar tudo e perder resultados já pagos.
    return jwksCache?.keys ?? [];
  }

  const parsed = safeJson(raw);
  const entries = Array.isArray((parsed as { keys?: unknown })?.keys)
    ? ((parsed as { keys: unknown[] }).keys)
    : [];

  const keys: CachedJwks["keys"] = [];

  for (const entry of entries) {
    const jwk = entry as { kty?: string; crv?: string; x?: string };

    if (jwk.kty !== "OKP" || jwk.crv !== "Ed25519" || typeof jwk.x !== "string") continue;

    try {
      // A fal publica `x` em base64 **padrão**, com `+`, `/` e `=`; o import de
      // JWK exige base64url. Sem esta normalização o createPublicKey lança, e o
      // sintoma é toda entrega legítima sendo recusada por assinatura inválida —
      // achado da Fase 0, com a chave real na mão.
      const x = jwk.x.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

      keys.push(createPublicKey({ key: { kty: "OKP", crv: "Ed25519", x }, format: "jwk" }));
    } catch {
      // Uma chave malformada não pode custar as outras.
    }
  }

  if (keys.length > 0) jwksCache = { keys, fetchedAt: Date.now() };

  return keys.length > 0 ? keys : (jwksCache?.keys ?? []);
}

// ---------------------------------------------------------------------------
// Plumbing
// ---------------------------------------------------------------------------

function requireKey(): string {
  const apiKey = readProviderKey(API_KEY_ENV_VAR);

  if (!apiKey) {
    throw new ProviderError("not_configured", `${API_KEY_ENV_VAR} is not set on the server`);
  }

  return apiKey;
}

/**
 * Conta travada — e são **regex com fronteira de palavra**, não substring.
 *
 * `"locked"` como substring era um bug, e o harness de sabotagem o achou na
 * primeira execução: **`"blocked by safety policy"` contém `locked`**, então
 * toda recusa de conteúdo era classificada como conta travada. A tela mandaria
 * avisar o administrador quando o conserto era reformular a cena.
 *
 * É a mesma classe do `"reference image image 1"` de 10/08/2026 — nenhum
 * typecheck pega, e é o argumento inteiro a favor de verificações que comparam
 * texto de verdade em vez de estrutura.
 */
const ACCOUNT_MARKERS = [
  /\bbalance\b/,
  /\bexhausted\b/,
  /insufficient funds/,
  /\blocked\b/,
  /\bsuspended\b/,
  /top up/,
];

/**
 * Palavras que significam "não vou animar isto".
 *
 * Uma lista só, lida por dois lugares: aqui, para classificar um erro HTTP da
 * submissão, e no adaptador, para classificar o detalhe de um payload entregue.
 * Duas listas seriam duas chances de a mesma recusa ser lida de dois jeitos
 * dependendo de por qual porta ela chegou — e a segunda a divergir seria a que
 * ninguém testa.
 *
 * Heurística, e sem drama nas duas direções: uma recusa lida como erro custa uma
 * tentativa; um erro lido como recusa mostra a frase de reformular onde ela não
 * ajuda. Nenhuma das duas cobra — falha é grátis por constraint.
 */
const REFUSAL_MARKERS = [
  "safety",
  "policy",
  "blocked",
  "prohibited",
  "content filter",
  "violation",
  "nsfw",
  "sensitive",
];

/** Se a frase do provedor é uma recusa de conteúdo. */
export function looksRefused(detail: string): boolean {
  const lowered = detail.toLowerCase();

  return REFUSAL_MARKERS.some((marker) => lowered.includes(marker));
}

/**
 * Classifica pela **mensagem do provedor**, nunca só pelo código — a regra que
 * ficou de 08 e 09/08/2026, quando uma recusa de conteúdo chegou à tela
 * disfarçada de falha de rede porque a checagem morava dentro do ramo errado.
 *
 * O caso `account` é o que o briefing deste ciclo nomeou: a fal trava a conta
 * quando o saldo **deles** cai abaixo do mínimo e passa a rejeitar chamadas.
 * Sem nome próprio, isso chegaria como "erro do provedor" e mandaria alguém
 * investigar o prompt.
 */
function classifyHttpError(status: number, body: string): ProviderError {
  const detail = truncate(body);
  const lowered = body.toLowerCase();

  if (status === 401) {
    return new ProviderError("not_configured", "the provider rejected the API key", detail);
  }

  if (status === 402 || status === 403 || ACCOUNT_MARKERS.some((marker) => marker.test(lowered))) {
    return new ProviderError("account", "the provider account is not able to run jobs", detail);
  }

  if (REFUSAL_MARKERS.some((marker) => lowered.includes(marker))) {
    return new ProviderError("refused", "the provider declined to animate this", detail);
  }

  return new ProviderError("provider", `the provider returned ${status}`, detail);
}

/** Nunca lança: um corpo que não é JSON é um corpo, e vira detalhe de erro. */
function safeJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function readString(value: unknown, key: string): string | null {
  if (typeof value !== "object" || value === null) return null;

  const found = (value as Record<string, unknown>)[key];

  return typeof found === "string" && found !== "" ? found : null;
}

/** O suficiente para diagnosticar, curto o bastante para caber numa coluna. */
function truncate(text: string): string {
  const flat = text.replace(/\s+/g, " ").trim();

  return flat.length > 400 ? `${flat.slice(0, 399)}…` : flat;
}

export const FAL_QUEUE_INTERNALS = {
  TIMESTAMP_TOLERANCE_SECONDS,
  MAX_VIDEO_BYTES,
  classifyHttpError,
  truncate,
};
