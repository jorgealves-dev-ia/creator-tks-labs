import { type Transicao } from "@/lib/storyboard/contract";

/**
 * O estado de uma cena no trilho da Máquina — FRENTE STORYBOARD · CICLO 3.
 *
 * ---------------------------------------------------------------------------
 * Por que isto é um arquivo à parte de `machine-actions.ts`
 * ---------------------------------------------------------------------------
 *
 * Porque aquele é `"use server"`, e um módulo assim **só pode exportar funções
 * async** — o Next recusa o build de um Server Action file que exporte uma
 * função pura. Descoberto ao separar, e não pelo typecheck: nem o `tsc` nem o
 * ESLint enxergam essa regra, ela é do compilador.
 *
 * O acidente saiu bom. Estas duas funções são a **derivação do estado**, e o
 * ciclo inteiro depende de ela estar certa; num arquivo sem `"use server"` e sem
 * banco, ela roda fora do Next e se prova numa tabela-verdade, em vez de exigir
 * uma tela para ser conferida.
 *
 * ---------------------------------------------------------------------------
 * O estado é DERIVADO, nunca gravado
 * ---------------------------------------------------------------------------
 *
 * Não existe coluna `estado` em lugar nenhum. Um rótulo gravado pode discordar
 * do fato; aqui o estado é uma leitura de três dados que já existem — a
 * aprovação (a única DECISÃO, e por isso a única coluna), as tentativas em
 * `generations` por `scene_id`, e a `transicao` da ficha. Mesma doutrina do
 * `derived_from_asset_id` e do `cenas_no_original`: **o que identifica é o dado,
 * nunca o rótulo.**
 */

export type SceneState =
  /** Sem imagem e sem tentativa. */
  | "rascunho"
  /** Cena de continuação: não tem imagem própria (D4), emenda a anterior. */
  | "emenda"
  /** Tem imagem da última tentativa, ainda não aprovada. */
  | "pronta"
  /** Alguém disse que esta serve. */
  | "aprovada"
  /** A última tentativa falhou ou foi recusada pelo provedor. */
  | "falhou";

export type SceneVideoState = "nenhum" | "gerando" | "pronto" | "falhou";

export type MachineScene = {
  id: string;
  ordem: number;
  acao: string;
  cenario: string;
  movimento: string;
  enquadramento: string;
  personagemHandle: string | null;
  produto: string | null;
  duracaoSegundos: number;
  transicao: Transicao;
  estado: SceneState;
  /** A miniatura da imagem aprovada, ou da última que deu certo. */
  thumbUrl: string | null;
  /** Quantas vezes esta cena já foi tentada — repetições incluídas. */
  tentativas: number;
  /** O que o provedor disse na última falha, quando houve uma. */
  erro: string | null;
  video: SceneVideoState;
  /** A cena que esta emenda, quando é continuação. */
  emendaDe: number | null;
};

export type MachineBoard = {
  storyboardId: string;
  titulo: string;
  canal: string;
  formato: string;
  estilo: string;
  personagemHandle: string | null;
  cenas: MachineScene[];
};

/**
 * A ordem das perguntas é a decisão, e ela vai da mais forte para a mais fraca.
 *
 * `aprovada` vence tudo porque é a única que uma pessoa disse — e vence
 * inclusive uma falha posterior: repetir uma cena já aprovada e a repetição dar
 * errado não desaprova o que estava aprovado. A imagem boa continua lá.
 *
 * `emenda` vem antes de qualquer coisa sobre imagem porque uma cena de
 * continuação **não tem imagem própria** (D4): perguntar se ela tem seria
 * perguntar por uma coisa que o desenho decidiu não gerar.
 */
export function estadoDaCena(input: {
  continuacao: boolean;
  aprovada: boolean;
  temImagem: boolean;
  ultimaFalhou: boolean;
}): SceneState {
  if (input.aprovada) return "aprovada";
  if (input.continuacao) return "emenda";
  if (input.temImagem) return "pronta";
  if (input.ultimaFalhou) return "falhou";

  return "rascunho";
}

/**
 * O vídeo é o caso oposto ao da imagem, e a assimetria é da natureza dos motores
 * (D2): a linha nasce `queued` **antes** de a fal ser chamada, então "gerando" é
 * um fato do banco aqui — e no lado da imagem não é, porque lá a linha só nasce
 * depois de a imagem existir.
 *
 * `canceled` lê como falhou de propósito: para o trilho, o que importa é que não
 * há vídeo — quem cancelou e por quê é assunto do histórico, não da coluna.
 */
export function estadoDoVideo(status: string | null): SceneVideoState {
  if (status === "queued" || status === "running") return "gerando";
  if (status === "succeeded") return "pronto";
  if (status === "failed" || status === "canceled") return "falhou";

  return "nenhum";
}
