import type { Canal, Cena, Historia, JobKind } from "@/lib/storyboard/contract";

/**
 * O que o bloco de Roteiro pede, o que ele recebe de volta, e como pede.
 *
 * Rota e não Server Action, pela razão que o bloco de imagem já registrou: um
 * Route Handler é um endpoint HTTP comum, e não depende do despachante do React
 * — que serializa chamadas. Aqui isso importa menos que na imagem (não há
 * "quantidade 4" de roteiro), mas a simetria vale por si: dois motores de
 * geração com duas formas de serem chamados seriam duas formas de errar.
 *
 * A postura de segurança é a mesma dos dois lados: Server Action **também** é
 * endpoint público, então a sessão é reconferida, o corpo passa por Zod e o RLS
 * escopa cada leitura de qualquer jeito.
 */

/** Quem está em cena, como o navegador sabe. Só o handle viaja — nunca a versão. */
export type StoryboardCharacterPayload = {
  /**
   * O handle **sem** o `@`, ou nulo para um roteiro de produto.
   *
   * O navegador manda o handle e nada mais. Qual versão congelada ele nomeia é
   * decisão que só o servidor pode tomar (regra 2 do versionamento) — e aqui
   * ela nem chega a ser tomada, porque uma ficha guarda o handle de propósito:
   * uma ficha é um PLANO, e quem resolve `@luna` para um retrato é o servidor
   * no momento da geração da imagem, não agora.
   */
  handle: string;
};

/** Pedir um roteiro novo a partir de uma ideia — job_kind `roteiro`. */
export type StoryboardRoteiroRequest = {
  job: "roteiro";
  projectId: string;
  nodeId: string;
  ideia: string;
  canal: Canal;
  modelId: string;
  cenas: number;
  personagem: StoryboardCharacterPayload | null;
  produto: string | null;
};

/** Estruturar um roteiro colado — job_kind `estruturar`. */
export type StoryboardEstruturarRequest = {
  job: "estruturar";
  projectId: string;
  nodeId: string;
  texto: string;
  canal: Canal;
  modelId: string;
  personagem: StoryboardCharacterPayload | null;
  produto: string | null;
};

/** Reescrever uma ficha com instrução — job_kind `cena`. */
export type StoryboardCenaRequest = {
  job: "cena";
  projectId: string;
  nodeId: string;
  /** Qual ficha, pela posição dela no roteiro que já está gravado. */
  ordem: number;
  instrucao: string;
  modelId: string;
};

export type StoryboardGenerationRequest =
  | StoryboardRoteiroRequest
  | StoryboardEstruturarRequest
  | StoryboardCenaRequest;

export type StoryboardGenerationFailure =
  | "invalid"
  | "unauthenticated"
  | "not_configured"
  | "insufficient_balance"
  /** Ideia ou texto vazio: não há o que roteirizar, e cobrar por isso seria roubo. */
  | "empty_request"
  | "unknown_handle"
  /**
   * A personagem existe e é do usuário, mas não trabalha **neste** projeto.
   * Mesma recusa da Etapa D2, e pelo mesmo motivo: a lista de sugestões esconde
   * quem não está vinculada, e a interface não é fronteira de segurança.
   */
  | "not_linked"
  /**
   * Ela está no projeto e ainda não tem versão salva.
   *
   * Recusar aqui é escolha, e vale dizer por quê: uma ficha guarda handle, não
   * versão, então tecnicamente um roteiro poderia ser escrito para quem nunca
   * congelou nada. Só que a ficha existe para virar imagem, e a imagem vai
   * exigir a versão — deixar passar seria empurrar a recusa para depois do
   * roteiro pago, o que é precisamente o que a ordem desta fase existe para
   * evitar.
   */
  | "no_version"
  /** O catálogo não vende este trabalho neste modelo (o GN007, antes de custar). */
  | "unsupported_job"
  /** O roteiro pedido não existe, ou a cena pedida não está nele. */
  | "storyboard_not_found"
  | "scene_not_found"
  /** O modelo respondeu, e o que veio não pode ser gravado. Falha grátis. */
  | "invalid_answer"
  | "refused"
  | "error";

export type StoryboardGenerationResult =
  | {
      ok: true;
      generationId: string;
      storyboardId: string;
      historia: Historia;
      cenas: Cena[];
      sparksCharged: number;
      balanceSparks: number;
      /**
       * Houve condensação? Decidido pela CONTA, nunca pela frase.
       *
       * `cenas_no_original > cenas.length` é o fato; `historia.ajuste` é a
       * ilustração dele. Nasceu do defeito da Fase 0 em que o modelo declarou
       * "condensado de 6 para 6" — e a correção não foi confiar melhor na prosa,
       * foi parar de confiar nela.
       */
      condensou: boolean;
    }
  | {
      ok: false;
      reason: StoryboardGenerationFailure;
      /** O handle que não resolveu, para a mensagem poder nomeá-lo. */
      handle?: string;
      neededSparks?: number;
      balanceSparks?: number;
      /** O que o Zod recusou, quando foi ele quem recusou. */
      detalhe?: string;
    };

/** Qual job_kind do catálogo cada pedido compra. */
export function jobKindOf(request: StoryboardGenerationRequest): JobKind {
  return request.job;
}

export const STORYBOARD_GENERATE_ENDPOINT = "/api/storyboards/generate";

/**
 * Um roteiro, pedido por HTTP.
 *
 * Nunca lança, pela mesma razão do bloco de imagem: uma rede que caiu e um
 * provedor que recusou são o mesmo tipo de evento para quem chamou — uma frase
 * a dizer na tela, não uma exceção a desenrolar.
 */
export async function requestStoryboard(
  request: StoryboardGenerationRequest,
): Promise<StoryboardGenerationResult> {
  try {
    const response = await fetch(STORYBOARD_GENERATE_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      return { ok: false, reason: response.status === 401 ? "unauthenticated" : "error" };
    }

    return (await response.json()) as StoryboardGenerationResult;
  } catch {
    return { ok: false, reason: "error" };
  }
}
