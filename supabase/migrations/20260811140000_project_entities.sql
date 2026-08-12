-- O vínculo projeto ↔ personagem — Etapa D2, Fase 0.
--
-- Especificação: docs/decisoes.md (entrada de 11/08/2026, D2).
--
-- ---------------------------------------------------------------------------
-- O princípio, que decide a forma da tabela
-- ---------------------------------------------------------------------------
--
-- **A personagem é entidade do usuário, única — nunca do projeto.** Uma @luna,
-- uma folha, um histórico de versões, um rastro financeiro. O que nasce aqui é
-- o *vínculo*: quais personagens aparecem em qual aba de trabalho.
--
-- Isso não é uma preferência de modelagem, é o que o resto do banco já afirma:
-- `entities_handle_unique_per_user` faz do handle um nome do **usuário**, não do
-- projeto. Não existem duas @luna. Então a única forma possível de "esta
-- personagem trabalha neste projeto" é uma tabela de ligação — e a consequência
-- de produto vem junto: **desvincular não é arquivar.** Desvincular é leve e
-- reversível (ela segue viva na galeria e nos outros projetos); arquivar
-- continua sendo o ato global, com a confirmação em dois painéis que já existe.
-- Duas ações, dois pesos, duas UIs.

-- ---------------------------------------------------------------------------
-- PRÉ-CONDIÇÃO DE APLICAÇÃO — leia antes de rodar
-- ---------------------------------------------------------------------------
--
-- Esta migration derruba `entities.project_id` (ver a seção final e o porquê).
-- Hoje `createCharacter` escreve `project_id: null` nessa coluna. Escrever numa
-- coluna que não existe mais é erro do PostgREST, ou seja: **criar personagem
-- pararia de funcionar** na janela entre o banco mudar e o deploy novo subir.
--
-- A janela é fechada pela ordem, não pela sorte:
--
--   1. o commit preparatório tira a escrita de `project_id` de createCharacter
--   2. o push sobe, a Vercel publica a partir do origin/master
--   3. só então esta migration é aplicada
--
-- O que torna essa ordem segura é que o passo 1 é **correto nos dois esquemas**:
-- a coluna é nullable e não tem default, então omiti-la grava exatamente o mesmo
-- null que a escrita explícita gravava. Não existe estado em que o código novo
-- esteja errado — só existe um estado em que o código *velho* estaria, e é esse
-- que a ordem elimina.
--
-- A combinação proibida é uma só: banco novo com código velho no ar.

-- ---------------------------------------------------------------------------
-- Uniques compostos — a posse do usuário, garantida pelo banco
-- ---------------------------------------------------------------------------
--
-- Existem só para que a tabela de baixo possa apontar para `(id, user_id)` em
-- vez de apontar para `id` e confiar em quem escreveu. É o precedente exato de
-- `entity_versions_id_entity_id_unique`, que existe pelo mesmo motivo e para o
-- mesmo tipo de garantia: com a chave composta, é o **próprio Postgres** que
-- recusa vincular a personagem de um usuário ao projeto de outro.
--
-- Redundantes do ponto de vista lógico — `id` já é único nas duas tabelas — e
-- não do ponto de vista estrutural: uma chave estrangeira composta exige um
-- unique composto do lado referenciado. O preço são dois índices; o que se
-- compra é uma regra que não depende de ninguém lembrar dela.

alter table public.projects
  add constraint projects_id_user_id_unique unique (id, user_id);

alter table public.entities
  add constraint entities_id_user_id_unique unique (id, user_id);

-- ---------------------------------------------------------------------------
-- project_entities
-- ---------------------------------------------------------------------------

