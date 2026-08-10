import {
  ANGULO_CAMERA,
  estiloOption,
  EXPRESSAO,
  findOption,
  ILUMINACAO,
  PRONOUN_BY_GENERO,
  type GeneroApresentacao,
  type SheetOption,
} from "@/lib/character-sheet/dictionary";
import type { CharacterSheet } from "@/lib/character-sheet/schema";
import {
  referenceFidelity,
  referenceSubject,
  type ReferenceKind,
  type ReferenceOrigin,
} from "@/lib/generation/references";
import { compilePrompt, type CenaPadraoKey, type CompiledPrompt } from "@/lib/prompt/compile";

/**
 * The canvas compilation — §6 of docs/nodes-geracao.md.
 *
 * This is where the `@` is finally spent. The identity block comes from the same
 * pure compiler the editor previews and the canonical sheet uses; what this file
 * adds is everything a *scene* needs and a character sheet has no opinion about:
 * the user's own direction, the images attached to the node, and the order the
 * whole thing is read in.
 *
 * Still pure — no network, no clock. The Portuguese arrives already translated
 * (the action does that before calling here), for the same reason the sheet's
 * free text arrives already translated: a compiler that could go and fetch words
 * is a compiler whose output depends on the day it ran.
 *
 * ---------------------------------------------------------------------------
 * The director rule, and the reason it matters more than it looks
 * ---------------------------------------------------------------------------
 *
 * When the user writes a prompt, the sheet's layer-2 defaults stand down: pose,
 * expression, background, light, framing — and the canonical outfit.
 *
 * That last one is not a detail. The canonical outfit is swimwear, and it exists
 * for exactly one purpose: letting a reference sheet show silhouette and
 * proportion honestly. Letting it survive into "@luna serving coffee in a café"
 * would put a bikini in a café, having been asked for by nobody. So the rule is
 * mechanical rather than clever: text in the prompt means the user is directing,
 * and a director's scene replaces the sheet's, whole.
 *
 * The mirror case is just as deliberate. An empty prompt with a mention means
 * "show me her, as she is" — so the outfit and the default scene do come in, and
 * the interface says so before the click, because a canonical outfit nobody
 * expected is a surprise that costs Sparks.
 *
 * Style never stands down either way (compilation rule 11). The node chooses
 * *which* style; nothing may leave a generation without one.
 */

// ---------------------------------------------------------------------------
// What comes in
// ---------------------------------------------------------------------------

export type CanvasReferenceInput = {
  assetId: string;
  kind: ReferenceKind | null;
  /** What the user typed about this image, in Portuguese. */
  instrucaoPt: string;
  /** The same sentence in English, translated at generation time. */
  instrucaoEn: string;
  origem: ReferenceOrigin;
};

export type CanvasCharacterInput = {
  handle: string;
  versionNumber: number;
  entityVersionId: string;
  /** The frozen snapshot — never the draft (decision D2). */
  sheet: CharacterSheet;
  /** The complete sheet of that version, when it has one. */
  folhaAssetId: string | null;
};

export type BuildCanvasPromptOptions = {
  personagem: CanvasCharacterInput | null;
  /** The scene as the user wrote it. */
  cenaPt: string;
  /** The scene in English. Empty only when there was nothing to translate. */
  cenaEn: string;
  /** The node's style override; null inherits from the character, then default. */
  estiloKey: string | null;
  /**
   * The node's scene adjustments — rule 4 of §6, exercised with a value for the
   * first time. Null (or an unknown key) means Auto: the prompt and the
   * character decide, exactly as before these existed.
   */
  anguloKey: string | null;
  iluminacaoKey: string | null;
  expressaoKey: string | null;
  referencias: readonly CanvasReferenceInput[];
};

// ---------------------------------------------------------------------------
// What comes out
// ---------------------------------------------------------------------------

export type CanvasStyleBlock = {
  chave: string;
  frase: string;
  reforco: string;
  /** Which of the three levels of the hierarchy actually answered. */
  origem: "node" | "personagem" | "padrao";
};

