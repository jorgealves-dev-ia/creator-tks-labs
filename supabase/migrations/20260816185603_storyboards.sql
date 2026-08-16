-- FRENTE STORYBOARD · CICLO 2 · Fase 1, migration 3 de 4 — as fichas moram no banco.
--
-- Especificação: docs/decisoes.md (entradas de 16/08/2026, Ciclo 2 do Roteiro).
--
-- ---------------------------------------------------------------------------
-- O PRINCÍPIO QUE DECIDE A FORMA DAS DUAS TABELAS
-- ---------------------------------------------------------------------------
--
--     O node guarda a PERGUNTA; o banco guarda a RESPOSTA.
--
-- É a doutrina do Duplicar (10/08/2026) aplicada a um documento em vez de a uma
-- cópia. A ideia, o canal, o `@`, o modelo e o número de cenas moram no `data`
-- do node de Roteiro: são a pergunta, o autosave já cuida deles, e duplicar o
-- node copia a pergunta sem copiar as fichas — que é exatamente o comportamento
-- certo, e sai de graça.
--
-- As **fichas** moram aqui, e o requisito 3 do ciclo diz por quê: três
-- consumidores futuros vão lê-las (o compilador de imagem, o prompt de vídeo, a
-- voz) e a Máquina do Ciclo 3 vai regê-las. Um grafo em jsonb não é lugar de
-- dado que outra tela precisa consultar.
--
-- **O node não guarda id nenhum**, e isso é o padrão do bloco de vídeo, que a
-- Fase 3 da Frente Vídeo provou: ele lê `listNodeVideos(projeto, node)` e não
-- guarda trabalho. Aqui é `unique (project_id, node_id)` — um storyboard por
-- node de Roteiro, encontrado pela chave que o canvas já tem. Sem segunda cópia
-- para discordar do banco no instante em que mais custa.

-- ---------------------------------------------------------------------------
-- storyboards
-- ---------------------------------------------------------------------------

create table public.storyboards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid not null,
  -- O id do node de Roteiro no grafo. `text` e não uuid pela mesma razão de
  -- generations.node_id: quem gera o id é o React Flow, e o formato é dele.
  node_id text not null,

  -- A ideia CONGELADA que produziu estas fichas. O node tem a viva, em edição;
  -- esta é a que estava escrita no instante do clique. Mesma distinção de
  -- generations.prompt_user_pt, e pelo mesmo motivo: um registro que só guarda
  -- o valor atual não consegue responder "com o que isto foi feito?".
  ideia text not null,
  canal text not null,

  -- Os campos de HISTÓRIA — o rodapé da folha de referência, absorvido em
  -- 15/08/2026 dos vídeos analisados com o Jorge.
  titulo text not null,
  formato text not null,
  estilo text not null,
  genero text not null,

  -- Quantas cenas o texto colado tinha, quando veio de um. Nulo quando a
  -- história foi escrita a partir de uma ideia.
  --
  -- Existe por um defeito medido na Fase 0: o modelo declarou "Condensado de 6
  -- para 6 cenas" sobre um roteiro que não foi condensado. A correção não é
  -- confiar melhor na prosa — é **parar de confiar nela**. Com este número, quem
  -- decide se houve condensação é a conta (`cenas_no_original > total de
  -- cenas`), e `ajuste` vira ilustração de um fato já estabelecido pelo dado.
  -- Mesma doutrina do quadro derivado de 15/08: o que identifica é o dado,
  -- nunca o rótulo.
  cenas_no_original integer,
  ajuste text,

  -- De quem é este roteiro. Nulo é legítimo: um roteiro sem personagem é um
  -- roteiro de produto.
  entity_id uuid,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Um storyboard por node de Roteiro. É o que permite o bloco não guardar id
  -- nenhum e ainda assim se reencontrar depois de um reload.
  constraint storyboards_one_per_node unique (project_id, node_id),

  -- Existe só para que storyboard_scenes possa apontar para `(id, user_id)` em
  -- vez de apontar para `id` e confiar em quem escreveu. Logicamente redundante
  -- — `id` já é único — e estruturalmente obrigatório: uma chave estrangeira
  -- composta exige um unique composto do lado referenciado, e sem esta linha o
  -- `db push` para com "there is no unique constraint matching given keys".
  --
  -- Precedente idêntico: projects_id_user_id_unique e entities_id_user_id_unique,
  -- criados em 20260811140000 exatamente por este motivo. O preço é um índice; o
  -- que se compra é o Postgres recusando, sozinho, a ficha de um usuário dentro
  -- do storyboard de outro.
  constraint storyboards_id_user_id_unique unique (id, user_id),

  -- Posse garantida por chave composta, e não por trigger — o precedente exato
  -- de project_entities (11/08/2026) e de entities.active_version_id. É o
  -- próprio Postgres que recusa o storyboard de um usuário dentro do projeto de
  -- outro; nenhum código precisa lembrar disso.
  constraint storyboards_project_belongs_to_user
    foreign key (project_id, user_id) references public.projects (id, user_id)
    on delete cascade,

  -- E o mesmo do outro lado, com uma diferença que só o PostgreSQL 15+ permite
  -- expressar: `on delete set null (entity_id)` anula **apenas** a coluna
  -- nomeada. Sem essa lista, o SET NULL tentaria anular também `user_id`, que é
  -- NOT NULL, e o delete abortaria — trocando "o roteiro perde a referência à
  -- personagem" por "a exclusão de conta trava".
  --
  -- Na prática é quase código morto, e está aqui como declaração de intenção:
  -- excluir personagem neste produto é ARQUIVAR (10/08/2026), e o DELETE real só
  -- acontece na cascata de exclusão de conta — onde o user_id acima já teria
  -- levado o storyboard junto.
  constraint storyboards_entity_belongs_to_user
    foreign key (entity_id, user_id) references public.entities (id, user_id)
    on delete set null (entity_id)
);

