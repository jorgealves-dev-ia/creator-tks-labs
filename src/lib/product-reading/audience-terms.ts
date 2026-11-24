/**
 * The audience warning — item 9 of F1, docs/plano-produto-diz.md.
 *
 * ---------------------------------------------------------------------------
 * Why this exists
 * ---------------------------------------------------------------------------
 *
 * A reading of a product photo is told, in its contract, to describe only what
 * the photo shows — and never to say who the piece is for unless the photo
 * proves it (rule 2 of the contract). Measured on 27/09/2026 with that rule in
 * place: 2 of 4 readings invented an audience anyway — "infantil" for a blouse
 * photographed with nothing to give it scale, "feminina" for the same blouse.
 * A rule in a prompt REDUCES; it does not eliminate.
 *
 * And the word matters: it lands at the start of the description, which is the
 * sentence a generator draws from. "A children's blouse" on an adult character
 * is a different piece.
 *
 * So the second net is deterministic and on our side: a CLOSED list of words
 * about audience, gender and size, read against the Name and the Description of
 * the product card. What it finds is highlighted, with a one-click removal —
 * **never removed in silence**. It does not ask where the text came from: a
 * pasted marketplace page is checked exactly like a reading.
 *
 * Pure: text in, positions out. No network, no model, no cost.
 *
 * ---------------------------------------------------------------------------
 * The list is the owner's — v5, 03/10/2026
 * ---------------------------------------------------------------------------
 *
 * Every word below is in the plan, in the table the owner revised. A word is
 * added or taken out THERE first; this file follows.
 *
 * v3 added «tamanhos», «infantis», four colour exceptions and the connector
 * «do». v4 (03/10): the hyphen rule of v3 is REVOKED — a hyphen is a word
 * boundary again, so a slug lights ("blusa-infantil-azul") — and what it was
 * for is done by phrase exceptions ("man-made", "homem-aranha"…). A size
 * sequence now swallows its connectors («e», «ou», «and», «or», «to»,
 * «through», «thru», a plain space), takes G1–G4 / EG1–EG4 / XG1–XG4 and a value
 * in brackets, and a number followed by a unit of length is not a size.
 *
 * v5 (03/10, same day): a plain space joins two sizes only when they are of the
 * same kind, and the removal takes with it the hyphen that tied the finding to
 * one neighbour.
 */

export type AudienceGroup = "faixa_etaria" | "genero" | "tamanho";

export type AudienceMatch = {
  /** Offsets into the ORIGINAL text: `text.slice(start, end)` is what was found. */
  start: number;
  end: number;
  /** The words as they are written in the text — accents, capitals and all. */
  text: string;
  group: AudienceGroup;
};

// ---------------------------------------------------------------------------
// How it matches
// ---------------------------------------------------------------------------

/** A whole word: not glued to a letter or a digit on either side. */
const LEFT = "(?<![\\p{L}\\p{N}])";
const RIGHT = "(?![\\p{L}\\p{N}])";

/**
 * The possessive travels with the word: "children's", "women's" — and, after a
 * final s, the bare apostrophe of "kids'" and "ladies'".
 *
 * Allowed after every person word and not only the ones the list writes with
 * ('s): "a woman's blouse" must leave as a whole, or the removal would strand
 * an "'s" in the sentence.
 */
const POSSESSIVE = "(?:'s|(?<=s)')?";

/**
 * Faixa etária — who the piece is for, by age.
 *
 * `infanto[\s-]?juvenil` is one word in three spellings: the list writes
 * "infantojuvenil"; "infanto-juvenil" was the standard spelling until the 2009
 * orthography and is still what shops write.
 */
const AGE_WORDS = [
  // português
  "infantil",
  "infantis",
  "infanto[\\s-]?juvenil",
  "criancas?",
  "bebes?",
  "meninas?",
  "meninos?",
  "garotas?",
  "garotos?",
  "juvenil",
  "adolescentes?",
  "adult[oa]s?",
  "idos[oa]s?",
  // inglês
  "child",
  "children",
  "kids?",
  "baby",
  "babies",
  "toddlers?",
  "girls?",
  "boys?",
  "teens?",
  "teenagers?",
  "junior",
  "adults?",
  "senior",
  "elderly",
];

/** Gênero — who the piece is for, by gender. */
const GENDER_WORDS = [
  // português
  "feminin[oa]s?",
  "masculin[oa]s?",
  "fem",
  "masc",
  "unissex",
  "mulher(?:es)?",
  "homem",
  "homens",
  // inglês
  "women",
  "woman",
  "female",
  "lady",
  "ladies",
  "men",
  "man",
  "male",
  "unisex",
];

