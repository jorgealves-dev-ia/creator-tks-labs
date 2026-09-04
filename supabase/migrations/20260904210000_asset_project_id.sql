-- Mini-ciclo «O vídeo final» · a PARADA — um asset pertence a um projeto.
--
-- Especificação: docs/plano-video-final.md, §4.1d. Decisão do dono, 04/09/2026.
--
-- ---------------------------------------------------------------------------
-- O buraco, e ele é mais velho que o filme
-- ---------------------------------------------------------------------------
--
-- A galeria — `listProjectGallery` e `listGeneralGallery` — lista **`generations`**
-- e mostra `result_asset_id`. Funciona enquanto todo arquivo do acervo nasce de
-- uma geração. Dois já não nascem:
--
--   o FILME montado    montagem não é geração: não chama modelo, não tem preço,
--                      não toca o ledger. Não há linha em `generations` para ele
--   o QUADRO derivado  o elo recorta o último quadro de um clipe desde
--                      15/08/2026, e pela mesma razão não cria geração
--
-- **Medido em 04/09:** a galeria do projeto diz *«6 imagens»* e mostra 3 clipes e
-- 3 imagens. Os dois filmes não estão lá. E os quadros do elo estão invisíveis
-- **desde 15/08, sem ninguém notar** — o filme só tornou o buraco visível, porque
-- ele é a entrega.
--
-- ---------------------------------------------------------------------------
-- Por que a coluna, e não as duas alternativas mais baratas
-- ---------------------------------------------------------------------------
--
-- Estavam na mesa, e as duas fazem a galeria **adivinhar**:
--
--   (i)  pescar filmes pelo caminho do Storage (`<dono>/video/<projeto>/filme-…`)
--        → amarra a galeria a uma convenção de nome de arquivo, que é a coisa
--          mais fácil de quebrar sem perceber
--   (ii) unir `generations` com filmes achados por `asset_montage_parts`
--        → correto por FK, mas é um caminho que **só serve para filme**: não
--          conserta o quadro do elo, e o próximo asset sem geração recomeça a
--          discussão
--
-- *"Um asset pertence a um projeto"* é a verdade simples, e conserta a classe
-- inteira de uma vez.
--
-- `on delete set null`, como `generations_project_id_fkey`: apagar um projeto não
-- pode apagar o trabalho da pessoa. O arquivo perde o endereço, não a existência.

alter table public.assets
  add column project_id uuid references public.projects (id) on delete set null;

comment on column public.assets.project_id is
  'Em que projeto este arquivo nasceu. Nulo é legítimo e frequente: envio avulso '
  'e imagem de entidade (a folha canônica nasce no editor da personagem, não num '
  'projeto). A galeria de projeto filtra por esta coluna, então nulo simplesmente '
  'não aparece nela.';

-- Parcial pela mesma razão de `assets_derived_from_asset_id_idx`: a galeria
-- pergunta sempre por um projeto, nunca por "os sem projeto".
create index assets_project_id_idx
  on public.assets (project_id, created_at desc)
  where project_id is not null;

-- ---------------------------------------------------------------------------
-- O PASSADO — três origens, em ordem de confiança
-- ---------------------------------------------------------------------------
--
-- Nenhuma delas adivinha: as três seguem uma FK existente até um `project_id`
-- que já estava gravado.

do $$
declare
  v_geracao integer;
  v_peca integer;
  v_linhagem integer;
  v_orfaos integer;
  v_total integer;
begin
  -- 1 · O caminho direto: o asset é o resultado de uma geração, e ela sabe o
  --     projeto. Cobre tudo que veio de modelo.
  update public.assets a
     set project_id = g.project_id
    from public.generations g
   where g.result_asset_id = a.id
     and g.project_id is not null
     and a.project_id is null;
  get diagnostics v_geracao = row_count;

  -- 2 · O filme: ele não tem geração, mas as PEÇAS dele têm. A montagem só junta
  --     clipes do mesmo roteiro, então o projeto de qualquer peça é o do filme.
  update public.assets a
     set project_id = g.project_id
    from public.asset_montage_parts p
    join public.generations g on g.result_asset_id = p.part_asset_id
   where p.montage_asset_id = a.id
     and g.project_id is not null
     and a.project_id is null;
  get diagnostics v_peca = row_count;

  -- 3 · O quadro do elo: ele deriva de um clipe, e o clipe já foi carimbado no
  --     passo 1. Por isso este passo vem DEPOIS — ele lê o que o primeiro
  --     escreveu.
  update public.assets a
     set project_id = o.project_id
    from public.assets o
   where o.id = a.derived_from_asset_id
     and o.project_id is not null
     and a.project_id is null;
  get diagnostics v_linhagem = row_count;

  select count(*) into v_total from public.assets;
  select count(*) into v_orfaos from public.assets where project_id is null;

  -- O número que o dono pediu, na saída do `db push`.
  raise notice '--- assets.project_id preenchido ---';
  raise notice 'por geração:  %', v_geracao;
  raise notice 'por peça:     %', v_peca;
  raise notice 'por linhagem: %', v_linhagem;
  raise notice 'SEM PROJETO:  % de % (envios avulsos e imagens de entidade — a galeria de projeto ignora)', v_orfaos, v_total;
end;
$$;

