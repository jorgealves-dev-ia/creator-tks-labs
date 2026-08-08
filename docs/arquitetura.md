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

**Como um modelo novo entra.** Duas coisas, e só elas: uma entrada em `config/models.json` (catálogo, provedor e preço) e um adapter em `lib/providers/`. Nunca espalhado pelo resto do código.

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

**O quê.** Proporções e resoluções por canal (Instagram, Facebook, TikTok, YouTube, Display Ads) vivem em `config/format-presets.json`. O catálogo de modelos, provedores e preços vive em `config/models.json`. Nunca hardcoded em componentes.

**Por quê.** Preço de modelo muda e formato de canal muda — e nenhuma das duas coisas é mudança de comportamento do produto. Como dado, ajustar é editar um arquivo JSON; como código espalhado por componentes, vira uma varredura em busca de todos os lugares onde alguém escreveu `1080` ou `0.04`.

**Estado atual:** os dois arquivos **ainda não existem** — `src/config/` só tem um `.gitkeep`. Eles entram quando a Fase 1 precisar do primeiro modelo e do primeiro preset.

---

### Decisão 7 — Conteúdo e política dos provedores

**O quê.** Duas regras:

1. **Personagens são 100% sintéticos.** Não implementar face swap de pessoas reais.
2. **Recusa de política de conteúdo do provedor é erro esperado**, não bug: mensagem clara para o usuário e fallback configurável para outro modelo.

**Por quê.** A primeira é uma linha ética e legal que o produto não cruza. A segunda é realismo operacional: modelos recusam gerações por política com alguma frequência, e tratar isso como exceção não prevista produz tela de erro genérica e usuário sem saber o que fazer.

**Um caso concreto já especificado.** A geração canônica do character sheet (turnaround e folha de expressões) usa traje de banho, que é território onde modelos recusam. A resposta especificada: abrir o prompt com a moldura técnica de *character reference sheet* — linguagem que comunica finalidade de estudo de silhueta, sem termo sugestivo — e, se ainda assim houver recusa ou degradação, refazer **uma única vez** com compressão esportiva opaca, registrando o fallback no histórico e mostrando na interface. Sem surpresa silenciosa. Ver seções 5.22 e regra de compilação nº 10 em [`character-sheet.md`](./character-sheet.md).

---

## 4. Modelo de dados

**Postgres no Supabase, RLS habilitado em todas as 9 tabelas, com política default-deny.**

### O que "default-deny" significa aqui

Com RLS ligado e nenhuma política que case, o Postgres **nega** a operação. Não existe política permissiva de fallback. Cada política abre exatamente uma operação, para exatamente o usuário dono da linha. Além disso, os privilégios são revogados de `anon` em todas as tabelas: **nada neste produto é público**. A `service_role` ignora RLS e é usada apenas por código de servidor.

Verificado na Fase 0: sem sessão, as 9 tabelas respondem `42501 permission denied`.

### As 9 tabelas

| Tabela | O que guarda |
|---|---|
| `profiles` | dados do usuário, 1:1 com `auth.users` |
| `wallets` | saldo em centavos, um por usuário |
| `ledger_transactions` | append-only: depósitos, débitos, estornos e ajustes (`amount_cents`, `cost_real_cents`, `cost_charged_cents`, `generation_id`, `kind`) |
| `projects` | as "abas": nome, status agregado (`idle`/`generating`/`generated`/`error`), ordenação |
| `workflows` | o grafo do canvas por projeto — `graph jsonb` no formato React Flow (nodes + edges + viewport), com `version` |
| `entities` | entidades mencionáveis por `@`: `kind` (character/product/scene/outfit/accessory), `handle` (único por usuário), `sheet jsonb`, `version`, `cover_asset_id` |
| `entity_images` | join entre `entities` e `assets`: as imagens canônicas de uma entidade (turnaround, expressões), com `role` e ordenação |
| `assets` | arquivos no Storage: `kind` (image/video/audio), `source` (upload/generation), mime, dimensões, duração |
| `generations` | cada execução: workflow/node de origem, provedor, modelo, `params jsonb`, `prompt_user_pt`, `prompt_compiled jsonb`, status, custos, `result_asset_id`, erro |

