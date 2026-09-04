-- Mini-ciclo «O vídeo final» · Fase 1 — `record_montage` fecha três portas, e
-- passa a ser a ÚNICA porta de `asset_montage_parts`.
--
-- Nasceu da revisão do dono em 04/09/2026, com quatro perguntas sobre a função
-- recém-aplicada. A primeira estava certa; as outras três acharam o que segue.
--
-- ---------------------------------------------------------------------------
-- (1) `p_storage_path` era texto livre numa função `security definer`
-- ---------------------------------------------------------------------------
--
-- Sem esta trava, dá para criar linha em `public.assets` apontando para
-- **qualquer caminho** do bucket — inclusive o de outra pessoa.
--
-- **Medido antes de chamar de buraco, e não era porta aberta:** o RLS do Storage
-- recorta por `(storage.foldername(name))[1] = auth.uid()`, e `signAssetUrls`
-- assina com o cliente de **sessão** — então o arquivo alheio não sai assinado.
-- O estrago real de hoje é menor: linhas de `assets` apontando para lugar
-- nenhum, e caminhos que um dia existirão.
--
-- **Mas a casa já decidiu de quem é essa checagem.** `registerDerivedFrame` faz
-- `storagePath.startsWith(userId + "/")` desde 15/08/2026, e faz *no caminho de
-- escrita*. Uma `security definer` é justamente onde não se pula: ela roda com
-- privilégio de dono do banco, então **o que ela aceita é a superfície.**
--
-- ---------------------------------------------------------------------------
-- (2) As peças tinham dono conferido, e não tinham TIPO
-- ---------------------------------------------------------------------------
--
-- A checagem de dono já existia e continua. O que faltava era `kind = 'video'`:
-- a função aceitaria ids de **imagem** como linhagem de um filme. Nada quebraria
-- na hora — quebraria depois, quando alguém seguisse a linhagem esperando
-- clipes.
--
-- As duas perguntas viram uma consulta só, porque são a mesma varredura.
--
-- ---------------------------------------------------------------------------
-- (3) E ela passa a ser a ÚNICA porta
-- ---------------------------------------------------------------------------
--
-- `asset_montage_parts` nascia com policy de INSERT para `authenticated`: os
-- triggers de 04/09 seguravam o conteúdo, mas a porta existia. A policy sai.
--
-- Sem ela, `authenticated` não insere linha nenhuma por PostgREST — só
-- `record_montage`, que é `security definer` e por isso passa por cima do RLS. É
-- a mesma forma de `ledger_transactions`, que é **somente-leitura para o
-- usuário** e só recebe escrita por `record_generation` / `record_extraction`.
--
-- **O ganho não é a trava a mais — é o número de lugares onde a regra mora.**
-- Com duas portas, toda regra nova precisa ser escrita duas vezes, e a segunda
-- é a que alguém esquece.
--
-- A policy de SELECT fica: ler a própria linhagem é o ponto dela existir.
--
-- ---------------------------------------------------------------------------
-- O que este arquivo deliberadamente NÃO conserta
-- ---------------------------------------------------------------------------
--
-- **A função não confere que as peças são os clipes DESTE storyboard**, porque
-- ela não recebe o storyboard. Fechar isso exigiria acoplá-la ao roteiro —
-- `generations.scene_id` → `storyboard_scenes.storyboard_id` —, e o que sobra em
-- aberto sem isso é pequeno e é **do próprio dono**: ele pode montar um filme com
-- clipes dele em qualquer ordem, o que é uma coisa que o produto vai querer
-- oferecer um dia. Não é vazamento; é liberdade.
--
-- **E ela pode ser chamada duas vezes para o mesmo roteiro**, produzindo dois
-- filmes iguais. O segundo custa zero ⚡ e confunde a galeria. Fica registrado no
-- backlog nomeado, por decisão do dono em 04/09 — o conserto é de produto
-- (perguntar antes, ou substituir), não de banco.

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
  v_nao_video integer;
