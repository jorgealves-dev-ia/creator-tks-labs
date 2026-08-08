import {
  ALTURA_CM_MAX,
  ALTURA_CM_MIN,
  CABELO_ACABAMENTO,
  CABELO_COMPRIMENTO,
  CABELO_COR,
  CABELO_FRANJA,
  CABELO_REPARTICAO,
  CABELO_TEXTURA,
  ENQUADRAMENTO,
  EXPRESSAO,
  FORMATO_ROSTO,
  FUNDO_CANONICO,
  GENERO_APRESENTACAO,
  IDADE_APARENTE,
  ILUMINACAO,
  LABIOS,
  NARIZ,
  OLHOS_COR,
  OLHOS_ESPACAMENTO,
  OLHOS_FORMATO,
  PELE_SARDAS,
  PELE_SUBTOM,
  PELE_TOM,
  POSE,
  PROPORCOES_BUSTO,
  PROPORCOES_CINTURA,
  PROPORCOES_QUADRIL,
  silhuetaGroupsFor,
  singleGroup,
  SOBRANCELHAS_ESPESSURA,
  SOBRANCELHAS_FORMATO,
  TRAJE_CANONICO,
  type OptionGroup,
  type SheetOption,
} from "@/lib/character-sheet/dictionary";
import type { CharacterSheet, PlainChoice, SheetField } from "@/lib/character-sheet/schema";
import { t } from "@/lib/i18n/pt-BR";

/**
 * The form, described as data rather than as markup.
 *
 * One definition per field carries its label, its list and a typed pair of
 * accessors. The editor renders whatever is here, so adding a field is one entry
 * in this file — never a new component, and never a list copied into a
 * component, which is what would let the interface and the compiler drift apart.
 *
 * `write` mutates the sheet it receives: the store always hands it a fresh copy.
 */

export type DnaFieldKind = "list" | "swatch" | "number";

export type DnaField = {
  /** Stable id — also the DOM anchor used to jump between pending fields. */
  readonly id: string;
  readonly label: string;
  readonly kind: DnaFieldKind;
  /** Grouped because the silhouette depends on the presented gender. */
  readonly groups: (sheet: CharacterSheet) => readonly OptionGroup[];
  readonly read: (sheet: CharacterSheet) => SheetField;
  readonly write: (sheet: CharacterSheet, value: SheetField) => void;
  readonly min?: number;
  readonly max?: number;
  readonly suffix?: string;
  readonly placeholder?: string;
};

export type DnaGroup = {
  readonly id: string;
  readonly title: string;
  readonly fields: readonly DnaField[];
};

function listField(
  id: string,
  label: string,
  options: readonly SheetOption[],
  read: (sheet: CharacterSheet) => SheetField,
  write: (sheet: CharacterSheet, value: SheetField) => void,
): DnaField {
  return { id, label, kind: "list", groups: () => singleGroup(options), read, write };
}

