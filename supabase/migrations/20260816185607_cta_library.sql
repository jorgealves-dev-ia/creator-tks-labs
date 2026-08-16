-- FRENTE STORYBOARD · CICLO 2 · Fase 1, migration 4 de 4 — a biblioteca de CTAs.
--
-- Especificação: docs/decisoes.md (entradas de 16/08/2026, Ciclo 2 do Roteiro).
--
-- ---------------------------------------------------------------------------
-- POR QUE NO BANCO, E NÃO EM src/config/
-- ---------------------------------------------------------------------------
--
-- A invariante 6 manda proporções por canal para `src/config/format-presets.json`
-- e catálogo de fornecedores/modelos/preços para o banco. A régua que separa as
-- duas, escrita na decisão E1, é: **o que o painel super admin vai gerenciar
-- mora no banco, porque painel administrativo não edita arquivo de repositório.**
--
-- Um CTA é conteúdo curado que muda com a moda, com o canal e com a época do
-- ano — "corre que é pouca peça" na Black Friday não é "link na bio". Ele
-- precisa mudar por SQL, sem deploy. Um preset de proporção não muda nunca:
-- 9:16 é 9:16.
--
-- E o registro (f) da visão desta frente já tinha decidido a categoria:
-- *"templates de história por nicho = receitas de catálogo, mesma filosofia dos
-- modos de formato: dado, não código"*. Esta é a primeira delas.
--
-- ---------------------------------------------------------------------------
-- É SUGESTÃO, NÃO LISTA FECHADA — e a diferença decide o schema
-- ---------------------------------------------------------------------------
--
-- Todas as outras listas fechadas desta casa alimentam um compilador
-- determinístico: `morena_clara` vira uma frase fixa em inglês, e por isso a
-- chave é imutável e o vocabulário não admite invenção.
--
-- Um CTA não vira frase fixa de prompt: ele é **copy**, lido por um humano e
-- falado por uma personagem. Então a biblioteca entra na receita como sugestão
-- e no editor de ficha como dropdown, e o modelo pode escrever um próprio — a
-- ficha guarda `cta_id` (de onde veio, nulo quando é próprio) **e** `cta_texto`
-- (o que ficou). Travar isso numa lista fechada seria aplicar a regra certa no
-- lugar errado.
--
-- Por isso storyboard_scenes.cta_id NÃO tem chave estrangeira para cá: uma ficha
-- de três meses atrás não pode quebrar porque um CTA foi reescrito ou desligado.

create table public.cta_library (
  -- Id legível e não uuid, de propósito. Ele é citado por
  -- storyboard_scenes.cta_id sem FK, então precisa dizer sozinho de onde veio:
  -- `tts_carrinho_laranja` numa auditoria explica o que um uuid não explicaria.
  -- Mesma imutabilidade das chaves do dictionary.ts: acrescentar é sempre
  -- seguro, renomear quebra fichas gravadas.
  id text primary key,
  canal text not null,
  momento text not null,
  texto_pt text not null,
  -- Quando usar, em uma frase — para o dropdown do editor de ficha ensinar em
  -- vez de só listar. "A tela é o manual" aplicado a um catálogo.
  hint text,
  sort_order integer not null default 0,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),

  constraint cta_library_id_format check (id ~ '^[a-z0-9_]{2,48}$'),
  constraint cta_library_texto_nao_vazio check (length(btrim(texto_pt)) > 0),

  -- Vocabulário nosso, não do fornecedor: CHECK, pela mesma razão de
  -- ai_model_text_prices.job_kind. Um canal novo é uma decisão de produto, e
  -- decisão de produto já vem com migration.
  constraint cta_library_canal_valido
    check (canal in ('tiktok', 'tiktok_shop', 'reels', 'shorts', 'shopee')),

  -- Três valores embora a v1 semeie só `cta`. O registro de 13/08/2026 desenhou
  -- a camada do Roteiro como gancho/corpo/CTA; a coluna nasce sabendo disso, e
  -- semear ganchos um dia é um INSERT em vez de uma migration de schema.
  constraint cta_library_momento_valido
    check (momento in ('gancho', 'corpo', 'cta'))
);

comment on table public.cta_library is
  'Chamadas para ação por canal — catálogo curado, no banco e não em config/ '
  'porque é conteúdo que muda com a moda e com a época do ano, e o painel super '
  'admin vai gerenciá-lo sem deploy. É SUGESTÃO e não lista fechada: entra na '
  'receita do gerador e no dropdown do editor de ficha, e o modelo pode escrever '
  'um próprio. Por isso storyboard_scenes.cta_id não tem FK para cá.';

comment on column public.cta_library.id is
  'Chave legível e IMUTÁVEL, citada por storyboard_scenes.cta_id sem chave '
  'estrangeira. Acrescentar é sempre seguro; renomear quebra fichas já gravadas, '
  'exatamente como as chaves do dictionary.ts.';

