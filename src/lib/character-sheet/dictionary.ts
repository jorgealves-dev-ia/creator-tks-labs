/**
 * The closed lists of the character sheet — the single source of truth for both
 * sides of the system: the interface reads `pt`, the prompt compiler copies `en`
 * verbatim. Source: docs/character-sheet.md §5. Skin-tone swatches come from
 * docs/tela-character-sheet.md §4.3.
 *
 * ┌───────────────────────────────────────────────────────────────────────────┐
 * │  WARNING — OPTION KEYS ARE IMMUTABLE                                       │
 * │                                                                            │
 * │  `key` (morena_clara, arqueadas_suaves, …) is the value written into the   │
 * │  sheet JSON and therefore into every frozen entity_version that cites it.  │
 * │  Versions can never be rewritten (database trigger), so renaming a key     │
 * │  breaks those snapshots forever: an old version would point at an option   │
 * │  that no longer exists.                                                    │
 * │                                                                            │
 * │  To reword an option, change `pt` only — never the key.                    │
 * │  Adding a new option is always safe. Removing one is not.                  │
 * └───────────────────────────────────────────────────────────────────────────┘
 *
 * `en` is the fixed English phrase, used literally and never re-translated by
 * an AI at generation time (compilation rule 7). A null `en` means the option is
 * omitted from the prompt entirely — "nenhuma" and "sem franja" are choices that
 * say *nothing* rather than something.
 */

export type SheetOption = {
  /** Immutable — stored in the sheet JSON. See the warning above. */
  readonly key: string;
  /** Label shown in the interface. */
  readonly pt: string;
  /** Fixed English phrase for the compiler. Null omits the option from the prompt. */
  readonly en: string | null;
  /** The phrase only makes sense together with the free-text `detalhes` field. */
  readonly requiresDetails?: true;
};

/** A skin tone also carries the swatch the interface paints (U4). */
export type SkinToneOption = SheetOption & { readonly hex: string };

/** Narrows a list to the union of its keys, so the schema can validate against it. */
export type OptionKeyOf<T extends readonly SheetOption[]> = T[number]["key"];

/**
 * Placeholder inside the fixed phrases of §5.2. The compiler swaps it for the
 * pronoun of the character's presented gender.
 */
export const PRONOUN_PLACEHOLDER = "{her/his/their}";

/** Placeholder for the free-text detail of an option that needs one (dyed hair). */
export const DETAIL_PLACEHOLDER = "{detalhe}";

// ---------------------------------------------------------------------------
// Layer 1 — visual DNA
// ---------------------------------------------------------------------------

/** §5.1 · Presented gender. */
export const GENERO_APRESENTACAO = [
  { key: "feminino", pt: "Feminino", en: "a woman" },
  { key: "masculino", pt: "Masculino", en: "a man" },
  { key: "androgino", pt: "Andrógino", en: "an androgynous person" },
] as const satisfies readonly SheetOption[];

export type GeneroApresentacao = OptionKeyOf<typeof GENERO_APRESENTACAO>;

/** The pronoun each gender resolves PRONOUN_PLACEHOLDER to. */
export const PRONOUN_BY_GENERO: Record<GeneroApresentacao, string> = {
  feminino: "her",
  masculino: "his",
  androgino: "their",
};

/** §5.2 · Apparent age — the visual one. The real age belongs to the narrative. */
export const IDADE_APARENTE = [
  { key: "inicio_dos_20", pt: "Início dos 20", en: `in ${PRONOUN_PLACEHOLDER} early twenties` },
  { key: "fim_dos_20", pt: "Fim dos 20", en: `in ${PRONOUN_PLACEHOLDER} late twenties` },
  { key: "nos_30", pt: "Nos 30", en: `in ${PRONOUN_PLACEHOLDER} thirties` },
  { key: "nos_40", pt: "Nos 40", en: `in ${PRONOUN_PLACEHOLDER} forties` },
  { key: "50_ou_mais", pt: "50 ou mais", en: `in ${PRONOUN_PLACEHOLDER} fifties or older` },
] as const satisfies readonly SheetOption[];