export const DNA_GROUPS: readonly DnaGroup[] = [
  {
    id: "identidade-visual",
    title: t.characterSheet.groups.identidadeVisual,
    fields: [
      listField(
        "genero_apresentacao",
        t.characterSheet.fields.generoApresentacao,
        GENERO_APRESENTACAO,
        (sheet) => sheet.dna_visual.genero_apresentacao,
        (sheet, value) => {
          sheet.dna_visual.genero_apresentacao = value;
        },
      ),
      listField(
        "idade_aparente",
        t.characterSheet.fields.idadeAparente,
        IDADE_APARENTE,
        (sheet) => sheet.dna_visual.idade_aparente,
        (sheet, value) => {
          sheet.dna_visual.idade_aparente = value;
        },
      ),
    ],
  },

  {
    id: "rosto",
    title: t.characterSheet.groups.rosto,
    fields: [
      listField(
        "formato_rosto",
        t.characterSheet.fields.formatoRosto,
        FORMATO_ROSTO,
        (sheet) => sheet.dna_visual.formato_rosto,
        (sheet, value) => {
          sheet.dna_visual.formato_rosto = value;
        },
      ),
      listField(
        "olhos.cor",
        t.characterSheet.fields.olhosCor,
        OLHOS_COR,
        (sheet) => sheet.dna_visual.olhos.cor,
        (sheet, value) => {
          sheet.dna_visual.olhos.cor = value;
        },
      ),
      listField(
        "olhos.formato",
        t.characterSheet.fields.olhosFormato,
        OLHOS_FORMATO,
        (sheet) => sheet.dna_visual.olhos.formato,
        (sheet, value) => {
          sheet.dna_visual.olhos.formato = value;
        },
      ),
      listField(
        "olhos.espacamento",
        t.characterSheet.fields.olhosEspacamento,
        OLHOS_ESPACAMENTO,
        (sheet) => sheet.dna_visual.olhos.espacamento,
        (sheet, value) => {
          sheet.dna_visual.olhos.espacamento = value;
        },
      ),
      listField(
        "sobrancelhas.formato",
        t.characterSheet.fields.sobrancelhasFormato,
        SOBRANCELHAS_FORMATO,
        (sheet) => sheet.dna_visual.sobrancelhas.formato,
        (sheet, value) => {
          sheet.dna_visual.sobrancelhas.formato = value;
        },
      ),
      listField(
        "sobrancelhas.espessura",
        t.characterSheet.fields.sobrancelhasEspessura,
        SOBRANCELHAS_ESPESSURA,
        (sheet) => sheet.dna_visual.sobrancelhas.espessura,
        (sheet, value) => {
          sheet.dna_visual.sobrancelhas.espessura = value;
        },
      ),
      listField(
        "nariz",
        t.characterSheet.fields.nariz,
        NARIZ,
        (sheet) => sheet.dna_visual.nariz,
        (sheet, value) => {
          sheet.dna_visual.nariz = value;
        },
      ),
      listField(
        "labios",
        t.characterSheet.fields.labios,
        LABIOS,
        (sheet) => sheet.dna_visual.labios,
        (sheet, value) => {
          sheet.dna_visual.labios = value;
        },
      ),
    ],
  },

  {
    id: "pele",
    title: t.characterSheet.groups.pele,
    fields: [
      {
        // The one visual picker of v1 (U4): clickable colour swatches.
        id: "pele.tom",
        label: t.characterSheet.fields.peleTom,
        kind: "swatch",
        groups: () => singleGroup(PELE_TOM),
        read: (sheet) => sheet.dna_visual.pele.tom,
        write: (sheet, value) => {
          sheet.dna_visual.pele.tom = value;
        },
      },
      listField(
        "pele.subtom",
        t.characterSheet.fields.peleSubtom,
        PELE_SUBTOM,
        (sheet) => sheet.dna_visual.pele.subtom,
        (sheet, value) => {
          sheet.dna_visual.pele.subtom = value;
        },
      ),
      listField(
        "pele.sardas",
        t.characterSheet.fields.peleSardas,
        PELE_SARDAS,
        (sheet) => sheet.dna_visual.pele.sardas,
        (sheet, value) => {
          sheet.dna_visual.pele.sardas = value;
        },
      ),
    ],
  },

  {
    id: "cabelo",
    title: t.characterSheet.groups.cabelo,
    fields: [
      listField(
        "cabelo.cor",
        t.characterSheet.fields.cabeloCor,
        CABELO_COR,
        (sheet) => sheet.dna_visual.cabelo.cor,
        (sheet, value) => {
          sheet.dna_visual.cabelo.cor = value;
        },
      ),
      listField(
        "cabelo.textura",
        t.characterSheet.fields.cabeloTextura,
        CABELO_TEXTURA,
        (sheet) => sheet.dna_visual.cabelo.textura,
        (sheet, value) => {
          sheet.dna_visual.cabelo.textura = value;
        },
      ),
      listField(
        "cabelo.comprimento",
        t.characterSheet.fields.cabeloComprimento,
        CABELO_COMPRIMENTO,
        (sheet) => sheet.dna_visual.cabelo.comprimento,
        (sheet, value) => {
          sheet.dna_visual.cabelo.comprimento = value;
        },
      ),
      listField(
        "cabelo.reparticao",
        t.characterSheet.fields.cabeloReparticao,
        CABELO_REPARTICAO,
        (sheet) => sheet.dna_visual.cabelo.reparticao,
        (sheet, value) => {
          sheet.dna_visual.cabelo.reparticao = value;
        },
      ),
      listField(
        "cabelo.franja",
        t.characterSheet.fields.cabeloFranja,
        CABELO_FRANJA,
        (sheet) => sheet.dna_visual.cabelo.franja,
        (sheet, value) => {
          sheet.dna_visual.cabelo.franja = value;
        },
      ),
      listField(
        "cabelo.acabamento",
        t.characterSheet.fields.cabeloAcabamento,
        CABELO_ACABAMENTO,
        (sheet) => sheet.dna_visual.cabelo.acabamento,
        (sheet, value) => {
          sheet.dna_visual.cabelo.acabamento = value;
        },
      ),
    ],
  },

  {
    id: "corpo",
    title: t.characterSheet.groups.corpo,
    fields: [
      {
        id: "corpo.altura_cm",
        label: t.characterSheet.fields.corpoAltura,
        kind: "number",
        groups: () => [],
        min: ALTURA_CM_MIN,
        max: ALTURA_CM_MAX,
        suffix: t.characterSheet.fields.alturaSuffix,
        placeholder: t.characterSheet.fields.alturaPlaceholder,
        read: (sheet) => sheet.dna_visual.corpo.altura_cm,
        write: (sheet, value) => {
          sheet.dna_visual.corpo.altura_cm = value;
        },
      },
      {
        id: "corpo.silhueta",
        label: t.characterSheet.fields.corpoSilhueta,
        kind: "list",
        // The only field whose options depend on another field.
        groups: (sheet) => silhuetaGroupsFor(sheet.dna_visual.genero_apresentacao.valor),
        read: (sheet) => sheet.dna_visual.corpo.silhueta,
        write: (sheet, value) => {
          sheet.dna_visual.corpo.silhueta = value;
        },
      },
    ],
  },

  {
    id: "proporcoes",
    title: t.characterSheet.groups.proporcoes,
    fields: [
      listField(
        "corpo.proporcoes.busto",
        t.characterSheet.fields.proporcoesBusto,
        PROPORCOES_BUSTO,
        (sheet) => sheet.dna_visual.corpo.proporcoes.busto,
        (sheet, value) => {
          sheet.dna_visual.corpo.proporcoes.busto = value;
        },
      ),
      listField(
        "corpo.proporcoes.cintura",
        t.characterSheet.fields.proporcoesCintura,
        PROPORCOES_CINTURA,
        (sheet) => sheet.dna_visual.corpo.proporcoes.cintura,
        (sheet, value) => {
          sheet.dna_visual.corpo.proporcoes.cintura = value;
        },
      ),
      listField(
        "corpo.proporcoes.quadril",
        t.characterSheet.fields.proporcoesQuadril,
        PROPORCOES_QUADRIL,
        (sheet) => sheet.dna_visual.corpo.proporcoes.quadril,
        (sheet, value) => {
          sheet.dna_visual.corpo.proporcoes.quadril = value;
        },
      ),
    ],
  },
];

