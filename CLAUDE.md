# CLAUDE.md — Creator TKS Labs

> Este arquivo orienta o Claude Code em **todas** as sessões. Ele guarda só o que precisa estar diante do Claude o tempo todo: o índice da documentação, as invariantes que não podem ser violadas, o glossário, as convenções e os limites de autonomia.
>
> **O detalhe mora em `docs/`.** Antes de qualquer mudança estrutural, abrir o arquivo indicado no índice abaixo.

---

## Índice da documentação

| Arquivo | Quando consultar |
|---|---|
| [`docs/produto.md`](docs/produto.md) | Antes de decidir **o que** construir, para quem, ou como uma funcionalidade deve se comportar para o usuário. Contém visão, público-alvo, princípio de UX, funcionalidades e o roadmap das 4 fases. |
| [`docs/arquitetura.md`](docs/arquitetura.md) | Antes de qualquer mudança estrutural — novo provedor, mudança de schema, novo fluxo. Contém as 7 decisões **com o porquê de cada uma**, o modelo de dados, a stack, a estratégia de providers, a estrutura de pastas e as variáveis de ambiente. |
| [`docs/character-sheet.md`](docs/character-sheet.md) | Ao trabalhar com entidades `@`, consistência de personagem ou compilação de prompt. É a especificação v1 **final e aprovada**: estrutura JSON, listas fechadas com tradução fixa em inglês e as regras de compilação. |
| [`docs/versionamento-entidades.md`](docs/versionamento-entidades.md) | Ao mexer em versões de entidade, no ponteiro de versão ativa, na resolução de `@` ou nas travas de banco da `entity_versions`. Especificação v1 aprovada: o que é rascunho, o que é retrato congelado e o que o banco impede. |
| [`docs/decisoes.md`](docs/decisoes.md) | Quando quiser saber **por que** algo é do jeito que é, ou antes de reverter uma escolha que parece estranha. Diário cronológico de decisões. |

---

## O produto em duas linhas

Creator TKS Labs é um estúdio de criação de conteúdo com IA baseado em **canvas infinito de nodes**, para gerar imagens, vídeos e influencers de IA com consistência de personagem — criativos para Instagram, TikTok/TikTok Shop, Shopee, YouTube e anúncios.

Princípio de UX inegociável: **poder de profissional, simplicidade de leigo.** O usuário nunca vê complexidade técnica (sampler, VAE, latent). Nodes têm nomes de **intenção**, nunca de implementação: "Input de Produto", "Motion Control", "Gerar Imagem". → [`docs/produto.md`](docs/produto.md)

---

## Invariantes de arquitetura (não violar)

Versão curta. O porquê de cada uma está em [`docs/arquitetura.md`](docs/arquitetura.md) — leia lá antes de mexer em qualquer uma delas.

