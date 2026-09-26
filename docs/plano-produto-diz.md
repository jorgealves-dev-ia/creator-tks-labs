# Frente 1 — o produto diz o que é

> **Status:** ✅ **PLANO APROVADO em 26/09/2026** — escrito no mesmo dia a partir das decisões do
> dono de 21/09, e aprovado com as **cinco respostas do §9**. A 9.4 é **decisão do dono, contra a
> minha recomendação**: a lista de produto tem **padrão próprio**, decidido pela F0, e o Sonnet a
> 20 ⚡ **nunca** é o padrão dela.
>
> **Fase aberta: F0** — autorizada pelo dono em 26/09, com o plano (*"comece a F0"*).
>
> **Custo:** 0 ⚡ nas partes estruturais. **Pior caso R1 do percurso inteiro, registrado pelo dono
> em 26/09: 87 ⚡ de preço — 79 ⚡ da carteira** (uma leitura pelo botão + uma imagem, saldo
> 3.190 → 3.111) **+ 8 ⚡ de leituras fora do produto**, na F0 — somados no §7.
>
> **Onde fica no mapa:** frente 1 do [`ROADMAP.md`](ROADMAP.md) §4 — a primeira das cinco até
> o primeiro post publicado pelo sistema.

---

## 1. A promessa

> ## A foto do produto chega ao provedor acompanhada de palavras que dizem **o que é**, **os atributos** e **como se usa**.

**A A′ provou que a foto chega. Esta frente prova que ela chega com nome.**

Em 07/09 a foto da blusa (`06778db7`) entrou no payload como imagem 2, com duas diretivas de
fidelidade — e o modelo desenhou um **vestido**. O texto que foi ao provedor não tinha a
palavra *blouse* em lugar nenhum; tinha *hem* (barra) e *"da cabeça aos pés"*. A foto era a
única fonte da forma da peça, contra o vocabulário do próprio texto. → [`decisoes.md`](decisoes.md),
07/09/2026.

**E a casa já tinha deixado a porta aberta.** A decisão **N4**, de 09/08 ([`decisoes.md`](decisoes.md);
a redação da especificação está em [`nodes-geracao.md`](nodes-geracao.md) §2): *"nada de descrever
o produto em texto na v1 … o botão 'extrair descrição do produto' fica registrado como reforço
opcional futuro, para quando a consistência pedir."* **Em 07/09 a consistência pediu.**

---

## 2. A régua

**A blusa da foto aparece na imagem — com a mesma foto, a mesma cena e o mesmo modelo da A′.
A única coisa que muda é o texto do produto.**

| | A′ (07/09, `0cf3f069`) | F3 desta frente |
|---|---|---|
| foto | `06778db7` | a mesma |
| cena | cena 2 do «Projeto teste Foto da Blusa» (`62d41d8e`) | a mesma, conferida antes do clique |
| personagem | @luna v4, folha `2c88aadb` como imagem 1 | a mesma |
| modelo | Nano Banana 2 · 2K · 75 ⚡ | o mesmo |
| chave «Input Referências» | ligada | ligada |
| **o texto do produto** | *"Use the product shown in reference image 2, faithfully"* — e nada mais | **a descrição da peça, em inglês, no bloco do produto** |

**E o veredito se lê do banco, não da tela** — a lição da A′: a tela não distingue *"o texto
chegou e o modelo desobedeceu"* de *"o texto não chegou"*. O banco distingue, e é ele que diz
qual das condicionais da F3 vale (§6).

---

## 3. As decisões do dono — 21/09/2026

| # | decisão | onde ela mora aqui |
|---|---|---|
| 1 | **O Input de Produto ganha Nome e Descrição** — texto livre, grande. Três portas: o botão **«Ler a foto · N ⚡»**, com portão R1; **colar à mão** (uma página da Shopee, por exemplo); ou **editar o que a IA escreveu**. **O que está nos campos na hora de gerar é o que entra.** | F1 (o card) · F2 (o que entra) |
| 2 | **Seletor de modelo para a leitura**, listando do catálogo os modelos de capability `extraction` **que têm adapter** — o mesmo padrão do dropdown da Máquina. **A leitura por Gemini Flash entra nesta frente**, em `google.ts` (linha e preço já existem). **GPT e Grok ficam para a 1.5.** | F1 |
| 3 | **Sem taxonomia de categoria de uso.** A leitura devolve **texto livre, em português e em inglês**, com o que é, os atributos e como se usa; o compilador **cola a descrição em inglês na diretiva do produto**. O compilador continua função pura: **recebe texto, não decide.** | F0 (o contrato) · F2 (a colagem) |
| 4 | **A chave «Input Referências» continua mandando:** desligada, nada entra. | F2 |
| 5 | **As fases e o dinheiro:** F0 medir → F1 → F2 → F3, prova viva obrigatória. Pior caso 79 ⚡ mais as leituras da F0. Condicional escrita: **se a F3 falhar com o texto certo no payload → frente 1.5 (GPT Image 2).** | §6 · §7 |

### 3.1 · Como isto conversa com o que já estava decidido

- **«Nome não é foto» (03/09) continua de pé — e é a decisão 4 que o garante.** A doença de
  03/09 era o nome **no lugar** da foto. Aqui as palavras viajam **dentro** da referência do
  produto: se a foto não entra, as palavras também não. **Com a foto, nunca em vez dela.**
- **A N4 é revista em parte.** *"O modelo vê a foto real"* fica; *"nada de texto na v1"* cai.
  Registrado em [`decisoes.md`](decisoes.md), 21/09/2026.
- **Sem taxonomia não esbarra na invariante 10.** O dicionário literal é a regra da compilação
  do character sheet. A descrição é campo livre, como a cena do prompt, e segue o caminho da
  invariante 4: **o português é traduzido pela rota, antes do compilador** — o próprio
  `canvas.ts:32-35` diz que *"the Portuguese arrives already translated"*.