/** §5.3 · Face shape. */
export const FORMATO_ROSTO = [
  { key: "oval", pt: "Oval", en: "oval face" },
  { key: "redondo", pt: "Redondo", en: "round face" },
  { key: "quadrado", pt: "Quadrado", en: "square face with a defined jawline" },
  { key: "coracao", pt: "Coração", en: "heart-shaped face" },
  { key: "alongado", pt: "Alongado", en: "long oblong face" },
  { key: "diamante", pt: "Diamante", en: "diamond-shaped face with high cheekbones" },
] as const satisfies readonly SheetOption[];

/** §5.4 · Eye colour. Heterochromia: pick the closest and describe it in `detalhes`. */
export const OLHOS_COR = [
  { key: "castanho_escuro", pt: "Castanho-escuro", en: "dark brown eyes" },
  { key: "castanho_claro", pt: "Castanho-claro (mel)", en: "light honey-brown eyes" },
  { key: "avela", pt: "Avelã", en: "hazel eyes" },
  { key: "verde", pt: "Verde", en: "green eyes" },
  { key: "azul", pt: "Azul", en: "blue eyes" },
  { key: "azul_acinzentado", pt: "Azul-acinzentado", en: "gray-blue eyes" },
  { key: "cinza", pt: "Cinza", en: "gray eyes" },
  { key: "preto", pt: "Preto", en: "very dark brown, almost black eyes" },
] as const satisfies readonly SheetOption[];

/** §5.5 · Eye shape. */
export const OLHOS_FORMATO = [
  { key: "amendoado", pt: "Amendoado", en: "almond-shaped eyes" },
  { key: "redondo", pt: "Redondo", en: "round eyes" },
  { key: "caido", pt: "Caído", en: "downturned eyes" },
  { key: "levantado", pt: "Levantado", en: "upturned eyes" },
  { key: "encapuzado", pt: "Encapuzado", en: "hooded eyes" },
  { key: "palpebra_unica", pt: "Pálpebra única (monolid)", en: "monolid eyes" },
] as const satisfies readonly SheetOption[];

/** §5.6 · Eye spacing. */
export const OLHOS_ESPACAMENTO = [
  { key: "proximos", pt: "Próximos", en: "close-set eyes" },
  { key: "medio", pt: "Médio", en: "evenly spaced eyes" },
  { key: "afastados", pt: "Afastados", en: "wide-set eyes" },
] as const satisfies readonly SheetOption[];

/** §5.7a · Eyebrow shape. The compiler joins thickness + shape into one phrase. */
export const SOBRANCELHAS_FORMATO = [
  { key: "retas", pt: "Retas", en: "straight eyebrows" },
  { key: "arqueadas_suaves", pt: "Arqueadas suaves", en: "softly arched eyebrows" },
  { key: "arqueadas_marcadas", pt: "Arqueadas marcadas", en: "high-arched eyebrows" },
  { key: "angulosas", pt: "Angulosas", en: "angular eyebrows" },
] as const satisfies readonly SheetOption[];

/** §5.7b · Eyebrow thickness. */
export const SOBRANCELHAS_ESPESSURA = [
  { key: "finas", pt: "Finas", en: "thin" },
  { key: "medias", pt: "Médias", en: "medium-thickness" },
  { key: "grossas", pt: "Grossas / cheias", en: "thick, full" },
] as const satisfies readonly SheetOption[];

/** §5.8 · Nose. */
export const NARIZ = [
  { key: "fino_e_reto", pt: "Fino e reto", en: "slim, straight nose" },
  { key: "arrebitado", pt: "Arrebitado", en: "small upturned nose" },
  { key: "de_botao", pt: "De botão", en: "small button nose" },
  { key: "largo", pt: "Largo", en: "broad nose" },
  { key: "aquilino", pt: "Aquilino", en: "aquiline nose" },
] as const satisfies readonly SheetOption[];

/** §5.9 · Lips. */
export const LABIOS = [
  { key: "finos", pt: "Finos", en: "thin lips" },
  { key: "medios", pt: "Médios", en: "medium, balanced lips" },
  { key: "carnudos", pt: "Carnudos", en: "full lips" },
  {
    key: "carnudos_com_arco_marcado",
    pt: "Carnudos com arco marcado",
    en: "full lips with a defined cupid's bow",
  },
  {
    key: "superior_fino_inferior_cheio",
    pt: "Superior fino, inferior cheio",
    en: "thinner upper lip with a fuller lower lip",
  },
] as const satisfies readonly SheetOption[];

