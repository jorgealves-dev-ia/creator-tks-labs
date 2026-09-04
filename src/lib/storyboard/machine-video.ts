import { type MachineScene } from "@/lib/storyboard/machine-state";

/**
 * O lote de vídeo, o portão dele e a cadeia — FRENTE STORYBOARD · CICLO 3 · Fase 3.
 *
 * ---------------------------------------------------------------------------
 * Por que isto é puro, e por que é UM plano em vez de seis perguntas
 * ---------------------------------------------------------------------------
 *
 * A Fase 2 provou o portão de imagem fora do React, numa tabela-verdade. Aqui a
 * exigência é maior: a imagem é um conjunto de cenas independentes, o vídeo é uma
 * **cadeia** — a 2 espera o clipe da 1, a 6 espera o da 5 —, e uma cadeia tem
 * ordens erradas que nenhuma tela revela olhando.
 *
 * Então tudo o que decide sai de **uma passada só**, em ordem, e o resultado é um
 * objeto que a tela lê e o motorista obedece. Duas leituras separadas — uma para
 * desenhar a coluna, outra para decidir o que submeter — seriam duas verdades
 * sobre a mesma cena, e a segunda envelheceria calada no dia em que alguém
 * mexesse só numa delas.
 *
 * ---------------------------------------------------------------------------
 * O preço entra por função, e é ele quem responde a D5
 * ---------------------------------------------------------------------------
 *
 * `precoDaDuracao` vem do catálogo (`ai_model_video_prices`), e este arquivo não
 * tem opinião sobre preço nenhum. O dividendo é que a **D5 deixa de ser uma regra
 * à parte**: "a duração desta cena está fora do catálogo" e "o catálogo não sabe
 * cobrar por ela" passam a ser a mesma pergunta, feita uma vez. É a regra de
 * 13/08 no seu enunciado original — *não se oferece o que não se sabe cobrar*.
 *
 * A função inteira nula é "o catálogo ainda não respondeu", e não "nada é
 * vendido": o portão trava dizendo isso, em vez de mostrar zero. **Zero é um
 * preço.**
 */

/**
 * Quantos vídeos o lote mantém vivos ao mesmo tempo.
 *
 * Quatro, o mesmo teto do bloco Gerar Vídeo, e pela mesma razão registrada lá:
 * um clipe custa 210 ⚡, então dezesseis vivos seriam mais de três mil Sparks de
 * intenção pendurada numa tela. O teto protege o ritmo e a atenção; o dinheiro
 * quem protege é o banco, que confere o saldo na vez de cada trabalho.
 */
export const TETO_DE_VIDEOS = 4;

/**
 * O que vai acontecer com uma cena neste lote — e, quando não vai, por quê.
 *
 * Os motivos não são decoração: cada um pede um **gesto diferente** de quem lê.
 * "não aprovada" se conserta aqui, com um ✓; "duração fora do catálogo" se
 * conserta no Roteiro; "cadeia parada" não se conserta nesta cena nenhuma — é a
 * de cima que precisa de um clipe. Um balde só chamado "não anima" mandaria a
 * pessoa procurar o conserto no lugar errado, que é o defeito que a Fase 2 mediu
 * e consertou no rótulo de falha.
 */
