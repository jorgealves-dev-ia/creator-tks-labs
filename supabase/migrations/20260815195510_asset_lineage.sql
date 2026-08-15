-- FRENTE STORYBOARD · Ciclo 1 (O Elo), Fase 1 — a linhagem de um quadro derivado.
--
-- Especificação: docs/decisoes.md (entrada de 15/08/2026, Frente Storyboard Ciclo 1).
--
-- ---------------------------------------------------------------------------
-- O que falta hoje, medido antes de escrever esta linha
-- ---------------------------------------------------------------------------
--
-- A tabela `assets` tem treze colunas e **nenhuma delas diz de onde um arquivo
-- veio**:
--
--   id · user_id · kind · source · storage_bucket · storage_path
--   mime_type · byte_size · width · height · duration_ms · created_at · label
--
-- Para tudo que existia até hoje isso bastava, porque a pergunta tinha resposta
-- em outro lugar: um asset gerado é apontado por `generations.result_asset_id`,
-- e um asset enviado não veio de lugar nenhum — alguém o subiu.
--
-- O quadro final de um vídeo é a primeira coisa deste produto que não é nem uma
-- nem outra. Ele nasce **dos pixels de outro asset nosso**, e sem uma coluna que
-- diga isso ele entra no acervo como uma imagem que apareceu sozinha.
--
-- ---------------------------------------------------------------------------
-- Por que NÃO é uma linha em `generations` — e isto é schema, não gosto
-- ---------------------------------------------------------------------------
--
-- A saída aparentemente barata seria registrar a extração como uma geração de
-- custo zero, e aí a linhagem sairia de graça pelo `result_asset_id`. Ela não
-- existe: `generations.provider` e `generations.model` são **NOT NULL**, e um
-- quadro derivado não tem provedor nem modelo. Não houve chamada, não houve
-- preço, não houve catálogo.
--
-- E mesmo que coubesse, ainda estaria errado pela regra ratificada em
-- 12/08/2026: **o número na tela conta o que a tela mostra.** O cartão do
-- projeto conta imagens geradas; um quadro recortado de um vídeo que já foi
-- contado seria a mesma imagem contada duas vezes.
--
-- **Quadro derivado é engenharia, não geração.** Não passa por `generations`,
-- não toca o ledger, não custa Spark. Storage é custo nosso e é desprezível.
--
-- ---------------------------------------------------------------------------
-- Duas perguntas, duas colunas — e por que `source` não muda
-- ---------------------------------------------------------------------------
--
-- A tentação era acrescentar `'derived'` ao enum `asset_source`. Foi recusada
-- com o custo na mão: o filtro da galeria oferece `todas / geradas / enviadas`,
-- e um terceiro valor cairia fora dos três — quem procurasse em "geradas" **não
-- acharia** o quadro do vídeo que ele mesmo gerou. Um filtro que esconde a coisa
-- de quem está procurando por ela é pior do que um enum impreciso.
--
-- O que resolve é separar as perguntas, porque elas sempre foram duas:
--
--   `source`                 quem pôs este arquivo aqui — a pessoa ou o sistema
--   `derived_from_asset_id`  de onde vieram estes pixels
--
-- O quadro é `source = 'generation'` porque foi o sistema que o produziu, e a
-- resposta precisa mora na coluna nova. Nenhuma cirurgia de enum, nenhuma
-- cirurgia de filtro, e o dado — não o rótulo — é o que identifica um derivado.
--
-- ---------------------------------------------------------------------------
-- `on delete set null`, e não `cascade`
-- ---------------------------------------------------------------------------
--
-- Precedente medido de `entities.cover_asset_id`, que já usa exatamente isto.
-- Apagar o vídeo **não pode** apagar o quadro: quando isso acontecer, o quadro
-- já é um cartão no canvas de alguém e possivelmente a semente de uma geração
-- paga. Perder a linhagem é uma perda de auditoria; perder o quadro é perder
-- trabalho — e entre as duas, a barata é a primeira.
--
-- (Hoje não existe caminho de produto para apagar um asset — está no backlog de
-- 11/08/2026. Esta coluna nasce preparada para o dia em que existir.)

alter table public.assets
  add column derived_from_asset_id uuid references public.assets (id) on delete set null,
  add column derived_from_ms integer;

comment on column public.assets.derived_from_asset_id is
  'De onde vieram os pixels, quando este arquivo foi calculado a partir de outro '
  'arquivo nosso — hoje, o quadro final de um vídeo. Nulo em tudo que foi enviado '
  'ou gerado por um provedor. Não substitui `source`, que responde outra pergunta: '
  'quem pôs o arquivo aqui, a pessoa ou o sistema. Um quadro derivado é '
  'source = generation e derived_from_asset_id preenchido ao mesmo tempo.';

comment on column public.assets.derived_from_ms is
  'Em que instante do vídeo de origem este quadro foi lido. Existe para o registro '
  'guardar um fato conferível — o quadro em 5042 ms — em vez de uma afirmação — o '
  'último quadro. E para o dia em que um recuo de N ms virar necessidade medida: '
  'nesse dia é uma linha de código, não uma migration.';

-- Um instante sem origem é impossível; uma origem sem instante, não.
--
-- A checagem vale numa direção só, de propósito. Todo quadro de vídeo conhece o
-- próprio milissegundo, então hoje as duas colunas andam juntas — mas nem toda
-- derivação futura é no tempo (um recorte de imagem tem origem e não tem
-- instante), e uma trava simétrica cobraria uma migration daquele dia por uma
-- regra que só vale para vídeo.
alter table public.assets
  add constraint assets_derived_ms_requires_origin
    check (derived_from_ms is null or derived_from_asset_id is not null);

alter table public.assets
  add constraint assets_derived_ms_non_negative
    check (derived_from_ms is null or derived_from_ms >= 0);

-- Nada é derivado de si mesmo. Barato de checar, e o estado que ele impede é o
-- tipo de laço que só se descobre quando alguém escreve a consulta que o segue.
alter table public.assets
  add constraint assets_derived_from_is_not_self
    check (derived_from_asset_id is null or derived_from_asset_id <> id);

-- Índice parcial, pela mesma razão de 20260807160000: sem ele, apagar o vídeo
-- força varredura sequencial em `assets` para aplicar o SET NULL. Parcial porque
-- a coluna é nula na esmagadora maioria das linhas — mesma forma de
-- `entities_cover_asset_id_idx`, que resolve o mesmo problema na mesma tabela.
create index assets_derived_from_asset_id_idx
  on public.assets (derived_from_asset_id)
  where derived_from_asset_id is not null;
