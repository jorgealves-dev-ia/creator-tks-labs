import { NextResponse } from "next/server";

import { runVideoSubmission } from "@/lib/generation/video-generate";

/**
 * Enfileirar um vídeo — o endpoint que o bloco Gerar Vídeo chama.
 *
 * Rota e não Server Action pela mesma razão registrada em
 * `lib/generation/canvas-contract.ts`: Server Actions são despachadas pelo ciclo
 * de renderização do React e saem em fila. Aqui a razão pesa menos (um vídeo por
 * clique, e a chamada é curta porque só enfileira), mas a simetria com o
 * endpoint de imagem vale mais do que a economia — dois transportes diferentes
 * para a mesma coisa são duas chances de divergir.
 *
 * A postura de segurança é a mesma de sempre: a sessão é relida do cookie lá
 * dentro, o corpo passa pelo Zod, o RLS escopa toda leitura e o preço vem do
 * catálogo. Sem segredo compartilhado, de propósito — é o usuário chamando o
 * próprio estúdio com a própria sessão. Quem não tem cookie de ninguém para
 * conferir é o `app/api/webhooks/fal`, e é lá que mora a assinatura.
 */

/**
 * Curto na maior parte do tempo, mas não sempre: a imagem de partida viaja
 * inline como data URI, e subir alguns megabytes para a fal leva mais do que os
 * dez segundos do padrão. É o teto de "enfileirar", não o de "gerar" — a geração
 * acontece do lado deles e volta pelo webhook.
 */
export const maxDuration = 60;

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "invalid" }, { status: 400 });
  }

  const result = await runVideoSubmission(body);

  // Sempre 200 para uma requisição respondida, inclusive a recusa: "não deu, e o
  // motivo é este" é um resultado que a caixinha sabe desenhar, e vesti-lo de
  // falha HTTP tornaria indistinguíveis o erro de rede e a recusa do provedor.
  return NextResponse.json(result);
}
