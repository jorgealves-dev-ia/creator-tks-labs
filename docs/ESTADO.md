# ESTADO — onde o projeto está

> **Leia isto primeiro.** Uma página, reescrita **em toda pausa** (regra 9 do
> [`CLAUDE.md`](../CLAUDE.md)). Não é histórico: é o **checklist do projeto agora**.
> O *porquê* está em [`decisoes.md`](decisoes.md); o *o quê e em que ponto* de cada
> frente está no `plano-*.md` dela; o *como está hoje* está no código — e **o lugar de
> tudo isso no mapa inteiro está em [`ROADMAP.md`](ROADMAP.md).**

**Última reescrita:** 24/11/2026, de madrugada — **a F1 da Frente 1 está FECHADA.** O dono fez a metade paga em
23/11 — 4 leituras de produto, **16 ⚡** —, o banco confere (saldo **3.174 ⚡** = a soma do ledger) e as provas sem
rede, repetidas, passam. **Commitada em 24/11, com o ok do dono** — e, logo antes
dela, em commit próprio, o `db:push` e as regras de 21/11: ele liberou os dois («Os dois»). **A árvore ficou limpa.**

## 1 · Retoma daqui — leia antes de qualquer comando

### Onde estamos

| | o que é | estado |
|---|---|---|
| **item 0** | Pose, Character Sheet e Produto com a foto inteira e a prévia local pelo seletor | ✅ **em produção desde 21/11** — `8e4b456`, deploy `READY` |
| **F1** | a leitura de produto: o card (Nome · Fotos · Descrição · seletor · «Ler a foto · N ⚡» · o aviso de público, lista v5), a ação, o adaptador do Google, a migration e `record_product_reading` | ✅ **fechada em 23/11** — provada sem rede, na tela (21/11) e com dinheiro (23/11). **Commitada em 24/11** — `feat(produto): F1 — o card de Produto lê a foto («Ler a foto · N ⚡»)` |
| **o trabalho de 21/11 que não é F1** | `scripts/db-push.mts` e a linha `db:push` do `package.json`; as regras novas no `CLAUDE.md`, `AGENTS.md` e `README.md`; o `.mcp.json` com escrita; as quatro entradas de 21/11 no diário; a linha 8 do ROADMAP | ✅ **commitado em 24/11**, em commit próprio, logo antes do da F1 — `chore(db): o comando db:push, o MCP com escrita e as regras de 21/11`. *(Ficou no disco desde 21/11: o dono tinha dito «ainda não» antes de o comando falar com o banco.)* |
| **a próxima fase** | **F2** — o texto do card vira palavra no prompt | 0 ⚡ · o plano está escrito ([`plano-produto-diz.md`](plano-produto-diz.md), seção F2) |

### A metade do dono — 23/11, conferida pelo banco

O dono clicou no navegador dele (perfil «Jorge Alves - DevIA», `localhost:5599`, servidor com as chaves). **R1:**
4 ⚡ por clique, previsto 16, teto 40 — **saíram 16**.

| o quê | antes | depois |
|---|---|---|
| saldo da carteira = a soma do ledger | **3.190 ⚡** | **3.174 ⚡** |
| linhas de `ledger_transactions` | 110 | **114** |
| linhas de `extractions` | 8 | **12** — 4 de produto, todas `succeeded` |
| linhas de `generations` · `assets` | 719 · 121 | 719 · 124 |

- **3 leituras pelo Gemini 3.7 Flash** («2 preenchidos» cada) e **1 releitura pelo Haiku** com a Descrição apagada
  («1 preenchido · 1 preservado»); **um lançamento de −4 por leitura**, cada um com `extraction_id`; 0 falhas,
  0 leituras sem débito, 0 débitos sem leitura; 4 chamadas no log do servidor, nenhuma linha de erro.
- **O rótulo não vazou:** «baby doll», «evangélico» e «ouro 18K» estavam nos nomes dos arquivos e em leitura
  nenhuma.
- **O aviso de público acendeu em 1 das 4** — «Feminino» no Nome e «feminino» na Descrição do pijama — e em
  nenhuma das outras. **O dono não clicou no ×:** o card segue com a palavra.
- **Não exercitado ao vivo** (provado sem rede): a exceção «Baby Doll», o clique no ×, e as recusas.

**Evidência:** `scratchpad\evidencias\produto-diz-f1\metade-do-dono-2311.md`. **Projeto da prova:** «Projeto sem
título 2», criado pelo dono.

### Conferido no fechamento — 24/11, tudo 0 ⚡

