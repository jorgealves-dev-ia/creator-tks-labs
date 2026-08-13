-- FRENTE VÍDEO · Ciclo 1 — o banco do motor assíncrono.
--
-- Especificação: docs/decisoes.md (entrada de 13/08/2026, Frente Vídeo Fase 1).
--
-- ---------------------------------------------------------------------------
-- O que esta migration NÃO precisou criar
-- ---------------------------------------------------------------------------
--
-- Quase tudo já estava aqui, e isso não é sorte: a Fase 0 escreveu `generations`
-- para o vídeo antes de existir imagem. O comentário da tabela diz, desde
-- 07/08/2026, palavra por palavra:
--
--   "Generation is always asynchronous: a server route creates the row as
--    queued, the provider webhook updates it, and Realtime pushes the status
--    to the canvas."
--
-- Então já existem, sem uma linha nova: `provider_job_id`, o enum de status com
-- `queued`/`running`, `assets.kind = 'video'`, `assets.duration_ms`,
-- `ledger_transactions.generation_id`, e a publicação Realtime com `generations`
-- dentro. O que falta é catálogo, um discriminador e três funções.
--
-- ---------------------------------------------------------------------------
-- A ordem de aplicação, medida e não assumida
-- ---------------------------------------------------------------------------
--
-- **Esta migration é segura antes do código.** Tudo aqui é aditivo: a coluna
-- nova tem default, as tabelas e funções novas não têm chamador, e nenhuma
-- trava passa a valer sobre um caminho existente.
--
-- Não há aqui a armadilha do GN006 (Etapa D2, Fase 2), em que um backstop de
-- banco subiria antes da checagem da aplicação e viraria a única checagem, no
-- pior lugar possível. Nada nesta migration pode disparar sobre código que já
-- roda, porque nada que já roda a alcança.

-- ---------------------------------------------------------------------------
-- 1. O fornecedor
-- ---------------------------------------------------------------------------
--
-- A fal é o primeiro **agregador** do catálogo. A Decisão 2 da arquitetura já
-- previa exatamente isto: API direta quando o desenvolvedor oferece conta de
-- desenvolvedor viável, agregador quando o acesso direto tem fricção real — o
-- caso do Kling, que exigiria conta de desenvolvedor chinesa.
--
-- E ela é o fornecedor, não o modelo: o adaptador deste ciclo é da fal, e o
-- Kling é apenas a primeira linha de catálogo dela.

insert into public.ai_providers (slug, display_name, env_var_name, enabled, sort_order)
values ('fal', 'fal.ai', 'FAL_KEY', true, 50)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- 2. O modelo
-- ---------------------------------------------------------------------------
--
-- `slug` é "o identificador oficial do modelo na API do fornecedor, copiado
-- verbatim da documentação dele" — e na fal esse identificador **é a rota**.
-- Por isso o endpoint inteiro cabe na coluna que já existe, e o motor não
-- precisa de nenhuma tabela de rotas: ele monta a URL com este texto.
--
-- É também o que torna verdadeiro o critério de prova do adendo deste ciclo:
-- **um segundo modelo da fal é uma linha aqui mais preço abaixo, sem tocar no
-- motor.**
--
-- Escolhido entre as sete variantes de image-to-video do Kling na fal por ser a
-- mais barata (US$ 0,28 por 5s, contra 0,35 da 2.5-turbo pro e 0,80 da 2.1 pro):
-- erro barato primeiro.

insert into public.ai_models (
  provider_id, slug, display_name, capabilities, is_default, enabled, sort_order
)
select
  p.id,
  'fal-ai/kling-video/v2.1/standard/image-to-video',
  'Kling 2.1',
  '{video_gen}',
  true,
  true,
  10
from public.ai_providers p
where p.slug = 'fal'
on conflict (provider_id, slug) do nothing;