/**
 * What may sit between a size trigger and its value: «:», «-», «.» or spaces —
 * "Tam: M", "Size - L", "tam. G". At least one of them, because the trigger is a
 * whole word.
 */
const BETWEEN = "[\\s:.\\-]+";

/**
 * Tamanho e modelagem, as fixed phrases. "petite" is NOT here: in a jewellery
 * catalogue it is the size of the pendant, not of whoever wears it.
 *
 * "tamanho único" and "tamanho grande" take the same signs a trigger takes —
 * a listing writes "Tamanho: Único".
 */
const SIZE_PHRASES = [
  "plus[\\s-]+size",
  `tamanho${BETWEEN}grande`,
  `tamanho${BETWEEN}unico`,
  "gestante",
  "maternidade",
  "maternity",
  "one[\\s-]+size",
];

/**
 * The words that announce a size. A trigger alone lights nothing — "Tamanho"
 * with no value after it is a label, not a size.
 */
const SIZE_TRIGGER = "(?:tamanhos|tamanho|tam|veste|manequim|numeracao|sizes|size|fits)";

/**
 * A number that is a size of a PERSON — not a measurement. "Tamanho 45 cm",
 * "fits 15 inch" and "size 20mm" are the size of a thing; "Anel Tamanho 16" is
 * a size. The unit may be glued to the number or one space away.
 */
const SIZE_NUMBER =
  "\\d{1,3}(?![\\p{L}\\p{N}])(?!\\s*(?:cm|mm|m|in|inch|inches|polegadas?|pol)(?![\\p{L}\\p{N}]))";

/**
 * The values, longest first so "xgg" is never read as "xg" + "g". A size letter
 * counts ONLY here, after a trigger: an "M" on its own is a letter.
 *
 * The letters of the two languages are one list. The owner's table gives each
 * language its own; a listing mixes them — "Tamanho: S/M/L" is what an imported
 * item says — and a trigger is required either way.
 */
const SIZE_LETTER = `(?:xxxl|xxl|xgg|xg[1-4]|eg[1-4]|xl|xs|xg|pp|gg|eg|g[1-4]|p|m|g|s|l)${RIGHT}`;

const SIZE_VALUE = `(?:${SIZE_LETTER}|${SIZE_NUMBER})`;

/**
 * What joins the sizes of one sequence, written out: «/», «,», «-»; or the words
 * «a», «ao», «até», «e», «ou», «and», «or», «to», «through», «thru».
 *
 * A separator only ever counts when a valid size FOLLOWS it — it is always
 * written before a value in the pattern — so "Tamanho M e azul" stops at the M.
 * That is what lets the removal leave nothing behind: "Tamanho P, M e G" goes
 * whole, where it used to leave "e G" in the field.
 */
const SIZE_SEPARATOR =
  "(?:\\s*[/,\\-]\\s*(?:(?:e|ou|and|or)\\s+)?|\\s+(?:a|ao|ate|e|ou|and|or|to|through|thru)\\s+)";

/**
 * A plain space joins two sizes ONLY when they are of the same kind — a letter
 * after a letter ("Tamanho P M G GG"), a number after a number ("Tamanho 38 40
 * 42"). "Tamanho M 2 peças" stops at the M: the 2 counts pieces (v5, 03/10).
 *
 * The kind of the previous value is read behind the space: a letter size ends in
 * a letter, or in a letter and its digit ("G1"); a number is digits alone.
 */
const SIZE_SPACE_SAME_KIND =
  `(?:(?<=\\p{L}[1-4]?)[ \\t]+${SIZE_LETTER}` +
  `|(?<=(?<![\\p{L}\\p{N}])\\d{1,3})[ \\t]+${SIZE_NUMBER})`;

const SIZE_MORE = `(?:${SIZE_SEPARATOR}${SIZE_VALUE}|${SIZE_SPACE_SAME_KIND})*`;

const SIZE_SEQUENCE = `${SIZE_VALUE}${SIZE_MORE}`;

/**
 * Exceptions — matched BEFORE the terms, as phrases, and never highlighted.
 *
 * "baby" is an age word and "baby doll" is a cut; "bebê" is an age word and
 * "rosa bebê" is a colour. Without these, the first product of the owner's own
 * catalogue — a Baby Doll pyjama — would light up.
 *
 * A hyphen or a space between the words, or none: "baby doll", "baby-doll",
 * "babydoll"; "rosa bebê", "rosa-bebê" (the dictionary spelling of the colour).
 */