/**
 * §5.10a · Skin tone. The hex is only what the interface paints on the swatch —
 * the stored value is the key, never the colour, so the swatches can be tuned by
 * eye later without touching a single saved sheet.
 */
export const PELE_TOM = [
  { key: "muito_clara", pt: "Muito clara", en: "very fair skin", hex: "#F7E9DE" },
  { key: "clara", pt: "Clara", en: "fair skin", hex: "#F5DCC3" },
  { key: "clara_dourada", pt: "Clara-dourada", en: "light golden skin", hex: "#EFD0A9" },
  { key: "morena_clara", pt: "Morena-clara", en: "light tan skin", hex: "#DDB088" },
  { key: "morena", pt: "Morena", en: "medium tan skin", hex: "#C89066" },
  { key: "morena_oliva", pt: "Morena-oliva", en: "medium olive skin", hex: "#B08050" },
  { key: "morena_escura", pt: "Morena-escura", en: "deep tan brown skin", hex: "#92603C" },
  { key: "negra", pt: "Negra", en: "dark brown skin", hex: "#63402A" },
  { key: "negra_retinta", pt: "Negra retinta", en: "deep, rich dark skin", hex: "#3B2418" },
] as const satisfies readonly SkinToneOption[];

/** §5.10b · Skin undertone. */
export const PELE_SUBTOM = [
  { key: "frio", pt: "Frio (rosado)", en: "with a cool pink undertone" },
  { key: "neutro", pt: "Neutro", en: "with a neutral undertone" },
  { key: "quente", pt: "Quente (dourado)", en: "with a warm golden undertone" },
  { key: "oliva", pt: "Oliva", en: "with an olive undertone" },
] as const satisfies readonly SheetOption[];

/** §5.11 · Freckles. */
export const PELE_SARDAS = [
  { key: "nenhuma", pt: "Nenhuma", en: null },
  {
    key: "leves_nariz_bochechas",
    pt: "Leves no nariz e bochechas",
    en: "light freckles across the nose and cheeks",
  },
  { key: "marcadas_no_rosto", pt: "Marcadas no rosto", en: "prominent freckles across the face" },
  {
    key: "no_rosto_e_nos_ombros",
    pt: "No rosto e nos ombros",
    en: "freckles on the face and shoulders",
  },
] as const satisfies readonly SheetOption[];

/** §5.12 · Hair colour. */
export const CABELO_COR = [
  { key: "preto", pt: "Preto", en: "black hair" },
  { key: "castanho_escuro", pt: "Castanho-escuro", en: "dark brown hair" },
  { key: "castanho_medio", pt: "Castanho-médio", en: "medium brown hair" },
  { key: "castanho_claro", pt: "Castanho-claro", en: "light brown hair" },
  { key: "loiro_escuro", pt: "Loiro-escuro", en: "dark blonde hair" },
  { key: "loiro", pt: "Loiro", en: "blonde hair" },
  { key: "loiro_platinado", pt: "Loiro-platinado", en: "platinum blonde hair" },
  { key: "ruivo_acobreado", pt: "Ruivo-acobreado", en: "copper red hair" },
  { key: "ruivo_acastanhado", pt: "Ruivo-acastanhado", en: "auburn hair" },
  { key: "grisalho", pt: "Grisalho", en: "gray hair" },
  { key: "branco", pt: "Branco", en: "white hair" },
  {
    key: "colorido",
    pt: "Colorido (descrever em detalhes)",
    en: `dyed ${DETAIL_PLACEHOLDER} hair`,
    requiresDetails: true,
  },
] as const satisfies readonly SheetOption[];

/** §5.13 · Hair texture. Subtype (2B, 3C…) goes in `detalhes`. */
export const CABELO_TEXTURA = [
  { key: "liso", pt: "Liso (tipo 1)", en: "straight hair" },
  { key: "ondulado", pt: "Ondulado (tipo 2)", en: "wavy hair" },
  { key: "cacheado", pt: "Cacheado (tipo 3)", en: "curly hair" },
  { key: "crespo", pt: "Crespo (tipo 4)", en: "coily hair" },
] as const satisfies readonly SheetOption[];