-- ---------------------------------------------------------------------------
-- 3. O preço de um vídeo
-- ---------------------------------------------------------------------------
--
-- Irmã de `ai_model_image_prices`, com o mesmo desenho e pela mesma razão: uma
-- tabela diz "quanto custa" sem precisar prever quais serão as durações, e
-- ganha de graça o segundo papel, que é o mais importante —
--
--   **é ela quem diz o que um modelo oferece. Não se oferece uma duração que
--   não se sabe cobrar.**
--
-- É isso que trava a v1 em 5 segundos: **não existe linha de 10s**, então 10s
-- não é oferecível. A trava é fato de catálogo, não constante de tela — e
-- destravar depois é uma linha de SQL, não um deploy.
--
-- ---------------------------------------------------------------------------
-- Por que ela guarda `real_cost_cents` e a de imagem não
-- ---------------------------------------------------------------------------
--
-- Em imagem o custo real é calculado dos tokens (lib/ai/pricing.ts), porque o
-- Google cobra por imagem *e* por token. A fal cobra **por segundo de vídeo**,
-- de forma determinística: o custo é um fato do catálogo, igual ao preço.
--
-- Guardá-lo aqui é o que faz a margem ser conferível linha a linha sem depender
-- de nenhuma contagem — que é exatamente para o que `cost_real_cents` existe.

create table public.ai_model_video_prices (
  id uuid primary key default gen_random_uuid(),
  model_id uuid not null references public.ai_models (id) on delete cascade,
  duration_seconds integer not null,
  resolution text not null,
  sparks integer not null,
  real_cost_cents integer not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint ai_model_video_prices_unique
    unique (model_id, duration_seconds, resolution),
  constraint ai_model_video_prices_duration_positive
    check (duration_seconds > 0 and duration_seconds <= 600),
  constraint ai_model_video_prices_sparks_positive check (sparks > 0),
  constraint ai_model_video_prices_real_cost_non_negative check (real_cost_cents >= 0),
  -- O vocabulário é o do provedor, verbatim da documentação dele — "720p",
  -- "1080p". Sem lista fechada, pela mesma razão da tabela de imagem: o dia em
  -- que alguém publicar "4K" não deve exigir migration para mudar um CHECK.
  constraint ai_model_video_prices_resolution_format
    check (resolution ~ '^[A-Za-z0-9.]{1,16}$')
);

comment on table public.ai_model_video_prices is
  'Preço em Sparks de um vídeo, por modelo × duração × resolução. É também a '
  'lista do que cada modelo oferece: não se oferece uma duração que não se sabe '
  'cobrar — e é isto, e não uma constante na tela, que trava a v1 em 5 segundos. '
  'Lida por complete_video_generation() para decidir o preço e por '
  'submit_video_generation() para conferir o saldo antes de submeter. Irmã de '
  'ai_model_image_prices.';

comment on column public.ai_model_video_prices.real_cost_cents is
  'O que a fal cobra de nós por este clipe, em centavos de BRL. Diferente da '
  'imagem, o custo de vídeo é determinístico por segundo — então ele é fato de '
  'catálogo, e não conta de tokens. É o que torna a margem conferível linha a '
  'linha contra a fatura.';

comment on column public.ai_model_video_prices.resolution is
  'A resolução de saída do endpoint, verbatim da documentação do fornecedor. '
  'No Kling 2.1 standard ela é fixa (720p) e não é parâmetro da API: é '
  'propriedade do endpoint, e por isso mora na linha de preço e não no pedido.';

-- ---------------------------------------------------------------------------
-- Só modelo de vídeo tem preço de vídeo
-- ---------------------------------------------------------------------------
--
-- Espelho exato de enforce_image_price_capability(). Não cabe num CHECK porque
-- a capability mora na outra tabela — e sem o gatilho, uma linha de preço de
-- vídeo apontando para um modelo de extração não daria erro em lugar nenhum:
-- ficaria ali, invisível, até o dia em que alguém a lesse.

create or replace function public.enforce_video_price_capability()
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
       and 'video_gen' = any (m.capabilities)
  ) then
    raise exception 'video prices belong to models with the video_gen capability'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

