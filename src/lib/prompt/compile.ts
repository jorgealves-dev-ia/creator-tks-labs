import {
  CABELO_ACABAMENTO,
  CABELO_COMPRIMENTO,
  CABELO_COR,
  CABELO_FRANJA,
  CABELO_REPARTICAO,
  CABELO_TEXTURA,
  DETAIL_PLACEHOLDER,
  ENQUADRAMENTO,
  ESTILO_RENDERIZACAO,
  estiloOption,
  EXPRESSAO,
  FORMATO_ROSTO,
  FUNDO_CANONICO,
  GENERO_APRESENTACAO,
  IDADE_APARENTE,
  ILUMINACAO,
  LABIOS,
  MARCA_TIPO,
  NARIZ,
  OLHOS_COR,
  OLHOS_ESPACAMENTO,
  OLHOS_FORMATO,
  PELE_SARDAS,
  PELE_SUBTOM,
  PELE_TOM,
  PIERCING_JOIA,
  PIERCING_LOCAL,
  POSE,
  PRONOUN_BY_GENERO,
  PRONOUN_PLACEHOLDER,
  PROPORCOES_BUSTO,
  PROPORCOES_CINTURA,
  PROPORCOES_QUADRIL,
  RESTRICAO_TIPO,
  SILHUETA_TODAS,
  SOBRANCELHAS_ESPESSURA,
  SOBRANCELHAS_FORMATO,
  TATUAGEM_ESTILO,
  TATUAGEM_POSICAO,
  TATUAGEM_TAMANHO,
  TRAJE_CANONICO,
  findOption,
  type GeneroApresentacao,
  type SheetOption,
} from "@/lib/character-sheet/dictionary";
import {
  entersPrompt,
  type CharacterSheet,
  type PlainChoice,
  type SheetField,
} from "@/lib/character-sheet/schema";

/**
 * The prompt compiler — the function that turns a character sheet into the
 * English identity block.
 *
 * Specification: docs/geracao-canonica.md §3, implementing the ten compilation
 * rules of docs/character-sheet.md §6, which are invariants of this project.
 *
 * Two properties define it, and everything below serves them:
 *
 *   PURE       — no network, no clock, no randomness. The same sheet produces the
 *                same prompt today and in a year. That is what makes an image
 *                reproducible from its stored prompt_compiled, and what lets the
 *                editor recompile on every keystroke for free.
 *
 *   LITERAL    — closed-list options are copied verbatim from the dictionary,
 *                never re-phrased. "na clavícula" is `collarbone-length hair`
 *                every single time (rule 7). Free text is the only thing that
 *                ever gets translated, and it is translated *before* it gets
 *                here — see character-sheet/translation.ts.
 *
 * What it deliberately does NOT do: the reference-sheet framing and the grid
 * instruction of §4.2. Those belong to the canonical generation, which wraps this
 * block. A compiler that knew about reference sheets could not serve the
 * generation nodes later.
 */

// ---------------------------------------------------------------------------
// What comes out
// ---------------------------------------------------------------------------

/** §3.1 · The structure, in the four blocks the specification names. */
export type CompiledStructure = {
  /** Rule 1's fixed order, one comma-separated item per entry. */
  identidade: string[];
  traje_canonico: string | null;
  /** Layer 2: pose, expression, background, light, framing. */
  cena_padrao: string[];
  /** Rule 5: always last, whatever the node asked for. */
  restricoes: string[];
};

/**
 * What did not make it into the prompt, and why. The preview shows this as the
 * honesty scoreboard — a prompt is only trustworthy if you can see what it left
 * out (rule 2: omission is better than a guess, but a *silent* omission is not).
 */
export type CompilationExclusions = {
  /** DNA fields and marks deduced without certainty, waiting to be confirmed. */
  inferidos: number;
  /** DNA fields and marks nobody has filled in. */
  vazios: number;
  /** Free text with no cached English yet — the preview says "traduzindo…". */
  aguardandoTraducao: number;
  /** Decision D6: general notes are an internal notebook, never a prompt. */
  temNotasGerais: boolean;
};