/**
 * §5.14 · Hair length, always anchored to the body. This list is the clearest
 * argument for closed lists in the first place: "cabelo longo" never again.
 */
export const CABELO_COMPRIMENTO = [
  { key: "raspado", pt: "Raspado", en: "buzzed hair" },
  { key: "muito_curto", pt: "Muito curto (pixie)", en: "pixie-length hair" },
  { key: "na_altura_do_queixo", pt: "Na altura do queixo", en: "chin-length hair" },
  { key: "nos_ombros", pt: "Nos ombros", en: "shoulder-length hair" },
  { key: "na_clavicula", pt: "Na clavícula", en: "collarbone-length hair" },
  { key: "no_meio_das_costas", pt: "No meio das costas", en: "mid-back-length hair" },
  { key: "na_cintura", pt: "Na cintura", en: "waist-length hair" },
] as const satisfies readonly SheetOption[];

/** §5.15a · Parting. */
export const CABELO_REPARTICAO = [
  { key: "ao_centro", pt: "Ao centro", en: "center-parted" },
  { key: "lateral", pt: "Lateral", en: "side-parted" },
  { key: "sem_reparticao", pt: "Sem repartição (para trás)", en: "brushed back with no part" },
] as const satisfies readonly SheetOption[];

/** §5.15b · Fringe. */
export const CABELO_FRANJA = [
  { key: "sem_franja", pt: "Sem franja", en: null },
  { key: "reta", pt: "Reta", en: "with straight blunt bangs" },
  { key: "cortina", pt: "Cortina", en: "with curtain bangs" },
  { key: "lateral", pt: "Lateral", en: "with side-swept bangs" },
] as const satisfies readonly SheetOption[];

/** §5.15c · Cut finish. */
export const CABELO_ACABAMENTO = [
  { key: "pontas_retas", pt: "Pontas retas", en: "with blunt-cut ends" },
  { key: "em_camadas", pt: "Em camadas", en: "layered" },
  { key: "desfiado", pt: "Desfiado", en: "with textured, feathered layers" },
] as const satisfies readonly SheetOption[];

/** §5.16 · Body silhouette — feminine list. */
export const SILHUETA_FEMININA = [
  { key: "magra", pt: "Magra", en: "slim, slender build" },
  { key: "esbelta_tonificada", pt: "Esbelta tonificada", en: "slender, lightly toned build" },
  { key: "atletica_definida", pt: "Atlética definida", en: "athletic, defined build" },
  { key: "fitness_musculosa", pt: "Fitness musculosa", en: "muscular fitness physique" },
  { key: "curvilinea", pt: "Curvilínea", en: "curvy build" },
  { key: "violao", pt: "Violão", en: "hourglass figure" },
  { key: "plus_size", pt: "Plus size", en: "plus-size build" },
] as const satisfies readonly SheetOption[];

/** §5.16 · Body silhouette — masculine list. */
export const SILHUETA_MASCULINA = [
  { key: "magro", pt: "Magro", en: "lean build" },
  { key: "atletico", pt: "Atlético", en: "athletic build" },
  { key: "musculoso_definido", pt: "Musculoso definido", en: "muscular, defined physique" },
  {
    key: "muito_musculoso_veias_visiveis",
    pt: "Muito musculoso, veias visíveis",
    en: "highly muscular physique with visible veins",
  },
  { key: "robusto", pt: "Robusto", en: "heavyset build" },
] as const satisfies readonly SheetOption[];

/**
 * Every silhouette key that exists, in one flat list. The schema validates
 * against this rather than against the gendered subset: a character whose gender
 * changes after the silhouette was chosen must still load, and a frozen version
 * must stay readable no matter what.
 */
export const SILHUETA_TODAS = [
  ...SILHUETA_FEMININA,
  ...SILHUETA_MASCULINA,
] as const satisfies readonly SheetOption[];

/**
 * A set of options under an optional heading. Most fields offer a single
 * unnamed group; only the silhouette below needs two.
 */
export type OptionGroup = { readonly pt: string | null; readonly options: readonly SheetOption[] };