create table public.project_entities (
  project_id uuid not null,
  entity_id uuid not null,
  -- Dono desnormalizado, mesmo padrão de entity_images e entity_versions. Aqui
  -- ele tem um papel a mais: é a coluna que as duas chaves compostas abaixo
  -- compartilham, e é justamente esse compartilhamento que torna impossível a
  -- linha em que o projeto é de um e a personagem é de outro.
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),

  -- O par é a identidade da linha: ou o vínculo existe, ou não existe. Não há
  -- "vinculada duas vezes", e não há id próprio para ninguém precisar carregar.
  primary key (project_id, entity_id),

  -- Excluir projeto leva os vínculos junto: eles são baratos e são do projeto.
  -- A personagem fica — é do usuário, e é toda a tese desta etapa.
  constraint project_entities_project_belongs_to_user
    foreign key (project_id, user_id) references public.projects (id, user_id)
    on delete cascade,

  -- E o mesmo do outro lado. Uma personagem só é apagada de verdade na cascata
  -- de exclusão de conta (LGPD) — as travas de entity_versions impedem o resto —
  -- e nessa hora os vínculos vão junto, como devem.
  constraint project_entities_entity_belongs_to_user
    foreign key (entity_id, user_id) references public.entities (id, user_id)
    on delete cascade
);

comment on table public.project_entities is
  'Quais personagens trabalham em qual projeto. A personagem é do usuário e é '
  'única (entities_handle_unique_per_user faz do handle um nome do usuário, não '
  'do projeto); o vínculo é do projeto. Desvincular é leve e reversível — ela '
  'segue viva na galeria e nos outros projetos —, e é uma ação diferente de '
  'arquivar, que é global e preserva tudo. Projeto novo nasce sem vínculos: '
  'canvas limpo e lista limpa.';

comment on column public.project_entities.user_id is
  'Dono desnormalizado, como em entity_images e entity_versions. Serve ao RLS '
  'sem join, e é a coluna que as duas chaves estrangeiras compostas dividem — o '
  'que faz o banco recusar, sozinho, um vínculo entre o projeto de um usuário e '
  'a personagem de outro.';

-- Índices de cobertura das FKs, pela convenção de 20260807160000. A PK já cobre
-- project_id (coluna líder); entity_id e user_id não, e uma FK sem índice
-- transforma a exclusão do pai em varredura sequencial.
create index project_entities_entity_id_idx on public.project_entities (entity_id);
create index project_entities_user_id_idx on public.project_entities (user_id);

-- ---------------------------------------------------------------------------
-- RLS — default-deny, como nas outras 14 tabelas
-- ---------------------------------------------------------------------------
--
-- Sem política de UPDATE, de propósito: não há o que atualizar numa linha que
-- *é* o vínculo. Revincular é inserir de novo, e a diferença importa — um
-- UPDATE deixaria a porta aberta para mover um vínculo de projeto, que é a única
-- operação que esta tabela não deve saber fazer.

alter table public.project_entities enable row level security;

create policy project_entities_select_own
  on public.project_entities for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy project_entities_insert_own
  on public.project_entities for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy project_entities_delete_own
  on public.project_entities for delete
  to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.project_entities from anon;

-- ---------------------------------------------------------------------------
-- Backfill: todas as personagens em todos os projetos
-- ---------------------------------------------------------------------------
--
-- É exatamente o comportamento de hoje — hoje toda personagem aparece em toda
-- aba —, então nada some de nenhuma tela e nenhum canvas existente quebra. O
-- Jorge desvincula à mão o que não quiser, com um clique.
--
-- A alternativa considerada e recusada foi inferir o vínculo pelo uso real
-- (gerações por projeto). Ela deixaria de fora as personagens que ainda não
-- geraram nada — hoje @aria e @soraia — sumindo-as do único projeto que existe.
-- **O erro barato vence o caro:** um vínculo a mais é um clique; uma personagem
-- desaparecendo de um canvas que a usa é uma investigação.
--
-- Arquivadas entram também. Custa uma linha, e faz um futuro desarquivar se
-- comportar como hoje em vez de devolver a personagem para lugar nenhum.
--
-- Só `character`: os `product` são legado arquivado desde 20260810200000, não
-- aparecem em lista nenhuma e são lidos apenas para nomear grupos de gerações
-- antigas. Vinculá-los inventaria uma relação que o produto não tem mais.

