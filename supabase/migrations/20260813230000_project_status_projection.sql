-- FRENTE VÍDEO · Ciclo 1, Fase 3b — a bolinha da aba, projetada pelo banco.
--
-- Especificação: docs/decisoes.md (entrada de 13/08/2026, Frente Vídeo Fase 3b).
--
-- ---------------------------------------------------------------------------
-- Por que trigger, e não código de aplicação
-- ---------------------------------------------------------------------------
--
-- `projects.status` existe desde 07/08/2026 com um comentário que diz o que ela
-- é — *"Aggregated status shown as the pulsing dot on the project tab"* — e
-- nunca teve escritor: toda aba nasceu `idle` e morreu `idle`. A bolinha é
-- desenhada, mas não conta nada.
--
-- Ela é **projeção**, exatamente como `wallets.balance_cents` é projeção do
-- ledger, e o precedente da carteira decide o lugar: quem mantém uma projeção é
-- o banco, num gatilho, e não o código que escreve a linha de origem. O motivo
-- aqui é mais forte do que lá, porque o vídeo trouxe um escritor que **não passa
-- por rota nenhuma nossa**: o webhook da fal chega com service role e chama
-- `complete_video_generation`. Qualquer atualização de status escrita na
-- aplicação simplesmente não existiria no caminho que mais importa — o de um
-- vídeo terminando com a aba fechada.
--
-- E há um segundo escritor invisível pelo mesmo argumento: `record_generation`,
-- que grava imagem e cobrança numa transação só. Manter a bolinha do lado de
-- fora dessa transação seria deixá-la discordar do banco toda vez que a
-- transação falhasse depois de a tela já ter dito "gerado".
--
-- ---------------------------------------------------------------------------
-- Esta migration é segura antes do código
-- ---------------------------------------------------------------------------
--
-- Tudo aqui é aditivo e nada trava caminho existente: as duas funções nascem sem
-- chamador na aplicação, os gatilhos só escrevem numa coluna que ninguém escreve
-- hoje (conferido: `src/lib/projects/actions.ts` atualiza `name`, e nada mais
-- toca `status`), e o backfill só corrige linhas que já estão erradas.
--
-- O sentido inverso também vale: **o código da Fase 3 não depende dela.** Sem
-- esta migration a bolinha continua cinza, como esteve o produto inteiro até
-- hoje; com ela, passa a contar a verdade sem que uma linha de TypeScript mude.

-- ---------------------------------------------------------------------------
-- 1. A regra, escrita uma vez só
-- ---------------------------------------------------------------------------
--
-- A regra em uma frase: **"gerando" ganha de tudo; sem nada em voo, a bolinha
-- conta o último desfecho.**
--
--   generating  há qualquer geração `queued` ou `running` no projeto
--   generated   a última geração encerrada deu certo
--   error       a última geração encerrada falhou
--   idle        o projeto nunca gerou nada
--
-- `canceled` **não move a bolinha**, e isso é decisão, não esquecimento: cancelar
-- é alguém parando de propósito, e vermelho para um pedido atendido seria a tela
-- chamando de falha o que o usuário mandou fazer. Hoje ninguém escreve
-- `canceled` (o enum tem o estado desde a Fase 0 e nenhum caminho o grava), então
-- a decisão é barata agora e cara depois — que é exatamente quando decisões
-- assim devem ser tomadas.
--
-- Ela mora numa função própria, e não copiada dentro do gatilho, porque o
-- backfill lá embaixo precisa da mesma regra. Duas cópias divergiriam, e a
-- segunda a divergir seria a que ninguém testa — o mesmo argumento que fez o
-- vídeo ter **um** caminho de conclusão para três gatilhos.

create or replace function public.project_status_now(p_project uuid)
returns public.project_status
language sql
stable
security invoker
set search_path = ''
as $$
  select case
           when exists (
             select 1
               from public.generations g
              where g.project_id = p_project
                and g.status in ('queued', 'running')
           )
           then 'generating'::public.project_status
           else coalesce(
             (
               select case
                        when g.status = 'succeeded'
                        then 'generated'::public.project_status
                        else 'error'::public.project_status
                      end
                 from public.generations g
                where g.project_id = p_project
                  and g.status in ('succeeded', 'failed')
                order by g.created_at desc, g.id desc
                limit 1
             ),
             'idle'::public.project_status
           )
         end;
$$;