/** The common case: one flat list, no heading. */
export function singleGroup(options: readonly SheetOption[]): readonly OptionGroup[] {
  return [{ pt: null, options }];
}

/**
 * The specification defines a feminine and a masculine list but says nothing
 * about androgynous characters. Rather than pick one for the user, both are
 * offered under their own headings — the English phrases genuinely differ
 * ("slim, slender build" is not "lean build"), so neither list contains the
 * other. Approved 2026-08-07.
 */
export function silhuetaGroupsFor(genero: string | number | null): readonly OptionGroup[] {
  if (genero === "feminino") return singleGroup(SILHUETA_FEMININA);
  if (genero === "masculino") return singleGroup(SILHUETA_MASCULINA);

  return [
    { pt: "Silhuetas femininas", options: SILHUETA_FEMININA },
    { pt: "Silhuetas masculinas", options: SILHUETA_MASCULINA },
  ];
}

/** §5.17 · Optional body proportions. Left empty, they are omitted from the prompt. */
export const PROPORCOES_BUSTO = [
  { key: "pequeno", pt: "Pequeno", en: "small bust" },
  { key: "medio", pt: "Médio", en: "medium bust" },
  { key: "volumoso", pt: "Volumoso", en: "full bust" },
] as const satisfies readonly SheetOption[];

export const PROPORCOES_CINTURA = [
  { key: "marcada", pt: "Marcada", en: "defined waist" },
  { key: "reta", pt: "Reta", en: "straight waist" },
] as const satisfies readonly SheetOption[];

export const PROPORCOES_QUADRIL = [
  { key: "estreito", pt: "Estreito", en: "narrow hips" },
  { key: "medio", pt: "Médio", en: "medium hips" },
  { key: "largo", pt: "Largo", en: "wide hips" },
] as const satisfies readonly SheetOption[];

/** Height is a number, not a list — §4 of the sheet specification. */
export const ALTURA_CM_MIN = 140;
export const ALTURA_CM_MAX = 210;

/** §5.18a · Tattoo placement. */
export const TATUAGEM_POSICAO = [
  { key: "pulso_interno_esquerdo", pt: "Pulso interno esquerdo", en: "inner left wrist" },
  { key: "pulso_interno_direito", pt: "Pulso interno direito", en: "inner right wrist" },
  { key: "antebraco_esquerdo", pt: "Antebraço esquerdo", en: "left forearm" },
  { key: "antebraco_direito", pt: "Antebraço direito", en: "right forearm" },
  { key: "biceps", pt: "Bíceps", en: "upper arm" },
  { key: "ombro", pt: "Ombro", en: "shoulder" },
  { key: "escapula", pt: "Escápula", en: "shoulder blade" },
  { key: "clavicula", pt: "Clavícula", en: "collarbone" },
  { key: "costelas", pt: "Costelas", en: "ribcage" },
  { key: "lombar", pt: "Lombar", en: "lower back" },
  { key: "nuca", pt: "Nuca", en: "nape of the neck" },
  { key: "atras_da_orelha", pt: "Atrás da orelha", en: "behind the ear" },
  { key: "coxa", pt: "Coxa", en: "thigh" },
  { key: "panturrilha", pt: "Panturrilha", en: "calf" },
  { key: "tornozelo", pt: "Tornozelo", en: "ankle" },
  { key: "mao_dedos", pt: "Mão / dedos", en: "hand" },
] as const satisfies readonly SheetOption[];

/** §5.18b · Tattoo size. */
export const TATUAGEM_TAMANHO = [
  { key: "pequena", pt: "Pequena", en: "small" },
  { key: "media", pt: "Média", en: "medium-sized" },
  { key: "grande", pt: "Grande", en: "large" },
] as const satisfies readonly SheetOption[];

/** §5.18c · Tattoo style. */
export const TATUAGEM_ESTILO = [
  { key: "fineline", pt: "Fineline", en: "fine-line" },
  { key: "realista", pt: "Realista", en: "realistic" },
  { key: "tradicional_old_school", pt: "Tradicional old school", en: "traditional old-school" },
  { key: "aquarela", pt: "Aquarela", en: "watercolor" },
  { key: "geometrico", pt: "Geométrico", en: "geometric" },
  { key: "tribal", pt: "Tribal", en: "tribal" },
  { key: "lettering", pt: "Lettering", en: "script lettering" },
] as const satisfies readonly SheetOption[];