- **A invariante 11 vale para o card.** A leitura é uma extração — capability `extraction`,
  gravada em `extractions` —, então **só preenche campo vazio**, e **o preço vem do catálogo,
  nunca de quem chama**.

---

## 4. O que a investigação achou — 26/09/2026

0 ⚡. Código lido no `master` (`d5036e3`); banco lido pelo MCP, somente leitura.

### 4.1 · O ponto de partida, medido no banco

`0cf3f069`, a imagem do vestido:

| o que | valor |
|---|---|
| texto enviado ao provedor | **1.557 caracteres** |
| ocorrências de *blouse* | **0** |
| ocorrências de *dress* | **0** |
| *hem* (barra) | **presente**, na posição 1.093 — da ação da cena: *"She adjusts the hem of the piece …"* |
| a diretiva do produto | *"Use the product shown in reference image 2, faithfully"* — `instrucao_pt: ""`, `instrucao_en: ""` |
| o nome do card | *"blusa-azul-de-linho-manga-curta"*, em `grupo.rotulo` — **metadado de auditoria, fora do texto** |

**O controle está intacto** (lido em 26/09):

- o card `63989469` tem `nome` e 1 foto, e **nenhuma chave `instrucao`**;
- a Máquina `060bc765` tem a referência sincronizada, `referencesEnabled: true`, e modelo e
  tamanho nos padrões (Nano Banana 2 · 2K);
- a ficha da cena 2 **não foi tocada desde 07/09** (`updated_at` às 13:43 UTC; a geração é das
  13:56 UTC),
  diz *"ajusta a barra da peça"* e tem **`produto: null`** — **nenhuma palavra da ficha diz o
  que a peça é**;
- a @luna ativa continua a **v4**, de 11/08;
- **saldo: 3.190 ⚡, sem nenhum lançamento desde 07/09.**

### 4.2 · O card já tem dois campos de texto — e o segundo já era "a descrição"

`input-product-node.tsx:43-48`: `nome` (até 120 caracteres, `:156`) e `instrucao` — **uma
linha**, até 400 (`:234`), com o placeholder *"a modelo veste esta peça exatamente como
mostrada"* (`pt-BR.ts:894`). O diário de 07/09 já chamava esse campo de **"a descrição do
card"**: *"é o campo desenhado justamente para dizer 'blusa de linho, manga curta, comprimento na
cintura'"*.

**O caminho dele já existe inteiro.** A rota traduz a instrução da **primeira** foto de cada
produto (`canvas-generate.ts:454`), recusa **antes de qualquer Spark** se a tradução falhar
(`:468` e `:476`), e o compilador a cola em `Use {sujeito}, {instrução}` (`canvas.ts:474`).
**E o nome não entra, de propósito:** `grupoRotulo` é *"Never shown to the model"*
(`canvas.ts:78`).

→ perguntas 9.1 (a Instrução vira a Descrição?) e 9.2 (o Nome entra no texto?).

### 4.3 · A decisão 4 já é cumprida pela rota — basta a descrição morar dentro da referência

`canvas-generate.ts:403`:

```ts
const heard = request.referencesEnabled ? request.references : [];
```

Com a chave desligada, as referências **não viajam, não são traduzidas, não são numeradas e não
são pagas** — e ficam gravadas em `referencias_mudas`. **Se a descrição viajar dentro da
referência do produto, a chave a cala sem uma linha nova.** É o desenho da F2, e esta é a razão
de ele ser esse.

### 4.4 · 🚩 O adapter é registrado por FORNECEDOR — e a ficha de personagem lê o mesmo catálogo

`registry.ts:28`: o mapa de extração é chaveado pelo slug do **fornecedor**, e o status
*"usável"* também (`extractionProviderStatus`, `:165`). O seletor da ficha de personagem
(`ExtractionPanel`) e o da leitura de produto leriam **o mesmo** `loadCatalog(supabase, "extraction")`.

**Ligar o Google para ler produto, do jeito mais curto, faz duas coisas que ninguém pediu:**

1. **acende o Gemini na extração de PERSONAGEM** — wizard e aba DNA —, com o contrato grande de
   listas fechadas que nunca rodou num Gemini, **cobrando Sparks**;
2. **acende o Flash (4 ⚡) e o Pro (10 ⚡) juntos** — o registro não distingue modelo.

**O desenho proposto:** um mapa próprio para a leitura de produto (Anthropic + Google), ao lado do
de personagem (só Anthropic), com status e leitor de catálogo próprios — a mesma coluna de preço,
outra resposta para *"quem pode ler isto"*. **A ficha de personagem não muda um byte.** → pergunta 9.3.

### 4.5 · 🚩 O modelo padrão de extração é o Sonnet — a 20 ⚡

| modelo (`extraction`) | ⚡ | padrão? | adapter |
|---|---|---|---|
| Claude Sonnet (`claude-sonnet-5`) | **20** | **✅** | ✅ |
| Claude Opus (`claude-opus-5`) | 30 | | ✅ |
| Claude Haiku (`claude-haiku-4-5`) | **4** | | ✅ |
| Gemini 2.5 Pro (`gemini-2.5-pro`) | 10 | | ❌ → ✅ nesta frente |
| Gemini 2.5 Flash (`gemini-2.5-flash`) | **4** | | ❌ → ✅ nesta frente |
| GPT-5 · GPT-5 mini · Grok 4 | 10 · 4 · 10 | | ❌ — frente 1.5 |

*Lido do catálogo em 26/09.* O seletor abre no padrão (`defaultModelId`, `model-select.tsx:126`) —
então, sem decisão, **o botão nasce dizendo «Ler a foto · 20 ⚡»**, e os dois de 4 ⚡ que a F0 mede
ficam a um clique de distância. E `is_default` é **um só por capability**, compartilhado com a
ficha: mudar no catálogo o padrão da leitura de produto muda o da personagem junto. → pergunta 9.4.

