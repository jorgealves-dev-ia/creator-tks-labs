-- Mini-ciclo «O vídeo final» · Fase 1 — o filme e a lista de peças, numa
-- transação só.
--
-- Especificação: docs/plano-video-final.md, §4.1b (c).
--
-- ---------------------------------------------------------------------------
-- Por que uma função, e não dois pedidos do servidor
-- ---------------------------------------------------------------------------
--
-- O PostgREST **não faz transação multi-tabela**. Gravar o asset do filme e
-- depois as N peças seriam dois pedidos, com uma janela entre eles — e uma
-- função serverless que morra ali deixa **um filme órfão de linhagem**.
--
-- E órfão do jeito pior: **calado**. O arquivo existe, abre, toca, aparece na
-- galeria. Ninguém descobre que a linhagem sumiu até o dia em que alguém
-- perguntar de onde ele veio — que é, tipicamente, o dia em que a resposta
-- importa.
--
-- É a mesma classe de problema que `record_generation` e `record_extraction` já
-- resolvem do mesmo jeito: eles gravam a geração **e** o lançamento do ledger
-- juntos, ou não gravam nada. Aqui não há dinheiro, mas há a mesma
-- indivisibilidade: **ou o filme e as peças existem, ou nenhum dos dois.**
--
-- ---------------------------------------------------------------------------
-- O dono sai da SESSÃO, dentro do banco
-- ---------------------------------------------------------------------------
--
-- `v_user_id := (select auth.uid())`, como em `record_generation`. Não existe
-- parâmetro de dono, e isso é decisão: um `user_id` que chegasse por argumento
-- seria um campo que **o cliente escolhe** — quem manda o pedido escolheria de
-- quem é o filme.
--
-- Assim a garantia não é *"a rota lê a sessão e preenche direito"*, que é
-- promessa de código. É o banco não oferecendo a pergunta.
--
-- ---------------------------------------------------------------------------
-- Montagem NÃO é geração — de novo, e por escrito
-- ---------------------------------------------------------------------------
--
-- Esta função **não toca `generations` nem `ledger_transactions`**, e não tem
-- parâmetro de custo. Juntar arquivos que já foram pagos não chama modelo e não
-- cobra. *Se um dia montagem passar a custar, ela vira geração e volta para a
-- régua do dinheiro — e esta função é o lugar onde isso apareceria.*
--
-- ---------------------------------------------------------------------------
-- O que ela confere antes de gravar
-- ---------------------------------------------------------------------------
--
--   sessão              sem `auth.uid()` não há dono, e sem dono não há filme
--   as peças são suas   cada clipe citado tem de ser do mesmo dono. O trigger de
--                       `asset_montage_parts` já recusaria, mas recusar aqui dá
--                       a mensagem certa em vez de um erro de trigger cru
--   ordem 1..N          as posições chegam como array; a ordem é o índice, e é
--                       responsabilidade de quem chama que ela venha de
--                       `storyboard_scenes.ordem`
--
-- O que ela **não** confere é se os clipes emendam — isso é a trava que lê os
-- ARQUIVOS, e ela mora em `src/lib/video/montagem.ts`. O banco não abre MP4.

create or replace function public.record_montage(
  p_storage_path text,
  p_byte_size bigint,
  p_width integer,
  p_height integer,
  p_duration_ms integer,
  p_part_asset_ids uuid[],
  p_label text default null
)
returns public.assets
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_filme public.assets;
  v_peca uuid;
  v_ordem integer := 0;
  v_alheias integer;
begin
  if v_user_id is null then
    raise exception 'record_montage requires an authenticated session'
      using errcode = 'insufficient_privilege';
  end if;

  if p_part_asset_ids is null or array_length(p_part_asset_ids, 1) is null then
    raise exception 'record_montage requires at least one part'
      using errcode = 'check_violation';
  end if;

  -- As peças são todas dele? O trigger da tabela filha recusaria uma a uma, mas
  -- a mensagem sairia crua e no meio da transação. Perguntar aqui, de uma vez,
  -- dá o erro certo antes de qualquer escrita.
  select count(*) into v_alheias
    from unnest(p_part_asset_ids) as p(id)
    left join public.assets a on a.id = p.id
   where a.id is null or a.user_id <> v_user_id;

  if v_alheias > 0 then
    raise exception 'record_montage: % part(s) do not belong to the caller', v_alheias
      using errcode = 'check_violation';
  end if;

  -- 1 · O filme. `source = 'generation'` porque foi o SISTEMA que produziu este
  --     arquivo, não a pessoa — mesma leitura do quadro derivado do elo
  --     (15/08/2026), e a mesma razão: o filtro da galeria oferece
  --     «todas / geradas / enviadas», e quem procurar o próprio filme vai
  --     procurá-lo em "geradas". A pergunta *de onde vieram os bytes* tem
  --     resposta na tabela de peças, que é onde ela pertence.
  --
  --     E `width`/`height`/`duration_ms` chegam MEDIDOS do arquivo montado — os
  --     clipes têm esses campos em NULL, e o filme não pode herdar esse defeito.
  insert into public.assets (
    user_id, kind, source, storage_path, mime_type,
    byte_size, width, height, duration_ms, label
  )
  values (
    v_user_id, 'video', 'generation', p_storage_path, 'video/mp4',
    p_byte_size, p_width, p_height, p_duration_ms, p_label
  )
  returning * into v_filme;

  -- 2 · As peças, na ordem do array. Mesma transação — é o ponto inteiro desta
  --     função.
  foreach v_peca in array p_part_asset_ids loop
    v_ordem := v_ordem + 1;
    insert into public.asset_montage_parts (montage_asset_id, ordem, part_asset_id, user_id)
    values (v_filme.id, v_ordem, v_peca, v_user_id);
  end loop;

  return v_filme;
end;
$$;

comment on function public.record_montage(text, bigint, integer, integer, integer, uuid[], text) is
  'Grava o filme montado e a lista ordenada de peças numa transação só. O dono '
  'sai da sessão (auth.uid()), nunca de argumento. Não toca generations nem o '
  'ledger: montagem não é geração.';

-- Só quem está autenticado. `anon` não monta filme.
revoke all on function public.record_montage(text, bigint, integer, integer, integer, uuid[], text) from public, anon;
grant execute on function public.record_montage(text, bigint, integer, integer, integer, uuid[], text) to authenticated;
