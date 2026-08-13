# Arquitetura — Creator TKS Labs

> **Quando consultar este arquivo:** antes de qualquer mudança estrutural — novo provedor de IA, mudança de schema, novo fluxo de geração, decisão sobre onde um dado mora. As 7 decisões abaixo são **invariantes**: violar qualquer uma exige decisão explícita registrada em [`decisoes.md`](./decisoes.md).
>
> O `CLAUDE.md` na raiz guarda a versão curta dessas invariantes. **Aqui está o porquê de cada uma** — e o porquê vale mais que o quê, porque é ele que diz se a decisão ainda faz sentido quando o contexto mudar.

---

## 1. Infraestrutura

| Serviço | Detalhe |
|---|---|
| **GitHub** | `jorgealves-dev-ia/creator-tks-labs` (repositório privado), branch `master` |
| **Supabase** | projeto `ogkobcsakbnmvazvvllq` (plano Free) — por enquanto é o único ambiente, ou seja, **produção** |
| **Vercel** | projeto importado do GitHub, deploy automático a partir da branch `master` |
| **Conta** | única nos três serviços: jorgealvesdevia@gmail.com |

Não existe ambiente de staging. Toda migration aplicada vai direto para o banco que a aplicação usa — daí a regra de que schema só muda por arquivo de migration versionado, nunca pelo painel.

---

## 2. Stack

| Camada | Escolha | Versão no `package.json` |
|---|---|---|
| Framework | Next.js (App Router) | `16.3.0` |
| Linguagem | TypeScript strict | `^5` |
| UI | React | `19.2.8` |
| Estilo | Tailwind CSS | `^4` |
| Canvas de nodes | `@xyflow/react` (React Flow) | `^12.11.2` |
| Estado do canvas | Zustand | `^5.0.14` |
| Validação | Zod (em todas as fronteiras) | `^4.4.3` |
| Backend/dados | Supabase — Postgres com RLS, Auth, Storage, Realtime | `@supabase/supabase-js ^2.112.2`, `@supabase/ssr ^0.12.4` |
| CLI de migrations | Supabase CLI | `^2.112.0` (devDependency) |
| Hospedagem | Vercel | — |
| Modelos de IA | camada de adapters própria | ver Decisão 2 |

### Duas particularidades desta versão do Next.js

O `AGENTS.md` na raiz avisa: esta versão do Next.js tem mudanças que quebram convenções antigas. Duas já apareceram no código:

- **`cookies()` é assíncrono** — os clients do Supabase em `lib/supabase/` seguem o padrão `@supabase/ssr` com um client por request
- **O middleware virou `proxy`** — o arquivo é `src/proxy.ts`, não `middleware.ts`. Ele renova a sessão e separa rotas públicas de privadas, com um matcher que exclui assets estáticos e `api/webhooks`

Ao mexer nessa camada, ler o guia em `node_modules/next/dist/docs/` antes — não confiar em memória de versões anteriores.

---

## 3. As 7 decisões de arquitetura

### Decisão 1 — Geração é sempre assíncrona

**O quê.** Nunca aguardar uma geração dentro de um request HTTP. O fluxo é:

```
API route valida saldo e cria registro em `generations` (status queued)
        ↓
dispara o job no provedor, passando uma URL de webhook de retorno
        ↓
o webhook atualiza o registro e ingere o asset
        ↓
Supabase Realtime propaga o status para o canvas e para a bolinha da aba
```

**Por quê.** Função serverless tem tempo máximo de execução; geração de imagem e principalmente de vídeo estoura esse limite. Segurar o request até o modelo responder produziria timeout — e, pior, um timeout que perde o resultado que o provedor já cobrou. Registrando a geração *antes* de disparar o job, o registro sobrevive independentemente do que aconteça com a conexão HTTP.

O comentário na tabela `generations` guarda essa regra dentro do próprio banco: *"Generation is always asynchronous: a server route creates the row as queued, the provider webhook updates it, and Realtime pushes the status to the canvas."*

**Consequência prática.** A interface nunca fica "travada esperando". O canvas se inscreve no Realtime e reage à mudança de status. Como o Realtime respeita RLS, cada usuário só recebe as próprias linhas.

---

### Decisão 2 — Camada de adapters de provedores

**O quê.** Nenhum código de produto chama API de modelo diretamente. Tudo passa pela interface `GenerationProvider`, em `lib/providers/`.

**Por quê.** O mercado de modelos de IA muda mais rápido que o produto. Um modelo que hoje só existe via agregador amanhã ganha API direta (mais barata); um agregador some ou muda de preço. Com adapter, trocar agregador por API direta — ou vice-versa, **modelo a modelo** — não toca em nada fora de `lib/providers/`. Sem adapter, essa troca vira uma caçada por chamadas espalhadas pelo código.

**Provedores iniciais:**

| Provedor | Papel | Forma de acesso |
|---|---|---|
| `google` | Nano Banana / Gemini — imagem | direto na fonte |
| `openai` | GPT Image — imagem | direto na fonte |
| `fal` | Kling (vídeo/motion control), Seedance (vídeo) e demais modelos | **agregador** |
| `elevenlabs` | voz / lipsync | direto na fonte |
| `anthropic` | Claude — compilação de prompt e extração de descrições (**não gera mídia**) | direto na fonte |

**O critério de acesso — direto ou por agregador.** A escolha é por modelo, e a regra é esta:

- **API direta** quando o desenvolvedor do modelo oferece **conta de desenvolvedor viável** — caso de Google, OpenAI, Anthropic, ElevenLabs e xAI.
- **Agregador de infraestrutura (`fal.ai`)** quando o acesso direto tem **fricção real** — caso de Kling e Seedance, que exigiriam contas de desenvolvedor chinesas e pacotes de créditos.

**Por quê agregador é aceitável.** Porque um agregador de infraestrutura chama **os mesmos modelos oficiais**. O princípio "pegar direto na fonte" nunca vetou infraestrutura: o que ele veta são **revendedores de camada de produto** (ex.: Higgsfield), que empacotam modelos com margem e limitações próprias. A distinção é essa — infraestrutura repassa o modelo; camada de produto reembala o modelo.

> Nota para não confundir: Higgsfield aparece em [`produto.md`](./produto.md) como **referência visual de UX**, junto com Weavy e Freepik Spaces. Isso é outra coisa — como provedor de modelos, está vetado pela regra acima.

**Como um modelo novo entra.** Duas coisas, e só elas: uma entrada no catálogo (provedor, modelo e preço) e um adapter em `lib/providers/`. Nunca espalhado pelo resto do código.

#### O catálogo mora no banco, não em JSON