### 4.6 · 🚩 `extractions` só sabe gravar PERSONAGEM — a F1 tem migration

| onde | o que trava |
|---|---|
| `extractions.entity_id` | `NOT NULL`, FK para `entities` (`20260808184059_ai_catalog_and_extractions.sql:120`) |
| `record_extraction` | sem personagem, recusa com `EX002` *"character not found for this user"* (`:299`) |
| o extrato | a linha nasce *"Extração de personagem @…"* (`:365`) |

**Produto é card de canvas desde 10/08 — não existe linha em `entities` para apontar.** Gravar a
leitura em `extractions`, como a decisão pede, exige migration — **aplicada pelo Jorge**, como
toda escrita no banco.

### 4.7 · O custo real do Gemini não está tabelado

`pricing.ts:36-41` conhece três preços por token, **todos Claude**. Uma leitura por Gemini gravaria
`real_cost_cents` **nulo** — contra a E2, que existe para que toda extração registre o custo real
que calibra o preço. A F1 acrescenta o Flash e o Pro, com o preço **lido na página oficial do
Google no dia**.

### 4.8 · O Gemini 2.5 nunca foi chamado nesta casa

As duas linhas nasceram em 08/08, **apagadas** (`20260808184059_…sql:494-495`), e nenhum adapter as
serviu desde então. `gemini-2.5-flash` é um identificador de meados de 2025. **A F0 é a primeira
chamada real a ele** — e é ela que diz se o identificador ainda responde.

### 4.9 · O que já está pronto e não precisa mudar

| peça | onde | por que serve |
|---|---|---|
| a instrução de foto do adapter Anthropic | `anthropic.ts:320` | genérica — *"preencha o formulário conforme as regras do sistema"*: o contrato mora no prompt de sistema, e a leitura de produto passa por ela sem mudança |
| JSON por schema no Google | `google.ts:189-200` | o adaptador de texto já pede `application/json` com schema pelo `interactions.create`; a leitura é o mesmo pedido com uma imagem na entrada |
| o teto de tempo | `studio/page.tsx:34` | `maxDuration = 60` — uma leitura leva segundos |
| o ↻ de uma cena | `machine-node.tsx:550` | **um** pedido (`confirmarRepeticao` → `pedirCena`), **fora do motorista de lote** |
| o leitor do histórico | `prompt-structure.ts:26` | `z.object`, que ignora chave nova — uma linha de 07/09 continua lendo |
| o extrato | `sparks/ledger.ts:69-70` | lê só `description` — uma leitura sem personagem não quebra a tela |

### 4.10 · Os tetos que um texto colado encontra

| teto | valor | onde |
|---|---|---|
| a instrução, no card | 400 caracteres | `input-product-node.tsx:234` |
| a instrução, na rota | 400 caracteres | `canvas-generate.ts:98` |
| o prompt do bloco, na rota | 2.000 caracteres | `canvas-generate.ts:128` |
| a saída do tradutor, por lote | 2.000 tokens | `anthropic.ts:203` |

**Uma página da Shopee não cabe em 400.** A F1 sobe o teto da descrição para **2.000 caracteres** —
o mesmo do prompt do bloco —, e no pior caso os dois juntos dão da ordem de 1.000 a 1.200 tokens em
inglês *(estimativa, a ~4 caracteres por token)*: cabe na saída do tradutor. Se um dia não couber, a
falha é a que já existe — `translation_failed`, **antes de qualquer Spark**.

---

## 5. O que esta frente NÃO faz

1. **Não cria taxonomia** (decisão 3).
2. **Não liga GPT nem Grok** — frente 1.5 (decisão 2).
3. **Não liga o Gemini na ficha de personagem** (resposta 9.3).
4. **Não lê mais de uma foto.** A leitura lê **a primeira foto do card** — a que fala pelo grupo no
   prompt. É a v1 da própria especificação (*"v1 é 1 foto"*, [`motor-extracao.md`](motor-extracao.md)
   §6), e o preço de catálogo é **por leitura**, não por foto: cinco fotos a 4 ⚡ pagariam cinco vezes
   os tokens de imagem pelo mesmo preço.
5. **Não sobrescreve texto** (invariante 11). Campo cheio fica como está.
6. **Não muda preço nenhum.** 4 ⚡ é o que o catálogo diz; calibrar é o trabalho da E2, depois, com o
   custo real na mão.
7. **Não mexe no Roteiro.** A ficha da cena 2 continua dizendo *"a barra da peça"* — **de
   propósito**: é o controle da F3. Se a blusa aparecer com *hem* no texto, a descrição venceu o
   vocabulário; se não aparecer, o *hem* vira suspeito, e a pergunta seguinte é do Roteiro.
8. **Não mexe no motorista de lote, nem em vídeo.** O clipe herda a imagem.

---

## 6. As fases

| ordem | fase | entrega | ⚡ | status |
|---|---|---|---|---|
| 1ª | **F0** | o que o compilador envia hoje; o que Haiku e Gemini leem da foto da blusa — **e o padrão da lista de produto** | 0 ⚡ + ⚠️ **8 ⚡ fora do produto** | 🔵 **aberta** |
| 2ª | **F1** | o card, o botão, o seletor e a leitura gravada — **com migration** | ⚠️ **4 ⚡**, a leitura do dono | ⬜ |
| 3ª | **F2** | o compilador cola a descrição | 0 ⚡ | ⬜ |
| 4ª | **F3** | a prova viva: a blusa aparece | ⚠️ **75 ⚡** | ⬜ |

### F0 · Medir antes de construir

**Duas metades, e só a segunda tem dinheiro.**