comment on function public.enforce_video_price_capability() is
  'Recusa preço de vídeo para modelo que não gera vídeo. Espelho, entre tabelas, '
  'do que um CHECK faria se a capability morasse na mesma linha.';

create trigger ai_model_video_prices_enforce_capability
  before insert or update of model_id on public.ai_model_video_prices
  for each row execute function public.enforce_video_price_capability();

-- Mesma razão de 20260807150000_revoke_trigger_function_execute.sql: o Supabase
-- concede EXECUTE em funções novas de `public` para os papéis da API, o que as
-- publica como endpoints /rest/v1/rpc.
revoke execute on function public.enforce_video_price_capability()
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- RLS — a mesma do resto do catálogo
-- ---------------------------------------------------------------------------
--
-- Todo autenticado lê; ninguém escreve. Não há nada de privado num preço de
-- tabela, e o bloco precisa dele para dizer o custo antes do clique. Sem
-- política de INSERT/UPDATE/DELETE, de propósito: nada que um usuário faça pode
-- mudar o que um vídeo custa.

alter table public.ai_model_video_prices enable row level security;

create policy ai_model_video_prices_select_all
  on public.ai_model_video_prices for select
  to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- 4. O preço, semeado
-- ---------------------------------------------------------------------------
--
-- Régua da casa, a mesma dos seeds de 20260809140000 e 20260810180000: custo
-- real em centavos de BRL à taxa registrada (550 centavos por dólar, espelhando
-- src/lib/ai/pricing.ts), vezes 1,35 de margem, arredondado ao múltiplo de 5.
--
--   Kling 2.1 standard, 5s   US$ 0,28 -> 154,0c -> 207,9 -> 210 ⚡
--
-- Fonte do preço, lida em 13/08/2026 na página do modelo:
--   "For 5s video your request will cost $0.28. For every additional second
--    you will be charged $0.056."
--
-- ⚠️ A mesma página traz, no readme, "5-second video: $0.25". A divergência
-- está registrada em decisoes.md e **será arbitrada pela fatura real na Fase 4**
-- — é para isso que real_cost_cents existe. Se a fatura disser 0,25, este número
-- muda por migration, como o preço do Sonnet mudou.
--
-- 10 segundos NÃO é semeado, e a ausência é a funcionalidade: sem linha, a
-- duração não é oferecível nem cobrável.

insert into public.ai_model_video_prices (
  model_id, duration_seconds, resolution, sparks, real_cost_cents, sort_order
)
select m.id, 5, '720p', 210, 154, 10
from public.ai_models m
join public.ai_providers p on p.id = m.provider_id
where p.slug = 'fal'
  and m.slug = 'fal-ai/kling-video/v2.1/standard/image-to-video'
on conflict (model_id, duration_seconds, resolution) do nothing;

-- ---------------------------------------------------------------------------
-- 5. O discriminador
-- ---------------------------------------------------------------------------
--
-- Até hoje "é imagem" era implícito, porque não havia outra coisa. Agora precisa
-- ser dito.
--
-- **Por que uma coluna e não `assets.kind` do resultado.** Porque uma geração
-- `failed` não tem asset e uma `queued` ainda não tem — e é exatamente nesses
-- dois estados que a tela precisa saber o que desenhar. Derivar do resultado
-- deixaria toda tentativa perdida sem tipo, e "qual foi o último vídeo que
-- falhou?" é justamente a pergunta que o histórico existe para responder.
--
-- O default classifica as linhas existentes corretamente sem backfill: tudo o
-- que este produto já gerou foi imagem.

create type public.media_kind as enum ('image', 'video');

alter table public.generations
  add column media_kind public.media_kind not null default 'image';

comment on column public.generations.media_kind is
  'O que esta geração produz. Explícito e não derivado de result_asset_id '
  'porque uma linha queued ainda não tem asset e uma failed nunca terá — e são '
  'esses dois estados que a tela mais precisa saber desenhar.';

