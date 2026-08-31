/**
 * O que um bloco Gerar Vídeo pede, e o que ele recebe de volta.
 *
 * ---------------------------------------------------------------------------
 * A diferença que muda tudo em relação ao contrato de imagem
 * ---------------------------------------------------------------------------
 *
 * `requestGeneration` de imagem devolve **a imagem**. Esta devolve **um número
 * de protocolo**, e é aí que a invariante 1 deixa de ser texto: uma imagem cabe
 * no `maxDuration` de 60, um vídeo não cabe em tempo nenhum de função.
 *
 * O sucesso aqui significa apenas *"o trabalho foi aceito e está na fila do
 * provedor"*. Quem diz que ficou pronto é o webhook, e quem conta para a tela é
 * o Realtime — a mesma peça que a fila de imagens já pôs no ar em 13/08/2026.
 *
 * Consequência que vale dizer em voz alta: **`ok: true` não quer dizer que
 * alguém foi cobrado.** Nada é cobrado na submissão. O `sparksToCharge` abaixo é
 * o preço que *será* cobrado se o vídeo existir, e ele viaja para a tela poder
 * repetir depois do clique o mesmo número que disse antes dele.
 */

/** Um vídeo pedido. Sem quantidade: um clique, um vídeo, neste ciclo. */
export type VideoGenerationRequest = {
  projectId: string;
  nodeId: string;
  /** Opcional — o Kling anima a imagem mesmo sem direção de cena. */
  prompt: string;
  modelId: string;
  /** A imagem de partida, que chega **por fio**, de um Input ou de um Resultado. */
  sourceAssetId: string;
  /** Travado em 5 pelo catálogo, não por esta linha. */
  durationSeconds: number;
  /**
   * De qual ficha de cena este clipe é — Ciclo 3 · Fase 3.
   *
   * Só o **id** viaja, e é de propósito: é a divisão de 10/08 no seu caso mais
   * estrito — quem chama aponta uma linha, nunca escreve um nome. A descrição do
   * extrato ("Vídeo · cena 3 de «Luna testa o gloss»") é composta no banco, por
   * `complete_video_generation`, a partir desta seta.
   *
   * Ausente num vídeo comum do bloco Gerar Vídeo, que não sabe de cena nenhuma.
   */
  scene?: { id: string } | null;
};

export type VideoGenerationFailure =
  | "invalid"
  | "unauthenticated"
  | "not_configured"
  /**
   * A `FAL_WEBHOOK_URL` não está no ambiente.
   *
   * Recusa **antes** de enfileirar, e é o cinto de segurança do ciclo: sem
   * endereço de retorno, o trabalho seria aceito pela fal, geraria, cobraria
   * **nós** — e ninguém aqui jamais saberia. Um erro visível vale mais que um
   * vídeo pago que não chega.
   */
  | "webhook_not_configured"
  /**
   * A `FAL_WEBHOOK_URL` existe, mas **não aponta para o endpoint de retorno**.
   *
   * Nasceu de um estrago medido em 28/08/2026: quatro vídeos pagos foram
   * submetidos com uma URL de retorno que não era a nossa, e **nenhum voltou** —
   * os quatro tiveram de ser fechados à mão, quinze minutos depois. A trava de
   * presença não bastava: uma variável **presente e errada** custa exatamente o
   * mesmo que uma ausente, com a diferença de que ela não avisa.
   *
   * Recusar é melhor do que consertar em silêncio: uma URL que a casa completa
   * sozinha seria dois formatos válidos, e a documentação teria de descrever os
   * dois para sempre.
   */
  | "webhook_url_invalid"
  | "insufficient_balance"
  /** Sem imagem no fio. O Kling é image-to-video: sem still não há o que animar. */
  | "no_source_image"
  | "missing_reference"
  /**
   * Há um `@` no prompt. O Kling recebe **uma** imagem, e ela já é a personagem
   * — uma menção anexaria uma segunda folha que não tem para onde ir. Recusar
   * com a frase certa é melhor do que aceitar e ignorar em silêncio, que seria
   * cobrar por uma geração que não fez o que a frase pedia.
   */
  | "mention_not_supported"
  | "unsupported_duration"
  /**
   * A ficha apontada não existe, não é de quem pediu, ou não é deste projeto.
   *
   * Irmão do `unknown_scene` da imagem, e o banco recusa de qualquer jeito
   * (VD008): a diferença é que aqui a recusa vira uma frase que a tela mostra,
   * em vez de uma mensagem de constraint que ninguém consegue ler.
   */
  | "unknown_scene"
  | "translation_failed"
  | "refused"
  /** A conta do fornecedor está travada — o erro nomeado do item 7 do briefing. */
  | "provider_account"
  | "error";

