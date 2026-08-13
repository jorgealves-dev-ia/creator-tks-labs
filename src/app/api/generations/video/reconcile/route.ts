import { NextResponse } from "next/server";

import { reconcileVideoGeneration } from "@/lib/generation/video-reconcile";

/**
 * "Verificar agora" — e também a varredura que roda ao abrir o projeto.
 *
 * Um endpoint só para os dois gatilhos, pela mesma razão que faz o webhook e a
 * reconciliação compartilharem `completeVideoGeneration`: dois caminhos para a
 * mesma pergunta divergiriam, e o segundo a divergir seria o que ninguém abre.
 *
 * Sessão do usuário, sem segredo: a posse é provada pela leitura sob RLS lá
 * dentro, e um id de outra pessoa simplesmente não encontra linha.
 */

/**
 * Ela pode terminar o trabalho que o webhook não terminou — e terminar significa
 * baixar o vídeo e subir ao Storage, exatamente como o webhook faz. Mesmo teto,
 * pelo mesmo motivo.
 */
export const maxDuration = 60;

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "invalid" }, { status: 400 });
  }

  try {
    return NextResponse.json(await reconcileVideoGeneration(body));
  } catch (error) {
    // A conclusão lança quando a função do banco recusa, e ninguém foi cobrado
    // se isso aconteceu — é uma transação só. Responder JSON em vez de deixar o
    // 500 cru é o que faz o botão dizer "não deu, tente de novo" em vez de
    // quebrar no `response.json()` do outro lado.
    console.error(`[video-reconcile] ${String(error)}`);

    return NextResponse.json({ ok: false, reason: "error" });
  }
}
