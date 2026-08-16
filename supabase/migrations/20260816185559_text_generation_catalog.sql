-- FRENTE STORYBOARD · CICLO 2 · Fase 1, migration 2 de 4 — o catálogo de texto,
-- e o record_generation aprendendo a cobrar por trabalho em vez de por pixel.
--
-- Especificação: docs/decisoes.md (entradas de 16/08/2026, Ciclo 2 do Roteiro).
--
-- ---------------------------------------------------------------------------
-- ORDEM DE APLICAÇÃO — esta migration sobe ANTES do código, ao contrário da D2
-- ---------------------------------------------------------------------------
--
-- A regra da casa é "o código que torna a regra do banco inalcançável sobe
-- primeiro", e ela nasceu do GN006: um backstop de banco que subisse antes da
-- checagem da aplicação viraria a única checagem, no pior lugar possível.
--
-- Aqui é o inverso, e por um motivo aritmético: **nenhuma recusa nova alcança
-- caminho existente.** `p_media_kind` nasce com default 'image', e o ramo de
-- imagem sai byte a byte igual ao de hoje — mesmas leituras, mesmos códigos,
-- mesma frase no extrato. As recusas novas (GN007, o ramo de texto, a proibição
-- de vídeo) só disparam com argumentos que nenhum código publicado envia.
--
-- O que existe é o risco oposto: o código da Fase 2 chama esta função com
-- `p_media_kind` e `p_job_kind`. Se ele subir primeiro, chama parâmetro que não
-- existe. **Logo: migration primeiro, deploy depois.**
--
-- A troca de assinatura é a terceira desta casa (20260809180000 e 20260810180000
-- foram as outras): a identidade de uma função no Postgres é o nome mais os
-- tipos dos argumentos, então a antiga cai e as concessões são reemitidas. O que
-- torna isso seguro para o código já publicado é que só se ACRESCENTA parâmetro
-- com default, e a aplicação chama por nome (`supabase.rpc(..., { … })`) — a
-- chamada de hoje continua resolvendo, com os defaults preenchendo o resto.
--
-- ---------------------------------------------------------------------------
-- O MODELO, E O PORQUÊ DELE — medido na Fase 0, não escolhido de memória
-- ---------------------------------------------------------------------------
--
-- 47 chamadas reais, dois candidatos, três versões de receita, R$ 1,34 do nosso
-- bolso e zero Spark. O que decidiu foi a herança do elo (requisito 6 do ciclo):
-- quando uma ficha diz "continuacao", a ação tem de manter o rosto da personagem
-- em câmera no primeiro segundo — senão a emenda entre capítulos se perde.
--
--   gemini-3.1-flash-lite ....... 17/21 continuações corretas (81%)
--   gemini-3.7-flash ............ 24/24 continuações corretas (100%)
--
-- O lite é 5× mais barato e 1,6× mais rápido, e perdeu assim mesmo. O argumento
-- que fecha: **o roteiro é a coisa mais barata do pipeline e dirige a mais
-- cara.** Uma emenda quebrada custa uma regeração de vídeo de 210 ⚡; escolher o
-- modelo que erra uma em cinco para economizar 10 centavos é otimizar o número
-- errado.
--
-- O `gemini-3.1-flash-lite` fica registrado como rebaixamento nomeado: uma linha
-- aqui e três em ai_model_text_prices, no dia em que custo importar mais que
-- continuidade.

-- ---------------------------------------------------------------------------
-- 1. A capability, e o modelo
-- ---------------------------------------------------------------------------
--
-- `text_gen` e não `script_gen`: a capability descreve o que o modelo sabe
-- fazer, não para que nós o usamos hoje. Um redator de legendas futuro usa a
-- mesma, e uma capability nomeada pelo primeiro cliente é uma capability que
-- será copiada em vez de reusada — o mesmo erro que `productId` cometeu antes de
-- virar `groupId` em 10/08.

insert into public.ai_providers (slug, display_name, env_var_name, sort_order)
select 'google', 'Google', 'GEMINI_API_KEY', 30
where not exists (select 1 from public.ai_providers where slug = 'google');

