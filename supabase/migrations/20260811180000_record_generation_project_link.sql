-- GN006: uma geração com personagem tem de ser num projeto onde ela trabalha.
--
-- Etapa D2, item 2.5. O cinto está em `runCanvasGeneration`; isto é o suspensório.

-- ---------------------------------------------------------------------------
-- ORDEM DE APLICAÇÃO — leia antes de rodar
-- ---------------------------------------------------------------------------
--
-- **Esta migration sobe DEPOIS do deploy da Fase 2**, e a ordem é a regra, não
-- a preferência.
--
-- O GN006 recusa no `record_generation`, que é chamado no **passo 11** de
-- `runCanvasGeneration` — depois de o provedor ter gerado e sido pago. O código
-- destrói o asset e o arquivo no Storage quando a cobrança falha, então o
-- usuário não paga; nós pagamos, e a imagem vai para o lixo.
--
-- É a mesma armadilha que o comentário do GN005 já documentava:
--
--   "essa recusa chega depois de a imagem existir, o que significa depois de o
--    Google ter sido pago por ela. A ordem que não erra a favor de ninguém é
--    descobrir primeiro."
--
-- Quem descobre primeiro é a checagem da aplicação (item 2.2), no **passo 2**:
-- antes do saldo, antes da tradução, antes do provedor. Com ela no ar, o GN006
-- nunca dispara. Sem ela no ar, o GN006 é a única checagem que existe — e passa
-- a ser exatamente o defeito que ele foi escrito para cobrir.
--
-- Por isso esta migration nasceu em arquivo próprio, e não junto da
-- 20260811140000: `supabase db push` aplica tudo que está pendente de uma vez,
-- então o GN006 escrito naquele arquivo teria subido na Fase 0 — quando um
-- projeto novo (que nasce sem vínculos, e é o que a etapa quer) faria qualquer
-- `@` bater nele, com a imagem já paga.
--
-- **Um suspensório que sobe antes do cinto não é suspensório — é o cinto, no
-- pior lugar possível.**

-- ---------------------------------------------------------------------------
-- A assinatura NÃO muda
-- ---------------------------------------------------------------------------
--
-- Diferente de 20260809180000 e 20260810180000, que acrescentaram parâmetros e
-- por isso tiveram de derrubar a função e reemitir as concessões: aqui a lista
-- de argumentos é idêntica, então `create or replace` substitui o corpo e as
-- concessões sobrevivem. Sem `drop`, sem `grant`, sem risco de deixar a função
-- inexecutável para `authenticated` por um revoke esquecido.
--
-- Códigos de erro, continuando a série da casa:
--
--   GN001  Sparks insuficientes para esta geração
--   GN002  personagem inexistente para este usuário (ou arquivada)
--   GN003  o modelo não é um modelo de imagem habilitado
--   GN004  projeto inexistente para este usuário
--   GN005  o modelo não tem preço para esse tamanho
--   GN006  a personagem não está vinculada a este projeto        <- novo

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
  p_image_size text default null
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

  -- Failure is free. Everything else pays the catalogue price.
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
    user_id, entity_id, model_id, provider, model, params,
    project_id, workflow_id, node_id,
    prompt_user_pt, prompt_compiled, status, input_tokens, output_tokens,
    cost_real_cents, cost_charged_cents, sparks_charged,
    result_asset_id, entity_version_id, sheet_source, summary, error_message,
    completed_at
  )
  values (
    v_user_id, p_entity_id, p_model_id, v_provider_slug, v_model_slug,
    coalesce(p_params, '{}'::jsonb),
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
  'Records one generation and, on success, debits the ledger for it — in a '
  'single transaction. The price is read from the catalogue and never accepted '
  'from the caller: ai_model_image_prices for the named image size, and '
  'ai_models.image_sparks when no size is named. Canvas generations also record '
  'where they came from (project, node) and what the user typed in Portuguese, '
  'which together with prompt_compiled is the bilingual audit trail of '
  'docs/nodes-geracao.md rule 2. The workflow is derived from the project, not '
  'accepted. Refuses with GN001 (insufficient balance), GN002 (character not '
  'found for this user), GN003 (model not an enabled image model), GN004 '
  '(project not found for this user), GN005 (no price for this image size) or '
  'GN006 (character not linked to this project) so the interface can explain '
  'each case in plain words. GN006 is a backstop only: the application refuses '
  'the same case before the provider is called, where refusing is free. Twin of '
  'public.record_extraction.';