A Decisão 6 previa `config/models.json`. Quando o primeiro consumidor real apareceu — o motor de extração —, o catálogo nasceu em **duas tabelas do Postgres** (`ai_providers` e `ai_models`) em vez de um arquivo. O motivo está registrado como decisão E1 em [`decisoes.md`](./decisoes.md): o catálogo é exatamente o que o futuro painel super admin vai gerenciar, e um painel não edita arquivo do repositório. Preço de modelo passa a mudar por SQL, sem deploy.

O que **não** vai para o banco é a chave secreta (decisão E5). O catálogo guarda apenas **o nome da variável de ambiente** que a contém (`ai_providers.env_var_name`); a chave vive em `.env.local` no desenvolvimento e nas Environment Variables da Vercel em produção. O que atravessa para o navegador é um **status**, calculado no servidor — nunca a chave, nunca o nome da variável. Nenhuma coluna, log ou resposta de API jamais contém uma credencial. A trava é de compilação, não de disciplina: `lib/providers/keys.ts` — o único lugar do código que lê uma chave — importa `server-only`, então qualquer componente de tela que o importe, direto ou por cadeia, **quebra o build**.

`config/format-presets.json` continua sendo arquivo: proporção de canal não é coisa que um painel administrativo precise editar.

#### A camada adaptadora, na prática

`lib/providers/types.ts` declara as interfaces; `lib/providers/registry.ts` mapeia o slug do fornecedor para o adaptador; `lib/providers/anthropic.ts` é a primeira implementação. O produto conversa só com a interface, então fornecedor novo é arquivo novo mais uma linha no registry.

São **quatro interfaces**, uma por capacidade, e não uma só com métodos opcionais — porque um fornecedor pode perfeitamente saber ler uma foto e ainda não saber desenhar uma:

| Interface | Capability | Implementações |
|---|---|---|
| `ExtractionProvider` | `extraction` | `anthropic.ts` |
| `TranslationProvider` | `translation` | `anthropic.ts` — plumbing interna do compilador, sem preço e sem seletor |
| `ImageGenerationProvider` | `image_gen` | `google.ts` (Nano Banana Pro / Nano Banana 2) |
| `VideoGenerationProvider` | `video_gen` | `fal.ts` (Kling 2.1 standard image-to-video) |

**A quarta é a primeira assíncrona, e por isso tem outra forma.** As três de cima devolvem **o resultado**, porque cabe no request. `VideoGenerationProvider` devolve **um número de protocolo** — `submitVideo` enfileira e volta na hora, `readWebhook` lê o retorno assinado, `checkVideo` pergunta à fila do provedor e `downloadVideo` traz o arquivo antes de o link deles expirar. A invariante 1 inteira mora nessa diferença de formato.

E ela se parte em dois arquivos, o que as outras não precisaram: `fal-queue.ts` guarda a mecânica **do fornecedor** — fila, assinatura ED25519, status, download — e não sabe o que é Kling; `fal.ts` guarda o mapeamento de entrada e o leitor de saída **do modelo**, e mesmo esses são tabela. É o que sustenta o critério declarado no ciclo: *um segundo modelo da fal é uma linha em `ai_models` mais, no máximo, uma entrada em `ENDPOINT_OVERRIDES` — nunca uma mudança no motor.* Esse mapa nasceu **vazio**, e o vazio é a afirmação de que o contrato padrão da fal cobre o Kling inteiro.

`lib/providers/google.ts` usa o **SDK oficial** `@google/genai`, que cobre a Interactions API a partir da 2.3.0 — mesmo padrão do `@anthropic-ai/sdk`, e a fonte mais confiável dos formatos, já que os tipos do pacote são a documentação. Ele **não repete tentativa**: uma geração repetida é uma segunda imagem faturada pelo Google, que não tem como saber que a primeira pode ter dado certo do lado dele. A única retentativa do produto é o fallback de traje do §5.22, que é decisão de uma camada acima, registrada no histórico e visível na tela.

`lib/ai/catalog.ts` lê o catálogo **por capacidade**. Extração e geração de imagem fazem a mesma pergunta às mesmas duas tabelas e diferem em exatamente três detalhes — qual capability filtrar, qual coluna de preço responde, e qual registro sabe se existe adaptador. Os três vivem numa tabela só nesse arquivo, em vez de em duas cópias da mesma consulta: uma cópia que errasse um deles não falharia alto, ofereceria um modelo pelo preço da outra capacidade.

Um fornecedor é **usável** quando as duas coisas valem: existe adaptador no registry *e* existe chave no servidor. As duas falham por motivos diferentes, então `extractionProviderStatus()` devolve **qual** falhou — `ready`, `missing_key` ou `no_adapter` — e o seletor diz a verdade correspondente: "(sem chave)" para o que o usuário pode resolver hoje, "(em breve)" para o que só nós podemos. Um fornecedor cuja chave já foi configurada nunca é mandado configurá-la.

Fornecedor inutilizável aparece apagado, nunca escondido: o usuário vê o caminho adiante em vez de uma lista curta e inexplicada.

**Modelo no catálogo ou funciona, ou não fica selecionável.** Antes de um modelo entrar habilitado, ele é exercitado com uma chamada real — Sonnet, Opus e Haiku foram, em 08/08/2026.

`lib/ai/pricing.ts` guarda os preços por token e o câmbio aproximado, e é o que produz `extractions.real_cost_cents`. Câmbio é constante comentada de propósito: cotação viva faria duas extrações idênticas registrarem custos diferentes, que é justamente o ruído que arruinaria a calibração.

---

### Decisão 3 — Ingestão de assets no Supabase Storage

**O quê.** Todo resultado de geração é imediatamente copiado para o Supabase Storage e registrado na tabela `assets`. Nunca persistir URL externa como fonte definitiva. Nunca usar localStorage/IndexedDB como armazenamento principal.

**Por quê.** As URLs que os provedores devolvem são **temporárias e expiram**. Guardar essa URL como fonte da verdade significa que a imagem some do projeto do usuário dias depois, sem aviso e sem como recuperar — o provedor já apagou. Copiar na hora é o único momento em que o arquivo garantidamente existe.

O comentário na tabela `assets` registra a regra: *"Every file lives in Supabase Storage. Provider URLs expire, so results are copied here immediately and an external URL is never the source of truth."*

**Como está montado.** Bucket privado `assets`, com limite de 50 MB por arquivo (teto do plano Free — subir quando o plano mudar). O caminho segue a convenção `<user_id>/…` e as políticas de Storage comparam o **primeiro segmento da pasta** com o dono. Isso faz o isolamento entre usuários ser uma propriedade do caminho, não uma checagem que alguém pode esquecer de escrever.

---

### Decisão 4 — Prompt duplo: PT-BR → JSON em inglês