/** §5.19a · Piercing placement. */
export const PIERCING_LOCAL = [
  { key: "lobulo", pt: "Lóbulo", en: "earlobe" },
  { key: "helix", pt: "Cartilagem / hélix", en: "helix" },
  { key: "asa_do_nariz", pt: "Asa do nariz", en: "nostril" },
  { key: "septo", pt: "Septo", en: "septum" },
  { key: "sobrancelha", pt: "Sobrancelha", en: "eyebrow" },
  { key: "labio", pt: "Lábio", en: "lip" },
  { key: "umbigo", pt: "Umbigo", en: "navel" },
  { key: "lingua", pt: "Língua", en: "tongue" },
] as const satisfies readonly SheetOption[];

/** §5.19b · Piercing jewellery. */
export const PIERCING_JOIA = [
  { key: "argola_pequena", pt: "Argola pequena", en: "a small hoop" },
  { key: "pino", pt: "Pino", en: "a small stud" },
] as const satisfies readonly SheetOption[];

/**
 * Other marks — moles, scars, birthmarks. §4 of the sheet specification lists
 * the three types but gives no fixed phrases for them; these come from the
 * compiled example in §7, which reads "a small beauty mark above the left side
 * of the lip".
 */
export const MARCA_TIPO = [
  { key: "pinta", pt: "Pinta", en: "beauty mark" },
  { key: "cicatriz", pt: "Cicatriz", en: "scar" },
  { key: "mancha", pt: "Mancha", en: "birthmark" },
] as const satisfies readonly SheetOption[];

// ---------------------------------------------------------------------------
// Layer 2 — variable defaults
// ---------------------------------------------------------------------------

/** §5.20 · Expression. */
export const EXPRESSAO = [
  { key: "neutra_serena", pt: "Neutra serena", en: "neutral, relaxed expression" },
  { key: "sorriso_suave", pt: "Sorriso suave (fechado)", en: "soft closed-lip smile" },
  { key: "sorriso_aberto", pt: "Sorriso aberto", en: "warm open smile" },
  { key: "confiante", pt: "Confiante", en: "confident expression" },
  { key: "seria", pt: "Séria", en: "serious expression" },
] as const satisfies readonly SheetOption[];

/** §5.21 · Pose. */
export const POSE = [
  { key: "em_pe_frontal", pt: "Em pé, frontal", en: "standing, facing the camera" },
  { key: "em_pe_tres_quartos", pt: "Em pé, 3/4", en: "standing at a three-quarter angle" },
  { key: "sentada", pt: "Sentada", en: "seated, natural posture" },
  { key: "caminhando", pt: "Caminhando", en: "mid-stride walking pose" },
] as const satisfies readonly SheetOption[];

/**
 * §5.22 · Canonical outfit. The compression option is also the automatic
 * fallback when a model refuses or degrades the swimwear generation.
 */
export const TRAJE_CANONICO = [
  {
    key: "biquini_neutro",
    pt: "Biquíni liso neutro",
    en: "wearing a plain, neutral-tone two-piece swimsuit, barefoot",
  },
  {
    key: "sunga_neutra",
    pt: "Sunga lisa neutra",
    en: "wearing plain, neutral-tone swim briefs, barefoot",
  },
  {
    key: "compressao_esportiva",
    pt: "Compressão esportiva opaca",
    en:
      "wearing an opaque, tight-fitting athletic compression top and shorts, " +
      "non-transparent matte fabric, arms and legs uncovered, barefoot",
  },
] as const satisfies readonly SheetOption[];

/** The default outfit for each gender — feminine gets the bikini, masculine the briefs. */
export const TRAJE_PADRAO_POR_GENERO: Record<GeneroApresentacao, string> = {
  feminino: "biquini_neutro",
  masculino: "sunga_neutra",
  androgino: "compressao_esportiva",
};

