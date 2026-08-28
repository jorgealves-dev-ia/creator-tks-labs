import { z } from "zod";

/**
 * O contrato das fichas de cena — FRENTE STORYBOARD · CICLO 2 · Fase 2.
 *
 * Nasceu de `scratchpad/storyboard-c2/contrato.mjs`, o rascunho da Fase 0 que
 * mediu 47 chamadas reais contra dois modelos e três versões de receita. O que
 * está aqui é aquele rascunho promovido, não uma reescrita: cada lista fechada,
 * cada `maxItems` e cada `refine` já provou que sobrevive ao modelo.
 *
 * Duas saídas, uma definição:
 *
 *   - `SCHEMA_JSON` viaja para o provedor no `response_format`
 *   - `parseRoteiro` (Zod) é a autoridade que decide se o que voltou pode ser
 *     gravado
 *
 * A lição de 08/08/2026 vale aqui inteira: **o schema torna a violação rara; o
 * Zod a torna impossível de gravar.** Os dois, e o segundo manda. Um schema é
 * um pedido educado ao provedor; um `safeParse` é uma porta.
 *
 * Este arquivo não importa `server-only`, e isso é deliberado: as listas
 * fechadas são vocabulário de interface tanto quanto de servidor, e o editor de
 * ficha vai precisar delas para montar seus seletores.
 */

// ---------------------------------------------------------------------------
// Listas fechadas
// ---------------------------------------------------------------------------

/**
 * §5.27 do character sheet — a lista de ângulo de câmera, reusada verbatim.
 *
 * Não é economia: é a regra de 10/08/2026. Onde já existe vocabulário fechado
 * não se inventa vocabulário paralelo, e duas listas de enquadramento seriam
 * duas verdades sobre a mesma coisa.
 *
 * O ganho concreto aparece na ponte para o gerador de imagem: a chave da ficha
 * **é** a chave que o bloco Gerar Imagem já consome como `anguloKey`, então a
 * passagem é atribuição direta e não tabela de tradução.
 *
 * E é por isso que `storyboard_scenes.enquadramento` não tem CHECK no banco:
 * o dicionário é a fonte única, acrescentar opção lá é sempre seguro, e uma
 * cópia da lista numa constraint transformaria "acrescentar opção" em "escrever
 * migration". A degradação já está escrita: chave desconhecida vira Auto
 * inteiro no compilador, então o pior caso é uma cena sem ângulo dirigido —
 * nunca uma cena errada.
 */
export const ENQUADRAMENTO_KEYS = [
  "frontal",
  "tres_quartos",
  "perfil",
  "de_cima",
  "de_baixo",
  "close_rosto",
  "plano_americano",
  "corpo_inteiro",
] as const;

/** Os oito formatos do registro de 13/08/2026 (mapa de vídeo, item 2). */
export const FORMATO_KEYS = [
  "pov",
  "selfie",
  "review",
  "comercial",
  "demonstracao",
  "provador",
  "react",
  "rotina_grwm",
] as const;

/** Estilo é eixo transversal ao formato — UGC é estilo, nunca formato. */
export const ESTILO_KEYS = ["ugc", "editorial", "cinematografico", "publicitario"] as const;

/** Corte seco, ou emenda pelo último quadro — o elo do Ciclo 1. */
export const TRANSICAO_KEYS = ["corte", "continuacao"] as const;

/** Espelha o CHECK de `cta_library.canal`. Canal novo é decisão de produto. */
export const CANAL_KEYS = ["tiktok", "tiktok_shop", "reels", "shorts", "shopee"] as const;

/**
 * Os três gestos que o produto vende, espelhando o CHECK de
 * `ai_model_text_prices.job_kind`. Vocabulário nosso, não do fornecedor — e por
 * isso lista fechada dos dois lados.
 */
export const JOB_KINDS = ["roteiro", "estruturar", "cena"] as const;

export type Enquadramento = (typeof ENQUADRAMENTO_KEYS)[number];
export type Formato = (typeof FORMATO_KEYS)[number];
export type Estilo = (typeof ESTILO_KEYS)[number];
export type Transicao = (typeof TRANSICAO_KEYS)[number];
export type Canal = (typeof CANAL_KEYS)[number];
export type JobKind = (typeof JOB_KINDS)[number];

/**
 * O teto de 10, primeira das três camadas.
 *
 * Aqui ele é `maxItems` no schema que viaja; abaixo é `.max()` no Zod; no banco
 * é o CHECK de `ordem` **mais** o trigger que conta linhas. Se o modelo
 * respeitar, a recusa nunca precisa acontecer; se não respeitar, o Zod recusa e
 * a geração falha **de graça**, porque falha não cobra.
 */
