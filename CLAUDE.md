# CLAUDE.md — Creator TKS Labs

> Este arquivo orienta o Claude Code em todas as sessões. Leia-o antes de qualquer mudança estrutural e mantenha-o atualizado quando decisões de arquitetura mudarem. Ele é a fonte de verdade do projeto.

## O que é este produto

Creator TKS Labs é um estúdio de criação de conteúdo com IA baseado em **canvas infinito de nodes** (referências visuais: Weavy, Freepik Spaces, Higgsfield), para gerar imagens, vídeos e influencers de IA com consistência de personagem, focado em criativos para Instagram, TikTok/TikTok Shop, Shopee, YouTube e anúncios.

Princípio de UX inegociável: **poder de profissional, simplicidade de leigo.** O usuário nunca vê complexidade técnica (samplers, VAE, latents). Nodes têm nomes de intenção: "Input de Produto", "Motion Control", "Gerar Imagem".

Funcionalidades-chave:

- Abas de projetos independentes no topo do canvas (header flutuante translúcido), cada uma com seu workflow salvo e indicador de status pulsante (gerando / gerado / erro)
- Sidebar lateral recolhível (expande ao aproximar o mouse) com o arsenal de nodes
- Nodes conectáveis: inputs tipados (produto, cenário, roupa, acessório, pose, imagem/vídeo de referência) → nodes de geração → nodes de resultado
- Entidades mencionáveis por `@` (ex.: `@julia`): character sheets de influencers de IA, produtos, cenários — digitou `@` num campo de prompt, abre modal com as entidades do fluxo atual
- Prompt duplo: usuário escreve em PT-BR; o sistema compila para JSON estruturado em inglês antes de gerar; o JSON final fica visível e editável no node de resultado (é a "receita" reproduzível)
- Carteira de créditos (**Sparks ⚡**) com ledger de custo real vs. custo cobrado
- Vídeo: image-to-video, Motion Control (clonagem de movimento de vídeo de referência), lipsync/voz, e continuação de narrativa a partir do último frame do vídeo anterior

## Infraestrutura do projeto

- **GitHub**: `jorgealves-dev-ia/creator-tks-labs` (repositório privado)
- **Supabase**: projeto `ogkobcsakbnmvazvvllq` (plano Free) — por enquanto é o único ambiente (produção)
- **Vercel**: projeto importado do GitHub, deploy automático a partir da branch `main`
- **Conta única** nos três serviços: jorgealvesdevia@gmail.com

## Segurança (inegociável)

1. **Nenhum segredo no código nem no git.** Segredos vivem em `.env.local` (gitignored) no desenvolvimento e nas Environment Variables do painel da Vercel (marcadas como *Sensitive*) em produção. O `.env.example` contém apenas placeholders.
2. **`SUPABASE_SERVICE_ROLE_KEY` ignora RLS** — uso exclusivo em código de servidor. Nunca em variável `NEXT_PUBLIC_*`, nunca em componente client, nunca em log, nunca em resposta de API. A `ANON_KEY` é pública por design e protegida pelo RLS.
3. **Claude Code não lê nem imprime segredos.** A leitura de `.env*` está bloqueada em `.claude/settings.json`. Nunca ecoar valores de variáveis de ambiente no terminal, em commits ou em arquivos.
4. **RLS obrigatório em todas as tabelas**, com política default-deny: nada é acessível sem política explícita.
5. **Webhooks validam segredo antes de processar.** Todo endpoint em `app/api/webhooks/` verifica assinatura ou segredo compartilhado (`FAL_WEBHOOK_SECRET`) e rejeita requisições inválidas com 401.
6. **Chamadas a provedores de IA acontecem exclusivamente no servidor.** Nenhuma chave de provedor trafega para o browser.
7. **GitHub com secret scanning + push protection ativados.** Se um segredo vazar em commit, a resposta é rotacionar a chave imediatamente — apagar o commit não basta.
8. **Dependências**: lockfile sempre commitado; rodar `npm audit` ao adicionar dependências; desconfiar de pacotes obscuros ou recém-publicados.
9. **Nunca colar chaves reais em chats, prompts ou issues.** Manuseio de valores de segredo é tarefa manual do Jorge, por design.

## Ferramentas conectadas e autonomia

O Claude Code opera com autonomia guiada através de:

- **MCP Supabase** (`.mcp.json`): servidor remoto oficial, autenticado por OAuth, **escopado ao projeto e em modo read-only permanente**. Uso: inspecionar schema, consultar dados, ler logs, verificar advisors de segurança/performance. **Escrita no banco NUNCA acontece via MCP.**
- **Escrita no banco = migration + CLI.** Toda alteração de schema é um arquivo novo em `supabase/migrations/` (criado com `supabase migration new <nome>`), aplicado com `supabase db push`. Assim, toda escrita fica versionada, revisável e reversível no git.
- **MCP Vercel** (`.mcp.json`): servidor remoto oficial, OAuth. Uso: inspecionar deployments, ler build logs, diagnosticar falhas de deploy.
- **GitHub via `gh` CLI e git**: commits, push, criação de PRs e issues. Credencial no gerenciador de credenciais do sistema, nunca em arquivo.