comment on function public.project_status_now(uuid) is
  'A bolinha da aba, calculada: gerando ganha de tudo, e sem nada em voo vale o '
  'último desfecho. canceled não move a bolinha, de propósito.';

-- Mesma razão de 20260807150000_revoke_trigger_function_execute.sql: o Supabase
-- concede EXECUTE em funções novas de `public` para os papéis da API, o que as
-- publica como endpoints /rest/v1/rpc. Esta em especial não pode ficar exposta:
-- ela recebe um id de projeto qualquer e responderia se o projeto **de outra
-- pessoa** está gerando agora.
revoke execute on function public.project_status_now(uuid)
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. O gatilho
-- ---------------------------------------------------------------------------

create or replace function public.refresh_project_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project uuid;
  v_status public.project_status;
begin
  if tg_op = 'DELETE' then
    v_project := old.project_id;
  else
    v_project := new.project_id;
  end if;

  -- Geração canônica de personagem não tem projeto, e uma geração cujo projeto
  -- foi excluído fica com `project_id` nulo pelo `on delete set null`.
  if v_project is null then
    if tg_op = 'DELETE' then
      return old;
    end if;

    return new;
  end if;

  v_status := public.project_status_now(v_project);

  -- O `is distinct from` não é economia: sem ele, cada imagem de uma leva de
  -- quatro reescreveria `generated` por cima de `generated`, e cada reescrita
  -- viraria um evento de Realtime e um `updated_at` novo. A aba piscaria quatro
  -- vezes para dizer a mesma coisa.
  update public.projects p
     set status = v_status
   where p.id = v_project
     and p.status is distinct from v_status;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

comment on function public.refresh_project_status() is
  'Mantém projects.status em dia com as gerações do projeto. Projeção, como '
  'apply_ledger_transaction faz com wallets.balance_cents.';

revoke execute on function public.refresh_project_status()
  from public, anon, authenticated;

-- INSERT cobre a imagem, que nasce pronta, e a submissão de vídeo, que nasce
-- `queued`. DELETE existe porque gerações **são** apagadas à mão de vez em
-- quando: a validação da Fase 2 apagou a linha sintética que provou a disputa na
-- trava, e sem esta linha o projeto teria ficado "gerando" para sempre por causa
-- de um trabalho que não existe mais.
create trigger generations_project_status_on_write
  after insert or delete on public.generations
  for each row execute function public.refresh_project_status();

-- E o UPDATE, que é o que o vídeo trouxe: a linha nasce `queued`, vira `running`
-- no `attach_video_job` e termina no webhook. Sem este gatilho a aba acenderia
-- no clique e nunca apagaria.
create trigger generations_project_status_on_status_change
  after update of status on public.generations
  for each row
  when (old.status is distinct from new.status)
  execute function public.refresh_project_status();

-- ---------------------------------------------------------------------------
-- 3. O passado
-- ---------------------------------------------------------------------------
--
-- Sem isto, os projetos que já existem ficariam `idle` até a próxima geração —
-- e um deles teria a bolinha cinza mostrando um acervo cheio de imagens. O
-- backfill chama a **mesma** função do gatilho, então não há uma segunda regra
-- para envelhecer diferente.

update public.projects p
   set status = v.status
  from (
    select id, public.project_status_now(id) as status
      from public.projects
  ) v
 where p.id = v.id
   and p.status is distinct from v.status;

-- ---------------------------------------------------------------------------
-- Uma trava que NÃO foi posta, e por quê
-- ---------------------------------------------------------------------------
--
-- `projects` tem política de UPDATE para o dono (é o que permite renomear), então
-- um cliente adulterado poderia escrever `status` à mão. Fica assim, de propósito,
-- por dois motivos: o gatilho sobrescreve na geração seguinte, e o estrago máximo
-- é a pessoa mentir para si mesma sobre a própria bolinha — não há dinheiro nem
-- dado de terceiro do outro lado.
--
-- **E o conserto óbvio não funciona.** `revoke update (status) on public.projects
-- from authenticated` parece resolver e não faz nada: o Postgres é explícito de
-- que revogar privilégio de coluna não tem efeito quando o papel tem o privilégio
-- na tabela inteira — e o Supabase concede na tabela inteira. Para valer seria
-- preciso revogar UPDATE da tabela e reconceder coluna a coluna, o que deixaria
-- toda coluna futura invisível ao produto até alguém lembrar deste arquivo.
-- Fica registrado para que ninguém "conserte" isto com uma linha que passa no
-- apply e não protege nada.