export type SituacaoDeVideo =
  | {
      anima: true;
      /** O preço desta cena, lido do catálogo. */
      sparks: number;
      /**
       * A cena cujo último quadro vira o primeiro desta — nulo em cena de corte,
       * que parte da própria imagem aprovada.
       */
      quadroDe: MachineScene | null;
      /**
       * Nulo quando ela pode partir **agora**; senão, a ordem da cena cujo clipe
       * ela espera. É este campo, e só ele, que faz a 2 esperar a 1.
       */
      esperaDe: number | null;
    }
  /** O catálogo ainda não respondeu. Não é "não vende" — é "ainda não sei". */
  | { anima: false; motivo: "sem_catalogo" }
  /** D5: o catálogo não precifica esta duração. Conserta-se no Roteiro. */
  | { anima: false; motivo: "duracao_fora_do_catalogo"; duracao: number }
  /** Já está em voo. Pedir de novo seria pagar duas vezes pelo mesmo clipe. */
  | { anima: false; motivo: "gerando" }
  /** Já tem clipe. Refazer é o gesto do ↻, e é deliberado — nunca do lote. */
  | { anima: false; motivo: "ja_tem_video" }
  /**
   * **R2.4 — há um lote em curso, e esta cena não faz parte dele.** 31/08/2026.
   *
   * Nasceu do clique de campo: com a cena 1 lendo `falhou` (candidata do lote
   * comum) e a cena 5 marcada para refazer, o botão **Reanimar** despachou a
   * **cena 1**. O teto segurou — uma submissão, como prometido —, mas a mira
   * errou: o clique autorizou uma cena e o motorista animou outra.
   *
   * A causa é que a autorização e o despacho eram **duas listas diferentes**:
   * `loteAlvo` guardava o que o clique pagou, e o motorista despachava de
   * `plano.lote`, que é "toda cena que deveria animar". Enquanto as duas
   * coincidiam ninguém via; num lote de reanimação elas divergem por desenho.
   *
   * Por que a pergunta mora **aqui** e não no motorista: a tela lê o mesmo
   * `situacao` que o motorista obedece, e é isso que impede a tela e a máquina
   * de discordarem sobre a mesma cena. Filtrar só no despacho consertaria o
   * dinheiro e deixaria a tela dizendo "entra no lote" para uma cena que este
   * lote não vai animar.
   */
  | { anima: false; motivo: "fora_do_lote" }
  /**
   * Já falhou **neste lote**, e o lote não repete sozinho.
   *
   * Achado pela simulação da Fase 3, e é o defeito que ela existia para achar:
   * sem esta pergunta, uma cena que falha volta ao lote no tick seguinte, é
   * submetida de novo pelo motorista, falha de novo — e o produto fica batendo
   * no provedor para sempre. Falha não cobra, então o laço não aparecia no
   * saldo: apareceria no log do fornecedor, dias depois.
   *
   * `falhou` **volta** ao lote no clique seguinte, e isso continua valendo — a
   * recusa não é determinística e repetir é o gesto certo. O que não pode é
   * repetir **sem ninguém pedir**.
   */
  | { anima: false; motivo: "falhou_no_lote" }
  /** Cena de corte sem imagem aprovada. Vídeo só de cena aprovada, sem exceção. */
  | { anima: false; motivo: "nao_aprovada" }
  /** Emenda cuja cena de origem na cadeia não foi aprovada. */
  | { anima: false; motivo: "cadeia_sem_aprovacao"; raiz: number }
  /**
   * A cena de cima não vai ter clipe neste lote — falhou, não foi aprovada, ou
   * a duração dela está fora do catálogo. A emenda não tem de onde partir, e
   * dizer "esperando" seria prometer uma espera que não termina.
   */
  | { anima: false; motivo: "cadeia_parada"; de: number };

export type LinhaDoPlano = {
  cena: MachineScene;
  /** A cena imediatamente anterior, quando esta é continuação. */
  emendaDe: MachineScene | null;
  situacao: SituacaoDeVideo;
  /** O clipe que existe partiu de outra imagem? — D7, por comparação de dado. */
  desatualizado: boolean;
};

export type PlanoDeVideo = {
  /** Todas as cenas, na ordem — a tela desenha a partir daqui. */
  linhas: LinhaDoPlano[];
  /** As que o portão vai pagar, na ordem. */
  lote: LinhaDoPlano[];
  /** Quantas do lote são cenas de corte (aprovadas, por definição). */
  aprovadas: number;
  /** Quantas do lote são emendas. */
  emendas: number;
  /**
   * Não-nulo só quando **todas** as cenas do lote custam o mesmo.
   *
   * A tela promete "6 × 210 = 1.260", e essa multiplicação só é verdade enquanto
   * o catálogo vende uma duração. No dia em que vender duas, um lote misto teria
   * soma e não produto — e mostrar um produto ali seria a tela inventando um
   * número que ninguém vai cobrar. Nulo faz a tela mostrar só o total.
   */
  precoUniforme: number | null;
  /** A soma de verdade, sempre. */
  total: number;
  /**
   * Quantas do lote podem partir **já**, e não daqui a um clipe.
   *
   * Existe porque o portão contava só o total, e o dono leu a diferença na tela
   * em 28/08/2026: "Animar as 2" com a cena 6 dizendo "espera o clipe da 5" são
   * duas frases verdadeiras que juntas parecem uma contradição. O número do
   * botão continua sendo o **dinheiro** — o que o lote inteiro vai custar —, e
   * a linha de baixo passa a dizer o **tempo**.
   */
  partemAgora: number;
  /** As que já têm clipe, e cujo clipe partiu de outra imagem — D7. */
  reanimar: LinhaDoPlano[];
  totalReanimar: number;
};

