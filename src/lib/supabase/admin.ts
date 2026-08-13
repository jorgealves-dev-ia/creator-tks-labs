import "server-only";

import { createClient } from "@supabase/supabase-js";

import { publicEnv } from "@/lib/env";
import type { Database } from "./database.types";

/**
 * O cliente que ignora RLS — o primeiro deste produto, e o único caminho por
 * onde um webhook escreve.
 *
 * ---------------------------------------------------------------------------
 * Por que ele precisou existir agora, e não antes
 * ---------------------------------------------------------------------------
 *
 * Todo o resto do produto passa por `createSupabaseServerClient`, que usa a
 * chave anônima e age **como o usuário**: o RLS continua mandando, e é por isso
 * que a extração e a geração de imagem inteiras nunca precisaram de service
 * role. Até as funções de cobrança são `security definer` validando contra
 * `auth.uid()`.
 *
 * O webhook da fal quebra essa cadeia por um motivo que não tem contorno: ele
 * **chega sem sessão nenhuma**. A fal não tem cookie nosso para mandar, então
 * `auth.uid()` é nulo e não existe usuário em nome de quem agir. A alternativa
 * seria conceder a função de conclusão a `anon` — o que deixaria qualquer um na
 * internet marcar uma geração como concluída.
 *
 * Então este arquivo existe, e existe pequeno: uma função, um uso.
 *
 * ---------------------------------------------------------------------------
 * O cadeado é de compilação, não de disciplina
 * ---------------------------------------------------------------------------
 *
 * `import "server-only"` no topo faz de um import indevido um **erro de build**,
 * não um vazamento. É a mesma trava de `lib/providers/keys.ts`, e ela já foi
 * provada em 08/08/2026: um componente de tela importando aquele arquivo derruba
 * o build com `'server-only' cannot be imported from a Client Component module`.
 *
 * A chave é lida de `process.env` aqui dentro, e **nunca** de `lib/env.ts`:
 * aquele arquivo é importado por código de cliente, e o comentário no topo dele
 * diz exatamente isto. Só a URL vem de lá, porque a URL é pública por design.
 */

/**
 * O que este cliente pode fazer, dito em voz alta: **tudo**. Ele ignora RLS,
 * então cada consulta feita com ele precisa escopar o que a política escoparia.
 * Em `video-complete.ts`, quem faz esse trabalho é a própria linha da geração —
 * o `user_id` sai de lá, nunca de quem chamou.
 */
export function createSupabaseAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey || serviceRoleKey.trim() === "") {
    // Sem mensagem que cite o valor, e sem seguir adiante com credencial vazia:
    // um cliente anônimo disfarçado de administrador falharia depois, no meio de
    // uma escrita, com um erro de permissão que não explica nada.
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set on the server");
  }

  return createClient<Database>(publicEnv.NEXT_PUBLIC_SUPABASE_URL, serviceRoleKey, {
    auth: {
      // Não há sessão para persistir nem para renovar: este cliente nasce e
      // morre dentro de uma requisição de webhook, e qualquer estado guardado
      // entre chamadas seria estado de ninguém.
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
