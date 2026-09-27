# Frente 1 — o produto diz o que é

> **Status:** ✅ **PLANO APROVADO em 26/09/2026** — escrito no mesmo dia a partir das decisões do
> dono de 21/09, e aprovado com as **cinco respostas do §9**. A 9.4 é **decisão do dono, contra a
> minha recomendação**: a lista de produto tem **padrão próprio**, decidido pela F0, e o Sonnet a
> 20 ⚡ **nunca** é o padrão dela.
>
> **Fase aberta: F0** — autorizada pelo dono em 26/09, com o plano (*"comece a F0"*). **O lado a lado
> Haiku × 3.7 Flash foi medido em 27/09 (rodada 5)**: quatro leituras no contrato v2, duas por modelo
> (a rodada 4 contou como a 1ª do Haiku — conteúdo idêntico, conferido no pedido). **A F0 fecha com a
> escolha do dono** — o padrão da lista de produto, com as quatro leituras ao lado da foto (*O que a F0
> achou*, rodada 5).
>
> **F1a — escrita e provada estruturalmente em 27/09 (37 provas, 0 falhas), NÃO commitada:** a
> validação ao vivo espera o navegador — em 27/09 a aba abriu no perfil do Chrome de outro cliente, e o
> dono a fechou. O que falta está no fim da seção F1a.
>
> **Custo:** 0 ⚡ nas partes estruturais. **Pior caso R1 do percurso inteiro, registrado pelo dono
> em 26/09: 87 ⚡ de preço — 79 ⚡ da carteira** (uma leitura pelo botão + uma imagem, saldo
> 3.190 → 3.111) **+ 8 ⚡ de leituras fora do produto**, na F0 — somados no §7. *Depois o dono pediu
> mais três leituras fora da carteira — a 2ª do Haiku na rodada 4 (+4) e as duas a mais do lado a lado
> (+8): **99 ⚡ de preço; a carteira continua 79.** Custo real da F0 inteira: **11 centavos**, 0 Spark.*
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
| Gemini 2.5 Pro (`gemini-2.5-pro`) | 10 | | ❌ — **sai da lista** até ser medido (dono, 26/09) |
| Gemini 2.5 Flash (`gemini-2.5-flash`) | **4** | | ❌ — **404 para esta conta** (F0) → **inativa na F1** |
| Gemini 3.7 Flash (`gemini-3.7-flash`) | hoje só `text_gen` | | ✅ texto → **lê produto nesta frente**, a 4 ⚡ de referência |
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

**Chamado em 26/09: `404` — *"no longer available to new users"*.** Saiu da lista; entrou o
`gemini-3.7-flash` (decisão do dono, no mesmo dia).

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
| 1ª | **F0** | o que o compilador envia hoje; o que Haiku e Gemini leem da foto da blusa — **e o padrão da lista de produto** | 0 ⚡ + ⚠️ **20 ⚡ fora do produto** (5 leituras) | 🔵 **medida — falta a escolha do dono.** (a) ✅ byte a byte; (b) ✅ **lado a lado feito em 27/09**: Haiku 2× e 3.7 Flash 2×, contrato v2, 11 centavos reais no total da F0 (ver *O que a F0 achou*, rodada 5) |
| — | **F1a** | o envio que lê os bytes — e o colar/arrastar imagem no canvas pelo mesmo caminho | 0 ⚡ | 🟡 **escrita em 27/09, 37 provas estruturais verdes — NÃO commitada**: falta a validação ao vivo, que espera o navegador (fim da seção F1a) |
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
| **o padrão da lista de produto** — o que ler melhor a foto da blusa, entre **Haiku e Gemini 3.7 Flash** (resposta 9.4; o 3.7 Flash entrou no lugar do 2.5 Flash em 26/09), medidos contra os 4 ⚡. É ele que a F1 grava no catálogo e que o dono usa na leitura dele | **dono**, com os dois JSONs ao lado da foto |
| o contrato muda antes da F1? | Claude propõe, dono aprova |
| o `gemini-2.5-flash` responde? | fato. Se não: **pergunta de catálogo ao dono** — migration com o identificador vigente e o preço conferido; **nunca código** |
| o Gemini precisa de teto de pensamento no adapter? | Claude, com o número de tokens na mão |
| o custo real cabe nos 4 ⚡? | nota de calibração (E2) — **não muda preço nesta frente** |

