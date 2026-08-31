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
  /**
   * Quantas recusas seguidas do **mesmo texto**, contando a última.
   *
   * É o que faz o gesto escalar: uma recusa do filtro é ruído e pede *repita*;
   * três do mesmo texto param de ser ruído e passam a ser sinal — e aí o gesto
   * certo muda para *reescreva*. Sem esta contagem a tela mandaria repetir para
   * sempre, que é a mesma inutilidade de "recusada" com outra roupa.
   *
   * Do **mesmo texto** e não da mesma cena: um ↻ com instrução é outro texto, e
   * a contagem recomeça — como tem de recomeçar, porque a pessoa mudou o que
   * pediu.
   */
  recusasSeguidas: number;
  video: SceneVideoState;
  /**
   * O clipe desta cena, quando existe — Ciclo 3 · Fase 3.
   *
   * É dele que sai o primeiro quadro da cena de continuação de baixo, e é ele o
   * lado direito da comparação da D7 na cena de baixo: trocar o clipe daqui faz
   * o quadro de partida de lá envelhecer **sozinho**, sem propagação escrita.
   */
  videoAssetId: string | null;
  /**
   * De qual imagem o clipe partiu — `generations.params.source_asset_id`.
   *
   * Numa cena de **corte** é a imagem aprovada de então; numa de **continuação**
   * é o quadro derivado do clipe anterior. É o lado esquerdo da comparação da D7,
   * e a razão de a regra não custar coluna nenhuma: o dado já estava gravado.
   */
  videoFonteAssetId: string | null;
  /**
   * De qual **clipe** veio esse quadro — `assets.derived_from_asset_id` da fonte.
   *
   * Só existe em cena de continuação, e é o dividendo da coluna de linhagem de
   * 15/08 sendo cobrado três ciclos depois: o quadro carrega o clipe de origem,
   * então a cena de baixo sabe sozinha que partiu de um vídeo que já não é o de
   * hoje. Nulo em cena de corte, onde a fonte é uma imagem e não deriva de nada.
   */
  videoFonteClipeId: string | null;
  /** O que o provedor disse quando o vídeo falhou. */
  videoErro: string | null;
  /**
   * A geração do vídeo vivo, e há quanto tempo ela está em voo.
   *
   * Existem para o mesmo botão que o bloco Gerar Vídeo já tem: um webhook que não
   * chega deixaria a cadeia esperando um clipe que nunca vai ficar pronto — e
   * aqui isso não trava um node, trava as cenas **de baixo**.
   */
  videoGeracaoId: string | null;
  videoIdadeSegundos: number | null;
  /**
   * A imagem aprovada de hoje, pelo id.
   *
   * O outro lado da comparação da D7 numa cena de corte, e a razão de ela viajar
   * separada de `thumbUrl`: a URL assinada muda a cada leitura, o id não. Comparar
   * URLs acusaria mudança a cada hora.
   */
  imagemAprovadaAssetId: string | null;
  /** A cena que esta emenda, quando é continuação. */
  emendaDe: number | null;
  /**
   * A miniatura do **quadro de partida** de uma emenda — a D4, segunda linha.
   *
   * A D4 fixou a coluna de uma cena `⇥` em dois momentos: *antes do vídeo*,
   * "continua da cena N"; *depois do vídeo*, **o quadro derivado do elo, que é o
   * primeiro quadro de verdade dela**. A Fase 3 entregou só o primeiro, e o
   * segundo é este campo.
   *
   * Nada é gerado e nada é cobrado: o asset já existe desde o despacho, extraído
   * do clipe anterior por `garantirQuadroDerivado`. O que faltava era assiná-lo
   * junto com as outras miniaturas e deixá-lo chegar à tela.
   *
   * Separado de `thumbUrl` de propósito. `thumbUrl` é "a imagem aprovada desta
   * cena", e uma emenda não tem imagem aprovada — nem deve passar a parecer que
   * tem. São duas coisas diferentes, e a coluna as desenha diferente.
   */
  quadroDePartidaUrl: string | null;
  /**
   * A ficha mudou depois de a imagem aprovada ter sido gerada?
   *
   * **Anotação, e não estado.** Uma cena aprovada e desatualizada continua
   * aprovada: a imagem que existe é boa, e o que mudou foi o plano. Fundir as
   * duas coisas num `estado` só obrigaria a escolher qual delas contar, e as
   * duas importam.
   *
   * Informativo, nunca bloqueante — quem decide se a mudança importa é quem a
   * escreveu; a tela só se recusa a fingir que não houve mudança.
   */
  desatualizada: boolean;
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
 * O formato de cada imagem, decidido pelo **canal do roteiro**.
 *
 * Não é escolha da Máquina, e essa ausência é um gesto a menos: a informação já
 * existe na ficha desde a Fase 1 do Ciclo 2, e pedir de novo o que já se sabe é
 * exatamente o que a régua deste ciclo existe para cortar.
 *
 * Os quatro primeiros canais são vídeo vertical curto — 9:16, o mesmo preset que
 * o bloco de imagem já oferece. **O Shopee é o que difere**: a vitrine dele é
 * quadrada, e um 9:16 numa grade 1:1 é cortado nas pontas pelo próprio
 * marketplace.
 *
 * *(Escolha minha ao detalhar a Fase 2 — se o Shopee também for vertical no uso
 * real, é uma linha para trocar.)*
 */
