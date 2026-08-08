import type { CharacterSheet } from "@/lib/character-sheet/schema";
import {
  EXTRACTABLE_MARKS,
  extractableFields,
  MAX_MARKS_PER_KIND,
  type ExtractableField,
} from "@/lib/extraction/contract";

/**
 * The contract with the model: the instructions, and the JSON shape the answer
 * must have.
 *
 * Both are generated from the same contract the sheet itself is built from, so
 * the vocabulary offered to the model is exactly the vocabulary the interface can
 * display and the compiler can translate. Nothing is written twice.
 *
 * Two independent guards keep invented vocabulary out. The JSON schema pins every
 * option to an enum, which makes an invalid key nearly impossible to produce; and
 * the Zod pass in answer.ts checks it again against the dictionary, which makes an
 * invalid key impossible to *store*. The first is a convenience, the second is
 * the rule (spec §4.3).
 */

/**
 * The non-negotiable instructions of spec §4.2, in the model's system prompt so
 * they apply to both sources.
 *
 * The first rule is the one that matters most and is stated first: describe, never
 * identify. This engine exists to build 100% synthetic characters (architecture
 * decision 7), and a model that volunteered "this looks like <person>" would be
 * answering a question nobody is allowed to ask.
 */
const RULES = `Você preenche a ficha visual de uma personagem sintética a partir de uma referência.

REGRAS INEGOCIÁVEIS

1. Descreva apenas ATRIBUTOS FÍSICOS observáveis. Nunca tente identificar, nomear
   ou reconhecer a pessoa — nem a da foto, nem alguém citado no texto. Não diga a
   quem ela se parece. Se a entrada trouxer um nome, ignore-o por completo.
2. Escolha SEMPRE uma das chaves listadas para o campo. Nunca invente chave, nunca
   traduza a chave, nunca devolva o rótulo em vez da chave.
3. Confiança:
   - "alta": você vê o atributo com clareza e não hesitaria entre duas opções.
   - "baixa": você escolheu a opção mais provável entre duas ou mais plausíveis.
     Nesse caso escreva em "motivo" uma frase curta em português dizendo o que
     atrapalhou — por exemplo "luz amarelada, cor dos olhos incerta" ou "o texto
     não ancora o comprimento no corpo".
   Com "alta", "motivo" é string vazia.
4. O que NÃO dá para avaliar recebe valor null e confiança "alta". Não chute o
   inavaliável: altura numa foto de rosto, silhueta numa foto de ombros para cima,
   atributo simplesmente ausente no texto. Campo em branco é uma resposta honesta;
   chute não é.
5. Na dúvida entre "não sei" e "acho que é X": devolva X com confiança "baixa" e o
   motivo, e não null. Só use null quando a referência não oferece base alguma.
6. Vocabulário estrangeiro é mapeado para a chave mais próxima da nossa lista.
   "long wavy blonde hair" vira cor loiro e textura ondulado; o comprimento fica
   com confiança "baixa" e motivo, porque "long" não ancora no corpo.
7. Não descreva maquiagem, expressão, pose, roupa, cenário, luz ou enquadramento:
   nada disso pertence a esta ficha.

Responda apenas com o JSON do formato pedido.`;

/** The system prompt: the rules above plus the exact vocabulary of this sheet. */
export function buildSystemPrompt(sheet: CharacterSheet): string {
  const fields = extractableFields(sheet);

  return [RULES, "", "CAMPOS", describeFields(fields), "", "MARCAS", describeMarks()].join("\n");
}

function describeFields(fields: readonly ExtractableField[]): string {
  return fields
    .map((field) =>
      field.kind === "number"
        ? `- ${field.id} (${field.label}): número inteiro de ${field.min} a ${field.max}, ` +
          "em centímetros. Só preencha se a referência declarar a altura — " +
          "uma foto nunca permite medi-la."
        : `- ${field.id} (${field.label}): ${field.keys.join(" | ")}`,
    )
    .join("\n");
}

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
      `vazia quando não houver nenhuma visível. Cada item tem ${parts.join("; ")}.`
    );
  }).join("\n");
}

// ---------------------------------------------------------------------------
// The JSON schema the answer is constrained to
// ---------------------------------------------------------------------------

/**
 * Structured outputs accept a deliberately small slice of JSON Schema: objects
 * must set `additionalProperties: false` and list every property in `required`,
 * and numeric or length bounds are not supported. So the height range and the
 * items-per-mark cap live in the prompt and are enforced again by Zod — the
 * schema pins the *shape* and the *vocabulary*, nothing else.
 */
export function buildJsonSchema(sheet: CharacterSheet): Record<string, unknown> {
  const fields = extractableFields(sheet);

  const properties: Record<string, unknown> = {};

  for (const field of fields) {
    properties[field.id] = answerObject(
      field.kind === "number" ? nullableNumber() : nullableEnum(field.keys),
    );
  }

  for (const mark of EXTRACTABLE_MARKS) {
    const itemProperties: Record<string, unknown> = {};

    for (const [key, options] of Object.entries(mark.options)) {
      itemProperties[key] = nullableEnum(options.map((option) => option.key));
    }

    for (const key of mark.freeText) {
      itemProperties[key] = { type: "string" };
    }

    itemProperties.confianca = CONFIANCA;
    itemProperties.motivo = { type: "string" };

    properties[mark.id] = {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: Object.keys(itemProperties),
        properties: itemProperties,
      },
    };
  }

  return {
    type: "object",
    additionalProperties: false,
    required: Object.keys(properties),
    properties,
  };
}

const CONFIANCA = { type: "string", enum: ["alta", "baixa"] } as const;

/** One field's answer: the value, how sure the model is, and why if it is not. */
function answerObject(valor: Record<string, unknown>): Record<string, unknown> {
  return {
    type: "object",
    additionalProperties: false,
    required: ["valor", "confianca", "motivo"],
    properties: { valor, confianca: CONFIANCA, motivo: { type: "string" } },
  };
}

/**
 * `anyOf` with an explicit null branch rather than a type array or a null inside
 * the enum: `anyOf` and `enum` are both documented as supported, and this spells
 * out "one of these keys, or nothing" in the least clever way available.
 */
function nullableEnum(keys: readonly string[]): Record<string, unknown> {
  return { anyOf: [{ type: "string", enum: [...keys] }, { type: "null" }] };
}

function nullableNumber(): Record<string, unknown> {
  return { anyOf: [{ type: "number" }, { type: "null" }] };
}