insert into public.ai_models (
  provider_id, slug, display_name, capabilities, is_default, enabled, sort_order
)
select p.id,
       'gemini-3.7-flash',
       'Gemini 3.7 Flash',
       array['text_gen']::text[],
       true,
       true,
       60
  from public.ai_providers p
 where p.slug = 'google'
   and not exists (
     select 1 from public.ai_models m
      where m.provider_id = p.id and m.slug = 'gemini-3.7-flash'
   );

comment on column public.ai_models.capabilities is
  'O que este modelo sabe fazer: extraction, translation, image_gen, video_gen, '
  'text_gen. É o que faz uma tabela só servir o produto inteiro — e é por '
  'capability, e não por fornecedor, que o produto decide o que pode ser '
  'selecionado onde.';

-- ---------------------------------------------------------------------------
-- 2. ai_model_text_prices — preço por TRABALHO, não por tamanho
-- ---------------------------------------------------------------------------
--
-- Terceira irmã de ai_model_image_prices e ai_model_video_prices, e herda delas
-- o segundo papel, que é o mais importante: **é o catálogo que diz o que um
-- modelo oferece, porque não se oferece o que não se sabe cobrar.**
--
-- A dimensão aqui não é resolução nem duração: é `job_kind`, o tipo de trabalho.
-- Escrever dez fichas do zero, estruturar um roteiro colado e reescrever uma
-- ficha são três trabalhos com três consumos de token medidos, e cobrar o mesmo
-- pelos três seria o mesmo erro que cair no preço-base de 2K para entregar 4K.
--
-- **Sem `real_cost_cents` aqui, e a assimetria com a tabela de vídeo é
-- deliberada.** A fal cobra por segundo, de forma determinística: lá o custo é
-- fato de catálogo. O Google cobra por token, e o número de tokens de saída
-- depende do que o modelo resolveu pensar — então o custo real é conta feita em
-- src/lib/ai/pricing.ts a partir do que a resposta reportou, como na imagem.
--
-- ⚠️ E essa conta usa a TARIFA VIGENTE, não a de tabela, porque `cost_real_cents`
--    existe para bater com a FATURA. O gemini-3.7-flash está promocional em
--    US$ 0,75/3,75 por milhão de tokens até 31/12/2026 e vai a US$ 1,50/7,50 em
--    01/01/2027. O preço em Sparks abaixo é calculado na tabela cheia (para a
--    virada não obrigar a mexer em nada); o custo registrado tem de ser o
--    promocional enquanto ele valer, ou a conciliação extrato-contra-fatura —
--    o ritual que validou a Frente Vídeo — não fecha por quatro meses.
--
--    👉 PENDÊNCIA DATADA: em 01/01/2027 a tarifa de custo do gemini-3.7-flash
--       passa a ser 1,50/7,50 em src/lib/ai/pricing.ts. Está implementada lá
--       como vigência por data, não como constante única.

create table public.ai_model_text_prices (
  id uuid primary key default gen_random_uuid(),
  model_id uuid not null references public.ai_models (id) on delete cascade,
  job_kind text not null,
  sparks integer not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),

  constraint ai_model_text_prices_unique unique (model_id, job_kind),
  constraint ai_model_text_prices_sparks_positive check (sparks > 0),
  -- Lista fechada, ao contrário de `image_size` e `resolution`. A diferença é
  -- de quem manda: aqueles dois são vocabulário do FORNECEDOR e mudam quando ele
  -- publica um tamanho novo; `job_kind` é vocabulário NOSSO — são os gestos que
  -- o nosso produto oferece. Um valor novo aqui é uma funcionalidade nova, e
  -- funcionalidade nova já vem com migration de qualquer jeito.
  constraint ai_model_text_prices_job_kind_valid
    check (job_kind in ('roteiro', 'estruturar', 'cena'))
);