comment on table public.storyboards is
  'Um roteiro estruturado, de um node de Roteiro de um projeto. O node guarda a '
  'pergunta (ideia, canal, @, modelo) e este guarda a resposta (as fichas), '
  'porque três consumidores futuros vão lê-las e a Máquina do Ciclo 3 vai '
  'regê-las. Um por node — o bloco não guarda id nenhum e se reencontra por '
  '(project_id, node_id), como o bloco de vídeo faz com listNodeVideos.';

comment on column public.storyboards.ideia is
  'A ideia congelada que produziu estas fichas. O node tem a viva; esta é a que '
  'estava escrita no instante do clique — mesma distinção de '
  'generations.prompt_user_pt.';

comment on column public.storyboards.cenas_no_original is
  'Quantas cenas o texto colado tinha, quando veio de um. É este número, e não a '
  'frase de `ajuste`, que decide se houve condensação: a tela compara com o '
  'total de cenas. Nasceu de um defeito medido na Fase 0, em que o modelo '
  'declarou "condensado de 6 para 6".';

create index storyboards_user_id_idx on public.storyboards (user_id);
create index storyboards_entity_id_idx on public.storyboards (entity_id);
-- project_id é coluna líder do unique acima, então já está coberta.

create trigger storyboards_set_updated_at
  before update on public.storyboards
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- storyboard_scenes — a ficha
-- ---------------------------------------------------------------------------