/**
 * A cena de corte que dá origem a esta — ela mesma, se for corte.
 *
 * Uma emenda não tem imagem própria (D4), então a aprovação dela **é** a da cena
 * de corte de onde a cadeia parte: 1 corte, 2 emenda, 3 emenda → as três vivem da
 * aprovação da 1. Subir até o primeiro corte é a leitura exata dessa herança.
 */
export function raizDaCadeia(
  cenas: readonly MachineScene[],
  indice: number,
): MachineScene | null {
  for (let i = indice; i >= 0; i -= 1) {
    const cena = cenas[i];

    if (!cena) return null;
    if (cena.transicao === "corte") return cena;
  }

  return null;
}

/**
 * A ÚNICA passada — e a ordem das perguntas é a decisão.
 *
 * Ela vai do impossível ao pendente, e não o contrário, porque a frase que sobra
 * na tela é a **primeira** que casa:
 *
 *   1. catálogo mudo        nada se afirma sobre preço que ainda não chegou
 *   2. duração fora (D5)    é impossibilidade, não pendência: mandar aprovar uma
 *                           cena para depois dizer que ela nunca animaria é a
 *                           pior ordem possível de duas frases verdadeiras
 *   3. em voo / já tem      o lote nunca repaga o que existe ou está a caminho
 *   4. aprovação            o gesto é aqui, com um ✓
 *   5. cadeia               o gesto é na cena de cima, ou em lugar nenhum
 *
 * A cena com vídeo `falhou` **volta** ao lote, e é o caso comum: a recusa do
 * provedor não é determinística (medido em 26/08 e de novo em 28/08).
 */