begin
  if v_user_id is null then
    raise exception 'record_montage requires an authenticated session'
      using errcode = 'insufficient_privilege';
  end if;

  -- (1) O caminho é DELE. Mesma regra de `registerDerivedFrame`, agora no banco.
  if p_storage_path is null or p_storage_path not like v_user_id::text || '/%' then
    raise exception 'record_montage: storage path must live under the caller''s own folder'
      using errcode = 'check_violation';
  end if;

  if p_part_asset_ids is null or array_length(p_part_asset_ids, 1) is null then
    raise exception 'record_montage requires at least one part'
      using errcode = 'check_violation';
  end if;

  -- (2) As peças são dele E são vídeo. Uma varredura, duas perguntas — o trigger
  --     da tabela filha recusaria a primeira uma a uma, mas a mensagem sairia
  --     crua e no meio da transação, e ele não pergunta a segunda.
  select
    count(*) filter (where a.id is null or a.user_id <> v_user_id),
    count(*) filter (where a.id is not null and a.user_id = v_user_id and a.kind <> 'video')
  into v_alheias, v_nao_video
  from unnest(p_part_asset_ids) as p(id)
  left join public.assets a on a.id = p.id;

  if v_alheias > 0 then
    raise exception 'record_montage: % part(s) do not belong to the caller', v_alheias
      using errcode = 'check_violation';
  end if;

  if v_nao_video > 0 then
    raise exception 'record_montage: % part(s) are not video assets', v_nao_video
      using errcode = 'check_violation';
  end if;

  -- O filme. `source = 'generation'` porque foi o SISTEMA que produziu este
  -- arquivo, não a pessoa — mesma leitura do quadro derivado do elo, e a mesma
  -- razão: quem procurar o próprio filme vai procurá-lo em "geradas". A pergunta
  -- *de onde vieram os bytes* tem resposta em `asset_montage_parts`.
  --
  -- `width`/`height`/`duration_ms` chegam MEDIDOS do arquivo montado — os clipes
  -- têm esses campos em NULL, e o filme não pode herdar esse defeito.
  insert into public.assets (
    user_id, kind, source, storage_path, mime_type,
    byte_size, width, height, duration_ms, label
  )
  values (
    v_user_id, 'video', 'generation', p_storage_path, 'video/mp4',
    p_byte_size, p_width, p_height, p_duration_ms, p_label
  )
  returning * into v_filme;

  -- As peças, na ordem do array, na MESMA transação — é o ponto inteiro desta
  -- função existir.
  foreach v_peca in array p_part_asset_ids loop
    v_ordem := v_ordem + 1;
    insert into public.asset_montage_parts (montage_asset_id, ordem, part_asset_id, user_id)
    values (v_filme.id, v_ordem, v_peca, v_user_id);
  end loop;

  return v_filme;
end;
$$;

comment on function public.record_montage(text, bigint, integer, integer, integer, uuid[], text) is
  'A ÚNICA porta de escrita de asset_montage_parts. Grava o filme montado e a '
  'lista ordenada de peças numa transação só. O dono sai da sessão (auth.uid()), '
  'nunca de argumento; o caminho do Storage tem de ficar sob a pasta dele; as '
  'peças têm de ser dele e ser vídeo. Não toca generations nem o ledger: '
  'montagem não é geração.';

-- A porta que sobrava. `record_montage` é `security definer` e passa por cima do
-- RLS, então tirar esta policy não a afeta — afeta só a escrita direta.
drop policy if exists asset_montage_parts_insert_own on public.asset_montage_parts;

comment on table public.asset_montage_parts is
  'De quais clipes um filme montado foi feito, e em que ordem. Uma linha por '
  'posição. SOMENTE-LEITURA para o usuário: a única escrita é record_montage, '
  'como o ledger só recebe escrita por record_generation. A montagem não é '
  'geração: não passa por generations, não toca o ledger e não custa Spark.';
