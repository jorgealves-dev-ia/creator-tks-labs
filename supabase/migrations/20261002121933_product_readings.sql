-- FRENTE 1 · F1 — a leitura de produto: `extractions` aprende produto, o catálogo
-- ganha o padrão da lista de produto, e nasce a única porta que cobra a leitura.
--
-- Especificação: docs/plano-produto-diz.md, §6 · F1, itens 1 e 2.
-- Decisões do dono: 21/09 (o produto diz o que é), 26/09 (o padrão próprio da
-- lista de produto, o padrão RAISE EXCEPTION, o 2.5 fora do catálogo), 27/09 (o
-- padrão é o Gemini 3.7 Flash).
--
-- ---------------------------------------------------------------------------
-- ORDEM DE APLICAÇÃO — esta migration sobe ANTES do código
-- ---------------------------------------------------------------------------
--
-- **Nenhuma recusa nova alcança caminho existente**, e isso é conferido peça por
-- peça, não suposto:
--
--   `extractions`        ganha colunas, todas com padrão ou nulas. `subject`
--                        nasce 'character', então as linhas que existem
--                        continuam o que são e `record_extraction` — INTOCADA,
--                        byte a byte — continua gravando personagem sem saber
--                        que a coluna existe.
--   `ai_models`          ganha uma coluna booleana com padrão `false`. O código
--                        publicado lê o catálogo nomeando as colunas que quer, e
--                        não nomeia esta.
--   o catálogo           as duas linhas 2.5 saem da lista de extração de
--                        personagem — onde apareciam apagadas, «(em breve)», sem
--                        adapter; o 3.7 Flash entra nela do mesmo jeito apagado.
--                        Nenhum modelo que alguém conseguia escolher muda.
--
-- O que existe é o risco oposto: o código da F1 chama uma função e lê uma coluna
-- que só existem depois deste arquivo. **Migration primeiro, deploy depois.**
--
-- ---------------------------------------------------------------------------
-- O PADRÃO RAISE EXCEPTION, nas três camadas — pedido do dono, 26/09
-- ---------------------------------------------------------------------------
--
--   1. a FUNÇÃO recusa com frase e código (EX001, EX003, EX004, EX005): cada
--      recusa vira uma frase na tela, e nenhuma vira "erro inesperado";
--   2. o BANCO recusa o que o app poderia esquecer: CHECK onde a regra cabe numa
--      linha, GATILHO onde ela precisa olhar outra tabela;
--   3. a MIGRATION confere o que encontra antes de mexer e o que deixa depois —
--      e levanta exceção, parando o `db push` com a frase do porquê.
--
-- A conferência do fim é uma FUNÇÃO (`assert_product_reading_catalog`), e não
-- um bloco solto, por uma razão só: a prova das travas a chama de novo, com o
-- Sonnet marcado de propósito, dentro de um BEGIN … ROLLBACK. Uma conferência
-- que só roda uma vez, na hora do push, é uma conferência que ninguém viu
-- recusar. → supabase/travas/f1-leitura-de-produto.sql

-- ---------------------------------------------------------------------------
-- 0. O que a migration espera encontrar — e recusa seguir se não encontrar
-- ---------------------------------------------------------------------------
--
-- Lido do catálogo de produção em 02/10/2026, pelo MCP, só leitura. Se alguma
-- destas linhas mudou desde então, este arquivo foi escrito para um banco que
-- não é mais o que está aí — e é melhor parar aqui do que descobrir no fim.

do $$
declare
  v_flash record;
  v_sem_personagem integer;
