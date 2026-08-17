import "server-only";

import { z } from "zod";

import { textRealCostCents } from "@/lib/ai/pricing";
import { isProviderConfigured } from "@/lib/providers/keys";
import { findTextProvider } from "@/lib/providers/registry";
import { ProviderError, providerErrorDetail } from "@/lib/providers/types";
import { CENTS_PER_SPARK } from "@/lib/sparks";
import {
  CANAL_KEYS,
  SCHEMA_JSON,
  SCHEMA_JSON_CENA,
  TETO_CENAS,
  parseCena,
  parseRoteiro,
  type Canal,
  type Cena,
  type Historia,
  type JobKind,
} from "@/lib/storyboard/contract";
import type {
  StoryboardGenerationFailure,
  StoryboardGenerationResult,
} from "@/lib/storyboard/generation-contract";
import {
  receitaCena,
  receitaEstruturar,
  receitaRoteiro,
  type CtaSugestao,
  type PersonagemDaReceita,
  type Receita,
} from "@/lib/storyboard/recipe";
import type { Json } from "@/lib/supabase/database.types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * O motor do Roteiro — FRENTE STORYBOARD · CICLO 2 · Fase 2.
 *
 * ---------------------------------------------------------------------------
 * A ORDEM, que é a única coisa aqui que não é negociável
 * ---------------------------------------------------------------------------
 *
 *   1. sessão
 *   2. o `@` resolvido e recusado **no escopo do projeto**
 *   3. modelo e preço, lidos do catálogo
 *   4. saldo
 *   ----------------------------------------- daqui para baixo pode custar
 *   5. a chamada ao provedor
 *   6. o Zod
 *   7. a persistência das fichas
 *   8. record_generation
 *
 * Os quatro primeiros passos são **antes de qualquer centavo sair**, e a razão é
 * aritmética e não estética: uma recusa que acontece no passo 2 não escreve
 * linha em `generations`, não toca no ledger e não chama ninguém — zero Spark, e
 * não "quase zero". A mesma ordem que o gerador de imagem provou, e o mesmo
 * argumento que fez o preço por resolução ser conferido antes em vez de deixado
 * para o GN005: **descobrir depois é descobrir com a coisa já paga.**
 *
 * O banco tem os mesmos cadeados um degrau abaixo (GN002, GN006, GN007). Eles
 * existem para o dia em que um caminho novo esquecer destas linhas. Estes aqui
 * são os que disparam; aqueles são os que não deveriam precisar disparar nunca.
 *
 * ---------------------------------------------------------------------------
 * Por que a persistência vem ANTES da cobrança, e o que se paga por isso
 * ---------------------------------------------------------------------------
 *
 * Não há transação que abrace os dois: são duas chamadas ao banco, e uma delas
 * é a função que cobra. Então alguém tem de vir primeiro, e a escolha decide
 * para que lado se erra quando o improvável acontece.
 *
 * Gravando primeiro, uma falha na cobrança (o único caso real é o GN001 numa
 * corrida entre duas gerações simultâneas) deixa o usuário com um roteiro que
 * não pagou. Cobrando primeiro, uma falha na gravação deixaria alguém que pagou
 * sem o roteiro.
 *
 * **Erra-se a favor de quem paga**, que é a mesma escolha que o gerador de
 * imagem faz ao ingerir o asset antes de chamar `record_generation`. E o
 * prejuízo tem teto conhecido: 15 ⚡, quinze centavos.
 */

const CHARGE_ERROR_CODES: Record<string, StoryboardGenerationFailure> = {
  GN001: "insufficient_balance",
  GN002: "invalid",
  GN003: "invalid",
  GN004: "invalid",
  // Inalcançável na prática: o job é conferido contra o catálogo no passo 3,
  // justamente para que isto nunca dispare depois de o provedor ter sido pago.
  // Mapeado assim mesmo — o banco é a autoridade sobre o preço, e uma
  // autoridade cuja recusa não tem nome deste lado vira "erro inesperado".
  GN007: "unsupported_job",
};

/** O handle sem `@`, do jeito que a coluna guarda. */
const personagemSchema = z.object({ handle: z.string().min(1).max(80) }).nullable();

const baseSchema = {
  projectId: z.uuid(),
  nodeId: z.string().min(1).max(200),
  modelId: z.uuid(),
};