export function planoDeVideo(input: {
  cenas: readonly MachineScene[];
  /** Do catálogo. A função inteira nula = o catálogo ainda não respondeu. */
  precoDaDuracao: ((segundos: number) => number | null) | null;
  /**
   * As cenas que o dono mandou **refazer** — elas voltam ao lote mesmo tendo
   * clipe (D7). Vazio no lote comum.
   *
   * Reanimar é o mesmo mecanismo, e é de propósito: a cadeia vem de graça. Uma
   * emenda cuja cena de cima está sendo reanimada **espera o clipe novo**, sem
   * uma linha de código a mais — porque a regra de espera não olha para o clipe
   * que existe, olha para quem vai produzir um neste lote.
   */
  reanimando?: ReadonlySet<string>;
  /**
   * As cenas que **este lote em curso** já submeteu.
   *
   * Vazio quando não há lote rodando — e é por isso que o portão parado volta a
   * oferecer a cena que falhou, enquanto o motorista em curso não a repete.
   */
  jaTentadas?: ReadonlySet<string>;
  /**
   * As cenas que o dono marcou para REFAZER **estando em dia** — a outra metade
   * da D7, 29/08/2026.
   *
   * A decisão diz que "o ↻ existe em todo estágio, imagem e vídeo, e cada um é
   * uma geração normal — uma cena nunca fica trancada, nem depois de virar
   * vídeo". A Fase 3 entregou só o caso em que a cena **envelheceu sozinha**
   * (`desatualizado`), e nesse recorte um clipe em dia ficava trancado para
   * sempre: não havia gesto nenhum para pedir outro.
   *
   * Elas entram na MESMA lista que as desatualizadas, e por isso não abrem
   * caminho de submissão nenhum: quem gasta continua sendo o portão, uma vez,
   * com a soma na tela antes do clique (invariante 12).
   */
  marcadas?: ReadonlySet<string>;
  /**
   * **As cenas que o clique autorizou** — R2.4, 31/08/2026.
   *
   * `undefined` significa "nenhum lote em curso": o plano volta a ser a lista de
   * candidatas, que é o que o portão precisa oferecer. Com um lote em curso, ela
   * é a lista **fechada** do que aquele clique pagou, e nada fora dela anima.
   *
   * É a última linha de defesa da *mira*, como o `tamanhoDoLote` é a do
   * *volume*: as duas são deliberadamente burras — uma subtração e uma pergunta
   * de pertencimento —, e é isso que as torna confiáveis quando o resto falhar.
   */
  autorizadas?: ReadonlySet<string>;
}): PlanoDeVideo {
  const linhas: LinhaDoPlano[] = [];
  /** Esta cena terá clipe ao fim do lote? — a resposta de que a de baixo vive. */
  const teraClipe: boolean[] = [];
  let anteriorNoLote = false;
  let anteriorDesatualizado = false;

  input.cenas.forEach((cena, indice) => {
    const anterior = indice > 0 ? (input.cenas[indice - 1] ?? null) : null;
    const emendaDe = cena.transicao === "continuacao" ? anterior : null;
    const situacao = situacaoDaCena({
      cenas: input.cenas,
      indice,
      emendaDe,
      anteriorTeraClipe: indice > 0 ? (teraClipe[indice - 1] ?? false) : false,
      anteriorNoLote,
      precoDaDuracao: input.precoDaDuracao,
      reanimando: input.reanimando,
      jaTentadas: input.jaTentadas,
      autorizadas: input.autorizadas,
    });

    // -----------------------------------------------------------------------
    // D7, e ela tem DUAS METADES — a segunda existe porque a primeira não
    // alcança a cadeia inteira
    //
    //   por dado      o clipe partiu de outra imagem (corte) ou de um quadro de
    //                 outro clipe (emenda). É certeza, e é o mecanismo que a
    //                 decisão descreve: a cena de baixo acende SOZINHA.
    //   herdado       ...mas só a de baixo IMEDIATA. Numa cadeia 1→2→3, trocar o
    //                 clipe da 1 muda o quadro da 2 e **não** muda o da 3 — o
    //                 quadro da 3 continua vindo do clipe da 2, que ainda é o
    //                 mesmo. A decisão, porém, diz "e as cenas ⇥ abaixo dela,
    //                 até o primeiro corte", e ela está certa no nível que
    //                 importa: a 3 continua um trecho que ficou velho.
    //
    // Então a transitividade é escrita, e escrita aqui, onde a passada já vai em
    // ordem. Ela para sozinha no primeiro corte, porque só continuação herda.
    // -----------------------------------------------------------------------
    const desatualizado =
      videoDesatualizado({ cena, emendaDe }) ||
      (cena.transicao === "continuacao" && anteriorDesatualizado && cena.videoAssetId !== null);

    linhas.push({ cena, emendaDe, situacao, desatualizado });

    // Um clipe vai existir aqui se já existe, se está a caminho, ou se este lote
    // vai pagá-lo. As três respondem a mesma pergunta para a cena de baixo.
    teraClipe.push(
      cena.video === "pronto" || cena.video === "gerando" || situacao.anima === true,
    );
    anteriorNoLote = situacao.anima === true;
    anteriorDesatualizado = desatualizado;
  });

  const lote = linhas.filter((linha) => linha.situacao.anima);
  const precos = lote.map((linha) => (linha.situacao.anima ? linha.situacao.sparks : 0));
  const total = precos.reduce((soma, preco) => soma + preco, 0);
  const uniforme = precos.length > 0 && precos.every((preco) => preco === precos[0]);

  const reanimar = linhas.filter(
    (linha) =>
      // Envelheceu sozinha (D7, primeira metade) ou o dono pediu (segunda).
      // A marcação exige clipe: sem ele a cena já está no lote comum, e
      // oferecê-la duas vezes seria cobrar duas frases pela mesma coisa.
      (linha.desatualizado ||
        (linha.cena.videoAssetId !== null && (input.marcadas?.has(linha.cena.id) ?? false))) &&
      precoDe(linha.cena, input.precoDaDuracao) !== null,
  );

  return {
    linhas,
    lote,
    aprovadas: lote.filter((linha) => linha.cena.transicao === "corte").length,
    emendas: lote.filter((linha) => linha.cena.transicao === "continuacao").length,
    precoUniforme: uniforme ? (precos[0] ?? null) : null,
    total,
    partemAgora: lote.filter(
      (linha) => linha.situacao.anima && linha.situacao.esperaDe === null,
    ).length,
    reanimar,
    totalReanimar: reanimar.reduce(
      (soma, linha) => soma + (precoDe(linha.cena, input.precoDaDuracao) ?? 0),
      0,
    ),
  };
}