begin
  select m.id, m.enabled, m.capabilities, m.extraction_sparks, p.enabled as provider_enabled
    into v_flash
    from public.ai_models m
    join public.ai_providers p on p.id = m.provider_id
   where p.slug = 'google' and m.slug = 'gemini-3.7-flash';

  if v_flash.id is null then
    raise exception 'F1: gemini-3.7-flash is not in the catalogue — the model the owner chose on 27/09 has no row to mark'
      using errcode = 'check_violation';
  end if;

  if not v_flash.enabled or not v_flash.provider_enabled then
    raise exception 'F1: gemini-3.7-flash (or its provider) is disabled — a disabled model cannot be the default of the product list'
      using errcode = 'check_violation';
  end if;

  if not exists (
    select 1
      from public.ai_models m
      join public.ai_providers p on p.id = m.provider_id
     where p.slug = 'anthropic' and m.slug = 'claude-haiku-4-5'
       and m.enabled and p.enabled
       and 'extraction' = any (m.capabilities)
  ) then
    raise exception 'F1: claude-haiku-4-5 is not an enabled extraction model — the owner kept it in the product selector'
      using errcode = 'check_violation';
  end if;

  -- Toda linha que existe é de personagem. A trava nova vai exigir exatamente
  -- isso; conferir antes dá a frase certa em vez do erro cru de um CHECK.
  select count(*) into v_sem_personagem
    from public.extractions where entity_id is null;

  if v_sem_personagem > 0 then
    raise exception 'F1: % extraction row(s) already have no character — the new shape rule would refuse them', v_sem_personagem
      using errcode = 'check_violation';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 1. `extractions` aprende produto
-- ---------------------------------------------------------------------------
--
-- Produto é card de canvas desde 10/08 — não existe linha em `entities` para
-- apontar. Uma leitura de produto aponta para o CARD: o projeto e o id do node,
-- como `generations.project_id` / `generations.node_id` apontam para o bloco.
--
-- `subject` é texto com CHECK, e não um tipo enumerado, pela régua de
-- `ai_model_text_prices.job_kind`: é vocabulário NOSSO, e um valor novo aqui é
-- uma funcionalidade nova, que já vem com migration de qualquer jeito.

alter table public.extractions
  add column subject text not null default 'character',
  add column project_id uuid references public.projects (id) on delete set null,
  add column node_id text,
  add column reading jsonb;

-- `entity_id` deixa de ser obrigatório NA COLUNA — e continua obrigatório para
-- personagem, pela trava de forma logo abaixo. O que muda é quem diz isso.
alter table public.extractions
  alter column entity_id drop not null;

alter table public.extractions
  -- A trava do plano, com as duas metades: leitura de personagem EXIGE
  -- personagem; leitura de produto NÃO TEM personagem e TEM card. E ela é
  -- também a lista fechada de `subject`: um terceiro valor não cabe em nenhuma
  -- das duas metades, e é recusado aqui — uma trava só, sem uma segunda que
  -- nunca chegaria a falar.
  --
  -- `project_id` e `reference_asset_id` ficam de fora de propósito: os dois são
  -- `on delete set null`. Uma trava que os exigisse recusaria o apagamento do
  -- projeto e o da foto — trava de auditoria virando trava de produto, que é o
  -- erro que `asset_montage_parts` já nomeou. Quem os exige na hora de gravar é
  -- a função; o `node_id` é texto, sobrevive a tudo, e é ele que a trava segura.
  add constraint extractions_subject_shape check (
    (
      subject = 'character'
      and entity_id is not null
      and node_id is null
      and project_id is null
    )
    or (
      subject = 'product'
      and entity_id is null
      and node_id is not null
      and source = 'photo'
      and source_text is null
    )
  ),

  add constraint extractions_node_id_not_blank check (
    node_id is null or length(btrim(node_id)) between 1 and 200
  ),

  -- O texto que a IA escreveu: exatamente três frases, nenhuma vazia, nos tetos
  -- do card (o Nome até 120, cada descrição até 2.000).
  add constraint extractions_reading_shape check (
    reading is null
    or (
      jsonb_typeof(reading) = 'object'
      and jsonb_typeof(reading -> 'nome') = 'string'
      and jsonb_typeof(reading -> 'descricao_pt') = 'string'
      and jsonb_typeof(reading -> 'descricao_en') = 'string'
      and length(btrim(reading ->> 'nome')) between 1 and 120
      and length(btrim(reading ->> 'descricao_pt')) between 1 and 2000
      and length(btrim(reading ->> 'descricao_en')) between 1 and 2000
    )
  ),

  -- E ele existe se, e só se, a leitura é de produto E deu certo. Uma falha não
  -- guarda texto; uma extração de personagem guarda o placar em `summary`, não
  -- aqui.
  add constraint extractions_reading_matches_outcome check (
    (reading is not null) = (subject = 'product' and status = 'succeeded')
  );