-- ---------------------------------------------------------------------------
-- 6. A idempotência do webhook, garantida pelo índice
-- ---------------------------------------------------------------------------
--
-- O índice antigo em (provider, provider_job_id) era não-único. A fal reentrega
-- **até 31 vezes** com backoff quando o endpoint não responde 2xx, então duas
-- entregas da mesma geração são o caso normal, não o excepcional.
--
-- Único, aqui, não é otimização: é a garantia de que "esta linha é o trabalho
-- daquele request_id" tem no máximo uma resposta. O índice antigo é derrubado
-- porque cobre exatamente as mesmas colunas na mesma ordem — mantê-lo seria
-- pagar duas vezes pela mesma leitura.

drop index if exists public.generations_provider_job_id_idx;

create unique index generations_provider_job_id_idx
  on public.generations (provider, provider_job_id)
  where provider_job_id is not null;

-- ---------------------------------------------------------------------------
-- 7. submit_video_generation — a intenção, sem um centavo
-- ---------------------------------------------------------------------------
--
-- Cria a linha `queued` **antes** de o provedor ser chamado, pela doutrina que o
-- motor de extração deixou escrita: *"foto registrada antes da chamada — uma
-- extração que falhou ainda responde 'o que ela tentou ler?'"*. A ordem inversa
-- (chamar a fal e depois gravar) trocaria uma linha órfã por um vídeo pago que
-- o nosso sistema não sabe que existe, que é infinitamente pior.
--
-- **Ela não cobra nada**, e isso é a invariante 5 valendo aqui sem esforço:
-- fila é intenção, ledger é fato. O saldo é conferido — para dizer não antes de
-- gastar, como o passo 5 do runCanvasGeneration faz — mas nenhum lançamento é
-- escrito. Quem cobra é o webhook, quando existe vídeo.
--
-- Códigos de recusa, série nova:
--
--   VD001  Sparks insuficientes para este vídeo
--   VD002  projeto inexistente para este usuário
--   VD003  o modelo não é um modelo de vídeo habilitado
--   VD004  o modelo não tem preço para essa duração e resolução

create or replace function public.submit_video_generation(
  p_model_id uuid,
  p_project_id uuid,
  p_node_id text,
  p_duration_seconds integer,
  p_resolution text,
  p_prompt_user_pt text default null,
  p_prompt_compiled jsonb default null,
  p_params jsonb default null,
  p_summary jsonb default null
)
returns public.generations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_provider_slug text;
  v_model_slug text;
  v_sparks integer;
  v_workflow_id uuid;
  v_balance integer;
  v_generation public.generations;