| o quê | resultado |
|---|---|
| `typecheck` · `lint` · `build` | 0 · 0 · 0 *(o build compilou em 89 s, com o servidor parado)* |
| `git grep "SAI ANTES DO COMMIT" -- src/ supabase/` | vazio |
| a leitura de ponta a ponta, sem rede (`2311-fechamento`) | **87 de 87** · 0 pedidos saíram da máquina |
| o aviso v5 (`2311-fechamento`) | **7 provas, 0 falhas** · F0 5 de 5 |
| a produção | migration `20261002121933` aplicada (40 no banco); travas de 21/11: ledger **12 de 12**, F1 **23 de 23** |
| o servidor com chaves | **parado**; porta 5599 livre |

### A árvore — limpa

**Depois dos dois commits de 24/11 não há trabalho que só exista em disco** — o aviso «não rodar `git clean`», que
valeu de 03/10 a 23/11, deixou de ser necessário. **Se o `git status` mostrar arquivo modificado ao retomar, é
trabalho novo: descobrir de quem é antes de mexer.**

**Como conferir que o remoto recebeu:** o topo de `git log origin/master` tem de ser
`feat(produto): F1 — o card de Produto lê a foto («Ler a foto · N ⚡»)`,
e o anterior, `chore(db): o comando db:push, o MCP com escrita e as regras de 21/11`. Se não for, o push falhou.

**O que cada commit levou:** o de 21/11, 9 arquivos — `scripts/db-push.mts`, a linha `db:push` do `package.json`, o
`.mcp.json`, as regras no `CLAUDE.md`, `AGENTS.md` e `README.md`, as quatro entradas de 21/11 no diário, a linha 8
do ROADMAP e as notas do `arquitetura.md` sobre quem aplica migration. O da F1, 29 — o código (19), a migration
`20261002121933_product_readings.sql` (md5 `9fc5df36f8146f382a05570b01258e9a`, a que está no banco) e a trava
`supabase/travas/f1-leitura-de-produto.sql`, e as especificações do fechamento (8).