/**
 * One scene adjustment the node made, recorded per field — which control was
 * touched, which option it named and the fixed phrase that entered the prompt.
 */
export type CanvasSceneAdjustment = {
  campo: "angulo_camera" | "iluminacao" | "expressao";
  chave: string;
  frase: string;
};

export type CanvasReferenceDirective = {
  /** Its position in the call — the `N` of "reference image N". */
  ordem: number;
  asset_id: string;
  tipo: ReferenceKind | null;
  origem: ReferenceOrigin;
  instrucao_pt: string;
  instrucao_en: string;
  /** The sentence that actually went to the model. */
  diretiva_en: string;
  /**
   * The fixed clause that says what may not change about this image. Null for a
   * reference nobody labelled — see references.ts for why, and for the honest
   * expectation this sets.
   */
  fidelidade_en: string | null;
};

/**
 * §6 rule 3 — the debt this cycle pays off. "With what style and from which
 * references was this image born?" is answerable by field, not by reading prose.
 */
export type CanvasPromptStructure = {
  estilo: CanvasStyleBlock;
  personagem: {
    handle: string;
    versao: number;
    entity_version_id: string;
    folha_asset_id: string | null;
  } | null;
  /** One photograph of one person — stated only when a character is mentioned. */
  foto_unica: string | null;
  identidade: string[];
  /** The sentences that tie the identity text to the attached sheet image. */
  ancora: string[];
  traje_canonico: string | null;
  cena_padrao: string[];
  cena_usuario: { pt: string; en: string } | null;
  ajustes_cena: CanvasSceneAdjustment[];
  referencias: CanvasReferenceDirective[];
  restricoes: string[];
  /** Which half of the director rule ran. Recorded, never inferred later. */
  regra_diretor: "prompt_dirige" | "padroes_da_personagem";
};

export type CanvasPrompt = {
  /** What goes to the API. */
  text: string;
  structure: CanvasPromptStructure;
  /**
   * The images to send, in exactly this order.
   *
   * Returned rather than assembled by the caller on purpose: the numbers written
   * into the directives above are positions in *this* list, and two pieces of
   * code deciding the same order is how "reference image 2" ends up pointing at
   * image three.
   */
  referenceAssetIds: string[];
  /** Passed through from the identity block, for the honesty scoreboard. */
  compiled: CompiledPrompt | null;
};

// ---------------------------------------------------------------------------
// The compiler
// ---------------------------------------------------------------------------

/** Every layer-2 field. Style is handled by this file, so it is always omitted. */
const ALL_SCENE_KEYS: readonly CenaPadraoKey[] = [
  "estilo_renderizacao",
  "pose",
  "expressao",
  "fundo_canonico",
  "iluminacao",
  "enquadramento",
];

/**
 * What the attached sheet is *for*, said out loud, and then said again as a
 * prohibition.
 *
 * The first sentence names the image; without it the sheet is just another
 * reference. The second exists because naming is not insisting: a model given a
 * face will happily produce a *similar* face, and similar is precisely what this
 * whole product exists to refuse. Same reasoning as the fidelity clauses of
 * references.ts, applied to the one reference that matters most — and with the
 * same honest expectation: this raises the hit rate, it does not guarantee it.
 */
const ANCHOR_INSTRUCTIONS = [
  "Reference image 1 is the character reference sheet of this exact person: " +
    "match the face, hair, body proportions and skin tone to it precisely",
  "Keep the exact same face and features as the character reference sheet",
] as const;

/**
 * One photograph, one person — the clause that answers the grids.
 *
 * Evidence, accumulated rather than assumed: the same configuration produced a
 * *pair* of photos by the pool and a *single* photo on the beach. Nothing in our
 * prompt asked for one picture, so the model was free to fill a tall frame with
 * a collage — and a reference sheet among the inputs is an active invitation to
 * do exactly that, because a sheet is itself a grid of the same person.
 *
 * Only stated when a character is mentioned, which is where the evidence is.
 * `{pronoun}` comes from the sheet's own gender field, through the same table the
 * compiler uses — the neutral "their" when nobody has said.
 */