begin
  if v_user_id is null then
    raise exception 'submit_video_generation requires an authenticated session'
      using errcode = 'insufficient_privilege';
  end if;

  -- O projeto tem de ser de quem chama. `security definer` desliga o RLS, então
  -- esta checagem é a que sobra — sem ela, alguém arquivaria a própria geração
  -- na aba de outra pessoa. O workflow vem do projeto e nunca é aceito: um
  -- projeto tem exatamente um workflow, então quem pudesse nomear os dois só
  -- poderia introduzir a chance de discordarem.
  select w.id into v_workflow_id
    from public.workflows w
    join public.projects p on p.id = w.project_id
   where w.project_id = p_project_id
     and p.user_id = v_user_id;

  if v_workflow_id is null then
    raise exception 'project not found for this user'
      using errcode = 'VD002';
  end if;

  -- O modelo, e ele tem de ser de vídeo e estar aceso — para si e para o
  -- fornecedor dele.
  select p.slug, m.slug
    into v_provider_slug, v_model_slug
    from public.ai_models m
    join public.ai_providers p on p.id = m.provider_id
   where m.id = p_model_id
     and m.enabled
     and p.enabled
     and 'video_gen' = any (m.capabilities);

  if v_model_slug is null then
    raise exception 'model is not an enabled video generation model'
      using errcode = 'VD003';
  end if;

  -- O preço, do catálogo e só do catálogo. Sem fallback: um modelo cuja tabela
  -- não precifica esta duração não pode gerar por um preço que a gente saiba
  -- nomear — e nomear outro é como 10 segundos acabariam cobrados como 5.
  select vp.sparks into v_sparks
    from public.ai_model_video_prices vp
   where vp.model_id = p_model_id
     and vp.duration_seconds = p_duration_seconds
     and vp.resolution = p_resolution;

  if v_sparks is null then
    raise exception 'model has no price for this duration and resolution'
      using errcode = 'VD004';
  end if;

  -- Saldo conferido agora, para a recusa ser barata e amigável. Não é reserva:
  -- nada é debitado nem bloqueado, e o mesmo saldo é conferido de novo lá na
  -- frente, quando houver vídeo para pagar.
  select w.balance_cents into v_balance
    from public.wallets w
   where w.user_id = v_user_id;

  if coalesce(v_balance, 0) < v_sparks * public.cents_per_spark() then
    raise exception 'insufficient balance for this video'
      using errcode = 'VD001';
  end if;

  insert into public.generations (
    user_id, model_id, provider, model, media_kind, status,
    project_id, workflow_id, node_id,
    prompt_user_pt, prompt_compiled, summary, params,
    cost_real_cents, cost_charged_cents, sparks_charged
  )
  values (
    v_user_id, p_model_id, v_provider_slug, v_model_slug, 'video', 'queued',
    p_project_id, v_workflow_id, p_node_id,
    p_prompt_user_pt, p_prompt_compiled, p_summary,
    -- As chaves da casa vão à direita do `||` de propósito: elas vencem o que
    -- o chamador mandou. Duração e resolução decidem o preço mais tarde, então
    -- não podem ser texto vindo do navegador — são os valores que esta função
    -- acabou de validar contra o catálogo.
    coalesce(p_params, '{}'::jsonb) || jsonb_build_object(
      'duration_seconds', p_duration_seconds,
      'resolution', p_resolution,
      'endpoint', v_model_slug
    ),
    0, 0, 0
  )
  returning * into v_generation;

  return v_generation;
end;
$$;

comment on function public.submit_video_generation is
  'Cria a linha de uma geração de vídeo como queued, antes de o provedor ser '
  'chamado — e sem cobrar nada. Fila é intenção, ledger é fato (invariante 5): '
  'o saldo é conferido aqui só para a recusa ser barata, e o débito acontece em '
  'complete_video_generation, quando existe vídeo. Duração e resolução são '
  'validadas contra ai_model_video_prices e gravadas em params, de onde o preço '
  'será relido — o chamador nomeia, o catálogo precifica. Recusa com VD001 '
  '(saldo), VD002 (projeto não é do chamador), VD003 (modelo não é de vídeo '
  'habilitado) e VD004 (sem preço para essa duração e resolução).';

-- ---------------------------------------------------------------------------
-- 8. attach_video_job — o número do protocolo
-- ---------------------------------------------------------------------------
--
-- Roda logo depois do submit à fal, ainda dentro da requisição do usuário, e
-- guarda duas coisas: o `request_id` e **as URLs que a fal devolveu**.
--
-- ---------------------------------------------------------------------------
-- As URLs são guardadas, nunca construídas — e isto foi medido
-- ---------------------------------------------------------------------------
--
-- O path de `requests/` da fal usa o **app base id**, não o endpoint versionado.
-- Medido ao vivo em 13/08/2026 (Fase 0):
--
--   queue.fal.run/fal-ai/kling-video/requests/<id>/status                   -> 401
--   queue.fal.run/fal-ai/kling-video/v2.1/standard/image-to-video/.../status -> 405
--
-- Ou seja: a URL óbvia é a errada. Montá-la a partir do slug do modelo
-- funcionaria em todo lugar menos onde importa, e a reconciliação quebraria em
-- silêncio — que é o modo de falha mais caro que existe, porque o sintoma é um
-- node parado para sempre e a causa é uma string.
--
-- ---------------------------------------------------------------------------
-- Por que o status vira `running` aqui
-- ---------------------------------------------------------------------------
--
-- A fal distingue a fila dela (IN_QUEUE) do trabalho dela (IN_PROGRESS), e o
-- webhook só fala no fim — então esse par só se descobre perguntando. Para quem
-- olha o canvas, a distinção não existe: o trabalho saiu das mãos dele e está
-- sendo feito. `queued` fica significando "ainda não entreguei", que é o estado
-- em que a nossa fila do cliente segura o slot, e `running` passa a significar
-- "está com o provedor". Duas palavras, dois donos, sem sobreposição.