const EXCEPTIONS = [
  // modelagem
  "baby[\\s-]*doll",
  "baby[\\s-]*look",
  "baby[\\s-]*tee",
  "boy[\\s-]*shorts?",
  // cor
  "(?:rosa|azul|amarelo|verde|lilas|lavanda|salmao|menta)[\\s-]+bebe",
  "baby[\\s-]+(?:blue|pink|yellow)",
  // o que NÃO é público, apesar da palavra (v4 — no lugar da regra do hífen)
  "man[\\s-]+made",
  "baby[\\s-]+soft",
  "homem[\\s-]+aranha",
  "homem[\\s-]+formiga",
  "homem[\\s-]+de[\\s-]+ferro",
  "super[\\s-]+homem",
  "mulher[\\s-]+maravilha",
  "mulher[\\s-]+gato",
];

const word = (alternatives: readonly string[], suffix = "") =>
  new RegExp(`${LEFT}(?:${alternatives.join("|")})${suffix}${RIGHT}`, "gu");

const MATCHERS: readonly { group: AudienceGroup; pattern: RegExp }[] = [
  { group: "faixa_etaria", pattern: word(AGE_WORDS, POSSESSIVE) },
  { group: "genero", pattern: word(GENDER_WORDS, POSSESSIVE) },
  { group: "tamanho", pattern: word(SIZE_PHRASES) },
  {
    group: "tamanho",
    // The whole sequence is one match: "veste 38 a 44", "size S/M/L", "Tamanho P, M e G",
    // "Tamanho (M)", "veste do 38 ao 44".
    pattern: new RegExp(
      `${LEFT}${SIZE_TRIGGER}(?:${BETWEEN}${SIZE_SEQUENCE}` +
        `|[\\s:.\\-]*\\(\\s*${SIZE_SEQUENCE}\\s*\\)` +
        `|\\s+do\\s+${SIZE_NUMBER}${SIZE_MORE})`,
      "gu",
    ),
  },
];

const EXCEPTION_PATTERN = word(EXCEPTIONS);

// ---------------------------------------------------------------------------
// Folding: what "no difference of capitals or accents" means
// ---------------------------------------------------------------------------

/** Straight and curly are one apostrophe — and so is the acute accent typed in its place. */
const APOSTROPHES = new Set(["'", "’", "‘", "ʼ", "´", "`"]);

/** Every dash a keyboard or a text editor produces, read as the hyphen. */
const DASHES = new Set(["‐", "‑", "‒", "–", "—", "―", "−"]);