function precoDe(
  cena: MachineScene,
  precoDaDuracao: ((segundos: number) => number | null) | null,
): number | null {
  return precoDaDuracao === null ? null : precoDaDuracao(cena.duracaoSegundos);
}

function situacaoDaCena(input: {
  cenas: readonly MachineScene[];
  indice: number;
  emendaDe: MachineScene | null;
  anteriorTeraClipe: boolean;
  /** A cena de cima vai produzir um clipe NOVO neste lote? */
  anteriorNoLote: boolean;
  precoDaDuracao: ((segundos: number) => number | null) | null;
  reanimando: ReadonlySet<string> | undefined;
  jaTentadas: ReadonlySet<string> | undefined;
  /** O lote em curso, quando há um. R2.4 — ver `motivo: "fora_do_lote"`. */
  autorizadas: ReadonlySet<string> | undefined;
}): SituacaoDeVideo {
  const cena = input.cenas[input.indice];

  if (!cena) return { anima: false, motivo: "sem_catalogo" };
  if (input.precoDaDuracao === null) return { anima: false, motivo: "sem_catalogo" };

  const sparks = input.precoDaDuracao(cena.duracaoSegundos);

  if (sparks === null) {
    return {
      anima: false,
      motivo: "duracao_fora_do_catalogo",
      duracao: cena.duracaoSegundos,
    };
  }

  if (cena.video === "gerando") return { anima: false, motivo: "gerando" };

  // ── R2.4 · O LOTE SÓ CONTÉM O QUE O CLIQUE AUTORIZOU ──────────────────
  //
  // Depois de `gerando` de propósito: uma cena em voo é uma cena em voo, e a
  // frase da tela precisa dizer isso, esteja ela neste lote ou não.
  //
  // Antes de tudo o mais porque nenhuma das perguntas abaixo importa para uma
  // cena que este clique não pagou. O clique de campo de 31/08 provou o custo
  // de não ter esta linha: «Reanimar 1 cena» animou a cena que estava no lote
  // comum, e a cena marcada continuou com o clipe velho.
  if (input.autorizadas && !input.autorizadas.has(cena.id)) {
    return { anima: false, motivo: "fora_do_lote" };
  }

  // Já tentou nesta rodada e não produziu clipe: o lote não repete sozinho.
  //
  // A pergunta é "já tentei?" e não "falhou?" de propósito: uma submissão
  // RECUSADA (saldo que acabou na vez dela, provedor fora do ar) deixa a cena
  // como `nenhum`, e perguntar pela falha do clipe a devolveria ao lote no tick
  // seguinte — o mesmo laço infinito, entrando por outra porta.
  //
  // E dizer isto AQUI, e não no motorista, é o que faz a emenda de baixo herdar
  // a verdade: sem isto ela ficaria "esperando" um clipe que este lote já
  // decidiu não produzir.
  // ── R2.1 · UMA SUBMISSÃO POR CENA POR CLIQUE ──────────────────────────
  //
  // A condição era `cena.video !== "pronto" && jaTentadas.has(id)`, e o
  // `!== "pronto"` custou US$ 21,56 em 29/08/2026: uma cena REANIMADA já tem
  // clipe, então ela nunca satisfazia a condição, escapava desta guarda, era
  // liberada pela de baixo (está em `reanimando`) e voltava ao lote a cada
  // passada do efeito. Um clique de 210 ⚡ virou 626 submissões.
  //
  // Agora a pergunta é só "já tentei nesta rodada?", e ela vale seja qual for o
  // estado do vídeo. O MOTIVO é que muda conforme o estado, porque a frase da
  // tela precisa dizer a verdade daquela cena — mas nenhuma delas volta ao lote.
  //
  // Prova reexecutável: `scratchpad/storyboard-c3/motorista-teto.ts`.
  if (input.jaTentadas?.has(cena.id)) {
    return {
      anima: false,
      motivo: cena.video === "pronto" ? "ja_tem_video" : "falhou_no_lote",
    };
  }

  // Ter clipe tira a cena do lote — a não ser que o dono tenha mandado refazer.
  // Reanimar não é o lote encontrando trabalho sozinho: é uma pessoa clicando.
  if (cena.video === "pronto" && !input.reanimando?.has(cena.id)) {
    return { anima: false, motivo: "ja_tem_video" };
  }

  const raiz = raizDaCadeia(input.cenas, input.indice);

  if (raiz?.estado !== "aprovada") {
    return cena.transicao === "corte"
      ? { anima: false, motivo: "nao_aprovada" }
      : { anima: false, motivo: "cadeia_sem_aprovacao", raiz: raiz?.ordem ?? cena.ordem };
  }

  if (cena.transicao === "corte") return { anima: true, sparks, quadroDe: null, esperaDe: null };

  // Emenda sem cena de cima é impossível pelo banco
  // (`storyboard_scenes_primeira_nao_continua`), e mesmo assim é tratada: uma
  // continuação sem origem não tem de onde partir, e é isso que a frase diz.
  if (!input.emendaDe) return { anima: false, motivo: "cadeia_parada", de: cena.ordem - 1 };

  if (!input.anteriorTeraClipe) {
    return { anima: false, motivo: "cadeia_parada", de: input.emendaDe.ordem };
  }

  // A espera não olha para o clipe que EXISTE, olha para quem vai produzir um
  // neste lote. A diferença só aparece na reanimação — e é exatamente onde ela
  // vale dinheiro: com a cena de cima sendo refeita, um clipe pronto ali é o
  // VELHO, e partir dele produziria uma emenda que já nasce desatualizada.
  const clipePronto =
    input.emendaDe.video === "pronto" &&
    input.emendaDe.videoAssetId !== null &&
    !input.anteriorNoLote;

  return {
    anima: true,
    sparks,
    quadroDe: input.emendaDe,
    esperaDe: clipePronto ? null : input.emendaDe.ordem,
  };
}