create or replace function public.attach_video_job(
  p_generation_id uuid,
  p_provider_job_id text,
  p_provider_urls jsonb default null
)
returns public.generations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_generation public.generations;
begin
  if v_user_id is null then
    raise exception 'attach_video_job requires an authenticated session'
      using errcode = 'insufficient_privilege';
  end if;

  if p_provider_job_id is null or length(btrim(p_provider_job_id)) = 0 then
    raise exception 'a provider job id is required'
      using errcode = 'VD005';
  end if;

  -- Sem alias, de propósito: `params = params || …` lê o valor antigo e é
  -- inequívoco com uma tabela só em escopo. Um alias aqui só acrescentaria uma
  -- regra de qualificação para alguém errar depois.
  update public.generations
     set provider_job_id = p_provider_job_id,
         status = 'running',
         started_at = now(),
         params = params || jsonb_build_object(
           'provider', coalesce(p_provider_urls, '{}'::jsonb)
         )
   where id = p_generation_id
     and user_id = v_user_id
     and media_kind = 'video'
     -- Só uma linha que ainda não foi entregue pode receber protocolo. Sem esta
     -- cláusula, uma chamada repetida sobrescreveria o request_id de um trabalho
     -- já terminado — e o webhook do trabalho real deixaria de achar a linha.
     and status = 'queued'
     and provider_job_id is null
  returning * into v_generation;

  if v_generation.id is null then
    raise exception 'no queued video generation to attach this job to'
      using errcode = 'VD005';
  end if;

  return v_generation;
end;
$$;

comment on function public.attach_video_job is
  'Guarda o request_id da fal e as URLs que ela devolveu (status, response, '
  'cancel), e passa a linha para running. As URLs são guardadas e nunca '
  'construídas: medido em 13/08/2026, o path de requests/ usa o app base id e '
  'não o endpoint versionado, então a URL óbvia é a errada e a reconciliação '
  'quebraria em silêncio. Recusa com VD005 quando não há linha queued sem '
  'protocolo para receber — o que também torna a chamada repetida inofensiva. '
  'VD005 não é necessariamente falha: se o webhook chegou primeiro (ele carrega '
  'o id da geração na URL e não depende deste protocolo), a linha já está '
  'terminal e o trabalho deu certo. Quem chama relê a linha antes de concluir '
  'que algo quebrou.';

