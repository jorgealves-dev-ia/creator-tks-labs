"use client";

import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";

import { createSupabaseBrowserClient } from "./client";
import type { Database } from "./database.types";

/**
 * Abre um canal do Realtime **depois** que o cliente sabe quem é o usuário.
 *
 * ---------------------------------------------------------------------------
 * O defeito que isto conserta, e como ele foi medido
 * ---------------------------------------------------------------------------
 *
 * Um canal assinado durante a hidratação **entra no ar e não escuta nada**. Ele
 * responde `SUBSCRIBED`, aparece em `getChannels()` com estado `joined`, carrega
 * o id do binding — e o servidor **nunca registra a assinatura**. Nada falha,
 * nada avisa: o sintoma é indistinguível de o canal não existir.
 *
 * A medição que fechou o caso, em 14/08/2026, com o mesmo evento chegando na
 * mesma página, no mesmo cliente, com a mesma configuração:
 *
 * | canal                          | eventos recebidos |
 * |--------------------------------|-------------------|
 * | assinado na hidratação         | **0**             |
 * | assinado 2,5 s depois          | **1**             |
 *
 * E a tabela `realtime.subscription`, do lado do servidor, contava a mesma
 * história por outro ângulo: **zero linhas** com os dois canais do produto
 * `joined`, e uma linha assim que qualquer canal nascia mais tarde — com
 * `claims_role = authenticated`, que é a peça que faltava aos primeiros.
 *
 * A causa é essa última coluna. O `access_token` do usuário chega ao Realtime
 * de forma assíncrona — o `@supabase/ssr` lê a sessão dos cookies e só então
 * avisa o socket. Quem assina antes disso manda um `join` sem identidade: o
 * tópico é aceito, mas a assinatura de `postgres_changes`, que precisa das
 * claims para casar com o RLS, não é criada. **A porta abre; ninguém entra.**
 *
 * ---------------------------------------------------------------------------
 * Por que esperar a sessão, e não um relógio
 * ---------------------------------------------------------------------------
 *
 * Um `setTimeout` de dois segundos e meio também "funciona", e foi assim que o
 * defeito foi provado. Mas um número mágico só acerta enquanto a máquina, a
 * rede e o navegador se comportarem como no dia em que ele foi escolhido — e
 * quando errar, erra de volta para o silêncio de antes. **Esperar o token é
 * esperar a coisa certa:** é exatamente a condição que faltava, e ela vale
 * tanto num notebook rápido quanto numa rede ruim.
 *
 * O `setAuth` explícito antes do `build` é o cinto sobre o suspensório: o
 * `supabase-js` também entrega o token ao socket sozinho, quando a sessão
 * resolve, mas a ordem entre esse aviso e o nosso `subscribe` não é garantida
 * por contrato nenhum. Aqui ela passa a ser.
 *
 * ---------------------------------------------------------------------------
 * Como usar
 * ---------------------------------------------------------------------------
 *
 * O retorno é a limpeza, para devolver direto do `useEffect`:
 *
 * ```ts
 * useEffect(() => openChannelWhenAuthed((supabase) =>
 *   supabase.channel(`algo:${id}`).on("postgres_changes", {…}, handler).subscribe()
 * ), [id]);
 * ```
 *
 * A limpeza cobre o caso de o efeito ser desmontado **antes** de a sessão
 * resolver: sem a trava de cancelamento, um canal nasceria órfão depois do
 * desmonte e ninguém o fecharia.
 */
export function openChannelWhenAuthed(
  build: (supabase: SupabaseClient<Database>) => RealtimeChannel,
): () => void {
  const supabase = createSupabaseBrowserClient();

  let channel: RealtimeChannel | null = null;
  let cancelado = false;

  void (async () => {
    const { data } = await supabase.auth.getSession();

    if (cancelado) return;

    // Sem sessão não há o que escutar: toda tabela que este produto assina é
    // protegida por RLS de dono, e um assinante anônimo receberia zero linhas.
    if (!data.session) return;

    await supabase.realtime.setAuth(data.session.access_token);

    if (cancelado) return;

    channel = build(supabase);
  })();

  return () => {
    cancelado = true;

    if (channel) void supabase.removeChannel(channel);
  };
}