comment on table public.ai_model_text_prices is
  'Preço em Sparks de uma geração de texto, por modelo × tipo de trabalho. É '
  'também a lista do que cada modelo oferece: não se oferece um trabalho que não '
  'se sabe cobrar. Lida por record_generation() para decidir o preço e pela tela '
  'para dizer o custo antes do clique. Irmã de ai_model_image_prices e '
  'ai_model_video_prices — e a única das três sem real_cost_cents, porque o '
  'Google cobra por token e o custo real é conta de src/lib/ai/pricing.ts.';

comment on column public.ai_model_text_prices.job_kind is
  'Qual gesto do produto: roteiro (uma ideia vira até 10 fichas), estruturar (um '
  'roteiro colado vira fichas) ou cena (uma ficha é reescrita com instrução). '
  'Lista fechada porque é vocabulário nosso, não do fornecedor.';

create index ai_model_text_prices_model_id_idx
  on public.ai_model_text_prices (model_id);

-- Só modelo de texto tem preço de texto.
--
-- Espelho exato de enforce_image_price_capability e enforce_video_price_capability.
-- Não cabe num CHECK porque a capability mora na outra tabela — e sem o gatilho,
-- uma linha de preço apontando para um modelo de extração ficaria ali, invisível,
-- até o dia em que alguém a lesse.

create or replace function public.enforce_text_price_capability()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not exists (
    select 1
      from public.ai_models m
     where m.id = new.model_id
       and 'text_gen' = any (m.capabilities)
  ) then
    raise exception 'text prices belong to models with the text_gen capability'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

comment on function public.enforce_text_price_capability() is
  'Recusa preço de texto para modelo que não gera texto. Espelho, entre tabelas, '
  'do que um CHECK faria se a capability morasse na mesma linha.';

create trigger ai_model_text_prices_enforce_capability
  before insert or update of model_id on public.ai_model_text_prices
  for each row execute function public.enforce_text_price_capability();

-- Mesma razão de 20260807150000_revoke_trigger_function_execute.sql: o Supabase
-- concede EXECUTE em funções novas de `public` para os papéis da API, o que as
-- publica como endpoints /rest/v1/rpc.
revoke execute on function public.enforce_text_price_capability()
  from public, anon, authenticated;

-- RLS: todo autenticado lê, ninguém escreve — a mesma do resto do catálogo.
-- Nada de privado num preço de tabela, e o bloco precisa dele para dizer o custo
-- antes do clique.

alter table public.ai_model_text_prices enable row level security;

create policy ai_model_text_prices_select_all
  on public.ai_model_text_prices for select
  to authenticated
  using (true);

revoke all on public.ai_model_text_prices from anon;

-- ---------------------------------------------------------------------------
-- 3. O preço, semeado — régua da casa sobre o PIOR CASO medido
-- ---------------------------------------------------------------------------
--
-- Custo real em centavos de BRL à taxa registrada (550 centavos por dólar,
-- espelhando src/lib/ai/pricing.ts), na TARIFA DE TABELA (1,50/7,50), vezes 1,35
-- de margem. Medições da Fase 0, receita v3, gemini-3.7-flash:
--
--   roteiro     in 1.416  out 2.105  ->  9,85c -> 10c -> 13,50 -> 15 ⚡  (1,50×)
--   estruturar  in 1.764  out 1.825  ->  8,98c ->  9c -> 12,15 -> 15 ⚡  (1,67×)
--   cena        in 1.772  out   240  ->  2,45c ->  3c ->  4,05 ->  5 ⚡  (1,67×)
--
-- `estruturar` é precificado no pior caso medido — condensar 14 cenas em 10 —,
-- e não no caso típico (6 cenas, 6,77c). O pior caso é o que o preço tem de
-- cobrir; calibrar contra a média é como um estruturar longo vira prejuízo
-- silencioso.
--
-- ARREDONDAMENTO PARA CIMA, e isto é regra nova da casa (16/08/2026).
-- A régua sempre disse "arredondado ao múltiplo de 5 mais próximo", e isso
-- funciona quando o preço tem dois ou três dígitos: o 4K foi de 112,1 para 110,
-- um desconto de 2%. No chão da régua ela se anula — 5c × 1,35 = 6,75, que
-- "ao mais próximo" vira **5 ⚡, margem 1,0×**. Abaixo de ~20 ⚡, arredonda-se
-- para cima, sempre. Registrado em docs/decisoes.md.
--
-- Nota de conferência: na tarifa promocional vigente hoje o custo real é metade
-- do calculado acima (5c / 4c / 2c), então as margens efetivas até 31/12/2026
-- são 3,0× / 3,75× / 2,5×. O registro erra para cima de propósito — mesmo
-- precedente do Sonnet em src/lib/ai/pricing.ts — e é por isso que a virada de
-- 01/01/2027 não obriga a mexer no preço.

