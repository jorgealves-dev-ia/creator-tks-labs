import { NextResponse } from "next/server";

import { webhookResponde } from "@/lib/generation/video-generate";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * "O endereço de retorno responde?" — a pergunta do portão de vídeo.
 *
 * Rota e não Server Action pela mesma simetria do resto da frente de vídeo, e
 * **POST** porque a resposta não pode ser cacheada em lugar nenhum: a pergunta é
 * sobre o estado do mundo agora, e um túnel muda de vida entre um clique e o
 * seguinte.
 *
 * Exige sessão. Não porque haja segredo na resposta — o booleano não revela a
 * URL —, mas porque um endpoint anônimo que confirma a existência de um túnel de
 * desenvolvimento é uma sonda de graça para quem estiver procurando. A regra da
 * casa desde o motor de extração é a mesma: **o que viaja para a tela é o
 * booleano calculado no servidor**, nunca o valor.
 */
export async function POST() {
  const supabase = await createSupabaseServerClient();
  const { data: claims } = await supabase.auth.getClaims();

  if (!claims?.claims?.sub) {
    return NextResponse.json({ vivo: false, motivo: "unauthenticated" }, { status: 401 });
  }

  return NextResponse.json(await webhookResponde());
}
