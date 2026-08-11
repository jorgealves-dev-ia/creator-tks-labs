/**
 * Reading `@` out of a prompt — decision N2, and §5.2 of
 * docs/versionamento-entidades.md.
 *
 * Pure and shared on purpose. The browser uses it to paint the mention as a chip
 * and to know when to open the picker; the server uses it to decide which frozen
 * version actually enters the generation. One parser means the pill the user sees
 * and the character the model draws can never be two different readings of the
 * same sentence.
 *
 * What this file does *not* do is resolve anything. `@luna` here is four
 * characters of text; whether a Luna exists, whether she has a saved version and
 * which one `@luna@v2` means are questions only the server may answer — the
 * browser is never the authority on which snapshot was used (rule 2 of the
 * versioning specification).
 */

/**
 * The handle format, copied from the database constraint
 * `entities_handle_format`. Kept identical so the parser cannot recognise a
 * handle the database could never store.
 */
const HANDLE = "[a-zA-Z0-9][a-zA-Z0-9_-]{0,47}";

/** `@luna` or `@luna@v2`. */
const MENTION = new RegExp(`@(${HANDLE})(?:@v(\\d{1,6}))?`, "g");

/** `@` only starts a mention at a boundary — never inside a word or an e-mail. */
function startsMention(text: string, index: number): boolean {
  if (index === 0) return true;

  const before = text[index - 1];

  return !/[\w@]/.test(before);
}

export type Mention = {
  /** Exactly as typed, so the interface can highlight the same characters. */
  raw: string;
  /** Lowercased: handles are stored lowercase, and `@Luna` means `@luna`. */
  handle: string;
  /** The number in `@v2`, or null for "whichever version is active". */
  versionNumber: number | null;
  start: number;
  end: number;
};

export function findMentions(text: string): Mention[] {
  const mentions: Mention[] = [];

  for (const match of text.matchAll(MENTION)) {
    const index = match.index ?? 0;

    if (!startsMention(text, index)) continue;

    mentions.push({
      raw: match[0],
      handle: match[1].toLowerCase(),
      versionNumber: match[2] ? Number(match[2]) : null,
      start: index,
      end: index + match[0].length,
    });
  }

  return mentions;
}

/**
 * The distinct characters a prompt names. Mentioning `@luna` twice is still one
 * character; mentioning `@luna` and `@carla` is two, which v1 refuses — keeping
 * two identities consistent in one image is its own problem, registered for
 * later rather than half-solved now.
 */
export function distinctHandles(mentions: readonly Mention[]): string[] {
  return [...new Set(mentions.map((mention) => mention.handle))];
}

/**
 * The prompt with the mentions taken out — the scene, on its own.
 *
 * This is what decides which half of the director rule runs, and getting it wrong
 * would be expensive in a quiet way. `@luna` typed alone is not a directed scene;
 * it is the request "show me her", and treating those four characters as stage
 * direction would send the model a translation of a handle and skip the defaults
 * the user was asking for.
 *
 * Taking the mention out of the scene is also right on its own terms: who she is
 * has already been said, at length, by the compiled identity block. What is left
 * is what she is doing.
 */
export function sceneWithoutMentions(text: string, mentions: readonly Mention[]): string {
  let scene = text;

  // Back to front, so removing one span cannot shift the next one's indices.
  for (const mention of [...mentions].reverse()) {
    scene = `${scene.slice(0, mention.start)}${scene.slice(mention.end)}`;
  }

  return scene.replace(/[ \t]{2,}/g, " ").trim();
}

/**
 * The same scene, with each mention replaced by a subject the sentence can
 * actually use — item 3d, and the other half of `sceneWithoutMentions`.
 *
 * Deleting the mention is right for deciding *whether* the user directed a
 * scene: `@luna` alone is "show me her", not stage direction. It is wrong for
 * deciding *what to translate*, because what is left is a sentence missing its
 * subject — and a translator handed "está no seu quarto gamer" has to invent
 * one. It invented "their" on one run and "his" on the next, for the same
 * sentence, about a character whose sheet says feminino.
 *
 * So emptiness is still judged on the scene *without* mentions, and only then,
 * if there is anything left to say, is this used to build the sentence that
 * travels. The two functions answer two questions and neither can answer both.
 *
 * ---------------------------------------------------------------------------
 * The contraction table, and why it is not optional
 * ---------------------------------------------------------------------------
 *
 * Portuguese welds its prepositions to what follows: `de + ela = dela`,
 * `em + ela = nela`, and an article before the mention (`a @luna`) is already
 * doing the job the pronoun is about to do. So the word *before* the mention is
 * read, and it decides which form goes in and whether that word survives:
 *
 *   "@luna está no quarto"        → "Ela está no quarto"
 *   "Duas imagens da @luna"       → "Duas imagens dela"
 *   "o cachorro da @luna"         → "o cachorro dela"
 *   "a @luna no quarto"           → "Ela no quarto"          (o artigo é absorvido)
 *   "uma foto com @luna"          → "uma foto com ela"       (preposição comum)
 *
 * Everything here is a fixed table and a lookup. No network, no clock, no
 * randomness: the same prompt and the same sheet produce the same sentence
 * forever, which is what lets the compiler downstream stay a pure function.
 * (The *translation* of that sentence is still a model call and still not
 * deterministic — this removes the ambiguity that made it guess, not the model.)
 */