1. **Geração é sempre assíncrona.** Nunca aguardar uma geração dentro de um request HTTP. Rota cria `generations` como `queued` → job no provedor com webhook de retorno → webhook atualiza e ingere o asset → Realtime propaga para o canvas.
2. **Camada de adapters.** Nenhum código de produto chama API de modelo diretamente; tudo pela interface `GenerationProvider` em `lib/providers/`. Modelo novo = entrada em `config/models.json` + adapter. Nunca espalhado pelo código.
3. **Ingestão de assets.** URL de provedor expira: todo resultado é copiado imediatamente para o Supabase Storage e registrado em `assets`. Nunca persistir URL externa como fonte definitiva; nunca usar localStorage/IndexedDB como armazenamento principal.
4. **Prompt duplo PT → EN/JSON.** Usuário escreve em PT-BR (`prompt_user_pt`); a compilação traduz e estrutura em JSON inglês (`prompt_compiled`), resolvendo as menções `@`. O JSON é salvo na geração e exibido no node de resultado.
5. **Dinheiro em centavos inteiros de BRL.** Spark ⚡ é só exibição (hoje 1 Spark = 1 centavo, `CENTS_PER_SPARK` em `lib/sparks/`). Cada geração grava `cost_real_cents` e `cost_charged_cents`. **Ledger é append-only** — correção é nova transação de estorno, nunca UPDATE/DELETE.
6. **Presets data-driven.** Proporções e resoluções por canal em `config/format-presets.json`; catálogo de modelos e preços em `config/models.json`. Nunca hardcoded em componentes.
7. **Conteúdo.** Personagens 100% sintéticos — não implementar face swap de pessoas reais. Recusa de política do provedor é erro **esperado**: mensagem clara e fallback configurável.
8. **Regras de compilação do character sheet.** As 10 regras da seção 6 de [`docs/character-sheet.md`](docs/character-sheet.md) têm **o mesmo status das 7 decisões acima** e nunca podem ser violadas pelo código sem decisão explícita registrada.
9. **Versões de entidade são append-only com trava no banco; menções `@` resolvem sempre para versão congelada, nunca para rascunho.** Entidade sem versão salva não pode ser mencionada. Geração a partir do rascunho é permitida, mas marcada como não reproduzível (`generations.sheet_source = 'draft'`). → [`docs/versionamento-entidades.md`](docs/versionamento-entidades.md)