comment on column public.extractions.subject is
  'O que foi lido: character (a ficha de uma personagem) ou product (o card de '
  'um Input de Produto). Padrão character — toda linha anterior a 02/10/2026 é '
  'de personagem.';

comment on column public.extractions.entity_id is
  'A personagem lida. Obrigatória quando subject = character, proibida quando '
  'subject = product (trava extractions_subject_shape): produto é card de '
  'canvas, não linha de entities.';

comment on column public.extractions.project_id is
  'Em que projeto está o card lido (subject = product). Vira nulo se o projeto '
  'for apagado — a regra de generations.project_id: apagar um projeto não apaga '
  'o registro do que foi cobrado.';

comment on column public.extractions.node_id is
  'O id do card no grafo (subject = product), como generations.node_id. Texto, e '
  'por isso sobrevive ao apagamento do projeto e do card.';

comment on column public.extractions.reading is
  'O que a IA escreveu numa leitura de produto que deu certo: nome, descricao_pt '
  'e descricao_en. Na própria linha, pela mesma razão de reference_asset_id: '
  'meses depois, ela responde "o que a IA escreveu?" como aquela responde "o que '
  'ela leu?". O card pode ter sido editado depois; esta coluna não muda.';

comment on table public.extractions is
  'Uma linha por tentativa de extração — o diário do motor e a matéria-prima '
  'para calibrar o preço em Sparks contra o custo real. Dois assuntos (subject): '
  'a ficha de uma personagem, gravada por record_extraction, e o card de um '
  'produto, gravado por record_product_reading. Sem política de INSERT: só as '
  'duas funções escrevem aqui, e são elas que decidem o preço.';

-- Cobre a chave estrangeira nova (convenção de 20260807160000). Parcial pela
-- razão de sempre: só as leituras de produto têm projeto.
create index extractions_project_id_idx
  on public.extractions (project_id)
  where project_id is not null;

-- ---------------------------------------------------------------------------
-- 2. O que um CHECK não alcança vira gatilho que recusa
-- ---------------------------------------------------------------------------
--
-- "A foto é de quem leu" e "o projeto é de quem leu" são perguntas sobre OUTRAS
-- tabelas — um CHECK só enxerga a própria linha. A função abaixo já pergunta as
-- duas e recusa com código; este gatilho é o cadeado de baixo, para o dia em que
-- um caminho novo escrever em `extractions` sem passar por ela. É a forma de
-- `asset_montage_parts_owner_matches`: a função dá a frase certa, o gatilho
-- garante que a frase não era opcional.
--
-- Só linhas de produto (`when`): o caminho da personagem não muda um byte.
--
-- `security definer` porque a pergunta é sobre a verdade, e não sobre o que o
-- chamador enxerga.

create or replace function public.enforce_product_reading_ownership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.reference_asset_id is not null and not exists (
    select 1
      from public.assets a
     where a.id = new.reference_asset_id
       and a.user_id = new.user_id
       and a.kind = 'image'
  ) then
    raise exception 'a product reading must point at an image of the same owner'
      using errcode = 'check_violation';
  end if;

  if new.project_id is not null and not exists (
    select 1
      from public.projects p
     where p.id = new.project_id
       and p.user_id = new.user_id
  ) then
    raise exception 'a product reading must belong to a project of the same owner'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

comment on function public.enforce_product_reading_ownership() is
  'Recusa leitura de produto que aponte para foto ou projeto de outro dono, ou '
  'para um asset que não é imagem. O cadeado de baixo de record_product_reading, '
  'que pergunta o mesmo antes e recusa com código.';

-- Um SET NULL de chave estrangeira também é um UPDATE destas colunas — e passa:
-- o gatilho só confere o que NÃO é nulo.
create trigger extractions_product_reading_ownership
  before insert or update of subject, user_id, reference_asset_id, project_id
  on public.extractions
  for each row
  when (new.subject = 'product')
  execute function public.enforce_product_reading_ownership();

