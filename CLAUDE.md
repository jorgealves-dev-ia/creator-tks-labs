# CLAUDE.md — Creator TKS Labs

> Este arquivo orienta o Claude Code em **todas** as sessões. Ele guarda só o que precisa estar diante do Claude o tempo todo: o índice da documentação, as invariantes que não podem ser violadas, o glossário, as convenções e os limites de autonomia.
>
> **O detalhe mora em `docs/`.** Antes de qualquer mudança estrutural, abrir o arquivo indicado no índice abaixo.

---

## Índice da documentação

| Arquivo | Quando consultar |
|---|---|
| [`docs/ESTADO.md`](docs/ESTADO.md) | **Primeiro, sempre.** Uma página com o que está provado, o que está aberto e o próximo gesto — reescrita em toda pausa (regra 9). É o checklist do projeto: se ele estiver certo, a sessão começa trabalhando em vez de reconstruindo. |
| [`docs/produto.md`](docs/produto.md) | Antes de decidir **o que** construir, para quem, ou como uma funcionalidade deve se comportar para o usuário. Contém visão, público-alvo, princípio de UX, funcionalidades e o roadmap das 4 fases. |
| [`docs/arquitetura.md`](docs/arquitetura.md) | Antes de qualquer mudança estrutural — novo provedor, mudança de schema, novo fluxo. Contém as 7 decisões **com o porquê de cada uma**, o modelo de dados, a stack, a estratégia de providers, a estrutura de pastas e as variáveis de ambiente. |
| [`docs/character-sheet.md`](docs/character-sheet.md) | Ao trabalhar com entidades `@`, consistência de personagem ou compilação de prompt. É a especificação v1 **final e aprovada**: estrutura JSON, listas fechadas com tradução fixa em inglês e as regras de compilação. |
| [`docs/versionamento-entidades.md`](docs/versionamento-entidades.md) | Ao mexer em versões de entidade, no ponteiro de versão ativa, na resolução de `@` ou nas travas de banco da `entity_versions`. Especificação v1 aprovada: o que é rascunho, o que é retrato congelado e o que o banco impede. |
| [`docs/tela-character-sheet.md`](docs/tela-character-sheet.md) | Ao mexer na tela da personagem — cartão no canvas, editor em overlay, selos de estado, contador de amarelos, seletor de versões, coluna de imagens canônicas ou wizard de criação. Especificação v1 aprovada com as decisões U1–U4. |
| [`docs/motor-extracao.md`](docs/motor-extracao.md) | Ao mexer no motor de extração (foto ou texto colado), no catálogo de fornecedores e modelos de IA, na camada adaptadora ou na cobrança de Sparks por extração. Especificação v1 aprovada com as decisões E1–E6. |
| [`docs/geracao-canonica.md`](docs/geracao-canonica.md) | Ao mexer no compilador de prompt, na tradução com cache dos campos livres, na prévia "Prompt compilado", na geração das imagens canônicas (folha completa e vistas), no adaptador de imagem ou na cobrança de Sparks por geração. Especificação v1 aprovada com as decisões G1–G4. |
| [`docs/nodes-geracao.md`](docs/nodes-geracao.md) | Ao mexer nos nodes do canvas — a **anatomia do bloco Gerar Imagem** (§3), os **nodes de Input** e a prateleira de tipos (§3.1), node Resultado, menções `@` no prompt, referências anexadas e sua galeria, a chave que silencia os inputs, qualidade e quantidade, presets de formato por canal, ou a compilação de canvas. Especificação v1 aprovada com as decisões N1–N5 (a N5 revisada em parte em 10/08/2026). |
| [`docs/plano-storyboard-c2.md`](docs/plano-storyboard-c2.md) | Ao retomar a **Frente Storyboard · Ciclo 2 (O Roteiro)** — qual fase está aberta, o que ela entrega, o que prova o quê, a anatomia do node de Roteiro e o checklist de prints da Fase 3. É o plano aprovado do ciclo, em disco. |
| [`docs/plano-storyboard-c3.md`](docs/plano-storyboard-c3.md) | Ao retomar a **Frente Storyboard · Ciclo 3 (A Máquina)** — a régua de passos (50 → 9, com a Fase 4 valendo −3 **medidos**), o mapa do que a Máquina rege sem tocar, a anatomia do node, as fases e as **sete decisões, todas fechadas em 28/08**. Fases 0 e 1 fechadas, **Fase 2 aberta**; a única pergunta em aberto é a **0.3** (aba escondida), que fecha na metade do dono da Fase 3. |
| [`docs/plano-egress.md`](docs/plano-egress.md) | Ao retomar o **Mini-ciclo Faxina de Egress** — miniaturas, URL assinada estável e cache imutável. Qual fase está aberta, os números medidos do acervo, e as duas decisões que esperam o Jorge (declarar o `sharp`; onde a URL assinada fica guardada). |
| [`docs/decisoes.md`](docs/decisoes.md) | Quando quiser saber **por que** algo é do jeito que é, ou antes de reverter uma escolha que parece estranha. Diário cronológico de decisões. |