Sobre `entities.project_id`: **nulo = a entidade vale em todos os projetos do usuário**; preenchido = escopo daquele projeto. O `handle` é um slug minúsculo, único por usuário, validado por constraint no formato `^[a-z0-9][a-z0-9_-]{0,47}$`.

### Invariantes garantidas pelo banco, não pelo código do app

Esta é a linha divisória mais importante da arquitetura: as regras abaixo **não dependem de o código lembrar de cumpri-las**.

- Cadastro cria automaticamente `profiles` + `wallets` (trigger em `auth.users`)
- Criar um projeto cria automaticamente seu `workflows` — **1 projeto = 1 workflow** (trigger + constraint `unique` em `project_id`)
- `ledger_transactions` recusa UPDATE e DELETE por trigger — vale inclusive para a service role
- `wallets.balance_cents` é projeção do ledger: só muda por trigger de INSERT, e saldo negativo é bloqueado por constraint
- `generations` e `ledger_transactions` são **somente-leitura** para o usuário autenticado; escrita apenas por código de servidor com service role
- Storage: bucket privado `assets`, caminho `<user_id>/…`, políticas casam a primeira pasta com o dono
- Realtime habilitado em `projects` e `generations` — e o Realtime respeita RLS, então um inscrito só recebe as próprias linhas

### Concorrência do canvas

`workflows.version` incrementa a cada salvamento e serve de **controle otimista de concorrência**: o UPDATE só passa se a versão que o browser tinha ainda for a atual. Duas abas editando o mesmo projeto não sobrescrevem uma à outra em silêncio.

O grafo é validado com Zod **nas duas direções**: do browser para a server action, e do `jsonb` de volta para a aplicação. O banco guarda `jsonb` — o Zod é quem garante que aquilo tem o formato que o React Flow espera.

### Versionamento de entidades — pendente

O modelo de versionamento está **definido na especificação** ([`character-sheet.md`](./character-sheet.md), seções 2 e 9): snapshots completos do JSON, coluna indicando a versão ativa, acesso a versão específica por `@handle@vN` e reaproveitamento dos IDs de imagens que não mudaram entre versões.

**A implementação no banco está pendente**, planejada para a fase do character sheet (Fase 2). O schema atual tem apenas uma coluna `entities.version integer` — não existe ainda tabela de versões nem coluna de versão ativa. Isso é intencional, não uma divergência: a seção 9 do `character-sheet.md` coloca a mecânica de versionamento explicitamente fora do escopo daquele documento.

### Regra de mudança de schema

**Toda alteração de schema é um arquivo novo em `supabase/migrations/`** (criado com `supabase migration new <nome>`), aplicado com `supabase db push`. Nunca pelo painel do Supabase. Assim toda escrita fica versionada, revisável e reversível no git.

Depois de aplicar, **regerar** `src/lib/supabase/database.types.ts` a partir do banco real — não escrever esse arquivo à mão.

As 9 migrations existentes, em ordem de dependência:

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
```

---

## 5. Estrutura de pastas (alvo)

```
src/
  app/                    # rotas (App Router)
    api/
      generations/        # criar e consultar gerações
      webhooks/           # callbacks dos provedores (validação de segredo obrigatória)
  components/
    canvas/               # canvas, header de abas, sidebar, minimapa
    nodes/                # um componente por tipo de node
    ui/                   # primitivas de UI
  lib/
    providers/            # adapters (interface GenerationProvider)
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

# Provedores de IA — somente servidor
GOOGLE_AI_API_KEY=
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
FAL_KEY=
ELEVENLABS_API_KEY=

# Webhooks
FAL_WEBHOOK_SECRET=            # segredo gerado por nós, validado em app/api/webhooks/
```

Em produção, os mesmos nomes vivem nas Environment Variables da Vercel, marcadas como *Sensitive*. As variáveis públicas são validadas com Zod na importação, em `lib/env.ts` — falta de variável quebra no boot, não no meio de um fluxo do usuário.

---

## 7. Segurança

As 9 regras de segurança são **inegociáveis** e vivem no `CLAUDE.md` na raiz, porque precisam estar diante do Claude Code em toda sessão. Não são repetidas aqui para não existirem em duas versões que podem divergir.

O resumo em uma linha: segredo nunca no git, `SUPABASE_SERVICE_ROLE_KEY` só no servidor, RLS default-deny em tudo, webhook valida segredo antes de processar, chamada a provedor de IA só no servidor.