**(a) O que o compilador envia hoje — 0 ⚡.** O harness remonta a geração de `0cf3f069` com as
entradas gravadas nela — a ficha da cena 2, o card, a @luna v4 e a cena **já traduzida** que a
linha guarda, para o resultado não depender de uma tradução nova — e compara com o texto do banco
**byte a byte**. Igual: o harness fala pela produção, e o texto de hoje vira a linha de base da F2.
Diferente: o código mudou desde 07/09, e isso é achado.

**(b) O que Haiku e Gemini leem da foto — ⚠️ 8 ⚡, com o ok do dono dado em 26/09** (a aprovação
do plano, com o pior caso registrado, e *"comece a F0"*). Uma chamada a cada
um, com a foto `06778db7` — **o mesmo arquivo** que foi ao provedor em 07/09, md5 na evidência — e
o **contrato de leitura que a F1 vai usar**, em rascunho:

> **O que a leitura pede.** Só JSON: `nome` (curto, em português, como um vendedor chamaria a
> peça), `descricao_pt` e `descricao_en` — a mesma coisa nas duas línguas, até ~600 caracteres
> cada, o inglês começando pelo que o produto é. Descrever **o produto**: o que é, os atributos
> visíveis (cor, material, corte, comprimento, manga, gola, estampa, acabamento) e como se usa ou
> se veste. **Nunca a pessoa** que o veste ou segura, e **nunca identificar ninguém** — a mesma
> regra da extração de personagem ([`motor-extracao.md`](motor-extracao.md) §4.2). **Não inventar
> o que não se vê** — marca, composição, tamanho: o que a foto não mostra, a leitura não diz.

> **R1, escrito antes:** *se tudo der errado, custa no máximo **8 ⚡** — 4 + 4, preço de
> catálogo — e **zero Spark sai da carteira**: a F0 roda fora do produto, com chave nossa, como a
> Fase 0 do Ciclo 2 (47 chamadas, R$ 1,34, zero Spark). O que sai é custo real de provedor, e ele
> vai para a evidência, por chamada.*
>
> Uma chamada por modelo. O SDK da Anthropic pode repetir **uma vez** uma chamada que **falhou**
> (`anthropic.ts:48`) — é o adapter de produção, e medir por ele é o ponto.

**O que a F0 registra, por leitura:** o JSON inteiro; tokens de entrada e de saída — no Gemini 2.5
Flash, que **pensa por padrão**, o pensamento é token de saída pago, e ele entra na conta —;
latência; custo real em centavos; o tamanho do pt e do en; e o **gabarito pré-registrado**:

| a leitura acerta se… | |
|---|---|
| diz que é **blusa** — *blouse*, *top* —, e não vestido | obrigatório |
| diz a **cor** e a **manga curta** | obrigatório |
| diz o **material** | se visível |
| **não descreve a pessoa**, e não nomeia marca que não aparece | obrigatório |

**O que a F0 decide:**

| pergunta | quem |
|---|---|
| **o padrão da lista de produto** — o que ler melhor a foto da blusa, entre Haiku e Gemini Flash, os dois a 4 ⚡ (resposta 9.4). É ele que a F1 grava no catálogo e que o dono usa na leitura dele | **dono**, com os dois JSONs ao lado da foto |
| o contrato muda antes da F1? | Claude propõe, dono aprova |
| o `gemini-2.5-flash` responde? | fato. Se não: **pergunta de catálogo ao dono** — migration com o identificador vigente e o preço conferido; **nunca código** |
| o Gemini precisa de teto de pensamento no adapter? | Claude, com o número de tokens na mão |
| o custo real cabe nos 4 ⚡? | nota de calibração (E2) — **não muda preço nesta frente** |

