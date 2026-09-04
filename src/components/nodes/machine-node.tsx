"use client";

import {
  getViewportForBounds,
  Handle,
  Position,
  useReactFlow,
  useStoreApi,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import { useEffect, useRef, useState, type MouseEvent } from "react";

import { useLightbox } from "@/components/nodes/lightbox";
import type { RecusaDeMontagem } from "@/lib/video/montagem";
import { NodeHeader } from "@/components/nodes/node-header";
import { useImageCatalog } from "@/components/nodes/use-image-catalog";
import { useVideoCatalog } from "@/components/nodes/use-video-catalog";
import { defaultModelId, findModel, ModelSelect } from "@/components/ui/model-select";
import { garantirQuadroDerivado } from "@/lib/assets/derive-frame";
import { BOARD_HANDLE, findGoverningBoard, sceneHandleId, useCanvasStore } from "@/lib/canvas/store";
import { useGenerationTick } from "@/lib/generation/generation-feed";
import { DEFAULT_IMAGE_SIZE } from "@/lib/generation/presets";
import { freeSlots, liveCount, useQueue } from "@/lib/generation/queue";
import {
  checkWebhookAlive,
  reconcileVideo,
  requestVideoGeneration,
} from "@/lib/generation/video-contract";
import { t } from "@/lib/i18n/pt-BR";
import { useBalance } from "@/lib/sparks/balance-store";
import { aprovarCenas, loadMachineBoard } from "@/lib/storyboard/machine-actions";
import {
  classificarFalha,
  gestoDaFalha,
  loteDeImagens,
  presetDoCanal,
  vereditoDoPortao,
  type MachineBoard,
  type MachineScene,
} from "@/lib/storyboard/machine-state";
import {
  planoDeVideo,
  proximasAAnimar,
  vereditoDoFilme,
  vereditoDoPortaoVideo,
  type LinhaDoPlano,
  type Partida,
} from "@/lib/storyboard/machine-video";
import { buildSceneMotion } from "@/lib/storyboard/scene-prompt";

const copy = t.machineNode;

/**
 * A Máquina de Storyboard — FRENTE STORYBOARD · CICLO 3.
 *
 * ---------------------------------------------------------------------------
 * Ela é MAESTRO, e o que ela rege já existia
 * ---------------------------------------------------------------------------
 *
 * Cada cena é uma geração **normal**: mesmo Route Handler, mesmo preço de
 * catálogo, mesma linha de extrato. O lote é uma **sequência de gerações
 * individuais**, nunca uma transação — é o que faz uma recusa de política ser
 * *uma cena para repetir* e não *um lote perdido*, e a recusa não-determinística
 * medida em 26/08 garante que isso vai acontecer.
 *
 * ---------------------------------------------------------------------------
 * Ela não guarda id nenhum, e não guarda ficha nenhuma
 * ---------------------------------------------------------------------------
 *
 * Qual roteiro ela rege sai da **aresta** (`findGoverningBoard`); o trilho sai do
 * **banco**, relido quando o Realtime avisa. Não existe segunda cópia para
 * discordar no instante em que isso mais custaria.
 *
 * ---------------------------------------------------------------------------
 * O portão, e o que ele promete
 * ---------------------------------------------------------------------------
 *
 * O total é **multiplicação do preço do catálogo**, na qualidade e no modelo
 * escolhidos — nunca uma constante. Ele conta **só o que vai gerar**: cenas de
 * corte sem imagem. Continuação não entra (D4), e o que já tem imagem não volta.
 *
 * E modelo e qualidade **nascem com o default do catálogo**, como o bloco Gerar
 * Imagem: é o que mantém o portão em **um** gesto. Um seletor vazio custaria dois
 * gestos a mais, e a Fase 4 não os recupera — ela remove montagem, e escolher
 * modelo não é montagem.
 */

export type MachineData = {
  /** Nasce desligada — invariante 12, sem exceção para a Máquina. */
  referencesEnabled?: boolean;
  modelId?: string;
  imageSize?: string;
};

export type MachineNodeType = Node<MachineData, "machine">;

export function MachineNode({ id, data, selected }: NodeProps<MachineNodeType>) {
  const projectId = useCanvasStore((state) => state.projectId);
  const edges = useCanvasStore((state) => state.edges);
  const notice = useCanvasStore((state) => state.notice);
  const updateNodeData = useCanvasStore((state) => state.updateNodeData);
  const providers = useImageCatalog();
  const videoProviders = useVideoCatalog();
  const abrirLightbox = useLightbox((state) => state.open);
  const abrirFila = useLightbox((state) => state.openFila);
  const balance = useBalance((state) => state.sparks);
  const slots = useQueue((state) => state.byNode[id]);

  /**
   * O enquadramento do Roteiro recém-criado — só isto, e por isso lido e não
   * assinado.
   *
   * `useStoreApi` em vez de `useStore`: as dimensões do painel são consultadas
   * **dentro do clique**, e assinar as quatro faria este node re-renderizar a
   * cada redimensionamento da janela. Um card que aparece dez vezes no canvas
   * não pode pagar por uma informação que ele usa uma vez.
   */
  const { setCenter, getZoom } = useReactFlow();
  const flowStore = useStoreApi();

  /**
   * O caminho pronto: cria o Roteiro já ligado a esta Máquina e leva a tela até
   * o par.
   *
   * **`setCenter` com a caixa que o store devolve, e não `fitView`** — a mesma
   * razão do template no menu lateral: o `fitView` descobre limites a partir de
   * `measured`, que o Roteiro criado neste instante ainda não tem, e cairia num
   * retângulo de área zero. Aqui os limites vêm prontos, e a caixa cobre **os
   * dois** cards: quem clicou estava olhando para a Máquina, e um salto que a
   * deixasse fora da tela esconderia a peça que fez a pergunta.
   *
   * O `Math.min` com o zoom atual é o de sempre — aproximar quem estava longe
   * seria mexer no enquadramento de quem não pediu.
   *
   * **E o `stopPropagation` não é zelo, é conserto de um defeito medido na tela.**
   * O React Flow seleciona um node no `click` que sobe até o wrapper dele — no
   * `click`, não no `pointerdown`: um `button.click()` sintético, sem ponteiro
   * nenhum, selecionava a Máquina do mesmo jeito. Sem isto, o gesto termina com
   * **os dois** cards selecionados, contra o que o store faz de propósito, e a
   * próxima tecla Delete apaga o par inteiro em vez do card que a pessoa vê
   * marcado.
   *
   * *As 23 provas estruturais passavam com o defeito de pé* — o store está
   * certo, quem mentia era a propagação, e isso só a tela mostra.
   */
  function criarRoteiroLigado(evento: MouseEvent<HTMLButtonElement>) {
    evento.stopPropagation();

    const feito = useCanvasStore.getState().attachStoryboardToMachine({ machineId: id });

    if (!feito) return;

    const pane = flowStore.getState();
    const { zoom: cabe } = getViewportForBounds(
      feito.bounds,
      pane.width,
      pane.height,
      pane.minZoom,
      pane.maxZoom,
      "80px",
    );

    void setCenter(
      feito.bounds.x + feito.bounds.width / 2,
      feito.bounds.y + feito.bounds.height / 2,
      { zoom: Math.min(getZoom(), cabe), duration: 400 },
    );
  }


  // ── «Montar o vídeo» — o terceiro portão, e o único sem preço ─────────────
  const [montando, setMontando] = useState(false);
  const [avisoMontagem, setAvisoMontagem] = useState<string | null>(null);
  const attachResultCard = useCanvasStore((state) => state.attachResultCard);

  /**
   * O ▶ de uma cena abre A FILA, começando nela — Fase 2.
   *
   * **Não abre o clipe daquela cena sozinho, e a diferença é o ponto da fase.**
   * O veredito do elo — *"os clipes emendam a ponto de parecer um filme só?"* —
   * está NÃO MEDIDO desde 28/08/2026 porque ver os clipes em sequência dava
   * trabalho: assistir ao 1, fechar, achar o cartão da 2, clicar de novo. Aberta
   * como fila, a cena 2 começa sozinha quando a 1 acaba.
   *
   * A fila é **só das cenas que têm clipe**, na ordem do roteiro. Uma cena sem
   * clipe não vira um buraco no meio da sequência — ela simplesmente não entra,
   * porque a pergunta é sobre as emendas que existem.
   */
  function abrirFilaDeClipes(assetIdClicado: string) {
    const comClipe = cenas
      .filter((c) => c.videoAssetId !== null)
      .map((c) => ({ assetId: c.videoAssetId as string, rotulo: copy.cenaLabel(c.ordem) }));

    const onde = comClipe.findIndex((item) => item.assetId === assetIdClicado);

    if (onde < 0) {
      // Não deveria acontecer — o botão só existe com clipe. A rede embaixo é
      // abrir o clipe sozinho, que é o comportamento de antes desta fase.
      abrirLightbox(assetIdClicado, { isVideo: true });
      return;
    }

    abrirFila(comClipe, onde);
  }

  /**
   * O gesto que faz a Máquina terminar em UM arquivo.
   *
   * **Zero ⚡, e é por isso que ele não tem portão de custo:** não chama modelo,
   * não cria linha em `generations`, não toca o ledger. Juntar clipes que já
   * foram pagos é engenharia, não geração.
   *
   * A ordem é a das cenas, e ela é decidida **no servidor** — a tela manda o par
   * `(projectId, roteiroNodeId)` e nada mais. Mandar a lista de clipes daqui
   * seria o navegador escolhendo a ordem do filme, e a Fase 0 mediu o preço
   * disso: o lote de 02/09 criou as gerações em 1, 3, 2, e montar por hora de
   * criação entrega um arquivo válido, com a duração certa, **e o filme
   * embaralhado**.
   */
  async function montarOFilme() {
    if (!projectId || !roteiroNodeId || !podeMontar) return;

    setMontando(true);
    setAvisoMontagem(null);

    try {
      const resposta = await fetch("/api/storyboards/montar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, roteiroNodeId }),
      });

      const feito: unknown = await resposta.json();

      if (!feito || typeof feito !== "object" || !("ok" in feito)) {
        setAvisoMontagem(copy.montarFalhou);
        return;
      }

      if (feito.ok !== true) {
        setAvisoMontagem(fraseDaRecusa(feito));
        return;
      }

      const dados = feito as MontagemOk;

      // O cartão no canvas, pendurado nesta Máquina. O asset é a verdade e o
      // cartão é a vista — decisão 2 do dono: se os dois divergirem, quem manda
      // é a linha em `assets`.
      attachResultCard({
        sourceNodeId: id,
        data: {
          assetId: dados.assetId,
          // O cartão precisa saber que isto é vídeo: sem esta linha ele pede a
          // miniatura e desenha um `<img>` — que foi como o filme apareceu
          // partido no canvas na primeira prova de campo.
          kind: "video",
          // Montagem não é geração, então não há `generationId` — e o cartão
          // já sabe nascer com o "Ver prompt" desabilitado quando ele é nulo.
          generationId: null,
          handle: null,
          versionNumber: null,
          // "L:A", e NÃO a divisão: o cartão faz `.replace(":", " / ")` para
          // virar CSS. Passar número quebrou a tela inteira na primeira prova de
          // campo — o servidor tinha feito tudo certo, e o canvas caiu no
          // ErrorBoundary por causa de um `.replace` num `number`.
          //
          // E é a MEDIDA, não um preset: o arquivo tem 716×1284, que não é 9:16
          // exato. O cartão mostra o filme na proporção que ele tem.
          aspectRatio: dados.altura > 0 ? `${dados.largura}:${dados.altura}` : null,
        },
      });

      setAvisoMontagem(
        copy.montarFeito(dados.duracaoSegundos, (dados.bytes / 1048576).toFixed(1)),
      );
    } catch {
      setAvisoMontagem(copy.montarFalhou);
    } finally {
      setMontando(false);
    }
  }

  /**
   * O que foi lido, **e de qual roteiro** — os dois num estado só.
   *
   * Guardar o board sozinho deixaria o trilho do roteiro anterior na tela
   * durante o quadro em que alguém trocasse o fio. Com o `forNode` junto, "isto
   * é de outro roteiro" é uma comparação e não uma corrida — e o `loading` deixa
   * de ser estado para virar conta, que é o que tira o `setState` síncrono de
   * dentro do efeito.
   */
  const [lido, setLido] = useState<{ forNode: string; board: MachineBoard | null } | null>(null);
  /** Sobe quando um slot cai, para reler sem esperar a volta do Realtime. */
  const [recarga, setRecarga] = useState(0);
  /** Qual cena está com a caixa de instrução aberta, se alguma. */
  const [repetindo, setRepetindo] = useState<string | null>(null);
  const [instrucao, setInstrucao] = useState("");
  const [aviso, setAviso] = useState<string | null>(null);

  // ── O LOTE DE VÍDEO — Fase 3 ────────────────────────────────────────────
  //
  // **Nenhuma fila de cliente para o vídeo** (requisito do ciclo): o trabalho
  // vive no banco, e a linha nasce `queued` antes de a fal ser chamada. O que
  // mora aqui não é trabalho — é a AUTORIZAÇÃO: quais cenas o dono mandou
  // animar num clique. Sem ela, o motorista submeteria a emenda de um clipe que
  // ficou pronto ontem, sem ninguém ter pedido.
  //
  // E é por isso que ela morre com a sessão de propósito: quem recarrega a
  // página no meio da cadeia volta com o portão oferecendo o que falta, por um
  // clique. Um Spark nunca sai sem clique.
  const [loteAlvo, setLoteAlvo] = useState<ReadonlySet<string> | null>(null);
  /** As cenas que ESTE lote já submeteu — o que impede o reenvio automático. */
  const [tentadas, setTentadas] = useState<ReadonlySet<string>>(new Set());
  /** As cenas que o dono mandou refazer (D7). Vazio no lote comum. */
  const [reanimando, setReanimando] = useState<ReadonlySet<string>>(new Set());
  const [pausaDaAba, setPausaDaAba] = useState(false);
  const [avisoVideo, setAvisoVideo] = useState<string | null>(null);
  const [verificando, setVerificando] = useState<string | null>(null);
  /** O portão está conferindo se o endereço de retorno responde. */
  const [conferindoRetorno, setConferindoRetorno] = useState(false);
  /**
   * As cenas que o dono marcou para refazer o clipe — D7, segunda metade.
   *
   * Morre com a sessão, como `loteAlvo` e pelo mesmo motivo: é intenção, não
   * fato. Quem recarrega volta com o clipe que tem, e marca de novo se quiser.
   */
  const [marcadas, setMarcadas] = useState<ReadonlySet<string>>(new Set());
  /**
   * Submetidas e ainda não refletidas no banco.
   *
   * Ref, e não estado, porque a leitura e a escrita precisam ser síncronas: entre
   * o `requestVideoGeneration` sair e o trilho reler, há uma janela em que a cena
   * ainda aparece como `nenhum` — e um segundo despacho ali dentro seria um
   * clipe pago duas vezes.
   */
  const submetendo = useRef<Set<string>>(new Set());

  /**
   * Quantas submissões ESTE lote já produziu — R2.2, o teto absoluto.
   *
   * Ref e não estado pela mesma razão de `submetendo`: ela é lida e escrita
   * dentro do mesmo despacho, e um `setState` assíncrono aqui reabriria
   * exatamente a janela que o incidente de 29/08 atravessou 626 vezes.
   */
  const submetidasNoLote = useRef(0);

  /**
   * A aba está à frente? — a cláusula da 0.3.
   *
   * Estado e não leitura direta porque a cadeia precisa **retomar sozinha**
   * quando ela volta: sem o evento, a pausa ficaria esperando um clique que
   * ninguém sabe que precisa dar.
   */
  const [abaVisivel, setAbaVisivel] = useState(true);

  useEffect(() => {
    const ler = () => setAbaVisivel(document.visibilityState === "visible");

    ler();
    document.addEventListener("visibilitychange", ler);

    return () => document.removeEventListener("visibilitychange", ler);
  }, []);

  const roteiroNodeId = findGoverningBoard(edges, id);
  const atual = lido?.forNode === roteiroNodeId ? lido : null;
  const board = atual?.board ?? null;
  const loading = roteiroNodeId !== null && atual === null;

  const tickRoteiro = useGenerationTick(roteiroNodeId ?? "");
  const tickMaquina = useGenerationTick(id);

  const referencesEnabled = data.referencesEnabled === true;

  // Resolvidos, nunca gravados na montagem: escrever um default no `data` ao
  // montar marcaria o canvas como sujo só por alguém ter aberto o projeto.
  const modelId = data.modelId ?? defaultModelId(providers);
  const model = findModel(providers, modelId);
  const imageSize = data.imageSize ?? DEFAULT_IMAGE_SIZE;
  const precoPorImagem = model?.sizes.find((entry) => entry.size === imageSize)?.sparks ?? null;

  useEffect(() => {
    if (!projectId || !roteiroNodeId) return;

    let cancelado = false;

    void loadMachineBoard({ projectId, roteiroNodeId }).then((loaded) => {
      // Uma resposta que chega depois de o fio ter mudado é uma resposta sobre
      // outro roteiro. O `cancelado` a descarta antes de ela virar tela.
      if (!cancelado) {
        setLido({ forNode: roteiroNodeId, board: loaded });
      }
    });

    return () => {
      cancelado = true;
    };
  }, [projectId, roteiroNodeId, tickRoteiro, tickMaquina, recarga]);

  const recusaDeFio =
    notice?.nodeId === id && notice.reason === "board_taken"
      ? notice.lado === "roteiro"
        ? copy.roteiroJaRegido
        : copy.maquinaJaOcupada
      : null;

  const cenas = board?.cenas ?? [];

  // A regra mora em `machine-video.ts`, ao lado dos outros vereditos — aqui só
  // se soma o "está montando agora", que é estado de tela e não de produto.
  const vereditoFilme = vereditoDoFilme(cenas);
  const podeMontar = vereditoFilme.pode && !montando;
  const lote = loteDeImagens(cenas);
  const veredito = vereditoDoPortao({ cenas, precoPorImagem, saldo: balance });
  const vivos = liveCount(slots);
  const aprovaveis = cenas.filter((cena) => cena.estado === "pronta");

  // ── O CATÁLOGO DE VÍDEO, e o preço que responde também pela D5 ──────────
  //
  // O modelo nasce com o default do catálogo, como o de imagem, e pela mesma
  // razão medida na Fase 1: o portão só é UM gesto se ele já souber o preço.
  // Aqui não há nem seletor — a v1 do vídeo vende um modelo e uma duração, e um
  // seletor de uma opção só é um gesto cobrado por nada.
  const videoModels = videoProviders
    .filter((provider) => provider.status === "ready")
    .flatMap((provider) => provider.models);
  const videoModel = videoModels.find((modelo) => modelo.isDefault) ?? videoModels[0] ?? null;
  const precoDaDuracao = videoModel
    ? (segundos: number) =>
        videoModel.durations.find((duracao) => duracao.seconds === segundos)?.sparks ?? null
    : null;

  const plano = planoDeVideo({
    marcadas,
    cenas,
    precoDaDuracao,
    reanimando: loteAlvo === null ? undefined : reanimando,
    jaTentadas: loteAlvo === null ? undefined : tentadas,
    // R2.4 · a mira, 31/08/2026 — o lote em curso é uma lista FECHADA.
    //
    // Sem esta linha, `loteAlvo` autorizava uma lista e o motorista despachava
    // de outra: no clique de campo, «Reanimar 1 cena» animou a cena que estava
    // candidata ao lote COMUM. Sem lote em curso ela é `undefined`, e o plano
    // volta a ser a lista de candidatas que o portão precisa oferecer.
    autorizadas: loteAlvo ?? undefined,
  });
  const vereditoVideo = vereditoDoPortaoVideo({
    plano,
    saldo: balance,
    catalogoPronto: videoModel !== null,
  });
  const emVooVideo = cenas.filter((cena) => cena.video === "gerando").length;
  // ── O CONTADOR DO CABEÇALHO — conserto A, 29/08/2026 ────────────────────
  //
  // "Em jogo" e não "no lote": a conta é sobre o que existe no banco, não sobre
  // a autorização desta sessão. Quem recarrega a página no meio da cadeia perde
  // o loteAlvo de propósito (um Spark nunca sai sem clique) e continuaria vendo
  // o número certo — porque ele nunca dependeu da sessão.
  const videoProntos = cenas.filter((cena) => cena.video === "pronto").length;
  const videoEmJogo = cenas.filter((cena) => cena.video !== "nenhum").length;
  const feitosNoLote = loteAlvo
    ? cenas.filter((cena) => loteAlvo.has(cena.id) && cena.video === "pronto").length
    : 0;

  function pedirCena(cena: MachineScene, instrucaoPt: string | null) {
    // `modelId` nulo é "o catálogo ainda não respondeu", e não "sem modelo".
    // Pedir agora seria pedir sem saber o preço — e o portão acabou de anunciar
    // um número.
    if (!projectId || !board || !modelId) return;

    useQueue.getState().enqueue({
      nodeId: id,
      quantity: 1,
      tag: cena.id,
      onSettled: () => setRecarga((n) => n + 1),
      request: {
        projectId,
        nodeId: id,
        // O texto é o da ficha mais, quando houver, a instrução daquela
        // tentativa. O servidor recompõe a diretiva sozinho para o registro —
        // aqui é só o que o modelo lê.
        prompt: [promptDaCena(cena), instrucaoPt].filter(Boolean).join(" "),
        modelId,
        presetId: presetDoCanal(board.canal),
        imageSize,
        estiloKey: null,
        anguloKey: cena.enquadramento,
        iluminacaoKey: null,
        expressaoKey: null,
        references: [],
        referencesEnabled,
        scene: { id: cena.id, instrucaoPt },
      },
    });
  }

  function gerarLote() {
    setAviso(null);

    if (!veredito.pode) return;

    // Tudo ou nada: a capacidade é conferida ANTES de qualquer pedido sair.
    // Enfileirar metade seria a tela decidindo por quem clicou — e o portão
    // acabou de prometer um número.
    if (freeSlots(slots) < veredito.quantas) {
      setAviso(copy.portaoLoteCheio);
      return;
    }

    for (const cena of lote) pedirCena(cena, null);
  }

  function confirmarRepeticao(cena: MachineScene) {
    const texto = instrucao.trim();

    setRepetindo(null);
    setInstrucao("");
    setAviso(null);

    if (freeSlots(slots) < 1) {
      setAviso(copy.portaoLoteCheio);
      return;
    }

    pedirCena(cena, texto === "" ? null : texto);
  }

  function aprovar(ordens: number[]) {
    if (!projectId || !roteiroNodeId || ordens.length === 0) return;

    void aprovarCenas({ projectId, roteiroNodeId, ordens }).then(() => setRecarga((n) => n + 1));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // O MOTORISTA DA CADEIA — Fase 3
  //
  // Ele não guarda trabalho: o trabalho está no banco desde o instante em que a
  // linha nasce `queued`. O que ele faz é olhar o plano, ver quem pode partir
  // agora e despachar — e voltar a olhar toda vez que o Realtime avisa que
  // alguma coisa mudou. Um clipe que fica pronto com a aba fechada é encontrado
  // na volta, sem nada de especial acontecer, porque não havia o que perder.
  // ─────────────────────────────────────────────────────────────────────────

  async function animarLote() {
    setAvisoVideo(null);
    setPausaDaAba(false);

    if (!vereditoVideo.pode) return;
    if (!(await retornoResponde())) return;

    submetendo.current = new Set();
    submetidasNoLote.current = 0;
    setTentadas(new Set());
    setReanimando(new Set());
    setLoteAlvo(new Set(plano.lote.map((linha) => linha.cena.id)));
  }

  async function reanimarLote() {
    setAvisoVideo(null);
    setPausaDaAba(false);

    const alvos = new Set(plano.reanimar.map((linha) => linha.cena.id));

    if (alvos.size === 0) return;
    if (!(await retornoResponde())) return;

    // A marcação já virou lote: mantê-la faria o portão continuar oferecendo
    // pela segunda vez uma cena que está sendo refeita agora.
    setMarcadas(new Set());
    submetendo.current = new Set();
    submetidasNoLote.current = 0;
    setTentadas(new Set());
    // As duas juntas, e a ordem entre elas não importa porque o plano só as lê
    // no render seguinte: `reanimando` diz QUAIS voltam ao lote apesar de terem
    // clipe, e `loteAlvo` diz que existe um lote autorizado.
    setReanimando(alvos);
    setLoteAlvo(alvos);
  }

  /**
   * Uma cena indo para a fal — e o único ponto do ciclo em que Spark é posto em
   * risco sem alguém clicando **naquela** cena.
   *
   * Pode fazer isso porque o portão já disse o número e alguém clicou nele: as N
   * cenas foram autorizadas juntas, e é isso que o `loteAlvo` guarda.
   */
  async function despachar(partida: Partida) {
    if (!projectId || !videoModel) return;

    const { cena } = partida;
    const duracao = videoModel.durations.find((d) => d.seconds === cena.duracaoSegundos);

    if (!duracao) return;

    submetendo.current.add(cena.id);
    // Conta ANTES de qualquer await: o que o teto de R2.2 limita é a INTENÇÃO
    // de submeter, e contar depois deixaria a janela do await de fora — que é
    // por onde o incidente passou.
    submetidasNoLote.current += 1;

    let stillId: string | null = null;

    if (partida.quadroDe === null) {
      // Cena de corte: parte da própria imagem aprovada.
      stillId = cena.imagemAprovadaAssetId;
    } else {
      const clipe = partida.quadroDe.videoAssetId;

      if (!clipe) {
        submetendo.current.delete(cena.id);
        return;
      }

      const quadro = await garantirQuadroDerivado(clipe, { abaVisivel });

      if (!quadro.ok) {
        submetendo.current.delete(cena.id);

        // A pausa NÃO é falha: nada foi tentado, nada foi cobrado, e a cena
        // continua no lote. Quando a aba voltar, o efeito roda de novo e ela
        // parte — sem ninguém clicar em nada.
        if (quadro.reason === "aba_escondida") {
          setPausaDaAba(true);
          return;
        }

        setTentadas((antes) => new Set(antes).add(cena.id));
        setAvisoVideo(t.videoNode.continueErrors[quadro.reason] ?? t.videoNode.continueErrors.error);
        return;
      }

      setPausaDaAba(false);
      stillId = quadro.assetId;
    }

    if (!stillId) {
      submetendo.current.delete(cena.id);
      setTentadas((antes) => new Set(antes).add(cena.id));
      return;
    }

    // Tentada é tentada, dê no que der: é isto que impede o lote de reenviar a
    // mesma cena para sempre quando o provedor recusa. Ela volta no clique
    // seguinte — repetir é o gesto certo depois de uma recusa; repetir sozinho,
    // não.
    setTentadas((antes) => new Set(antes).add(cena.id));

    const resultado = await requestVideoGeneration({
      projectId,
      nodeId: id,
      // O movimento da ficha, sem cenário e sem menção — o still já é a cena e
      // já é a personagem. `buildSceneMotion` é a mesma função que o servidor
      // usa para recompor a procedência.
      prompt: buildSceneMotion({ acao: cena.acao, movimento: cena.movimento }),
      modelId: videoModel.id,
      sourceAssetId: stillId,
      durationSeconds: duracao.seconds,
      scene: { id: cena.id },
    });

    if (!resultado.ok) {
      submetendo.current.delete(cena.id);
      setAvisoVideo(t.videoNode.errors[resultado.reason] ?? t.videoNode.errors.error);
    }

    // Nada foi cobrado ainda — o débito acontece quando o vídeo existe. Reler é
    // o que faz a coluna dizer "gerando" no mesmo instante do despacho.
    setRecarga((n) => n + 1);
  }

  useEffect(() => {
    if (loteAlvo === null) return;

    // ── R2.1 · o desarme, e a condição que custou o incidente ────────────
    //
    // Era `cena.video !== "nenhum"`. Numa cena de lote comum isso está certo:
    // ela nasce `nenhum` e vira `gerando` quando o banco reconhece. Numa cena
    // REANIMADA a condição é verdadeira **desde antes do clique** — ela já tem
    // clipe —, então a ref era desarmada na primeira passada e o único freio da
    // janela entre submeter e o banco refletir sumia.
    //
    // A ref existe para esperar UMA coisa: o banco reconhecer a submissão NOVA.
    // `gerando` é exatamente isso, e vale para os dois casos.
    for (const cena of cenas) {
      if (cena.video === "gerando") submetendo.current.delete(cena.id);
    }

    const emVoo = emVooVideo + submetendo.current.size;
    const proximas = proximasAAnimar({
      plano,
      emVoo,
      // R2.2 — o limite absoluto: um lote de N nunca produz mais de N
      // submissões, dê no que der. É a única trava que não depende de estado do
      // banco, de janela de rede nem de ordem de efeito.
      jaSubmetidas: submetidasNoLote.current,
      tamanhoDoLote: loteAlvo.size,
    }).filter((partida) => !submetendo.current.has(partida.cena.id));

    // Acabou: nada para despachar e nada em voo. O lote se fecha sozinho, e a
    // autorização morre com ele — o próximo Spark exige outro clique.
    if (proximas.length === 0 && emVoo === 0) {
      setLoteAlvo(null);
      setTentadas(new Set());
      setReanimando(new Set());
      setPausaDaAba(false);
      return;
    }

    for (const partida of proximas) void despachar(partida);
    // As dependências são os fatos que mudam o que há a fazer: a autorização, o
    // que já foi tentado, o trilho relido, e a aba — que é a que faz a cadeia
    // retomar sozinha.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loteAlvo, tentadas, lido, recarga, abaVisivel, reanimando, videoModel]);

  /**
   * O endereço de retorno responde? — a trava de vida, 29/08/2026.
   *
   * **Uma ida à rede por CLIQUE, não por submissão.** O portão é onde o dinheiro
   * é autorizado, e é o único lugar onde a pergunta se paga: um lote de dez cenas
   * conferiria dez vezes a mesma coisa se isto morasse no despacho.
   *
   * A ordem importa e é deliberada: **depois** do veredito do saldo e **antes**
   * do primeiro setLoteAlvo. Nada foi autorizado quando ela recusa, então não há
   * lote para desfazer — e a frase que aparece diz qual dos três modos de falhar
   * aconteceu, porque o conserto de cada um é diferente.
   */
  async function retornoResponde(): Promise<boolean> {
    setConferindoRetorno(true);

    try {
      const vida = await checkWebhookAlive();

      if (vida.vivo) return true;

      setAvisoVideo(copy.videoRetornoMorto[vida.motivo] ?? copy.videoRetornoMorto.sem_resposta);

      return false;
    } finally {
      setConferindoRetorno(false);
    }
  }

  function verificarVideo(generationId: string) {
    setVerificando(generationId);
    void reconcileVideo(generationId).then(() => {
      setVerificando(null);
      setRecarga((n) => n + 1);
    });
  }

  const prontas = (slots ?? []).filter((slot) => slot.status === "ready").length;

  return (
    <div
      /*
        HORIZONTAL, e a forma é a decisão (requisito 6 e o esboço do Jorge).
        As entradas em cima, o trilho no corpo, uma saída por cena embaixo.
      */
      className={`group/node w-[54rem] rounded-xl border bg-surface-raised shadow-lg
                  shadow-black/30 transition-colors
                  ${selected ? "border-accent" : "border-line"}`}
    >
      <Handle
        type="target"
        id={BOARD_HANDLE}
        position={Position.Top}
        title={copy.entradaRoteiroHint}
        style={{ left: "18%" }}
        className="!size-2.5 !border-2 !border-canvas !bg-accent"
      />
      <Handle
        type="target"
        id="referencias"
        position={Position.Top}
        title={copy.entradaReferenciasHint}
        style={{ left: "50%" }}
        className="!size-2.5 !border-2 !border-canvas !bg-line-strong"
      />

      <NodeHeader nodeId={id} kind="machine" title={copy.title} removeHint={copy.remove} />

      <div className="space-y-3 p-3">
        {roteiroNodeId === null ? (
          <EmptyState
            titulo={copy.semRoteiro}
            hint={copy.semRoteiroHint}
            acao={{ rotulo: copy.semRoteiroAcao, onClick: criarRoteiroLigado }}
          />
        ) : loading ? (
          <p className="py-6 text-center text-[11px] text-ink-faint">{copy.carregando}</p>
        ) : board === null || cenas.length === 0 ? (
          <EmptyState titulo={copy.semFichas} hint={copy.semFichasHint} />
        ) : (
          <>
            <div className="flex items-baseline gap-2 text-xs">
              <span className="truncate font-medium text-ink">«{board.titulo}»</span>
              <span className="shrink-0 text-[11px] text-ink-faint">
                {cenas.length} {cenas.length === 1 ? "cena" : "cenas"}
                {" · "}
                {t.storyboardNode.canais[board.canal] ?? board.canal}
                {board.personagemHandle ? ` · @${board.personagemHandle}` : ""}
              </span>

              {/*
                ── O CONTADOR — conserto A, 29/08/2026 ──────────────────────

                O node mede 245.670 px². Antes disto, um clipe que chegava mudava
                1.192 deles — 0,49%, uma frase de 9 px dentro de uma coluna de
                7,5 rem. O caminho nunca esteve quebrado (~250 ms do webhook ao
                pixel, medido); o que faltava era um lugar que a pessoa já olha.
              */}
              {videoEmJogo > 0 ? (
                <span
                  title={copy.videoContadorHint(videoProntos, videoEmJogo)}
                  className={`shrink-0 text-[11px] font-medium ${
                    videoProntos === videoEmJogo ? "text-positive" : "text-ink-muted"
                  }`}
                >
                  {copy.videoContador(videoProntos, videoEmJogo)}
                </span>
              ) : null}
            </div>

            {/* ── CONFIGURAÇÃO ──────────────────────────────────────────── */}
            <div className="flex flex-wrap items-end gap-3">
              <label className="min-w-[12rem] flex-1">
                <span className="mb-1 block text-[11px] font-medium text-ink-muted">
                  {copy.modelLabel}
                </span>
                <ModelSelect
                  id={`${id}-modelo`}
                  providers={providers}
                  value={modelId}
                  imageSize={imageSize}
                  onChange={(next) => updateNodeData(id, { modelId: next })}
                />
              </label>

              <label className="w-36">
                <span className="mb-1 block text-[11px] font-medium text-ink-muted">
                  {copy.qualidadeLabel}
                </span>
                <select
                  value={imageSize}
                  onChange={(event) => updateNodeData(id, { imageSize: event.target.value })}
                  className="nodrag h-8 w-full rounded-lg border border-line bg-surface px-2
                             text-[11px] text-ink"
                >
                  {(model?.sizes ?? []).map((size) => (
                    <option key={size.size} value={size.size}>
                      {size.size} · {size.sparks} ⚡
                    </option>
                  ))}
                </select>
              </label>

              <p className="pb-1.5 text-[11px] text-ink-faint" title={copy.formatoHint}>
                {copy.formatoDoCanal(t.storyboardNode.canais[board.canal] ?? board.canal)}
              </p>
            </div>

            <label
              className="flex items-center gap-2 text-[11px]"
              title={copy.entradaReferenciasHint}
            >
              <input
                type="checkbox"
                checked={referencesEnabled}
                onChange={(event) =>
                  updateNodeData(id, { referencesEnabled: event.target.checked })
                }
                className="nodrag size-3.5 accent-[var(--accent)]"
              />
              <span className="font-medium text-ink-muted">{copy.inputsSwitch}</span>
              <span className="text-ink-faint">
                {referencesEnabled ? copy.inputsOn : copy.inputsOff}
              </span>
            </label>

            {/* ── O TRILHO ──────────────────────────────────────────────── */}
            <div>
              <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-ink-faint">
                {copy.trilhoTitle}
              </p>
              <div className="nodrag flex gap-2 overflow-x-auto pb-1">
                {plano.linhas.map((linha) => (
                  <ColunaDaCena
                    key={linha.cena.id}
                    linha={linha}
                    gerando={(slots ?? []).some(
                      (slot) =>
                        slot.tag === linha.cena.id &&
                        (slot.status === "queued" || slot.status === "running"),
                    )}
                    repetindo={repetindo === linha.cena.id}
                    instrucao={instrucao}
                    onInstrucao={setInstrucao}
                    onAbrirRepetir={() => {
                      setRepetindo(linha.cena.id);
                      setInstrucao("");
                    }}
                    onCancelarRepetir={() => setRepetindo(null)}
                    onConfirmarRepetir={() => confirmarRepeticao(linha.cena)}
                    onAprovar={() => aprovar([linha.cena.ordem])}
                    verificando={verificando}
                    onVerificar={verificarVideo}
                    onAbrirClipe={(assetId) => abrirFilaDeClipes(assetId)}
                    marcada={marcadas.has(linha.cena.id)}
                    onMarcarRefazer={() =>
                      setMarcadas((antes) => {
                        const proximo = new Set(antes);

                        // Clicar de novo desmarca: o botão é uma chave, não um
                        // gatilho — e nada saiu do bolso de ninguém até o portão.
                        if (!proximo.delete(linha.cena.id)) proximo.add(linha.cena.id);

                        return proximo;
                      })
                    }
                  />
                ))}
              </div>
            </div>

            {/* ── OS PORTÕES: botão, e o custo colado embaixo dele ───────── */}
            <div className="flex flex-wrap items-start gap-3 border-t border-line pt-3">
              <div className="min-w-[16rem] flex-1">
                <button
                  type="button"
                  onClick={gerarLote}
                  disabled={!veredito.pode || vivos > 0}
                  className="nodrag h-9 w-full rounded-lg bg-accent text-xs font-medium text-canvas
                             transition-opacity hover:opacity-90 disabled:cursor-not-allowed
                             disabled:opacity-40"
                >
                  {vivos > 0
                    ? copy.portaoGerando(prontas, (slots ?? []).length)
                    : copy.portaoGerar(veredito.pode ? veredito.quantas : lote.length)}
                </button>

                {/* O custo fala a verdade multiplicada ANTES do clique. */}
                <p className="mt-1 text-[11px] text-ink-faint">
                  {veredito.pode && precoPorImagem !== null && balance !== null
                    ? copy.portaoCusto(veredito.quantas, precoPorImagem, veredito.total, balance)
                    : !veredito.pode && veredito.motivo === "sem_saldo"
                      ? `${copy.portaoSemSaldo(veredito.faltam)} ${copy.portaoSemSaldoHint}`
                      : !veredito.pode && veredito.motivo === "sem_preco"
                        ? copy.portaoSemPreco
                        : !veredito.pode && veredito.motivo === "sem_cenas"
                          ? cenas.some((cena) => cena.transicao === "corte")
                            ? copy.portaoSemCenas
                            : copy.portaoSemCenasVazio
                          : ""}
                </p>

                <p className="mt-0.5 text-[10px] text-ink-faint">{copy.contaSoCortes}</p>
              </div>

              <div className="min-w-[12rem]">
                <button
                  type="button"
                  onClick={() => aprovar(aprovaveis.map((cena) => cena.ordem))}
                  disabled={aprovaveis.length === 0}
                  className="nodrag h-9 w-full rounded-lg border border-line text-xs font-medium
                             text-ink transition-colors hover:border-line-strong
                             disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {copy.aprovarTodas(aprovaveis.length)}
                </button>
                <p className="mt-1 text-[11px] text-ink-faint">{copy.aprovarSemCusto}</p>
              </div>
            </div>

            {aviso ? (
              <p className="rounded-lg border border-warning/40 bg-warning/10 px-2 py-1.5 text-[11px] leading-relaxed text-ink-muted">
                {aviso}
              </p>
            ) : null}

            {/* ── O PORTÃO DE VÍDEO — Fase 3 ───────────────────────────── */}
            <div className="border-t border-line pt-3">
              <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-ink-faint">
                {copy.videoTitle}
              </p>

              <div className="flex flex-wrap items-start gap-3">
                <div className="min-w-[16rem] flex-1">
                  <button
                    type="button"
                    onClick={() => void animarLote()}
                    disabled={loteAlvo !== null || !vereditoVideo.pode || conferindoRetorno}
                    className="nodrag h-9 w-full rounded-lg bg-accent text-xs font-medium text-canvas
                               transition-opacity hover:opacity-90 disabled:cursor-not-allowed
                               disabled:opacity-40"
                  >
                    {conferindoRetorno
                      ? copy.videoRetornoConferindo
                      : loteAlvo !== null
                        ? copy.animarGerando(feitosNoLote, loteAlvo.size)
                        : copy.animarBotao(
                          vereditoVideo.pode ? vereditoVideo.quantas : plano.lote.length,
                        )}
                  </button>

                  {/* A conta inteira ANTES do clique — invariante 12. */}
                  <p className="mt-1 text-[11px] text-ink-faint">
                    {vereditoVideo.pode && balance !== null
                      ? `${copy.animarComposicao(vereditoVideo.aprovadas, vereditoVideo.emendas)} · ${
                          plano.precoUniforme !== null
                            ? copy.animarCusto(
                                vereditoVideo.quantas,
                                plano.precoUniforme,
                                vereditoVideo.total,
                                balance,
                              )
                            : copy.animarCustoSoma(vereditoVideo.total, balance)
                        }`
                      : !vereditoVideo.pode && vereditoVideo.motivo === "sem_saldo"
                        ? `${copy.animarSemSaldo(vereditoVideo.faltam)} ${copy.animarSemSaldoHint}`
                        : !vereditoVideo.pode && vereditoVideo.motivo === "sem_preco"
                          ? copy.animarSemPreco
                          : !vereditoVideo.pode && vereditoVideo.motivo === "sem_cenas"
                            ? cenas.some((cena) => cena.estado === "aprovada")
                              ? copy.animarSemCenas
                              : copy.animarSemCenasVazio
                            : ""}
                  </p>

                  {/* O tempo, ao lado do dinheiro — conserto de 28/08. */}
                  {vereditoVideo.pode && plano.partemAgora < vereditoVideo.quantas ? (
                    <p className="mt-0.5 text-[10px] text-ink-muted">
                      {copy.animarComEspera(
                        plano.partemAgora,
                        vereditoVideo.quantas - plano.partemAgora,
                      )}
                    </p>
                  ) : null}

                  <p className="mt-0.5 text-[10px] text-ink-faint">{copy.animarSoAprovadas}</p>
                </div>

                {/* D7 — e ela só aparece quando há o que reanimar. */}
                {plano.reanimar.length > 0 ? (
                  <div className="min-w-[12rem]">
                    <button
                      type="button"
                      onClick={reanimarLote}
                      disabled={loteAlvo !== null}
                      title={copy.reanimarHint}
                      className="nodrag h-9 w-full rounded-lg border border-line text-xs font-medium
                                 text-ink transition-colors hover:border-line-strong
                                 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {copy.reanimarBotao(plano.reanimar.length)}
                    </button>
                    <p className="mt-1 text-[11px] text-ink-faint">
                      {copy.reanimarCusto(plano.totalReanimar)}
                    </p>
                  </div>
                ) : null}
              </div>

              {/* A cláusula da 0.3: para, com a causa nomeada — nunca gira. */}
              {pausaDaAba ? (
                <p className="mt-2 rounded-lg border border-warning/40 bg-warning/10 px-2 py-1.5 text-[11px] leading-relaxed text-ink-muted">
                  <span className="font-medium">{copy.pausaDaAba}</span>
                  <span className="block text-ink-faint">{copy.pausaDaAbaHint}</span>
                </p>
              ) : null}

              {avisoVideo ? (
                <p className="mt-2 rounded-lg border border-warning/40 bg-warning/10 px-2 py-1.5 text-[11px] leading-relaxed text-ink-muted">
                  {avisoVideo}
                </p>
              ) : null}
            </div>

            {/* ── «MONTAR O VÍDEO» — o terceiro portão, e o único SEM PREÇO ── */}
            <div className="border-t border-line pt-3">
              <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-ink-faint">
                {copy.montarTitulo}
              </p>

              <button
                type="button"
                onClick={() => void montarOFilme()}
                disabled={!podeMontar}
                className="nodrag h-9 w-full rounded-lg border border-line-strong text-xs
                           font-medium text-ink transition-colors hover:border-accent
                           hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
              >
                {montando ? copy.montarMontando : copy.montarBotao}
              </button>

              {/*
                Desabilitado com a CONTA do que falta, nunca escondido — decisão 3
                do dono. E quando pode montar, a linha diz "sem custo": os outros
                dois portões desta banda anunciam preço, e o silêncio aqui seria
                lido como esquecimento em vez de como gratuidade.
              */}
              <p className="mt-1 text-[11px] text-ink-faint">
                {vereditoFilme.pode
                  ? copy.montarPronto(vereditoFilme.cenas)
                  : vereditoFilme.motivo === "faltam_clipes"
                    ? copy.montarFaltam(vereditoFilme.faltam, vereditoFilme.total)
                    : ""}
              </p>

              {avisoMontagem ? (
                <p className="mt-2 rounded-lg border border-line bg-surface px-2 py-1.5 text-[11px] leading-relaxed text-ink-muted">
                  {avisoMontagem}
                </p>
              ) : null}
            </div>
          </>
        )}

        {recusaDeFio ? (
          <p className="rounded-lg border border-warning/40 bg-warning/10 px-2 py-1.5 text-[11px] leading-relaxed text-ink-muted">
            {recusaDeFio}
          </p>
        ) : null}
      </div>

      {cenas.map((cena, indice) => (
        <Handle
          key={cena.id}
          type="source"
          id={sceneHandleId(cena.ordem)}
          position={Position.Bottom}
          title={copy.cenaLabel(cena.ordem)}
          style={{ left: `${((indice + 0.5) / Math.max(cenas.length, 1)) * 100}%` }}
          className="!size-2 !border-2 !border-canvas !bg-accent"
        />
      ))}
    </div>
  );
}

/**
 * O texto que a ficha manda para o campo.
 *
 * Composto aqui igual ao da ponte do Ciclo 2 — a mesma ordem, pelo mesmo motivo
 * da invariante 13: a menção precisa ser **sujeito da frase**, senão o tradutor
 * inventa sujeito e gênero. O servidor recompõe esta mesma diretiva por conta
 * própria para o registro, com `buildSceneDirective`, e **é a dele que vale**.
 */
function promptDaCena(cena: MachineScene): string {
  const partes = [cena.acao, cena.cenario, cena.movimento]
    .map((parte) => parte.trim())
    .filter((parte) => parte !== "")
    .map((parte) => (/[.!?…]$/.test(parte) ? parte : `${parte}.`));

  const sujeito = cena.personagemHandle ? `@${cena.personagemHandle}` : null;
  const corpo = partes.join(" ");

  if (sujeito === null) return corpo;

  return corpo === "" ? sujeito : `${sujeito} ${corpo}`;
}

/**
 * O vazio, com ou sem saída.
 *
 * A `acao` é opcional porque nem todo vazio tem uma: "este roteiro ainda não tem
 * fichas" se resolve no outro card, e um botão ali mandaria a pessoa para o
 * lugar errado. **Quando existe, ela vem ANTES da instrução** — o gesto que
 * resolve na frente do gesto que ensina.
 */
function EmptyState({
  titulo,
  hint,
  acao,
}: {
  titulo: string;
  hint: string;
  acao?: { rotulo: string; onClick: (evento: MouseEvent<HTMLButtonElement>) => void };
}) {
  return (
    <div className="rounded-lg border border-dashed border-line-strong px-3 py-5 text-center">
      <p className="text-xs font-medium text-ink-muted">{titulo}</p>
      {acao ? (
        <button
          type="button"
          onClick={acao.onClick}
          className="nodrag mt-3 rounded-md border border-line-strong bg-surface px-3 py-1.5 text-[11px] font-medium text-ink transition hover:border-accent hover:text-accent"
        >
          {acao.rotulo}
        </button>
      ) : null}
      <p className={(acao ? "mt-2" : "mt-1") + " text-[11px] leading-relaxed text-ink-faint"}>{hint}</p>
    </div>
  );
}

/**
 * Uma coluna do trilho — e as duas formas dela são a D4 na tela.
 *
 * Cena de **corte** mostra miniatura e ganha ↻ e ✓, porque ela tem imagem
 * própria. Cena de **continuação** não tem, e em vez de uma moldura vazia (que
 * prometeria uma imagem que ninguém vai gerar) ela diz de qual cena emenda —
 * **e não ganha nenhum dos dois botões**, porque não há o que repetir nem o que
 * aprovar.
 */
function ColunaDaCena({
  linha,
  gerando,
  repetindo,
  instrucao,
  onInstrucao,
  onAbrirRepetir,
  onCancelarRepetir,
  onConfirmarRepetir,
  onAprovar,
  verificando,
  onVerificar,
  onAbrirClipe,
  marcada,
  onMarcarRefazer,
}: {
  linha: LinhaDoPlano;
  gerando: boolean;
  /** Esta cena está marcada para refazer o clipe? — D7, segunda metade. */
  marcada: boolean;
  onMarcarRefazer: () => void;
  repetindo: boolean;
  instrucao: string;
  onInstrucao: (texto: string) => void;
  onAbrirRepetir: () => void;
  onCancelarRepetir: () => void;
  onConfirmarRepetir: () => void;
  onAprovar: () => void;
  verificando: string | null;
  onVerificar: (generationId: string) => void;
  onAbrirClipe: (assetId: string) => void;
}) {
  const { cena } = linha;
  const continuacao = cena.transicao === "continuacao";
  const video = fraseDoVideo(linha);

  return (
    <div className="w-[7.5rem] shrink-0 rounded-lg border border-line bg-surface p-1.5">
      <div className="mb-1 flex items-center justify-between text-[10px] text-ink-faint">
        <span className="font-medium text-ink-muted">{cena.ordem}</span>
        <span
          title={continuacao ? copy.transicaoContinuacao : copy.transicaoCorte}
          className="cursor-help"
        >
          {continuacao ? "⇥" : "✂"}
        </span>
      </div>

      <div className="flex aspect-square items-center justify-center overflow-hidden rounded border border-line bg-canvas">
        {gerando ? (
          <span className="text-[10px] text-ink-faint">⟳</span>
        ) : cena.thumbUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cena.thumbUrl} alt="" className="size-full object-cover" />
        ) : cena.quadroDePartidaUrl && cena.emendaDe !== null ? (
          /*
            ── A SEGUNDA LINHA DA D4 — 29/08/2026 ────────────────────────────

            A decisão sempre disse duas coisas sobre a coluna de uma cena de
            continuação: ANTES do vídeo, "continua da cena N"; DEPOIS do vídeo,
            **o quadro derivado do elo, que é o primeiro quadro de verdade dela**.
            A Fase 3 entregou a primeira e parou — e foi essa metade faltando que
            deixou 42% do cartão como texto morto enquanto o clipe chegava.

            Nada é gerado e nada é cobrado: o asset saiu do clipe anterior no
            despacho. O selo existe para ninguém confundir com imagem aprovada —
            uma emenda não tem imagem própria, e não deve passar a parecer que tem.
          */
          <div className="relative size-full" title={copy.quadroDePartidaHint(cena.emendaDe)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cena.quadroDePartidaUrl} alt="" className="size-full object-cover" />
            <span
              className="absolute inset-x-0 bottom-0 bg-canvas/75 px-0.5 text-center text-[7px]
                         leading-tight text-ink-muted"
            >
              {copy.quadroDePartida}
            </span>
          </div>
        ) : continuacao && cena.emendaDe !== null ? (
          <span className="px-1 text-center text-[9px] leading-tight text-ink-faint">
            {copy.emendaDe(cena.emendaDe)}
          </span>
        ) : (
          <span className="px-1 text-center text-[9px] leading-tight text-ink-faint">
            {copy.semImagem}
          </span>
        )}
      </div>

      <p className="mt-1 truncate text-[10px] text-ink-muted" title={cena.acao}>
        {cena.acao}
      </p>

      <div className="mt-0.5 flex items-center justify-between text-[9px]">
        <span
          className={
            cena.estado === "aprovada"
              ? "text-positive"
              : cena.estado === "falhou"
                ? "text-warning"
                : "text-ink-faint"
          }
        >
          {copy.estados[cena.estado] ?? cena.estado}
        </span>
        <span className="text-ink-faint">{cena.duracaoSegundos}s</span>
      </div>

      {/* Anotação, e não estado: a cena continua aprovada. */}
      {cena.desatualizada ? (
        <p className="mt-0.5 text-[9px] text-ink-muted" title={copy.desatualizadaHint}>
          {copy.desatualizada}
        </p>
      ) : null}

      {/*
        ── O VÍDEO — Fase 3 ──────────────────────────────────────────────

        Com clipe, a linha é BOTÃO e abre no mesmo visualizador da /galeria.
        Sem clipe, é frase. A distinção não é estética: um texto que parece
        clicável e não é custa mais do que um texto que não parece nada — e o
        dono tentou clicar em "vídeo pronto" antes de qualquer outra coisa.
      */}
      {video.texto === "" ? null : cena.videoAssetId ? (
        <button
          type="button"
          onClick={() => onAbrirClipe(cena.videoAssetId as string)}
          title={copy.videoAbrir}
          className={`nodrag mt-1 w-full rounded text-left text-[9px] leading-tight underline
                      decoration-dotted underline-offset-2 transition-opacity hover:opacity-80
                      ${video.tom}`}
        >
          ▶ {video.texto}
        </button>
      ) : (
        <p className={`mt-1 text-[9px] leading-tight ${video.tom}`} title={video.hint}>
          ▶ {video.texto}
        </p>
      )}

      {/* Anotação de novo, e pelo mesmo motivo: informa, nunca bloqueia. */}
      {linha.desatualizado ? (
        <p className="text-[9px] text-ink-muted" title={copy.videoDesatualizadoHint}>
          {copy.videoDesatualizado}
        </p>
      ) : null}

      {cena.videoErro ? <Falha erro={cena.videoErro} recusasSeguidas={0} /> : null}

      {/*
        Um webhook que não chega não trava um node: trava as cenas DE BAIXO.
        Por isso o botão que o bloco Gerar Vídeo tem desde o Ciclo 1 aparece
        aqui também, e pelo mesmo relógio de 90 segundos.
      */}
      {/*
        ── O ↻ DO VÍDEO — D7, segunda metade, 29/08/2026 ──────────────────

        Ele MARCA e não gasta: a soma e a autorização continuam no portão, que
        é o único lugar do bloco onde sai Spark (invariante 12). Aparece só com
        clipe pronto — sem clipe a cena já está no lote comum, e dois caminhos
        para a mesma coisa é a segunda chance de eles discordarem.
      */}
      {cena.videoAssetId ? (
        <button
          type="button"
          onClick={onMarcarRefazer}
          title={marcada ? copy.refazerClipeMarcadaHint : copy.refazerClipeHint}
          className={`nodrag mt-1 w-full rounded border py-0.5 text-[9px] transition-colors
                      ${
                        marcada
                          ? "border-accent/50 text-accent"
                          : "border-line text-ink-muted hover:border-line-strong"
                      }`}
        >
          {marcada ? copy.refazerClipeMarcada : copy.refazerClipe}
        </button>
      ) : null}

      {cena.videoGeracaoId && (cena.videoIdadeSegundos ?? 0) >= SEGUNDOS_ATE_VERIFICAR ? (
        <button
          type="button"
          onClick={() => cena.videoGeracaoId && onVerificar(cena.videoGeracaoId)}
          disabled={verificando === cena.videoGeracaoId}
          title={copy.videoVerificarHint}
          className="nodrag mt-1 w-full rounded border border-line py-0.5 text-[9px] text-ink-muted
                     transition-colors hover:border-line-strong disabled:opacity-40"
        >
          {copy.videoVerificar}
        </button>
      ) : null}

      {/*
        A falha diz O QUE FOI e O QUE FAZER — nunca só "recusada".
        O texto cru do provedor vai para o `title`, onde quem investiga o acha, e
        fora da frase principal, onde ele só assustaria.
      */}
      {cena.erro ? <Falha erro={cena.erro} recusasSeguidas={cena.recusasSeguidas} /> : null}

      {/* ── As ações da cena. Continuação não tem nenhuma. ────────────────── */}
      {continuacao ? null : repetindo ? (
        <div className="mt-1 space-y-1">
          <input
            value={instrucao}
            onChange={(event) => onInstrucao(event.target.value)}
            placeholder={copy.repetirInstrucaoPlaceholder}
            title={copy.repetirInstrucaoHint}
            className="nodrag w-full rounded border border-line bg-canvas px-1 py-0.5 text-[9px]
                       text-ink placeholder:text-ink-faint"
          />
          <div className="flex gap-1">
            <button
              type="button"
              onClick={onConfirmarRepetir}
              className="nodrag flex-1 rounded bg-accent py-0.5 text-[9px] text-canvas"
            >
              {copy.repetirConfirmar}
            </button>
            <button
              type="button"
              onClick={onCancelarRepetir}
              className="nodrag rounded border border-line px-1 py-0.5 text-[9px] text-ink-muted"
            >
              {copy.repetirCancelar}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-1 flex gap-1">
          <button
            type="button"
            onClick={onAbrirRepetir}
            disabled={gerando}
            title={copy.repetir}
            className="nodrag flex-1 rounded border border-line py-0.5 text-[9px] text-ink-muted
                       transition-colors hover:border-line-strong disabled:opacity-40"
          >
            ↻
          </button>
          <button
            type="button"
            onClick={onAprovar}
            disabled={cena.estado !== "pronta"}
            title={copy.aprovarCena}
            className="nodrag flex-1 rounded border border-line py-0.5 text-[9px] text-ink-muted
                       transition-colors hover:border-line-strong disabled:opacity-40"
          >
            ✓
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * A partir de quantos segundos o botão de verificar aparece.
 *
 * Noventa, o mesmo do bloco Gerar Vídeo: um clipe de 5s leva de 60 a 180, e
 * oferecer conserto para o que está funcionando ensina a desconfiar do normal.
 */
const SEGUNDOS_ATE_VERIFICAR = 90;

/**
 * O que dizer sobre o vídeo desta cena — **uma frase por situação**.
 *
 * Ela lê o MESMO `situacao` que o motorista obedece. Uma segunda leitura, feita
 * aqui só para desenhar, seria a tela e a máquina discordando sobre a mesma
 * cena — e discordando exatamente no instante em que alguém está decidindo se
 * clica num botão que gasta.
 */
function fraseDoVideo(linha: LinhaDoPlano): { texto: string; hint: string; tom: string } {
  const { situacao } = linha;
  const faint = "text-ink-faint";
  const aviso = "text-warning";

  if (situacao.anima) {
    return situacao.esperaDe === null
      ? { texto: copy.videoNoLote, hint: copy.videoNoLoteHint, tom: faint }
      : {
          texto: copy.videoEsperaDe(situacao.esperaDe),
          hint: copy.videoEsperaDeHint(situacao.esperaDe),
          tom: faint,
        };
  }

  switch (situacao.motivo) {
    case "duracao_fora_do_catalogo":
      return {
        texto: copy.videoDuracaoFora(situacao.duracao),
        hint: copy.videoDuracaoForaHint(situacao.duracao),
        tom: aviso,
      };
    case "cadeia_parada":
      return {
        texto: copy.videoCadeiaParada(situacao.de),
        hint: copy.videoCadeiaParadaHint(situacao.de),
        tom: aviso,
      };
    case "cadeia_sem_aprovacao":
      return {
        texto: copy.videoCadeiaSemAprovacao(situacao.raiz),
        hint: copy.videoCadeiaSemAprovacaoHint(situacao.raiz),
        tom: faint,
      };
    case "ja_tem_video":
      return { texto: copy.videoMotivos.ja_tem_video, hint: "", tom: "text-positive" };
    case "falhou_no_lote":
      return { texto: copy.videoMotivos.falhou_no_lote, hint: "", tom: aviso };
    case "fora_do_lote":
      return {
        texto: copy.videoMotivos.fora_do_lote,
        hint: copy.videoForaDoLoteHint,
        tom: faint,
      };
    default:
      return { texto: copy.videoMotivos[situacao.motivo] ?? "", hint: "", tom: faint };
  }
}

/**
 * Por que a cena não saiu — uma frase, um gesto, e o cru no tooltip.
 *
 * A classificação é do `machine-state`, e é pura: ela roda fora do React e se
 * prova por tabela-verdade, inclusive contra a armadilha do `b-locked`.
 */
function Falha({ erro, recusasSeguidas }: { erro: string; recusasSeguidas: number }) {
  const tipo = classificarFalha(erro);
  const classe = copy.falhas[tipo] ?? copy.falhas.desconhecida;
  const gesto = copy.gestos[gestoDaFalha(tipo, recusasSeguidas)];

  return (
    <p
      className="mt-0.5 text-[9px] leading-tight text-warning"
      title={`${classe.frase} ${gesto}\n\n${copy.erroCru(erro)}`}
    >
      <span className="font-medium">{classe.selo}</span>
      <span className="block text-ink-faint">
        {recusasSeguidas >= 3 ? copy.recusouTresVezes : gesto}
      </span>
    </p>
  );
}

/** O que a rota devolve quando deu certo — só o que a tela usa. */
type MontagemOk = {
  ok: true;
  assetId: string;
  bytes: number;
  largura: number;
  altura: number;
  duracaoSegundos: number;
};

/**
 * A recusa da montagem virando frase — e cada uma diz **o que consertar**.
 *
 * O caso que justifica o resto: `assinatura_destoante` nomeia o clipe **e** o
 * que difere. *"Não deu para montar"* mandaria a pessoa adivinhar qual dos dez
 * — e a Fase 0 mediu que nenhuma biblioteca recusa isso sozinha, então a
 * alternativa a esta frase não é uma frase pior: é um arquivo silenciosamente
 * errado.
 *
 * Lê `unknown` de propósito. O corpo vem da rede, e a tela é fronteira: um
 * `as` aqui seria a tela jurando o formato de uma coisa que ela não controla.
 */
function fraseDaRecusa(recusado: unknown): string {
  if (!recusado || typeof recusado !== "object" || !("motivo" in recusado)) {
    return copy.montarFalhou;
  }

  const motivo = (recusado as { motivo: unknown }).motivo;

  if (motivo === "faltam_clipes") {
    const { faltam, total } = recusado as unknown as { faltam: number; total: number };
    return copy.montarFaltam(faltam, total);
  }

  if (motivo !== "recusa_da_montagem" || !("recusa" in recusado)) return copy.montarFalhou;

  const recusa = (recusado as unknown as { recusa: RecusaDeMontagem }).recusa;

  if (recusa.motivo === "assinatura_destoante") {
    return copy.montarDestoante(recusa.rotulo, recusa.diferencas.join(", "));
  }

  if (recusa.motivo === "excede_o_bucket") {
    return copy.montarPesado(
      (recusa.bytes / 1048576).toFixed(1),
      (recusa.limite / 1048576).toFixed(0),
    );
  }

  if (recusa.motivo === "clipe_ilegivel" || recusa.motivo === "sem_trilha_de_video") {
    return copy.montarIlegivel(recusa.rotulo);
  }

  return copy.montarFalhou;
}
