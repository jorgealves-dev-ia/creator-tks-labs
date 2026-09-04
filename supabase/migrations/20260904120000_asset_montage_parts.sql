-- Mini-ciclo «O vídeo final» · Fase 1 — de quais clipes o filme foi feito.
--
-- Especificação: docs/plano-video-final.md, seção «Fase 1 · A montagem».
--
-- ---------------------------------------------------------------------------
-- A pergunta que nenhuma coluna de hoje responde
-- ---------------------------------------------------------------------------
--
-- O filme montado é a primeira coisa deste produto que nasce de **N** arquivos
-- nossos, e não de um. A linhagem que existe é singular por desenho:
--
--   assets.derived_from_asset_id   uuid — UM asset de origem
--
-- Ela foi escrita em 15/08/2026 para o quadro derivado do elo, onde a resposta
-- é mesmo uma só: este quadro veio daquele vídeo. Aqui a resposta é uma lista
-- **ordenada** — cena 1, cena 2, cena 3 —, e a ordem é metade do fato: o mesmo
-- conjunto de três clipes em outra ordem é outro filme.
--
-- Enfiar isso na coluna existente teria duas saídas, e as duas mentem:
--
--   apontar para o PRIMEIRO clipe    diz de onde o filme começa e esconde o
--                                    resto — meia verdade numa coluna de
--                                    auditoria, que é onde meia verdade custa
--                                    mais caro
--   apontar para o storyboard        não cabe: a coluna é FK para `assets`, e
--                                    um roteiro não é um arquivo
--
-- ---------------------------------------------------------------------------
-- Por que uma tabela, e não uma coluna de lista
-- ---------------------------------------------------------------------------
--
-- `assets` não tem jsonb, e acrescentar um só para isto trocaria uma FK que o
-- banco confere por um texto que ninguém confere. Um `uuid[]` teria a ordem mas
-- **não teria integridade referencial**: o dia em que um clipe fosse apagado, o
-- array guardaria um id que não aponta para lugar nenhum, e a galeria mostraria
-- linhagem para um arquivo inexistente sem ninguém perceber.
--
-- A tabela dá as três coisas de uma vez: a ordem (`ordem`), a integridade (duas
-- FKs), e o RLS que todo o resto tem.
--
-- ---------------------------------------------------------------------------
-- As duas FKs apagam de maneiras diferentes, e isso é decisão
-- ---------------------------------------------------------------------------
--
--   montage_asset_id  on delete CASCADE   sem o filme, a lista de peças dele
--                                         não é auditoria de nada
--
--   part_asset_id     on delete SET NULL  precedente medido de 15/08: perder a
--                                         linhagem é perda de auditoria, perder
--                                         o arquivo é perder trabalho. Apagar um
--                                         clipe NÃO pode apagar o filme que ele
--                                         formou — o filme já é um cartão no
--                                         canvas de alguém, e possivelmente já
--                                         foi postado
--
-- Por isso `part_asset_id` é **anulável**: a linha sobrevive ao clipe e continua
-- dizendo *"a posição 2 veio de um clipe que não existe mais"*. É mais honesto
-- que um buraco na numeração, que obrigaria quem lê a adivinhar se faltou uma
-- peça ou se o filme só tinha duas.
--
-- **E aqui mora uma armadilha que quase custou caro:** `on delete set null` **é
-- um UPDATE**. O trigger de append-only lá embaixo teria tornado um clipe
-- **indeletável** se recusasse todo UPDATE — a trava de auditoria virando
-- trava de produto. Ele abre exceção **exatamente** para essa transição, e para
-- nenhuma outra.
--
-- **A cascata de LGPD não precisa de exceção**, e isso continua valendo: os dois
-- triggers são de INSERT e de UPDATE. A exclusão de conta desce por `user_id` e
-- por `assets` em DELETE, sem encontrar trava nenhuma no caminho — diferente do
-- ledger, que precisa da cláusula do `auth.users` justamente porque trava DELETE.
--
-- ---------------------------------------------------------------------------
-- `ordem`, e por que ela tem esse nome
-- ---------------------------------------------------------------------------
--
-- É o mesmo nome e o mesmo domínio de `storyboard_scenes.ordem` (hoje 1..6 no
-- acervo), e não é coincidência: **a ordem do filme É a ordem das cenas.** A
-- Fase 0 mediu o motivo — o lote de 643 ms de 02/09 submeteu as três cenas fora
-- de ordem, e a cena 2 é a geração criada por último. Montar por `created_at`
-- entregaria o filme embaralhado, e o erro só apareceria assistindo.
--
-- Guardar a ordem **no momento da montagem** é o que faz o registro continuar
-- verdadeiro depois: reordenar as cenas amanhã não reescreve o que este filme
-- foi ontem.
--
-- ---------------------------------------------------------------------------
-- Montagem não é geração, e este arquivo não encosta em dinheiro
-- ---------------------------------------------------------------------------
--
-- Nada aqui toca `generations` nem `ledger_transactions`. Juntar arquivos que já
-- foram pagos não chama modelo, não tem `cost_real_cents` e não cobra — é a
-- mesma natureza do quadro derivado do elo. Storage é custo nosso e desprezível.