**Evidência:** `scratchpad\evidencias\produto-diz-f0\` — `texto-de-hoje-0cf3f069.md`,
`leitura-haiku.json`, `leitura-gemini-flash.json`, `numeros-f0.md`.

### F1 · O card, o botão, o seletor e a leitura gravada

**⚠️ Tem dinheiro:** nasce um **portão que autoriza gasto** e um **caminho que cobra**. A etapa fica
**aberta e não commitada** até a leitura do dono.

**Entrega:**

1. **A migration — no padrão RAISE EXCEPTION da casa, e aplicada pelo Jorge** (pedido do dono,
   26/09). `extractions` aprende produto:
   - `subject` — `character` | `product`, com `character` de padrão: as **8 linhas** que existem
     continuam o que são;
   - `entity_id` deixa de ser obrigatório;
   - `project_id` (FK `projects`, `ON DELETE SET NULL` — a regra de `generations.project_id`) e
     `node_id` (o id do card no grafo, como `generations.node_id`);
   - `reading` — o texto que a IA escreveu (`nome`, `descricao_pt`, `descricao_en`), **na própria
     linha**: meses depois, ela responde *"o que a IA escreveu?"* do mesmo jeito que
     `reference_asset_id` responde *"o que ela leu?"*;
   - **a trava no banco:** leitura de personagem **exige** personagem; leitura de produto **não tem**
     personagem e **tem** card.

   **E o catálogo ganha o padrão da lista de produto** (resposta 9.4): uma marca própria em
   `ai_models`, **separada do `is_default`** — que continua sendo o da ficha de personagem, o
   Sonnet —, com **no máximo um** modelo marcado e **só** modelo de `extraction`. O valor é o
   vencedor da F0.

   **O padrão RAISE EXCEPTION, nas três camadas em que a casa já o usa:**
   - **a função recusa com frase e código** — `raise exception '…' using errcode = 'EX00N'`, como
     `record_extraction` e `record_montage`: cada recusa vira uma frase na tela, e nenhuma vira
     *"erro inesperado"*;
   - **o que um CHECK não alcança vira trigger que recusa** — como *"video prices belong to models
     with the video_gen capability"* (`20260813170000_fal_video_catalog.sql:172`): marcar como padrão
     de produto um modelo sem `extraction` é recusado pelo banco, não lembrado pelo app;
   - **e a migration confere o que vai instalar e o que instalou:** levanta exceção — e o `db push`
     para ali, dizendo por quê — se o padrão da lista de produto não for **exatamente um** modelo,
     de `extraction`, a **4 ⚡**, ou **se for o Sonnet**. *"Sonnet nunca é padrão para produto"* deixa
     de ser frase e vira condição para a migration existir.

   Depois de aplicada: `database.types.ts` **regerado do banco** (regra 2) e o modelo de dados de
   [`arquitetura.md`](arquitetura.md) §4 atualizado.
2. **`record_product_reading` — a única porta da leitura de produto.** `record_extraction` fica
   **intocada**: o caminho da personagem continua o mesmo, byte a byte. A nova segue a mesma ordem:
   sessão; **o projeto é do usuário** (código novo, `EX004`); **a foto é do usuário** — `security
   definer` não tem RLS para conferir por ela; o modelo está ligado e tem `extraction` (`EX003`);
   **preço lido de `extraction_sparks`**, nunca recebido; falha **grátis** (a trava
   `extractions_failed_is_free` já existe); débito com `extraction_id`, e o extrato dizendo
   *"Leitura de produto · {nome}"*.
3. **O registro separado** (§4.4): mapa de leitura de produto — Anthropic + Google —, com status e
   leitor de catálogo próprios. **A extração de personagem não muda.**
4. **`google.ts` aprende a ler:** foto + contrato → objeto JSON, pelo mesmo `interactions.create`, o
   mesmo `toProviderError` e **sem retentativa** (`NO_RETRIES`). A forma da chamada vem do probe da
   F0, e não da documentação — o precedente é o do adaptador de texto, *"a que fez as 47 chamadas
   reais da Fase 0"*.
5. **`pricing.ts`** ganha o Gemini 2.5 Flash e o 2.5 Pro (§4.7).
6. **A ação da leitura.** O navegador **nomeia** projeto, card, foto e modelo; o servidor **decide**
   tudo o que custa: o preço do catálogo, o dono da foto, **o saldo antes da chamada**, a chamada, o
   **Zod na resposta** (`nome` até 120 caracteres, cada descrição até 2.000, nada vazio — o que não
   passa é falha, **e falha é grátis**) e **uma** chamada à função que grava e cobra. Devolve o
   texto, o id da leitura, o cobrado e o saldo.
7. **O card: Nome · Fotos · Descrição · seletor · «Ler a foto · N ⚡».** **A Instrução vira a
   Descrição** (resposta 9.1): um campo só, maior, e os cards antigos mantêm o texto que tinham,
   agora sob o nome novo. A Descrição é caixa grande,
   com contador (`N / 2.000`) e as classes `nodrag nowheel` — **sem o `nowheel`, rolar a descrição dá
   zoom no canvas**: é o defeito (a) de 07/09, que o diálogo de cena teve e os outros `<dialog>`
   ainda têm. O seletor é o **`ModelSelect`** da Máquina: lista o catálogo de `extraction`, e **só
   é selecionável quem tem adapter e chave** — OpenAI e xAI aparecem apagados, «(em breve)», do
   jeito que o GPT Image 2 e o Grok Imagine aparecem hoje no dropdown da Máquina. **Ele abre no
   padrão da lista de produto** — o vencedor da F0, a 4 ⚡; **nunca no Sonnet** (resposta 9.4) —, e o
   card **lembra o modelo** da última leitura, como a Máquina lembra o dela em `data.modelId`.
8. **Só no vazio** (invariante 11), numa função pura com tabela-verdade:

   | Nome | Descrição | a leitura… |
   |---|---|---|
   | vazio | vazia | preenche os dois — *"2 preenchidos"* |
   | cheio | vazia | preenche a descrição — *"1 preenchido · 1 preservado"* |
   | vazio | cheia | preenche o nome — *"1 preenchido · 1 preservado"* |
   | cheio | cheia | **não existe como clique:** o botão fica desligado, dizendo *"nada em branco para a leitura preencher — apague o que quiser que ela escreva"* |

   **A última linha é a do dinheiro:** uma leitura que não pode escrever nada é uma leitura paga por
   nada.

**Os estados do botão, cada um com frase própria:** sem foto (desligado, dizendo por quê) · campos
cheios (a linha acima) · lendo (desligado do clique à resposta — **um clique, no máximo uma
chamada**) · sem saldo (recusa **antes**, dizendo quanto falta) · depois (o cobrado, o saldo e o
placar).

**Provas estruturais — 0 ⚡:**

| # | o que prova | como |
|---|---|---|
| F1.1 | as travas do banco — **as três camadas do RAISE EXCEPTION**, cada uma recusando o caso errado e aceitando o certo | script de asserções em `BEGIN … ROLLBACK` — **nada fica gravado** —, escrito pelo Claude e rodado pelo Jorge no SQL Editor: leitura de produto com personagem → recusada; padrão de produto num modelo sem `extraction` → recusado; a conferência da migration contra um catálogo com o Sonnet marcado → **exceção**, e contra o certo → passa. Depois, o MCP lê as travas instaladas |
| F1.2 | **vermelho→verde do registro e do padrão** | hoje o Google é `no_adapter` nos dois seletores; depois, **pronto na leitura de produto e `no_adapter` na de personagem**. E o padrão: a lista de produto abre no **vencedor da F0**; a de personagem continua no **Sonnet** |
| F1.3 | a ordem da ação | provedor falso, sem rede: saldo antes da chamada; recusa e falha gravadas a 0 ⚡; sucesso = **uma** chamada à função; preço do catálogo **mesmo que o navegador mande outro número**; foto de outro usuário recusada |
| F1.4 | um clique, uma chamada | dois cliques seguidos → o contador do provedor falso marca **1** |
| F1.5 | só no vazio | a tabela acima, linha a linha |
| F1.6 | a tela | sem foto, campos cheios, o seletor (Google pronto; OpenAI e xAI «(em breve)»), **o botão nascendo em «Ler a foto · 4 ⚡»** e o preço acompanhando o modelo escolhido — lidos do DOM pelo `medir-canvas.js` |

**A metade do dono — ⚠️ 4 ⚡:** **uma** leitura pelo botão, no card da blusa, com o padrão da lista
de produto — o vencedor da F0.

> **R1:** *uma leitura custa no máximo **4 ⚡**. Se o botão não disser «Ler a foto · 4 ⚡», o clique
> não acontece.*

**Conferido pelo banco, não pela tela:** uma linha em `extractions` (`subject = product`,
`succeeded`, `sparks_charged = 4`, `reference_asset_id = 06778db7…`, `node_id = 63989469…`);
**um** lançamento de −4 com `extraction_id`; saldo **3.190 → 3.186**; e o card com a **Descrição
preenchida** e o **Nome preservado** — ele já diz *"blusa-azul-de-linho-manga-curta"*. Os estados
*lendo* e *depois* se veem aqui, na tela do dono.

### F2 · O compilador cola a descrição

**0 ⚡, e o porquê do zero precisa ser dito:** a F2 muda **o texto** que vai ao provedor e não muda
**preço, portão, nem quantas requisições saem**. A tradução da descrição, quando houver, viaja **no
mesmo lote** de tradução que a cena já usa — uma chamada, não duas. A regra 8 põe *"compilação,
texto"* do lado de fora da zona de dinheiro com todas as letras, e o critério dela — *"isto pode
gastar?"* — responde que não: sela com prova estrutural + validação de tela e **vai para produção no
mesmo dia**.

**Entrega:**

1. **A descrição mora dentro da referência do produto** — `inputReferences` (`store.ts:308`) → o
   corpo do pedido → a rota (Zod: até 2.000 caracteres; o id da leitura, opcional). O fio vivo leva
   as edições a todo bloco conectado, como já leva a instrução.
2. **A rota decide o inglês, antes do compilador:**

   | o português do card… | o inglês que entra | gravado como |
   |---|---|---|
   | é **idêntico** ao da leitura — conferido **na linha de `extractions`**, pelo id | o da leitura | `descricao_origem: "leitura"` |
   | foi editado, colado, ou não há leitura | a tradução do que **está** no campo, pelo `translateItems` de sempre | `descricao_origem: "traducao"` |

   **O navegador nunca manda inglês:** ele nomeia a leitura, e o servidor lê o texto dela. É a
   divisão de 10/08 — *pode nomear, nunca alargar* —, e é o que faz *"o que está nos campos na hora
   de gerar é o que entra"* continuar verdade depois de uma edição. Leitura de outro usuário, ou
   falhada, é ignorada — e o texto é traduzido.
3. **O compilador cola — e continua puro: recebe texto.** A descrição entra **só na primeira foto**
   do produto (*um produto fala uma vez*, §6 regra 6 de [`nodes-geracao.md`](nodes-geracao.md)), e é
   gravada **por campo** (invariante 13): `descricao_pt`, `descricao_en`, `descricao_origem`. A forma
   proposta, com o bloco do produto na ordem em que ele se lê — **identificar, descrever, usar, não
   alterar**:

   > *Product in reference image 2: a short-sleeve blouse in light blue linen, …*
   > *Use the product shown in reference image 2, faithfully.*
   > *Reproduce the exact product shown in reference image 2 — same colors, pattern, materials and details, without alteration.*

   **Um rótulo com dois-pontos, e não uma aposição**, porque a descrição chega por três portas: a
   leitura começa pelo que o produto é, mas um texto colado da Shopee pode começar por *"Perfeita
   para o verão!"* — e *"Use the product …, Perfect for summer!"* é uma frase quebrada, enquanto
   *"Product in reference image 2: Perfect for summer! …"* continua sendo um rótulo seguido de
   conteúdo. **A frase final é decisão da F2, com data E hora no diário** — a condição da resposta
   8.3 da A′, porque o compilador continua sem carimbo de versão.
4. **O Nome entra só quando a Descrição está vazia** (resposta 9.2), pelo mesmo caminho — traduzido
   pela rota, colado no mesmo lugar. Com Descrição, o nome fica de fora: ela já começa pelo que o
   produto é.
5. **O «Ver prompt» e o leitor do histórico** mostram o par — *Descrição: pt → en* — e dizem a
   origem.

**Provas estruturais — 0 ⚡:**

| # | o que prova | como |
|---|---|---|
| F2.1 | **vermelho→verde** | o card da blusa com a descrição da F1: o bloco do produto a carrega **uma vez**, ligada à imagem 2. Com o código de hoje: o texto da F0, sem ela |
| F2.2 | **a chave manda** (decisão 4) | chave desligada: nenhuma descrição no texto, **zero** itens de descrição no tradutor falso, `referencias_mudas` gravado |
| F2.3 | um produto fala uma vez | 3 fotos → a descrição aparece **uma** vez |
| F2.4 | a origem | pt igual ao da leitura → o inglês da leitura, **zero** itens traduzidos; pt editado → **um** item, `traducao`; id de leitura alheia ou falhada → ignorado |
| F2.5 | as invariantes vizinhas | cena 2: `traje_canonico === null` e `regra_diretor === "prompt_dirige"` (13); a chave continua nascendo desligada (12) |
| F2.6 | o histórico velho | o `prompt_compiled` de `0cf3f069` ainda lê, com os campos novos nulos |
| F2.7 | **a previsão da F3** | o bloco do produto que a F3 vai mandar, escrito na evidência **antes do clique**. *O bloco do produto, e não o texto inteiro: a cena é traduzida de novo a cada geração e pode variar; o inglês da leitura, não* |
| F2.8 | o Nome (resposta 9.2) | Descrição cheia → **só ela** entra; Descrição vazia e Nome cheio → **o nome** entra; os dois vazios → *"Use the product shown in reference image 2, faithfully"*, **byte a byte o de hoje** |

**Tela — 0 ⚡:** o «Ver prompt» de `0cf3f069`, aberto no canvas de verdade, continua lendo com o
leitor novo — lido do DOM. **O par pt → en só existe depois de uma geração nova**, e a primeira é a
da F3: a leitura do DOM dele fica para depois do clique do dono, a 0 ⚡ extra.

### F3 · A prova viva — a blusa aparece

**⚠️ 75 ⚡, metade do dono, obrigatória.**

**Antes do clique, quatro conferências (Claude, 0 ⚡):**

1. a ficha da cena 2 é a mesma de 07/09 — a de hoje contra a `diretiva_pt` gravada em `0cf3f069`.
   **Se mudou, o controle quebrou**, e a F3 espera o dono decidir;
2. a @luna ativa é a v4, com a folha `2c88aadb`;
3. o card tem a descrição da F1, e a chave da Máquina está ligada;
4. o bloco do produto que vai sair é o previsto na F2.7.

> ## ⚠️ PIOR CASO R1, ESCRITO ANTES DO CLIQUE
>
> ### Um ↻ de uma cena = uma imagem 2K = **75 ⚡**.
>
> Conferido no catálogo em 26/09: `gemini-3.1-flash-image` · `2K` = **75**.
> **Se o portão não disser «Custará 75 ⚡», o clique não acontece.**
> O motorista de lote não está no caminho: o ↻ é `confirmarRepeticao` → `pedirCena`, **um** pedido.

**O veredito, pré-registrado:** o dono põe a imagem ao lado da foto `06778db7`. **PASSA** se a peça
é uma **blusa** — uma parte de cima, e não uma peça única até as pernas —, azul, de manga curta.
**FALHA** se é vestido ou outra peça.

**A leitura do banco (Claude, 0 ⚡):** a linha nova com `sparks_charged = 75`;
`params.reference_asset_ids = [2c88aadb…, 06778db7…]`; `referencias_mudas: null`;
`referencias[0].descricao_en` igual ao da leitura da F1; o bloco do produto **byte a byte** o
previsto na F2.7; um lançamento de −75; saldo **3.186 → 3.111**.

**As condicionais — escritas antes:**

| a imagem | o texto no payload | o que acontece |
|---|---|---|
| **a blusa aparece** | certo | **A frente 1 fecha** — ROADMAP, ESTADO, diário e especificações no mesmo commit (§10) |
| vestido de novo | **certo** — a descrição está lá, byte a byte | **o texto chegou e o modelo não obedeceu: o limite é o desenhista.** → **frente 1.5, com o GPT Image 2** — que não é "só o adapter": precisa de preço por tamanho em migration ([`ROADMAP.md`](ROADMAP.md) §1.4) —, com plano próprio antes do código. A frente 1 fecha com o que provou: *o texto chega; a fidelidade no Nano Banana 2, nesta cena, reprovada — medida* |
| vestido de novo | **errado ou ausente** | **defeito nosso.** Volta para a F2, e **nenhum clique pago** até a prova de 0 ⚡ mostrar o bloco certo |
| recusada pelo filtro | — | **não debita** (provado em 07/09, `a10f13c0`); repetir é um clique novo, com R1 novo. **E fecha de brinde o item 3 do ESTADO** — o selo *«bloqueada pelo filtro do Google»*, nunca visto em tela —, a 0 ⚡ extra: é exatamente a oportunidade que o dono pediu em 07/09 |
| na dúvida | certo | o dono decide, com a imagem ao lado da foto. **Um segundo ↻ é um clique novo, com R1 novo — nunca automático** (R2.3) |

**n = 1, e o veredito diz isso.** Uma imagem que passa prova *"nesta cena, com este texto"* — não
*"o Nano Banana obedece sempre"*. Uma que falha, a mesma coisa ao contrário.

---

## 7. O dinheiro, somado

| gesto | fase | quem aperta | preço | sai da carteira? |
|---|---|---|---|---|
| leitura por Haiku, no harness | F0 | Claude, **depois do ok do dono** | 4 ⚡ | **não** — fora do produto |
| leitura por Gemini Flash, no harness | F0 | Claude, **depois do ok do dono** | 4 ⚡ | **não** |
| leitura pelo botão | F1 | **dono** | 4 ⚡ | **sim** |
| ↻ da cena 2 | F3 | **dono** | 75 ⚡ | **sim** |
| **pior caso** | | | **87 ⚡ de preço** | **79 ⚡ da carteira** — saldo **3.190 → 3.111** |

*Conferido no catálogo em 26/09:* `claude-haiku-4-5` e `gemini-2.5-flash` a **4 ⚡** por extração;
`gemini-3.1-flash-image` a **75 ⚡** em 2K.

- **R2** — nenhum motorista de lote em nenhum gesto. O botão de leitura herda o espírito das quatro
  travas: **um clique → no máximo uma chamada → no máximo um débito**, e nunca resubmissão
  automática. A retentativa do SDK da Anthropic (`MAX_RETRIES = 1`) repete uma chamada **que
  falhou** — e mesmo aí o Spark sai uma vez só, porque quem cobra é a função do banco, chamada uma
  vez por clique.
- **R3** — a fal não está em nenhum gesto desta frente.
- **R4** — nenhum estorno previsto. Se algum for preciso: só com autorização do Jorge, um por leitura.

---

## 8. Riscos nomeados

1. **O preço da leitura de produto é o da extração de personagem.** Mesma coluna
   (`extraction_sparks`), volumes muito diferentes: as duas extrações de personagem que deram certo
   gastaram **1.090 e 1.348 tokens de saída** (média de entrada: 3.661), e a leitura de produto deve
   ficar em algumas centenas — *a F0 mede*. A casa já tem o desenho para isso: **preço por tipo de
   trabalho**, como `ai_model_text_prices` faz com `roteiro` · `estruturar` · `cena`. Fica para o
   Catálogo aberto.
2. **O identificador do Gemini pode não responder** (§4.8). Se não responder, é catálogo — e decisão
   do dono.
3. **O Gemini 2.5 Flash pensa por padrão**, e pensamento é token de saída pago. A F0 mede; o adapter
   pode pôr teto.
4. **Uma página colada traz ruído** — frete, tabela de medidas, hashtag. *"O que está nos campos é o
   que entra"* (decisão 1): o teto de 2.000 é o único filtro, e o contador mostra onde se está.
   **Nunca truncar em silêncio.**
5. **A descrição se repete por foto nas referências gravadas** — é a forma que a instrução já tem.
   Cinco fotos × 2.000 caracteres por bloco conectado, no grafo: **armazenamento, não tokens** — só a
   primeira foto é traduzida, e só ela fala.
6. **O compilador continua sem carimbo de versão** (A′, resposta 8.3). A régua que sobra é a **hora
   no diário**, e ela vale para a F2.
7. **O Nome de hoje tem forma de slug** (*"blusa-azul-de-linho-manga-curta"*). Pela invariante 11, a
   leitura o **preserva**. Pela resposta 9.2 ele só entraria no texto com a Descrição vazia — e na F3
   ela estará cheia, então **o slug não entra**. Num card só com nome, entraria como está escrito.

---

## 9. As respostas do dono — 26/09/2026

| # | pergunta | **resposta** |
|---|---|---|
| 9.1 | A Instrução de hoje vira a Descrição? | ✅ **Sim — um campo só.** O card fica **Nome · Fotos · Descrição**; os cards antigos mantêm o texto, sob o nome novo |
| 9.2 | O Nome entra no texto? | ✅ **Só quando a Descrição estiver vazia** — cobre o card de 07/09, que era exatamente nome cheio e descrição vazia |
| 9.3 | O Google acende também a leitura de personagem? E o 2.5 Pro? | ✅ **Personagem, não. O Gemini 2.5 Pro entra na lista de produto, sim** |
| 9.4 | Em qual modelo o seletor abre? | 🔁 **Decisão do dono, contra a minha recomendação.** Eu recomendei não mexer no padrão do catálogo — ele é um só, compartilhado com a ficha — e deixar a primeira leitura abrir no Sonnet. **O dono não aceitou:** *a lista de produto tem o seu próprio padrão, separado do de personagem, e ele é decidido pela F0 — o que ler melhor a foto da blusa entre Haiku (4 ⚡) e Gemini Flash (4 ⚡). **Sonnet a 20 ⚡ nunca é padrão para produto.** O card lembra o último modelo usado.* → vira a marca própria no catálogo e a conferência da migration, na F1 |
| 9.5 | Se a F3 passar, onde a 1.5 entra na fila? | ✅ **Depois das cinco frentes, se a F3 passar; a próxima, se a F3 falhar com o texto certo no payload** |

📌 **Por que a 9.4 do dono é melhor que a minha recomendação.** Eu tratei o padrão como detalhe
de tela, porque o portão diz o preço antes do clique. Mas um padrão é **o que acontece quando
ninguém escolhe** — e *"ninguém escolhe"* é o caso comum de quem tem pressa, e vai ser o caso de todo
post do Modo Rápido (frente 2), onde não há card para lembrar nada. Deixar o padrão a 20 ⚡ era cobrar
cinco vezes, por omissão, pelo mesmo trabalho que a F0 vai medir a 4.

---

## 10. O ritual

- **A metade paga da F0, a leitura da F1 e a F3 têm dinheiro:** metade do dono obrigatória, R1
  escrito acima, e **a etapa fica aberta e não commitada** até a prova dele chegar. **A F2 só começa
  depois do commit da F1** — uma etapa esperando prova e uma etapa fechada não podem ter a mesma
  aparência no git.
- **A F2 é 0 ⚡** (§6 · F2): prova estrutural + validação de tela, prova por item em número, produção
  no mesmo dia.
- **A migration é do Jorge**, e o `database.types.ts` é regerado do banco depois dela.
- **Evidência** em `scratchpad\evidencias\produto-diz-f0\` … `produto-diz-f3\`, um arquivo por
  item, com nome que diz o que prova. **Print só onde o número não alcança** — e aqui ele alcança
  quase tudo: o único print decisivo previsto é **a imagem da F3 ao lado da foto**.
- **Toda leitura de número do canvas passa pelo `medir-canvas.js`.**
- `npm run lint` + `npm run typecheck`; ESTADO reescrito **no mesmo commit**;
  `git grep -n "SAI ANTES DO COMMIT" -- src/ supabase/` vazio; **commit e push na mesma ação**, com
  `git log origin/master -1` no resumo.
- **O que o fechamento atualiza:**
  - a linha da frente 1 no [`ROADMAP.md`](ROADMAP.md) §4 — **que já está velha**: diz *"um dia"* e,
    sobre dinheiro, *"na parte estrutural, não"*; com a leitura paga e a migration, nenhuma das duas
    continua verdade — e o item 9 do §2;
  - em [`nodes-geracao.md`](nodes-geracao.md): a N4 cumprida, o §3.1 (o card) e a regra 6 do §6 (a
    descrição no bloco do produto);
  - em [`motor-extracao.md`](motor-extracao.md): **o segundo consumidor do motor**;
  - em [`arquitetura.md`](arquitetura.md) §4: `extractions`;
  - o diário, com **hora** na entrada do compilador; e o §7 do [`produto.md`](produto.md).