---

## O produto em duas linhas

Creator TKS Labs é um estúdio de criação de conteúdo com IA baseado em **canvas infinito de nodes**, para gerar imagens, vídeos e influencers de IA com consistência de personagem — criativos para Instagram, TikTok/TikTok Shop, Shopee, YouTube e anúncios.

Princípio de UX inegociável: **poder de profissional, simplicidade de leigo.** O usuário nunca vê complexidade técnica (sampler, VAE, latent). Nodes têm nomes de **intenção**, nunca de implementação: "Input de Produto", "Motion Control", "Gerar Imagem". → [`docs/produto.md`](docs/produto.md)

---

## Invariantes de arquitetura (não violar)

Versão curta. O porquê de cada uma está em [`docs/arquitetura.md`](docs/arquitetura.md) — leia lá antes de mexer em qualquer uma delas.

1. **Geração é sempre assíncrona — exceto imagem, que cabe no request.** A regra existe porque função serverless tem teto de tempo e vídeo estoura. **Imagem é a exceção medida e registrada** (decisão N5): uma imagem cabe no `maxDuration` de 60, e quantidade 1–4 são **N requisições independentes**, nunca N gerações dentro de uma. Para vídeo o assíncrono continua obrigatório: rota cria `generations` como `queued` → job no provedor com webhook de retorno → webhook atualiza e ingere o asset → Realtime propaga para o canvas.
2. **Camada de adapters.** Nenhum código de produto chama API de modelo diretamente; tudo pela interface `GenerationProvider` em `lib/providers/`. Modelo novo = **linha em `ai_models` por migration** + adapter. Nunca espalhado pelo código.
3. **Ingestão de assets.** URL de provedor expira: todo resultado é copiado imediatamente para o Supabase Storage e registrado em `assets`. Nunca persistir URL externa como fonte definitiva; nunca usar localStorage/IndexedDB como armazenamento principal.
4. **Prompt duplo PT → EN/JSON.** Usuário escreve em PT-BR (`prompt_user_pt`); a compilação traduz e estrutura em JSON inglês (`prompt_compiled`), resolvendo as menções `@`. O JSON é salvo na geração e exibido no node de resultado.
5. **Dinheiro em centavos inteiros de BRL.** Spark ⚡ é só exibição (hoje 1 Spark = 1 centavo, `CENTS_PER_SPARK` em `lib/sparks/`). Cada geração grava `cost_real_cents` e `cost_charged_cents`. **Ledger é append-only** — correção é nova transação de estorno, nunca UPDATE/DELETE. **E fila é intenção, ledger é fato:** o débito acontece quando a imagem **entra em execução**, nunca no enfileirar, e o saldo é conferido de novo na vez de cada trabalho — quem sai da fila sem saldo é recusado, sem lançamento, e a fila segue. → [`docs/nodes-geracao.md`](docs/nodes-geracao.md)
6. **Presets data-driven.** Proporções por canal em `src/config/format-presets.json`; catálogo de fornecedores, modelos e preços — **inclusive o preço por resolução** — nas tabelas `ai_providers` / `ai_models` / `ai_model_image_prices`. Nunca hardcoded em componentes. *(A decisão original previa `config/models.json`; o catálogo nasceu no banco pela decisão E1 — é o que o painel admin vai gerenciar, e painel não edita arquivo do repositório.)*
7. **Conteúdo.** Personagens 100% sintéticos — não implementar face swap de pessoas reais. Recusa de política do provedor é erro **esperado**: mensagem clara e fallback configurável.
8. **Regras de compilação do character sheet.** As 11 regras da seção 6 de [`docs/character-sheet.md`](docs/character-sheet.md) têm **o mesmo status das 7 decisões acima** e nunca podem ser violadas pelo código sem decisão explícita registrada.
9. **Versões de entidade são append-only com trava no banco; menções `@` resolvem sempre para versão congelada, nunca para rascunho.** Entidade sem versão salva não pode ser mencionada. Geração a partir do rascunho é permitida, mas marcada como não reproduzível (`generations.sheet_source = 'draft'`). → [`docs/versionamento-entidades.md`](docs/versionamento-entidades.md)