-- Mesma razão de 20260807150000: função de gatilho não é endpoint de API.
revoke execute on function public.enforce_product_reading_ownership()
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. O padrão da lista de produto — uma marca PRÓPRIA no catálogo
-- ---------------------------------------------------------------------------
--
-- Resposta 9.4 do dono, contra a minha recomendação: a lista de produto tem o
-- seu padrão, separado do de personagem. `is_default` continua sendo o que era
-- — o Sonnet, a 20 ⚡, para a ficha — e esta coluna responde outra pergunta: em
-- qual modelo o botão «Ler a foto» abre quando ninguém escolheu.
--
-- **Padrão é o que acontece quando ninguém escolhe.** Um padrão a 20 ⚡ cobraria
-- cinco vezes, por omissão, o trabalho que a F0 mediu a 4.

alter table public.ai_models
  add column is_product_reading_default boolean not null default false;

comment on column public.ai_models.is_product_reading_default is
  'O modelo em que a leitura de produto abre quando ninguém escolheu. Separado '
  'de is_default, que é o padrão da ficha de personagem. No máximo um modelo '
  'marcado (índice único parcial), e só modelo ligado e de extraction (CHECK).';

-- "Só modelo de extraction" cabe num CHECK, porque a capability mora na mesma
-- linha — e CHECK é mais forte que gatilho: não há como desligá-lo por engano.
-- Vale nos dois sentidos: marcar um modelo que não lê é recusado, e tirar a
-- capability (ou desligar) o modelo marcado também.
alter table public.ai_models
  add constraint ai_models_product_reading_default_reads check (
    not is_product_reading_default
    or (enabled and 'extraction' = any (capabilities))
  );

-- "No máximo um": único sobre a própria coluna, só onde ela é verdadeira.
create unique index ai_models_one_product_reading_default
  on public.ai_models (is_product_reading_default)
  where is_product_reading_default;

-- ---------------------------------------------------------------------------
-- 4. O catálogo, depois da F0
-- ---------------------------------------------------------------------------
--
-- O 3.7 Flash — hoje só `text_gen` — ganha `extraction` e o preço da leitura.
-- **4 ⚡ é a referência do dono**, e a F0 mediu o custo real contra ela: 3 e 2
-- centavos nas duas leituras de 27/09 (rodada 5). Em 2027, com a tarifa
-- dobrada, uma delas custaria 5 — nota de calibração (E2), sem mudar preço aqui.
--
-- `is_default` do 3.7 Flash continua `true`: é o padrão de TEXTO (o Roteiro), e
-- não é mexido. Na lista de extração de PERSONAGEM ele aparece apagado — o
-- Google não tem adapter de personagem (resposta 9.3) —, e o padrão de lá
-- continua sendo o Sonnet. O padrão da lista de PRODUTO é a coluna nova.

update public.ai_models m
   set capabilities = array_append(m.capabilities, 'extraction'),
       extraction_sparks = 4
  from public.ai_providers p
 where p.id = m.provider_id
   and p.slug = 'google'
   and m.slug = 'gemini-3.7-flash'
   and not ('extraction' = any (m.capabilities));

update public.ai_models
   set is_product_reading_default = false
 where is_product_reading_default;

update public.ai_models m
   set is_product_reading_default = true
  from public.ai_providers p
 where p.id = m.provider_id
   and p.slug = 'google'
   and m.slug = 'gemini-3.7-flash';

-- As duas linhas 2.5 de `extraction` ficam inativas (decisão do dono, 26/09): o
-- Flash voltou 404 para esta conta — "no longer available to new users" —, e o
-- Pro só volta à lista depois de medido. Nenhuma das duas jamais foi chamada
-- pelo produto: nasceram apagadas em 08/08, sem adapter.
update public.ai_models m
   set enabled = false
  from public.ai_providers p
 where p.id = m.provider_id
   and p.slug = 'google'
   and m.slug in ('gemini-2.5-flash', 'gemini-2.5-pro');