**O quê.** O usuário escreve em PT-BR (salvo em `prompt_user_pt`). Antes de gerar, um passo de compilação (Claude, modelo econômico) traduz e estrutura em JSON em inglês (`prompt_compiled`), resolvendo as menções `@` para as características das entidades. O JSON final é salvo na geração e exibido — editável — no node de resultado.

**Por quê.** Três coisas ao mesmo tempo:

1. **O usuário escreve na língua dele**, sem precisar pensar em inglês nem em formato.
2. **O modelo recebe estrutura, não prosa.** O JSON compilado é o formato que o modelo de imagem espera.
3. **A geração fica reproduzível e auditável.** O `prompt_compiled` salvo é o registro histórico: mesmo que a `@julia` evolua para a v5, dá para saber exatamente com que características cada imagem antiga foi gerada. É a "receita" — daí ele ser visível e editável no node de resultado.

**Onde a IA entra e onde não entra.** Isso é crítico para a consistência de personagem: as opções de lista fechada do character sheet usam **frases fixas em inglês, copiadas literalmente de um dicionário de constantes** — nunca re-traduzidas por IA a cada geração. A IA só traduz e harmoniza os campos livres e monta o JSON final. Ver a regra de compilação nº 7 em [`character-sheet.md`](./character-sheet.md#6-regras-de-compilação-do-prompt).

#### O compilador, na prática (09/08/2026)

`lib/prompt/compile.ts` é **função pura**: sem rede, sem relógio, sem aleatoriedade. O mesmo sheet produz o mesmo prompt hoje e daqui a um ano — é isso que torna uma imagem reproduzível a partir do `prompt_compiled` guardado, e o que permite o editor recompilar a cada tecla de graça.

Isso levanta um problema e o resolve num lugar só: os campos livres estão em português e precisam chegar em inglês, mas uma função pura não pode ir buscar tradução. A saída é o **cache no envelope** — quando o autosave grava, uma chamada barata traduz os campos livres e guarda `detalhes_en`, `descricao_en`, `regra_en` ao lado do texto que os gerou. O compilador só lê.

A regra que sustenta o cache é uma frase: **mudou o português, morre a tradução.** Ela vive em `syncTranslationCache()`, chamada pelo `updateSheet` da store — por onde toda edição do aplicativo passa. Um componente não pode honrá-la e outro esquecê-la, porque nenhum dos dois precisa lembrar dela.

A ação de tradução **não escreve no banco**: o rascunho tem um escritor só (`saveCharacterDraft`, movido pelo autosave), e um segundo escritor disputaria com a digitação do usuário o direito à última palavra. Ela devolve o que traduziu, a store aplica, e o autosave seguinte persiste. O ciclo fecha sozinho — cache cheio não tem nada pendente.

`lib/prompt/canonical.ts` embrulha o bloco de identidade na moldura de reference sheet e na instrução da vista (§4.2 e §4.3 de [`geracao-canonica.md`](./geracao-canonica.md)). As receitas são um `Record` indexado pela união dos slots do dicionário, então **slot novo sem prompt é erro de compilação**, não algo a lembrar.

#### A compilação de canvas (09/08/2026)

`lib/prompt/canvas.ts` é o segundo consumidor do compilador, e o momento em que o `@` é finalmente gasto. Também é função pura: o português chega já traduzido, pelo mesmo motivo que os campos livres do sheet chegam traduzidos — uma função que pode ir buscar palavras é uma função cujo resultado depende do dia em que rodou.

A ordem do texto é fixa: **estilo → bloco de identidade → âncora → cena → diretivas das referências → restrições**. Estilo primeiro porque governa como tudo depois dele é desenhado (regra 11); restrições por último, sempre (regra 5).

**A regra do diretor é a parte que não pode ser afrouxada.** Havendo texto no prompt, os padrões de Camada 2 do sheet **e o traje canônico** ficam de fora. O traje canônico é traje de banho — existe para a folha de referência mostrar silhueta e proporção — e deixá-lo sobreviver numa cena que o usuário dirigiu colocaria um biquíni num café que ninguém pediu. A regra bloqueia a **injeção silenciosa do sistema**, nunca a intenção do usuário: dirigir "vestindo este biquíni" funciona, e é caso de uso central (provador de moda praia).

Prompt vazio com `@` faz o oposto — a personagem nos padrões dela, traje canônico incluído —, e a interface avisa isso **antes** do clique, porque 100 ⚡ não podem virar surpresa.

Um detalhe que parece pequeno e não é: a menção é **retirada do texto da cena** antes de a regra decidir qual metade roda. `@luna` digitado sozinho não é direção de cena, é o pedido "mostra ela"; tratá-lo como texto mandaria o tradutor traduzir um handle e pularia os padrões que o usuário estava pedindo.

**A numeração das referências e a ordem dos bytes saem da mesma função.** `buildCanvasPrompt` devolve o texto e a lista ordenada de `asset_id`; a ação carrega os arquivos nessa ordem. Duas peças de código decidindo a mesma ordem é como "the product shown in reference image 2" acaba apontando para a imagem três.

Cada referência carrega, além da diretiva, uma **cláusula fixa de fidelidade** por tipo — e o `@` com folha carrega a de identidade. Elevam a taxa de acerto; não a garantem, e isso está escrito no código: nenhum prompt torna um modelo de imagem determinístico.

#### Do bloco ao Resultado

Geração de canvas é **síncrona** nesta fase (decisão N5), pelo mesmo motivo da canônica: uma imagem cabe no `maxDuration` de 60. O caminho é o provado — saldo antes da chamada, Storage → `assets` → cobrança, e a imagem cai antes se a cobrança falhar.

**Quantidade 1–4 é síncrona paralela, e é uma rota, não uma Server Action** *(10/08/2026, revisão parcial da N5).* Pedir quatro imagens dispara **quatro requisições independentes** — cada uma com a sua linha em `generations`, o seu débito no ledger e o seu jeito de falhar. Não existe "geração em lote" no servidor: o endpoint sabe fazer uma imagem, e quatro é o navegador pedindo quatro vezes ao mesmo tempo.

Ser rota (`app/api/generations/canvas/route.ts`) é o que torna isso verdade. A documentação do Next é explícita: **não usar `Promise.all` para paralelizar Server Actions no cliente** — elas passam pelo ciclo de renderização do React e são serializadas, então quatro chamadas de trinta segundos virariam dois minutos em fila. A postura de segurança é a mesma que uma Server Action já tinha, porque é a mesma: endpoint público dos dois jeitos, sessão relida do cookie, corpo validado por Zod, RLS em toda leitura e preço vindo do catálogo por `record_generation`. Sem segredo compartilhado, porque é o usuário chamando o próprio estúdio com a própria sessão — os endpoints de `app/api/webhooks` é que não têm cookie de ninguém para conferir.

Uma consequência que valeu uma linha no proxy: rota sob `/api/` sem sessão passa a receber **401 em JSON**, não o redirect 307 para `/login`. Um redirect é a resposta certa para quem digitou um endereço e a errada para um `fetch`, que o segue e recebe o HTML da tela de login com status 200 — fazendo uma sessão expirada em aba aberta chegar ao canvas como "erro inesperado" em vez da única frase que resolve.

O sucesso cria um **node Resultado** ligado à saída do bloco. Ele guarda apenas `assetId` e `generationId`: URL assinada expira, e um grafo salvo não pode carregar um endereço que morre amanhã (Decisão 3). A ligação de volta — Resultado → bloco de geração — **é** o anexo de uma referência: o fio é o gesto, a lista dentro do node é o estado, e cortar o fio desfaz o anexo. Duas formas de anexar (a galeria e o fio), um lugar só onde o que está anexado mora.

`generations` guarda de onde veio: `project_id`, `node_id`, `prompt_user_pt` e o `prompt_compiled` estruturado. O `workflow_id` é **derivado do projeto** dentro de `record_generation`, não aceito do chamador — um projeto tem um workflow só, então quem pudesse nomear os dois só poderia fazê-los discordar.

---

### Decisão 5 — Dinheiro em centavos inteiros de BRL

**O quê.** Toda a contabilidade interna é `integer` de centavos — a unidade indivisível do real. **Spark ⚡ é apenas unidade de exibição.** Taxa atual: **1 Spark = 1 centavo** (`CENTS_PER_SPARK = 1`, definido em um único lugar: `lib/sparks/`).

Cada geração grava dois valores: `cost_real_cents` (o que o provedor cobrou) e `cost_charged_cents` (o que foi debitado do usuário). Hoje iguais; a margem futura mora na diferença entre eles. O preço de negócio será definido na fase de monetização, quando o produto abrir a terceiros.

**Por quê separar as duas contas.** Porque o dia em que existir margem, ela é uma mudança de valor, não de estrutura. Nenhuma migration, nenhuma reescrita de histórico. O comentário na coluna registra: *"Equal to cost_real_cents today; carries the margin later."*

**Por quê o ledger é append-only.** O histórico financeiro nunca pode ser reescrito. Uma correção é sempre uma **nova transação de estorno**, jamais um UPDATE. E isso não é uma convenção que o código promete cumprir — é uma **trava por trigger no banco**, que vale inclusive para a service role. O comentário da tabela diz: *"Never UPDATE or DELETE a row: a correction is a new reversal transaction. Enforced by trigger below, so the rule holds even for the service role."*

A única exceção prevista: a exclusão da conta. Durante o cascade, a linha em `auth.users` já não existe mais — e é exatamente esse o sinal de que o delete é legítimo, e não alguém reescrevendo história.

**Por quê o saldo é projeção do ledger.** `wallets.balance_cents` nunca é escrito diretamente: só muda por trigger de INSERT no ledger. Isso torna impossível o saldo divergir do histórico. E o saldo negativo é bloqueado por constraint — se um débito estouraria o saldo, a constraint aborta a transação inteira e **a linha do ledger também não é escrita**. Não existe estado intermediário inconsistente.

---

### Decisão 6 — Presets de formato data-driven

**O quê.** Proporções e resoluções por canal (Instagram, Facebook, TikTok, YouTube, Display Ads) vivem em `config/format-presets.json`. O catálogo de modelos, provedores e preços vive em **três tabelas do banco** (`ai_providers`, `ai_models`, `ai_model_image_prices`). Nunca hardcoded em componentes.

**Por quê.** Preço de modelo muda e formato de canal muda — e nenhuma das duas coisas é mudança de comportamento do produto. Como dado, ajustar é editar uma linha; como código espalhado por componentes, vira uma varredura em busca de todos os lugares onde alguém escreveu `1080` ou `0.04`.

**Correção de rota registrada.** Esta decisão dizia `config/models.json`. Quando o catálogo ganhou seu primeiro consumidor real, nasceu **no banco** — motivo em [`decisoes.md`](./decisoes.md), decisão E1: é o catálogo que o futuro painel super admin vai gerenciar, e painel não edita arquivo do repositório. O princípio "data-driven, nunca hardcoded" é o mesmo; só o lugar do dado mudou, e mudou para onde ele pode ser editado sem deploy. Ver a subseção *O catálogo mora no banco, não em JSON* na Decisão 2.

**Estado atual:** o catálogo de IA está no banco e semeado. `config/format-presets.json` **ainda não existe** — entra quando a Fase 1 precisar do primeiro preset de canal.

---

### Decisão 7 — Conteúdo e política dos provedores

**O quê.** Duas regras:

1. **Personagens são 100% sintéticos.** Não implementar face swap de pessoas reais.
2. **Recusa de política de conteúdo do provedor é erro esperado**, não bug: mensagem clara para o usuário e fallback configurável para outro modelo.

**Por quê.** A primeira é uma linha ética e legal que o produto não cruza. A segunda é realismo operacional: modelos recusam gerações por política com alguma frequência, e tratar isso como exceção não prevista produz tela de erro genérica e usuário sem saber o que fazer.

**Um caso concreto já especificado.** A geração canônica do character sheet (turnaround e folha de expressões) usa traje de banho, que é território onde modelos recusam. A resposta especificada: abrir o prompt com a moldura técnica de *character reference sheet* — linguagem que comunica finalidade de estudo de silhueta, sem termo sugestivo — e, se ainda assim houver recusa ou degradação, refazer **uma única vez** com compressão esportiva opaca, registrando o fallback no histórico e mostrando na interface. Sem surpresa silenciosa. Ver seções 5.22 e regra de compilação nº 10 em [`character-sheet.md`](./character-sheet.md).

---

## 4. Modelo de dados

**Postgres no Supabase, RLS habilitado em todas as 15 tabelas, com política default-deny.**

### O que "default-deny" significa aqui

Com RLS ligado e nenhuma política que case, o Postgres **nega** a operação. Não existe política permissiva de fallback. Cada política abre exatamente uma operação, para exatamente o usuário dono da linha. Além disso, os privilégios são revogados de `anon` em todas as tabelas: **nada neste produto é público**. A `service_role` ignora RLS e é usada apenas por código de servidor.

Verificado na Fase 0: sem sessão, as 9 tabelas de então respondiam `42501 permission denied`. A décima (`entity_versions`) segue o mesmo padrão e é verificada junto com a migration que a cria.

### As 16 tabelas

| Tabela | O que guarda |
|---|---|
| `profiles` | dados do usuário, 1:1 com `auth.users` |
| `wallets` | saldo em centavos, um por usuário |
| `ledger_transactions` | append-only: depósitos, débitos, estornos e ajustes (`amount_cents`, `cost_real_cents`, `cost_charged_cents`, `generation_id`, `kind`) |
| `projects` | as "abas": nome, status agregado (`idle`/`generating`/`generated`/`error`), ordenação |
| `workflows` | o grafo do canvas por projeto — `graph jsonb` no formato React Flow (nodes + edges + viewport), com `version` |
| `entities` | a **identidade** mencionável por `@`: `kind` (character/product/scene/outfit/accessory), `handle` (único por usuário), `sheet jsonb` (o **rascunho vivo**), `active_version_id` (o ponteiro da versão ativa), `archived_at`, `cover_asset_id` |
| `entity_versions` | os **snapshots congelados** do sheet: `entity_id`, `user_id`, `version_number` (sequencial por entidade), `sheet jsonb` (cópia integral, nunca um diff), `label` |
| `project_entities` | o **vínculo** projeto ↔ personagem: quais personagens trabalham em qual aba. PK `(project_id, entity_id)` — o par *é* a linha —, `user_id` desnormalizado e duas FKs compostas que o compartilham. Projeto novo nasce sem vínculos; excluir projeto leva os vínculos e **não** as personagens |
| `entity_images` | join entre `entities` e `assets`: as imagens de uma entidade — as canônicas de uma personagem (turnaround, expressões) e as **fotos de um produto** —, com `role` e ordenação |
| `assets` | arquivos no Storage: `kind` (image/video/audio), `source` (upload/generation), mime, dimensões, duração, `label` (nome humano — o nome do arquivo enviado ou as palavras do prompt; alimenta a galeria e a busca dela, e é nulo para tudo que nasceu antes dela) |
| `generations` | cada execução: workflow/node de origem, `entity_id`, `model_id`, provedor, modelo, `media_kind` (image/video), `params jsonb`, `prompt_user_pt`, `prompt_compiled jsonb`, status, `provider_job_id` (o protocolo do provedor assíncrono), tokens, `cost_real_cents`, `sparks_charged`, `result_asset_id`, `entity_version_id`, `sheet_source`, `summary jsonb`, `error_message`. **`media_kind` é explícito e não derivado de `result_asset_id`**: uma linha `queued` ainda não tem asset e uma `failed` nunca terá, e são esses dois estados que a tela mais precisa saber desenhar |
| `ai_providers` | catálogo de fornecedores de IA: `slug`, `display_name`, `env_var_name` (**qual variável guarda a chave — nunca a chave**), `enabled`, ordenação |
| `ai_models` | catálogo de modelos: `provider_id`, `slug` (o identificador oficial na API do fornecedor — **e, na fal, esse identificador é a própria rota do endpoint**, o que faz um modelo novo dela caber numa linha desta tabela sem tocar no motor), `capabilities text[]` (`{extraction}`, `{translation}`, `{image_gen}`, `{video_gen}`), `extraction_sparks`, `image_sparks` (preço-base, de quem não nomeia tamanho), `is_default`, `enabled` |
| `ai_model_image_prices` | preço em Sparks por **resolução** (`model_id`, `image_size`, `sparks`, ordenação) — e, por consequência, **quais resoluções cada modelo oferece**: não se oferece um tamanho que não se sabe cobrar. Lida por `record_generation` para decidir o preço e pela tela para desabilitar as opções indisponíveis com o motivo à vista |
| `ai_model_video_prices` | preço em Sparks por **modelo × duração × resolução** (`model_id`, `duration_seconds`, `resolution`, `sparks`, `real_cost_cents`, ordenação) — e, pela mesma lógica da irmã de imagem, **quais durações cada modelo oferece**: é a ausência de uma linha de 10s que trava a v1 do vídeo em 5 segundos, não uma constante na tela. Guarda também `real_cost_cents`, o que a de imagem não faz, porque o custo de vídeo é determinístico por segundo — fato de catálogo em vez de conta de tokens, e por isso margem conferível linha a linha contra a fatura |
| `extractions` | o diário do motor de extração: `entity_id`, `model_id`, `source` (photo/text), `status`, tokens consumidos, `real_cost_cents`, `sparks_charged`, `reference_asset_id` (a foto lida), `source_text` (o texto colado), `summary jsonb` (o placar) |

O `handle` é um slug minúsculo, **único por usuário**, validado por constraint no formato `^[a-z0-9][a-z0-9_-]{0,47}$`.

#### A personagem é do usuário; o vínculo é do projeto *(11/08/2026, Etapa D2)*

`entities` teve uma coluna `project_id` da Fase 0 até aqui, com a semântica "nulo = vale em todos os projetos". Ela **nunca foi usada** — todas as linhas nulas — e foi derrubada em `20260811140000_project_entities.sql`, porque escopo por projeto numa coluna de `entities` é uma armadilha medida: o FK era `on delete cascade`, `deleteProject` apaga de verdade, e a cascata levaria a personagem → suas `entity_versions` → todas as `generations` em que ela apareceu → deixando `ledger_transactions.generation_id` (que é `set null`) como **débitos órfãos num livro append-only**.

O modelo correto já estava escrito no resto do schema: `entities_handle_unique_per_user` faz do `handle` um nome do **usuário**. Não existem duas `@luna`. Logo "esta personagem trabalha neste projeto" só pode ser uma tabela de ligação — `project_entities`.

A consequência de produto vem junto e é o coração da etapa: **desvincular não é arquivar**. Desvincular é leve e reversível (ela segue viva na galeria e nos outros projetos); arquivar continua sendo o ato global que preserva tudo. Duas ações, dois pesos, duas UIs.

E `entities.cover_asset_id`, que existia desde a Fase 0 sem nenhum leitor, ganhou o papel que estava esperando: é o **avatar** da personagem — sobreposição opcional ao retrato padrão, que continua sendo a folha completa da versão ativa. Fica em `entities` e não em `entity_versions` de propósito: avatar é apresentação, não identidade, e congelar uma versão nova não muda a cara dela.

#### Produto é uma entidade, não uma tabela nova *(10/08/2026)*

Um **produto** é uma linha de `entities` com `kind = 'product'`; suas fotos são linhas de `entity_images` (`role = 'foto'`, ordem em `sort_order`) apontando para `assets` comuns; sua instrução padrão vive em `entities.sheet` como `{"instrucao_padrao": "…"}`, lida com Zod na fronteira. O enum `entity_kind` **já carregava `'product'` desde a Fase 0** — a fundação foi desenhada prevendo isto.

A alternativa avaliada e recusada era criar `products` + `product_images`. O reuso ganha em cinco frentes ao mesmo tempo: o RLS default-deny e o `revoke from anon` já existem e já foram verificados; as fotos são `assets` normais e portanto aparecem na galeria e obedecem às proteções de sempre; o futuro painel admin lê uma tabela de entidades e filtra por `kind`; `entity_versions` já é chaveada por `entity_id`, então versionar um produto no futuro não pede fundação nova; e o `handle` já é único por usuário, então **`@produto` nasce no mesmo namespace das personagens** — que é a única forma de um namespace funcionar. O custo assumido é justamente esse compartilhamento: um produto "Biquíni" e uma personagem `@biquini` colidem, e a criação resolve com sufixo numérico.

Uma única regra precisou de migration: **um produto guarda no máximo 5 fotos**, por trigger em `entity_images` (`20260810160000_product_images_limit.sql`). Não é preferência de tela — cada foto ocupa uma vaga de referência do modelo, e é o que faz o bloco de geração poder dizer "4 de 6" antes do clique. Um produto que crescesse em silêncio transformaria essa frase em recusa da API depois de o dinheiro estar em risco.

Um produto é **arquivado, nunca apagado** (`archived_at`), pelo mesmo motivo das personagens. Tirar uma foto de um produto remove o **vínculo** em `entity_images`, nunca o `asset`: a foto continua na galeria e nas gerações que já a usaram.

A coluna `entities.version` (Fase 0) está **obsoleta**: foi substituída por `entity_versions.version_number` + `entities.active_version_id`. Ficou no schema com um `COMMENT` de deprecação, para remoção numa migration futura.

### Invariantes garantidas pelo banco, não pelo código do app

Esta é a linha divisória mais importante da arquitetura: as regras abaixo **não dependem de o código lembrar de cumpri-las**.

- Cadastro cria automaticamente `profiles` + `wallets` (trigger em `auth.users`)
- Criar um projeto cria automaticamente seu `workflows` — **1 projeto = 1 workflow** (trigger + constraint `unique` em `project_id`)
- `ledger_transactions` recusa UPDATE e DELETE por trigger — vale inclusive para a service role
- `wallets.balance_cents` é projeção do ledger: só muda por trigger de INSERT, e saldo negativo é bloqueado por constraint
- `generations` e `ledger_transactions` são **somente-leitura** para o usuário autenticado; escrita apenas por código de servidor com service role
- Storage: bucket privado `assets`, caminho `<user_id>/…`, políticas casam a primeira pasta com o dono
- Realtime habilitado em `projects` e `generations` — e o Realtime respeita RLS, então um inscrito só recebe as próprias linhas
- `entity_versions` recusa UPDATE e DELETE por trigger — uma versão salva é um retrato congelado. Como consequência, apagar fisicamente uma entidade que tenha versões também falha: entidade se arquiva (`archived_at`), nunca se deleta
- `entity_versions.version_number` é atribuído **pelo banco**, sob bloqueio da linha da entidade, com `UNIQUE (entity_id, version_number)` de rede de segurança — dois salvamentos simultâneos jamais produzem dois "v3"
- `entities.active_version_id` usa **FK composta** `(active_version_id, id) → entity_versions (id, entity_id)`: é o banco que impede o `@julia` de apontar, por bug, para uma versão da `@carla`
- `project_entities` usa a **mesma técnica** para a posse: as duas FKs compostas — `(project_id, user_id) → projects (id, user_id)` e `(entity_id, user_id) → entities (id, user_id)` — compartilham a coluna `user_id`, então é o Postgres que recusa, sozinho, um vínculo entre o projeto de um usuário e a personagem de outro. Sem trigger, sem código que precise lembrar. E as duas são `on delete cascade`: excluir o projeto leva os vínculos junto, e a cascata de exclusão de conta (LGPD) leva os dois lados
- Imagem citada no bloco `imagens_canonicas` de qualquer versão **não pode ser deletada** (trigger em `entity_images`) — deletá-la quebraria um retrato congelado. Imagem referenciada só pelo rascunho continua deletável
- Um produto guarda **no máximo 5 fotos** (trigger em `entity_images`) — o número que o bloco de geração conta em voz alta ao dizer "4 de 6", porque cada foto ocupa uma vaga de referência do modelo
- Salvar versão é **atômico**: a função `public.save_entity_version(entity_id, label)` faz o INSERT do retrato e o UPDATE do ponteiro ativo na mesma transação. Ou as duas escritas acontecem, ou nenhuma — nunca um `@julia` apontando para o retrato errado
- Registrar e cobrar uma extração é **atômico e com preço do catálogo**: `public.record_extraction(...)` grava a linha em `extractions` e insere o débito no ledger na mesma transação, lendo o preço de `ai_models.extraction_sparks` — a função **não aceita valor do chamador**, porque quem pudesse dizer o preço poderia dizer zero. É `security definer` e valida a posse da personagem contra `auth.uid()`, o que faz esta feature inteira **não precisar da service role**. Recusa com `EX001` (saldo insuficiente), `EX002` (personagem não é do chamador) e `EX003` (modelo não habilitado para extração). Falha da API grava `status = 'failed'` e não cobra — garantido também por constraint
- Registrar e cobrar uma **geração** é atômico pelo mesmo desenho: `public.record_generation(...)` é a gêmea da anterior, trava a carteira com `for update`, debita só no sucesso e recusa com `GN001` / `GN002` / `GN003` / `GN004` / `GN005`. O preço sai do catálogo em dois níveis: de `ai_model_image_prices` quando a chamada **nomeia um tamanho**, e de `ai_models.image_sparks` quando não nomeia (a geração canônica). Nomear um tamanho não é nomear um preço — e um tamanho sem linha de preço é **recusado** (`GN005`), nunca cobrado pelo preço-base, senão pedir 4K e pagar 2K seria possível. `generations` já era somente-leitura para o usuário desde a Fase 0, então esta função é o único caminho por onde uma linha nasce — que é o que a torna o único lugar capaz de decidir um preço
- **Vídeo é assíncrono, e por isso a cobrança se parte em duas funções** *(13/08/2026)*. `public.submit_video_generation(...)` cria a linha como `queued` **antes** de a fal ser chamada e **não cobra nada** — confere o saldo só para a recusa ser barata, pela mesma regra que a fila de imagens deixou escrita: *fila é intenção, ledger é fato*. `public.attach_video_job(...)` guarda o `request_id` e as URLs que a fal devolveu, e passa a linha para `running`. `public.complete_video_generation(...)` é quem cobra, e só quando existe vídeo. Recusam com `VD001`–`VD007`
- **A conclusão é idempotente por `for update`, não por convenção** — a fal reentrega até **31 vezes** quando o endpoint não responde 2xx, então duas entregas da mesma geração são o caso normal. A trava serializa entregas **simultâneas**, não só repetidas: a segunda espera, encontra a linha terminal e devolve sem tocar em nada. Sem ela, duas transações leriam `running` juntas e escreveriam dois débitos pelo mesmo vídeo, num livro onde a correção é um estorno e não um DELETE. O índice **único** em `(provider, provider_job_id)` é a mesma garantia pelo outro lado
- **`complete_video_generation` é a primeira função concedida só à `service_role`** — o webhook chega sem sessão nenhuma, então `auth.uid()` é nulo e o `user_id` vem da própria linha. Concedê-la a `anon` deixaria qualquer um marcar uma geração como concluída, então o `EXECUTE` é revogado de todos e devolvido só àquele papel
- **Saldo que acaba durante a geração marca `failed` e não levanta exceção.** Levantar desfaria a transação inteira, a linha ficaria `running`, o webhook responderia 500 e as 31 reentregas receberiam o mesmo erro — um node preso para sempre. O vídeo existe do lado da fal e foi pago por nós; o usuário não recebe nem paga. É raro por construção, porque o saldo é conferido na submissão
- Preço e capacidade andam juntos por constraint: `('image_gen' = any(capabilities)) = (image_sparks is not null)`, gêmea da que já valia para `extraction_sparks`. Sem ela, uma linha mal cadastrada daria imagens de graça ou ofereceria um modelo que a função de cobrança não sabe precificar — e imagem custa dinheiro de verdade por clique
- O catálogo de IA (`ai_providers`, `ai_models`, `ai_model_image_prices`, `ai_model_video_prices`) tem `SELECT` para `authenticated` e **nenhuma política de escrita**: nesta fase se gerencia por SQL direto, depois pelo painel admin. Dois triggers gêmeos recusam preço de imagem para modelo sem `image_gen` e preço de vídeo para modelo sem `video_gen` — o espelho, entre tabelas, do CHECK que já existia dentro de `ai_models`. `extractions` tem só leitura do próprio usuário — as linhas são escritas exclusivamente pela função acima

**A exceção comum a todas as travas de apagamento**: quando a linha correspondente em `auth.users` já não existe, o delete passa. É o sinal de que se trata da cascata de exclusão de conta, e não de reescrita de história. O cadeado protege o passado; não impede o usuário de apagar a própria conta (LGPD). O padrão nasceu na `reject_ledger_delete` e vale hoje para o ledger, para `entity_versions` e para `entity_images`.

### Concorrência do canvas

`workflows.version` incrementa a cada salvamento e serve de **controle otimista de concorrência**: o UPDATE só passa se a versão que o browser tinha ainda for a atual. Duas abas editando o mesmo projeto não sobrescrevem uma à outra em silêncio.

O grafo é validado com Zod **nas duas direções**: do browser para a server action, e do `jsonb` de volta para a aplicação. O banco guarda `jsonb` — o Zod é quem garante que aquilo tem o formato que o React Flow espera.

### Versionamento de entidades

Especificação completa: [`versionamento-entidades.md`](./versionamento-entidades.md). O resumo:

Três coisas que não moram juntas — a **identidade** (`entities`: o handle, o nome, o dono), os **retratos congelados** (`entity_versions`: v1, v2, v3…, que nunca mudam) e o **rascunho vivo** (`entities.sheet`, editado à vontade). "Salvar como nova versão" é fotografar o rascunho e emoldurar o quadro; o quadro ninguém mais altera, o caderno segue aberto.

`@julia` resolve para a versão ativa através de `entities.active_version_id`. `@julia@v2` busca o quadro específico. Rollback é mover o ponteiro — nada se apaga, nada se reescreve; evoluir a partir de uma versão antiga gera uma versão **nova**, nunca uma reescrita.

Três regras de comportamento que o banco não consegue garantir sozinho, e que a aplicação deve cumprir:

- **Versão nasce de intenção, não de clique** — só o botão explícito "Salvar como nova versão" cria versão. O histórico é o diário de evolução da personagem, não um log de teclas
- **Menção `@` nunca resolve para o rascunho** — sempre para versão congelada. Entidade sem nenhuma versão salva não pode ser mencionada
- **Geração a partir do rascunho é permitida, mas marcada** — `generations.sheet_source = 'draft'`, exibida no histórico como não reproduzível

**Salvar versão é uma função no banco, não uma rota de API.** `public.save_entity_version(p_entity_id, p_label)` insere o retrato congelado e move o ponteiro ativo na mesma transação. O cliente do Supabase não abre transação: uma rota faria duas idas ao servidor, e uma falha entre elas deixaria uma versão órfã ou o ponteiro no lugar errado. A função é `security invoker` (o RLS continua valendo), tira o retrato do próprio `entities.sheet` e recusa com código próprio nos três casos que a interface precisa distinguir — `CT001` rascunho idêntico à versão ativa, `CT002` personagem arquivada, `CT003` personagem inexistente. Ativar versão antiga **não** precisa de função: a FK composta já garante que o ponteiro só aceita versão da própria entidade, então um UPDATE simples é seguro por construção.

**Imagens canônicas.** O arquivo vai do browser direto para o Storage — mandá-lo por este servidor dobraria o tráfego sem ganho, e as políticas do bucket já prendem cada usuário à própria pasta. Caminho: `<user_id>/entities/<entity_id>/<slot>-<uuid>.<ext>`. Só a escrituração (linha em `assets`, vínculo em `entity_images` com `role` = o slot, e a URL assinada de curta duração) passa por server action. O id gravado no sheet é o `asset_id`.

Remover uma imagem **tenta** o delete em vez de prever se alguma versão depende dela: o trigger de 4.3 é a autoridade sobre essa pergunta, e perguntar direto a ele nunca diverge do que ele de fato impede. Recusa não é falha — significa que o arquivo sustenta um retrato congelado, e a interface diz isso em português claro.

A tela está especificada em [`tela-character-sheet.md`](./tela-character-sheet.md) e implementada. O diff visual entre versões continua fora de escopo, conforme a seção 6 da especificação.

### Regra de mudança de schema

**Toda alteração de schema é um arquivo novo em `supabase/migrations/`** (criado com `supabase migration new <nome>`), aplicado com `supabase db push`. Nunca pelo painel do Supabase. Assim toda escrita fica versionada, revisável e reversível no git.

Depois de aplicar, **regerar** `src/lib/supabase/database.types.ts` a partir do banco real — não escrever esse arquivo à mão.

As 18 migrations existentes, em ordem de dependência:

```
20260807140000_core_foundation.sql             helper updated_at, profiles, wallets, trigger de cadastro
20260807140100_projects_and_workflows.sql      abas, grafo do canvas, invariante 1 projeto = 1 workflow
20260807140200_assets_and_entities.sql         assets, entities (@handle), entity_images
20260807140300_generations.sql                 execuções, custos, prompt compilado
20260807140400_ledger.sql                      append-only por trigger, saldo como projeção
20260807140500_storage_assets_bucket.sql       bucket privado, políticas por pasta do dono
20260807140600_enable_realtime.sql             publicação de projects e generations
20260807150000_revoke_trigger_function_execute.sql   tira EXECUTE das funções de gatilho
20260807160000_index_foreign_keys.sql          índices de cobertura nas FKs
20260807170000_entity_versions.sql             versões de entidade, ponteiro ativo e travas
20260807180000_index_active_version_fk.sql     índice de cobertura da FK composta do ponteiro
20260807190000_save_entity_version.sql         salvar versão + mover ponteiro numa transação só
20260808184059_ai_catalog_and_extractions.sql  catálogo de IA, diário de extrações, cobrança atômica
20260809005226_calibrate_extraction_price.sql  preço do Sonnet calibrado com custo real
20260809120000_translation_capability.sql      capability de tradução dos campos livres
20260809140000_image_generation_catalog.sql    capability image_gen, preços e record_generation
20260809180000_record_generation_canvas.sql    origem no canvas e o português original do usuário
20260809200000_asset_label.sql                 nome humano no asset, para a galeria e sua busca
```

> **Nota de ambiente.** O `supabase link` está com bug nesta máquina, então a connection string vai explícita na linha de comando. O Jorge aplica manualmente:
>
> ```bash
> npx supabase db push --db-url "<connection string do Session pooler>"
> ```
>
> Use a string do **Session pooler (IPv4)** do painel. A *Direct connection* é IPv6 e falha nesta rede — é o erro mais provável se o push não conectar.

---

## 5. Estrutura de pastas (alvo)

```
src/
  app/                    # rotas (App Router)
    page.tsx              # `/` — o dashboard: a porta da frente depois do login
    studio/               # `/studio?p=<id>` — o canvas (é aqui que mora o maxDuration)
    login/
    auth/callback/
    api/
      generations/        # criar e consultar gerações
      webhooks/           # callbacks dos provedores (validação de segredo obrigatória)
  components/
    dashboard/            # a concha do vestíbulo — cartões de projeto, galeria geral, conta
    canvas/               # canvas, header de abas, sidebar, minimapa
    character-sheet/      # editor em overlay, wizard, selos, versões, imagens
    nodes/                # um componente por tipo de node
    ui/                   # primitivas de UI
  lib/
    ai/                   # preços por token e câmbio: o custo real de uma chamada
    character-sheet/      # dicionário PT↔EN, schema Zod do sheet, campos, diff
    entities/             # personagens: actions, store, autosave do rascunho
    extraction/           # motor: contrato, prompt, validação, aplicação, action
    providers/            # adapters (ExtractionProvider, GenerationProvider) e leitura de chaves
    supabase/             # clients (server/browser) e helpers
    prompt/               # compilação PT → JSON EN, resolução de @
    sparks/               # conversão centavos ↔ Sparks, débito/estorno
  config/
    format-presets.json   # proporções e resoluções por canal
    models.json           # catálogo de modelos, provedores e preços
supabase/
  migrations/
docs/                     # esta documentação
.claude/
  settings.json           # guardrails de permissão do Claude Code (commitado)
.mcp.json                 # MCPs Supabase (read-only) e Vercel — OAuth, sem segredos (commitado)
.env.example              # placeholders (commitado)
.env.local                # segredos reais (gitignored, editado apenas pelo Jorge)
```

---

## 6. Variáveis de ambiente

```
# Supabase — Settings → API do painel
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=     # SOMENTE servidor — ignora RLS

# Provedores de IA — somente servidor.
# O nome de cada uma está registrado em ai_providers.env_var_name; a existência
# da variável é o que faz o fornecedor aparecer aceso no seletor de modelos.
GEMINI_API_KEY=                # em uso: geração de imagem (Nano Banana Pro / 2)
OPENAI_API_KEY=
ANTHROPIC_API_KEY=             # em uso: motor de extração e tradução
XAI_API_KEY=
FAL_KEY=                       # em uso: geração de vídeo (Kling, via fila)
ELEVENLABS_API_KEY=

# Webhooks
FAL_WEBHOOK_URL=               # URL absoluta e pública do nosso endpoint de retorno
```

**Sobre a `FAL_WEBHOOK_URL`, e por que ela é variável em vez de derivada do request** *(13/08/2026)*. Ela precisa ser absoluta e alcançável da internet. Derivá-la do `x-forwarded-host`, como o `siteOrigin()` da autenticação faz, produziria `http://localhost:3000` em desenvolvimento — uma URL que a fal nunca alcança, e que falharia **em silêncio**, com o trabalho enfileirado e nenhum retorno. Sendo variável, a ausência dela é detectável: a submissão é recusada antes de gastar.

Ela carrega também o **Protection Bypass for Automation** da Vercel como query param. O projeto está com *Vercel Authentication* ligada em `all_except_custom_domains` e **não tem domínio customizado**, então produção e previews respondem a tela de login da Vercel a qualquer POST de fora — e a fal trata `3xx` como falha permanente, sem retry. O bypass é o método que a própria documentação da Vercel indica para webhook de terceiro. Ele **não é a fechadura**: passa só pela borda da Vercel, e o endpoint continua exigindo a assinatura ED25519 da fal. É por isso que o segredo pode viver numa URL guardada no sistema de outra empresa.

> **É ponte, não solução definitiva.** No dia em que `creatortkslabs.com.br` for plugado na Vercel, o bypass deixa de ser necessário **por natureza** — a proteção é `all_except_custom_domains`, e um domínio customizado simplesmente não passa por ela.

**Não existe `FAL_WEBHOOK_SECRET`** *(correção de 13/08/2026)*. Ela esteve nesta lista descrita como "segredo gerado por nós", escrita antes de alguém ler a mecânica da fal — e **a fal não oferece segredo compartilhado: ela assina**. Cada entrega traz `X-Fal-Webhook-Signature` (ED25519), verificável contra o JWKS público deles. A regra 5 da segurança pede "assinatura **ou** segredo compartilhado", e a assinatura é o que este produto usa.

Em produção, os mesmos nomes vivem nas Environment Variables da Vercel, marcadas como *Sensitive*. As variáveis públicas são validadas com Zod na importação, em `lib/env.ts` — falta de variável quebra no boot, não no meio de um fluxo do usuário.

---

## 7. Segurança

As 9 regras de segurança são **inegociáveis** e vivem no `CLAUDE.md` na raiz, porque precisam estar diante do Claude Code em toda sessão. Não são repetidas aqui para não existirem em duas versões que podem divergir.

O resumo em uma linha: segredo nunca no git, `SUPABASE_SERVICE_ROLE_KEY` só no servidor, RLS default-deny em tudo, webhook valida segredo antes de processar, chamada a provedor de IA só no servidor.