10. **Compilação é determinística: dicionário literal, só `observado`/`confirmado`, `prompt_compiled` sempre gravado.** O compilador é **função pura** — sem rede, sem relógio, sem aleatoriedade —, copia as frases fixas do dicionário sem re-traduzir e lê os campos livres de um **cache traduzido no salvamento**, nunca de uma chamada no caminho da compilação. Toda geração grava o texto compilado que usou. **E nenhuma geração fica sem âncora de estilo**: campo ausente ou desconhecido lê como `fotorrealista`, e a canônica declara o estilo antes da moldura *(o node pode sobrescrever **qual** estilo, pela hierarquia da Camada 2 — nunca deixar a geração sem estilo)*. → [`docs/geracao-canonica.md`](docs/geracao-canonica.md)

11. **Chave de IA só em variável de ambiente; catálogo no banco; extração nunca sobrescreve campo não-vazio.** Nenhuma chave de provedor em coluna, log ou resposta — o que viaja para a tela é o booleano "configurado", calculado no servidor. Fornecedores, modelos e preços vivem em `ai_providers` / `ai_models`, sem política de escrita: o preço de uma extração é decidido pelo catálogo, nunca por quem chama. E a extração preenche **apenas campos `vazio`** — `observado`, `inferido`, `confirmado` e o gênero são preservados e contados no resumo. → [`docs/motor-extracao.md`](docs/motor-extracao.md)

12. **Anatomia do gerador é normativa; toda referência tem node; a chave nasce desligada.** O bloco Gerar Imagem tem **ordem definida** — cabeçalho → configuração → chave de inputs → prompt → botão → **custo e saldo** → resultado —, em duas colunas, e o custo fala a verdade multiplicada **antes** do clique. Referência entra **só por fio de um card**: a faixa do bloco é espelho, nunca porta de entrada, e o "+" cria um Input conectado em vez de anexar. A chave "Input Referências" **nasce desligada** (o caso base é gerar sem referência; ligada por padrão poria imagens em geração paga sem ninguém pedir), e desligada os inputs ficam conectados e visíveis, com `referencias_mudas` gravado — **mudo ≠ ausente**. Preço por resolução vem do catálogo (`ai_model_image_prices`), nunca de quem chama; quantidade 1–4 são **N requisições independentes**, com débito e falha por imagem. → [`docs/nodes-geracao.md`](docs/nodes-geracao.md)

13. **`@` só resolve versão congelada; o prompt do node dirige a cena; auditoria bilíngue PT/EN em toda geração.** A menção é resolvida **no servidor** — o navegador manda a frase, nunca a versão. **E ela vira sujeito antes da tradução, nunca é apagada** *(item 3d, 11/08/2026)*: quem decide se a cena está vazia é o texto **sem** a menção, mas quem vai para o tradutor é o texto **com** o sujeito no lugar dela (`ela` / `ele` / `a pessoa`, pelo gênero da versão congelada, com as contrações do português). Apagar deixava a frase órfã e o tradutor inventava sujeito e gênero — "está no seu quarto gamer" virou *"is in their gamer room"* numa rodada e *"in his"* na seguinte. O que a menção virou fica gravado em `prompt_compiled.structure.mencao_sujeito`. Quando há texto no prompt, os padrões de cena do sheet **e o traje canônico** não entram: o traje é traje de banho, existe para a folha mostrar silhueta, e uma cena dirigida jamais o recebe por injeção do sistema *(o usuário dirigir "de biquíni" é outra coisa, e funciona — a regra bloqueia o sistema, nunca a intenção)*. Prompt vazio com `@` faz o oposto, e a tela avisa antes do clique. Toda geração grava o português original ao lado do inglês compilado, com estilo, personagem, âncora e diretivas de referência **por campo**. → [`docs/nodes-geracao.md`](docs/nodes-geracao.md)

