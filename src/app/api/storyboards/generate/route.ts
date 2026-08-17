import { NextResponse } from "next/server";

import { runStoryboardGeneration } from "@/lib/storyboard/generate";

/**
 * Um roteiro para um bloco de Roteiro — o endpoint que o canvas chama.
 *
 * Rota e não Server Action, pela mesma escolha da geração de imagem: um Route
 * Handler é um endpoint HTTP comum e não depende do despachante do React. Aqui
 * não há "quantidade 4" para justificar sozinha a decisão, e a simetria vale por
 * si — dois motores de geração com duas formas de serem chamados seriam duas
 * formas de errar, e a que sobrasse seria a menos exercitada.
 *
 * A postura de segurança é a mesma dos dois lados, porque é a mesma postura:
 * isto é endpoint público de qualquer jeito. A sessão sai do cookie dentro de
 * `runStoryboardGeneration`, o corpo passa pelo Zod de lá, o RLS escopa cada
 * leitura, o `@` é resolvido **no servidor** e o preço vem do catálogo através
 * de `record_generation`. Nada aqui é confiável por ter chegado.
 *
 * Sem segredo de webhook, de propósito: é uma pessoa chamando o próprio estúdio
 * com a própria sessão, não um provedor nos chamando de volta. Os endpoints em
 * app/api/webhooks é que não têm cookie de ninguém para conferir.
 */

/**
 * Acima do teto de 50 s do adaptador, para uma geração lenta falhar como erro
 * nosso e não pela plataforma matando a requisição no meio.
 *
 * O pior caso medido na Fase 0 foi 16 s — estruturar um roteiro de 14 cenas —,
 * então isto é folga e não aperto. É exatamente o que autoriza o roteiro a ser
 * **síncrono** sob a invariante 1: como a imagem, ele cabe no request; o vídeo é
 * que não cabe, e por isso tem fila e webhook.
 */
export const maxDuration = 60;

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "invalid" }, { status: 400 });
  }

  const result = await runStoryboardGeneration(body);

  // Sempre 200 para uma requisição respondida, inclusive uma recusa: "não deu, e
  // o motivo é este" é um resultado que o bloco sabe desenhar, e vestir isso de
  // falha HTTP tornaria o caminho de erro do fetch indistinguível da recusa do
  // provedor do outro lado.
  return NextResponse.json(result);
}