-- ---------------------------------------------------------------------------
-- 5. record_product_reading — a ÚNICA porta da leitura de produto
-- ---------------------------------------------------------------------------
--
-- `record_extraction` fica INTOCADA: o caminho da personagem continua o mesmo,
-- byte a byte. Esta é a irmã dela, na mesma ordem e pelas mesmas razões — gravar
-- a linha e debitar o ledger são duas escritas que têm de ser uma, e o cliente
-- do Supabase não abre transação.
--
-- O preço vem do catálogo, nunca de quem chama: a função recebe o id de um
-- MODELO, e não um valor. Quem pudesse nomear o próprio preço poderia nomear
-- zero.
--
-- `security definer` porque o ledger é somente-leitura para `authenticated` — e
-- por isso mesmo ela pergunta, uma a uma, o que o RLS deixou de perguntar por
-- ela: o projeto é de quem chama, a foto é de quem chama.
--
-- Códigos, continuando a série de record_extraction (EX002 é o de personagem
-- não encontrada, que aqui não existe):
--
--   EX001  Sparks insuficientes para esta leitura
--   EX003  o modelo não é um modelo de extração ligado
--   EX004  projeto inexistente para este usuário
--   EX005  foto inexistente para este usuário (ou não é imagem)
--
-- **Falha é grátis.** `p_status = 'failed'` grava a tentativa, com o que o
-- provedor disse, e não cobra — por este `case` e pela trava
-- `extractions_failed_is_free`, que vale mesmo se o `case` fosse esquecido.

create or replace function public.record_product_reading(
  p_project_id uuid,
  p_node_id text,
  p_model_id uuid,
  p_reference_asset_id uuid,
  p_status public.extraction_status,
  p_reading jsonb default null,
  p_input_tokens integer default null,
  p_output_tokens integer default null,
  p_real_cost_cents integer default null,
  p_summary jsonb default null,
  p_error_message text default null
)
returns public.extractions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_sparks integer;
  v_charged integer;
  v_balance integer;
  v_reading jsonb;
  v_extraction public.extractions;
begin
  if v_user_id is null then
    raise exception 'record_product_reading requires an authenticated session'
      using errcode = 'insufficient_privilege';
  end if;

  -- O projeto é de quem chama. Sem esta pergunta, `security definer` deixaria
  -- alguém arquivar a própria leitura no projeto de outra pessoa.
  if p_project_id is null or not exists (
    select 1
      from public.projects pr
     where pr.id = p_project_id
       and pr.user_id = v_user_id
  ) then
    raise exception 'project not found for this user'
      using errcode = 'EX004';
  end if;

  if p_node_id is null or length(btrim(p_node_id)) = 0 or length(p_node_id) > 200 then
    raise exception 'a product reading must name its card'
      using errcode = 'check_violation';
  end if;

  -- A foto é de quem chama, e é uma imagem. O RLS responderia isto para um
  -- `authenticated`; aqui dentro ninguém responde por nós.
  if p_reference_asset_id is null or not exists (
    select 1
      from public.assets a
     where a.id = p_reference_asset_id
       and a.user_id = v_user_id
       and a.kind = 'image'
  ) then
    raise exception 'photo not found for this user'
      using errcode = 'EX005';
  end if;

  -- O preço é a resposta do catálogo, e o modelo tem de ser de extração e estar
  -- ligado — ele e o fornecedor dele.
  select m.extraction_sparks into v_sparks
    from public.ai_models m
    join public.ai_providers p on p.id = m.provider_id
   where m.id = p_model_id
     and m.enabled
     and p.enabled
     and 'extraction' = any (m.capabilities);

  if v_sparks is null then
    raise exception 'model is not an enabled extraction model'
      using errcode = 'EX003';
  end if;

  -- O texto. Uma leitura que deu certo traz as três frases, nenhuma vazia; uma
  -- que falhou não traz texto nenhum. Só as três chaves são guardadas, aparadas
  -- — o que mais o modelo tiver escrito não entra no registro.
  if p_status = 'succeeded' then
    if p_reading is null
       or jsonb_typeof(p_reading) <> 'object'
       or coalesce(btrim(p_reading ->> 'nome'), '') = ''
       or coalesce(btrim(p_reading ->> 'descricao_pt'), '') = ''
       or coalesce(btrim(p_reading ->> 'descricao_en'), '') = ''
    then
      raise exception 'a successful product reading must carry nome, descricao_pt and descricao_en'
        using errcode = 'check_violation';
    end if;

    v_reading := jsonb_build_object(
      'nome', btrim(p_reading ->> 'nome'),
      'descricao_pt', btrim(p_reading ->> 'descricao_pt'),
      'descricao_en', btrim(p_reading ->> 'descricao_en')
    );
  elsif p_reading is not null then
    raise exception 'a failed product reading carries no text'
      using errcode = 'check_violation';
  end if;

  -- Falha é grátis. Todo o resto paga o preço do catálogo.
  v_charged := case when p_status = 'succeeded' then v_sparks else 0 end;

  if v_charged > 0 then
    select w.balance_cents into v_balance
      from public.wallets w
     where w.user_id = v_user_id
       for update;

    -- A trava da carteira abortaria a transação de qualquer jeito; conferir
    -- antes só compra um código que a tela sabe transformar em frase. A linha
    -- fica travada acima, então a conferência e o débito não se separam.
    if coalesce(v_balance, 0) < v_charged * public.cents_per_spark() then
      raise exception 'insufficient balance for this reading'
        using errcode = 'EX001';
    end if;
  end if;

  insert into public.extractions (
    user_id, subject, entity_id, project_id, node_id, model_id, source, status,
    input_tokens, output_tokens, real_cost_cents, sparks_charged,
    reference_asset_id, reading, summary, error_message
  )
  values (
    v_user_id, 'product', null, p_project_id, p_node_id, p_model_id, 'photo', p_status,
    p_input_tokens, p_output_tokens, p_real_cost_cents, v_charged,
    p_reference_asset_id, v_reading, p_summary, p_error_message
  )
  returning * into v_extraction;

  if v_charged > 0 then
    -- O caminho legítimo do ledger, o mesmo de record_extraction: uma linha com
    -- sinal, cujo gatilho projeta o saldo novo na carteira. O nome no extrato é
    -- o que a leitura escreveu — dado que o servidor validou, não o que o
    -- navegador disse.
    insert into public.ledger_transactions (
      user_id, kind, amount_cents, cost_real_cents, cost_charged_cents,
      extraction_id, description
    )
    values (
      v_user_id,
      'debit',
      -(v_charged * public.cents_per_spark()),
      p_real_cost_cents,
      v_charged * public.cents_per_spark(),
      v_extraction.id,
      'Leitura de produto · ' || left(v_reading ->> 'nome', 80)
    );
  end if;

  return v_extraction;