export type CompiledPrompt = {
  structure: CompiledStructure;
  /** The rendered text — what actually goes to the image API. */
  text: string;
  exclusions: CompilationExclusions;
};

/** The layer-2 fields a caller may supply itself (rule 4: node > sheet default). */
export type CenaPadraoKey =
  | "estilo_renderizacao"
  | "pose"
  | "expressao"
  | "fundo_canonico"
  | "iluminacao"
  | "enquadramento";

export type CompileOverrides = {
  /**
   * Replaces the sheet's canonical outfit. This is how §5.22's automatic
   * fallback is applied: the same sheet compiled again with the compression
   * option, and nothing else changed.
   */
  trajeCanonico?: string;
  /**
   * Layer-2 fields the caller states itself. Rule 4 in one parameter: what the
   * node defines, the sheet default does not repeat. The canonical generation
   * uses it for pose, expression and framing, which its grid instruction owns.
   */
  omitirCenaPadrao?: readonly CenaPadraoKey[];
};

// ---------------------------------------------------------------------------
// The tally, filled in as the compiler walks the sheet
// ---------------------------------------------------------------------------

type Tally = {
  inferidos: number;
  vazios: number;
  aguardandoTraducao: number;
};

/**
 * A field's contribution: the fixed English phrase, and the translated detail
 * that complements it. Either can be absent.
 */
type Resolved = { phrase: string | null; detail: string | null };

const NOTHING: Resolved = { phrase: null, detail: null };

/**
 * Reads one DNA field against its list.
 *
 * Rule 2 lives in the first three lines: a field that is `inferido` or `vazio`
 * contributes nothing at all — not its value, not its detail — and is counted so
 * the interface can say how much was left out.
 */
function resolveField(
  field: SheetField,
  options: readonly SheetOption[],
  pronoun: string,
  tally: Tally,
): Resolved {
  if (!entersPrompt(field.estado)) {
    if (field.estado === "inferido") tally.inferidos += 1;
    else tally.vazios += 1;

    return NOTHING;
  }

  return resolveChoice(field.valor, field.detalhes, field.detalhes_en, options, pronoun, tally);
}

/** Layers 2 and 3 have no state envelope, so the same reading without rule 2. */
function resolvePlain(
  choice: PlainChoice,
  options: readonly SheetOption[],
  pronoun: string,
  tally: Tally,
): Resolved {
  return resolveChoice(choice.valor, choice.detalhes, choice.detalhes_en, options, pronoun, tally);
}

function resolveChoice(
  valor: string | number | null,
  detalhes: string,
  detalhesEn: string,
  options: readonly SheetOption[],
  pronoun: string,
  tally: Tally,
): Resolved {
  const option = findOption(options, typeof valor === "string" ? valor : null);

  // An unknown key is a sheet written before an option was renamed. The
  // interface shows it as itself; the prompt simply says nothing about it,
  // because there is no English phrase that could be right.
  if (!option || option.en === null) return NOTHING;

  const wanted = detalhes.trim() !== "";
  const translated = detalhesEn.trim();

  if (wanted && translated === "") tally.aguardandoTraducao += 1;

  const detail = wanted && translated !== "" ? translated : null;
  const phrase = option.en.replaceAll(PRONOUN_PLACEHOLDER, pronoun);

  // "dyed {detalhe} hair" only means something once the detail exists. Without
  // one the option cannot produce a sentence, so it behaves exactly like a field
  // nobody filled in — and is counted as one, rather than vanishing quietly.
  if (option.requiresDetails) {
    if (!detail) {
      if (!wanted) tally.vazios += 1;
      return NOTHING;
    }

    return { phrase: phrase.replaceAll(DETAIL_PLACEHOLDER, detail), detail: null };
  }

  return { phrase, detail };
}

