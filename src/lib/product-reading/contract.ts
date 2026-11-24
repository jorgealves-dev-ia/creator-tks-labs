import { z } from "zod";

import { PRODUCT_DESCRIPTION_MAX, PRODUCT_NAME_MAX } from "@/lib/product-reading/limits";

/**
 * The reading contract — what a model is asked when it reads a product photo,
 * and what its answer has to be. F1 of docs/plano-produto-diz.md.
 *
 * ---------------------------------------------------------------------------
 * The system prompt below is v2, BYTE FOR BYTE
 * ---------------------------------------------------------------------------
 *
 * It is the text the F0 measured: four paid readings, two models, a
 * pre-registered answer key (26 and 27/09/2026). Its rule 2 — describe only what
 * the photo shows; who the piece is for only with visible evidence — is the
 * owner's sentence, word for word. A prompt that differs from the measured one
 * by a comma is a prompt nobody measured.
 *
 * So it was not typed here. `scratchpad/harness/contrato-v2-no-codigo.mjs`
 * copied it from the plan (which was itself copied by script from the evidence
 * file), and the F1 proofs check the md5 of what THIS MODULE exports against
 * the three numbers in the plan:
 *
 *   system prompt   99f41400f7f0b2d95da4557e7e99558a   (2020 characters)
 *   turn request    6cd53a1fe702a2efae2a284c9209cbef   (lives in the adapters)
 *   schema          1d7cc33e69e304cba818a72436931c1b   (JSON, two-space indent)
 *
 * **Changing the contract is the owner's decision**, with a new version (v3)
 * and new readings — never a silent edit. If the md5 proof goes red, that is
 * what happened.
 */

export const PRODUCT_READING_CONTRACT_VERSION = "v2";

export const PRODUCT_READING_SYSTEM_PROMPT = `Você lê a foto de um PRODUTO e escreve o que ele é, para que um gerador de imagens o reproduza fielmente sem ver a foto.

FORMATO DA RESPOSTA

Sua resposta inteira é um objeto JSON: o primeiro caractere é "{" e o último é "}". Nada antes, nada depois — sem cerca de código, sem frase de introdução ou de fecho. Exatamente três chaves, no primeiro nível:

  {"nome": "...", "descricao_pt": "...", "descricao_en": "..."}

- "nome": curto, em português, como um vendedor chamaria o produto numa etiqueta. No máximo 60 caracteres.
- "descricao_pt": em português, texto corrido, até 600 caracteres.
- "descricao_en": a MESMA descrição, em inglês, até 600 caracteres. Começa pelo que o produto é — por exemplo "A short-sleeve blouse in …" —, porque é lida por um gerador de imagens.

O QUE A DESCRIÇÃO DIZ, nesta ordem

1. O que o produto é — o substantivo exato.
2. Os atributos visíveis que alguém precisaria para desenhá-lo sem ver a foto: cor, material ou textura aparente, forma, corte e caimento, comprimento (numa roupa: até onde ela vai no corpo), manga, gola ou decote, estampa, fechamento, acabamentos e detalhes.
3. Como se usa ou se veste.

REGRAS INEGOCIÁVEIS

1. Descreva o PRODUTO, nunca uma pessoa. Se alguém o veste ou o segura, ignore a pessoa por completo: nada de corpo, rosto, cabelo, pose ou expressão. Nunca tente identificar, nomear ou reconhecer ninguém.
2. Descreva apenas o que a foto evidencia. Atributos de quem usa a peça — faixa etária (infantil/adulto), gênero, modelagem (plus size) — só entram se houver evidência visível na foto (etiqueta, referência de escala, corpo vestindo). Na dúvida, omita.
3. Não invente o que não se vê. Marca, composição do tecido, tamanho, preço: o que a foto não mostra, a descrição não diz. Material que só se vê pela aparência é "aparente" — "aparenta malha", nunca "100% algodão".
4. Não descreva o fundo, a luz nem o enquadramento da foto — eles não são o produto.
5. As duas descrições dizem a mesma coisa: o inglês não acrescenta nem tira nada do português.`;

/**
 * The shape of the answer, in JSON Schema — sent to the providers that take one
 * (Google, through `response_format`). The Anthropic adapter asks for the shape
 * in the prompt above, which already spells it out.
 *
 * Deliberately loose: three strings. The ceilings and the "nothing empty" rule
 * are enforced by the Zod below, above the adapter layer, whoever answered.
 */
export const PRODUCT_READING_SCHEMA = {
  type: "object",
  properties: {
    nome: { type: "string" },
    descricao_pt: { type: "string" },
    descricao_en: { type: "string" },
  },
  required: ["nome", "descricao_pt", "descricao_en"],
} as const;

/**
 * What an answer must be to count as a reading.
 *
 * The contract asks for up to 60 and 600 characters; this accepts up to the
 * card's ceilings, so an answer a little long is not thrown away. What it does
 * not accept is a missing or empty sentence — and an answer that fails here is a
 * FAILED reading: recorded, and free.
 *
 * Extra keys are dropped, not refused: a model that adds `"confianca": "alta"`
 * wrote three good sentences and one nobody asked for.
 */
export const productReadingAnswerSchema = z.object({
  nome: z.string().trim().min(1).max(PRODUCT_NAME_MAX),
  descricao_pt: z.string().trim().min(1).max(PRODUCT_DESCRIPTION_MAX),
  descricao_en: z.string().trim().min(1).max(PRODUCT_DESCRIPTION_MAX),
});

export type ProductReadingAnswer = z.infer<typeof productReadingAnswerSchema>;