/**
 * §5.26 · Rendering style — compilation rule 11.
 *
 * This list exists because of a real generation: the first complete sheet came
 * out looking like a drawing. The cause was ours and it was an absence — the
 * canonical prompt anchored identity and outfit and said nothing at all about
 * medium, and `character reference sheet` is vocabulary a great many models read
 * as *illustrated character design*. The model's reading was legitimate; it just
 * was not ours to leave up to it.
 *
 * Which is why style is a closed list in layer 2 and not a constant of the
 * canonical generation: a style that anchors the reference sheet and then lets
 * every canvas node drift would not be an anchor at all. Same reasoning as every
 * other field here — an anchor that varies is a bad anchor.
 *
 * `reforco` is the sentence that closes the door, and every option carries one,
 * not only the photographic ones: an anime sheet that comes out photographic is
 * exactly the same bug, mirrored. Reinforcing one side would fix half a problem.
 */
export type EstiloRenderizacaoOption = Omit<SheetOption, "en"> & {
  /** Never null: rule 11 says a generation is never left without a style. */
  readonly en: string;
  /** Stated right after the style, where a model is most likely to obey it. */
  readonly reforco: string;
};

const REFORCO_FOTOGRAFICO =
  "This is a real photograph, not an illustration, drawing or 3D render";

export const ESTILO_RENDERIZACAO = [
  {
    key: "fotorrealista",
    pt: "Fotorrealista",
    en: "ultra-realistic photograph, photorealistic, natural skin texture, shot on a professional camera",
    reforco: REFORCO_FOTOGRAFICO,
  },
  {
    key: "cinematografico",
    pt: "Cinematográfico",
    en: "cinematic film still, shallow depth of field, filmic color grading, soft natural light",
    reforco: REFORCO_FOTOGRAFICO,
  },
  {
    key: "editorial_moda",
    pt: "Editorial de moda",
    en: "high-fashion editorial photograph, professional studio lighting, magazine-quality retouching",
    reforco: REFORCO_FOTOGRAFICO,
  },
  {
    key: "ilustracao_2d",
    pt: "Ilustração 2D",
    en: "flat 2D digital illustration, clean line art, cel shading, solid color fills",
    reforco: "This is a hand-drawn 2D illustration, not a photograph",
  },
  {
    key: "anime",
    pt: "Anime",
    en: "anime illustration, cel-shaded, Japanese animation art style, expressive linework",
    reforco: "This is an anime illustration, not a photograph",
  },
  {
    key: "pixel_art",
    pt: "Pixel art",
    en: "pixel art, low resolution sprite aesthetic, limited color palette, visible square pixels",
    reforco: "This is pixel art, not a photograph",
  },
  {
    key: "render_3d",
    pt: "3D estilizado",
    en: "stylized 3D character render, soft global illumination, subsurface scattering on the skin",
    reforco: "This is a stylized 3D render, not a photograph",
  },
] as const satisfies readonly EstiloRenderizacaoOption[];

/**
 * What a sheet with no style means. Every character sheet written before
 * 09/08/2026 is one of those, and reading them as photorealistic is not a guess:
 * it is what they already were in practice, on every generation that came out
 * right.
 */
export const ESTILO_RENDERIZACAO_PADRAO = "fotorrealista";

/**
 * The style of a stored value — never null, whatever arrives. An unknown key or
 * a missing value falls back to the default rather than producing a prompt with
 * no medium in it, which is precisely the bug rule 11 exists to close.
 */
export function estiloOption(valor: string | null): EstiloRenderizacaoOption {
  return (
    ESTILO_RENDERIZACAO.find((option) => option.key === valor) ??
    ESTILO_RENDERIZACAO.find((option) => option.key === ESTILO_RENDERIZACAO_PADRAO)!
  );
}

/** §5.23 · Canonical background. */
export const FUNDO_CANONICO = [
  { key: "cinza_claro", pt: "Cinza claro sem textura", en: "seamless light gray studio background" },
  { key: "branco_limpo", pt: "Branco limpo", en: "clean white studio background" },
  { key: "cinza_medio", pt: "Cinza médio", en: "seamless medium gray studio background" },
] as const satisfies readonly SheetOption[];