insert into public.ai_model_text_prices (model_id, job_kind, sparks, sort_order)
select m.id, p.job_kind, p.sparks, p.sort_order
  from public.ai_models m
  join public.ai_providers pr on pr.id = m.provider_id
 cross join (values
   ('roteiro',    15, 10),
   ('estruturar', 15, 20),
   ('cena',        5, 30)
 ) as p(job_kind, sparks, sort_order)
 where pr.slug = 'google' and m.slug = 'gemini-3.7-flash'
on conflict (model_id, job_kind) do nothing;

-- ---------------------------------------------------------------------------
-- 4. record_generation aprende a perguntar o preço do TRABALHO
-- ---------------------------------------------------------------------------
--
-- Códigos de erro, continuando a série da casa:
--
--   GN001  Sparks insuficientes para esta geração
--   GN002  personagem inexistente para este usuário (ou arquivada)
--   GN003  o modelo não está habilitado para o tipo de mídia pedido
--   GN004  projeto inexistente para este usuário
--   GN005  o modelo não tem preço para esse tamanho de imagem
--   GN006  a personagem não está vinculada a este projeto
--   GN007  o modelo não tem preço para esse tipo de trabalho de texto   <- novo
--
-- Uma função e não uma irmã, e a escolha é explícita: o requisito 1 deste ciclo
-- diz "cobrança exclusivamente via record_generation". Uma
-- `record_script_generation` teria precedente — `complete_video_generation`
-- também escreve em `generations` e no ledger — mas aquele par nasceu por o
-- vídeo ser ASSÍNCRONO, que texto não é. Uma função para toda geração síncrona
-- mantém o preço decidido num lugar só.
--
-- E o ganho de reuso não é o código: são as travas. `p_entity_id` num roteiro
-- faz GN002 (posse) e GN006 (vínculo com o projeto) valerem para a menção de uma
-- ficha **sem uma linha nova** — a muralha da Etapa D2 protegendo o roteiro de
-- graça.

drop function if exists public.record_generation(
  uuid, public.generation_status, uuid, jsonb, jsonb,
  integer, integer, integer, uuid, uuid, text, jsonb, text,
  text, uuid, text, text
);

create or replace function public.record_generation(
  p_model_id uuid,
  p_status public.generation_status,
  p_entity_id uuid default null,
  p_prompt_compiled jsonb default null,
  p_params jsonb default null,
  p_input_tokens integer default null,
  p_output_tokens integer default null,
  p_real_cost_cents integer default null,
  p_result_asset_id uuid default null,
  p_entity_version_id uuid default null,
  p_sheet_source text default null,
  p_summary jsonb default null,
  p_error_message text default null,
  p_prompt_user_pt text default null,
  p_project_id uuid default null,
  p_node_id text default null,
  p_image_size text default null,
  -- Nasce com default 'image': é o que faz toda chamada já publicada continuar
  -- significando exatamente o que significava.
  p_media_kind public.media_kind default 'image',
  p_job_kind text default null
)
returns public.generations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_sparks integer;
  v_sized_sparks integer;
  v_charged integer;
  v_charged_cents integer;
  v_balance integer;
  v_handle text;
  v_provider_slug text;
  v_model_slug text;
  v_workflow_id uuid;
  v_generation public.generations;