export type MentionSubject = {
  /** "ela" · "ele" · "a pessoa" */
  sujeito: string;
  /** After de/da/do: "dela" · "dele" · "da pessoa" */
  de: string;
  /** After em/na/no: "nela" · "nele" · "na pessoa" */
  em: string;
};

/** Words that swallow the mention and change which form replaces it. */
const DE_FORMS = new Set(["de", "da", "do"]);
const EM_FORMS = new Set(["em", "na", "no"]);
/** An article before the mention is doing the pronoun's job already. */
const ARTICLES = new Set(["a", "o", "as", "os", "à", "ao", "às", "aos"]);

export function sceneWithSubject(
  text: string,
  mentions: readonly Mention[],
  subject: MentionSubject,
): string {
  let scene = text;

  // Back to front, so replacing one span cannot shift the next one's indices.
  for (const mention of [...mentions].reverse()) {
    const before = scene.slice(0, mention.start);
    // The word immediately before, and where it starts — the only context this
    // decision needs.
    const previous = /(\S+)(\s*)$/.exec(before);
    const word = previous?.[1].toLowerCase() ?? "";
    const wordStart = previous ? before.length - previous[0].length : mention.start;

    let from = mention.start;
    let replacement = subject.sujeito;

    if (DE_FORMS.has(word)) {
      from = wordStart;
      replacement = subject.de;
    } else if (EM_FORMS.has(word)) {
      from = wordStart;
      replacement = subject.em;
    } else if (ARTICLES.has(word)) {
      from = wordStart;
      replacement = subject.sujeito;
    }

    // A subject that opens the sentence is written like one. Cosmetic for the
    // model, and not cosmetic at all for the Portuguese saved beside it: that
    // line is read back by a person asking what was generated.
    const opensSentence = /(^|[.!?]\s*)$/.test(scene.slice(0, from));

    scene = `${scene.slice(0, from)}${
      opensSentence ? replacement.charAt(0).toUpperCase() + replacement.slice(1) : replacement
    }${scene.slice(mention.end)}`;
  }

  return scene.replace(/[ \t]{2,}/g, " ").trim();
}

/**
 * The `@…` currently being typed at the caret, if any — what the autocomplete
 * opens on.
 *
 * A mention under the caret only counts while it is still one unbroken word: as
 * soon as a space is typed the user has moved on to writing the scene, and a
 * suggestion list hovering over the sentence would be in the way rather than in
 * service.
 */
export type MentionQuery = {
  /** Index of the `@`, so accepting a suggestion knows what to replace. */
  start: number;
  /** The caret. */
  end: number;
  /** What has been typed after the `@`, lowercased. */
  term: string;
};

export function activeMentionQuery(text: string, caret: number): MentionQuery | null {
  for (let index = caret - 1; index >= 0; index -= 1) {
    const character = text[index];

    if (character === "@") {
      if (!startsMention(text, index)) return null;

      const term = text.slice(index + 1, caret);

      // The version suffix is typed by hand (`@luna@v2`) and is not something to
      // suggest against — once it starts, the character has already been chosen.
      if (term.includes("@")) return null;

      return { start: index, end: caret, term: term.toLowerCase() };
    }

    if (!/[a-zA-Z0-9_-]/.test(character)) return null;
  }

  return null;
}

/**
 * Replaces the fragment being typed with a finished mention, and returns where
 * the caret should land — after the trailing space, ready for the scene.
 */
export function applyMention(
  text: string,
  query: MentionQuery,
  handle: string,
): { text: string; caret: number } {
  const mention = `@${handle} `;
  const next = `${text.slice(0, query.start)}${mention}${text.slice(query.end)}`;

  return { text: next, caret: query.start + mention.length };
}