function fold(character: string): string {
  if (APOSTROPHES.has(character)) return "'";
  if (DASHES.has(character)) return "-";

  return character
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/**
 * The text as the list reads it — lower case, no accents — together with the way
 * back: `origin[i]` is where, in the original, the i-th folded character came
 * from. Matching happens on the folded text; what is highlighted and removed is
 * always a slice of the original.
 */
function foldText(text: string): { folded: string; origin: number[] } {
  let folded = "";
  const origin: number[] = [];
  let index = 0;

  for (const character of text) {
    for (const piece of fold(character)) {
      folded += piece;
      origin.push(index);
    }

    index += character.length;
  }

  origin.push(text.length);

  return { folded, origin };
}

type Span = { from: number; to: number };

const overlaps = (a: Span, b: Span) => a.from < b.to && b.from < a.to;

function spansOf(pattern: RegExp, folded: string): Span[] {
  return [...folded.matchAll(pattern)].map((found) => ({
    from: found.index,
    to: found.index + found[0].length,
  }));
}

/**
 * Every audience, gender or size term in the text, in order, never overlapping.
 *
 * Two terms that share a character are one finding — "Plus Size G" after
 * "tamanho" reads as one highlight, not two that fight over "Size".
 */
export function findAudienceTerms(text: string): AudienceMatch[] {
  if (text.trim() === "") return [];

  const { folded, origin } = foldText(text);
  const excepted = spansOf(EXCEPTION_PATTERN, folded);

  const found = MATCHERS.flatMap(({ group, pattern }) =>
    spansOf(pattern, folded)
      .filter((span) => !excepted.some((exception) => overlaps(span, exception)))
      .map((span) => ({ ...span, group })),
  ).sort((a, b) => a.from - b.from || b.to - a.to);

  const merged: (Span & { group: AudienceGroup })[] = [];

  for (const span of found) {
    const last = merged.at(-1);

    if (last && span.from < last.to) {
      last.to = Math.max(last.to, span.to);
      continue;
    }

    merged.push({ ...span });
  }

  return merged.map((span) => {
    const start = origin[span.from];
    const end = origin[span.to];

    return { start, end, text: text.slice(start, end), group: span.group };
  });
}

// ---------------------------------------------------------------------------
// Removing — one finding, on one click
// ---------------------------------------------------------------------------

/** Punctuation that takes no space before it. */
const CLOSING = new Set([",", ".", ";", ":", "!", "?", ")", "]"]);

/** A letter or a digit — what a hyphen ties a finding to. */
const WORD_CHARACTER = /[\p{L}\p{N}]/u;

/** Where a sentence ends. */
const SENTENCE_END = new Set([".", "!", "?"]);

/**
 * What separates the items of a list, the parts of a title or the words of a
 * slug — written as the character the seam compares, with every dash read as
 * the hyphen.
 */
function separatorOf(character: string | undefined): string | null {
  if (character === undefined) return null;
  if (DASHES.has(character)) return "-";

  return [",", ";", "-", "|", "/", "·", "•"].includes(character) ? character : null;
}

/**
 * The text without one finding, with the seam closed.
 *
 * It takes out exactly the span it is given — the whole sequence, for a size —
 * and then tidies only what the removal itself left behind, AT THE SEAM:
 *
 *   two spaces where there was a word       "Vestido infantil floral"  → "Vestido floral"
 *   a space before punctuation              "Blusa infantil, azul"     → "Blusa, azul"
 *   a separator doubled or left at an edge  "Blusa, infantil, azul"    → "Blusa, azul"
 *                                           "vestido-infantil"         → "vestido"
 *   the full stop of a sentence that left   "Tam: M. Tecido leve."     → "Tecido leve."
 *   an empty pair of brackets               "Blusa (infantil) azul"    → "Blusa azul"
 *   the hyphen that tied it to ONE word     "Blusa infantil-azul"      → "Blusa azul"
 *                                           "Tênis kid-friendly"       → "Tênis friendly"
 *
 * Nothing else in the text is touched — no capital is changed, no word is
 * rewritten, and a line break next to the finding stays a line break. Words that
 * were glued to the finding stay glued ("blusa-infantil-azul" → "blusa-azul");
 * words that were apart get one space. The field remains editable for whatever
 * fine adjustment the sentence then needs.
 */
export function removeAudienceTerm(text: string, span: { start: number; end: number }): string {
  if (span.start < 0 || span.end > text.length || span.start >= span.end) return text;

  // Whether the two sides were apart to begin with. Decided as the spaces are
  // taken off, because that is the only moment the answer is on the page.
  const seam = { apart: false };

  const trimEnd = (value: string) => {
    const trimmed = value.replace(/[ \t]+$/, "");

    if (trimmed.length !== value.length) seam.apart = true;

    return trimmed;
  };

  const trimStart = (value: string) => {
    const trimmed = value.replace(/^[ \t]+/, "");

    if (trimmed.length !== value.length) seam.apart = true;

    return trimmed;
  };

  let before = trimEnd(text.slice(0, span.start));
  let after = trimStart(text.slice(span.end));

  // An empty pair of brackets is what is left of "(infantil)".
  if (/[([]$/.test(before) && /^[)\]]/.test(after)) {
    before = trimEnd(before.slice(0, -1));
    after = trimStart(after.slice(1));
  }

  const lineStarts = () => before === "" || before.endsWith("\n");
  const lineEnds = () => after === "" || after.startsWith("\n");

  // At the start of a line, a separator or a full stop has nothing before it.
  if (lineStarts() && (separatorOf(after[0]) !== null || after[0] === ".")) {
    after = trimStart(after.slice(1));
  }

  // At the end of a line, a separator has nothing after it. A full stop does
  // not leave here: it closes the sentence that came before the finding.
  if (lineEnds() && separatorOf(before.at(-1)) !== null) {
    before = trimEnd(before.slice(0, -1));
  }

  // The same mark on both sides: one of them belonged to what left.
  const left = before.at(-1);
  const right = after[0];

  if (right !== undefined && left !== undefined) {
    const sameSeparator = separatorOf(right) !== null && separatorOf(left) === separatorOf(right);
    const twoStops = right === "." && SENTENCE_END.has(left);

    if (sameSeparator || twoStops) {
      after = trimStart(after.slice(1));
    } else if (SENTENCE_END.has(right) && separatorOf(left) !== null) {
      // "Blusa, infantil." — the comma separated the finding from the rest.
      before = trimEnd(before.slice(0, -1));
    } else if (separatorOf(right) === "-" && WORD_CHARACTER.test(after[1] ?? "")) {
      // "Blusa infantil-azul" — the hyphen tied the finding to the next word.
      after = after.slice(1);
      seam.apart = true;
    } else if (separatorOf(left) === "-" && WORD_CHARACTER.test(before.at(-2) ?? "")) {
      // "Top pré-adulto azul" — or to the word before it.
      before = before.slice(0, -1);
      seam.apart = true;
    }
  }

  const glued = !seam.apart || lineStarts() || lineEnds() || CLOSING.has(after[0]);

  return glued ? `${before}${after}` : `${before} ${after}`;
}