const requestSchema = z.discriminatedUnion("job", [
  z.object({
    ...baseSchema,
    job: z.literal("roteiro"),
    ideia: z.string().max(4000),
    canal: z.enum(CANAL_KEYS),
    cenas: z.number().int().min(1).max(TETO_CENAS),
    personagem: personagemSchema,
    produto: z.string().max(200).nullable(),
  }),
  z.object({
    ...baseSchema,
    job: z.literal("estruturar"),
    /**
     * O teto existe para o custo não ser ilimitado: `estruturar` foi precificado
     * sobre o PIOR CASO medido na Fase 0 (14 cenas, 1.764 tokens de entrada), e
     * um texto de 50 mil caracteres sairia daquela medição sem sair do preço.
     */
    texto: z.string().max(20000),
    canal: z.enum(CANAL_KEYS),
    personagem: personagemSchema,
    produto: z.string().max(200).nullable(),
  }),
  z.object({
    ...baseSchema,
    job: z.literal("cena"),
    ordem: z.number().int().min(1).max(TETO_CENAS),
    instrucao: z.string().min(1).max(1000),
  }),
]);

type ParsedRequest = z.infer<typeof requestSchema>;

/** O que foi pedido ao modelo, gravado em generations.params. */
type GenerationParams = {
  job_kind: JobKind;
  canal: string | null;
  cenas_pedidas: number | null;
  personagem_handle: string | null;
};

