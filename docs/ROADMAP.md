# ROADMAP — o mapa vivo

> **O checklist que nunca existiu.** Quanto do esboço original existe, e em que ordem
> falta o resto para chegar a um **post publicado pelo sistema**.
>
> Lido do código e do banco em **16/09/2026**, não da memória. Onde este arquivo e o
> código discordarem, **o código vence** — e o arquivo se corrige no mesmo dia.
>
> Não substitui ninguém: [`ESTADO.md`](ESTADO.md) diz o que está provado e o próximo
> gesto; cada `plano-*.md` diz o detalhe da frente em curso; [`decisoes.md`](decisoes.md)
> diz o porquê. **Este responde o que nenhum dos três responde sozinho: onde estamos no
> mapa inteiro.**

---

## 0 · O número, primeiro

| | |
|---|---|
| **Esboço inicial — 15 itens** | **6 FEITOS · 7 PARCIAIS · 2 NÃO** (§2) |
| **Até o primeiro post publicado pelo sistema** | **5 frentes** (§4) |

As cinco: **o produto diz o que é → Modo Rápido → formatos IG + legenda → carrossel →
módulo Publicação.** MCP, voz, Catálogo aberto, Modo Take e o passe de UI/UX vêm depois —
nenhum deles é pré-requisito do primeiro post.

---

## 1 · Inventário do que existe

Cada linha diz onde vive. Código lido por `git grep`/`find`; banco lido pelo MCP Supabase,
somente leitura, no mesmo dia.

### 1.1 Nodes do canvas — 11 tipos

Registrados em `src/components/canvas/flow-canvas.tsx:50-62`.

| `type` | arquivo | o que é |
|---|---|---|
| `character` | `src/components/nodes/character-node.tsx` | o cartão do character sheet |
| `generator` | `src/components/nodes/generator-node.tsx` | **Gerar Imagem** — a anatomia normativa (invariante 12) |
| `video-generator` | `src/components/nodes/video-generator-node.tsx` | **Gerar Vídeo** — fal → Kling |
| `storyboard` | `src/components/nodes/storyboard-node.tsx` | o **Roteiro** (Ciclo 2) |
| `machine` | `src/components/nodes/machine-node.tsx` | a **Máquina** (Ciclo 3) |
| `result` | `src/components/nodes/result-node.tsx` | **Resultado** |
| `input-image` | `src/components/nodes/input-image-node.tsx` | Input · Imagem |
| `input-product` | `src/components/nodes/input-product-node.tsx` | Input · Produto — nome, até 5 fotos, instrução digitada |
| `input-pose` | `src/components/nodes/input-pose-node.tsx` | Input · Pose/Ângulo |
| `input-sheet` | `src/components/nodes/input-sheet-node.tsx` | Input · Character Sheet |
| `product` | `src/components/nodes/legacy-product-node.tsx` | **lápide** do cartão Produto do Arsenal: não lê nada, só existe para um grafo salvo antes de 10/08 não perder o cartão em silêncio |

Os quatro `input-*` são a prateleira de tipos da v1 ([`nodes-geracao.md`](nodes-geracao.md) §3.1).

### 1.2 Tipos de trabalho

| o quê | valores | onde vive |
|---|---|---|
| `job_kind` — o trabalho de **texto** | `roteiro` · `estruturar` · `cena` | `src/lib/storyboard/contract.ts:85`; preço em `ai_model_text_prices` |
| `media_kind` — o tipo da **geração** | `image` · `video` · `text` | enum do banco, coluna `generations.media_kind` |

Gerações `succeeded` no banco em 16/09: **48 imagens · 35 vídeos · 5 textos.**

### 1.3 Presets de formato — a proporção existe, o pixel do canal não

`src/config/format-presets.json` — **6 presets**, e **nenhum nomeia pixel**. O preset diz a
proporção; o modelo decide o tamanho (`resolveFormat` em `src/lib/generation/presets.ts:163`,
e o vocabulário `IMAGE_SIZES = 1K · 2K · 4K` em `:211`).