export const TETO_CENAS = 10;

// ---------------------------------------------------------------------------
// O schema que viaja — response_format
// ---------------------------------------------------------------------------

/**
 * Uma cena, na forma que o provedor entende.
 *
 * `required` lista **todos** os campos, inclusive os anuláveis, e isso não é
 * descuido: em structured outputs um campo ausente e um campo nulo são
 * respostas diferentes, e só a segunda é verificável. Exigir a chave e permitir
 * `null` obriga o modelo a **decidir** que não há fala, em vez de esquecer que
 * o campo existia.
 */
/**
 * As durações que o catálogo sabe cobrar, quando ele não sabe nenhuma.
 *
 * Só entra em cena se `ai_model_video_prices` não tiver **nenhuma** linha de
 * modelo aceso — e aí o problema é de catálogo, não de schema: não existe
 * duração animável nenhuma, e apertar o roteiro não conserta isso. Nesse caso o
 * gerador volta a aceitar a faixa larga em vez de recusar todo roteiro, porque
 * escrever a história continua valendo mesmo com o catálogo de vídeo vazio.
 */
export const DURACOES_SEM_CATALOGO = Array.from({ length: 60 }, (_, i) => i + 1);

/**
 * As durações permitidas viram **enum** no schema que viaja, e não uma faixa.
 *
 * A diferença é onde o erro é impedido. `minimum/maximum` deixa o modelo
 * escrever 8 segundos e nos obriga a recusar **depois de pagar**; um `enum` com
 * o que o catálogo precifica faz o structured output **não conseguir** produzir
 * outra coisa. É a regra de 13/08 — *não se oferece o que não se sabe cobrar* —
 * aplicada uma camada acima: não se **pede** o que não se sabe cobrar.
 *
 * Quatro camadas guardam a mesma promessa, como o teto de 10 tem três: a receita
 * diz por extenso, este schema restringe, o Zod recusa, e `ai_model_video_prices`
 * é quem define a lista. Nenhuma delas depende de alguém lembrar das outras.
 */
function cenaSchemaJson(duracoes: readonly number[]) {
  return {
  type: "object",
  properties: {
    ordem: { type: "integer", minimum: 1, maximum: TETO_CENAS },
    acao: { type: "string", description: "Direção de atuação com tempo, em português." },
    personagem: { type: ["string", "null"], description: "Handle da personagem, sem @." },
    produto: { type: ["string", "null"] },
    cenario: { type: "string" },
    enquadramento: { type: "string", enum: [...ENQUADRAMENTO_KEYS] },
    movimento: {
      type: "string",
      description: "Movimento de câmera ou do sujeito, em português.",
    },
    fala: { type: ["string", "null"] },
    cta_id: { type: ["string", "null"] },
    cta_texto: { type: ["string", "null"] },
    duracao_segundos: {
      type: "integer",
      enum: [...duracoes],
      description: "Duração do clipe em segundos. Só os valores listados são animáveis.",
    },
    transicao: { type: "string", enum: [...TRANSICAO_KEYS] },
  },
  required: [
    "ordem",
    "acao",
    "personagem",
    "produto",
    "cenario",
    "enquadramento",
    "movimento",
    "fala",
    "cta_id",
    "cta_texto",
    "duracao_segundos",
    "transicao",
  ],
  additionalProperties: false,
  } as const;
}

export function buildSchemaJson(duracoes: readonly number[]) {
  return {
  type: "object",
  properties: {
    historia: {
      type: "object",
      properties: {
        titulo: { type: "string", description: "Título curto da história, em português." },
        formato: { type: "string", enum: [...FORMATO_KEYS] },
        estilo: { type: "string", enum: [...ESTILO_KEYS] },
        genero: {
          type: "string",
          description: "Gênero/nicho em uma ou duas palavras, em português.",
        },
        /**
         * Quantas cenas o texto RECEBIDO tinha — só no job `estruturar`.
         *
         * Nasceu de um defeito da rodada 1 da Fase 0: o modelo declarou
         * "Condensado de 6 para 6 cenas" sobre um roteiro que não foi
         * condensado. Uma declaração que dispara quando nada aconteceu ensina
         * quem lê a ignorar a declaração.
         *
         * A correção não é confiar melhor na prosa: é **parar de confiar nela**.
         * Com este número, quem decide se houve condensação é a conta
         * (`cenas_no_original > cenas.length`), e `ajuste` vira ilustração de um
         * fato já estabelecido pelo dado. Mesma doutrina do quadro derivado de
         * 15/08: o que identifica é o dado, nunca o rótulo.
         */
        cenas_no_original: {
          type: ["integer", "null"],
          description:
            "Somente ao estruturar um roteiro recebido: quantas cenas o texto original tinha. null quando a história foi escrita agora.",
        },
        ajuste: {
          type: ["string", "null"],
          description:
            "O que foi feito para o roteiro caber no teto de cenas, em uma frase em português. null quando nada foi reduzido.",
        },
      },
      required: ["titulo", "formato", "estilo", "genero", "cenas_no_original", "ajuste"],
      additionalProperties: false,
    },
    cenas: {
      type: "array",
      minItems: 1,
      maxItems: TETO_CENAS,
      items: cenaSchemaJson(duracoes),
    },
  },
  required: ["historia", "cenas"],
  additionalProperties: false,
  } as const;
}

