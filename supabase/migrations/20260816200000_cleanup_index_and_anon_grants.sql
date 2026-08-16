-- FRENTE STORYBOARD · CICLO 2 · faxina dos dois achados da verificação da Fase 1.
--
-- Nenhum dos dois quebra nada hoje. Os dois estão aqui porque hoje é o dia mais
-- barato de consertá-los: `storyboard_scenes` tem zero linhas, e um `revoke`
-- feito antes de alguém depender do contrário é um `revoke` que não precisa de
-- aviso.

-- ---------------------------------------------------------------------------
-- 1. O índice redundante em storyboard_scenes
-- ---------------------------------------------------------------------------
--
-- A migration 20260816185603 criou dois índices com as mesmas colunas, na mesma
-- ordem, sobre a mesma tabela:
--
--   storyboard_scenes_ordem_unica        UNIQUE (storyboard_id, ordem)
--   storyboard_scenes_storyboard_id_idx  BTREE  (storyboard_id, ordem)
--
-- Um unique constraint é implementado por um índice, e esse índice atende
-- qualquer leitura que o btree atenderia — inclusive a consulta que motivou o
-- segundo, que é "as cenas deste storyboard, em ordem". O que sobra não acelera
-- nada: custa uma escrita a mais por cena inserida e espaço em disco.
--
-- Não foi descuido de digitação, e vale registrar por quê: o índice foi escrito
-- pensando na LEITURA e o unique foi escrito pensando na TRAVA, em momentos
-- diferentes do mesmo arquivo. Só quando os dois foram lidos lado a lado, no
-- catálogo e não no SQL, ficou visível que são o mesmo objeto com dois nomes.
-- É o argumento da casa outra vez: conferir contra o banco, e não contra o
-- arquivo que se acabou de escrever.
--
-- O que NÃO se perde: a trava de ordem única continua inteira (ela é a
-- constraint, não este índice), o índice do unique continua servindo toda
-- leitura por storyboard, e `storyboard_scenes_user_id_idx`, que serve o RLS,
-- fica onde está.

drop index if exists public.storyboard_scenes_storyboard_id_idx;

-- ---------------------------------------------------------------------------
-- 2. `anon` nas duas tabelas de preço mais antigas
-- ---------------------------------------------------------------------------
--
-- `ai_model_text_prices` e `cta_library` nasceram com `revoke all ... from anon`
-- no rodapé. `ai_model_image_prices` (20260810180000) e `ai_model_video_prices`
-- (20260813170000) não levaram essa linha, e o Supabase concede privilégio de
-- tabela aos papéis da API por default privileges — então as duas estão hoje
-- com `anon` na ACL.
--
-- **Não há vazamento, e a distinção importa para não tratar isto como incidente:**
-- RLS está ligado nas duas, e nenhuma das duas tem política para `anon`. Sob
-- default-deny, um visitante não autenticado lê ZERO linhas de qualquer uma
-- delas — o GRANT dá a permissão de tentar, e o RLS devolve o conjunto vazio.
-- Isso foi conferido no catálogo, não suposto.
--
-- O que se compra aqui é a segunda camada: se um dia alguém criar uma política
-- permissiva sem reparar em quem ela alcança, a ausência do GRANT ainda barra.
-- É a mesma razão pela qual a invariante 4 pede default-deny mesmo com o resto
-- do sistema correto — uma trava só vale quando não depende da outra estar
-- certa.
--
-- Preço de catálogo não é segredo, e isso é verdade. Mas "não é segredo" é
-- argumento para deixar `authenticated` ler, não para deixar a porta de `anon`
-- destrancada porque não tem nada atrás dela hoje.
--
-- `authenticated` não é tocado: as duas tabelas continuam legíveis por quem
-- está logado, que é o que a tela precisa para dizer o custo antes do clique.

revoke all on public.ai_model_image_prices from anon;
revoke all on public.ai_model_video_prices from anon;