create table public.storyboard_scenes (
  id uuid primary key default gen_random_uuid(),
  storyboard_id uuid not null,
  -- Dono desnormalizado, como em entity_images, entity_versions e
  -- project_entities. Serve ao RLS sem join, e é a coluna que a chave composta
  -- abaixo divide.
  user_id uuid not null references auth.users (id) on delete cascade,

  ordem integer not null,
  acao text not null,

  -- A menção guarda o HANDLE, e não a versão congelada. É a decisão mais
  -- importante desta tabela.
  --
  -- Uma ficha é um PLANO, não uma geração. Congelar a versão aqui faria um
  -- roteiro escrito hoje gerar com a v4 amanhã, quando a personagem já
  -- estivesse na v6 — e isso contradiz a regra que sustenta o produto: `@luna`
  -- resolve **no servidor, no momento da geração** (N2). A versão congelada
  -- aparece onde sempre apareceu, em generations.entity_version_id, uma por
  -- imagem gerada. A ficha aponta para a pessoa; a geração aponta para o retrato.
  personagem_handle text,

  -- Texto livre, e a limitação é declarada: produto deixou de ser entidade em
  -- 10/08/2026 e virou card de canvas, então não existe linha para uma FK
  -- apontar. A ponte manual não anexa foto nenhuma por isso — a tela diz
  -- "conecte um Input de Produto".
  produto text,

  cenario text not null,

  -- Chave da lista ANGULO_CAMERA (§5.27 do character sheet), reusada verbatim.
  --
  -- SEM CHECK, de propósito, e a distinção com `transicao` e `status` logo
  -- abaixo é o ponto: enquadramento é vocabulário do DICIONÁRIO, e o dicionário
  -- é fonte única desde 08/08/2026 ("acrescentar opção é sempre seguro"). Uma
  -- cópia da lista aqui seria uma segunda verdade que um dia diverge, e
  -- transformaria "acrescentar opção" em "escrever migration".
  --
  -- A degradação é graciosa e já está escrita: chave desconhecida vira Auto
  -- inteiro no compilador (regra de 10/08), então o pior caso é uma cena sem
  -- ângulo dirigido — nunca uma cena errada.
  enquadramento text not null,
  movimento text not null default '',

  -- DORMENTE (requisito 8 do ciclo): editável, persistido, sem consumidor
  -- nenhum até a voz existir. A tela diz isso em voz alta em vez de deixar
  -- alguém descobrir que escreveu para ninguém.
  fala text,

  -- Qual CTA da biblioteca (nulo quando o modelo escreveu um próprio) e o texto
  -- que de fato ficou. Sem FK para cta_library: a biblioteca é catálogo curado e
  -- pode mudar, e uma ficha de três meses atrás não pode quebrar porque um CTA
  -- foi reescrito. Guarda-se o id para saber de onde veio e o texto para saber o
  -- que foi dito — o mesmo par que prompt_compiled guarda.
  cta_id text,
  cta_texto text,

  duracao_segundos integer not null default 5,

  -- Vocabulário NOSSO, não do dicionário e não do fornecedor: estes dois CHECKs
  -- existem justamente porque nada mais no sistema define estas listas.
  transicao text not null default 'corte',
  status text not null default 'rascunho',

  -- Esta ficha passou por mão humana? É o que a confirmação de "gerar de novo"
  -- vai contar em voz alta antes de substituir, e é o que separa "o que a
  -- máquina escreveu" de "o que a pessoa reescreveu" numa auditoria futura.
  edited_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint storyboard_scenes_belongs_to_user
    foreign key (storyboard_id, user_id) references public.storyboards (id, user_id)
    on delete cascade,

  -- DEFERRABLE INITIALLY DEFERRED, e a razão é o Ciclo 3.
  --
  -- A garantia é a mesma de um unique comum — no COMMIT, duas cenas não podem
  -- ter a mesma ordem. O que muda é que uma troca de posição (1 vira 2, 2 vira
  -- 1) pode acontecer dentro de uma transação sem colidir no meio do caminho.
  -- Um unique imediato obrigaria o reordenar futuro a inventar uma ordem
  -- temporária negativa, que é a gambiarra clássica de quem descobriu isso
  -- tarde demais.
  constraint storyboard_scenes_ordem_unica
    unique (storyboard_id, ordem) deferrable initially deferred,

  -- O teto de 10, primeira das camadas que o requisito 7 pede. As outras duas
  -- são o `maxItems` do schema que viaja ao provedor e o Zod da rota; esta é a
  -- que não depende de ninguém lembrar.
  constraint storyboard_scenes_ordem_no_teto check (ordem between 1 and 10),
  constraint storyboard_scenes_duracao_valida
    check (duracao_segundos between 1 and 60),
  constraint storyboard_scenes_transicao_valida
    check (transicao in ('corte', 'continuacao')),
  constraint storyboard_scenes_status_valido
    check (status in ('rascunho', 'aprovada')),
  -- A cena 1 não pode ser continuação: não existe quadro anterior para emendar.
  -- No banco e não só no Zod porque é uma promessa sobre o vídeo, e a Máquina do
  -- Ciclo 3 vai ler esta coluna para decidir se emenda dois clipes.
  constraint storyboard_scenes_primeira_nao_continua
    check (ordem > 1 or transicao <> 'continuacao')
);

comment on table public.storyboard_scenes is
  'Uma ficha de cena: dado estruturado, não texto. Uma ficha, três consumidores '
  '— o compilador de imagem, o prompt de vídeo e a voz futura —, que é o que '
  'impede o roteiro de virar um parágrafo que cada motor reinterpreta do seu '
  'jeito. Editável in-place: é rascunho de trabalho, como entities.sheet, e não '
  'retrato congelado.';

comment on column public.storyboard_scenes.personagem_handle is
  'O handle, sem @ — nunca o id de uma versão congelada. Uma ficha é um plano; '
  'quem resolve `@luna` para um retrato é o servidor, no momento da geração '
  '(decisão N2). Congelar aqui faria um roteiro de hoje gerar com a versão de '
  'hoje daqui a um mês.';