/** §5.24 · Lighting. */
export const ILUMINACAO = [
  { key: "estudio_difusa", pt: "Estúdio difusa", en: "soft, diffused studio lighting" },
  { key: "luz_natural_janela", pt: "Luz natural de janela", en: "natural window light" },
  { key: "golden_hour", pt: "Golden hour", en: "warm golden-hour sunlight" },
  { key: "dia_nublado", pt: "Dia nublado", en: "soft overcast daylight" },
] as const satisfies readonly SheetOption[];

/** §5.25 · Framing. */
export const ENQUADRAMENTO = [
  { key: "corpo_inteiro", pt: "Corpo inteiro", en: "full-body shot" },
  { key: "meio_corpo", pt: "Meio corpo", en: "waist-up shot" },
  { key: "retrato", pt: "Retrato", en: "head-and-shoulders portrait" },
] as const satisfies readonly SheetOption[];

/**
 * Restriction kind. Compilation rule 5: restrictions always enter the prompt, at
 * the end, whatever the generating node asked for.
 */
export const RESTRICAO_TIPO = [
  { key: "nunca", pt: "Nunca", en: "never" },
  { key: "sempre", pt: "Sempre", en: "always" },
] as const satisfies readonly SheetOption[];

// ---------------------------------------------------------------------------
// Canonical images
// ---------------------------------------------------------------------------

/**
 * The complete reference sheet — the anchor of the whole identity (decision G3
 * of docs/geracao-canonica.md).
 *
 * It is listed apart from the six views for one reason: it is not one of them.
 * Every view is generated *with the sheet attached as a reference image*, so the
 * sheet comes first in the interface and first in the order of work. Portrait is
 * the default; the landscape one is an option, not a second anchor.
 */
export const FOLHA_SLOTS = [
  { key: "folha_completa", pt: "Folha completa", hint: "vertical" },
  { key: "folha_completa_horizontal", pt: "Folha horizontal", hint: "opcional" },
] as const;

/**
 * The six canonical view slots. The key is the field name inside the sheet's
 * `imagens_canonicas` block, and doubles as entity_images.role — so it is as
 * immutable as any option key above.
 */
export const IMAGENS_CANONICAS_SLOTS = [
  { key: "turnaround_frente", pt: "Frente" },
  { key: "turnaround_tres_quartos", pt: "3/4" },
  { key: "turnaround_perfil", pt: "Perfil" },
  { key: "turnaround_costas", pt: "Costas" },
  { key: "folha_expressoes", pt: "Expressões" },
  { key: "paleta_cores", pt: "Paleta" },
] as const;

/**
 * Every canonical slot there is, sheets first.
 *
 * This list is the single source of truth for what a slot can be: the Zod schema
 * validates against it, the storage bookkeeping narrows against it, and the
 * prompt builder keys its recipes by it — so adding a slot is one entry here and
 * a compiler error everywhere it still needs a decision.
 */
export const TODOS_SLOTS_CANONICOS = [
  ...FOLHA_SLOTS,
  ...IMAGENS_CANONICAS_SLOTS,
] as const satisfies readonly { key: string; pt: string }[];

export type ImagemCanonicaSlot = (typeof TODOS_SLOTS_CANONICOS)[number]["key"];

/** The two slots that hold the anchor itself, rather than something it anchored. */
/** The Portuguese name of a slot — what the gallery calls the image it made. */
export function slotLabel(slot: ImagemCanonicaSlot): string {
  return TODOS_SLOTS_CANONICOS.find((entry) => entry.key === slot)?.pt ?? slot;
}

export function isFolhaSlot(slot: ImagemCanonicaSlot): boolean {
  return slot === "folha_completa" || slot === "folha_completa_horizontal";
}

// ---------------------------------------------------------------------------
// Lookups
// ---------------------------------------------------------------------------

/** The option a stored key refers to, or undefined if the key is unknown. */
export function findOption(
  options: readonly SheetOption[],
  key: string | null,
): SheetOption | undefined {
  if (!key) return undefined;
  return options.find((option) => option.key === key);
}

/**
 * What the interface shows for a stored key. An unknown key is shown as itself
 * rather than as blank: a sheet saved before an option was renamed must never
 * look empty, because looking empty is exactly the lie this system avoids.
 */
export function labelOf(options: readonly SheetOption[], key: string | null): string {
  if (!key) return "";
  return findOption(options, key)?.pt ?? key;
}