**Pode fazer sem perguntar**: ler e editar código do repositório; rodar dev/build/lint/typecheck/testes; criar arquivos de migration; commits e push na branch de trabalho; consultas read-only via MCP; ler logs.

**Sempre perguntar antes**: aplicar migrations no banco (`supabase db push`); criar/alterar/remover env vars na Vercel; deletar qualquer recurso remoto; merge para `main`; adicionar dependência nova; qualquer ação irreversível.

**Bloqueado** (via `.claude/settings.json`): ler `.env*`, force push, comandos destrutivos em massa, reset do banco.

## Stack

- **Framework**: Next.js (App Router) + TypeScript strict
- **UI**: Tailwind CSS
- **Canvas de nodes**: `@xyflow/react` (React Flow)
- **Estado do canvas**: Zustand
- **Backend/dados**: Supabase (Postgres com RLS, Auth, Storage, Realtime)
- **Hospedagem**: Vercel
- **Validação**: Zod em todas as fronteiras (API routes, webhooks, formulários)
- **Modelos de IA**: via camada de adapters (ver Decisão 2)

## Decisões de arquitetura (fundamentais — não violar)

1. **Geração é sempre assíncrona.** Nunca aguardar uma geração dentro de um request HTTP (timeout de serverless). Fluxo: API route valida saldo e cria registro em `generations` (status `queued`) → dispara o job no provedor com webhook de retorno → o webhook atualiza o registro e ingere o asset → Supabase Realtime propaga o status para o canvas e para a bolinha da aba.

2. **Camada de adapters de provedores.** Nenhum código de produto chama API de modelo diretamente. Tudo passa pela interface `GenerationProvider` em `lib/providers/`. Isso permite trocar agregador por API direta (ou vice-versa) por modelo, sem tocar no resto do app. Provedores iniciais:
   - `google` — Nano Banana / Gemini (imagem, direto na fonte)
   - `openai` — GPT Image (imagem, direto na fonte)
   - `fal` — Kling (vídeo/motion control), Seedance (vídeo) e demais modelos agregados
   - `elevenlabs` — voz/lipsync (direto na fonte)
   - `anthropic` — Claude para compilação de prompt e extração de descrições (NÃO gera mídia)

3. **Ingestão de assets.** URLs retornadas pelos provedores são temporárias e expiram. Todo resultado é imediatamente copiado para o Supabase Storage e registrado em `assets`. Nunca persistir URL externa como fonte definitiva. Nunca usar localStorage/IndexedDB como armazenamento principal.

4. **Prompt duplo PT → EN/JSON.** O usuário escreve em PT-BR (`prompt_user_pt`). Antes da geração, um passo de compilação (Claude, modelo econômico) traduz e estrutura em JSON em inglês (`prompt_compiled`), resolvendo menções `@` para as características das entidades. O JSON final é salvo na geração e exibido no node de resultado.

5. **Dinheiro em centavos de BRL.** Toda contabilidade interna em `integer` de centavos. **Spark ⚡** é apenas unidade de exibição (taxa de conversão configurável). Cada geração grava `cost_real_cents` (o que o provedor cobrou) e `cost_charged_cents` (o que foi debitado do usuário) — hoje iguais, no futuro com margem. O ledger é append-only: nunca fazer UPDATE/DELETE em transações; correções são novas transações de estorno.

6. **Presets de formato data-driven.** Proporções e resoluções por canal (IG, FB, TikTok, YouTube, Display Ads) vivem em `config/format-presets.json`. O catálogo de modelos e preços vive em `config/models.json`. Nunca hardcoded em componentes.

7. **Conteúdo e segurança.** Personagens são 100% sintéticos — não implementar face swap de pessoas reais. Tratar recusa de política de conteúdo do provedor como erro esperado, com mensagem clara e fallback configurável para outro modelo.

## Modelo de dados (Supabase Postgres, RLS em todas as tabelas)

- `profiles` — dados do usuário (1:1 com `auth.users`)
- `wallets` — saldo em centavos por usuário
- `ledger_transactions` — append-only: depósitos e débitos (`amount_cents`, `cost_real_cents`, `cost_charged_cents`, `generation_id`, `kind`)
- `projects` — as "abas": nome, status agregado, ordenação
- `workflows` — grafo do canvas por projeto (`graph jsonb` no formato React Flow: nodes + edges + viewport), com versão
- `entities` — entidades mencionáveis por `@`: `kind` (character | product | scene | outfit | accessory), `handle` (ex.: `julia`, único por usuário), `sheet jsonb` (character sheet estruturado: identidade, dados físicos, paleta, expressões, voz), `version` (entidades são versionadas, não travadas), `project_id` nulo = disponível em todos os projetos do usuário
- `entity_images` — join entre `entities` e `assets`: as imagens canônicas de uma entidade (turnaround, expressões), com `role` e ordenação
- `assets` — arquivos no Storage: tipo, mime, dimensões/duração, origem (upload | generation)
- `generations` — cada execução: workflow/node de origem, provedor, modelo, `params jsonb`, `prompt_user_pt`, `prompt_compiled jsonb`, status (queued | running | succeeded | failed | canceled), custos, `result_asset_id`, erro