/** O mesmo schema, para uma cena só — o job_kind `cena`. */
export function buildSchemaJsonCena(duracoes: readonly number[]) {
  return {
    type: "object",
    properties: { cena: cenaSchemaJson(duracoes) },
    required: ["cena"],
    additionalProperties: false,
  } as const;
}

// ---------------------------------------------------------------------------
// A autoridade — Zod
// ---------------------------------------------------------------------------

const cenaSchema = z.object({
  ordem: z.number().int().min(1).max(TETO_CENAS),
  acao: z.string().min(1),
  personagem: z.string().nullable(),
  produto: z.string().nullable(),
  cenario: z.string().min(1),
  enquadramento: z.enum(ENQUADRAMENTO_KEYS),
  movimento: z.string(),
  fala: z.string().nullable(),
  cta_id: z.string().nullable(),
  cta_texto: z.string().nullable(),
  duracao_segundos: z.number().int().min(1).max(60),
  transicao: z.enum(TRANSICAO_KEYS),
});

const historiaSchema = z.object({
  titulo: z.string().min(1),
  formato: z.enum(FORMATO_KEYS),
  estilo: z.enum(ESTILO_KEYS),
  genero: z.string().min(1),
  cenas_no_original: z.number().int().min(1).nullable(),
  ajuste: z.string().nullable(),
});

/**
 * As três regras que nenhum JSON Schema expressa — e são justamente as que
 * quebrariam a tabela se passassem.
 *
 * Ordens repetidas violariam `storyboard_scenes_ordem_unica`; uma sequência com
 * buracos deixaria a cena 3 emendando um quadro que não existe; e uma cena 1
 * marcada `continuacao` bateria em `storyboard_scenes_primeira_nao_continua`.
 *
 * Recusar aqui e recusar no banco não é redundância: o banco recusa a
 * transação inteira com um erro que ninguém consegue explicar ao usuário, e
 * este recusa antes, com o campo culpado nomeado, gravando uma linha `failed`
 * que não cobra nada.
 */
const roteiroSchema = z
  .object({
    historia: historiaSchema,
    cenas: z.array(cenaSchema).min(1).max(TETO_CENAS),
  })
  .refine((r) => new Set(r.cenas.map((c) => c.ordem)).size === r.cenas.length, {
    message: "ordem repetida entre cenas",
  })
  .refine((r) => r.cenas.every((c, i) => c.ordem === i + 1), {
    message: "a ordem das cenas não é 1..N contígua",
  })
  .refine((r) => r.cenas[0]?.transicao !== "continuacao", {
    message: "a cena 1 não pode ser continuação — não há quadro anterior",
  });

/**
 * Uma cena só — o job `cena`.
 *
 * O `refine` aqui não é cópia do de cima por simetria: ele é uma correção com
 * recibo. A primeira versão deste arquivo aplicava as três regras ao roteiro
 * inteiro e nenhuma à cena avulsa, e o harness da Fase 2 pegou: uma cena 1
 * reescrita voltando como `continuacao` passava.
 *
 * O estrago seria caro do jeito mais irritante possível. `storyboard_scenes_
 * primeira_nao_continua` recusaria a gravação — mas só no passo 7, **depois** de
 * o provedor ter sido pago —, e a pessoa veria "não foi possível" sem saber o
 * que refazer. Recusar aqui é recusar antes da persistência, com o campo
 * culpado nomeado e a linha gravada como `failed`, que não cobra.
 *
 * As outras duas regras do roteiro (ordem única e ordem contígua) não cabem
 * aqui e a ausência delas está certa: as duas falam da relação entre cenas, e
 * uma cena avulsa não tem vizinha para contradizer. Quem confere se a ordem
 * devolvida é a que foi pedida é o motor, que sabe o que pediu.
 */