begin
  if v_user_id is null then
    raise exception 'record_generation requires an authenticated session'
      using errcode = 'insufficient_privilege';
  end if;

  -- Vídeo tem duas funções próprias porque é assíncrono: submit_video_generation
  -- cria a linha `queued` sem cobrar, complete_video_generation cobra quando o
  -- vídeo existe. Aceitar 'video' aqui seria um terceiro caminho para o mesmo
  -- dinheiro, e o primeiro a divergir seria o que ninguém testa.
  if p_media_kind = 'video' then
    raise exception 'video generations are recorded by submit/complete_video_generation'
      using errcode = 'check_violation';
  end if;

  -- -------------------------------------------------------------------------
  -- Por que `p_media_kind::text = 'text'` e não `p_media_kind = 'text'`
  -- -------------------------------------------------------------------------
  --
  -- Não é estilo. O rótulo 'text' nasce na migration anterior, e a comparação
  -- direta obrigaria o Postgres a resolver o literal como rótulo do enum — o
  -- que só é possível DEPOIS que aquele ALTER TYPE tiver commitado.
  --
  -- Se o `supabase db push` roda cada arquivo na sua própria transação, isso
  -- está garantido. Só que **a documentação do CLI não diz isso em lugar
  -- nenhum e não há flag que o controle**, ou seja: seria uma aposta em
  -- comportamento não documentado, num arquivo que roda uma vez só, na mão de
  -- outra pessoa, no meio de quatro migrations.
  --
  -- Convertendo o enum para texto, nada aqui precisa que o rótulo exista no
  -- momento em que esta função é criada. A separação em dois arquivos continua
  -- (é o que a doc do PostgreSQL exige de fato); isto é o suspensório.
  if p_media_kind::text = 'text' and p_job_kind is null then
    raise exception 'a text generation must name its job kind'
      using errcode = 'check_violation';
  end if;

  if p_media_kind::text = 'text' and p_image_size is not null then
    raise exception 'a text generation has no image size'
      using errcode = 'check_violation';
  end if;

  -- A generation for a character must be for a character the caller owns.
  -- Checked here rather than trusted from the application because security
  -- definer means RLS is not doing it for us any more.
  if p_entity_id is not null then
    select e.handle into v_handle
      from public.entities e
     where e.id = p_entity_id
       and e.user_id = v_user_id
       and e.archived_at is null;

    if v_handle is null then
      raise exception 'character not found for this user'
        using errcode = 'GN002';
    end if;
  end if;

  -- Same rule for the project: without this check, security definer would let a
  -- caller file their generation under somebody else's tab. The workflow comes
  -- from the project itself — one project, one workflow, so there is nothing to
  -- reconcile and nothing to get wrong.
  if p_project_id is not null then
    select w.id into v_workflow_id
      from public.workflows w
      join public.projects p on p.id = w.project_id
     where w.project_id = p_project_id
       and p.user_id = v_user_id;

    if v_workflow_id is null then
      raise exception 'project not found for this user'
        using errcode = 'GN004';
    end if;
  end if;

  -- GN006 — a personagem tem de trabalhar neste projeto (Etapa D2).
  --
  -- Só quando os dois existem, e isso é o que mantém intactos os dois casos
  -- legítimos que não têm vínculo nenhum a consultar: a **geração canônica**,
  -- que nasce no editor da personagem e não tem projeto, e a geração de canvas
  -- **sem personagem**, que não tem quem vincular.
  --
  -- Nunca deveria disparar: a aplicação recusa antes, no passo 2, onde a recusa
  -- é de graça. Está aqui para o dia em que um caminho novo esquecer daquela
  -- linha — e nesse dia é melhor uma imagem perdida do que uma menção resolvida
  -- fora do escopo do projeto que a pagou.
  --
  -- E a partir desta migration ele vale também para o ROTEIRO, sem uma linha
  -- nova: uma ficha que menciona @luna passa o entity_id por aqui.
  if p_entity_id is not null and p_project_id is not null then
    if not exists (
      select 1
        from public.project_entities pe
       where pe.project_id = p_project_id
         and pe.entity_id = p_entity_id
    ) then
      raise exception 'character is not linked to this project'
        using errcode = 'GN006';
    end if;
  end if;

  -- -------------------------------------------------------------------------
  -- O preço é sempre resposta do catálogo, e nunca do chamador. O que muda
  -- entre os dois ramos é QUAL pergunta o catálogo responde.
  -- -------------------------------------------------------------------------

  if p_media_kind::text = 'text' then
    select p.slug, m.slug
      into v_provider_slug, v_model_slug
      from public.ai_models m
      join public.ai_providers p on p.id = m.provider_id
     where m.id = p_model_id
       and m.enabled
       and p.enabled
       and 'text_gen' = any (m.capabilities);

    if v_model_slug is null then
      raise exception 'model is not an enabled text generation model'
        using errcode = 'GN003';
    end if;

    -- Sem preço-base para cair: ao contrário da imagem, não existe
    -- `ai_models.text_sparks`. Um trabalho sem linha de preço é um trabalho que
    -- não se sabe cobrar, e cobrar por adivinhação é exatamente o buraco que
    -- esta tabela fecha.
    select tp.sparks into v_sparks
      from public.ai_model_text_prices tp
     where tp.model_id = p_model_id
       and tp.job_kind = p_job_kind;

    if v_sparks is null then
      raise exception 'model has no price for this text job kind'
        using errcode = 'GN007';
    end if;
  else
    -- The price is the catalogue's answer, and the model has to actually be an
    -- image model that is switched on — for itself and for its provider.
    select m.image_sparks, p.slug, m.slug
      into v_sparks, v_provider_slug, v_model_slug
      from public.ai_models m
      join public.ai_providers p on p.id = m.provider_id
     where m.id = p_model_id
       and m.enabled
       and p.enabled
       and 'image_gen' = any (m.capabilities);

    if v_sparks is null then
      raise exception 'model is not an enabled image generation model'
        using errcode = 'GN003';
    end if;

    -- Um tamanho nomeado troca o preço-base pelo preço daquele tamanho — e, se não
    -- houver linha, **recusa**. Cair no preço-base seria entregar 4K cobrando 2K,
    -- que é precisamente o buraco que esta tabela existe para fechar. Quem não
    -- nomeia tamanho (a geração canônica) segue no preço-base, sem mudança nenhuma.
    if p_image_size is not null then
      select ip.sparks into v_sized_sparks
        from public.ai_model_image_prices ip
       where ip.model_id = p_model_id
         and ip.image_size = p_image_size;

      if v_sized_sparks is null then
        raise exception 'model has no price for this image size'
          using errcode = 'GN005';
      end if;

      v_sparks := v_sized_sparks;
    end if;
  end if;

  -- Failure is free. Everything else pays the catalogue price.
  --
  -- É a mesma linha de sempre, e é ela que cumpre o requisito 1 deste ciclo sem
  -- nada de novo: JSON inválido faz a aplicação chamar com status 'failed', e
  -- 'failed' não cobra — por este `case` e pela constraint
  -- generations_failed_is_free, que vale mesmo se o `case` fosse esquecido.
  v_charged := case when p_status = 'succeeded' then v_sparks else 0 end;
  v_charged_cents := v_charged * public.cents_per_spark();

  if v_charged > 0 then
    select w.balance_cents into v_balance
      from public.wallets w
     where w.user_id = v_user_id
       for update;

    -- The wallet constraint would abort the transaction anyway; checking first
    -- only buys a code the interface can turn into a sentence. The row is
    -- locked above so the check and the debit cannot be separated by another
    -- transaction.
    if coalesce(v_balance, 0) < v_charged_cents then
      raise exception 'insufficient balance for this generation'
        using errcode = 'GN001';
    end if;
  end if;

  insert into public.generations (
    user_id, entity_id, model_id, provider, model, params, media_kind,
    project_id, workflow_id, node_id,
    prompt_user_pt, prompt_compiled, status, input_tokens, output_tokens,
    cost_real_cents, cost_charged_cents, sparks_charged,
    result_asset_id, entity_version_id, sheet_source, summary, error_message,
    completed_at
  )
  values (
    v_user_id, p_entity_id, p_model_id, v_provider_slug, v_model_slug,
    coalesce(p_params, '{}'::jsonb), p_media_kind,
    p_project_id, v_workflow_id, p_node_id,
    p_prompt_user_pt, p_prompt_compiled, p_status, p_input_tokens, p_output_tokens,
    coalesce(p_real_cost_cents, 0), v_charged_cents, v_charged,
    p_result_asset_id, p_entity_version_id, p_sheet_source, p_summary,
    p_error_message,
    now()
  )
  returning * into v_generation;

  if v_charged > 0 then
    -- The legitimate ledger path: a signed row whose insert trigger projects the
    -- new balance onto the wallet. Identical in shape to the debit
    -- record_extraction writes, pointing at generation_id instead.
    --
    -- Which sentence the user reads is decided by the data, never by the
    -- caller: a generation with a node came from the canvas, and one without a
    -- node came from the canonical column of the editor. Saying "imagem
    -- canônica de @luna" for a scene the user directed would be a small lie
    -- printed on a financial record.
    --
    -- O ramo de texto existe pela mesma razão, e ele é obrigatório: sem ele o
    -- extrato diria "Imagem no canvas" para um roteiro, e um extrato que nomeia
    -- errado o que foi comprado é pior do que um extrato que não nomeia nada.
    insert into public.ledger_transactions (
      user_id, kind, amount_cents, cost_real_cents, cost_charged_cents,
      generation_id, description
    )
    values (
      v_user_id,
      'debit',
      -v_charged_cents,
      p_real_cost_cents,
      v_charged_cents,
      v_generation.id,
      case
        when p_media_kind::text = 'text' then
          case p_job_kind
            when 'cena' then 'Cena de roteiro regerada'
            when 'estruturar' then 'Roteiro estruturado'
            else 'Roteiro'
          end
          || case when v_handle is not null then ' com @' || v_handle else '' end
        when p_node_id is not null and v_handle is not null
          then 'Imagem no canvas com @' || v_handle
        when p_node_id is not null then 'Imagem no canvas'
        when v_handle is not null then 'Imagem canônica de @' || v_handle
        else 'Geração de imagem'
      end
    );
  end if;

  return v_generation;