// ---------------------------------------------------------------------------
// O PORTÃO — a mesma doutrina do de imagem, com a contagem que o dono pediu
// ---------------------------------------------------------------------------

export type PortaoVideoVeredito =
  | { pode: true; quantas: number; aprovadas: number; emendas: number; total: number }
  | { pode: false; motivo: "sem_cenas" }
  | { pode: false; motivo: "sem_preco" }
  | { pode: false; motivo: "sem_saldo"; faltam: number; total: number };

/**
 * Tudo ou nada, e a razão continua sendo de confiança e não de aritmética.
 *
 * Animar quatro e parar na quinta por falta de saldo é o pior desfecho: a pessoa
 * autorizou um lote e pagou parte dele. Pior que na imagem, aliás — no vídeo as
 * cenas que ficariam de fora são justamente as **emendas**, então meio lote é
 * literalmente um filme cortado no meio.
 *
 * O servidor confere de novo na vez de cada clipe (invariante 5). Este portão é a
 * recusa barata e amigável, nunca a fechadura.
 */
export function vereditoDoPortaoVideo(input: {
  plano: PlanoDeVideo;
  saldo: number | null;
  catalogoPronto: boolean;
}): PortaoVideoVeredito {
  const { plano } = input;

  if (!input.catalogoPronto) return { pode: false, motivo: "sem_preco" };
  if (plano.lote.length === 0) return { pode: false, motivo: "sem_cenas" };

  // `null` é "a carteira ainda não chegou", e não "zero" — o mesmo cuidado do
  // portão de imagem, e do bloco de Roteiro antes dele.
  if (input.saldo !== null && input.saldo < plano.total) {
    return {
      pode: false,
      motivo: "sem_saldo",
      faltam: plano.total - input.saldo,
      total: plano.total,
    };
  }

  return {
    pode: true,
    quantas: plano.lote.length,
    aprovadas: plano.aprovadas,
    emendas: plano.emendas,
    total: plano.total,
  };
}