comment on column public.storyboard_scenes.fala is
  'O que a personagem diz. DORMENTE na v1: editável e persistido, sem consumidor '
  'nenhum até a voz existir. A tela declara isso.';

comment on column public.storyboard_scenes.transicao is
  'corte (plano novo) ou continuacao (começa no último quadro da cena anterior, '
  'a emenda do Ciclo 1). Quando é continuacao, a receita do gerador exige que a '
  'ação mantenha o rosto em câmera no primeiro segundo — medir identidade num '
  'quadro em que ninguém está olhando é não medir.';

comment on column public.storyboard_scenes.edited_at is
  'Quando uma pessoa editou esta ficha à mão. Nulo = como a máquina escreveu. É '
  'o que a confirmação de "gerar de novo" conta antes de substituir.';

create index storyboard_scenes_storyboard_id_idx
  on public.storyboard_scenes (storyboard_id, ordem);
create index storyboard_scenes_user_id_idx on public.storyboard_scenes (user_id);

create trigger storyboard_scenes_set_updated_at
  before update on public.storyboard_scenes
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- O teto de 10, contado — o que o CHECK de `ordem` sozinho não pega
-- ---------------------------------------------------------------------------
--
-- `ordem between 1 and 10` impede a cena 11, e não impede **onze linhas**: dez
-- ordens legais mais uma repetida seriam barradas pelo unique, mas o unique é
-- DEFERRABLE e só fala no commit. Contar é o que fecha a porta.
--
-- Mesmo espírito do enforce_product_image_limit (10/08): o número é uma promessa
-- que a interface faz em voz alta ("até 10 cenas"), e promessa guardada em dois
-- lugares é promessa que discorda de si mesma.

create or replace function public.enforce_storyboard_scene_limit()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_count integer;
begin
  select count(*)
    into v_count
    from public.storyboard_scenes
   where storyboard_id = new.storyboard_id;

  if v_count >= 10 then
    raise exception
      'a storyboard holds at most 10 scenes in v1'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

comment on function public.enforce_storyboard_scene_limit() is
  'Trava o storyboard em 10 cenas. O CHECK de `ordem` impede a cena de número '
  '11; este impede a décima primeira LINHA, que é coisa diferente enquanto o '
  'unique de ordem for deferrable.';

-- INSERT only: substituir um roteiro apaga as fichas antigas e insere as novas,
-- e disparar no UPDATE obrigaria a raciocinar se a linha sendo atualizada já
-- está dentro da própria contagem. Mesma escolha do enforce_product_image_limit.
create trigger storyboard_scenes_enforce_limit
  before insert on public.storyboard_scenes
  for each row execute function public.enforce_storyboard_scene_limit();

revoke execute on function public.enforce_storyboard_scene_limit()
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- RLS — default-deny, como nas outras 17 tabelas
-- ---------------------------------------------------------------------------
--
-- As quatro operações existem nas duas tabelas, e essa é a diferença para
-- `generations` e `ledger_transactions`, que são somente-leitura para o usuário.
--
-- O motivo é o requisito 4 do ciclo: **editar campo de ficha na mão nunca toca
-- provedor e nunca cobra.** Editar é UPDATE direto, sob RLS, sem passar por
-- função nenhuma — porque não há dinheiro no caminho. O que passa por
-- record_generation é só o que chama um modelo.
--
-- E DELETE existe porque substituir um roteiro apaga as fichas antigas. Não há
-- história a preservar numa ficha: a história de quem pagou o quê está em
-- `generations`, que continua append-only e intocada por isto.

alter table public.storyboards enable row level security;

create policy storyboards_select_own
  on public.storyboards for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy storyboards_insert_own
  on public.storyboards for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy storyboards_update_own
  on public.storyboards for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy storyboards_delete_own
  on public.storyboards for delete
  to authenticated
  using ((select auth.uid()) = user_id);

alter table public.storyboard_scenes enable row level security;

create policy storyboard_scenes_select_own
  on public.storyboard_scenes for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy storyboard_scenes_insert_own
  on public.storyboard_scenes for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy storyboard_scenes_update_own
  on public.storyboard_scenes for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy storyboard_scenes_delete_own
  on public.storyboard_scenes for delete
  to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.storyboards from anon;
revoke all on public.storyboard_scenes from anon;