export type VideoGenerationResult =
  | {
      ok: true;
      generationId: string;
      /** O protocolo da fal, para a tela poder pedir reconciliação depois. */
      providerJobId: string;
      /** O que **será** cobrado quando o vídeo existir. Nada foi cobrado ainda. */
      sparksToCharge: number;
      balanceSparks: number;
    }
  | {
      ok: false;
      reason: VideoGenerationFailure;
      neededSparks?: number;
      balanceSparks?: number;
      /** A frase do provedor, quando houver — a tela é o manual. */
      detail?: string;
    };

/** O que a reconciliação responde quando alguém pergunta "e aí?". */
export type VideoReconcileResult =
  | { ok: true; status: "pending" }
  | { ok: true; status: "succeeded"; assetId: string; sparksCharged: number }
  | { ok: true; status: "failed"; detail: string }
  | { ok: false; reason: "invalid" | "unauthenticated" | "not_found" | "error" };

/**
 * O caminho do nosso endpoint de retorno.
 *
 * Constante porque duas peças precisam concordar sobre ele: a rota que atende
 * (`app/api/webhooks/fal/route.ts`) e a **trava de forma** que confere se a
 * `FAL_WEBHOOK_URL` aponta mesmo para cá. Escrito duas vezes, seria escrito
 * diferente uma vez.
 */
export const FAL_WEBHOOK_PATH = "/api/webhooks/fal";

export const VIDEO_GENERATE_ENDPOINT = "/api/generations/video";
export const VIDEO_RECONCILE_ENDPOINT = "/api/generations/video/reconcile";

/**
 * Um vídeo, pedido por HTTP. Nunca lança — mesma razão do contrato de imagem:
 * rede que caiu e provedor que recusou são o mesmo tipo de evento para a
 * caixinha que chamou, e não uma exceção para desenrolar.
 */
export async function requestVideoGeneration(
  request: VideoGenerationRequest,
): Promise<VideoGenerationResult> {
  try {
    const response = await fetch(VIDEO_GENERATE_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      return { ok: false, reason: response.status === 401 ? "unauthenticated" : "error" };
    }

    return (await response.json()) as VideoGenerationResult;
  } catch {
    return { ok: false, reason: "error" };
  }
}

/** "Verificar agora" — o botão que impede um node de ficar Gerando para sempre. */
export async function reconcileVideo(generationId: string): Promise<VideoReconcileResult> {
  try {
    const response = await fetch(VIDEO_RECONCILE_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ generationId }),
    });

    if (!response.ok) {
      return { ok: false, reason: response.status === 401 ? "unauthenticated" : "error" };
    }

    return (await response.json()) as VideoReconcileResult;
  } catch {
    return { ok: false, reason: "error" };
  }
}

export const VIDEO_WEBHOOK_ALIVE_ENDPOINT = "/api/generations/video/webhook-alive";

/**
 * O que o portão pergunta antes de autorizar o primeiro Spark.
 *
 * Nunca lança, como as duas acima. E o **fracasso conta como morto**: se nem
 * chegamos a perguntar, não há motivo para apostar que o retorno funcionaria —
 * a trava existe justamente para o caso em que ninguém vai descobrir o contrário
 * até a fatura chegar.
 */
export async function checkWebhookAlive(): Promise<WebhookAliveCheck> {
  try {
    const response = await fetch(VIDEO_WEBHOOK_ALIVE_ENDPOINT, { method: "POST" });

    if (!response.ok) return { vivo: false, motivo: "sem_resposta" };

    return (await response.json()) as WebhookAliveCheck;
  } catch {
    return { vivo: false, motivo: "sem_resposta" };
  }
}

export type WebhookAliveCheck =
  | { vivo: true }
  | {
      vivo: false;
      motivo: "nao_configurado" | "forma_invalida" | "sem_resposta" | "unauthenticated";
      status?: number;
    };