| preset | proporção | pixel que o esboço pede | pixel que **sai**, segundo o banco |
|---|---|---|---|
| `instagram_feed_retrato` *(padrão)* | 4:5 | 1080 × 1350 | **1856 × 2304** — Nano Banana 2, 2K (n = 1). Razão 0,806, não 0,800 |
| `quadrado` | 1:1 | 1080 × 1080 | não medido |
| `stories_reels_tiktok` | 9:16 | 1080 × 1920 | **1536 × 2752** — Nano Banana 2, 2K (n = 8). Razão 0,558, não 0,5625 |
| `youtube_thumbnail` | 16:9 | 1280 × 720 | não medido |
| `retrato_classico` | 3:4 | 1080 × 1440 (IG vertical) | não medido |
| `paisagem_classica` | 4:3 | — (não está no esboço) | não medido |

📌 **Dois achados, os dois medidos:**

1. **Nenhum arquivo sai no pixel do canal.** O 4:5 de 2K tem quase o dobro do lado do
   1080 × 1350 — e **nem é 4:5 exato**. Hoje nada redimensiona nem recorta para o canal.
   *A ferramenta já está em casa:* `sharp` é dependência declarada (`package.json:22`), usada
   pelas miniaturas em `src/lib/assets/thumbnail.ts`.
2. **O banco não sabe o pixel de quase nada:** `assets.width`/`height` estão preenchidos em
   **9 de 48** imagens e em **0 de 35** vídeos. *"não medido"* acima quer dizer isso — o dado
   não existe, não que ninguém olhou.

Fora do alcance de qualquer preset hoje: TikTok Shop, Pinterest, capa de perfil, banner de
canal, e os formatos de anúncio do YouTube e da Rede de Display que o esboço lista nas
páginas 7 a 10.

### 1.4 Catálogo de modelos — o que está no banco × o que tem adapter

**5 fornecedores** em `ai_providers`, **14 modelos** em `ai_models`. **Linha no catálogo não é
modelo usável** (invariante 2): quem decide é `src/lib/providers/registry.ts`, por fornecedor —
e só **três** têm adapter.

| capability | fornecedor | modelo | preço | adapter |
|---|---|---|---|---|
| `extraction` | Anthropic | Claude Haiku | 4 ⚡ | ✅ `anthropic.ts` |
| `extraction` | Anthropic | Claude Sonnet | 20 ⚡ | ✅ |
| `extraction` | Anthropic | Claude Opus | 30 ⚡ | ✅ |
| `extraction` | Google | Gemini 2.5 Flash | 4 ⚡ | ❌ `google.ts` não exporta extração |
| `extraction` | Google | Gemini 2.5 Pro | 10 ⚡ | ❌ |
| `extraction` | OpenAI | GPT-5 mini | 4 ⚡ | ❌ não existe `openai.ts` |
| `extraction` | OpenAI | GPT-5 | 10 ⚡ | ❌ |
| `extraction` | xAI | Grok 4 | 10 ⚡ | ❌ não existe `xai.ts` |
| `translation` | Anthropic | Claude Haiku | trabalho interno, sem cobrança | ✅ |
| `text_gen` | Google | Gemini 3.7 Flash | roteiro 15 ⚡ · estruturar 15 ⚡ · cena 5 ⚡ | ✅ `google.ts` |
| `image_gen` | Google | Nano Banana 2 (`gemini-3.1-flash-image`) | 1K 50 ⚡ · 2K 75 ⚡ · 4K 110 ⚡ | ✅ |
| `image_gen` | Google | Nano Banana Pro (`gemini-3-pro-image`) | 1K 100 ⚡ · 2K 100 ⚡ · 4K 180 ⚡ | ✅ |
| `image_gen` | OpenAI | GPT Image 2 | 125 ⚡ de base, **sem preço por tamanho** | ❌ «(em breve)» |
| `image_gen` | xAI | Grok Imagine | 55 ⚡ de base, **sem preço por tamanho** | ❌ «(em breve)» |
| `video_gen` | fal.ai | Kling 2.1 (image-to-video) | 5 s · 720p = 210 ⚡ (custo real R$ 1,54) — a única linha de `ai_model_video_prices` | ✅ `fal.ts` |

**O que isso quer dizer:**

- Dos **nove nomes** que o esboço queria poder escolher — Nano Banana, Grok, GPT, Sora, Claude,
  Kling, Seedance 2.0, Dreamina, Gemini —, **três produzem algo de fato**: Nano Banana desenha,
  Gemini escreve o roteiro, Kling anima. Claude lê a foto e traduz a ficha, mas não desenha nem
  anima. Grok e GPT estão só no catálogo. **Sora, Seedance 2.0 e Dreamina nem estão
  cadastrados.**