Invariantes garantidas pelo banco, não pelo código do app:

- Cadastro cria automaticamente `profiles` + `wallets` (trigger em `auth.users`)
- Criar um projeto cria automaticamente seu `workflows` (1 projeto = 1 workflow)
- `ledger_transactions` recusa UPDATE e DELETE por trigger — vale inclusive para a service role; correção é sempre nova transação de estorno
- `wallets.balance_cents` é projeção do ledger: só muda por trigger de INSERT no ledger, e saldo negativo é bloqueado por constraint
- `generations` e `ledger_transactions` são somente-leitura para o usuário autenticado; escrita apenas por código de servidor com service role
- Storage: bucket privado `assets`, caminho `<user_id>/…`, políticas casam a primeira pasta com o dono
- Realtime habilitado em `projects` e `generations` (respeita RLS)

Migrations sempre em `supabase/migrations/` — nunca alterar schema manualmente pelo dashboard.
Após aplicar migrations, regerar `src/lib/supabase/database.types.ts`.

## Glossário do domínio

- **Projeto (aba)**: espaço de trabalho independente com um workflow
- **Workflow (fluxo)**: o grafo de nodes salvo de um projeto
- **Node**: bloco no canvas (input, geração ou resultado) com handles de conexão
- **Entidade / @**: objeto reutilizável mencionável em prompts (`@julia`, `@produto-x`)
- **Character sheet**: ficha estruturada de um influencer de IA (identidade, dimensão física, social/psicológica, turnaround, expressões, paleta de cores, voz)
- **Geração**: uma execução de modelo com custo associado
- **Spark ⚡**: unidade de crédito exibida ao usuário
- **Preset de formato**: combinação canal + proporção + resolução

## Convenções de código

- Identificadores, nomes de arquivos e comentários em **inglês**; textos de UI em **pt-BR**, centralizados em `lib/i18n/pt-BR.ts`
- TypeScript strict; proibido `any` (usar `unknown` + narrowing)
- Server Components por padrão; `"use client"` apenas onde necessário (o canvas é client)
- Um componente por tipo de node em `components/nodes/`
- Commits no padrão Conventional Commits (`feat:`, `fix:`, `chore:`, `refactor:`)
- Rodar `npm run lint` e `npm run typecheck` antes de qualquer commit

## Estrutura de pastas (alvo)

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
.claude/
  settings.json           # guardrails de permissão do Claude Code (commitado)
.mcp.json                 # MCPs Supabase (read-only) e Vercel — OAuth, sem segredos (commitado)
.env.example              # placeholders (commitado)
.env.local                # segredos reais (gitignored, editado apenas pelo Jorge)
```

## Variáveis de ambiente

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

Em produção, os mesmos nomes vivem nas Environment Variables da Vercel (marcadas *Sensitive*).

## Comandos

- `npm run dev` — desenvolvimento
- `npm run build` — build de produção
- `npm run lint` — lint
- `npm run typecheck` — checagem de tipos
- `supabase migration new <nome>` — criar migration (livre)
- `supabase db push` — aplicar migrations (requer confirmação do Jorge)

## Roadmap de fases

- **Fase 0 (atual)**: fundação — auth, projetos/abas, canvas React Flow com salvar/carregar workflow, carteira e ledger de Sparks
- **Fase 1**: geração de imagem — nodes de input tipados, node de geração (Nano Banana + 1 modelo via fal), sistema de `@`, ingestão de assets, débito de Sparks, prompt duplo
- **Fase 2**: entidades — character sheet completo (preenchimento manual + extração automática por imagem de referência), versionamento, imagens canônicas, consistência entre gerações
- **Fase 3**: vídeo e voz — image-to-video, Motion Control (Kling), lipsync, continuação a partir do último frame (extração via ffmpeg), voz com ElevenLabs, storyboard cena a cena
- **Fase 4**: presets por canal, criativos de anúncio (estáticos e UGC), preparação multiusuário (margem sobre custo, cobrança)

## Regras para o Claude Code

1. Em dúvida arquitetural, seguir as "Decisões de arquitetura" e a seção "Segurança" acima; se for necessário violá-las, parar e perguntar antes
2. Toda mudança de schema = nova migration em `supabase/migrations/` + atualização da seção "Modelo de dados" deste arquivo
3. Novos modelos de IA entram por `config/models.json` + adapter em `lib/providers/` — nunca espalhados pelo código
4. Não implementar features de fases futuras sem pedido explícito
5. Respeitar a divisão de autonomia da seção "Ferramentas conectadas e autonomia"
6. Manter este arquivo enxuto e atualizado — ao concluir uma fase, atualizar o "Roadmap"