const SINGLE_PHOTO_INSTRUCTION =
  "This is a single photograph of {pronoun} alone: one person, once, in one " +
  "frame — not a grid, not a collage, not a sheet of variations, no repeated " +
  "or duplicated figures";

/**
 * The adjustment a node key names, when it resolves to a phrase — else Auto.
 *
 * All or nothing on purpose: a key this dictionary no longer recognises must not
 * half-apply, silencing the sheet's default while putting nothing in its place.
 */
function sceneAdjustment(
  campo: CanvasSceneAdjustment["campo"],
  options: readonly SheetOption[],
  key: string | null,
): CanvasSceneAdjustment | null {
  const option = findOption(options, key);

  return option?.en ? { campo, chave: option.key, frase: option.en } : null;
}

export function buildCanvasPrompt({
  personagem,
  cenaPt,
  cenaEn,
  estiloKey,
  anguloKey,
  iluminacaoKey,
  expressaoKey,
  referencias,
}: BuildCanvasPromptOptions): CanvasPrompt {
  const directed = cenaPt.trim() !== "";

  // Rule 11's hierarchy, resolved once and recorded: the node decides which
  // style, the character supplies the default, and the dictionary guarantees
  // there is always one.
  const inherited = personagem?.sheet.padroes_variaveis.estilo_renderizacao.valor ?? null;
  const chosen = estiloKey ?? (typeof inherited === "string" ? inherited : null);
  const option = estiloOption(chosen);

  const estilo: CanvasStyleBlock = {
    chave: option.key,
    frase: option.en,
    reforco: option.reforco,
    origem: estiloKey ? "node" : personagem ? "personagem" : "padrao",
  };

  // Rule 4 of §6, now with a replacement and not only a silence. In "padrões"
  // mode a field the node answered leaves the sheet's default out and puts the
  // node's phrase in; in a directed scene the defaults are already out and the
  // adjustments simply add. The camera angle stands down pose *and* framing —
  // the three are one axis (where the camera is, how much of the body it sees),
  // and the sheet's pose carries a facing that would contradict "profile".
  const angulo = sceneAdjustment("angulo_camera", ANGULO_CAMERA, anguloKey);
  const iluminacao = sceneAdjustment("iluminacao", ILUMINACAO, iluminacaoKey);
  const expressao = sceneAdjustment("expressao", EXPRESSAO, expressaoKey);

  // Fixed order — camera, then light, then face: the order a scene is read in.
  const ajustes = [angulo, iluminacao, expressao].filter(
    (adjustment): adjustment is CanvasSceneAdjustment => adjustment !== null,
  );

  const omitted: readonly CenaPadraoKey[] = directed
    ? ALL_SCENE_KEYS
    : [
        "estilo_renderizacao",
        ...(angulo ? (["pose", "enquadramento"] as const) : []),
        ...(iluminacao ? (["iluminacao"] as const) : []),
        ...(expressao ? (["expressao"] as const) : []),
      ];

  // One compilation, then a selection. Compiling twice — once with defaults and
  // once without — would be two chances to disagree about the same sheet.
  const compiled = personagem
    ? compilePrompt(personagem.sheet, { omitirCenaPadrao: omitted })
    : null;

  const hasAnchorImage = personagem !== null && personagem.folhaAssetId !== null;

  // The sheet leads, because it is the identity every later number counts from.
  const referenceAssetIds = [
    ...(hasAnchorImage ? [personagem.folhaAssetId as string] : []),
    ...referencias.map((reference) => reference.assetId),
  ];

  const firstAttached = hasAnchorImage ? 2 : 1;

  const directives: CanvasReferenceDirective[] = referencias.map((reference, index) => {
    const ordem = firstAttached + index;
    const subject = referenceSubject(reference.kind, ordem);
    const instruction = reference.instrucaoEn.trim();

    return {
      ordem,
      asset_id: reference.assetId,
      tipo: reference.kind,
      origem: reference.origem,
      instrucao_pt: reference.instrucaoPt.trim(),
      instrucao_en: instruction,
      diretiva_en: instruction
        ? `Use ${subject}, ${instruction}`
        : `Use ${subject}, faithfully`,
      fidelidade_en: referenceFidelity(reference.kind, ordem),
    };
  });

  // The pronoun the sheet itself settles on, read exactly as the compiler reads
  // it — "their" when the gender is not decided, which is the honest neutral.
  const generoKey = personagem?.sheet.dna_visual.genero_apresentacao.valor ?? null;
  const pronoun =
    typeof generoKey === "string" && generoKey in PRONOUN_BY_GENERO
      ? PRONOUN_BY_GENERO[generoKey as GeneroApresentacao]
      : PRONOUN_BY_GENERO.androgino;

  const structure: CanvasPromptStructure = {
    estilo,
    foto_unica: personagem
      ? SINGLE_PHOTO_INSTRUCTION.replaceAll("{pronoun}", pronoun)
      : null,
    personagem: personagem
      ? {
          handle: personagem.handle,
          versao: personagem.versionNumber,
          entity_version_id: personagem.entityVersionId,
          folha_asset_id: personagem.folhaAssetId,
        }
      : null,
    identidade: compiled?.structure.identidade ?? [],
    ancora: hasAnchorImage ? [...ANCHOR_INSTRUCTIONS] : [],
    // The director rule, in the only two lines that enforce it.
    traje_canonico: directed ? null : (compiled?.structure.traje_canonico ?? null),
    cena_padrao: directed ? [] : (compiled?.structure.cena_padrao ?? []),
    cena_usuario: directed ? { pt: cenaPt.trim(), en: cenaEn.trim() } : null,
    ajustes_cena: ajustes,
    referencias: directives,
    restricoes: compiled?.structure.restricoes ?? [],
    regra_diretor: directed ? "prompt_dirige" : "padroes_da_personagem",
  };

  return {
    text: renderText(structure),
    structure,
    referenceAssetIds,
    compiled,
  };
}

