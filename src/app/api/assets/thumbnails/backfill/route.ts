import { NextResponse } from "next/server";

import { backfillThumbnails } from "@/lib/assets/thumbnail-backfill";

/**
 * O backfill de miniaturas — manutenção, não produto.
 *
 * ---------------------------------------------------------------------------
 * Por que uma rota, e não um botão
 * ---------------------------------------------------------------------------
 *
 * O lugar óbvio para um botão seria a Conta, e ela **recusa** por escrito: *"só
 * leitura, e a ausência é o conteúdo"*. Pôr uma operação de manutenção ali
 * contradiria o desenho declarado da página.
 *
 * E não faria falta a ninguém: uma miniatura ausente é **invisível** para quem
 * usa — a tela cai para o original e mostra a mesma imagem. Não é defeito de
 * produto, é ineficiência de custo. Um botão para consertar algo que o usuário
 * não pode ver é superfície de produto sem leitor.
 *
 * ---------------------------------------------------------------------------
 * Como rodar
 * ---------------------------------------------------------------------------
 *
 * Logado, no console do navegador, uma linha — e repetir enquanto `hasMore` for
 * verdadeiro:
 *
 * ```js
 * await fetch('/api/assets/thumbnails/backfill', { method: 'POST' }).then(r => r.json())
 * ```
 *
 * `POST` porque escreve. Sessão do usuário, sem segredo: o RLS escopa tudo ao
 * dono, e um acervo de outra pessoa simplesmente não devolve linha.
 */

/**
 * Ela baixa até 25 originais e sobe 25 miniaturas. O acervo medido tem 1,84 MB
 * de média, então o pior caso realista é ~46 MB de download — folgado dentro do
 * mesmo teto que a geração de imagem já usa.
 */
export const maxDuration = 60;

export async function POST() {
  try {
    const report = await backfillThumbnails();

    return NextResponse.json(report, { status: report.ok ? 200 : 401 });
  } catch (error) {
    console.error(`[thumbnail-backfill] ${String(error)}`);

    return NextResponse.json({ ok: false, reason: "error" }, { status: 500 });
  }
}