**No banco, não no app.** Estas invariantes são garantidas por trigger e constraint, não por código que precisa lembrar de cumpri-las: cadastro cria `profiles` + `wallets`; projeto cria seu `workflows` (1 para 1); ledger recusa UPDATE/DELETE; `wallets.balance_cents` é projeção do ledger com saldo negativo bloqueado; `generations` e `ledger_transactions` são somente-leitura para o usuário; `entity_versions` recusa UPDATE/DELETE e numera as versões sob bloqueio; imagem citada por uma versão não pode ser deletada; extração **e geração** são gravadas e cobradas numa transação só, com o preço lido do catálogo (`record_extraction` / `record_generation`) e preço-exige-capability por CHECK; RLS default-deny nas 15 tabelas. Todas as travas de apagamento abrem exceção para a cascata de exclusão de conta (LGPD). → [`docs/arquitetura.md`](docs/arquitetura.md#4-modelo-de-dados)

---

## Segurança (inegociável)

1. **Nenhum segredo no código nem no git.** Segredos vivem em `.env.local` (gitignored) no desenvolvimento e nas Environment Variables do painel da Vercel (marcadas como *Sensitive*) em produção. O `.env.example` contém apenas placeholders.
2. **`SUPABASE_SERVICE_ROLE_KEY` ignora RLS** — uso exclusivo em código de servidor. Nunca em variável `NEXT_PUBLIC_*`, nunca em componente client, nunca em log, nunca em resposta de API. A `ANON_KEY` é pública por design e protegida pelo RLS.
3. **Claude Code não lê nem imprime segredos.** A leitura de `.env*` está bloqueada em `.claude/settings.json`. Nunca ecoar valores de variáveis de ambiente no terminal, em commits ou em arquivos.
4. **RLS obrigatório em todas as tabelas**, com política default-deny: nada é acessível sem política explícita.
5. **Webhooks validam a origem antes de processar.** Todo endpoint em `app/api/webhooks/` verifica **assinatura** ou segredo compartilhado, e rejeita requisição inválida com 401 **sem tocar no banco**. No caso da fal — o único webhook do produto — é assinatura: `X-Fal-Webhook-Signature`, ED25519, conferida contra o JWKS público deles sobre o **corpo bruto** da requisição. *Não existe `FAL_WEBHOOK_SECRET`: a fal não oferece segredo compartilhado, ela assina.* → [`docs/arquitetura.md`](docs/arquitetura.md#6-variáveis-de-ambiente)
6. **Chamadas a provedores de IA acontecem exclusivamente no servidor.** Nenhuma chave de provedor trafega para o browser.
7. **GitHub com secret scanning + push protection ativados.** Se um segredo vazar em commit, a resposta é rotacionar a chave imediatamente — apagar o commit não basta.
8. **Dependências**: lockfile sempre commitado; rodar `npm audit` ao adicionar dependências; desconfiar de pacotes obscuros ou recém-publicados.
9. **Nunca colar chaves reais em chats, prompts ou issues.** Manuseio de valores de segredo é tarefa manual do Jorge, por design.

---

## Dinheiro e limites de estrago *(nascidas do incidente de 29/08/2026)*

Um clique de **210 ⚡** submeteu **626 gerações** em três minutos. Quem parou não fomos nós: foi o **saldo pré-pago da fal ficando negativo** — 549 das 606 voltaram com `403 User is locked. Reason: TOP_UP.`. Custo real: **US$ 21,56** e 77 clipes de uma cena que precisava de um. As três regras abaixo existem para que o freio nunca mais seja o provedor.

### R1 · Regra do pior caso

**Todo clique pago declara por escrito o pior caso antes de acontecer:** *"se tudo der errado, custa no máximo X."* **Se X ≠ o número que o portão mostra, o clique não acontece** — a diferença entre os dois é exatamente o buraco por onde o dinheiro sai.

Vale para o Jorge, para o Claude e para o Claude Code, sem exceção. No incidente, o portão dizia `1 × 210 = 210 ⚡` e o pior caso real era **ilimitado**; ninguém tinha escrito o pior caso, então ninguém teve o que comparar.

### R2 · Teto absoluto no motorista

O motorista de lote obedece três limites, e eles são a **única trava do nosso lado**:

1. **uma submissão por cena por clique** — jamais duas, dê no que der;
2. **limite do lote = tamanho do lote** — um lote de N nunca produz mais de N submissões;
3. **nunca resubmissão automática** — o que refaz é o clique, nunca o efeito;
4. **o lote é uma lista fechada** *(R2.4, nascida do clique de campo de 31/08)* — **o motorista só despacha o que aquele clique autorizou**, e a pergunta mora no **plano**, onde a tela lê. As três de cima limitam **quantas** saem; esta limita **quais**, e a prova de uma não cobre a outra: em 31/08 o teto segurou com precisão (uma submissão de um clique) enquanto a submissão saía para a cena errada.

**A simulação vermelha→verde é PROVA REEXECUTÁVEL**, com caminho rastreado como as travas de banco: ela reproduz as 626 submissões, **falha** com o código defeituoso e **passa** com o conserto. **Roda antes de qualquer commit que toque o motorista.** Um conserto sem teste que o exercite seria a terceira vez que confiamos nessa peça no escuro.

### R3 · fal: o saldo pré-pago é o teto de estrago

- **Recarga automática: NUNCA.** Ela transforma o único teto existente numa torneira aberta.
- **Compras pequenas.** O saldo em conta é o limite superior do estrago de um incidente — e um incidente já aconteceu.
- Alerta por e-mail ativado (US$ 10). **Alerta não é limite:** ele avisa depois, e a fal **não oferece limite de gasto**.

### R4 · Estorno: só por autorização do Jorge, e um por geração

O ledger é **append-only** — correção é lançamento novo, nunca `UPDATE`. Sobre isso, quatro condições:

1. **Só o Jorge autoriza.** O Claude escreve o script e apresenta a auditoria; **quem roda é ele**, no SQL Editor. Nenhum estorno sai de código de produto nem de ferramenta de IA.
2. **Um lançamento por geração**, com `generation_id` preenchido — nunca um agregado. `generation_id` é o que liga o estorno ao débito que ele corrige; um agregado nasce com o campo nulo, e a auditoria de daqui a um ano não consegue dizer **quais** linhas foram estornadas.
3. **A descrição nomeia o incidente.** *"Estorno · incidente do laço de reanimação, 29/08/2026 · …"* — quem ler o extrato depois precisa chegar ao post-mortem sem perguntar a ninguém.
4. **O script deriva as linhas do banco e é idempotente.** Listar UUIDs à mão são N chances de estornar a geração errada; sem `NOT EXISTS`, rodar duas vezes paga duas vezes. E ele abre `BEGIN`, mostra a conferência (carteira = soma do ledger) e só então `COMMIT`.

O primeiro está em `supabase/correcoes/20260829_estorno_incidente_laco_reanimacao.sql`, e serve de modelo.

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
- **Input**: card do canvas que entrega imagem(ns) a um bloco de geração. Quatro tipos na v1 — Imagem, Produto, Pose/Ângulo e Character Sheet —, oferecidos no menu lateral como **prateleira de tipos**: o menu dá o tipo, o card guarda tudo. Só saída, e o fio é **vivo** (editar o card atualiza todo bloco que já o recebeu)
- **Produto**: um tipo de Input — nome, até 5 fotos e uma instrução. As fotos entram no bloco **como uma unidade**, com a contagem de vagas dita antes do clique. *Foi entidade do Arsenal até 10/08/2026; virou card porque produto é rotativo e cadastrar antes de usar não se paga*
- **Referência**: imagem que entrou num bloco de geração. **Toda referência tem node** — por um Input, por um Resultado conectado —, com tipo e instrução opcionais; a faixa dentro do bloco é **espelho, nunca porta de entrada**. A folha da personagem mencionada é sempre a imagem 1, e a chave "Input Referências" nasce desligada
- **Galeria**: o histórico de imagens do usuário (`assets`), de onde se reaproveita uma referência sem subir de novo
- **Extração**: leitura de uma referência (foto ou texto colado) que preenche o DNA visual com estados honestos — só em campos vazios, com motivo quando houve dúvida
- **Compilador**: a função pura que transforma o character sheet no bloco de identidade em inglês, com prévia ao vivo no editor
- **Folha completa**: a grade única com todas as vistas numa imagem só — a âncora universal da identidade, referência de toda vista gerada depois
- **Fornecedor / modelo de IA**: entradas do catálogo em `ai_providers` / `ai_models`; "configurado" significa que a chave existe no servidor
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
- **Artefatos de validação e diagnóstico** — imagens de teste, scripts descartáveis, harnesses, qualquer arquivo de trabalho temporário — vão em `D:\Z - Meus Projetos DevIA\Creator TKS Labs\scratchpad\` (criar se não existir). Fica **fora do repositório**, então nunca entra em commit por acidente. **Nunca usar o `%TEMP%` do disco C:**, que é pequeno e é limpo sem aviso — duas imagens de validação já se perderam assim.

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

### O túnel do webhook vive no COMANDO, nunca no arquivo *(regra do Jorge, 29/08/2026)*

Quando a sessão precisa que a fal responda para esta máquina, a URL do túnel entra **na subida do dev**, e o dev sobe assim:

```bash
FAL_WEBHOOK_URL="https://<tunel-de-hoje>.trycloudflare.com/api/webhooks/fal" npm run dev
```

A `FAL_WEBHOOK_URL` **não mora no `.env.local`.** Ela não é segredo — o segredo continua no arquivo —, é um **endereço com prazo de validade de algumas horas**, e um valor perecível guardado num arquivo permanente é uma armadilha que arma sozinha.

**Por que a regra existe, com as três vezes que custaram:**

| data | o que a variável era | o que aconteceu |
|---|---|---|
| 13/08 | **ausente** | a trava nasceu: sem retorno, o vídeo geraria e cobraria sem voltar |
| 28/08 | **presente e errada** (a raiz do túnel) | 4 clipes pagos, **0 entregas**, 4 reconciliações à mão |
| 29/08 | **presente e morta** (o túnel da véspera) | achada por sonda, antes de gastar — a forma estava perfeita |
| 31/08 | **viva no início e morta no meio** | o túnel caiu com o servidor de pé; a trava recusou com `status: 530` |

As três primeiras são o mesmo desfecho, e a terceira fecha o argumento: **a trava de forma não distingue um túnel vivo de um morto**, porque os dois têm o mesmo `pathname`. Um valor que morre com o processo nunca chega ao dia seguinte para enganar ninguém.

**A quarta é de outra natureza, e é a que justifica a trava rodar por clique.** O endereço foi provado vivo e morreu **no meio da sessão**: uma conferência feita só na subida do ambiente teria dito "vivo" e deixado o clique passar. Um `530` é a Cloudflare dizendo que não achou a origem — alguém respondendo que **não é o webhook** —, e é por isso que só `401` e `405` contam como vida.

**Como funciona:** o Next não sobrescreve variável que já está no `process.env`, então a do comando **vence** a do arquivo, se alguma sobrar lá. Mesmo assim, a linha fica comentada no `.env.local` — duas fontes para o mesmo valor é a próxima maneira de errar.

**O que continua sendo do Jorge:** subir o `cloudflared` é do Claude; o `.env.local` é do Jorge, sempre. Quem pega a URL do log do túnel e a põe no comando é quem sobe o dev.

E a **trava de vida** (29/08) cobre o resto: o portão de vídeo faz **uma ida à rede por clique**, aceita só `401`/`405` — as duas respostas do nosso endpoint — e recusa antes do primeiro Spark quando ninguém atende.

---

## Regras para o Claude Code

1. Em dúvida arquitetural, seguir as "Invariantes de arquitetura" e a "Segurança" acima, e o porquê registrado em [`docs/arquitetura.md`](docs/arquitetura.md); se for necessário violá-las, **parar e perguntar antes**.
2. Toda mudança de schema = nova migration em `supabase/migrations/` + atualização do modelo de dados em [`docs/arquitetura.md`](docs/arquitetura.md). Depois de aplicar, regerar `src/lib/supabase/database.types.ts` a partir do banco — nunca escrever esse arquivo à mão.
3. Novos modelos de IA entram por **migration em `ai_models`** (com o preço, e o preço por resolução em `ai_model_image_prices` quando for imagem) + adapter em `lib/providers/` — nunca espalhados pelo código.
4. Não implementar features de fases futuras sem pedido explícito.
5. Respeitar a divisão de autonomia da seção "Ferramentas conectadas e autonomia".
6. **Manutenção da documentação.** Toda mudança de arquitetura, de produto ou de especificação deve, **na mesma sessão**, atualizar o doc correspondente em `docs/` e registrar uma entrada datada em [`docs/decisoes.md`](docs/decisoes.md). Ao concluir uma fase, atualizar o roadmap em [`docs/produto.md`](docs/produto.md). Manter este arquivo enxuto: detalhe novo vai para `docs/`, não para cá.
7. **Invariantes do character sheet.** As regras de compilação da seção 6 de [`docs/character-sheet.md`](docs/character-sheet.md) são invariantes do projeto, com o mesmo status das 7 decisões de arquitetura: **nunca podem ser violadas pelo código sem decisão explícita registrada.**
8. **Fluxo de encerramento de toda tarefa:** reescrever [`docs/ESTADO.md`](docs/ESTADO.md) → conferir que `git grep -n "SAI ANTES DO COMMIT" -- src/ supabase/` volta **vazio** → apresentar resumo enxuto do que foi feito → rodar `git status` e mostrar a lista de arquivos a commitar → pedir ok ao Jorge → só então fazer commit e push. Se aparecer qualquer arquivo fora do escopo declarado da tarefa, **parar e avisar antes de commitar**.

   **Os dois primeiros passos são novos, e cada um nasceu de uma falha medida** *(02/09/2026)*.

   **O ESTADO entra no MESMO commit do fechamento.** A regra 9 já exigia a reescrita a cada pausa, mas ela morava num parágrafo sobre *pausa* e o fechamento não a nomeava — então cumprir a regra 8 dependia de alguém lembrar da 9 no instante certo, que é a forma exata da falha que a regra 9 existe para impedir. No mesmo commit, ele é a última coisa que o fechamento toca e a primeira que a sessão seguinte lê; num commit à parte, é um ESTADO que se esquece.

   **E a trava do `git grep` existe porque uma frase em comentário não é uma trava.** Cinco blocos marcados `SAI ANTES DO COMMIT`, em maiúsculas, atravessaram o commit de fechamento de uma fase que teve prova de campo e conferência de painel — e ficaram em `master` por dois dias. Uma marca depende de alguém reler o arquivo inteiro na hora certa; um comando não depende de ninguém. **Escopado a `src/` e `supabase/` de propósito:** sem o escopo ele dispara na própria documentação que o descreve, e uma trava que acusa a si mesma é uma trava que se aprende a ignorar.

   **A prova ao vivo é obrigatória onde há DINHEIRO — e só ali** *(recalibração do Jorge, 31/08/2026; a emenda original é de 11/08, e o porquê das duas está em [`docs/decisoes.md`](docs/decisoes.md))*.

   **Onde há dinheiro** — portões que autorizam gasto, o motorista de lote, cobrança, estorno, qualquer caminho que possa submeter a um provedor pago: a metade do Jorge é **obrigatória**, a etapa fica **aberta e não commitada** até ela chegar, e o pior caso (R1) é escrito antes do clique. **Uma etapa esperando prova e uma etapa fechada não podem ter a mesma aparência no git.**

   **Fora dali** — tela, estado, leitura, compilação, texto, layout, migração sem cobrança: sela com **prova estrutural + validação de tela** feita pelo Claude em `localhost:3000`, com **prova por item colada no resumo**, em número. "Conferi e passou" sem prova continua não valendo. Passando, **vai para produção no mesmo dia** — não espera a próxima sessão do dono.

   **Por que a régua mudou.** A regra antiga mandava a metade do dono para *toda* etapa com geração, e o efeito medido foi fila: trabalho pronto, provado e verde dormindo no disco à espera de um clique que não tinha o que decidir. O risco que justifica esperar é o **irreversível** — Spark que sai, linha que nasce no ledger, requisição que chega ao provedor —, e não o mero fato de a tela mostrar uma imagem. Onde nada sai da carteira, esperar não protege nada e só atrasa. **O critério é "isto pode gastar?", nunca "isto parece importante?".**

   **Evidência tem endereço fixo:** `D:\Z - Meus Projetos DevIA\Creator TKS Labs\scratchpad\evidencias\<etapa>-<fase>\`, um arquivo por item, com **nome que diz o que aquele arquivo prova** (`trilho-fechado-luna-foto.png`, `numeros-fase5.md`), e a lista de caminhos no resumo. Pasta de temp com timestamp no nome não é evidência — daqui a uma semana ninguém acha, e prova que ninguém acha não prova nada.

   **Prova em número; print só quando o número não alcança** *(regra do fundador, 27/08/2026 — o porquê em [`docs/decisoes.md`](docs/decisoes.md))*. O entregável padrão de toda validação é **dado**: contagens, tabelas, leituras de log, banco ou DOM — o que se analisa, compara e cita.

   - **Screenshot como instrumento continua livre.** Olhar a tela em tempo real para saber o que está acontecendo é trabalho normal; o que muda é que isso **não vira entregável arquivado por padrão**.
   - **Print entra na evidência só quando a afirmação é inerentemente visual** e nenhum número a carrega — layout quebrado, imagem renderizando errado. E aí **um print decisivo, nunca uma série**.
   - **O que já está arquivado fica.** A regra vale daqui em diante, e não se reescreve evidência velha.

   **O racional:** o Jorge analisa números, não pixels. Série de print custa produtividade e tokens sem acrescentar decisão — e a casa já dizia isto desde a Fase 0 do egress: **o número decide.** Uma tabela de 53 → 1 se confere, se discute e se cita; uma pasta de dez imagens exige que alguém as abra uma a uma para chegar à mesma frase.

   **A primeira navegação para uma rota nova do `next dev` falha, e não é permissão** *(emenda de 28/08/2026, corrigida no mesmo dia)*. Turbopack compila sob demanda: a primeira requisição a `/studio` leva segundos, a navegação da extensão desiste, **a aba volta sozinha para `chrome://newtab/`** e o `javascript_tool` responde *"Permission denied for JavaScript execution on this domain"* — que é a mensagem errada para a causa certa.

   **O controle, e ele é de um passo:** navegar, **esperar `✓ Compiled /studio` no log do dev**, e navegar de novo — sem ninguém fazer nada. Se passar, era compilação. O `curl` complementa: app respondendo (307 do proxy, por exemplo) já diz que o servidor está de pé.

   > ⚠️ **Esta linha substitui uma afirmação errada minha**, que dizia que a permissão morria com o grupo de abas. **O Jorge não concedeu nada nas duas vezes** — só esperou e mandou tentar de novo. Eu li "funcionou depois que ele falou" como "ele concedeu", e transformei uma coincidência em regra **no arquivo lido em toda sessão**. Uma lição errada aqui custa mais que um número errado: ela manda pedir ao dono uma coisa que ele não precisa fazer, toda vez.

   **Nunca rodar `npm run build` com o `npm run dev` no ar** — os dois escrevem no mesmo `.next/`. Parar o dev, buildar, subir o dev de novo.

   **E antes de toda validação no navegador, conferir que a porta 3000 está servindo o código novo** *(emenda de 13/08/2026, nascida de um achado da Fase 4 do Ciclo Fila)*. Um `next dev` sobrevivente de uma etapa anterior continua ouvindo a 3000; o `npm run dev` novo vê a porta ocupada, sobe na 3001 e **morre** avisando que já existe outro servidor — e o navegador, apontado para a 3000, valida o código antigo com toda a aparência de estar validando o novo. **Um servidor velho valida o que não vai ser commitado.** Matar o sobrevivente (`netstat -ano | grep :3000` → `taskkill //PID <pid> //T //F`) e só então validar.

   **E o sobrevivente tem um caminho a mais, que não é o da porta ocupada** *(02/09/2026)*. A tarefa de fundo que segura o `npm run dev` pode ser dada como **encerrada** com o `next dev` **ainda ouvindo** — foi medido: a notificação disse *killed*, e o `netstat` mostrou o processo de pé, com o log agora fora de alcance. É a mesma armadilha chegando pelo lado onde ninguém a procura, porque o sinal que deveria avisar já disse que acabou. **Depois de encerrar um dev, conferir a porta em vez de acreditar no aviso** — e matar pelo PID, que é o que sobra quando o dono do processo já não responde.

   **O commit de fechamento e o `git push` são a mesma ação, nunca duas.** Commitar sem empurrar deixa a etapa pronta num lugar onde ninguém a vê — o deploy da Vercel sai do `origin/master`, então o que fica só no local não existe para o produto. Não há etapa "commitada mas ainda não empurrada": ou as duas rodaram, ou o fechamento não aconteceu.

   **E o resumo da etapa termina provando que o remoto recebeu**, colando a saída de:
   ```bash
   git log origin/master -1
   ```
   O hash e a mensagem no resumo são a prova. **"Está em produção" nunca mais é suposição: é uma linha de log.** Se essa linha não estiver no resumo, o resumo está incompleto — e se ela mostrar um commit que não é o do fechamento, o push falhou e isso precisa ser dito em vez de assumido.

9. **Plano aprovado vira arquivo em `docs/` ANTES de a primeira fase executar** *(regra de 17/08/2026)*. Todo plano de ciclo ou de frente — as fases, o que cada uma entrega, a prova de cada uma, o status e o detalhe da fase aberta — é escrito em `docs/plano-<frente>.md` e commitado **antes** do primeiro commit de código daquele plano. Depois, cada fase que fecha atualiza o status no mesmo arquivo, na mesma sessão.

   **Sessão não é lugar de guardar plano.** O Jorge fecha tudo entre sessões, e isso é o **modo normal de operar**, não exceção: um plano que só existe no contexto da conversa some no fechamento, e a sessão seguinte recomeça reconstruindo por adivinhação o que já tinha sido decidido — que é como uma decisão aprovada volta a ser discutida. O commit e o diário guardam o **porquê**; o arquivo de plano guarda o **onde estamos e o que falta**, que é justamente a pergunta que nenhum dos dois responde.

   Na dúvida sobre a fase seguinte, a ordem de leitura é: o arquivo de plano diz **o que** fazer e em que ponto paramos; [`docs/decisoes.md`](docs/decisoes.md) diz **por quê**; o código diz **como está hoje**. Se o arquivo de plano não existir para o trabalho em curso, **escrevê-lo é a primeira tarefa** — e ele volta para o Jorge conferir antes de qualquer código.

   **E toda pausa reescreve [`docs/ESTADO.md`](docs/ESTADO.md)** *(regra do Jorge, 31/08/2026)*. **Uma página**, sempre a mesma, com três seções: **o que está provado**, **o que está aberto**, **o próximo gesto**. Ela é reescrita — não apendada — a cada pausa do trabalho, e é a **primeira leitura de qualquer agente** que chega ao repositório, seja ele o Claude Code de amanhã ou outro.

   Por que ela existe tendo plano e diário: o diário é longo e cronológico, o plano é por frente, e nenhum dos dois responde *"em que pé está o projeto inteiro, agora"* sem que alguém leia muita coisa e some de cabeça. **O ESTADO é o checklist do projeto** — se ele estiver certo, uma sessão nova começa trabalhando em vez de arqueologando.