export const cenaUnicaSchema = z
  .object({ cena: cenaSchema })
  .refine((r) => !(r.cena.ordem === 1 && r.cena.transicao === "continuacao"), {
    message: "a cena 1 não pode ser continuação — não há quadro anterior",
  });

export type Cena = z.infer<typeof cenaSchema>;
export type Historia = z.infer<typeof historiaSchema>;
export type Roteiro = z.infer<typeof roteiroSchema>;

/**
 * Por que a falha é um valor de retorno e não uma exceção.
 *
 * Quem chama precisa transformar um JSON inválido numa linha `failed` de custo
 * zero — o que exige continuar executando depois do erro, com o texto do
 * problema na mão. Uma exceção convidaria a um `catch` genérico onde a
 * diferença entre "o modelo devolveu lixo" e "o banco caiu" se perde, e as duas
 * precisam de tratamentos diferentes: uma é falha registrada e grátis, a outra
 * é erro de infraestrutura.
 *
 * `etapa` separa as duas fronteiras que podem quebrar. "json" é o modelo tendo
 * devolvido algo que não é JSON; "zod" é JSON bem formado dizendo coisa que não
 * pode ser gravada. Na Fase 0 as duas apareceram, e a segunda é a interessante:
 * schema respeitado e regra de negócio violada.
 */
export type ParseFailure = { ok: false; etapa: "json" | "zod"; erro: string };

/**
 * A quarta camada da duração — o backstop do enum que viajou.
 *
 * O `enum` do `response_format` já impede o modelo de escrever 8 segundos, então
 * esta função **não deveria** disparar nunca. Ela existe pelo mesmo motivo que o
 * GN006 existe no banco: no dia em que um provedor novo ignorar o schema, é
 * melhor uma falha registrada e grátis do que uma ficha morta gravada.
 *
 * E ela nomeia a cena e a lista permitida, porque a mensagem vira `error_message`
 * de uma linha `failed` — e um erro que não diz qual cena não ajuda ninguém.
 */
function conferirDuracoes(
  cenas: readonly Cena[],
  duracoes: readonly number[],
): ParseFailure | null {
  const fora = cenas.find((cena) => !duracoes.includes(cena.duracao_segundos));

  if (!fora) return null;

  return {
    ok: false,
    etapa: "zod",
    erro:
      `cena ${fora.ordem}: duracao_segundos ${fora.duracao_segundos} não está no ` +
      `catálogo de vídeo (permitidas: ${duracoes.join(", ")})`,
  };
}

export function parseRoteiro(
  texto: string,
  duracoes: readonly number[],
): { ok: true; roteiro: Roteiro } | ParseFailure {
  const bruto = lerJson(texto);

  if (!bruto.ok) return bruto;

  const lido = roteiroSchema.safeParse(bruto.valor);

  if (!lido.success) {
    return { ok: false, etapa: "zod", erro: descreveIssues(lido.error) };
  }

  const duracaoRuim = conferirDuracoes(lido.data.cenas, duracoes);

  if (duracaoRuim) return duracaoRuim;

  return { ok: true, roteiro: lido.data };
}

export function parseCena(
  texto: string,
  duracoes: readonly number[],
): { ok: true; cena: Cena } | ParseFailure {
  const bruto = lerJson(texto);

  if (!bruto.ok) return bruto;

  const lido = cenaUnicaSchema.safeParse(bruto.valor);

  if (!lido.success) {
    return { ok: false, etapa: "zod", erro: descreveIssues(lido.error) };
  }

  const duracaoRuim = conferirDuracoes([lido.data.cena], duracoes);

  if (duracaoRuim) return duracaoRuim;

  return { ok: true, cena: lido.data.cena };
}

function lerJson(texto: string): { ok: true; valor: unknown } | ParseFailure {
  try {
    return { ok: true, valor: JSON.parse(texto) as unknown };
  } catch (error) {
    return {
      ok: false,
      etapa: "json",
      erro: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * O caminho do campo junto da mensagem, e não só a mensagem.
 *
 * "Invalid enum value" sozinho não diz qual cena nem qual campo, e uma falha
 * gravada em `generations.error_message` que não aponta o culpado é uma falha
 * que ninguém consegue investigar depois.
 */
function descreveIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => `${issue.path.join(".") || "(raiz)"}: ${issue.message}`)
    .join(" · ");
}