- ⚠️ **GPT Image 2 e Grok Imagine não são "só o adapter".** O bloco Gerar Imagem **sempre
  nomeia um tamanho** (`DEFAULT_IMAGE_SIZE = "2K"`, `presets.ts:224`), e `record_generation`
  **recusa** tamanho sem linha de preço (`GN005`,
  `supabase/migrations/20260816185559_text_generation_catalog.sql:486`). Os dois **não têm**
  linha em `ai_model_image_prices` — então cada um precisa de **adapter + migration** com o
  preço por tamanho.
- Google, OpenAI e xAI têm modelos de **extração** cadastrados, e **nenhum** tem adapter de
  extração: hoje só a Anthropic lê foto.

### 1.5 Templates de fluxo — um

| template | onde | o que faz |
|---|---|---|
| **«Fluxo de Storyboard»** | `addStoryboardMachine`, `src/lib/canvas/store.ts:1008` | Roteiro + Máquina, ligados e enquadrados, num clique — pelo menu lateral |
| *a metade de trás dele* | `attachStoryboardToMachine`, `store.ts:1035` | a Máquina vazia cria o Roteiro que falta, já ligado |

**Não é tipo de node novo:** são os blocos de sempre, montados como qualquer um montaria à mão.
**Não existe outro template** — nada de post, carrossel ou reel.

Os demais atalhos de montagem **não são templates**: criam a peça seguinte a partir de onde a
pessoa está — `addInputNode` (o «+» que cria um Input conectado, `store.ts:941`),
`addContinuation` («Continuar deste vídeo»: Input com o último quadro + Gerar Vídeo ligado,
`:959`), `addSceneBlock` (a cena do Roteiro vira bloco, `:987`) e `addChainedGenerator`
(«Usar como referência», `:1073`).

### 1.6 Superfícies — 5 páginas, e só uma cria

| rota | arquivo | o que é |
|---|---|---|
| `/login` | `src/app/login/page.tsx` | entrada |
| `/` | `src/app/(dashboard)/page.tsx` | o vestíbulo — escolher o projeto (desde 12/08; antes, `/` era o canvas) |
| `/galeria` | `src/app/(dashboard)/galeria/page.tsx` | o acervo |
| `/conta` | `src/app/(dashboard)/conta/page.tsx` | saldo e extrato |
| `/studio` | `src/app/studio/page.tsx` | **o canvas — a única superfície que cria** |

8 rotas de API (`src/app/api/**/route.ts`): `assets/thumbnails/backfill`,
`generations/canvas`, `generations/video`, `generations/video/reconcile`,
`generations/video/webhook-alive`, `storyboards/generate`, `storyboards/montar` e
`webhooks/fal`.

### 1.7 Banco e armazenamento

**21 tabelas, todas com RLS:** `profiles`, `wallets`, `projects`, `workflows`, `assets`,
`entities`, `entity_images`, `entity_versions`, `project_entities`, `generations`,
`ledger_transactions`, `extractions`, `ai_providers`, `ai_models`, `ai_model_image_prices`,
`ai_model_video_prices`, `ai_model_text_prices`, `storyboards`, `storyboard_scenes`,
`cta_library`, `asset_montage_parts`.

📌 **`cta_library`** (17 linhas) é um catálogo curado de chamadas para ação por canal, já usado
pela ficha de cena do Roteiro (`storyboard_scenes.cta_id`). **Peça pronta para a legenda da
frente 3.**

**Armazenamento:** um bucket, `assets`, **privado** (`public = false`, 50 MB por arquivo). A
tela recebe **URL assinada de 7 dias** (`TTL_SECONDS`, `src/lib/assets/signing.ts:77`). Acervo
em 16/09: **52 imagens geradas · 15 imagens enviadas · 37 vídeos.** *É o dado de partida do
ponto de arquitetura da Publicação (§3).*

### 1.8 O que não existe — e o que existe só como nome

**Zero código**, confirmado por busca vazia em `src/` e no `package.json`:

- **MCP server** — nenhuma rota, nenhuma dependência.
- **Módulo Publicação** — nenhuma tabela, nenhum código de conta social, Meta Graph API ou
  calendário. *(As duas ocorrências de «publicação» em `src/lib` são a publicação do Realtime.)*
