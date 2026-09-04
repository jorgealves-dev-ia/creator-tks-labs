import { NextResponse } from "next/server";

import { montarOStoryboard } from "@/lib/video/montar-storyboard";

/**
 * «Montar o vídeo» — de N clipes pagos, UM arquivo, sem gastar nada.
 *
 * Rota e não Server Action, pela mesma simetria das outras duas: um Route
 * Handler é um endpoint HTTP comum e não depende do despachante do React.
 *
 * **A sessão sai do cookie dentro de `montarOStoryboard`, e o dono do filme é
 * resolvido dentro do BANCO**, por `record_montage`. Não há `userId` no corpo do
 * pedido — não porque a rota o ignore, mas porque a pergunta não existe: um
 * campo de dono no corpo seria o cliente escolhendo de quem é o filme.
 *
 * **Nada aqui gasta.** Não chama provedor, não cria linha em `generations`, não
 * toca o ledger. É o único portão da Máquina sem custo, e o botão não mostra
 * preço porque não tem. *Se um dia tiver, vira geração e volta para a régua do
 * dinheiro.*
 */

/**
 * Montar 10 cenas levou **885 ms** na Fase 0, e 3 cenas levam ~70 ms — mas esses
 * números **não incluem rede**, e aqui a função ainda baixa até 50 MB do Storage
 * e devolve outro tanto. Os 60 s são para essa parte, que é a que não foi
 * medida.
 *
 * Isto **não viola a invariante 1**: ela manda o vídeo ser assíncrono porque
 * *gerar* vídeo estoura o teto. Montagem não gera nada — remuxa arquivos que já
 * existem, sem decodificar um quadro sequer.
 */
export const maxDuration = 60;

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, motivo: "entrada_invalida" }, { status: 400 });
  }

  const resultado = await montarOStoryboard(body);

  return NextResponse.json(resultado, { status: resultado.ok ? 200 : 400 });
}