-- ---------------------------------------------------------------------------
-- 9. complete_video_generation — o fato, e a cobrança
-- ---------------------------------------------------------------------------
--
-- Chamada pelo webhook e pela reconciliação, **pelos dois pelo mesmo caminho**.
-- Duas cópias divergiriam, e a segunda a divergir seria a que ninguém testa.
--
-- ---------------------------------------------------------------------------
-- Só a service role, e por quê
-- ---------------------------------------------------------------------------
--
-- O webhook chega **sem sessão nenhuma** — a fal não tem cookie nosso para
-- mandar. Então `auth.uid()` é nulo aqui, e o `user_id` vem da própria linha.
--
-- Isso obriga a uma escolha, e a alternativa é um buraco: uma função assim
-- concedida a `anon` deixaria qualquer um marcar uma geração como concluída.
-- Por isso o EXECUTE é revogado de todo mundo e concedido só a `service_role` —
-- é o primeiro uso da service role neste produto, e ele é do tipo que a
-- invariante de segurança 2 sempre previu: exclusivamente em código de servidor.
--
-- ---------------------------------------------------------------------------
-- Idempotente, porque a fal reentrega até 31 vezes
-- ---------------------------------------------------------------------------
--
-- O `for update` no topo é o que faz duas entregas **simultâneas** serem seguras,
-- e não só duas em sequência: a segunda espera a primeira sair, encontra a linha
-- já terminal e devolve sem tocar em nada. Sem ele, duas transações leriam
-- `running` ao mesmo tempo e escreveriam dois débitos pelo mesmo vídeo — num
-- livro append-only, onde a correção é um estorno e não um DELETE.
--
-- ---------------------------------------------------------------------------
-- Saldo que acabou no meio do caminho não levanta exceção
-- ---------------------------------------------------------------------------
--
-- Se o usuário gastou tudo nos três minutos em que o Kling trabalhava, a
-- cobrança não cabe. Levantar exceção aqui desfaria a transação inteira, a linha
-- ficaria `running`, o webhook responderia 500 e a fal reentregaria 31 vezes
-- para receber o mesmo erro — um node preso para sempre e trinta e uma
-- tentativas para não chegar a lugar nenhum.
--
-- Então este caso **marca a linha como `failed` com um motivo escrito**, não
-- cobra e retorna normalmente. O vídeo existe do lado da fal e foi pago por nós;
-- o usuário não recebe nem paga. É raro por construção — é justamente para isso
-- que o saldo é conferido na submissão — e é honesto quando acontece.
--
--   VD005  geração inexistente, de outra mídia, ou nada a concluir
--   VD006  o request_id não confere com o que está na linha
--   VD007  status inválido para conclusão

create or replace function public.complete_video_generation(
  p_generation_id uuid,
  p_provider_job_id text,
  p_status public.generation_status,
  p_result_asset_id uuid default null,
  p_real_cost_cents integer default null,
  p_error_message text default null
)
returns public.generations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_generation public.generations;
  v_sparks integer;
  v_charged integer;
  v_charged_cents integer;
  v_balance integer;
  v_real_cost integer;