- **Motion Control** — só a análise em [`notas-modo-take.md`](notas-modo-take.md).

**Existe só como nome**, sem nada que o use:

- **Voz** — `narrativa.voz` (`provider`, `voice_id`, `idioma`, `descricao`) e `estilo_de_fala`
  em `src/lib/character-sheet/schema.ts:318-344`, com o comentário *"configured in Phase 3"*.
  Nenhum fornecedor, adapter ou geração de fala. O enum `asset_kind` tem `audio`, e o acervo
  tem **zero** áudios.
- **Cena, roupa e acessório como entidade** — o enum `entity_kind` tem `scene`, `outfit` e
  `accessory` desde a fundação. `entities` só tem `character` (9) e `product` (1, arquivada), e
  nenhuma linha de `src/` cita os outros três.

---

## 2 · O escopo do Esboço inicial, item a item

Fonte: *Esboço inicial do projeto - Creator TKS Labs.pdf*, na pasta do projeto, **fora do
repositório**. Os 15 itens são os que o pedido de 16/09 enumerou.

| # | item | status | prova | o que falta |
|---|---|---|---|---|
| 1 | Imagens por canal e formato | **PARCIAL** | §1.3 · `generator` (§1.1) | o **pixel do canal** — nada sai em 1080 × 1350 —, e os formatos que o esboço lista e nenhum preset cobre: TikTok Shop, Pinterest, capas, banners, anúncios do YouTube e da Rede de Display |
| 2 | Escolha de modelo por tarefa | **PARCIAL** | §1.4 | 3 dos 9 nomes produzem; GPT Image 2 e Grok Imagine precisam de adapter **e** de preço por tamanho; Sora, Seedance 2.0 e Dreamina nem estão cadastrados |
| 3 | Saldo e uma unidade com nome próprio | **FEITO** | Spark ⚡ — `wallets` + `ledger_transactions` (append-only, com trava no banco); `CENTS_PER_SPARK` em `src/lib/sparks/index.ts:6` | — |
| 4 | Vídeos lifestyle | **PARCIAL** | `video-generator` (§1.1) · Kling 2.1 (§1.4) | a geração de vídeo é genérica — 1 modelo, 5 s, 720p. Nada de receita ou preset *lifestyle*, nem o "react, comparação, ranking" que o esboço dá como objetivo |
| 5 | Motion Control | **NÃO** | §1.8 | tudo |
| 6 | Lipsync — e a voz que ele pressupõe | **NÃO** | §1.8 | tudo: fornecedor de voz, identidade de voz na ficha, fala, sincronia labial. *A configuração de voz que o esboço pede no setup da influencer conta aqui, e não no item 7* |
| 7 | Influencer de IA com character sheet | **FEITO** | [`character-sheet.md`](character-sheet.md); as três camadas em `schema.ts` — DNA visual, padrões variáveis, narrativa (com relações, objetivos, medos, personalidade); extração por foto ou texto; versões congeladas em `entity_versions`; os **8 slots canônicos com receita** em `src/lib/prompt/canonical.ts:86-145` — folha completa (×2), turnaround (×4), expressões, paleta de cores | — *(a voz está no item 6)* |
| 8 | Storyboard cena a cena, com roteiro e narrativa | **FEITO** | Ciclo 2 — `storyboard` (§1.1), `storyboards` + `storyboard_scenes`; Ciclo 3 — a Máquina | — |
| 9 | Inputs de cena, produto, roupa e acessório | **PARCIAL** | §1.1 — Imagem, Produto, Pose/Ângulo, Character Sheet | os inputs que o esboço nomeia um a um: **Cena**, **roupa** (provador), **colar**, **anel** e **produto na mão**. Hoje tudo isso cai em «Produto» ou «Imagem» genéricos, e `scene`/`outfit`/`accessory` existem só como enum (§1.8). E a **extração da descrição do produto a partir da foto** — rótulo, embalagem, tamanho — não existe: a instrução do Input de Produto é digitada |
| 10 | `@` nos prompts | **PARCIAL** | invariantes 9 e 13 · `src/components/nodes/prompt-field.tsx` | o `@` resolve **personagem** com versão congelada. O esboço pedia mais: o `@` abrindo *"o que foi inserido no upload de referências e inputs antes, no mesmo fluxo"* — imagem, cenário, objeto, roupa. Isso não existe |
| 11 | Criativos de anúncio | **PARCIAL** | a imagem estática sai do `generator` | UGC ultra-realista e UGC + Motion Control não têm caminho próprio; nenhum formato de anúncio (item 1) |
| 12 | Comerciais de produto e de empresa | **PARCIAL** | Roteiro → Máquina → clipes → **um filme montado** (Ciclo 3 + mini-ciclo «O vídeo final») | não há um caminho próprio de "comercial": é montar Roteiro + Máquina à mão — e o produto ainda não diz o que é (frente 1) |
| 13 | Continuar o vídeo pelo último quadro | **FEITO** | Ciclo 1 da Frente Storyboard — `addContinuation` (§1.5), `src/lib/assets/last-frame.ts` | ⚠️ o **veredito humano do elo** segue não medido, com gatilho (ESTADO, «O que está PROVADO») |
| 14 | Canvas infinito com abas de projeto | **FEITO** | `studio.tsx` + `project-tab.tsx` — a bolinha pisca nos 4 estados de `project_status` (`idle` · `generating` · `generated` · `error`) | — |
| 15 | Sidebar recolhível com o arsenal | **FEITO** | `src/components/canvas/node-sidebar.tsx` — trilho recolhido que alarga com o ponteiro (`hover:w-64`) | — |