export async function runStoryboardGeneration(
  input: unknown,
): Promise<StoryboardGenerationResult> {
  const parsed = requestSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, reason: "invalid" };
  }

  const request = parsed.data;
  const supabase = await createSupabaseServerClient();

  // -------------------------------------------------------------------------
  // 1. Sessão. Respondida, nunca redirecionada — uma rota é endpoint público e
  //    não pode contar com o proxy ter rodado.
  // -------------------------------------------------------------------------
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;

  if (!userId) {
    return { ok: false, reason: "unauthenticated" };
  }

  // -------------------------------------------------------------------------
  // 2. O `@`, resolvido no escopo deste projeto.
  //
  //    Antes do catálogo e antes do saldo de propósito: é a recusa mais provável
  //    de todas (uma aba aberta desde antes de um desvincular manda exatamente o
  //    mesmo corpo que um clique legítimo) e é a mais barata de dar.
  // -------------------------------------------------------------------------
  const pedido = await carregarContexto(supabase, userId, request);

  if (!pedido.ok) {
    return { ok: false, reason: pedido.reason, handle: pedido.handle };
  }

  const { personagem, entityId, canal, existente } = pedido;

  // -------------------------------------------------------------------------
  // 3. O modelo, seu fornecedor e o preço DESTE trabalho — do catálogo, nunca do
  //    navegador. O navegador nomeia um id e um job; o preço é resposta daqui.
  // -------------------------------------------------------------------------
  const { data: model } = await supabase
    .from("ai_models")
    .select(
      "id, slug, enabled, capabilities, ai_providers (slug, env_var_name, enabled), ai_model_text_prices (job_kind, sparks)",
    )
    .eq("id", request.modelId)
    .maybeSingle();

  const providerRow = model?.ai_providers;

  if (
    !model ||
    !providerRow ||
    !model.enabled ||
    !providerRow.enabled ||
    !model.capabilities.includes("text_gen")
  ) {
    return { ok: false, reason: "invalid" };
  }

  const provider = findTextProvider(providerRow.slug);

  if (!provider || !isProviderConfigured(providerRow.env_var_name)) {
    return { ok: false, reason: "not_configured" };
  }

  // Sem preço-base para cair: ao contrário da imagem, não existe
  // `ai_models.text_sparks`. Um trabalho sem linha de preço é um trabalho que
  // não se sabe cobrar, e cobrar por adivinhação é o buraco que a tabela fecha.
  const jobPrice = model.ai_model_text_prices.find((price) => price.job_kind === request.job);

  if (!jobPrice) {
    return { ok: false, reason: "unsupported_job" };
  }

  const priceSparks = jobPrice.sparks;

  // -------------------------------------------------------------------------
  // 4. Saldo. Uma recusa amigável antes de qualquer gasto — inclusive o nosso.
  // -------------------------------------------------------------------------
  const { data: wallet } = await supabase
    .from("wallets")
    .select("balance_cents")
    .eq("user_id", userId)
    .maybeSingle();

  const balanceSparks = Math.floor((wallet?.balance_cents ?? 0) / CENTS_PER_SPARK);

  if (balanceSparks < priceSparks) {
    return { ok: false, reason: "insufficient_balance", neededSparks: priceSparks, balanceSparks };
  }

  // A biblioteca de CTA do canal — catálogo curado, lido do banco e passado para
  // a receita, que continua sendo função de texto para texto.
  const ctas = await carregarCtas(supabase, canal);

  const receita = montarReceita(request, { personagem, canal, ctas, existente });

  const params: GenerationParams = {
    job_kind: request.job,
    canal,
    cenas_pedidas: request.job === "roteiro" ? request.cenas : null,
    personagem_handle: personagem?.handle ?? null,
  };

  const promptUserPt = textoOriginal(request);

  // -------------------------------------------------------------------------
  // 5. A chamada. Daqui para baixo, dinheiro nosso já saiu.
  // -------------------------------------------------------------------------
  let resposta;

  try {
    resposta = await provider.generateText({
      model: { slug: model.slug },
      input: {
        systemPrompt: receita.system,
        userPrompt: receita.user,
        schema: request.job === "cena" ? SCHEMA_JSON_CENA : SCHEMA_JSON,
      },
    });
  } catch (error) {
    const detalhe = providerErrorDetail(error);

    await recordFailure(supabase, {
      request,
      modelId: model.id,
      entityId,
      params,
      promptUserPt,
      receita,
      detalhe,
    });

    if (error instanceof ProviderError && error.kind === "not_configured") {
      return { ok: false, reason: "not_configured" };
    }

    return {
      ok: false,
      reason: error instanceof ProviderError && error.kind === "refused" ? "refused" : "error",
    };
  }

  const realCost = textRealCostCents(model.slug, resposta.usage);

  // -------------------------------------------------------------------------
  // 6. O Zod, que é quem decide se isto pode ser gravado.
  //
  //    O schema já viajou no `response_format` e torna a violação rara; esta
  //    linha é o que a torna impossível de gravar. Uma resposta recusada aqui
  //    vira linha `failed`, e falha **não cobra** — nem pelo `case` de
  //    record_generation nem pela constraint generations_failed_is_free.
  //
  //    Nós pagamos por ela ao provedor, e isso está certo: o erro foi do modelo,
  //    não de quem clicou.
  // -------------------------------------------------------------------------
  const lido =
    request.job === "cena" ? parseCena(resposta.text) : parseRoteiro(resposta.text);

  if (!lido.ok) {
    await recordFailure(supabase, {
      request,
      modelId: model.id,
      entityId,
      params,
      promptUserPt,
      receita,
      detalhe: `${lido.etapa}: ${lido.erro}`,
      usage: resposta.usage,
      realCost,
    });

    return { ok: false, reason: "invalid_answer", detalhe: lido.erro };
  }

  /**
   * A ordem devolvida tem de ser a que foi pedida — e esta linha é a segunda
   * correção que o harness da Fase 2 arrancou.
   *
   * A receita manda "Não mude ordem", e uma instrução no prompt não é uma
   * garantia. Sem esta conferência, uma cena voltando com a ordem trocada
   * passaria pelo Zod (é uma cena válida), não casaria com nenhuma das gravadas
   * em `aplicarCena`, e o roteiro seria regravado **idêntico** — com a cobrança
   * feita e a tela dizendo que deu certo.
   *
   * Um caminho que cobra e não muda nada é pior que um que falha: o segundo
   * avisa.
   */
  if (request.job === "cena" && "cena" in lido && lido.cena.ordem !== request.ordem) {
    const detalhe = `o modelo devolveu a cena ${lido.cena.ordem}, e a pedida era a ${request.ordem}`;

    await recordFailure(supabase, {
      request,
      modelId: model.id,
      entityId,
      params,
      promptUserPt,
      receita,
      detalhe,
      usage: resposta.usage,
      realCost,
    });

    return { ok: false, reason: "invalid_answer", detalhe };
  }

  const { historia, cenas } =
    "cena" in lido
      ? { historia: existente!.historia, cenas: aplicarCena(existente!.cenas, lido.cena) }
      : lido.roteiro;

  // -------------------------------------------------------------------------
  // 7. A persistência. As fichas primeiro, pelo motivo do cabeçalho.
  // -------------------------------------------------------------------------
  const gravado = await gravarFichas(supabase, {
    userId,
    projectId: request.projectId,
    nodeId: request.nodeId,
    ideia: promptUserPt,
    canal,
    entityId,
    historia,
    cenas,
  });

  if (!gravado.ok) {
    await recordFailure(supabase, {
      request,
      modelId: model.id,
      entityId,
      params,
      promptUserPt,
      receita,
      detalhe: gravado.detalhe,
      usage: resposta.usage,
      realCost,
    });

    return { ok: false, reason: "error" };
  }

  // -------------------------------------------------------------------------
  // 8. record_generation — a única porta que escreve em generations e no ledger
  //    na mesma transação. O preço sai do catálogo lá dentro, de novo: o que
  //    viaja daqui é o job, nunca o número.
  // -------------------------------------------------------------------------
  const { data: generation, error: chargeError } = await supabase.rpc("record_generation", {
    p_model_id: model.id,
    p_status: "succeeded",
    p_media_kind: "text",
    p_job_kind: request.job,
    p_entity_id: entityId ?? undefined,
    p_project_id: request.projectId,
    p_node_id: request.nodeId,
    p_prompt_user_pt: promptUserPt === "" ? undefined : promptUserPt,
    p_prompt_compiled: auditoria(request.job, receita, historia, cenas),
    p_params: params,
    p_input_tokens: resposta.usage.inputTokens,
    p_output_tokens: resposta.usage.outputTokens,
    p_real_cost_cents: realCost ?? undefined,
  });

  if (chargeError || !generation) {
    return {
      ok: false,
      reason: CHARGE_ERROR_CODES[chargeError?.code ?? ""] ?? "error",
      neededSparks: priceSparks,
      balanceSparks,
    };
  }

  const cenasNoOriginal = historia.cenas_no_original;

  return {
    ok: true,
    generationId: generation.id,
    storyboardId: gravado.storyboardId,
    historia,
    cenas,
    sparksCharged: generation.sparks_charged,
    balanceSparks: balanceSparks - generation.sparks_charged,
    // A conta, nunca a frase. `ajuste` ilustra; este booleano decide.
    condensou: cenasNoOriginal !== null && cenasNoOriginal > cenas.length,
  };
}