-- ---------------------------------------------------------------------------
-- O FUTURO — dois triggers, e eles cobrem TODO caminho que cria asset
-- ---------------------------------------------------------------------------
--
-- A exigência do dono era *"todo caminho que cria asset passa a preencher
-- project_id — exigência no banco se der"*. Dá, e por um desenho melhor que
-- lembrar em cada chamador: **em vez de N caminhos preenchendo, dois triggers
-- carimbam.**
--
-- Uma coluna `not null` **não serviria** e não é rigor mal-feito: envio avulso e
-- imagem de entidade não têm projeto, e são 17 das 102 linhas de hoje. Uma trava
-- que recusasse nulo recusaria a folha canônica.

-- (a) O quadro derivado herda o projeto de quem ele recortou.
--
--     Isto tira a responsabilidade de `registerDerivedFrame` e de qualquer
--     derivação futura: o dado já está no asset de origem, e quem sabe ligar os
--     dois é o banco.
create or replace function public.assets_herdar_projeto()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.project_id is null and new.derived_from_asset_id is not null then
    select a.project_id into new.project_id
      from public.assets a where a.id = new.derived_from_asset_id;
  end if;

  return new;
end;
$$;

create trigger assets_herdar_projeto
  before insert on public.assets
  for each row execute function public.assets_herdar_projeto();

-- (b) Quando uma geração passa a apontar para um asset, o asset ganha o projeto
--     dela.
--
--     **É o trigger que cobre os caminhos que eu não conheço.** O asset de imagem
--     é criado por uma rota, o de vídeo pelo webhook, e amanhã pode ser por outro
--     lugar — mas **todos** acabam gravando `generations.result_asset_id`, porque
--     é assim que o resultado se liga à geração. Carimbar aqui é carimbar no
--     único ponto por onde todos passam.
--
--     `AFTER`, e não `BEFORE`: o asset já existe quando a geração o referencia.
--     E só preenche quando está nulo — uma geração não reescreve o projeto de um
--     arquivo que já tem dono.
create or replace function public.generations_carimbar_projeto_do_asset()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.result_asset_id is not null and new.project_id is not null then
    update public.assets
       set project_id = new.project_id
     where id = new.result_asset_id
       and project_id is null;
  end if;

  return null;
end;
$$;

create trigger generations_carimbar_projeto_do_asset
  after insert or update of result_asset_id, project_id on public.generations
  for each row execute function public.generations_carimbar_projeto_do_asset();

-- ---------------------------------------------------------------------------
-- (c) O FILME: `record_montage` passa a exigir o projeto
-- ---------------------------------------------------------------------------
--
-- É o único caminho que os dois triggers não alcançam — o filme não deriva de um
-- asset só, e não tem geração. Então o projeto entra por parâmetro, e
-- **obrigatório**: sem `default`, quem chamar sem ele não compila nem executa.
--
-- Assinatura nova, então a antiga sai. Um `create or replace` com parâmetro a
-- mais criaria uma **segunda** função com o mesmo nome, e o dia em que alguém
-- chamasse a antiga o filme voltaria a nascer sem projeto — calado, como tudo
-- nesta página.
drop function if exists public.record_montage(text, bigint, integer, integer, integer, uuid[], text);

create or replace function public.record_montage(
  p_project_id uuid,
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
  v_projeto_alheio integer;
begin
  if v_user_id is null then
    raise exception 'record_montage requires an authenticated session'
      using errcode = 'insufficient_privilege';
  end if;

  -- O projeto é dele. Mesma família das outras conferências: o que a função
  -- aceita é a superfície, e ela roda com privilégio de dono do banco.
  select count(*) into v_projeto_alheio
    from public.projects pr
   where pr.id = p_project_id and pr.user_id = v_user_id;

  if v_projeto_alheio = 0 then
    raise exception 'record_montage: project does not belong to the caller'
      using errcode = 'check_violation';
  end if;

  if p_storage_path is null or p_storage_path not like v_user_id::text || '/%' then
    raise exception 'record_montage: storage path must live under the caller''s own folder'
      using errcode = 'check_violation';
  end if;

  if p_part_asset_ids is null or array_length(p_part_asset_ids, 1) is null then
    raise exception 'record_montage requires at least one part'
      using errcode = 'check_violation';
  end if;

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

  insert into public.assets (
    user_id, project_id, kind, source, storage_path, mime_type,
    byte_size, width, height, duration_ms, label
  )
  values (
    v_user_id, p_project_id, 'video', 'generation', p_storage_path, 'video/mp4',
    p_byte_size, p_width, p_height, p_duration_ms, p_label
  )
  returning * into v_filme;

  foreach v_peca in array p_part_asset_ids loop
    v_ordem := v_ordem + 1;
    insert into public.asset_montage_parts (montage_asset_id, ordem, part_asset_id, user_id)
    values (v_filme.id, v_ordem, v_peca, v_user_id);
  end loop;

  return v_filme;
end;
$$;

comment on function public.record_montage(uuid, text, bigint, integer, integer, integer, uuid[], text) is
  'A ÚNICA porta de escrita de asset_montage_parts. Grava o filme montado e a '
  'lista ordenada de peças numa transação só, com o projeto. O dono sai da '
  'sessão (auth.uid()), nunca de argumento; o projeto tem de ser dele; o caminho '
  'do Storage tem de ficar sob a pasta dele; as peças têm de ser dele e ser '
  'vídeo. Não toca generations nem o ledger: montagem não é geração.';

revoke all on function public.record_montage(uuid, text, bigint, integer, integer, integer, uuid[], text) from public, anon;
grant execute on function public.record_montage(uuid, text, bigint, integer, integer, integer, uuid[], text) to authenticated;