export function presetDoCanal(canal: string): string {
  return canal === "shopee" ? "quadrado" : "stories_reels_tiktok";
}

// ---------------------------------------------------------------------------
// O PORTÃO — Fase 2
// ---------------------------------------------------------------------------

/**
 * Quais cenas o lote vai gerar. **Esta lista é a fonte do número no botão.**
 *
 * Duas exclusões, e as duas custam dinheiro se erradas:
 *
 *   continuação   **não gera** (D4). O primeiro quadro dela é o último do clipe
 *                 anterior, e ele sai de graça. Contar as 6 cenas de um roteiro
 *                 com 2 emendas faria a tela pedir 450 ⚡ para gastar 300 — e o
 *                 gesto único só se sustenta se o número for confiável.
 *   já tem imagem  `pronta` e `aprovada` não voltam ao lote. Clicar de novo
 *                 depois de uma falha parcial gera **só o que faltou**, e não
 *                 paga de novo pelo que deu certo.
 *
 * `falhou` volta, e é o caso que a recusa não-determinística do provedor torna
 * comum: o lote de novo é a resposta certa para ela.
 */
export function loteDeImagens(cenas: readonly MachineScene[]): MachineScene[] {
  return cenas.filter(
    (cena) =>
      cena.transicao === "corte" && (cena.estado === "rascunho" || cena.estado === "falhou"),
  );
}

export type CustoDoLote = {
  quantas: number;
  /** Nulo enquanto o catálogo não respondeu — "ainda não sei", não "zero". */
  precoPorImagem: number | null;
  total: number | null;
};

/**
 * O total, e ele é **multiplicação do preço do catálogo** — nunca uma constante.
 *
 * `precoPorImagem` entra por parâmetro porque quem o lê é o catálogo
 * (`ai_model_image_prices`, pela qualidade e pelo modelo escolhidos), e esta
 * função não pode ter opinião sobre preço. Se a linha do catálogo mudar, o
 * número do botão muda junto **sem tocar em código** — que é a invariante 6
 * cobrada na tela.
 *
 * `null` propaga: preço desconhecido dá total desconhecido, e um total
 * desconhecido trava o botão em vez de mostrar zero. **Zero é um preço**, e
 * mostrá-lo enquanto o catálogo não respondeu seria a tela afirmando de graça.
 */
export function custoDoLote(input: {
  cenas: readonly MachineScene[];
  precoPorImagem: number | null;
}): CustoDoLote {
  const quantas = loteDeImagens(input.cenas).length;

  return {
    quantas,
    precoPorImagem: input.precoPorImagem,
    total: input.precoPorImagem === null ? null : quantas * input.precoPorImagem,
  };
}

// ---------------------------------------------------------------------------
// POR QUE UMA CENA NÃO SAIU — e o rótulo não pode ser um balde só
// ---------------------------------------------------------------------------

/**
 * As classes de falha que pedem **gestos diferentes**.
 *
 * ---------------------------------------------------------------------------
 * O defeito que isto conserta, medido em 28/08/2026
 * ---------------------------------------------------------------------------
 *
 * O trilho dizia "recusada" para tudo. Num lote de 4 imagens, seis falhas
 * mandaram o dono **reescrever prompt à toa** — porque "recusada" soa como
 * *"o que você escreveu não passou"*, e não era isso: o mesmo texto, **byte a
 * byte** (md5 idêntico), foi recusado e aceito minutos depois nas quatro cenas.
 *
 * Um rótulo que cobre filtro, cota e timeout no mesmo balde não é um rótulo: é
 * a tela desistindo de explicar. E o preço dele não é confusão — é trabalho
 * inútil de quem confia na frase.
 *
 * ---------------------------------------------------------------------------
 * A classificação lê o TEXTO CRU do provedor, e com fronteira de palavra
 * ---------------------------------------------------------------------------
 *
 * `\b` não é preciosismo: em 13/08 o marcador `"locked"` casou dentro de
 * **b-locked** e classificou uma recusa de conteúdo como conta travada. A tela
 * mandou avisar o administrador quando o conserto era outro. Fronteira de
 * palavra, e testes que exercitam as duas metades do par.
 */