// ---------------------------------------------------------------------------
// Passo 2 — o contexto do pedido
// ---------------------------------------------------------------------------

type Supabase = Awaited<ReturnType<typeof createSupabaseServerClient>>;

/** O roteiro que já está no node, quando o job precisa dele. */
type RoteiroExistente = { id: string; historia: Historia; cenas: Cena[] };

type Contexto =
  | {
      ok: true;
      personagem: PersonagemDaReceita | null;
      entityId: string | null;
      canal: Canal;
      existente: RoteiroExistente | null;
    }
  | { ok: false; reason: StoryboardGenerationFailure; handle?: string };

/**
 * Resolve tudo o que o pedido precisa saber antes de custar alguma coisa: quem
 * está em cena, se ela trabalha neste projeto, e — no job `cena` — qual roteiro
 * está sendo reescrito.
 *
 * O gênero vem da **versão congelada** e não do rascunho, mesmo a ficha
 * guardando só o handle. É ele que a receita usa para escrever a personagem, e
 * ler o rascunho faria dois roteiros gerados com dez minutos de diferença
 * saírem com gêneros diferentes se alguém tivesse mexido no editor no meio.
 */
async function carregarContexto(
  supabase: Supabase,
  userId: string,
  request: ParsedRequest,
): Promise<Contexto> {
  if (request.job === "cena") {
    const existente = await carregarRoteiro(supabase, request.projectId, request.nodeId);

    if (!existente) {
      return { ok: false, reason: "storyboard_not_found" };
    }

    if (!existente.cenas.some((cena) => cena.ordem === request.ordem)) {
      return { ok: false, reason: "scene_not_found" };
    }

    const handle = existente.cenas.find((c) => c.ordem === request.ordem)?.personagem ?? null;

    if (!handle) {
      return {
        ok: true,
        personagem: null,
        entityId: null,
        canal: existente.canal,
        existente: existente.roteiro,
      };
    }

    const resolvido = await resolverPersonagem(supabase, userId, handle, request.projectId);

    if (!resolvido.ok) return resolvido;

    return {
      ok: true,
      personagem: resolvido.personagem,
      entityId: resolvido.entityId,
      canal: existente.canal,
      existente: existente.roteiro,
    };
  }

  if (textoOriginal(request).trim() === "") {
    return { ok: false, reason: "empty_request" };
  }

  if (!request.personagem) {
    return { ok: true, personagem: null, entityId: null, canal: request.canal, existente: null };
  }

  const resolvido = await resolverPersonagem(
    supabase,
    userId,
    request.personagem.handle,
    request.projectId,
  );

  if (!resolvido.ok) return resolvido;

  return {
    ok: true,
    personagem: resolvido.personagem,
    entityId: resolvido.entityId,
    canal: request.canal,
    existente: null,
  };
}