**Evidência:** `scratchpad\evidencias\produto-diz-f0\` — `texto-de-hoje-0cf3f069.md`,
`leitura-haiku.json`, `leitura-gemini-flash.json`, `numeros-f0.md`.

#### O que a F0 achou — 26/09/2026

**(a) ✅ O texto de hoje, remontado com o compilador de hoje, é IGUAL byte a byte ao de 07/09** —
1.557 caracteres, md5 igual; a estrutura e a ordem das imagens também iguais. O harness fala pela
produção, e a linha de base da F2 está gravada: *blouse* 0 · *dress* 0 · *hem* 1 · *head to toe* 1;
o bloco do produto são duas frases, e nenhuma diz o que a peça é.

**A foto, vista antes das chamadas** — md5 `2cb6f65a…`, 21.878 bytes, igual ao banco: uma blusa
**azul-marinho, curta, de manga bufante** com elástico no punho e **decote redondo**, sobre fundo
verde, **sem pessoa**, com uma etiqueta ilegível na gola. **O tecido parece malha lisa, não linho** —
embora o nome do card diga linho. O gabarito pré-registrado conta *"linho"* como invenção.

**(b) ⛔ As duas chamadas foram recusadas antes de gerar texto — custo real 0, nada no ledger:**

| leitor | a recusa, verbatim | o que ela quer dizer |
|---|---|---|
| Haiku | `the provider rejected the API key: API key is invalid.` | **a chave da Anthropic do ambiente local foi rejeitada.** Não é o arquivo: as outras duas chaves dele funcionaram na mesma sessão. E ela alimenta **toda tradução do produto** — se a da Vercel for a mesma, toda geração com texto em português está sendo recusada com `translation_failed`, e **a F3 depende dela** |
| Gemini Flash | `404 This model models/gemini-2.5-flash is no longer available to new users. Please update your code to use models/gemini-3.8-flash …` | **o risco 2 do §8, confirmado:** a conta nunca usou o 2.5 Flash e é "nova" para ele. O **2.5 Pro** (resposta 9.3) deve bater na mesma parede |

**Os candidatos para o lugar do 2.5 Flash** — preço oficial lido em 26/09: `gemini-3.8-flash` (a
sugestão do Google) e `gemini-3.7-flash` (o do Roteiro, já no catálogo) custam **o mesmo** — US$ 0,75
de entrada e US$ 3,75 de saída com pensamento, por milhão de tokens, **até 31/12/2026, e o dobro a
partir de 01/01/2027**. O 2.5 Flash custava US$ 0,30 e 2,50: **os 4 ⚡ do catálogo podem não cobrir a
leitura** — o número de verdade vem da chamada que passar.

**As duas decisões do dono, na mesma tarde** ([`decisoes.md`](decisoes.md), 26/09): a chave da
Anthropic **expirou por prazo programado** (criada em 08/08) e foi trocada por ele; e o Gemini da lista
de produto é o **`gemini-3.7-flash`** — o 2.5 Pro sai da lista até ser medido, e as duas linhas 2.5 de
`extraction` ficam inativas na migration da F1.

**Rodada 2 — Haiku e 3.7 Flash, as duas recusadas antes de gerar, custo real 0:**

| leitor | a recusa, verbatim | o que ela quer dizer |
|---|---|---|
| Haiku | `400 … The image was specified using the image/jpeg media type, but the image appears to be a image/webp image` | **a chave nova funciona** — e a foto é **WebP registrada como JPEG**: os bytes começam com `RIFF … WEBP`. O envio grava o que o navegador diz (`reference-picker.tsx:271`); a geração manda o que o banco diz (`asset-payloads.ts`). O Google tolerou em 07/09; a Anthropic confere e recusa. **Erro nosso** |
| 3.7 Flash | `402` — pagamento exigido, corpo vazio | a sonda 0 ⚡ (consulta de metadados, sem geração) voltou **200** para o 3.7 Flash **e para o Nano Banana 2**: a chave e o projeto respondem, **a geração é que está bloqueada — cobrança do lado do Google**. Bloqueia também a imagem, o Roteiro **e a F3** |

**Rodada 3 — só o Haiku, com o tipo lido nos bytes (`image/webp`); mesma foto, mesmo contrato byte a
byte (md5 `963af2aa…`):**

| | Haiku (`claude-haiku-4-5`) |
|---|---|
| latência | 4.394 ms |
| tokens | 1.965 de entrada · 236 de saída · 0 de pensamento |
| **custo real** | **2 centavos contra 4 ⚡ = 4 centavos — cabe**, com o dobro de margem, e igual em 2027 |
| as três partes do contrato | **o que é ✅ · atributos 5/5 ✅ · como se usa ✅** |
| **o gabarito pré-registrado** | **4/4 obrigatórios · 3/3 desejáveis** — não disse linho, não inventou marca |

> *"A children's short-sleeve blouse in navy blue, made of apparently soft and lightweight fabric.
> Features a simple round neckline, short puffed sleeves with gathered elastic cuffs creating a ruched
> effect. The body is straight and loose-fitting with no pattern, ending at waist level. Closes with
> natural finishing without buttons or zippers. Perfect for casual and comfortable wear."*

> ## ⚠️ E inventou uma coisa que o gabarito não previa: **"infantil"**
>
> *"Blusa infantil…"* / *"A children's short-sleeve blouse…"* — numa foto **sem nada que dê escala**.
> "Para quem é" é **tamanho**, e a regra 2 do contrato proíbe dizer tamanho que não se vê. **E é a
> frase que a F2 colaria no bloco do produto**: na F3, o texto mandaria a @luna, adulta, vestir *"a
> children's blouse"*. O gabarito segue fechado; o achado vai ao dono **antes** da escolha do padrão.

**Rodada 4 — o contrato v2, com o princípio de evidência do dono** (26/09, palavra por palavra, como
regra 2):

> *"Descreva apenas o que a foto evidencia. Atributos de quem usa a peça — faixa etária
> (infantil/adulto), gênero, modelagem (plus size) — só entram se houver evidência visível na foto
> (etiqueta, referência de escala, corpo vestindo). Na dúvida, omita."*

| | Haiku, contrato v2 (md5 `a12a8dd4…`) |
|---|---|
| **o "infantil" da rodada 3** | ✅ **sumiu** — nenhuma palavra de público, nem faixa etária, nem gênero, nem modelagem |
| gabarito · três partes | 4/4 e 3/3 · o que é ✅ atributos 5/5 ✅ como se usa ✅ |
| **custo real** | **2 centavos contra 4 ⚡** (2.051 tokens de entrada, 227 de saída) |
| a leitura humana | dois detalhes menores: *"aparenta ser algodão ou misto"* (composição com ressalva — zona cinzenta da regra 3) e *"elastic cuffs at the shoulders"* (**o elástico é do punho**, não do ombro; a rodada 3 tinha acertado) |

> *"A navy blue short-sleeve blouse with puffed sleeves. Featuring a round neckline, the fabric
> appears to be cotton or cotton blend with good structure, loose fit through the torso. The sleeves
> have pronounced volume with elastic cuffs at the shoulders. Length hits at the waist. Solid color,
> no pattern. Wear as a casual everyday piece."*

**n = 1 por rodada:** a 3 acertou o punho e inventou o público; a 4 corrigiu o público e errou o
punho. É a variação de uma leitura de modelo — e é por isso que a descrição é editável no card.

#### O contrato de leitura v2 — o texto que a F1 embute, byte a byte

> **Este é o texto que o produto vai mandar**, e ele só existia fora do repositório — no harness e na
> evidência, no `scratchpad\`. Posto aqui em 27/09, **copiado por script do arquivo de evidência** (e não
> redigitado), e conferido de volta pelo md5 de cada bloco. **A F1 embute estes três blocos sem mudar um
> byte**, e prova isso com o md5 do prompt de sistema num teste. Mudar o contrato é decisão do dono, com
> versão nova (v3) e leitura nova — nunca edição silenciosa.

<!-- CONTRATO-V2:INICIO — gerado por scratchpad/harness/contrato-v2-no-plano.mjs; não editar à mão -->

**Prompt de sistema** — 2020 caracteres · md5 `99f41400f7f0b2d95da4557e7e99558a`:

<!-- contrato-v2:sistema -->
```text
Você lê a foto de um PRODUTO e escreve o que ele é, para que um gerador de imagens o reproduza fielmente sem ver a foto.