/** Pushes a phrase and its detail as two consecutive comma items. */
function push(into: string[], resolved: Resolved): void {
  if (resolved.phrase) into.push(resolved.phrase);
  if (resolved.detail) into.push(resolved.detail);
}

/**
 * Joins phrases that all end in the same noun into one: the last keeps the noun,
 * the others give it up.
 *
 * `["dark brown hair", "straight hair", "collarbone-length hair"]`
 *   → `dark brown straight collarbone-length hair`
 *
 * The separator is a parameter because the compiled example of §7 uses both, and
 * reproducing what the specification wrote is worth more than inventing a rule
 * of English that would be wrong half the time: hair stacks with spaces
 * (`dark brown straight collarbone-length hair`), eyes with commas
 * (`almond-shaped, evenly spaced eyes`).
 */
function mergeSharedNoun(
  phrases: readonly string[],
  noun: string,
  separator: string,
): string | null {
  if (phrases.length === 0) return null;

  const suffix = ` ${noun}`;
  const head = phrases
    .slice(0, -1)
    .map((phrase) => (phrase.endsWith(suffix) ? phrase.slice(0, -suffix.length) : phrase));

  const last = phrases[phrases.length - 1];
  const tail = last.endsWith(suffix) ? last : `${last}${suffix}`;

  return [...head, tail].join(separator);
}

/**
 * Where a mark sits, as English wants it. Most placements are nouns that take
 * "on the"; a couple already are prepositional phrases and would read
 * "on the behind the ear".
 */
function placement(en: string): string {
  return en.startsWith("behind ") ? en : `on the ${en}`;
}

// ---------------------------------------------------------------------------
// The compiler
// ---------------------------------------------------------------------------