/**
 * `@luna` → a personagem, se ela for do usuário, não estiver arquivada,
 * trabalhar **neste** projeto e tiver ao menos uma versão congelada.
 *
 * As três recusas são separadas porque têm três consertos diferentes, e uma
 * mensagem que não distingue "ela não existe" de "ela não está neste projeto"
 * manda a pessoa procurar o problema no lugar errado.
 */
async function resolverPersonagem(
  supabase: Supabase,
  userId: string,
  handle: string,
  projectId: string,
): Promise<
  | { ok: true; personagem: PersonagemDaReceita; entityId: string }
  | { ok: false; reason: StoryboardGenerationFailure; handle: string }
> {
  const { data: entity } = await supabase
    .from("entities")
    .select("id, handle, active_version_id")
    .eq("user_id", userId)
    .eq("kind", "character")
    .eq("handle", handle)
    .is("archived_at", null)
    .maybeSingle();

  if (!entity) {
    return { ok: false, reason: "unknown_handle", handle };
  }

  // Antes da versão, de propósito: quem não está neste projeto não deve receber
  // a instrução de salvar uma v1 que não resolveria nada.
  const { data: link } = await supabase
    .from("project_entities")
    .select("entity_id")
    .eq("project_id", projectId)
    .eq("entity_id", entity.id)
    .maybeSingle();

  if (!link) {
    return { ok: false, reason: "not_linked", handle };
  }

  if (!entity.active_version_id) {
    return { ok: false, reason: "no_version", handle };
  }

  const { data: version } = await supabase
    .from("entity_versions")
    .select("sheet")
    .eq("id", entity.active_version_id)
    .maybeSingle();

  if (!version) {
    return { ok: false, reason: "no_version", handle };
  }

  return {
    ok: true,
    entityId: entity.id,
    personagem: { handle: entity.handle, genero: generoDaFicha(version.sheet) },
  };
}

/**
 * O gênero da ficha congelada, para a receita escrever "ela" e não "they".
 *
 * Lê defensivamente porque `sheet` é `jsonb` e uma versão antiga pode não ter o
 * campo. O default é o mesmo do compilador de imagem: quando não se sabe, a
 * palavra neutra — nunca um chute que sai como certeza no texto.
 */
function generoDaFicha(sheet: unknown): string {
  const lido = z
    .object({
      dna_visual: z.object({
        genero_apresentacao: z.object({ valor: z.string().nullable() }),
      }),
    })
    .safeParse(sheet);

  return lido.success ? (lido.data.dna_visual.genero_apresentacao.valor ?? "androgino") : "androgino";
}

async function carregarCtas(supabase: Supabase, canal: Canal): Promise<CtaSugestao[]> {
  const { data } = await supabase
    .from("cta_library")
    .select("id, texto_pt")
    .eq("canal", canal)
    .eq("momento", "cta")
    .eq("enabled", true)
    .order("sort_order");

  return data ?? [];
}

