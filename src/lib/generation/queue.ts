import { create, type StoreApi } from "zustand";

import {
  requestGeneration,
  type CanvasGenerationRequest,
  type CanvasGenerationResult,
} from "@/lib/generation/canvas-contract";
import { useBalance } from "@/lib/sparks/balance-store";

/**
 * A fila de um bloco de geração — o que o botão parou de travar.
 *
 * ---------------------------------------------------------------------------
 * Fila é intenção; ledger é fato
 * ---------------------------------------------------------------------------
 *
 * Esta é a regra que decide o desenho inteiro, e ela é de dinheiro: **um slot só
 * vira requisição no instante em que entra em execução.** Enfileirar não chama
 * ninguém, não escreve linha nenhuma e não reserva um centavo — enfileirar é
 * alguém dizendo o que quer.
 *
 * O que isso compra é grande e é de graça: as duas regras mais delicadas da fila
 * já eram verdade do lado do servidor, e continuam sendo sem uma linha nova no
 * caminho do dinheiro. `record_generation` é chamado depois de a imagem existir,
 * então **o débito acontece por imagem executada**; e a conferência de saldo roda
 * no início de *toda* requisição, então **o saldo é conferido de novo na vez de
 * cada slot** — quem entra em execução sem saldo volta recusado, sem lançamento,
 * e a fila segue. Nada disso precisou ser inventado aqui: precisou não ser
 * atrapalhado.
 *
 * ---------------------------------------------------------------------------
 * Por que a fila mora fora do componente
 * ---------------------------------------------------------------------------
 *
 * O estúdio monta o canvas com `key={activeProjectId}`: **trocar de aba de
 * projeto remonta tudo** e mataria qualquer `useState` de node. Os trabalhos em
 * voo continuariam correndo e cobrando no servidor, invisíveis — cobrado e
 * invisível é o pior estado possível. Num módulo, a fila sobrevive à troca de
 * aba, à ida ao dashboard e à volta.
 *
 * E emphaticamente **não** nos dados do node: `updateNodeData` marca o canvas
 * como sujo e o autosave grava no workflow, então a fila de hoje viraria parte
 * do documento e reapareceria amanhã. É a mesma razão pela qual a recusa de um
 * fio virou `notice` efêmero em vez de morar no grafo.
 *
 * ---------------------------------------------------------------------------
 * Esta fila é da imagem, e o vídeo NÃO a herdou
 * ---------------------------------------------------------------------------
 *
 * Aqui morava uma previsão — *"`runSlot` é o único ponto que conhece o
 * transporte, e no dia do vídeo ele vira `fetch → linha queued → webhook →
 * Realtime`"*. **O dia do vídeo chegou em 13/08/2026 e a previsão foi revogada**
 * (decisão registrada em `docs/decisoes.md`), então ela sai daqui em vez de
 * ficar prometendo um caminho que ninguém vai percorrer.
 *
 * O que a fila do vídeo mostrou é que os dois casos são **opostos**, e não o
 * mesmo caso com transportes diferentes:
 *
 *   imagem   a intenção de gerar quatro só existe no navegador até cada
 *            requisição sair. O banco não sabe o que foi pedido enquanto não é
 *            feito — então alguém do lado de cá precisa lembrar, e é esta fila
 *   vídeo    a linha nasce `queued` **antes** de o provedor ser chamado. O banco
 *            já sabe, e melhor: sobrevive ao reload, à troca de aba e ao webhook
 *            que chega com a aba fechada
 *
 * Generalizar `runSlot` para os dois teria dado ao vídeo uma **segunda cópia**
 * do estado que o banco guarda melhor — e duas cópias divergem no pior momento,
 * que aqui é o de um trabalho pago terminando sem ninguém olhando. Por isso o
 * bloco de vídeo não tem fila de cliente nenhuma: ele lê o banco e o Realtime
 * diz quando reler (`video-generator-node.tsx`).
 *
 * `runSlot` continua sendo o único ponto que conhece o transporte **desta**
 * fila, e isso segue valendo. O que não vale é tratar isso como o desenho
 * universal: um transporte assíncrono não precisa de fila no cliente, precisa do
 * contrário.
 */

/**
 * Quantas imagens correm ao mesmo tempo num bloco.
 *
 * Conta **imagens, não trabalhos**: um clique de quantidade 4 ocupa o teto
 * inteiro sozinho, e dois cliques de 2 ocupam o mesmo tanto. O que satura é o
 * provedor e a atenção de quem olha, e nenhum dos dois sabe o que é um clique.
 *
 * Teto de cliente, e vale dizer o que ele **não** é: um navegador adulterado
 * dispararia mais. O prejuízo seria dele, em Sparks próprios, e cada imagem
 * continuaria cobrada pelo catálogo — o dinheiro está travado no banco, não
 * aqui. Este número protege o ritmo, não a carteira.
 */
