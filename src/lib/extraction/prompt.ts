import type { CharacterSheet } from "@/lib/character-sheet/schema";
import {
  EXTRACTABLE_MARKS,
  extractableFields,
  MAX_MARKS_PER_KIND,
  type ExtractableField,
} from "@/lib/extraction/contract";

/**
 * The contract with the model, generated from the same definition the sheet is
 * built from — so the vocabulary offered to the model is exactly the vocabulary
 * the interface can display and the compiler can translate. Nothing is written
 * twice.
 *
 * Why the contract is the prompt and not a strict JSON schema
 * -----------------------------------------------------------
 * The first version constrained the answer with Anthropic's structured outputs.
 * The API refused it, and the refusal was measured rather than guessed:
 *
 *   * as nullable enums, with a `null` branch per field:
 *     "too many parameters with union types (29 ... limit: 16)"
 *   * as an enum containing null, removing every union:
 *     "the compiled grammar is too large"
 *   * as plain strings, removing every enum too: still too large
 *   * binary search on the field count: 15 fields pass, 20 fail
 *
 * Twenty-six fields simply do not fit that feature, whatever their shape. So the
 * strictness lives where the specification always said the rule lives (§4.3): the
 * Zod pass in answer.ts, which checks every value against the dictionary and
 * empties the field when it does not match. The prompt asks for the shape; the
 * validator is what guarantees it. That was already true — the schema was only
 * ever making violations rarer, never impossible.
 */

/**
 * The non-negotiable instructions of spec §4.2, in the system prompt so they
 * apply to both sources.
 *
 * The first rule is the one that matters most and is stated first: describe,
 * never identify. This engine exists to build 100% synthetic characters
 * (architecture decision 7), and a model that volunteered "this looks like
 * <person>" would be answering a question nobody is allowed to ask.
 */
const RULES = `Você preenche a ficha visual de uma personagem sintética a partir de uma referência.

FORMATO DA RESPOSTA

Sua resposta inteira é um objeto JSON: o primeiro caractere é "{" e o último é
"}". Nada antes, nada depois — sem cerca de código, sem "aqui está", sem frase de
introdução ou de fecho. As chaves são exatamente as listadas em CAMPOS e MARCAS,
no primeiro nível do objeto — nunca aninhe, nunca invente chave, nunca omita
nenhuma. O valor de cada campo é um objeto:

  {"valor": <chave da lista, ou null>, "confianca": "alta" | "baixa", "motivo": ""}

REGRAS INEGOCIÁVEIS

1. Descreva apenas ATRIBUTOS FÍSICOS observáveis. Nunca tente identificar, nomear
   ou reconhecer a pessoa — nem a da foto, nem alguém citado no texto. Não diga a
   quem ela se parece. Se a entrada trouxer um nome, ignore-o por completo.
2. Em "valor", use SEMPRE uma das chaves listadas para aquele campo, copiada
   exatamente como está. Nunca invente chave, nunca traduza a chave, nunca
   devolva o rótulo em vez da chave.
3. Confiança:
   - "alta": você vê o atributo com clareza e não hesitaria entre duas opções.
   - "baixa": você escolheu a opção mais provável entre duas ou mais plausíveis.
     Nesse caso escreva em "motivo" uma frase curta em português dizendo o que
     atrapalhou — por exemplo "luz amarelada, cor dos olhos incerta" ou "o texto
     não ancora o comprimento no corpo".
   Com "alta", "motivo" é string vazia.
4. O que NÃO dá para avaliar recebe "valor": null e confiança "alta". Não chute o
   inavaliável: altura numa foto de rosto, silhueta numa foto de ombros para cima,
   atributo simplesmente ausente no texto. Campo em branco é uma resposta honesta;
   chute não é.
5. Na dúvida entre "não sei" e "acho que é X": devolva X com confiança "baixa" e o
   motivo, e não null. Só use null quando a referência não oferece base alguma.
6. Vocabulário estrangeiro é mapeado para a chave mais próxima da nossa lista.
   "long wavy blonde hair" vira cor loiro e textura ondulado; o comprimento fica
   com confiança "baixa" e motivo, porque "long" não ancora no corpo.
7. Não descreva maquiagem, expressão, pose, roupa, cenário, luz ou enquadramento:
   nada disso pertence a esta ficha.`;

/** The system prompt: the rules above plus the exact vocabulary of this sheet. */
export function buildSystemPrompt(sheet: CharacterSheet): string {
  const fields = extractableFields(sheet);

  return [RULES, "", "CAMPOS", describeFields(fields), "", "MARCAS", describeMarks()].join("\n");
}

function describeFields(fields: readonly ExtractableField[]): string {
  return fields
    .map((field) =>
      field.kind === "number"
        ? `- ${field.wireKey} (${field.label}): "valor" é um número inteiro de ` +
          `${field.min} a ${field.max}, em centímetros, ou null. Só preencha se a ` +
          "referência declarar a altura — uma foto nunca permite medi-la."
        : `- ${field.wireKey} (${field.label}): ${field.keys.join(" | ")}`,
    )
    .join("\n");
}

/**
 * The marks are lists rather than fields, so they carry their own shape. The
 * per-item cap lives here in words: without a schema there is nothing to enforce
 * it with, and answer.ts trims anything beyond it anyway.
 */
function describeMarks(): string {
  return EXTRACTABLE_MARKS.map((mark) => {
    const parts = [
      ...Object.entries(mark.options).map(
        ([key, options]) => `${key}: ${options.map((option) => option.key).join(" | ")}`,
      ),
      ...mark.freeText.map((key) => `${key}: texto livre curto, em português`),
    ];

    return (
      `- ${mark.id} (${mark.label}): lista de até ${MAX_MARKS_PER_KIND} itens, ` +
      `[] quando não houver nenhuma visível. Cada item é um objeto com ` +
      `${parts.join("; ")}; mais "confianca" e "motivo" como nos campos acima.`
    );
  }).join("\n");
}