// ---------------------------------------------------------------------------
// A CADEIA — quem parte agora
// ---------------------------------------------------------------------------

export type Partida = {
  cena: MachineScene;
  /**
   * A cena cujo último quadro vira o primeiro desta — nulo em corte, que parte
   * da própria imagem aprovada.
   */
  quadroDe: MachineScene | null;
  sparks: number;
};

/**
 * As que podem partir **agora**, respeitando o teto.
 *
 * Cortes partem juntas, porque nenhuma depende de nada; emendas entram uma a uma,
 * conforme o clipe de cima aparece. O corte no teto é `slice` e não sorteio: a
 * ordem do roteiro é a ordem da fila, e uma cena que espera por vaga espera atrás
 * de quem vem antes dela na história.
 */
export function proximasAAnimar(input: {
  plano: PlanoDeVideo;
  /** Quantos trabalhos deste bloco estão vivos agora. */
  emVoo: number;
  teto?: number;
  /**
   * R2.2 — **quantas submissões este lote já produziu**, e o tamanho dele.
   *
   * O teto de concorrência (4) limita quantas correm JUNTAS; ele nunca limitou
   * quantas saem NO TOTAL. Em 29/08/2026 as duas coisas foram confundidas: com
   * 4 vagas sempre livres, um lote de uma cena produziu 626 submissões sem
   * estourar teto nenhum.
   *
   * Este é o limite absoluto: **um lote de N nunca produz mais de N**. Ele não
   * depende de estado do banco, de janela de rede nem de ordem de efeito — é
   * uma subtração, e é a última linha de defesa quando todo o resto falhar.
   */
  jaSubmetidas?: number;
  tamanhoDoLote?: number;
}): Partida[] {
  const restamNoLote =
    input.tamanhoDoLote === undefined
      ? Number.POSITIVE_INFINITY
      : Math.max(0, input.tamanhoDoLote - (input.jaSubmetidas ?? 0));

  if (restamNoLote === 0) return [];

  const vagas = Math.min(
    restamNoLote,
    Math.max(0, (input.teto ?? TETO_DE_VIDEOS) - input.emVoo),
  );

  if (vagas === 0) return [];

  const prontas: Partida[] = [];

  for (const linha of input.plano.lote) {
    if (!linha.situacao.anima || linha.situacao.esperaDe !== null) continue;

    prontas.push({
      cena: linha.cena,
      quadroDe: linha.situacao.quadroDe,
      sparks: linha.situacao.sparks,
    });

    if (prontas.length === vagas) break;
  }

  return prontas;
}

// ---------------------------------------------------------------------------
// D7 — o vídeo desatualizado, por comparação de DADO
// ---------------------------------------------------------------------------

/**
 * O clipe que existe partiu da imagem que vale hoje?
 *
 * ---------------------------------------------------------------------------
 * Duas comparações, e a segunda é a cadeia saindo da forma do dado
 * ---------------------------------------------------------------------------
 *
 *   corte        o clipe guarda `params.source_asset_id` — a imagem de que ele
 *                partiu. Se ela não é a `imagem_aprovada_asset_id` de agora,
 *                alguém aprovou outra depois, e o vídeo é de antes.
 *   continuação  o clipe partiu de um **quadro derivado**, e o quadro carrega em
 *                `assets.derived_from_asset_id` o clipe de onde saiu. Se esse
 *                clipe não é o clipe atual da cena de cima, a de cima foi
 *                reanimada e este vídeo começa num quadro que já não existe mais
 *                na história.
 *
 * **Nada é propagado, nada é marcado.** A cena de baixo acende sozinha porque o
 * dado dela aponta para o vídeo velho — é o dividendo da coluna de linhagem de
 * 15/08 sendo cobrado três ciclos depois.
 *
 * `null` de qualquer lado devolve **false**, sempre: um registro que não sabe
 * responder não afirma mudança. Um selo que acende por ausência de dado é ruído,
 * e ruído ensina a ignorar o selo verdadeiro — a mesma regra do selo da ficha.
 */