**No banco, não no app.** Estas invariantes são garantidas por trigger e constraint, não por código que precisa lembrar de cumpri-las: cadastro cria `profiles` + `wallets`; projeto cria seu `workflows` (1 para 1); ledger recusa UPDATE/DELETE; `wallets.balance_cents` é projeção do ledger com saldo negativo bloqueado; `generations` e `ledger_transactions` são somente-leitura para o usuário; `entity_versions` recusa UPDATE/DELETE e numera as versões sob bloqueio; imagem citada por uma versão não pode ser deletada; RLS default-deny nas 10 tabelas. Todas as travas de apagamento abrem exceção para a cascata de exclusão de conta (LGPD). → [`docs/arquitetura.md`](docs/arquitetura.md#4-modelo-de-dados)

---

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

---

## Ferramentas conectadas e autonomia

- **MCP Supabase** (`.mcp.json`): servidor remoto oficial, autenticado por OAuth, **escopado ao projeto e em modo read-only permanente**. Uso: inspecionar schema, consultar dados, ler logs, verificar advisors de segurança/performance. **Escrita no banco NUNCA acontece via MCP.**
- **Escrita no banco = migration + CLI.** Toda alteração de schema é um arquivo novo em `supabase/migrations/` (criado com `supabase migration new <nome>`), aplicado com `supabase db push`. Assim, toda escrita fica versionada, revisável e reversível no git.
- **MCP Vercel** (`.mcp.json`): servidor remoto oficial, OAuth. Uso: inspecionar deployments, ler build logs, diagnosticar falhas de deploy.
- **GitHub via `gh` CLI e git**: commits, push, criação de PRs e issues. Credencial no gerenciador de credenciais do sistema, nunca em arquivo. Branch de trabalho e de deploy: **`master`**.

**Pode fazer sem perguntar**: ler e editar código do repositório; rodar dev/build/lint/typecheck/testes; criar arquivos de migration; commits e push na branch de trabalho; consultas read-only via MCP; ler logs.

**Sempre perguntar antes**: aplicar migrations no banco (`supabase db push`); criar/alterar/remover env vars na Vercel; deletar qualquer recurso remoto; merge para `master`; adicionar dependência nova; qualquer ação irreversível.

**Bloqueado** (via `.claude/settings.json`): ler `.env*`, force push, comandos destrutivos em massa, reset do banco.

---

## Glossário do domínio

- **Projeto (aba)**: espaço de trabalho independente com um workflow
- **Workflow (fluxo)**: o grafo de nodes salvo de um projeto
- **Node**: bloco no canvas (input, geração ou resultado) com handles de conexão
- **Entidade / @**: objeto reutilizável mencionável em prompts (`@julia`, `@produto-x`)
- **Character sheet**: ficha estruturada de um influencer de IA (identidade, dados físicos, turnaround, expressões, paleta de cores, voz), organizada em três camadas — DNA visual (imutável), padrões variáveis (defaults) e narrativa (nunca entra em prompt de imagem)
- **Geração**: uma execução de modelo com custo associado
- **Spark ⚡**: unidade de crédito exibida ao usuário
- **Preset de formato**: combinação canal + proporção + resolução

---

## Convenções de código

- Identificadores, nomes de arquivos e comentários em **inglês**; textos de UI em **pt-BR**, centralizados em `lib/i18n/pt-BR.ts`
- TypeScript strict; proibido `any` (usar `unknown` + narrowing)
- Server Components por padrão; `"use client"` apenas onde necessário (o canvas é client)
- Zod em todas as fronteiras: API routes, webhooks, formulários e leitura de `jsonb`
- Um componente por tipo de node em `components/nodes/`
- Commits no padrão Conventional Commits (`feat:`, `fix:`, `chore:`, `refactor:`, `docs:`)
- Rodar `npm run lint` e `npm run typecheck` antes de qualquer commit

---

## Comandos

- `npm run dev` — desenvolvimento
- `npm run build` — build de produção
- `npm run lint` — lint
- `npm run typecheck` — checagem de tipos
- `supabase migration new <nome>` — criar migration (livre)
- **Aplicar migrations — sempre o Jorge, manualmente:**
  ```bash
  npx supabase db push --db-url "<connection string do Session pooler>"
  ```
  O `supabase link` está com bug nesta máquina, por isso a connection string vai explícita. Use a do **Session pooler (IPv4)** do painel do Supabase — a *Direct connection* é IPv6 e **falha nesta rede**. O Claude Code nunca aplica migrations: escreve o arquivo e avisa.

---

## Regras para o Claude Code

1. Em dúvida arquitetural, seguir as "Invariantes de arquitetura" e a "Segurança" acima, e o porquê registrado em [`docs/arquitetura.md`](docs/arquitetura.md); se for necessário violá-las, **parar e perguntar antes**.
2. Toda mudança de schema = nova migration em `supabase/migrations/` + atualização do modelo de dados em [`docs/arquitetura.md`](docs/arquitetura.md). Depois de aplicar, regerar `src/lib/supabase/database.types.ts` a partir do banco — nunca escrever esse arquivo à mão.
3. Novos modelos de IA entram por `config/models.json` + adapter em `lib/providers/` — nunca espalhados pelo código.
4. Não implementar features de fases futuras sem pedido explícito.
5. Respeitar a divisão de autonomia da seção "Ferramentas conectadas e autonomia".
6. **Manutenção da documentação.** Toda mudança de arquitetura, de produto ou de especificação deve, **na mesma sessão**, atualizar o doc correspondente em `docs/` e registrar uma entrada datada em [`docs/decisoes.md`](docs/decisoes.md). Ao concluir uma fase, atualizar o roadmap em [`docs/produto.md`](docs/produto.md). Manter este arquivo enxuto: detalhe novo vai para `docs/`, não para cá.
7. **Invariantes do character sheet.** As regras de compilação da seção 6 de [`docs/character-sheet.md`](docs/character-sheet.md) são invariantes do projeto, com o mesmo status das 7 decisões de arquitetura: **nunca podem ser violadas pelo código sem decisão explícita registrada.**
8. **Fluxo de encerramento de toda tarefa:** apresentar resumo enxuto do que foi feito → rodar `git status` e mostrar a lista de arquivos a commitar → pedir ok ao Jorge → só então fazer commit e push. Se aparecer qualquer arquivo fora do escopo declarado da tarefa, **parar e avisar antes de commitar**.