FORMATO DA RESPOSTA

Sua resposta inteira é um objeto JSON: o primeiro caractere é "{" e o último é "}". Nada antes, nada depois — sem cerca de código, sem frase de introdução ou de fecho. Exatamente três chaves, no primeiro nível:

  {"nome": "...", "descricao_pt": "...", "descricao_en": "..."}

- "nome": curto, em português, como um vendedor chamaria o produto numa etiqueta. No máximo 60 caracteres.
- "descricao_pt": em português, texto corrido, até 600 caracteres.
- "descricao_en": a MESMA descrição, em inglês, até 600 caracteres. Começa pelo que o produto é — por exemplo "A short-sleeve blouse in …" —, porque é lida por um gerador de imagens.

O QUE A DESCRIÇÃO DIZ, nesta ordem

1. O que o produto é — o substantivo exato.
2. Os atributos visíveis que alguém precisaria para desenhá-lo sem ver a foto: cor, material ou textura aparente, forma, corte e caimento, comprimento (numa roupa: até onde ela vai no corpo), manga, gola ou decote, estampa, fechamento, acabamentos e detalhes.
3. Como se usa ou se veste.

REGRAS INEGOCIÁVEIS

1. Descreva o PRODUTO, nunca uma pessoa. Se alguém o veste ou o segura, ignore a pessoa por completo: nada de corpo, rosto, cabelo, pose ou expressão. Nunca tente identificar, nomear ou reconhecer ninguém.
2. Descreva apenas o que a foto evidencia. Atributos de quem usa a peça — faixa etária (infantil/adulto), gênero, modelagem (plus size) — só entram se houver evidência visível na foto (etiqueta, referência de escala, corpo vestindo). Na dúvida, omita.
3. Não invente o que não se vê. Marca, composição do tecido, tamanho, preço: o que a foto não mostra, a descrição não diz. Material que só se vê pela aparência é "aparente" — "aparenta malha", nunca "100% algodão".
4. Não descreva o fundo, a luz nem o enquadramento da foto — eles não são o produto.
5. As duas descrições dizem a mesma coisa: o inglês não acrescenta nem tira nada do português.
```

**Pedido do turno**, com a foto antes dele — md5 `6cd53a1fe702a2efae2a284c9209cbef`. É a frase fixa do adapter da Anthropic (`anthropic.ts:320`), e o harness mandou a mesma ao Gemini:

<!-- contrato-v2:pedido -->
```text
Analise a foto acima e preencha o formulário conforme as regras do sistema.
```

**Schema** — só o Gemini o recebe, pelo `response_format`; o adapter da Anthropic pede a forma pelo prompt · md5 `1d7cc33e69e304cba818a72436931c1b`:

<!-- contrato-v2:schema -->
```json
{
  "type": "object",
  "properties": {
    "nome": {
      "type": "string"
    },
    "descricao_pt": {
      "type": "string"
    },
    "descricao_en": {
      "type": "string"
    }
  },
  "required": [
    "nome",
    "descricao_pt",
    "descricao_en"
  ]
}
```

*O arquivo de evidência inteiro — com o cabeçalho e o gabarito — é o `contrato-leitura-v2.md`, md5 `a12a8dd4eda48f46d55716ab213ffba8`: é o número que as rodadas 4 e 5 citam. O md5 que a F1 confere é o do **prompt de sistema**, acima.*

<!-- CONTRATO-V2:FIM -->

**O que falta para fechar a F0 — decisão do dono, 26/09:** o `402` do Google é **saldo pré-pago
baixo**; o dono repõe e define o gasto máximo mensal no AI Studio, e avisa *"liberado"*. **A leitura
do 3.7 Flash com o contrato v2 é a própria verificação da cobrança** — nunca uma geração de imagem só
para testar. Aí o lado a lado Haiku × 3.7 Flash, **os dois no contrato v2**, e a escolha do padrão da
lista de produto (resposta 9.4). Até lá, a F3 está parada.

**No fechamento da noite de 26/09, o dono decidiu** ([`decisoes.md`](decisoes.md), 26/09):

- **Google liberado:** saldo pré-pago reposto, **recarga automática desativada**. ⚠️ **A conta de
  faturamento é compartilhada com outro projeto** — um `402` futuro pode vir sem nenhuma geração nossa.
- **Punho e tecido aceitos no v2:** *erro de percepção se corrige no campo editável, não com regra nova
  no contrato.* O contrato v2 fica como está.
- **O lado a lado que fecha a F0** — o próximo passo exato:

| | |
|---|---|
| modelos | Haiku (`claude-haiku-4-5`) × Gemini 3.7 Flash (`gemini-3.7-flash`) |
| contrato | **v2**, o mesmo arquivo (md5 `a12a8dd4…`) |
| leituras | **duas por modelo** |
| critérios | o gabarito fechado **mais dois extras:** **a posição do elástico** (é do **punho**) e **o tratamento do tecido** (aparência — *"aparenta malha"* —, nunca composição) |
| verificação da cobrança | **a primeira leitura do 3.7 Flash.** Se voltar `402`, parar — e lembrar que a conta é compartilhada |
| **R1, a escrever de novo antes do clique** | **4 chamadas, no máximo 16 ⚡ de preço de catálogo, 0 Spark da carteira.** *Se a rodada 4 contar como uma das duas do Haiku: 3 chamadas, 12 ⚡ — o dono decide ao retomar* |
| o que muda no harness antes | hoje o `f0-leituras.ts` faz **uma** leitura por modelo, sem os dois critérios extras: ajustar (0 ⚡) |
| o que fecha a F0 | **a escolha do dono**, com as quatro leituras ao lado da foto: o padrão da lista de produto (resposta 9.4) |

**27/09 — as duas confirmações do dono, antes de rodar** ([`decisoes.md`](decisoes.md), 27/09): **a rodada
4 conta como a 1ª leitura do Haiku**, desde que a nova mande ao modelo exatamente o mesmo conteúdo —
modelo, contrato v2, foto e parâmetros — (3 chamadas, até 12 ⚡; se não desse para garantir, 4 e 16); e
**a regra de nome da imagem colada** (na F1a).

#### Rodada 5 — o lado a lado, 27/09/2026

**R1, escrito antes** (`r1-rodada5-lado-a-lado.md` — e o harness se recusa a rodar sem ele): 3 leituras —
Flash, Flash, Haiku —, **12 ⚡ de preço de catálogo, 0 Spark**, no máximo 4 pedidos HTTP; custo real
esperado de 6 a 14 centavos, **teto de R$ 3,22** — o Flash vai sem teto de saída, de propósito (a F0 mede
o pensamento natural), e o teto do modelo, **65.536 tokens**, foi lido do Google. Se a 1ª do Flash
falhasse, a 2ª não seria feita. **Um ensaio a 0 ⚡, com `fetch` falso, rodou antes** — e achou um defeito
do harness (o SDK do Google põe o corpo dentro de um `Request`) antes de qualquer centavo.

**A rodada 4 contou — conferido no pedido, não suposto.** O corpo do pedido do Haiku foi gravado como o SDK
o serializou: o mesmo modelo, o prompt de sistema `99f41400…`, a foto `2cb6f65a…` como `image/webp`, a mesma
frase de pedido, `max_tokens` 8000, nenhum outro parâmetro, **um** pedido HTTP — e **2.051 tokens de
entrada contra os 2.051** da rodada 4. O adapter não muda desde 09/08.

**A cobrança do Google voltou:** a 1ª leitura do Flash respondeu, sem `402`.

| | Haiku 1 · rodada 4 | Haiku 2 · rodada 5 | Flash 1 · rodada 5 | Flash 2 · rodada 5 |
|---|---|---|---|---|
| **gabarito** (obrigatório · desejável) | 4/4 · 3/3 | 4/4 · 3/3 | 4/4 · 3/3 | 4/4 · 3/3 |
| **o elástico** — é da barra da manga; no ombro há franzido | ❌ no ombro — *"elastic cuffs at the shoulders"* | ✅ no punho — *"gathered at the cuffs with elastic"* | ✅ no punho, e o franzido no ombro — *"gathered shoulders and elasticated cuffs"* | ✅ no punho, e o franzido no ombro — *"shoulder gathers and elasticated cuffs"* |
| **o tecido** — aparência, nunca composição | ❌ composição com ressalva — *"aparenta ser algodão ou misto"* | ❌ composição com ressalva — *"aparenta ser algodão ou mescla"* | ✅ aparência — *"malha aparente lisa"* (⚠️ o inglês perdeu a ressalva: *"a smooth … knit"*) | ✅ aparência nas duas línguas — *"malha lisa aparente"* / *"apparent smooth knit fabric"* |
| **regra 2** — público sem evidência | ✅ nenhum | ❌ **"infantil" / "children's" — no nome também** | ❌ **"feminina" / "women's"** | ✅ nenhum |
| custo real hoje · em 2027 (centavos) | 2 · 2 | 2 · 2 | 3 · **5** | 2 · 4 |
| tokens: entrada · saída · pensamento | 2.051 · 227 · 0 | 2.051 · 238 · 0 | 1.662 · 150 · 537 | 1.662 · 143 · 457 |
| latência | 4,1 s | 4,1 s | 7,9 s | 6,0 s |

**A leitura humana corrigiu a triagem num ponto:** o elástico das duas leituras do Flash saiu "ombro ❌"
na triagem por regra — a frase cita o ombro — e é ✅: franzido no ombro, elástico no punho, **cada coisa no
seu lugar**. É a descrição mais fiel da manga das quatro (`leitura-humana-rodada5.md`).

**O que isso diz:**

1. **O gabarito não separa os dois modelos** — quatro de quatro passam tudo.
2. **Nos dois critérios extras do dono, o Flash leu melhor:** elástico **2 de 2** (o Haiku, 1 de 2); tecido
   como aparência **2 de 2** (o Haiku, **0 de 2**).
3. **⚠️ A regra 2 do v2 falhou em 2 de 4 leituras, uma em cada modelo.** O *"infantil"* voltou no Haiku,
   agora no nome; o Flash escreveu *"feminina"*. Pela fronteira do dono de 26/09 isto é **invenção**, não
   percepção — o contrato já tem a regra, e os dois modelos a quebraram. **A do Haiku é a que muda a
   peça**: na F3, a @luna adulta vestiria *"a children's blouse"*.
4. **Dinheiro:** as quatro cabem nos 4 ⚡ hoje; em 2027 a tarifa do Flash dobra, e a leitura 1 custaria 5
   centavos. O pensamento é a maior parte da saída do Flash (537 e 457 contra 150 e 143 de texto) — e o
   adapter de texto de hoje não o conta (gravaria 1 centavo onde o real é 2 e 3): **a F1 soma o pensamento
   à saída** (item 5).

**Custo real da rodada: 7 centavos** (3 + 2 + 2), 3 pedidos HTTP, **0 Spark — saldo 3.190, conferido no
banco** (nenhum lançamento, geração ou extração desde 26/09). **Custo real da F0 inteira: 11 centavos.**

**O que fecha a F0 — do dono:**

1. **o padrão da lista de produto** (resposta 9.4): Haiku ou 3.7 Flash;
2. **a regra 2 falhando em 2 de 4:** aceitar, com o campo editável como correção? Ou um **aviso mecânico**
   no card — a leitura que volta com palavra de público (*infantil, feminina, masculina, plus size…*) acende
   uma frase pedindo conferência, 0 ⚡, sem mudar o contrato?

**Evidência** (`scratchpad\evidencias\produto-diz-f0\`): `r1-rodada5-lado-a-lado.md`,
`numeros-f0-rodada5-lado-a-lado.md` (a triagem), `leitura-humana-rodada5.md` (a leitura que decide),
`pedidos-rodada5.json` (os corpos dos pedidos, com foto e contrato reduzidos a md5), `leitura-*-rodada5*.json`,
`limites-gemini-3.7-flash.json`; o harness da rodada 4 ficou guardado em `harness\f0-leituras-ate-rodada4.ts`.

### F1a · o envio que lê os bytes, e o colar/arrastar imagem no canvas

> **✅ Aprovada pelo dono em 26/09, com uma regra de nome para a imagem colada — confirmada por ele em
> 27/09** (abaixo, em *A regra de nome*). 0 ⚡.
>
> **🟡 Escrita em 27/09 e provada estruturalmente — 37 provas, 0 falhas — e NÃO commitada:** a validação
> ao vivo espera o navegador. O que foi entregue, as provas, três achados e **o que falta para retomar**
> estão no fim desta seção.

**A recomendação: fase própria, antes da F1 — não carona na F1.**

- **Por que não carona:** a F1 tem dinheiro — um portão novo e um caminho que cobra — e fica
  **aberta e não commitada** até a leitura do dono. Uma funcionalidade de tela de 0 ⚡ dentro dela
  esperaria junto, e alargaria a superfície de um commit de dinheiro.
- **Por que antes:** a F1 lê fotos, e nasce melhor sobre um envio que já grava o tipo certo. **E a F1a
  pode andar agora**, enquanto a F0 espera o Google: é 0 ⚡ e não depende da cobrança de ninguém.
- **Pela régua da regra 8**, tela, estado e envio sem cobrança ficam fora da zona de dinheiro: sela com
  prova estrutural + validação de tela, e vai para produção no mesmo dia.

**O que a varredura mediu — 26/09, 0 ⚡, só leitura** (`scratchpad\harness\f0-varredura-mime.ts`;
32 bytes de cada arquivo, pedidos com `Range` — honrado nos 104):

| | arquivos |
|---|---|
| o tipo do banco **bate** com os bytes | 98 |
| **diverge** | **6** — todos **envios** declarados `image/jpeg` que são **WebP**: 6 dos 14 envios "JPEG" (43%) |
| ilegíveis | 0 |
| imagens geradas (52) e vídeos (37) | **todos batem** |

**Onde os 6 estão:** foram referência em **26 gerações, todas pelo Google**, que tolerou (cada um tem
geração bem-sucedida); 2 estão em imagens de entidade; 2 aparecem em grafos de hoje (o card da blusa e
um de pijama). **Nenhum dado foi alterado.**

**O que a F1a entrega — um caminho de envio só:**

1. **O envio lê o tipo nos bytes — no navegador e no servidor.** Hoje o seletor aceita pelo `file.type`
   (que vem da extensão), tira a extensão do **nome** do arquivo, e o servidor registra o tipo recebido
   sem conferir (`registerUploadedAsset` só exige `image/…`, `assets/actions.ts:224`). Depois: o
   navegador lê os primeiros bytes, recusa o que não for JPEG, PNG ou WebP, e usa o tipo verdadeiro no
   Storage, na extensão do caminho e no registro — **e o servidor confere**: lê os primeiros bytes do
   arquivo já no Storage (o mesmo `Range` da varredura) e recusa a divergência. *Pode nomear, nunca
   alargar:* o tipo que o banco grava é o que os bytes dizem.
2. **Uma função de envio só.** O `handleUpload` do seletor (`reference-picker.tsx:225`) vira a função
   de envio da casa, usada pelo botão **e** pelo colar/arrastar — o mesmo Storage
   (`<dono>/references/`), a mesma miniatura, o mesmo registro. **Nenhum caminho paralelo.**
3. **Colar (Ctrl+V) e soltar arquivo no canvas criam um Input de Imagem com a foto** — solto, onde o
   gesto aconteceu (colar: sob o ponteiro, ou no centro da vista; soltar: no ponto do soltar), **sem
   fio**: quem liga é a pessoa, como no menu. O card nasce como o *«Continuar deste vídeo»* já cria o
   dele (`store.ts:1592`: `{ assetId, kind: null, instrucao: "" }`). O canvas já aceita soltar card da
   prateleira (`flow-canvas.tsx`, `handleDrop`) — soltar arquivo é o mesmo ponto, com outro conteúdo.
4. **O carregador que manda imagem ao provedor lê o tipo nos bytes** (`asset-payloads.ts:35`, hoje
   `mimeType: asset.mime_type`). Cobre os 6 já gravados e qualquer outro, **sem mexer em dado** — e
   deixa a frente 1.5 (GPT Image 2) a salvo de um provedor menos tolerante que o Google.

**Os limites propostos:**

| | proposta | por quê |
|---|---|---|
| formatos | **JPEG, PNG e WebP**, lidos nos bytes | a interseção que os dois fornecedores da casa aceitam; GIF, HEIC e AVIF recusados com a frase dizendo quais entram |
| tamanho | **até 10 MB** por imagem | o teto do botão (`MAX_BYTES`, `reference-picker.tsx:41`) — um caminho, um limite. ⚠️ A leitura da F1 manda a foto à Anthropic, cujo teto por imagem é menor (**5 MB, a conferir na documentação no dia**): a F1 reduz a foto com o `sharp` antes de mandar, ou recusa dizendo por quê |
| quantidade por gesto | **até 5** | o número do card de produto; acima disso o gesto inteiro é recusado **com o número** — nunca truncar em silêncio |
| o que **não** entra | link arrastado de outra aba; imagem colada dentro de um campo de texto | buscar URL de fora seria um segundo caminho, e um servidor buscando endereço de terceiros; colar num campo de texto continua sendo colar texto |

**As provas (0 ⚡):** vermelho→verde do tipo — um WebP chamado `.jpg` hoje vira `image/jpeg`, e depois
`image/webp`, no Storage e no banco; bytes de GIF com extensão `.png` → recusado **antes** do envio; o
servidor recusa um registro cujo tipo diverge dos bytes; colar e soltar criam o card com o asset, lidos
**do store** e do DOM (pelo `medir-canvas.js`); 6 imagens num gesto → recusa com o número e **zero**
envios; o carregador manda `image/webp` para a foto da blusa.

**A regra de nome da imagem colada — confirmada pelo dono em 27/09.** A imagem do clipboard chega sem nome
útil — o navegador a entrega como `image.png` —, e o rótulo era o nome do arquivo sem a extensão: toda
colagem viraria *"image"* na galeria, e a busca, que acha pelo rótulo, não acharia nada. **A regra:**

| de onde veio | o rótulo | o caminho no Storage |
|---|---|---|
| **com nome próprio** — escolhida no botão, arrastada, ou **copiada do Explorer e colada** | o nome do arquivo, sem a extensão — **como sempre** | `<dono>/references/<uuid>.<extensão lida nos bytes>` |
| **sem nome** — print, imagem copiada de uma página | **`Colada · dd/mm hh:mm:ss`**, na **hora local de quem colou** — nunca a do servidor, em UTC | o mesmo |

**E o nome é só rótulo de galeria:** nunca entra no prompt e nunca preenche o Nome do produto (dono, 27/09).

*O caminho nunca usa o nome — usa um uuid e a extensão dos bytes —, então a regra de nome é só do
rótulo, e nome repetido não colide. **"Sem nome"** é o nome que Chrome, Edge e Firefox inventam para a
imagem da área de transferência — `image.<ext>` —, reconhecido **só no colar**: um arquivo de disco que se
chama `image.png`, arrastado, fica «image». Limite aceito: o mesmo arquivo, copiado do Explorer e colado,
vira «Colada · …» — o rótulo é legenda de busca, não identidade.*

**Os 6 registros já gravados — decisão do dono, 26/09: corrigidos por um script que ele roda.** A F1a
não os altera: com o carregador lendo os bytes, o provedor recebe o tipo certo mesmo com o banco
errado. O script vai em `supabase/correcoes/`, **rodado pelo dono**: **só a coluna de tipo**
(`assets.mime_type`, de `image/jpeg` para `image/webp`), os 6 ids da varredura, idempotente, mostrando
antes e depois. **A prova é a varredura rodada de novo: 104 batem / 0 divergem / 0 ilegíveis.**

> **✅ Escrito em 27/09 — `supabase/correcoes/20260927_tipo_dos_6_envios_webp.sql`. Falta o dono rodar.**
> No molde do estorno de 29/08: o UPDATE e as conferências moram num bloco que **levanta exceção** se
> qualquer número divergir — o SQL Editor só mostra a última instrução. Cada id só casa junto com o
> **caminho e o tamanho** conferidos na varredura; a trava confere que as 6 terminam `image/webp`, que
> **nada além do tipo** mudou nelas (impressão digital das outras colunas, antes e depois), que **as 26
> gerações** que citam os 6 (em `params` ou no texto compilado; 13 deram certo, 13 falharam) estão
> intactas, e que nenhuma outra linha de `assets` mudou. Rodar duas vezes é seguro. `assets` não tem
> gatilho nem `updated_at`: o UPDATE muda exatamente uma coluna. **As partes de leitura foram validadas
> pelo MCP, só leitura:** o UPDATE casaria exatamente 6 linhas.
>
> *Os metadados dos 6 objetos no Storage também dizem `image/jpeg` — ficam como estão: o dono pediu só a
> coluna de tipo, e quem manda o tipo ao provedor agora são os bytes.*
>
> **A varredura "antes", sobre os mesmos 104 de 26/09** (`harness\varredura-mime-populacao.ts`, que não
> sobrescreve a evidência de 26/09 e conta à parte os arquivos novos): **98 / 6 / 0** — o vermelho que o
> script tem de virar **104 / 0 / 0**.

#### O que a F1a entregou — 27/09, na árvore de trabalho, NÃO commitado

| peça | onde | o que faz |
|---|---|---|
| o tipo nos bytes | `src/lib/assets/image-bytes.ts` (novo, puro) | lê JPEG, PNG e WebP pelos primeiros bytes; nomeia GIF, HEIC, AVIF, BMP e TIFF para a recusa dizer o que o arquivo é; a extensão sai do tipo, nunca do nome; o veredito do servidor |
| a regra de nome | `src/lib/assets/upload-label.ts` (novo, puro) | a regra do dono de 27/09, com o instante do gesto recebido de fora — prova-se a qualquer hora, sem esperar o relógio |
| **o envio único** | `src/lib/assets/upload-client.ts` (novo) | confere o gesto inteiro **antes** do primeiro byte subir (até 5 por gesto, até 10 MB, só os três formatos — tudo ou nada), e envia: Storage, miniatura, registro. Usado pelo botão, pelo colar e pelo soltar |
| o servidor confere | `src/lib/assets/stored-head.ts` (novo) + `registerUploadedAsset` | lê os **16 primeiros bytes do objeto já no Storage**, com Range; recusa tipo fora dos três, caminho cuja extensão não é a do tipo, e bytes que desmentem o tipo declarado — *pode nomear, nunca alargar* |
| o carregador ao provedor | `src/lib/generation/asset-payloads.ts` | manda o tipo dos **bytes**; o do banco só quando os bytes não dizem nada conhecido |
| o card no canvas | `addImageInputs` em `src/lib/canvas/store.ts` | um Input de Imagem por foto, `{ assetId, kind: null, instrucao: "" }` — a forma do «Continuar deste vídeo» —, solto onde o gesto aconteceu, lado a lado, **sem fio**, selecionado |
| colar e soltar | `src/components/canvas/use-image-gestures.ts` (novo) + `flow-canvas.tsx` | Ctrl+V no canvas (nunca num campo de texto, nunca com um `<dialog>` aberto); soltar arquivo do disco; link de outra aba recusado **em palavras**, em vez de o navegador sair do canvas; arrasto que começou na própria página ignorado; o aviso mora no canvas, porque o gesto não tem bloco por onde falar |
| o botão | `reference-picker.tsx` | o `handleUpload` virou uma chamada à função única; o diálogo do sistema oferece só os três formatos |
| as frases | `t.generation.upload` em `pt-BR.ts` | **uma frase por recusa, a mesma nos três gestos**, e toda recusa de gesto termina dizendo que **nada foi enviado** |

**As provas estruturais — 37, 0 falhas** (`scratchpad\harness\prova-f1a.ts`, rodado com `TZ=America/Sao_Paulo`;
evidência em `evidencias\produto-diz-f1a\numeros-f1a-estrutural.md`). Cada uma vermelho→verde — o **HEAD
`2cb1656`**, rodado ou copiado verbatim do git, contra a árvore de trabalho:

| | hoje (HEAD) | depois (F1a) |
|---|---|---|
| WebP de verdade chamado `blusa-teste.jpg` | caminho `.jpg`, registro `image/jpeg`, Storage `image/jpeg` | `.webp`, `image/webp`, `image/webp` |
| GIF chamado `falso.png` | passa pela única conferência (`startsWith("image/")`) | recusado **antes do envio**: *«falso.png» é GIF — só entram JPEG, PNG ou WebP. Nada foi enviado.* |
| HEIC e AVIF com o tipo mentindo `image/jpeg` | — | recusados, e a frase diz o que são |
| 6 imagens num gesto | — | o gesto inteiro recusado, com o número, e **0 leituras de bytes** |
| 1 boa + 1 ruim | — | recusado **inteiro**, nomeando a ruim |
| o nome | `image.png` colada → «image» | «Colada · 26/09 23:30:05» para o instante `02:30:05Z` de 27/09 — **a hora de quem colou**, nunca a do servidor |
| o card | — | só `{assetId, instrucao, kind}`, **sem fio** (arestas 0 → 0), lado a lado, selecionado, uma revisão |
| o servidor, contra objetos **reais** do Storage | registrava sem conferir | a blusa declarada `image/jpeg` → **recusada**; como `image/webp` → aceita; 16 bytes de egress; caminho sem arquivo → recusado como erro |
| o carregador, os 6 + 2 controles | `image/jpeg` para **6 de 6** | `image/webp` para **6 de 6**, sem mexer em linha; os controles iguais nos dois; o base64 idêntico |
| o rótulo | — | os 12 leitores de `label` em `src/` são todos de exibição — nenhum no compilador, na rota de geração ou nos adapters; o Nome do produto tem **um** escritor, a digitação da pessoa |

*Uma das 37 ficou vermelha na primeira execução — e com razão: o harness achou dois leitores de `label` que
a lista não conhecia. Lidos antes de entrar na lista: um é o rótulo da **versão** da personagem
(`entity_versions`, outra tabela), o outro é a tela de linhagem de um filme. Nenhum vai a provedor.*

**Três achados** (medidos em 27/09):

1. **O `contentType` do envio era ignorado.** O `@supabase/storage-js` 2.112.2 manda um `Blob` como
   multipart, e a parte leva **o tipo do próprio Blob** — a opção `contentType` só vale para corpos que não
   são Blob. Um `File` tem o tipo que o navegador tirou da extensão. **A função única reembala os bytes num
   Blob com o tipo lido** — sem isso, o objeto continuaria gravado como `image/jpeg`.
2. **A extração de personagem tem o mesmo defeito, e com consequência:** ela manda à Anthropic o tipo que o
   navegador declarou (`extraction/actions.ts:242` e `:269`) — uma foto WebP chamada `.jpg` volta `400`,
   **antes de cobrar**. **Fora da F1a** (é caminho que cobra); o conserto é ler dos bytes que a ação já
   baixa (`:261`). Decisão do dono.
3. **O envio da imagem canônica da ficha também grava o tipo do navegador** (`canonical-images-column.tsx:120`
   → `entities/image-actions.ts:104`). Fora da F1a. O carregador que lê os bytes já protege o provedor; o
   registro fica errado até alguém decidir.

**O que falta — a validação ao vivo, que espera o navegador.** Em 27/09 a aba de `localhost:5599` abriu no
**perfil do Chrome de outro cliente**, onde outro Claude Code trabalhava; o dono a fechou. **Nada foi feito
no navegador** — nenhum projeto, nenhum envio. Para retomar, **depois da liberação do dono** (regra
«Navegador» do `CLAUDE.md`), no perfil do projeto e com a aba logada como o usuário do projeto:

1. o dev na 5599 servindo este código (`netstat`), e `/login` respondendo 200;
2. um projeto novo, **«Teste F1a — colar e soltar»** — o «Projeto teste Foto da Blusa» é o controle da F3 e
   não se toca;
3. **o botão**: um WebP chamado `.jpg` → no banco `image/webp`, caminho `.webp`, rótulo = o nome;
4. **soltar** 1 arquivo → o card no ponto do soltar, lido **do store** e do DOM (`medir-canvas.js`);
5. **colar** sem nome → «Colada · dd/mm hh:mm:ss» no banco, conferido contra a hora do navegador; colar com
   nome → o nome;
6. **6 de uma vez** e **GIF chamado `.png`** → a frase no canvas e **0** assets novos no banco;
7. colar **num campo de texto** → nenhum card; **link** arrastado → a frase, nenhum envio;
8. **o Ctrl+V de verdade** — imagem posta na área de transferência do Windows (o dono autorizou) e a tecla
   no canvas; se a automação não reproduzir, o dono testa esse item à mão;
9. recarregar → os cards persistem (autosave);
10. **screenshots com nome** em `evidencias\produto-diz-f1a\`, e os números no resumo.

**Sem commit do código até a prova fechar** (pedido do dono, 27/09).

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

   **E a lista de produto nasce com Haiku e 3.7 Flash** (decisão do dono, 26/09): a linha
   `gemini-3.7-flash` — hoje só `text_gen` — ganha `extraction` e o preço da leitura (**4 ⚡ é a
   referência do dono**, contra a qual a F0 mede o custo real); as linhas **`gemini-2.5-flash` e
   `gemini-2.5-pro` de `extraction` ficam inativas** — o Flash voltou 404 para esta conta, e o Pro só
   volta à lista depois de medido.

   **O padrão RAISE EXCEPTION, nas três camadas em que a casa já o usa:**
   - **a função recusa com frase e código** — `raise exception '…' using errcode = 'EX00N'`, como
     `record_extraction` e `record_montage`: cada recusa vira uma frase na tela, e nenhuma vira
     *"erro inesperado"*;
   - **o que um CHECK não alcança vira trigger que recusa** — como *"video prices belong to models
     with the video_gen capability"* (`20260813170000_fal_video_catalog.sql:172`): marcar como padrão
     de produto um modelo sem `extraction` é recusado pelo banco, não lembrado pelo app;
   - **e a migration confere o que vai instalar e o que instalou:** levanta exceção — e o `db push`
     para ali, dizendo por quê — se o padrão da lista de produto não for **exatamente um** modelo,
     de `extraction`, a **4 ⚡**, ou **se for o Sonnet**, **ou se alguma das duas linhas 2.5 de
     `extraction` continuar ativa**. *"Sonnet nunca é padrão para produto"* deixa de ser frase e vira
     condição para a migration existir.

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
5. **`pricing.ts` já tem o 3.7 Flash**, com as duas faixas de tarifa (até 31/12/2026 e depois), em
   `TEXT_PRICES_USD_PER_MTOK` — a leitura usa essa tarifa, **somando o pensamento à saída**: é como o
   Google cobra, e o campo vem separado (`total_thought_tokens`). *(A §4.7 previa acrescentar o 2.5
   Flash e o Pro; os dois saíram da lista.)*
6. **A ação da leitura.** O navegador **nomeia** projeto, card, foto e modelo; o servidor **decide**
   tudo o que custa: o preço do catálogo, o dono da foto, **o saldo antes da chamada**, a chamada, o
   **Zod na resposta** (`nome` até 120 caracteres, cada descrição até 2.000, nada vazio — o que não
   passa é falha, **e falha é grátis**) e **uma** chamada à função que grava e cobra. Devolve o
   texto, o id da leitura, o cobrado e o saldo. **E o tipo da foto é lido nos bytes, nunca no
   banco** — achado da F0: a foto da blusa é WebP registrada como JPEG, e a Anthropic recusa a
   divergência com 400.
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
| F1.3 | a ordem da ação | provedor falso, sem rede: saldo antes da chamada; recusa e falha gravadas a 0 ⚡; sucesso = **uma** chamada à função; preço do catálogo **mesmo que o navegador mande outro número**; foto de outro usuário recusada; **foto WebP registrada como JPEG vai com o tipo dos bytes** (a de 07/09 é uma) |
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
| leitura por Haiku, no harness | F0 | Claude, **depois do ok do dono** | 4 ⚡ | **não** — fora do produto. **Feita na rodada 3 (contrato v0): 2 centavos reais** (rodadas 1 e 2 recusadas antes de gerar, 0) |
| **segunda** leitura por Haiku, contrato v2 — pedida pelo dono em 26/09 | F0 | Claude, com o pior caso declarado antes | 4 ⚡ | **não** — **feita na rodada 4: 2 centavos reais** |
| leitura por Gemini 3.7 Flash, no harness *(era o 2.5 Flash)* | F0 | Claude, **depois do ok do dono** | 4 ⚡ | **não** — **feita na rodada 5 (27/09): 3 centavos reais** (a rodada 2 voltou `402`, 0) |
| **segunda** leitura por 3.7 Flash — o lado a lado, decidido em 26/09 | F0 | Claude, com o R1 escrito antes | 4 ⚡ | **não** — **feita na rodada 5: 2 centavos reais** |
| **terceira** leitura por Haiku (a 2ª no contrato v2) — o lado a lado | F0 | Claude, com o R1 escrito antes | 4 ⚡ | **não** — **feita na rodada 5: 2 centavos reais** |
| leitura pelo botão | F1 | **dono** | 4 ⚡ | **sim** |
| ↻ da cena 2 | F3 | **dono** | 75 ⚡ | **sim** |
| **pior caso** | | | **99 ⚡ de preço** *(eram 87; +4 da 2ª leitura do Haiku na rodada 4, +8 das duas a mais do lado a lado)* | **79 ⚡ da carteira — não mudou** — saldo **3.190 → 3.111** |

*O custo real da F0 inteira, somado: **11 centavos** — 2 + 2 (rodadas 3 e 4) + 3 + 2 + 2 (rodada 5) —, e
**0 Spark**: saldo 3.190, conferido no banco em 27/09.*

*Conferido no catálogo em 26/09:* `claude-haiku-4-5` a **4 ⚡** por extração; `gemini-3.1-flash-image`
a **75 ⚡** em 2K. *O `gemini-3.7-flash` entrou no lugar do 2.5 Flash com **4 ⚡ de referência do dono**
— a linha de `extraction` dele nasce na F1.*

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
8. **O Google recusa gerar (`402`)** — medido na F0, 26/09: a consulta passa, a geração não. É
   cobrança do lado do Google, e **a mesma chave desenha a imagem e escreve o Roteiro**: enquanto ela
   estiver assim, **a F3 não acontece**, e talvez a produção também não gere. *A recusa não cobra
   Spark — mas também não entrega nada.*
9. **A leitura pode inventar para quem a peça é** — medido na F0: o Haiku passou o gabarito e ainda
   assim escreveu *"infantil"* numa foto sem escala. Uma palavra de público ou de tamanho (*infantil*,
   *plus size*, *masculino*) no começo da descrição **muda a peça que o modelo desenha**. A decisão é do
   dono, antes do padrão.

---

## 9. As respostas do dono — 26/09/2026

| # | pergunta | **resposta** |
|---|---|---|
| 9.1 | A Instrução de hoje vira a Descrição? | ✅ **Sim — um campo só.** O card fica **Nome · Fotos · Descrição**; os cards antigos mantêm o texto, sob o nome novo |
| 9.2 | O Nome entra no texto? | ✅ **Só quando a Descrição estiver vazia** — cobre o card de 07/09, que era exatamente nome cheio e descrição vazia |
| 9.3 | O Google acende também a leitura de personagem? E o 2.5 Pro? | ✅ **Personagem, não. O Gemini 2.5 Pro entra na lista de produto, sim** — 🔁 **revista em 26/09, depois da F0:** o 2.5 Flash voltou 404 e o Pro **sai da lista até ser medido**; a lista nasce com **Haiku e 3.7 Flash** |
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