begin
  if p_status not in ('succeeded', 'failed') then
    raise exception 'a video generation can only be completed as succeeded or failed'
      using errcode = 'VD007';
  end if;

  -- A trava que torna a reentrega segura, inclusive simultânea.
  select * into v_generation
    from public.generations
   where id = p_generation_id
     and media_kind = 'video'
   for update;

  if v_generation.id is null then
    raise exception 'no video generation with this id'
      using errcode = 'VD005';
  end if;

  -- Já terminou: não faz nada e devolve o que já era. Esta é a idempotência, e
  -- ela vem antes de qualquer escrita de propósito.
  if v_generation.status in ('succeeded', 'failed', 'canceled') then
    return v_generation;
  end if;

  -- O protocolo tem de bater. A linha pode ainda não ter um — é a janela entre
  -- o submit à fal e o attach — e nesse caso o webhook, que é assinado, é a
  -- autoridade sobre qual trabalho é este.
  if p_provider_job_id is not null and length(btrim(p_provider_job_id)) > 0 then
    if v_generation.provider_job_id is null then
      update public.generations
         set provider_job_id = p_provider_job_id
       where id = v_generation.id;
    elsif v_generation.provider_job_id <> p_provider_job_id then
      raise exception 'this delivery does not belong to this generation'
        using errcode = 'VD006';
    end if;
  end if;

  v_charged := 0;
  v_real_cost := coalesce(p_real_cost_cents, 0);

  if p_status = 'succeeded' then
    -- O preço, relido do catálogo pelo que a própria função de submissão gravou
    -- em params. Não é o chamador dizendo quanto custa: é o banco perguntando de
    -- novo ao catálogo, com valores que ele mesmo validou lá atrás.
    select vp.sparks, coalesce(p_real_cost_cents, vp.real_cost_cents)
      into v_sparks, v_real_cost
      from public.ai_model_video_prices vp
     where vp.model_id = v_generation.model_id
       and vp.duration_seconds = (v_generation.params->>'duration_seconds')::integer
       and vp.resolution = v_generation.params->>'resolution';

    if v_sparks is null then
      raise exception 'model has no price for this duration and resolution'
        using errcode = 'VD004';
    end if;

    v_charged := v_sparks;
    v_charged_cents := v_charged * public.cents_per_spark();

    select w.balance_cents into v_balance
      from public.wallets w
     where w.user_id = v_generation.user_id
     for update;

    if coalesce(v_balance, 0) < v_charged_cents then
      -- Sem exceção, de propósito — ver o cabeçalho. A linha vira failed com o
      -- motivo, ninguém é cobrado, e a fal recebe 2xx e para de reentregar.
      update public.generations
         set status = 'failed',
             error_message = 'saldo insuficiente quando o vídeo ficou pronto',
             cost_real_cents = v_real_cost,
             completed_at = now()
       where id = v_generation.id
      returning * into v_generation;

      return v_generation;
    end if;
  end if;

  update public.generations
     set status = p_status,
         result_asset_id = case when p_status = 'succeeded' then p_result_asset_id else null end,
         sparks_charged = v_charged,
         cost_charged_cents = coalesce(v_charged_cents, 0),
         cost_real_cents = v_real_cost,
         error_message = p_error_message,
         completed_at = now()
   where id = v_generation.id
  returning * into v_generation;

  if v_charged > 0 then
    insert into public.ledger_transactions (
      user_id, kind, amount_cents, cost_real_cents, cost_charged_cents,
      generation_id, description
    )
    values (
      v_generation.user_id,
      'debit',
      -v_charged_cents,
      v_real_cost,
      v_charged_cents,
      v_generation.id,
      'Vídeo no canvas'
    );
  end if;

  return v_generation;
end;
$$;

comment on function public.complete_video_generation is
  'Conclui uma geração de vídeo e, no sucesso, debita o ledger por ela — numa '
  'transação só. Chamada pelo webhook da fal e pela reconciliação, pelas duas '
  'pelo mesmo caminho. É idempotente por for update + saída antecipada em linha '
  'terminal, o que a torna segura sob reentrega simultânea, não só repetida: a '
  'fal reentrega até 31 vezes. O preço é relido de ai_model_video_prices e nunca '
  'aceito do chamador. Saldo que acabou durante a geração NÃO levanta exceção — '
  'marca failed com motivo e não cobra, senão a linha ficaria running e as 31 '
  'reentregas receberiam o mesmo erro. Recusa com VD004 (sem preço), VD005 '
  '(geração inexistente ou de outra mídia), VD006 (entrega de outro trabalho) e '
  'VD007 (status inválido para conclusão). Só a service role executa: o webhook '
  'chega sem sessão, então auth.uid() é nulo e o user_id vem da linha.';

-- ---------------------------------------------------------------------------
-- 10. Concessões
-- ---------------------------------------------------------------------------
--
-- O padrão da casa, com uma diferença que é o ponto: as duas primeiras são
-- chamadas com a sessão do usuário e vão para `authenticated`; a terceira é
-- chamada sem sessão nenhuma e vai **só** para `service_role`.

revoke execute on function public.submit_video_generation(
  uuid, uuid, text, integer, text, text, jsonb, jsonb, jsonb
) from public, anon;

grant execute on function public.submit_video_generation(
  uuid, uuid, text, integer, text, text, jsonb, jsonb, jsonb
) to authenticated;

revoke execute on function public.attach_video_job(uuid, text, jsonb)
  from public, anon;

grant execute on function public.attach_video_job(uuid, text, jsonb)
  to authenticated;

revoke execute on function public.complete_video_generation(
  uuid, text, public.generation_status, uuid, integer, text
) from public, anon, authenticated;

grant execute on function public.complete_video_generation(
  uuid, text, public.generation_status, uuid, integer, text
) to service_role;