insert into public.project_entities (project_id, entity_id, user_id)
select p.id, e.id, e.user_id
  from public.entities e
  join public.projects p on p.user_id = e.user_id
 where e.kind = 'character'
on conflict (project_id, entity_id) do nothing;

-- ---------------------------------------------------------------------------
-- entities.project_id sai de cena
-- ---------------------------------------------------------------------------
--
-- A coluna existe desde 20260807140200 com a semântica "null = disponível em
-- todos os projetos; preenchido = escopo daquele projeto". Nunca foi usada:
-- todas as linhas estão nulas, e createCharacter escrevia null de propósito,
-- com um comentário dizendo que a personagem é do usuário.
--
-- Ela não fica como legado inofensivo, e o motivo é medido:
--
--   project_id uuid references public.projects (id) on delete cascade
--
-- `deleteProject` apaga de verdade (não arquiva). Se alguém um dia implementar
-- escopo por projeto com esta coluna — e o nome dela é um convite —, excluir um
-- projeto **apagaria a personagem**. Daí cascateia: entity_versions vai junto
-- (os retratos congelados), generations.entity_id vai junto (todas as imagens em
-- que ela apareceu), e ledger_transactions.generation_id é ON DELETE SET NULL —
-- o dinheiro fica no livro apontando para o nada. **Débitos órfãos num livro
-- append-only**, que é a única coisa que um registro financeiro nunca pode ter.
--
-- É o cenário que o comentário de archiveCharacter já descrevia como impensável.
-- Manter a coluna seria manter duas maneiras de dizer a mesma coisa, uma delas
-- com esse buraco, a um `git grep` de distância de quem for implementar a
-- próxima tela. Derrubar é a decisão barata.
--
-- O índice entities_project_id_idx cai junto com a coluna, sem linha própria.

alter table public.entities drop column project_id;

comment on table public.entities is
  'Mencionável com @handle. `character` é o tipo em uso: o `sheet` dele é o '
  'character sheet estruturado. Linhas `product` são da era do Arsenal e estão '
  'arquivadas — produto é card de input no canvas agora, configurado onde o '
  'trabalho acontece em vez de cadastrado antes. O tipo continua existindo para '
  'que a porta siga aberta. A personagem é do usuário e não do projeto: em qual '
  'projeto ela trabalha é uma linha em project_entities, nunca uma coluna aqui.';

-- ---------------------------------------------------------------------------
-- cover_asset_id ganha o papel que estava esperando: o avatar
-- ---------------------------------------------------------------------------
--
-- A coluna existe desde 20260807140200 e nunca teve leitor. Ela é exatamente o
-- que a Fase 3 pede — e está em `entities`, não em `entity_versions`, que é a
-- exigência da especificação: **o avatar é da personagem, não da versão.** É
-- apresentação, não identidade; congelar uma versão nova não muda a cara dela.
--
-- E o `on delete set null` que ela já tem entrega de graça a regra "remover o
-- avatar volta ao padrão": apagar a imagem da galeria devolve o retrato à folha
-- da versão ativa, sem uma linha de código para lembrar disso.

comment on column public.entities.cover_asset_id is
  'O avatar da personagem: a imagem escolhida para representá-la nas telas — '
  'trilho, cartão, lista do @, galeria de personagens. Opcional e sobreposição, '
  'não substituição: sem ela o retrato é a folha completa da versão ativa, e sem '
  'folha são as iniciais. Fica em entities e não em entity_versions de propósito '
  '— o avatar é apresentação, e congelar uma versão nova não deve mexer nele. O '
  'ON DELETE SET NULL é o que faz "remover o avatar" acontecer sozinho quando a '
  'imagem some do acervo.';