end;
$$;

comment on function public.record_product_reading is
  'A ÚNICA porta da leitura de produto: grava a leitura e, no sucesso, debita o '
  'ledger por ela — numa transação só. O preço é lido de '
  'ai_models.extraction_sparks, nunca aceito de quem chama; falha é grátis. '
  'Recusa com EX001 (saldo), EX003 (modelo não é de extração ligado), EX004 '
  '(projeto não é do chamador) ou EX005 (foto não é do chamador, ou não é '
  'imagem), para a tela explicar cada caso em português. Irmã de '
  'record_extraction, que continua sendo a porta da personagem.';

-- Só quem está logado. Revogar de PUBLIC primeiro é o que tira a concessão
-- padrão, que `anon` e `authenticated` herdam por ela.
revoke execute on function public.record_product_reading(
  uuid, text, uuid, uuid, public.extraction_status,
  jsonb, integer, integer, integer, jsonb, text
) from public, anon;

grant execute on function public.record_product_reading(
  uuid, text, uuid, uuid, public.extraction_status,
  jsonb, integer, integer, integer, jsonb, text
) to authenticated;

-- ---------------------------------------------------------------------------
-- 6. A conferência — o "nunca" do dono vira condição para a migration existir
-- ---------------------------------------------------------------------------
--
-- "Sonnet a 20 ⚡ nunca é padrão para produto" deixa de ser frase num documento.
-- Esta função levanta exceção se o catálogo não estiver como o dono decidiu, e a
-- migration a chama na última linha: se ela recusar, o `db push` para e NADA
-- deste arquivo fica aplicado.
--
-- Ela guarda fatos de uma decisão datada (o modelo, o preço, as linhas 2.5).
-- Mudou a decisão: a migration que muda o catálogo muda esta função junto.

create or replace function public.assert_product_reading_catalog()
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_marcados integer;
  v_padrao record;
  v_ativas integer;