export const MAX_CONCURRENT_IMAGES = 4;

/**
 * Quantas imagens podem estar **vivas** — esperando ou executando — num bloco.
 *
 * Dezesseis porque dezesseis é a grade (decisão do Jorge, 13/08/2026): a fila é
 * exatamente o que a coluna de resultados consegue mostrar, e a caixinha vazia
 * é a prova visual do que ainda cabe. **O histórico não consome vaga**: ele
 * entra depois dos vivos e o que não couber transborda para o "Ver todas".
 */
export const MAX_LIVE_IMAGES = 16;

export type QueueSlotStatus = "queued" | "running" | "ready" | "failed";

/**
 * Uma imagem pedida, com o retrato do pedido dela.
 *
 * O `request` é **congelado no clique** e nunca mais tocado — é o que permite
 * reconfigurar o bloco enquanto a fila anda sem contaminar o que já foi pedido.
 */
export type QueueSlot = {
  id: string;
  status: QueueSlotStatus;
  request: CanvasGenerationRequest;
  /**
   * De quem é este slot — a Máquina põe aqui o id da cena.
   *
   * Viaja DENTRO do slot, e não num mapa paralelo, porque o slot já é o retrato
   * congelado do pedido: um dicionário ao lado seria uma segunda cópia da mesma
   * associação, com uma chance a mais de sobreviver a um remount sem o slot que
   * ela descreve. O bloco Gerar Imagem não usa este campo e não mudou por ele.
   */
  tag?: string;
  /**
   * O que fazer quando este slot cair — de pé ou não.
   *
   * É o que faz o desfecho de uma cena **sobreviver à sessão**: sem ele, o único
   * lugar que sabe que a cena 3 falhou é a memória do navegador, e o requisito 4
   * do Ciclo 3 diz o contrário. A Máquina grava aqui; o bloco de imagem não
   * passa nada e continua exatamente como estava.
   *
   * Nunca lança: quem chama trata o próprio erro. Uma exceção aqui derrubaria o
   * `pump` e os slots seguintes junto — e um desfecho não gravado não pode
   * impedir os outros de acontecerem.
   */
  onSettled?: (slot: QueueSlot) => void;
  /** A resposta, qualquer que tenha sido. Null enquanto não chegou. */
  result: CanvasGenerationResult | null;
  /**
   * Em que ordem este slot terminou — um contador, não um relógio.
   *
   * Quatro imagens disparadas juntas voltam na ordem do provedor, que não é a
   * ordem em que foram pedidas. A moldura mostra **a última que chegou**, e sem
   * este número ela mostraria "a primeira da lista": quando a slot 1 finalmente
   * voltasse, a moldura trocaria de imagem sozinha, depois de a pessoa já estar
   * olhando para a slot 3. Contador e não `Date.now()` porque a pergunta é de
   * ordem, e duas respostas no mesmo milissegundo empatariam.
   */
  settledOrder: number | null;
};

/** Monotônico por sessão. Só compara consigo mesmo, então nunca precisa zerar. */
let settleCounter = 0;

type QueueState = {
  /** Por id de node. Mais recente primeiro, que é a ordem da grade. */
  byNode: Record<string, QueueSlot[]>;
  /**
   * Põe `quantity` imagens na fila deste bloco — **tudo ou nada**.
   *
   * Devolve `false` sem enfileirar nada quando o clique inteiro não cabe. Meia
   * quantidade seria a mesma mentira do meio-produto: pedir três e receber duas
   * em silêncio é a tela decidindo por quem clicou.
   */
  enqueue: (input: {
    nodeId: string;
    request: CanvasGenerationRequest;
    quantity: number;
    tag?: string;
    onSettled?: (slot: QueueSlot) => void;
  }) => boolean;
};

/** Quantas imagens deste bloco estão esperando ou executando. */
export function liveCount(slots: readonly QueueSlot[] | undefined): number {
  if (!slots) return 0;

  return slots.filter((slot) => slot.status === "queued" || slot.status === "running").length;
}

/** Quantas ainda cabem — o número que o botão comunica antes do clique. */
export function freeSlots(slots: readonly QueueSlot[] | undefined): number {
  return Math.max(0, MAX_LIVE_IMAGES - liveCount(slots));
}