comment on column public.cta_library.momento is
  'gancho, corpo ou cta. A v1 semeia só `cta`; os outros dois existem porque a '
  'estrutura gancho/corpo/CTA já estava decidida (13/08/2026), e uma coluna com '
  'os três valores hoje é uma migration a menos amanhã.';

create index cta_library_canal_idx
  on public.cta_library (canal, momento, sort_order)
  where enabled;

-- RLS: todo autenticado lê, ninguém escreve — a mesma do resto do catálogo.
alter table public.cta_library enable row level security;

create policy cta_library_select_all
  on public.cta_library for select
  to authenticated
  using (true);

revoke all on public.cta_library from anon;

-- ---------------------------------------------------------------------------
-- O seed curado v1 — 17 entradas, cinco canais
-- ---------------------------------------------------------------------------
--
-- Escrito em português falado, do jeito que se fala num vídeo vertical, e não em
-- português de anúncio. Um CTA que soa como legenda de banner morre na primeira
-- leitura em voz alta — e este campo existe justamente para ser lido em voz alta
-- no dia em que a voz existir.
--
-- TikTok Shop primeiro porque o registro de 13/08/2026 nomeou o carrinho laranja
-- como o primeiro cliente desta camada. Shopee entrou por ajuste do Jorge na
-- aprovação do plano: é canal-alvo declarado do produto desde o esboço, e
-- faltava.

insert into public.cta_library (id, canal, momento, texto_pt, hint, sort_order) values
  -- TikTok Shop
  ('tts_carrinho_laranja', 'tiktok_shop', 'cta',
   'Toca no carrinho laranja aqui embaixo',
   'O gesto mais direto da plataforma — funciona quando o produto está na loja e já foi mostrado', 10),
  ('tts_pouca_peca', 'tiktok_shop', 'cta',
   'Tá no carrinho da loja, corre que é pouca peça',
   'Escassez. Só use quando for verdade', 20),
  ('tts_cupom', 'tiktok_shop', 'cta',
   'Clica no carrinhozinho e vê o cupom',
   'Quando há desconto ativo — a curiosidade do cupom puxa o clique', 30),
  ('tts_preco_live', 'tiktok_shop', 'cta',
   'Link no carrinho — hoje sai pelo preço da live',
   'Preço por tempo limitado, para vídeo publicado no mesmo dia', 40),

  -- TikTok sem loja
  ('tk_parte2', 'tiktok', 'cta',
   'Segue pra parte 2',
   'Retenção em vez de venda — bom para o primeiro vídeo de uma série', 10),
  ('tk_comenta_euquero', 'tiktok', 'cta',
   'Comenta EU QUERO que eu te mando o link',
   'Comentário puxa alcance; o link vai no direct depois', 20),
  ('tk_salva', 'tiktok', 'cta',
   'Salva esse vídeo pra não perder',
   'Para conteúdo de referência — dica, medida, tabela', 30),

  -- Reels
  ('rl_comenta_link', 'reels', 'cta',
   'Comenta LINK que eu te chamo no direct',
   'O caminho clássico do Instagram quando não há link clicável na cena', 10),
  ('rl_salva', 'reels', 'cta',
   'Salva pra usar depois',
   'Salvamento pesa no alcance do Reels mais que o like', 20),
  ('rl_bio', 'reels', 'cta',
   'Link na bio, corre',
   'Só quando a bio realmente aponta para o produto do vídeo', 30),
  ('rl_compartilha', 'reels', 'cta',
   'Compartilha com quem precisa ver isso',
   'Compartilhamento em vez de venda — bom para conteúdo de utilidade', 40),

  -- Shorts
  ('sh_descricao', 'shorts', 'cta',
   'Link na descrição',
   'O caminho padrão do YouTube — direto, sem intermediário', 10),
  ('sh_inscreve', 'shorts', 'cta',
   'Se inscreve que tem vídeo completo no canal',
   'Quando o Short é recorte de um vídeo longo', 20),
  ('sh_like_parte2', 'shorts', 'cta',
   'Deixa o like se quiser a parte 2',
   'Engajamento condicionado — funciona em série', 30),

  -- Shopee
  ('sp_link_laranja', 'shopee', 'cta',
   'Tá no link laranja da Shopee aqui embaixo',
   'O equivalente do carrinho no vídeo de afiliado da Shopee', 10),
  ('sp_cupom', 'shopee', 'cta',
   'Cupom na loja — corre que é por tempo limitado',
   'Cupom é a moeda da Shopee; dizer o prazo aumenta o clique', 20),
  ('sp_carrinho', 'shopee', 'cta',
   'Clica no carrinho e garante o seu',
   'Genérico e seguro — serve quando não há cupom nem escassez para anunciar', 30)
on conflict (id) do nothing;
