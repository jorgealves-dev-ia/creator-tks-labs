import { NextResponse } from "next/server";

import { completeVideoGeneration } from "@/lib/generation/video-complete";
import { readWebhookHeaders, verifyWebhook } from "@/lib/providers/fal-queue";
import { falVideoProvider } from "@/lib/providers/fal";

/**
 * O retorno da fal — o único endpoint público deste produto que não tem sessão.
 *
 * ---------------------------------------------------------------------------
 * A fechadura vem antes de tudo
 * ---------------------------------------------------------------------------
 *
 * Qualquer um na internet pode chamar este endereço. A regra 5 da segurança é
 * literal: **sem assinatura válida, responde erro e não toca no banco.** Por
 * isso a verificação é a primeira coisa depois de ler o corpo, antes de abrir
 * cliente nenhum.
 *
 * ---------------------------------------------------------------------------
 * O corpo BRUTO, e a armadilha de lê-lo duas vezes
 * ---------------------------------------------------------------------------
 *
 * A assinatura cobre `sha256(corpo bruto)`, então o hash tem que ser sobre os
 * bytes que chegaram. `await request.text()` no App Router devolve exatamente
 * isso — não existe `bodyParser` aqui, aquilo era o Pages Router.
 *
 * O que existe é a armadilha do outro lado: o corpo é um **stream lido uma vez
 * só**. Chamar `request.json()` depois de `request.text()` lança, e — pior —
 * fazer `JSON.parse` e voltar a `JSON.stringify` produziria bytes diferentes
 * (chaves reordenadas, espaços perdidos) e derrubaria toda entrega legítima por
 * assinatura inválida. Por isso lê-se `text()` uma vez, verifica-se sobre
 * aquela string, e o JSON sai **dela**.
 *
 * O proxy já ignora `api/webhooks` no matcher, então ninguém toca no corpo antes
 * daqui.
 */

/**
 * O irmão gêmeo do achado do Ciclo Dashboard, e a razão de estar escrito aqui.
 *
 * Sem esta linha a rota herda o padrão de 10 segundos, e esta rota **baixa um
 * vídeo** e o sobe para o Storage. Ela morreria no meio, em silêncio, e o
 * sintoma seria um node preso em "Gerando" com o vídeo já pago do outro lado —
 * exatamente o buraco que a fila de reentregas da fal esconderia por trinta e
 * uma tentativas antes de alguém desconfiar.
 *
 * Foi a mesma classe de erro que quase custou o motor de extração quando o
 * canvas mudou de rota e o `maxDuration = 60` quase ficou para trás.
 */
export const maxDuration = 60;

export async function POST(request: Request) {
  // 1. O corpo bruto, uma vez só.
  const rawBody = await request.text();

  // 2. A fechadura. Nada abaixo desta linha roda sem ela.
  const headers = readWebhookHeaders(request.headers);
  const verification = await verifyWebhook({ headers, rawBody });

  if (!verification.ok) {
    // O motivo vai para o log e **não** para a resposta: um atacante sondando
    // não precisa saber se errou o relógio ou a chave. Em produção não há
    // ninguém lendo console, mas há a plataforma — e este é o único log que
    // importa quando uma entrega legítima começa a ser recusada.
    console.warn(`[fal-webhook] recusado: ${verification.reason}`);

    return NextResponse.json({ ok: false }, { status: 401 });
  }

  // 3. Só agora o corpo vira objeto — a partir da mesma string que foi assinada.
  let body: unknown;

  try {
    body = JSON.parse(rawBody) as unknown;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  // 4. De quem é esta entrega. O `g` vem da URL e é untrusted; o `request_id`
  //    vem do corpo, que é assinado. Os dois são conferidos um contra o outro
  //    lá dentro, e é o corpo que tem a última palavra.
  const generationId = new URL(request.url).searchParams.get("g");

  if (!generationId) {
    console.warn("[fal-webhook] entrega sem o id da geração na URL");

    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const providerJobId = headers.requestId;
  const outcome = falVideoProvider.readWebhook(body);

  let completion;

  try {
    completion = await completeVideoGeneration({ generationId, providerJobId, outcome });
  } catch (error) {
    // Nada foi cobrado: a conclusão é uma transação só. Um 5xx faz a fal
    // reentregar, que é o comportamento certo — a linha continua não-terminal e
    // a próxima tentativa refaz o caminho inteiro.
    console.error(`[fal-webhook] falha ao concluir ${generationId}: ${String(error)}`);

    return NextResponse.json({ ok: false }, { status: 500 });
  }

  /**
   * `not_found` responde **500 de propósito**, para a fal reentregar.
   *
   * A linha é criada antes de a fal ser chamada, então ela sempre existe quando
   * o retorno chega — e por isso não achá-la significa ou uma leitura que falhou
   * (que retentar resolve) ou uma entrega que não é desta linha (que retentar
   * não resolve, e custa uma consulta por tentativa).
   *
   * Entre as duas, a direção segura é retentar: **melhor retentar um
   * desconhecido do que descartar um resultado real.** As 31 tentativas têm fim;
   * um vídeo pago e perdido, não.
   */
  if (completion.kind === "not_found") {
    console.warn(`[fal-webhook] nenhuma geração ${generationId} para concluir`);

    return NextResponse.json({ ok: false }, { status: 500 });
  }

  // `already` é sucesso: é a reentrega encontrando o trabalho feito, que é
  // exatamente o que a idempotência existe para produzir.
  return NextResponse.json({ ok: true, outcome: completion.kind });
}