end;
$$;

comment on function public.record_generation is
  'Registra uma geração e, no sucesso, debita o ledger por ela — numa transação '
  'só. O preço é lido do catálogo e nunca aceito do chamador: '
  'ai_model_image_prices pelo tamanho nomeado, ai_models.image_sparks quando '
  'nenhum é nomeado, e ai_model_text_prices pelo tipo de trabalho quando '
  'p_media_kind = text. Vídeo NÃO passa por aqui: ele é assíncrono e tem '
  'submit/complete_video_generation. Recusa com GN001 (saldo), GN002 '
  '(personagem não é do chamador), GN003 (modelo não habilitado para esta '
  'mídia), GN004 (projeto não é do chamador), GN005 (sem preço para o tamanho), '
  'GN006 (personagem não vinculada ao projeto) ou GN007 (sem preço para o tipo '
  'de trabalho de texto), para a interface explicar cada caso em português. '
  'Gêmea de public.record_extraction.';

-- ---------------------------------------------------------------------------
-- Concessões, reemitidas contra a assinatura nova
-- ---------------------------------------------------------------------------
--
-- Uma função removida leva as concessões dela junto, então isto não é repetição:
-- sem estas linhas a assinatura nova cairia no EXECUTE default que PUBLIC
-- carrega — que é exatamente o que o primeiro revoke existe para tirar.

revoke execute on function public.record_generation(
  uuid, public.generation_status, uuid, jsonb, jsonb,
  integer, integer, integer, uuid, uuid, text, jsonb, text,
  text, uuid, text, text, public.media_kind, text
) from public, anon;

grant execute on function public.record_generation(
  uuid, public.generation_status, uuid, jsonb, jsonb,
  integer, integer, integer, uuid, uuid, text, jsonb, text,
  text, uuid, text, text, public.media_kind, text
) to authenticated;