create table public.asset_montage_parts (
  -- O filme.
  montage_asset_id uuid not null references public.assets (id) on delete cascade,

  -- A posição desta peça no filme, 1..N, na ordem das cenas.
  ordem integer not null,

  -- O clipe que ocupou essa posição. Anulável de propósito: ver acima.
  part_asset_id uuid references public.assets (id) on delete set null,

  -- Dono desnormalizado, como em entity_images, entity_versions,
  -- project_entities e storyboard_scenes. Serve ao RLS sem join.
  user_id uuid not null references auth.users (id) on delete cascade,

  created_at timestamptz not null default now(),

  -- Uma posição por filme. É a chave que impede o mesmo filme de declarar duas
  -- peças na posição 2 — o estado que faria a linhagem parar de ser uma lista.
  primary key (montage_asset_id, ordem)
);

comment on table public.asset_montage_parts is
  'De quais clipes um filme montado foi feito, e em que ordem. Uma linha por '
  'posição. A montagem não é geração: não passa por generations, não toca o '
  'ledger e não custa Spark.';

comment on column public.asset_montage_parts.ordem is
  'A posição no filme, 1..N — o mesmo domínio de storyboard_scenes.ordem, e '
  'gravada no momento da montagem. Reordenar as cenas depois não reescreve o '
  'que este filme foi.';

comment on column public.asset_montage_parts.part_asset_id is
  'O clipe daquela posição. Nulo quando o clipe foi apagado depois: a linha '
  'sobrevive e continua dizendo que a posição existiu, o que é mais honesto que '
  'um buraco na numeração.';

-- A ordem começa em 1, como a das cenas. Zero e negativo não são posições.
alter table public.asset_montage_parts
  add constraint asset_montage_parts_ordem_positive check (ordem >= 1);

-- Um filme não é peça de si mesmo. Barato de checar, e o laço que ele impede é
-- do tipo que só aparece quando alguém escreve a consulta que o segue.
alter table public.asset_montage_parts
  add constraint asset_montage_parts_part_is_not_montage
    check (part_asset_id is null or part_asset_id <> montage_asset_id);

-- Sem ele, apagar um clipe força varredura sequencial para aplicar o SET NULL —
-- mesma razão e mesma forma do assets_derived_from_asset_id_idx de 15/08.
create index asset_montage_parts_part_asset_id_idx
  on public.asset_montage_parts (part_asset_id)
  where part_asset_id is not null;

-- ---------------------------------------------------------------------------
-- RLS default-deny, como as outras
-- ---------------------------------------------------------------------------

alter table public.asset_montage_parts enable row level security;

create policy asset_montage_parts_select_own
  on public.asset_montage_parts for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy asset_montage_parts_insert_own
  on public.asset_montage_parts for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

-- SEM policy de UPDATE e SEM policy de DELETE, e as duas ausências são decisão.
--
-- DELETE: uma linha de peça só deve sumir junto com o filme (cascata da FK) ou
-- junto com a conta (cascata do `user_id`). As duas são ações do motor de FK,
-- que **não consulta policy**. Uma policy de delete, portanto, não habilitaria
-- nenhuma das duas — habilitaria só a terceira, que é alguém apagar a peça 2 de
-- um filme que continua existindo. Isso não é apagar: é reescrever a história de
-- um arquivo, e a linhagem viraria uma lista com buraco.
--
-- UPDATE: ver o trigger abaixo — a ausência de policy sozinha não basta.