export function compilePrompt(
  sheet: CharacterSheet,
  overrides: CompileOverrides = {},
): CompiledPrompt {
  const tally: Tally = { inferidos: 0, vazios: 0, aguardandoTraducao: 0 };
  const dna = sheet.dna_visual;

  // The pronoun the fixed phrases of §5.2 are written around. Resolved before
  // anything else because the age phrase needs it, and defaulting to "their"
  // when the gender is not settled is the honest neutral.
  const generoKey = typeof dna.genero_apresentacao.valor === "string"
    ? dna.genero_apresentacao.valor
    : null;
  const pronoun =
    generoKey && generoKey in PRONOUN_BY_GENERO
      ? PRONOUN_BY_GENERO[generoKey as GeneroApresentacao]
      : PRONOUN_BY_GENERO.androgino;

  const identidade: string[] = [];

  // --- Rule 1, step 1: gender + apparent age, as one opening phrase ---------
  const genero = resolveField(dna.genero_apresentacao, GENERO_APRESENTACAO, pronoun, tally);
  const idade = resolveField(dna.idade_aparente, IDADE_APARENTE, pronoun, tally);

  const opening = [genero.phrase, idade.phrase].filter(Boolean).join(" ");
  if (opening) identidade.push(opening);
  if (genero.detail) identidade.push(genero.detail);
  if (idade.detail) identidade.push(idade.detail);

  // --- Rule 1, step 2: the face -------------------------------------------
  push(identidade, resolveField(dna.formato_rosto, FORMATO_ROSTO, pronoun, tally));

  const olhosCor = resolveField(dna.olhos.cor, OLHOS_COR, pronoun, tally);
  const olhosFormato = resolveField(dna.olhos.formato, OLHOS_FORMATO, pronoun, tally);
  const olhosEspacamento = resolveField(dna.olhos.espacamento, OLHOS_ESPACAMENTO, pronoun, tally);

  const olhos = mergeSharedNoun(
    [olhosCor.phrase, olhosFormato.phrase, olhosEspacamento.phrase].filter(
      (phrase): phrase is string => phrase !== null,
    ),
    "eyes",
    ", ",
  );

  if (olhos) identidade.push(olhos);
  for (const detail of [olhosCor.detail, olhosFormato.detail, olhosEspacamento.detail]) {
    if (detail) identidade.push(detail);
  }

  // Thickness is a bare adjective ("thick, full") and shape carries the noun,
  // so together they read as one phrase — §5.7's own note.
  const espessura = resolveField(dna.sobrancelhas.espessura, SOBRANCELHAS_ESPESSURA, pronoun, tally);
  const formatoSobrancelhas = resolveField(
    dna.sobrancelhas.formato,
    SOBRANCELHAS_FORMATO,
    pronoun,
    tally,
  );

  const sobrancelhas = mergeSharedNoun(
    [espessura.phrase, formatoSobrancelhas.phrase].filter(
      (phrase): phrase is string => phrase !== null,
    ),
    "eyebrows",
    ", ",
  );

  if (sobrancelhas) identidade.push(sobrancelhas);
  for (const detail of [espessura.detail, formatoSobrancelhas.detail]) {
    if (detail) identidade.push(detail);
  }

  push(identidade, resolveField(dna.nariz, NARIZ, pronoun, tally));
  push(identidade, resolveField(dna.labios, LABIOS, pronoun, tally));

  // --- Rule 1, step 3: skin ------------------------------------------------
  const tom = resolveField(dna.pele.tom, PELE_TOM, pronoun, tally);
  const subtom = resolveField(dna.pele.subtom, PELE_SUBTOM, pronoun, tally);

  // The undertone phrase begins with "with a…", so it can only ride on a tone.
  // Alone it would be a sentence about nothing — the same reasoning that keeps a
  // detail off an empty field (§3).
  if (tom.phrase) {
    identidade.push(subtom.phrase ? `${tom.phrase} ${subtom.phrase}` : tom.phrase);
  }

  for (const detail of [tom.detail, subtom.detail]) {
    if (detail) identidade.push(detail);
  }

  push(identidade, resolveField(dna.pele.sardas, PELE_SARDAS, pronoun, tally));

  // --- Rule 1, step 4: hair ------------------------------------------------
  const cabeloCor = resolveField(dna.cabelo.cor, CABELO_COR, pronoun, tally);
  const cabeloTextura = resolveField(dna.cabelo.textura, CABELO_TEXTURA, pronoun, tally);
  const cabeloComprimento = resolveField(dna.cabelo.comprimento, CABELO_COMPRIMENTO, pronoun, tally);
  const reparticao = resolveField(dna.cabelo.reparticao, CABELO_REPARTICAO, pronoun, tally);
  const franja = resolveField(dna.cabelo.franja, CABELO_FRANJA, pronoun, tally);
  const acabamento = resolveField(dna.cabelo.acabamento, CABELO_ACABAMENTO, pronoun, tally);

  const cabelo = mergeSharedNoun(
    [cabeloCor.phrase, cabeloTextura.phrase, cabeloComprimento.phrase].filter(
      (phrase): phrase is string => phrase !== null,
    ),
    "hair",
    " ",
  );

  if (cabelo) {
    identidade.push(cabelo);

    // "center-parted" and "layered" describe a haircut. With no hair named at
    // all they would float free of anything, so they follow the noun or they
    // wait for it.
    for (const cut of [reparticao.phrase, franja.phrase, acabamento.phrase]) {
      if (cut) identidade.push(cut);
    }
  }

  for (const detail of [
    cabeloCor.detail,
    cabeloTextura.detail,
    cabeloComprimento.detail,
    reparticao.detail,
    franja.detail,
    acabamento.detail,
  ]) {
    if (detail) identidade.push(detail);
  }

  // --- Rule 1, step 5: body ------------------------------------------------
  // Height is the one numeric field: no list, so no fixed phrase to look up.
  const altura = dna.corpo.altura_cm;

  if (entersPrompt(altura.estado) && typeof altura.valor === "number") {
    identidade.push(`${altura.valor} cm tall`);
    if (altura.detalhes.trim() !== "" && altura.detalhes_en.trim() !== "") {
      identidade.push(altura.detalhes_en.trim());
    } else if (altura.detalhes.trim() !== "") {
      tally.aguardandoTraducao += 1;
    }
  } else if (!entersPrompt(altura.estado)) {
    if (altura.estado === "inferido") tally.inferidos += 1;
    else tally.vazios += 1;
  }

  push(identidade, resolveField(dna.corpo.silhueta, SILHUETA_TODAS, pronoun, tally));
  push(identidade, resolveField(dna.corpo.proporcoes.busto, PROPORCOES_BUSTO, pronoun, tally));
  push(identidade, resolveField(dna.corpo.proporcoes.cintura, PROPORCOES_CINTURA, pronoun, tally));
  push(identidade, resolveField(dna.corpo.proporcoes.quadril, PROPORCOES_QUADRIL, pronoun, tally));

  // --- Rule 1, step 6: marks ----------------------------------------------
  for (const tatuagem of dna.marcas.tatuagens) {
    if (!entersPrompt(tatuagem.estado)) {
      if (tatuagem.estado === "inferido") tally.inferidos += 1;
      else tally.vazios += 1;
      continue;
    }

    const tamanho = findOption(TATUAGEM_TAMANHO, tatuagem.tamanho)?.en;
    const estilo = findOption(TATUAGEM_ESTILO, tatuagem.estilo)?.en;
    const posicao = findOption(TATUAGEM_POSICAO, tatuagem.posicao)?.en;

    const wantsDescription = tatuagem.descricao.trim() !== "";
    const description = tatuagem.descricao_en.trim();

    if (wantsDescription && description === "") tally.aguardandoTraducao += 1;

    // The template of §5.18: "a small fine-line tattoo of {descricao} on the
    // inner left wrist". Every piece is optional and drops out silently.
    let phrase = ["a", tamanho, estilo, "tattoo"].filter(Boolean).join(" ");
    if (description) phrase += ` of ${description}`;
    if (posicao) phrase += ` ${placement(posicao)}`;

    identidade.push(phrase);
  }

  for (const piercing of dna.marcas.piercings) {
    if (!entersPrompt(piercing.estado)) {
      if (piercing.estado === "inferido") tally.inferidos += 1;
      else tally.vazios += 1;
      continue;
    }

    // The jewellery phrases of §5.19b already carry their article.
    const joia = findOption(PIERCING_JOIA, piercing.joia)?.en ?? "a piercing";
    const local = findOption(PIERCING_LOCAL, piercing.local)?.en;

    const wantsDetail = piercing.detalhes.trim() !== "";
    const detail = piercing.detalhes_en.trim();

    if (wantsDetail && detail === "") tally.aguardandoTraducao += 1;

    let phrase = local ? `${joia} in the ${local}` : joia;
    if (detail) phrase += `, ${detail}`;

    identidade.push(phrase);
  }

  for (const outra of dna.marcas.outras) {
    if (!entersPrompt(outra.estado)) {
      if (outra.estado === "inferido") tally.inferidos += 1;
      else tally.vazios += 1;
      continue;
    }

    const tipo = findOption(MARCA_TIPO, outra.tipo)?.en;

    // Without a kind there is no noun, and "a something above the lip" is not a
    // sentence worth sending. The row stays visible in the editor either way.
    if (!tipo) continue;

    const wantsPosition = outra.posicao.trim() !== "";
    const wantsDescription = outra.descricao.trim() !== "";
    const position = outra.posicao_en.trim();
    const description = outra.descricao_en.trim();

    if (wantsPosition && position === "") tally.aguardandoTraducao += 1;
    if (wantsDescription && description === "") tally.aguardandoTraducao += 1;

    // The translated position already reads as a placement ("above the left side
    // of the lip"), so it is not prefixed the way a closed-list placement is.
    let phrase = `a ${tipo}`;
    if (position) phrase += ` ${position}`;
    if (description) phrase += `, ${description}`;

    identidade.push(phrase);
  }

  // --- Layer 2: the canonical outfit and the default scene ------------------
  const trajeChoice: PlainChoice = overrides.trajeCanonico
    ? { valor: overrides.trajeCanonico, detalhes: "", detalhes_en: "" }
    : sheet.padroes_variaveis.traje_canonico;

  const traje = resolvePlain(trajeChoice, TRAJE_CANONICO, pronoun, tally);
  const trajeText = [traje.phrase, traje.detail].filter(Boolean).join(", ") || null;

  const omit = new Set(overrides.omitirCenaPadrao ?? []);
  const cena: string[] = [];

  // Rule 11, and it comes first: style governs how everything after it is drawn.
  //
  // The fallback is the rule itself in one line — a null value or a key the
  // dictionary no longer knows still produces a style, because the alternative
  // is a prompt with no medium in it, which is exactly the bug this field was
  // added to close. The caller may override *which* style, never whether.
  if (!omit.has("estilo_renderizacao")) {
    const choice = sheet.padroes_variaveis.estilo_renderizacao;
    const resolved = resolvePlain(choice, ESTILO_RENDERIZACAO, pronoun, tally);

    cena.push(resolved.phrase ?? estiloOption(null).en);
    if (resolved.detail) cena.push(resolved.detail);
  }

  const cenaFields: readonly { key: CenaPadraoKey; choice: PlainChoice; options: readonly SheetOption[] }[] = [
    { key: "pose", choice: sheet.padroes_variaveis.pose, options: POSE },
    { key: "expressao", choice: sheet.padroes_variaveis.expressao, options: EXPRESSAO },
    { key: "fundo_canonico", choice: sheet.padroes_variaveis.fundo_canonico, options: FUNDO_CANONICO },
    { key: "iluminacao", choice: sheet.padroes_variaveis.iluminacao, options: ILUMINACAO },
    { key: "enquadramento", choice: sheet.padroes_variaveis.enquadramento, options: ENQUADRAMENTO },
  ];

  for (const entry of cenaFields) {
    if (omit.has(entry.key)) continue;
    push(cena, resolvePlain(entry.choice, entry.options, pronoun, tally));
  }

  // --- Rule 5: restrictions, always, and always last ------------------------
  const restricoes: string[] = [];

  for (const restricao of sheet.padroes_variaveis.restricoes) {
    const prefix = findOption(RESTRICAO_TIPO, restricao.tipo)?.en;
    const wanted = restricao.regra.trim() !== "";
    const rule = restricao.regra_en.trim();

    if (wanted && rule === "") tally.aguardandoTraducao += 1;
    if (!prefix || !rule) continue;

    restricoes.push(`${prefix} ${rule}`);
  }

  const structure: CompiledStructure = {
    identidade,
    traje_canonico: trajeText,
    cena_padrao: cena,
    restricoes,
  };

  return {
    structure,
    text: renderText(structure),
    exclusions: {
      ...tally,
      temNotasGerais: dna.notas_gerais.trim() !== "",
    },
  };
}

/**
 * §3.1 · The text is a render of the structure and nothing more — the blocks in
 * the order the specification fixed, each a comma-separated list. Reading it back
 * should let anyone rebuild the structure it came from.
 *
 * Restrictions are the exception: each becomes its own sentence. Strung together
 * with commas they read as one run-on instruction ("never wearing glasses, always
 * keep the tattoo visible"), and an instruction that has to be parsed is an
 * instruction that can be half-obeyed.
 */
function renderText(structure: CompiledStructure): string {
  const sentences = [
    structure.identidade.join(", "),
    structure.traje_canonico ?? "",
    structure.cena_padrao.join(", "),
    ...structure.restricoes,
  ]
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence !== "")
    .map((sentence) => sentence.charAt(0).toUpperCase() + sentence.slice(1));

  return sentences.length === 0 ? "" : `${sentences.join(". ")}.`;
}