/**
 * The order of §6, rendered.
 *
 * Style first (rule 11: naming the medium before anything that could imply one),
 * identity next, then the scene — the user's, or the character's own when there
 * is no user's — then the node's scene adjustments, then what to do with each
 * attached image, and restrictions last, always (rule 5).
 *
 * Every part is normalised without a full stop and the sentence is closed once at
 * the end, so a missing block can never leave ".." behind.
 */
function renderText(structure: CanvasPromptStructure): string {
  const sentences = [
    structure.estilo.frase,
    structure.estilo.reforco,
    // Composition before identity: what kind of picture this is has to be
    // settled before the model starts deciding how many people are in it.
    structure.foto_unica ?? "",
    structure.identidade.join(", "),
    ...structure.ancora,
    structure.traje_canonico ?? "",
    structure.cena_padrao.join(", "),
    structure.cena_usuario?.en ?? "",
    // The node's adjustments, right after the scene they adjust.
    ...structure.ajustes_cena.map((adjustment) => adjustment.frase),
    // Each attached image says what to use it for and, immediately after, what
    // about it may not change — adjacent so the pair reads as one instruction.
    ...structure.referencias.flatMap((reference) =>
      [reference.diretiva_en, reference.fidelidade_en ?? ""].filter(Boolean),
    ),
    ...structure.restricoes,
  ]
    .map((sentence) => sentence.trim().replace(/\.$/, ""))
    .filter((sentence) => sentence !== "")
    .map((sentence) => sentence.charAt(0).toUpperCase() + sentence.slice(1));

  return sentences.length === 0 ? "" : `${sentences.join(". ")}.`;
}