/** Every DNA field, flat — used by the pending-field counter and its navigation. */
export const DNA_FIELDS: readonly DnaField[] = DNA_GROUPS.flatMap((group) => group.fields);

// ---------------------------------------------------------------------------
// Layer 2 — the defaults. No state envelope: extraction never fills these in.
// ---------------------------------------------------------------------------

export type PadraoField = {
  readonly id: string;
  readonly label: string;
  readonly groups: (sheet: CharacterSheet) => readonly OptionGroup[];
  readonly read: (sheet: CharacterSheet) => PlainChoice;
  readonly write: (sheet: CharacterSheet, value: PlainChoice) => void;
};

function padraoField(
  id: string,
  label: string,
  options: readonly SheetOption[],
  read: (sheet: CharacterSheet) => PlainChoice,
  write: (sheet: CharacterSheet, value: PlainChoice) => void,
): PadraoField {
  return { id, label, groups: () => singleGroup(options), read, write };
}

export const PADRAO_FIELDS: readonly PadraoField[] = [
  padraoField(
    "expressao",
    t.characterSheet.fields.expressao,
    EXPRESSAO,
    (sheet) => sheet.padroes_variaveis.expressao,
    (sheet, value) => {
      sheet.padroes_variaveis.expressao = value;
    },
  ),
  padraoField(
    "pose",
    t.characterSheet.fields.pose,
    POSE,
    (sheet) => sheet.padroes_variaveis.pose,
    (sheet, value) => {
      sheet.padroes_variaveis.pose = value;
    },
  ),
  padraoField(
    "traje_canonico",
    t.characterSheet.fields.trajeCanonico,
    TRAJE_CANONICO,
    (sheet) => sheet.padroes_variaveis.traje_canonico,
    (sheet, value) => {
      sheet.padroes_variaveis.traje_canonico = value;
    },
  ),
  padraoField(
    "fundo_canonico",
    t.characterSheet.fields.fundoCanonico,
    FUNDO_CANONICO,
    (sheet) => sheet.padroes_variaveis.fundo_canonico,
    (sheet, value) => {
      sheet.padroes_variaveis.fundo_canonico = value;
    },
  ),
  padraoField(
    "iluminacao",
    t.characterSheet.fields.iluminacao,
    ILUMINACAO,
    (sheet) => sheet.padroes_variaveis.iluminacao,
    (sheet, value) => {
      sheet.padroes_variaveis.iluminacao = value;
    },
  ),
  padraoField(
    "enquadramento",
    t.characterSheet.fields.enquadramento,
    ENQUADRAMENTO,
    (sheet) => sheet.padroes_variaveis.enquadramento,
    (sheet, value) => {
      sheet.padroes_variaveis.enquadramento = value;
    },
  ),
];