/** O roteiro gravado neste node, reconstruído na forma do contrato. */
async function carregarRoteiro(
  supabase: Supabase,
  projectId: string,
  nodeId: string,
): Promise<{ roteiro: RoteiroExistente; canal: Canal; cenas: Cena[] } | null> {
  const { data: storyboard } = await supabase
    .from("storyboards")
    .select(
      "id, canal, titulo, formato, estilo, genero, cenas_no_original, ajuste, storyboard_scenes (ordem, acao, personagem_handle, produto, cenario, enquadramento, movimento, fala, cta_id, cta_texto, duracao_segundos, transicao)",
    )
    .eq("project_id", projectId)
    .eq("node_id", nodeId)
    .maybeSingle();

  if (!storyboard) return null;

  const cenas: Cena[] = [...storyboard.storyboard_scenes]
    .sort((a, b) => a.ordem - b.ordem)
    .map((row) => ({
      ordem: row.ordem,
      acao: row.acao,
      personagem: row.personagem_handle,
      produto: row.produto,
      cenario: row.cenario,
      enquadramento: row.enquadramento as Cena["enquadramento"],
      movimento: row.movimento,
      fala: row.fala,
      cta_id: row.cta_id,
      cta_texto: row.cta_texto,
      duracao_segundos: row.duracao_segundos,
      transicao: row.transicao as Cena["transicao"],
    }));

  const historia: Historia = {
    titulo: storyboard.titulo,
    formato: storyboard.formato as Historia["formato"],
    estilo: storyboard.estilo as Historia["estilo"],
    genero: storyboard.genero,
    cenas_no_original: storyboard.cenas_no_original,
    ajuste: storyboard.ajuste,
  };

  return {
    roteiro: { id: storyboard.id, historia, cenas },
    canal: storyboard.canal as Canal,
    cenas,
  };
}

// ---------------------------------------------------------------------------
// A receita e a auditoria
// ---------------------------------------------------------------------------

function montarReceita(
  request: ParsedRequest,
  contexto: {
    personagem: PersonagemDaReceita | null;
    canal: Canal;
    ctas: CtaSugestao[];
    existente: RoteiroExistente | null;
  },
): Receita {
  if (request.job === "roteiro") {
    return receitaRoteiro({
      ideia: request.ideia,
      canal: contexto.canal,
      ctas: contexto.ctas,
      personagem: contexto.personagem,
      produto: request.produto,
      cenas: request.cenas,
    });
  }

  if (request.job === "estruturar") {
    return receitaEstruturar({
      texto: request.texto,
      canal: contexto.canal,
      ctas: contexto.ctas,
      personagem: contexto.personagem,
      produto: request.produto,
    });
  }

  const existente = contexto.existente!;
  const indice = existente.cenas.findIndex((cena) => cena.ordem === request.ordem);

  return receitaCena({
    cena: existente.cenas[indice]!,
    anterior: existente.cenas[indice - 1] ?? null,
    seguinte: existente.cenas[indice + 1] ?? null,
    instrucao: request.instrucao,
    canal: contexto.canal,
    ctas: contexto.ctas,
    personagem: contexto.personagem,
    historia: existente.historia,
  });
}

/** O texto que a pessoa escreveu, que vira `generations.prompt_user_pt`. */
function textoOriginal(request: ParsedRequest): string {
  if (request.job === "roteiro") return request.ideia.trim();
  if (request.job === "estruturar") return request.texto.trim();
  return request.instrucao.trim();
}

/**
 * O que fica gravado em `generations.prompt_compiled`.
 *
 * A invariante 13 pede auditoria bilíngue, e aqui ela tem uma forma própria:
 * **não há inglês.** Um roteiro é escrito em português do começo ao fim, e não
 * passa pelo tradutor — a tradução acontece um degrau adiante, quando uma ficha
 * vira imagem. Gravar um campo `en` vazio para cumprir a letra da regra seria
 * cumprir a letra contra o propósito.
 *
 * O que a regra quer é que se possa responder "com o que isto foi feito?", e é
 * isso que está aqui: a receita exata que foi enviada (as duas metades) e a
 * resposta exata que foi aceita. Com as duas, esta geração é reproduzível — que
 * é a razão de a coluna existir.
 */
function auditoria(job: JobKind, receita: Receita, historia: Historia, cenas: Cena[]): Json {
  return {
    job_kind: job,
    idioma: "pt-BR",
    receita: { system: receita.system, user: receita.user },
    resposta: { historia, cenas },
  };
}

/** A cena reescrita entra no lugar da antiga, sem mexer nas vizinhas. */
function aplicarCena(cenas: Cena[], nova: Cena): Cena[] {
  return cenas.map((cena) => (cena.ordem === nova.ordem ? nova : cena));
}

// ---------------------------------------------------------------------------
// Passo 7 — a persistência
// ---------------------------------------------------------------------------

/**
 * O storyboard e suas fichas, gravados.
 *
 * Substituir um roteiro apaga as fichas antigas antes de inserir as novas, e a
 * ordem importa: inserir primeiro bateria no trigger de dez cenas com as
 * antigas ainda na mesa. Não há história a preservar numa ficha — a história de
 * quem pagou o quê está em `generations`, que continua append-only.
 */