begin
  select count(*) into v_marcados
    from public.ai_models
   where is_product_reading_default;

  if v_marcados <> 1 then
    raise exception 'product reading catalogue: expected exactly one default model, found %', v_marcados
      using errcode = 'check_violation';
  end if;

  select m.slug, m.extraction_sparks, m.enabled, m.capabilities,
         p.slug as provider, p.enabled as provider_enabled
    into v_padrao
    from public.ai_models m
    join public.ai_providers p on p.id = m.provider_id
   where m.is_product_reading_default;

  -- O "nunca" do dono, com a frase dele. Vem antes das outras de propósito: é a
  -- recusa que a prova das travas provoca, e ela tem de dizer por que recusou.
  if v_padrao.slug = 'claude-sonnet-5' then
    raise exception 'product reading catalogue: Claude Sonnet must never be the default of the product list (owner, 26/09/2026)'
      using errcode = 'check_violation';
  end if;

  if not ('extraction' = any (v_padrao.capabilities)) then
    raise exception 'product reading catalogue: the default model (%) is not an extraction model', v_padrao.slug
      using errcode = 'check_violation';
  end if;

  if not v_padrao.enabled or not v_padrao.provider_enabled then
    raise exception 'product reading catalogue: the default model (%) or its provider is disabled', v_padrao.slug
      using errcode = 'check_violation';
  end if;

  if v_padrao.provider <> 'google' or v_padrao.slug <> 'gemini-3.7-flash' then
    raise exception 'product reading catalogue: the default model is %/%, and the owner chose google/gemini-3.7-flash (27/09/2026)', v_padrao.provider, v_padrao.slug
      using errcode = 'check_violation';
  end if;

  if v_padrao.extraction_sparks is distinct from 4 then
    raise exception 'product reading catalogue: the default model costs % Sparks, and the owner''s reference is 4', v_padrao.extraction_sparks
      using errcode = 'check_violation';
  end if;

  select count(*) into v_ativas
    from public.ai_models m
    join public.ai_providers p on p.id = m.provider_id
   where p.slug = 'google'
     and m.slug in ('gemini-2.5-flash', 'gemini-2.5-pro')
     and m.enabled
     and 'extraction' = any (m.capabilities);

  if v_ativas > 0 then
    raise exception 'product reading catalogue: % Gemini 2.5 extraction row(s) still enabled — the owner took both off the list (26/09/2026)', v_ativas
      using errcode = 'check_violation';
  end if;

  if not exists (
    select 1
      from public.ai_models m
      join public.ai_providers p on p.id = m.provider_id
     where p.slug = 'anthropic' and m.slug = 'claude-haiku-4-5'
       and m.enabled and p.enabled
       and 'extraction' = any (m.capabilities)
       and m.extraction_sparks = 4
  ) then
    raise exception 'product reading catalogue: claude-haiku-4-5 is not an enabled extraction model at 4 Sparks — the owner kept it in the selector'
      using errcode = 'check_violation';
  end if;

  -- E o padrão da FICHA não foi tocado: continua o Sonnet.
  if not exists (
    select 1
      from public.ai_models m
      join public.ai_providers p on p.id = m.provider_id
     where p.slug = 'anthropic' and m.slug = 'claude-sonnet-5'
       and m.is_default and m.enabled
       and 'extraction' = any (m.capabilities)
       and not m.is_product_reading_default
  ) then
    raise exception 'product reading catalogue: claude-sonnet-5 is no longer the character default — this migration must not move it'
      using errcode = 'check_violation';
  end if;
end;
$$;

comment on function public.assert_product_reading_catalog() is
  'Levanta exceção se o catálogo da leitura de produto não estiver como o dono '
  'decidiu em 26 e 27/09/2026: exatamente um padrão, o gemini-3.7-flash, de '
  'extraction, ligado, a 4 Sparks; nunca o Sonnet; as duas linhas 2.5 inativas; '
  'o Haiku no seletor; o padrão da ficha intacto. Chamada no fim da migration '
  'que a criou e, depois, por quem quiser conferir: select '
  'public.assert_product_reading_catalog();';

-- Conferência é coisa de quem administra o banco, não endpoint de API.
revoke execute on function public.assert_product_reading_catalog()
  from public, anon, authenticated;

-- A última linha. Se ela recusar, nada acima fica aplicado.
select public.assert_product_reading_catalog();
