-- FRENTE STORYBOARD · CICLO 3 · Fase 1 — a aprovação não some em silêncio.
--
-- Emenda da migration anterior (20260828143000), decidida pelo Jorge na
-- conferência pós-aplicação de 28/08/2026.
--
-- ---------------------------------------------------------------------------
-- O QUE MUDA, E POR QUE A PRIMEIRA VERSÃO ESTAVA ERRADA
-- ---------------------------------------------------------------------------
--
-- `storyboard_scenes.imagem_aprovada_asset_id` nasceu com ON DELETE SET NULL,
-- por um precedente que eu escolhi mal: `entities.cover_asset_id`. Capa é
-- **cosmético** — perder uma capa custa uma miniatura. Isto é **decisão**.
--
-- Com SET NULL, apagar o asset apagaria a aprovação **sem deixar rastro**: a
-- cena voltaria a ler como "não aprovada", indistinguível de uma que nunca foi
-- aprovada, e a pessoa descobriria no portão de vídeo — "Animar as 3" onde
-- ontem eram 4. É a classe de falha que esta casa recusa desde sempre: um
-- estado mudando sem que ninguém seja avisado.
--
-- O precedente certo era o outro, e ele já estava no banco:
-- `entity_images_reject_canonical_delete` — **imagem citada por uma versão
-- congelada não pode ser apagada.** Uma imagem aprovada é exatamente isso: uma
-- imagem citada por uma decisão.
--
-- ---------------------------------------------------------------------------
-- POR QUE NO ACTION, E NÃO RESTRICT
-- ---------------------------------------------------------------------------
--
-- Os dois recusam o delete. A diferença é **quando** a checagem roda, e ela
-- decide se a exclusão de conta continua possível:
--
--   RESTRICT    checado IMEDIATAMENTE, e não pode ser adiado.
--   NO ACTION   checado no FIM DO STATEMENT.
--
-- Na cascata de exclusão de conta, `assets` e `storyboard_scenes` são apagadas
-- pelo **mesmo** `delete from auth.users` — as duas penduradas em `user_id`
-- com ON DELETE CASCADE. A ordem em que o Postgres processa as duas cascatas
-- **não é definida**. Com RESTRICT, se `assets` for processada primeiro, a
-- checagem dispara enquanto a cena ainda existe e **a exclusão de conta
-- aborta** — às vezes. Com NO ACTION, a checagem espera o fim do statement,
-- quando a cena já foi apagada junto, e passa.
--
-- É a armadilha de 07/08/2026 ("sem essa exceção, apagar uma conta se tornaria
-- impossível") com uma crueldade a mais: **dependente de ordem, ela passaria no
-- teste e falharia em produção.**
--
-- E isto não fica em teoria: as travas de
-- `scratchpad/storyboard-c3/travas-executadas-fase1.sql` exercitam os dois
-- lados — o delete normal que TEM de reprovar, e a cascata do diamante que TEM
-- de passar com as duas linhas sumindo juntas.
--
-- ---------------------------------------------------------------------------
-- O QUE ISTO DEIXA PARA O BACKLOG "apagar asset com auditoria de referências"
-- ---------------------------------------------------------------------------
--
-- Um banco que **já recusa**. No dia em que essa porta for construída, ela vai
-- esbarrar nesta constraint e terá de decidir o que fazer com a aprovação —
-- em vez de descobrir em produção que apagou uma decisão sem avisar.
--
-- Hoje o risco é zero: o único caminho de delete de asset no produto é
-- `lib/entities/image-actions.ts`, que apaga imagem canônica de personagem.
-- Mas não mexer também era uma escolha, e era a errada.
--
-- Aditiva no sentido que importa: nenhuma linha existente é tocada (a coluna
-- está 100% nula), e o `add constraint` revalida um conjunto vazio.

alter table public.storyboard_scenes
  drop constraint storyboard_scenes_aprovada_belongs_to_user;

alter table public.storyboard_scenes
  add constraint storyboard_scenes_aprovada_belongs_to_user
    foreign key (imagem_aprovada_asset_id, user_id) references public.assets (id, user_id)
    on delete no action;

comment on column public.storyboard_scenes.imagem_aprovada_asset_id is
  'Qual imagem desta cena foi aprovada para virar vídeo. Nula = não aprovada. É '
  'um ponteiro e não um rótulo: não existe estado em que ela discorde do acervo. '
  'Diferente de `status`, que responde se o TEXTO da ficha foi revisado — duas '
  'perguntas, duas colunas. ON DELETE NO ACTION: apagar um asset aprovado é '
  'RECUSADO, porque uma aprovação que some em silêncio é pior que um delete que '
  'falha. NO ACTION e não RESTRICT porque a checagem tem de esperar o fim do '
  'statement — senão a cascata de exclusão de conta, que apaga assets e cenas no '
  'mesmo delete, abortaria conforme a ordem em que o Postgres as processasse.';