**Os retratos continuam** em `D:\Z - Meus Projetos DevIA\Creator TKS Labs\scratchpad\commits\`, como cópia:
`2311-0-antes-do-fechamento-f1` (a árvore de 23/11) e `2311-1-infra-de-2111-pronta` (a fronteira do commit de
21/11 — os documentos misturados entraram nele por este retrato, sem a F1).

### Próximos passos, nesta ordem

*(O ok do dono veio em 24/11 — «Os dois» —, e os dois commits foram feitos e empurrados juntos.)*

1. **F2 — o compilador cola a descrição.** 0 ⚡: prova estrutural + validação de tela, e produção no mesmo dia.
   **Condição:** *o texto que chega ao prompt é exatamente o que o card mostra e o aviso varre.*
2. **F3 — a prova viva: a blusa aparece.** ⚠️ **75 ⚡**, metade do dono. Usa um card já lido na F1 ou um texto
   colado — nenhuma leitura extra. Saldo no teto: 3.174 → **3.099**.

### Pendente do Jorge

- **o aviso de público:** a frase do quadro diz o bastante? **gênero** continua na lista? — ele viu o quadro em
  23/11 e não lembrava para que servia ([`decisoes.md`](decisoes.md), 23/11);
- **«tamanho único»** e **«one size»** — seguem na lista até ele decidir;
- **no painel do Google:** as 3 leituras de 23/11 (23:46, 23:48 e 23:49) têm de aparecer como **3 pedidos**; e a
  comparação das requisições de imagem dos últimos 30 dias com as linhas de `generations`;
- **sair do TKS no perfil «Soraia Jully» do Chrome** — em 21/11 ele estava logado lá, em produção; a regra
  «Navegador» (f) pede o TKS logado só no perfil «Jorge Alves - DevIA»;
- **os restos de teste** — «Projeto sem título 1» (do Claude, 21/11, com 3 fotos de teste) e «Projeto sem título 2»
  (dele, 23/11): ficam onde estão até existir o botão de apagar (aberto 4, abaixo); nada de apagar por SQL.

### Pendente de prova ao vivo

- **O conserto do Google (`19dc765`):** o painel do Google tem de mostrar **1 pedido por imagem** na primeira
  imagem paga da F3.

### O que mudou em 21/11 — regras da casa *(no `CLAUDE.md`; commitadas em 24/11)*

- **Quem aplica migration é o Code**, por uma porta só: `npm run db:push` (o ensaio, depois só as versões
  nomeadas). O que apaga ou reescreve dado existente espera o ok do dono.
- **O MCP do Supabase escreve dado** — dizendo antes o quê e por quê; **schema, nunca**. Estorno continua da R4.
- **Um projeto, uma conexão:** o Supabase entra só pelo `.mcp.json` desta pasta, nunca por conector da conta.
- **Nenhum fornecedor é regra da casa:** o dono quer um painel para escolher o modelo de cada tarefa
  ([`ROADMAP.md`](ROADMAP.md) §4, linha 8).

### Regra do bastão

**Sem autorização do Jorge, navegador não é usado.** Autorização é por tarefa, dizendo perfil e porta. *Em 23/11 o
dono ofereceu o navegador para a conferência; não foi preciso — o banco e o log bastaram.*

> 💬 **Desde 21/11 o dono trabalha direto no Claude Code desktop** — o planejamento não chega mais colado do Claude
> chat. **O que segura o dinheiro continua escrito no `CLAUDE.md`** (pior caso declarado, clique pago do dono) — **e
> o plano continua vindo antes do código** em toda fase com dinheiro (regra 9).

> ⚠️ **Abrir a sessão na pasta `creatortkslabs`, não na pasta-mãe** — a pasta-mãe não é repositório e não carrega o
> `CLAUDE.md` nem os MCPs. **E o banco demora a responder depois de semanas parado:** timeout na primeira leitura
> não é projeto pausado — tentar de novo.

> 📁 **Evidência:** `D:\Z - Meus Projetos DevIA\Creator TKS Labs\scratchpad\evidencias\` — as desta frente em
> `produto-diz-f0\`, `produto-diz-item0\`, `produto-diz-f1\` e `item0-f1-tela-2111\`. No disco D:, fora do
> repositório.

### Abertas — perguntas e intenções

| | o quê | estado |
|---|---|---|
| a | **«Colar com um card de Produto selecionado, para a foto entrar nele»** | não feito: seria funcionalidade, e mudaria a regra da F1a (colar cria um Input de Imagem) |
| b | **Vários navegadores com a extensão conectados à conta**, com nomes que não dizem o perfil | o dono escolhe a cada sessão, pelo pedido de conexão dentro do Chrome — regra «Navegador» (a) |
| c | **O navegador embutido do aplicativo desktop** | a trava só vigia as ferramentas da extensão do Chrome; o painel do desktop **não passa por ela**. Até o dono decidir, vale a regra do bastão para os dois, por frase |
| d | **A junção dos três sistemas** — TKS, Máquina de Conteúdo e Máquina de Edição num produto só, à venda, com modo por chat e modo canvas | **intenção declarada; estratégia não decidida, plano não escrito.** → [`decisoes.md`](decisoes.md), 21/11/2026 |
| e | **O painel de modelos** — escolher numa tela o fornecedor e o modelo de cada tarefa, OpenAI inclusive | **pedido do dono, 21/11; frente própria, sem plano.** Hoje a escolha mora no catálogo (o padrão é uma marca numa linha) e muda por migration; fornecedor novo precisa de adaptador (`gpt-5`, `gpt-5-mini` e `grok-4` estão no catálogo sem adaptador); a tarifa real do texto está no código (`src/lib/ai/pricing.ts`) |
| f | **Três dívidas de documentação** | o `.env.example` lista `GOOGLE_AI_API_KEY` e `FAL_WEBHOOK_SECRET` (o código lê `GEMINI_API_KEY`, e o segredo não existe) e não lista `XAI_API_KEY` nem `FAL_WEBHOOK_URL` *(e falta conferir se traz o `SUPABASE_DB_URL`, que o `db:push` lê)*; o `arquitetura.md` §4 fala em 15 e 16 tabelas (são **21**), descreve 29 das 40 migrations e a árvore de pastas do §5 ainda traz `config/models.json`; o inventário do `ROADMAP.md` é de 16/09 |

## 2 · O gasto real — 23/11

**16 ⚡ da carteira**, em 4 leituras de produto; **11 centavos de provedor** (Google 9, Anthropic 2). Saldo
**3.174 ⚡** = a soma do ledger, conferido no banco depois da prova. Tudo o mais, desde 07/09, foi 0 ⚡.

> 🔑 **Chaves e contas** (sonda de 23/11): Anthropic, Google, fal e OpenAI aceitas; xAI sem chave. **GitHub:** secret
> scanning e push protection ligados. O repositório é **público**.

---

## O que está PROVADO

**A fundação.** Canvas de nodes, projetos, character sheet com versões congeladas, motor
de extração, compilador determinístico, geração de imagem canônica, ledger append-only
com as travas no banco. RLS em todas as **21** tabelas.

**Frente Storyboard · Ciclos 1 a 3 e o vídeo final.** O elo (⚠️ *veredito humano NÃO MEDIDO, com
gatilho*); o Roteiro; **a Máquina, encerrada** — 3 cenas, 870 ⚡, zero reconciliação à mão; **um filme**
montado em JavaScript puro, sem `ffmpeg`, a 0 ⚡.

**Frente A′ — ✅ FECHADA em 07/09. A FOTO CHEGA AO PROVEDOR.** A fidelidade não estava provada — saiu um
vestido onde a foto é uma blusa, porque a palavra «blusa» nunca chegou ao modelo: **é a Frente 1.**

**Frente 1 · F0 e F1a — ✅ FECHADAS em 27/09, e a dívida da F1a paga em 01/10.** O compilador reproduz o texto de
07/09 byte a byte; o contrato v2 está no plano byte a byte; o padrão é o 3.7 Flash; **o acervo diz a verdade sobre
os tipos**; e **o envio não deixa resto** — recusado quer dizer nada gravado.

**Frente 1 · item 0 — ✅ em produção (21/11).** Os quatro cards de Input mostram a foto inteira e a recebem na
hora, pelo mesmo código.

**Frente 1 · F1 — ✅ FECHADA em 23/11.** **O card de Produto lê a foto.** Provado nos três níveis: **sem rede** —
um clique faz no máximo uma chamada e um débito; recusa e falha não cobram; o preço é o do catálogo; o pedido que
sai é o que a F0 mediu —; **no banco de produção** — a migration aplicada, as travas 23 de 23, a lista fechada do
ledger 12 de 12 —; e **com dinheiro**, pelos cliques do dono: 4 leituras, 4 débitos de 4 ⚡, saldo igual ao ledger.
**A leitura lê; ainda não fala:** o texto do card só vira palavra no prompt na F2.

**Dois fatos provados ao vivo, de graça:** **recusa de provedor não debita** (`a10f13c0`); e **o filtro que
barrou é do Google, verbatim** (`google.ts:258`).

**Dinheiro, depois do incidente de 29/08.** As quatro travas do motorista, cada uma com simulação
vermelha→verde reexecutável; a fechadura ED25519 do webhook; a trava de vida do endereço de retorno. **E o
invariante do ledger com lista fechada** (03/10): quatro funções escrevem nele, conferidas por script.

**Instrumentos.** `scratchpad\harness\medir-canvas.js` recusa número de canvas não pintado; o dev sobe sempre
na **5599**; **`npm run probe:keys`** confere as chaves **e a regra 7**; **`npm run sweep:orphans`** confere o
Storage contra o banco **e o próprio invariante**; **a trava de navegador entre projetos**; **o banco de ensaio**
(`scratchpad\harness\banco-de-ensaio.ts`) — um Postgres de verdade, em memória, com as migrations aplicadas como o
CLI as aplica; **`npm run db:push`** — o ensaio e a aplicação de migration em lista fechada, sem nunca imprimir a
senha; e **`scratchpad\harness\rodar-trava-producao.mjs`** — manda um arquivo de trava inteiro à produção, com
evidência que não se sobrescreve.

---

## O que está ABERTO

| # | o que falta | quem fecha |
|---|---|---|
| 1 | **🎯 Frente 1 — o produto diz o que é** — [`plano-produto-diz.md`](plano-produto-diz.md). **F0 ✅ · F1a ✅ · item 0 ✅ · F1 ✅** → **F2** (0 ⚡) → **F3**, a prova viva, **75 ⚡**. Da carteira saíram 16 ⚡; o pior caso que resta é o da F3: saldo 3.174 → 3.099 | Claude — a F2; **dono** — o clique da F3 |
| 2 | **Um vizinho do conserto do Google:** um 403 da API de Interactions é lido como erro genérico (`provider`), não como chave recusada (`not_configured`) — só muda a frase na tela. A retentativa em si está consertada (`19dc765`); falta a prova ao vivo (ver o topo) | dono |
| 3 | **Três achados sobre o tipo dos arquivos, fora da F1a:** a **extração de personagem** manda à Anthropic o tipo do navegador (WebP chamado `.jpg` → 400, antes de cobrar — caminho que cobra, decisão do dono); o **envio da imagem canônica** grava o tipo do navegador; os **metadados dos 6 objetos antigos no Storage** dizem `image/jpeg` | dono |
| 4 | **Apagar asset da galeria, com auditoria de referências** — o botão não existe. **0 ⚡.** → §9 do [`plano-video-final.md`](plano-video-final.md). **Primeiro caso:** os 13 envios de teste e o projeto «Teste F1a — colar e soltar», mais os dois projetos de teste e as 3 fotos de 21/11 — decisão do dono (02/10): ficam onde estão, e nada de apagar por SQL | Claude |
| 5 | **Achados da prova de 23/11, nenhum bloqueia:** **o Flash leva de 16 a 20 s por leitura** (o Haiku, 4 s) — o botão fica em «Lendo a foto…» todo esse tempo; **o extrato nomeia o que a leitura escreveu, não o Nome do card** (na releitura os dois diferem); **o Haiku afirmou material e se contradisse entre português e inglês** na mesma leitura; **a regra 2 do contrato segue «reduz, não elimina»** (gênero em 1 de 3 leituras do Flash) | dono, sem pressa |
| 6 | **Coladas seguidas no mesmo ponto se sobrepõem** — a posição livre da casa desce só 64 px, e os cards têm mais de 300. Visual, 0 ⚡. | plano |
| 7 | **O selo «bloqueada pelo filtro do Google» nunca foi visto em tela** — a F3 é a oportunidade, a 0 ⚡ extra. | oportunidade |
| 8 | **Egress §4.5** — o egress na fatura, esperando o gráfico de Usage. | o relógio |
| 9 | **Perguntas com gatilho:** a **0.3** (a aba escondida trava o elo?); **recusa × concorrência** (n ≥ 30); **a trava de dono da linhagem, provada de um lado só** — o gatilho é a segunda conta. | medição |
| 10 | **Duas perguntas para a frente 5 (Publicação), antes de ela abrir:** publicar **não gasta e não tem volta**; **tokens da Meta por conta não cabem em variável de ambiente**. → [`ROADMAP.md`](ROADMAP.md) §3 e §4 | dono, quando a frente abrir |
| 11 | **Backlog nomeado:** cards **Pose, Character Sheet e Produto com a foto inteira** — ✅ confirmado ao vivo em 21/11; **«transporte do envio com progresso real»** — *gatilho: quando envios acima de 5 MB virarem rotina (vídeo, Take Mode)*; **detecção de formato** (1:1, 4:5, 9:16) — na frente de formatos IG; **a resposta perdida de uma leitura não sobrevive a recarregar a página** (a leitura fica gravada e cobrada; o card não a recebe); **o custo real do Roteiro pode estar subcontado** — o adaptador de texto grava só os tokens de resposta, e o Google reporta o pensamento à parte; é só o registro do custo, não o Spark; **investigar se a trava de navegador consegue ler o perfil realmente conectado**; o envio que **nunca responde no registro** deixa 2 objetos — de propósito; saem pela varredura depois de 24 h; arquivar/ocultar na galeria; filtros e busca; o glifo ⇥ com contraste fraco; três arestas órfãs; o «Reanimar» é tudo-ou-nada; **montar duas vezes o mesmo roteiro faz DOIS filmes idênticos**; **uma leitura de carteira que falha vira «você tem 0 ⚡»** — **mente sobre dinheiro** *(a leitura de produto já não faz isso; os outros caminhos, sim)*; **os outros `<dialog>`** com o buraco do `nowheel`; re-semear o canvas quando o HMR cria um store vazio; `edited_at` × `updated_at` em relógios diferentes; **`nanoid` < 3.3.18** (1 alta do `npm audit`, transitiva do Next 16.3.0); **a sonda de chaves na TELA**; o cadastro com confirmação por e-mail no dev local precisaria da 5599 nos redirecionamentos do Supabase; o card antigo do «Projeto teste Foto da Blusa» guarda como Nome o rótulo do arquivo, gravado antes da F1. | plano |

---

> **Projeto de prova da frente:** «Projeto teste Foto da Blusa» — o percurso da A′, com a foto
> `06778db7` (WebP — agora registrada como WebP) e a geração `0cf3f069`. **O controle da F3 estava
> intacto na última conferência** (o fluxo salvo dele não mudou ao ser aberto em 21/11) — a F3 confere de novo
> antes do clique. **A prova de 23/11 não aconteceu nele**, e sim no «Projeto sem título 2».

> **O dev sobe na 5599** (`npm run dev`). **Para o ambiente de vídeo** *(a Frente 1 não precisa)*: o túnel
> aponta para `http://localhost:5599` e vive **no comando** —
> `FAL_WEBHOOK_URL="https://<tunel-de-hoje>.trycloudflare.com/api/webhooks/fal" npm run dev`.