export type FalhaClasse =
  /** O provedor RODOU e bloqueou a saída. Não determinístico — repetir resolve. */
  | "filtro"
  /** O provedor recusou a ENTRADA por ritmo/cota. Esperar é o gesto. */
  | "cota"
  /** Acabou o saldo na vez desta cena. Nada foi cobrado por ela. */
  | "saldo"
  /** Rede, tempo esgotado, provedor fora do ar. Repetir. */
  | "infra"
  /** Não classificada — e a tela diz isso em vez de inventar um gesto. */
  | "desconhecida";

const MARCADORES: readonly (readonly [FalhaClasse, RegExp])[] = [
  // Cota primeiro: ela é a mais específica e a única cujo gesto é ESPERAR.
  // Classificar cota como filtro mandaria a pessoa repetir contra uma porta
  // fechada, que é o oposto do conserto.
  ["cota", /\b429\b|\bquota\b|\brate.?limit|resource exhausted|too many requests/i],
  ["saldo", /insufficient.?balance|\bGN001\b|saldo insuficiente/i],
  // O filtro tem duas caras, e a segunda é SILENCIOSA: esta API bloqueia
  // devolvendo uma chamada bem-sucedida e vazia (`status=completed`, sem
  // imagem). O adaptador já a trata como recusa desde 09/08; aqui ela precisa
  // ser reconhecida pelo texto, senão a cara silenciosa cai em "desconhecida".
  ["filtro", /\bsafety\b|\bblocked\b|\bviolation|\bpolicy\b|content filter|responsible ai|returned no image/i],
  ["infra", /\btimeout\b|timed out|ETIMEDOUT|ECONNRESET|fetch failed|\bnetwork\b|\b5\d\d\b/i],
];

/**
 * A partir de quantas recusas do mesmo texto o gesto deixa de ser "repita".
 *
 * Três, e o número tem origem: o lote de 28/08/2026 teve duas cenas recusadas
 * **duas vezes** e aceitas na terceira, com md5 idêntico. Cortar em dois
 * mandaria reescrever justamente o texto que ia passar na tentativa seguinte.
 */
export const RECUSAS_ATE_REESCREVER = 3;

/**
 * O gesto certo — e ele **escala com a contagem**, só no filtro.
 *
 * Uma recusa de filtro é ruído: o mesmo texto costuma passar depois, medido. Três
 * do mesmo texto deixam de ser ruído. Nas outras classes a contagem não muda
 * nada: cota não vira "reescreva" por insistir, e saldo muito menos.
 */
export function gestoDaFalha(classe: FalhaClasse, recusasSeguidas: number): "repetir" | "reescrever" | "esperar" | "recarregar" {
  if (classe === "cota") return "esperar";
  if (classe === "saldo") return "recarregar";
  if (classe === "filtro" && recusasSeguidas >= RECUSAS_ATE_REESCREVER) return "reescrever";

  return "repetir";
}

export function classificarFalha(erro: string | null | undefined): FalhaClasse {
  if (!erro) return "desconhecida";

  for (const [classe, padrao] of MARCADORES) {
    if (padrao.test(erro)) return classe;
  }

  return "desconhecida";
}

/**
 * A ficha de hoje ainda é a que gerou a imagem aprovada? — Ciclo 3 · D3.
 *
 * ---------------------------------------------------------------------------
 * A comparação lê SÓ A DIRETIVA, e é isso que a D3 conserta
 * ---------------------------------------------------------------------------
 *
 * `diretivaDaGeracao` vem de `prompt_compiled.structure.storyboard.diretiva_pt`
 * — o que a **ficha** compilava quando aquela imagem foi feita, recomposto no
 * servidor. A instrução de um ↻ mora num campo **separado** e não entra aqui.
 *
 * Coladas, uma cena aprovada a partir de um ↻ com instrução acenderia o selo
 * **sem a ficha ter mudado**: o texto enviado teria a instrução, a ficha de hoje
 * não, e a igualdade falharia. O selo mentiria sobre a única coisa que ele
 * existe para dizer.
 *
 * `null` — geração anterior a esta fase, sem procedência gravada — devolve
 * **false**. Não se afirma mudança sobre um registro que não sabe responder;
 * um selo que acende por ausência de dado é ruído, e ruído ensina a ignorar o
 * selo verdadeiro.
 */