**6 FEITOS · 7 PARCIAIS · 2 NÃO.**

---

## 3 · A nova arquitetura — decisão do dono, 16/09/2026

**Um núcleo, três superfícies, um módulo.** Registrada, não implementada.

| peça | existe? | o que reaproveita do núcleo |
|---|---|---|
| **Núcleo** — adapters (`src/lib/providers/`), catálogo e preços, ledger de Sparks, compilador de prompt (`src/lib/prompt/`), character sheet, Roteiro e Máquina | ✅ | *é* o núcleo. Hoje ele tem uma porta só: o canvas |
| **Estúdio** — o canvas de nodes, `/studio` | ✅ | tudo |
| **Modo Rápido** — templates de post, carrossel e reel, rodando o mesmo motor **sem mostrar nós** | ❌ | adapters, catálogo, presets, ledger e compilador, **sem cópia**. O mecanismo é o do «Fluxo de Storyboard» (§1.5): o template monta o que uma pessoa montaria à mão — só que atrás de um formulário, e não num canvas |
| **MCP server** — o agente | ❌ | as mesmas ações de servidor que a tela chama; falta a autenticação de agente. ⚠️ **Um agente é um motorista novo:** as travas R1 e R2 do `CLAUDE.md` valem para ele desde o primeiro commit — o incidente de 29/08 foi um motorista repetindo sozinho |
| **Módulo Publicação** — contas sociais por projeto, fila do aprovado, calendário, Meta Graph API | ❌ | **só os assets.** Tabelas e RLS próprias, e **nunca escreve em `generations`** — `generations` é *"uma execução de modelo"* (o comentário da própria tabela) e só recebe escrita por `record_generation`, na mesma transação da cobrança. Publicar não executa modelo e não cobra |

### O ponto de arquitetura das URLs públicas

Pelo que se sabe da Graph API — **a confirmar na documentação oficial quando a frente abrir** —,
a Meta **busca** a mídia por uma URL pública no momento da publicação; ela não recebe o arquivo.
O nosso bucket é **privado**, e a URL que existe é **assinada por 7 dias** (§1.7). Com
calendário, o instante da busca pode cair **dias depois** da aprovação — e, passados 7, uma URL
assinada no agendamento chega morta.

**A decisão a tomar quando a frente abrir:** *onde* essa URL nasce — assinada no instante de
publicar, e não no de agendar? — e *quanto tempo* ela vive.

### O segredo novo

**Contas sociais por projeto são N tokens, e N tokens não cabem em variável de ambiente.** A
regra 1 de Segurança do `CLAUDE.md` põe segredo em `.env.local` e na Vercel; a invariante 11
proíbe chave em coluna. Um token da Meta por conta conectada vai precisar morar no banco,
cifrado — o Vault do Supabase é o candidato natural, *a confirmar*. **É uma exceção às regras
de Segurança, e exceção se registra antes do primeiro token**, não se descobre na
implementação.

---

## 4 · A fila — o caminho mais curto até um post publicado