revoke all on public.asset_montage_parts from anon;

-- ---------------------------------------------------------------------------
-- Append-only NO BANCO — porque a ausência de policy não alcança a service role
-- ---------------------------------------------------------------------------
--
-- Não ter policy de UPDATE já trava o `authenticated`, pelo default-deny. Mas a
-- **service role ignora RLS por desenho**, e todo o caminho de servidor deste
-- produto usa a service role: sem trigger, a promessa de append-only valeria
-- para o usuário e **não valeria para o nosso próprio código** — que é
-- exatamente quem escreve aqui.
--
-- E o ledger é o precedente: ele não se contenta com policy, ele levanta
-- exceção. Esta tabela não guarda dinheiro, mas guarda a mesma espécie de fato
-- — **o que aconteceu naquele instante** —, e o argumento é o mesmo.
--
-- **A EXCEÇÃO, e ela é obrigatória:** `part_asset_id` tem `on delete set null`,
-- e **um SET NULL de FK é um UPDATE**. Um trigger que recusasse todo UPDATE
-- faria o banco recusar o apagamento de qualquer clipe que já tivesse entrado
-- num filme — uma trava de auditoria transformada em trava de produto, e
-- descoberta só no dia em que alguém tentasse apagar um clipe.

create or replace function public.reject_asset_montage_parts_update()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  -- A única atualização legítima: o próprio banco anulando a peça porque o
  -- clipe foi apagado. Tudo mais é reescrita de história.
  if new.montage_asset_id is not distinct from old.montage_asset_id
     and new.ordem        is not distinct from old.ordem
     and new.user_id      is not distinct from old.user_id
     and new.created_at   is not distinct from old.created_at
     and old.part_asset_id is not null
     and new.part_asset_id is null
  then
    return new;
  end if;

  raise exception
    'asset_montage_parts is append-only: the parts list is the fact of the moment the film was assembled — assemble another film instead of rewriting this one'
    using errcode = 'restrict_violation';
end;
$$;

create trigger asset_montage_parts_reject_update
  before update on public.asset_montage_parts
  for each row execute function public.reject_asset_montage_parts_update();

-- ---------------------------------------------------------------------------
-- O dono da linha É o dono do filme — conferido pelo banco, não prometido pelo
-- código
-- ---------------------------------------------------------------------------
--
-- O RLS desta tabela lê pelo `user_id` desnormalizado, que é a forma da casa
-- (`entity_images`, `entity_versions`, `project_entities`, `storyboard_scenes`).
-- O que nenhuma delas tem, e esta passa a ter, é a **conferência de que esse
-- dono é mesmo o dono do objeto pai**: sem ela, uma linha gravada com o
-- `user_id` errado ficaria visível para quem não é dono do filme — e a policy
-- estaria cumprindo o que promete em cima de um dado que ninguém conferiu.
--
-- Vale também para a peça: **um filme não cita o clipe de outra pessoa.**
--
-- `security definer` porque a pergunta é sobre a verdade, e não sobre o que o
-- chamador enxerga — e porque a service role, que é quem insere aqui, já passa
-- por cima do RLS de qualquer jeito.

create or replace function public.asset_montage_parts_owner_matches()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  dono_do_filme uuid;
  dono_da_peca uuid;
begin
  select a.user_id into dono_do_filme
    from public.assets a where a.id = new.montage_asset_id;

  if dono_do_filme is null or dono_do_filme <> new.user_id then
    raise exception
      'asset_montage_parts.user_id must be the owner of the montage asset'
      using errcode = 'check_violation';
  end if;

  if new.part_asset_id is not null then
    select a.user_id into dono_da_peca
      from public.assets a where a.id = new.part_asset_id;

    if dono_da_peca is null or dono_da_peca <> new.user_id then
      raise exception
        'asset_montage_parts.part_asset_id must belong to the same owner'
        using errcode = 'check_violation';
    end if;
  end if;

  return new;
end;
$$;

create trigger asset_montage_parts_owner_matches
  before insert on public.asset_montage_parts
  for each row execute function public.asset_montage_parts_owner_matches();