export function estaDesatualizada(input: {
  diretivaAgora: string;
  diretivaDaGeracao: string | null;
}): boolean {
  if (input.diretivaDaGeracao === null) return false;

  return input.diretivaAgora.trim() !== input.diretivaDaGeracao.trim();
}

export type PortaoVeredito =
  | { pode: true; quantas: number; total: number }
  | { pode: false; motivo: "sem_cenas" }
  | { pode: false; motivo: "sem_preco" }
  | { pode: false; motivo: "sem_saldo"; faltam: number; total: number };

/**
 * O portão decide **antes de qualquer chamada**, e decide pelo lote inteiro.
 *
 * ---------------------------------------------------------------------------
 * Tudo ou nada, e a razão é de confiança e não de aritmética
 * ---------------------------------------------------------------------------
 *
 * Gerar duas e parar na terceira por falta de saldo é o pior desfecho possível:
 * a pessoa autorizou um lote, pagou parte dele, e a tela nunca prometeu isso.
 * Meia quantidade é a tela decidindo por quem clicou — a mesma doutrina que o
 * `enqueue` da fila já aplica desde 13/08.
 *
 * Então a conferência é aqui, com o total na mão, e a recusa **diz quanto
 * falta**: um "sem saldo" sem número obriga a pessoa a fazer a subtração que a
 * tela já fez.
 *
 * O servidor confere de novo na vez de cada imagem (invariante 5), e continua
 * conferindo: este portão é a recusa **barata e amigável**, não a fechadura.
 */
export function vereditoDoPortao(input: {
  cenas: readonly MachineScene[];
  precoPorImagem: number | null;
  saldo: number | null;
}): PortaoVeredito {
  const custo = custoDoLote({ cenas: input.cenas, precoPorImagem: input.precoPorImagem });

  if (custo.quantas === 0) return { pode: false, motivo: "sem_cenas" };
  if (custo.total === null) return { pode: false, motivo: "sem_preco" };

  // `null` é "a carteira ainda não chegou", e não "zero". Recusar aqui seria
  // recusar por um número que ainda não foi lido — o mesmo cuidado do bloco de
  // Roteiro com o saldo não semeado.
  if (input.saldo !== null && input.saldo < custo.total) {
    return { pode: false, motivo: "sem_saldo", faltam: custo.total - input.saldo, total: custo.total };
  }

  return { pode: true, quantas: custo.quantas, total: custo.total };
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

/**
 * **Qual das tentativas de vídeo É o vídeo desta cena** — 31/08/2026.
 *
 * Era `find(media_kind === "video")` sobre a lista em `created_at desc`, ou seja
 * **a última tentativa, fosse ela qual fosse**. A cena 1 do storyboard de teste
 * tinha 22 clipes bons e 606 linhas mortas do incidente de 29/08; como a mais
 * recente era `failed`, a cena inteira lia `falhou` e o portão comum a oferecia
 * para pagar de novo — uma cena que tinha clipe desde sempre.
 *
 * A ordem das perguntas é a mesma doutrina do `estadoDaCena`, e vai da mais
 * forte para a mais fraca:
 *
 *   viva        uma submissão em voo vence tudo: a coluna precisa dizer
 *               "gerando", e a de baixo precisa esperar por ela;
 *   boa         o último clipe que EXISTE. Uma tentativa posterior que deu
 *               errado não apaga o clipe que está lá — a mesma frase que o lado
 *               da imagem já dizia desde a Fase 1 ("repetir uma cena aprovada e
 *               a repetição falhar não desaprova o que estava aprovado");
 *   a última    só quando não há nem viva nem boa. Aí sim a cena é `falhou`, e
 *               o motivo dela é o que a coluna mostra.
 *
 * **Exige a lista em `created_at desc`** — é o `find` que traduz "a primeira que
 * casa" em "a mais recente que casa". A consulta de `loadMachineBoard` ordena
 * assim, e é a única que alimenta esta função.
 */
export function videoDaCena<T extends { status: string; result_asset_id: string | null }>(
  tentativasDeVideo: readonly T[],
): T | null {
  const viva = tentativasDeVideo.find(
    (linha) => linha.status === "queued" || linha.status === "running",
  );

  if (viva) return viva;

  const boa = tentativasDeVideo.find(
    (linha) => linha.status === "succeeded" && linha.result_asset_id !== null,
  );

  return boa ?? tentativasDeVideo[0] ?? null;
}