**Decidida pelo dono em 16/09/2026. Substitui a ordem de 02/09** — A vídeo final → B Catálogo
aberto → C Modo Take → D Voz → E UI/UX → F Publicação —, que ainda está escrita em
[`produto.md`](produto.md) §7.1.

A marca ⚠️ quer dizer **dinheiro de provedor**: ali a metade do dono é obrigatória, e o pior
caso (R1) é escrito antes do clique — regra 8 do [`CLAUDE.md`](../CLAUDE.md). Sem a marca, a
frente fecha com prova estrutural + validação de tela.

| # | frente | tamanho | dinheiro de provedor? |
|---|---|---|---|
| 0 | **Este ROADMAP** | ✅ 16/09 | não — 0 ⚡ |
| **1** | **O produto diz o que é** — o item 1 aberto no ESTADO: o nome e a descrição do Input de Produto viram palavra no prompt | um dia | na parte estrutural, não. ⚠️ **Ver** a fidelidade custa uma imagem (75 ⚡) |
| **2** | **Modo Rápido — o primeiro template:** post estático com produto | um ciclo | ⚠️ sim — cada post é uma imagem paga |
| **3** | **Formatos IG 4:5 e 1:1 + node de legenda e hashtags** | um ciclo | ⚠️ sim, se a legenda sair do Gemini (§1.4). **As proporções já existem** (§1.3); o que falta é o **pixel do canal** — `sharp` já está em casa — e o banco saber o pixel. A `cta_library` está pronta (§1.7) |
| **4** | **Carrossel** — o texto por **template HTML, nunca pelo modelo** | um ciclo | ⚠️ sim nas imagens dos slides; o texto desenhado custa 0 ⚡ |
| **5** | **Módulo Publicação** — com o ponto das URLs públicas e o segredo novo (§3) | um ciclo, o maior | **não gasta Spark** — mas publicar é **público e irreversível**. ❓ A régua da regra 8 pergunta *"isto pode gastar?"*, e esta é a primeira frente em que a resposta é **não** e o gesto **ainda assim não tem volta**. **Pergunta para o dono quando a frente abrir:** a primeira publicação real é metade dele? *(E a confirmar: se a Meta exige revisão do app para publicar — um prazo que não é nosso.)* |
| 6 | **MCP** | um ciclo | ⚠️ sim — o agente dispara geração |
| 7 | **Voz** | um ciclo | ⚠️ sim — capacidade nova; o esboço e a Fase 3 do [`produto.md`](produto.md) citam a ElevenLabs |
| 8 | **Catálogo aberto** | um ciclo | ⚠️ sim — *"modelo novo = linha no catálogo + adaptador"* ([`produto.md`](produto.md) §7.1): cada adapter só se prova gerando no fornecedor novo |
| 9 | **Modo Take** | um ciclo | ⚠️ sim — é vídeo |
| 10 | **Passe de UI/UX** | um ciclo | não |

**De 1 a 5 é o caminho até o primeiro post publicado.** De 6 a 10 vem depois, e nenhuma delas é
pré-requisito das cinco primeiras.

---

## 5 · Notas de leitura

- **A lacuna mais barata do esboço fica na posição 8 — e isso é coerente com a régua.** GPT
  Image 2 e Grok Imagine já têm linha e preço-base (§1.4); falta adapter e preço por tamanho.
  Mas nenhum post precisa de um segundo fornecedor de imagem: o Nano Banana já desenha o post.
- **O Modo Rápido não é um sistema novo** — é o núcleo com outra porta. O precedente está no
  código (§1.5); falta tirá-lo de dentro do canvas.
- **A frente 3 é maior do que o nome dela.** "Formatos 4:5 e 1:1" soa como duas linhas no JSON,
  e as duas linhas já estão lá. O trabalho é o que o §1.3 mediu: o arquivo sair no pixel do
  canal, e o banco saber que pixel é esse.

---

## 6 · Como este arquivo se mantém

**É o mapa vivo.** Toda frente que fecha atualiza, **no mesmo commit do fechamento**, a linha
dela no §4, o status dos itens do §2 que ela mexeu e o número do §0. O ESTADO aponta para cá; o
plano da frente guarda o detalhe; este guarda o lugar no mapa.

**E ele se corrige quando erra.** A primeira versão, aprovada em 16/09, tinha afirmações erradas
que foram corrigidas antes do commit — a lista está em [`decisoes.md`](decisoes.md), 16/09/2026.
