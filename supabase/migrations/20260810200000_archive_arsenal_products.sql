-- Produtos do Arsenal, arquivados: eles viraram nodes de input no canvas.
--
-- Especificação: docs/nodes-geracao.md §3.1 e a entrada de 10/08/2026 em
-- docs/decisoes.md.
--
-- Um produto era uma linha de `entities` com `kind = 'product'`, criada por um
-- cadastro no menu lateral antes de qualquer imagem existir. Isso acabou: um
-- produto é rotativo, então ele passa a ser um **card no canvas**, configurado
-- onde o trabalho acontece e descartado com a campanha. A interface que criava e
-- editava essas linhas não existe mais.
--
-- ---------------------------------------------------------------------------
-- Arquivar, e não apagar
-- ---------------------------------------------------------------------------
--
-- `archived_at` e não `delete`, pela mesma razão de sempre — e a razão aqui é
-- medida, não estimada. `generations.entity_id` aponta para `entities` com
-- **ON DELETE CASCADE**: apagar um produto apagaria toda geração feita com ele.
-- E `ledger_transactions.generation_id` é **ON DELETE SET NULL**, então o
-- dinheiro ficaria no extrato apontando para o nada — débitos órfãos num livro
-- append-only.
--
-- Arquivar preserva tudo: a linha, os vínculos em `entity_images`, as fotos na
-- galeria, e cada geração que já usou o produto continua sabendo o que usou.
-- O que muda é só que ele sai das listas, que já filtram por `archived_at is
-- null` desde a Fase 0.
--
-- ---------------------------------------------------------------------------
-- O que fica de pé, e por quê
-- ---------------------------------------------------------------------------
--
-- O valor `product` continua no enum `entity_kind`, e o trigger
-- `enforce_product_image_limit` continua instalado. Nenhum dos dois custa nada
-- em repouso — sem interface criando produtos, o trigger nunca dispara — e
-- remover um valor de enum em Postgres é caro e irreversível. Se o produto
-- voltar a ser cidadão do Arsenal um dia (com extração de atributos, que é a
-- pendência registrada da decisão N4), a porta continua aberta.
--
-- O teto de cinco fotos, esse sim, mudou de casa: ele agora é o card no canvas
-- mais o Zod da rota de geração. Continua no servidor; deixou de estar no banco.
-- Está registrado como a perda declarada quando o modelo de dados foi escolhido.

update public.entities
   set archived_at = now()
 where kind = 'product'
   and archived_at is null;

comment on table public.entities is
  'Mentionable with @handle. `character` is the kind in use: its `sheet` is the '
  'structured character sheet. `product` rows exist from the Arsenal era and are '
  'archived — a product is a canvas input node now, configured where the work '
  'happens instead of registered beforehand. The kind is kept so the door stays '
  'open if products ever become Arsenal citizens again. A null project_id means '
  'the entity is available in all of the user''s projects; a set project_id '
  'scopes it to that project.';