export const useQueue = create<QueueState>((set, get) => ({
  byNode: {},

  enqueue: ({ nodeId, request, quantity, tag, onSettled }) => {
    const current = get().byNode[nodeId] ?? [];

    if (quantity < 1 || quantity > freeSlots(current)) return false;

    /**
     * O retrato do pedido.
     *
     * `structuredClone` e não a referência: sem isto, um card de input editado
     * entre dois cliques mudaria o que o trabalho **já enfileirado** vai mandar.
     * Hoje o store do canvas substitui os arrays em vez de mutá-los, então a
     * referência provavelmente bastaria — "provavelmente" não é o padrão desta
     * casa para uma geração paga, e a garantia custa uma linha.
     */
    const frozen = structuredClone(request);

    const fresh: QueueSlot[] = Array.from({ length: quantity }, () => ({
      id: crypto.randomUUID(),
      status: "queued",
      request: frozen,
      result: null,
      settledOrder: null,
      tag,
      onSettled,
    }));

    set((state) => ({
      byNode: {
        ...state.byNode,
        // Os novos na frente (a grade lê do mais recente para o mais velho), e
        // os terminais da leva anterior saem: eles já estão no banco, e o
        // histórico da coluna os traz de volta pelo caminho certo. Uma leva nova
        // é o resultado da vez.
        [nodeId]: [...fresh, ...(state.byNode[nodeId] ?? []).filter(isLive)],
      },
    }));

    pump(nodeId, set, get);

    return true;
  },
}));

function isLive(slot: QueueSlot): boolean {
  return slot.status === "queued" || slot.status === "running";
}

type Set = StoreApi<QueueState>["setState"];
type Get = StoreApi<QueueState>["getState"];

/**
 * Serve a fila até o teto, do pedido mais antigo para o mais novo.
 *
 * Chamado ao enfileirar e ao terminar cada slot, que são os dois únicos momentos
 * em que a resposta pode mudar. Sem relógio e sem laço: quem termina é quem
 * chama o próximo.
 */
function pump(nodeId: string, set: Set, get: Get): void {
  const slots = get().byNode[nodeId] ?? [];
  const running = slots.filter((slot) => slot.status === "running").length;

  let free = MAX_CONCURRENT_IMAGES - running;

  if (free <= 0) return;

  // De trás para a frente: a lista é do mais novo para o mais velho, então o
  // fim dela é o pedido mais antigo — e quem pediu primeiro corre primeiro.
  for (let index = slots.length - 1; index >= 0 && free > 0; index -= 1) {
    const slot = slots[index];

    if (slot.status !== "queued") continue;

    free -= 1;
    void runSlot(nodeId, slot.id, set, get);
  }
}

/**
 * Um slot, do "queued" ao fim — **e é aqui que a imagem passa a custar**.
 *
 * A requisição sai agora, não no clique, e é por isso que o débito acontece na
 * execução e o saldo é conferido na vez deste slot: quem faz as duas coisas é o
 * servidor, dentro desta chamada.
 */
async function runSlot(nodeId: string, slotId: string, set: Set, get: Get): Promise<void> {
  const slot = (get().byNode[nodeId] ?? []).find((entry) => entry.id === slotId);

  if (!slot || slot.status !== "queued") return;

  patchSlot(nodeId, slotId, { status: "running" }, set);

  // Nunca lança: uma rede que caiu e um provedor que recusou são o mesmo tipo
  // de evento para a fila — algo a dizer numa caixinha, não uma exceção a
  // desenrolar por cima dos outros slots.
  const result = await requestGeneration(slot.request);

  settleCounter += 1;

  patchSlot(
    nodeId,
    slotId,
    { status: result.ok ? "ready" : "failed", result, settledOrder: settleCounter },
    set,
  );

  // O que esta imagem cobrou, tirado quando ela cai. Subtrair as cobranças em
  // vez de confiar no `balanceSparks` de cada resposta é o que faz várias ao
  // mesmo tempo fecharem a conta — ver o comentário do balance-store.
  if (result.ok) useBalance.getState().spend(result.sparksCharged);

  // O desfecho, entregue a quem pediu — com o slot já atualizado, para o
  // callback ler `status` e `result` em vez de reconstruí-los.
  //
  // Protegido: um erro aqui não pode derrubar o `pump` e levar os slots
  // seguintes junto. Gravar o desfecho de uma cena é importante; impedir as
  // outras de acontecerem por causa disso, não.
  const caido = (get().byNode[nodeId] ?? []).find((entry) => entry.id === slotId);

  if (caido?.onSettled) {
    try {
      caido.onSettled(caido);
    } catch {
      // Silêncio deliberado: quem passou o callback é quem sabe o que fazer com
      // a falha dele, e a fila não tem opinião sobre isso.
    }
  }

  pump(nodeId, set, get);
}

function patchSlot(
  nodeId: string,
  slotId: string,
  patch: Partial<QueueSlot>,
  set: Set,
): void {
  set((state) => {
    const slots = state.byNode[nodeId];

    if (!slots) return state;

    return {
      byNode: {
        ...state.byNode,
        [nodeId]: slots.map((slot) => (slot.id === slotId ? { ...slot, ...patch } : slot)),
      },
    };
  });
}