async function gravarFichas(
  supabase: Supabase,
  input: {
    userId: string;
    projectId: string;
    nodeId: string;
    ideia: string;
    canal: Canal;
    entityId: string | null;
    historia: Historia;
    cenas: Cena[];
  },
): Promise<{ ok: true; storyboardId: string } | { ok: false; detalhe: string }> {
  const { data: storyboard, error: upsertError } = await supabase
    .from("storyboards")
    .upsert(
      {
        user_id: input.userId,
        project_id: input.projectId,
        node_id: input.nodeId,
        ideia: input.ideia,
        canal: input.canal,
        titulo: input.historia.titulo,
        formato: input.historia.formato,
        estilo: input.historia.estilo,
        genero: input.historia.genero,
        cenas_no_original: input.historia.cenas_no_original,
        ajuste: input.historia.ajuste,
        entity_id: input.entityId,
      },
      { onConflict: "project_id,node_id" },
    )
    .select("id")
    .single();

  if (upsertError || !storyboard) {
    return { ok: false, detalhe: `storyboards: ${upsertError?.message ?? "sem linha"}` };
  }

  const { error: deleteError } = await supabase
    .from("storyboard_scenes")
    .delete()
    .eq("storyboard_id", storyboard.id);

  if (deleteError) {
    return { ok: false, detalhe: `storyboard_scenes delete: ${deleteError.message}` };
  }

  const { error: insertError } = await supabase.from("storyboard_scenes").insert(
    input.cenas.map((cena) => ({
      storyboard_id: storyboard.id,
      user_id: input.userId,
      ordem: cena.ordem,
      acao: cena.acao,
      personagem_handle: cena.personagem,
      produto: cena.produto,
      cenario: cena.cenario,
      enquadramento: cena.enquadramento,
      movimento: cena.movimento,
      fala: cena.fala,
      cta_id: cena.cta_id,
      cta_texto: cena.cta_texto,
      duracao_segundos: cena.duracao_segundos,
      transicao: cena.transicao,
    })),
  );

  if (insertError) {
    return { ok: false, detalhe: `storyboard_scenes insert: ${insertError.message}` };
  }

  return { ok: true, storyboardId: storyboard.id };
}

// ---------------------------------------------------------------------------
// Falhas
// ---------------------------------------------------------------------------

/**
 * Uma geração falha é registrada e é de graça — a regra que as extrações já
 * mantêm, garantida em dois lugares: pelo `case` de record_generation e pela
 * constraint `generations_failed_is_free`, que vale mesmo se o `case` fosse
 * esquecido.
 *
 * `p_real_cost_cents` é gravado assim mesmo quando o modelo chegou a responder.
 * Uma resposta que o Zod recusou custou tokens de verdade, e um custo real de
 * zero numa linha que consumiu 3.500 tokens seria uma mentira confortável na
 * única coluna que existe para conciliar com a fatura.
 */
async function recordFailure(
  supabase: Supabase,
  input: {
    request: ParsedRequest;
    modelId: string;
    entityId: string | null;
    params: GenerationParams;
    promptUserPt: string;
    receita: Receita;
    detalhe: string;
    usage?: { inputTokens: number; outputTokens: number };
    realCost?: number | null;
  },
): Promise<void> {
  if (process.env.NODE_ENV !== "production") {
    console.error(
      `[storyboard] node ${input.request.nodeId} (${input.request.job}) failed — ${input.detalhe}`,
    );
  }

  await supabase.rpc("record_generation", {
    p_model_id: input.modelId,
    p_status: "failed",
    p_media_kind: "text",
    p_job_kind: input.request.job,
    p_entity_id: input.entityId ?? undefined,
    p_project_id: input.request.projectId,
    p_node_id: input.request.nodeId,
    p_prompt_user_pt: input.promptUserPt === "" ? undefined : input.promptUserPt,
    // Sem resposta para gravar, mas a pergunta fica: uma falha cujo prompt
    // ninguém guardou é uma falha que ninguém consegue reproduzir.
    p_prompt_compiled: {
      job_kind: input.request.job,
      idioma: "pt-BR",
      receita: { system: input.receita.system, user: input.receita.user },
    },
    p_params: input.params,
    p_input_tokens: input.usage?.inputTokens,
    p_output_tokens: input.usage?.outputTokens,
    p_real_cost_cents: input.realCost ?? undefined,
    p_error_message: input.detalhe.slice(0, 500),
  });
}