export function videoDesatualizado(input: {
  cena: MachineScene;
  emendaDe: MachineScene | null;
}): boolean {
  const { cena } = input;

  // Sem clipe não há o que desatualizar. Uma cena que nunca animou não tem
  // vídeo velho: ela tem vídeo nenhum, e são coisas diferentes na tela.
  if (cena.videoAssetId === null) return false;

  if (cena.transicao === "corte") {
    if (cena.videoFonteAssetId === null || cena.imagemAprovadaAssetId === null) return false;

    return cena.videoFonteAssetId !== cena.imagemAprovadaAssetId;
  }

  if (cena.videoFonteClipeId === null) return false;

  const clipeDeCima = input.emendaDe?.videoAssetId ?? null;

  if (clipeDeCima === null) return false;

  return cena.videoFonteClipeId !== clipeDeCima;
}

// ---------------------------------------------------------------------------
// O ELO, E A CLÁUSULA DA 0.3 — desenhada para o pior caso
// ---------------------------------------------------------------------------

export type PassoDoElo = { pode: true } | { pode: false; motivo: "aba_escondida" };

/**
 * A cadeia pode ler o quadro agora? — a cláusula da 0.3, decidida em 28/08/2026.
 *
 * A Fase 0 **não** conseguiu medir se uma aba escondida trava o decodificador de
 * vídeo do navegador. O desenho então **assume que trava**, e a consequência é
 * esta função: sem aba à frente, a cadeia **para com a causa nomeada** em vez de
 * girar para sempre ou falhar em silêncio. Ela retoma sozinha quando a aba volta,
 * porque nada foi perdido — só adiado.
 *
 * **E o passo zero salva a maior parte dos casos.** Um quadro que já foi extraído
 * está no Storage, e ler uma linha do banco não passa por decodificador nenhum:
 * aba escondida não atrapalha o que não precisa decodificar. É o mesmo passo zero
 * do elo do Ciclo 1, aqui virando também a diferença entre pausar e seguir.
 *
 * Desenhar para o pior caso é o que permite a pergunta continuar aberta sem parar
 * o ciclo: se a medição mostrar que o navegador aguenta, o produto já estava
 * certo; se mostrar que trava, o produto já estava certo também.
 */
export function eloPodeLerQuadro(input: {
  quadroJaExiste: boolean;
  abaVisivel: boolean;
}): PassoDoElo {
  if (input.quadroJaExiste) return { pode: true };

  return input.abaVisivel ? { pode: true } : { pode: false, motivo: "aba_escondida" };
}

/**
 * O veredito do portão «Montar o vídeo» — o terceiro, e o único sem preço.
 *
 * Mora aqui, ao lado de `vereditoDoPortaoVideo`, e não solto no componente: a
 * regra *"desabilitado com a contagem do que falta"* é decisão de produto (a 3
 * do dono, 03/09/2026) e precisa de casa testável. Deixá-la como duas
 * expressões dentro do JSX faria a única maneira de exercitá-la ser **ter um
 * projeto no estado certo** — e no dia em que a prova foi pedida, o acervo não
 * tinha nenhum: os dois roteiros com clipe faltando não estavam ligados a
 * Máquina nenhuma.
 *
 * **Desabilitado, nunca escondido.** Um botão que some ensina que ele não
 * existe; um apagado que diz *"faltam 2 clipes"* ensina o que fazer para
 * acendê-lo.
 *
 * Zero cenas não aparece como recusa porque a banda inteira não é desenhada
 * nesse caso — a tela mostra "este roteiro ainda não tem fichas". O veredito
 * responde mesmo assim, para quem chamar de outro lugar não precisar saber
 * disso.
 */
export type VereditoDoFilme =
  | { pode: true; cenas: number }
  | { pode: false; motivo: "sem_cenas" }
  | { pode: false; motivo: "faltam_clipes"; faltam: number; total: number };

export function vereditoDoFilme(cenas: readonly MachineScene[]): VereditoDoFilme {
  if (cenas.length === 0) return { pode: false, motivo: "sem_cenas" };

  const faltam = cenas.filter((cena) => cena.videoAssetId === null).length;

  return faltam === 0
    ? { pode: true, cenas: cenas.length }
    : { pode: false, motivo: "faltam_clipes", faltam, total: cenas.length };
}
