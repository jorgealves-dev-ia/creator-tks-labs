# ESTADO — onde o projeto está

> **Leia isto primeiro.** Uma página, reescrita **em toda pausa** (regra 9 do
> [`CLAUDE.md`](../CLAUDE.md)). Não é histórico: é o **checklist do projeto agora**.
> O *porquê* está em [`decisoes.md`](decisoes.md); o *o quê e em que ponto* de cada
> frente está no `plano-*.md` dela; o *como está hoje* está no código — e **o lugar de
> tudo isso no mapa inteiro está em [`ROADMAP.md`](ROADMAP.md).**

**Última reescrita:** 21/11/2026, ~18h40 — **retomada depois de 49 dias, agora direto no Claude Code desktop.**
Sessão só de conferência: nenhum dev no ar, **o navegador não foi usado**, **nenhuma chamada paga**, migration
**não aplicada**, nenhum código novo. **O código é o de 03/10, byte a byte** — o que mudou hoje foi só este
arquivo, o diário e uma frase do ROADMAP.

## 1 · Retoma daqui — leia antes de qualquer comando

### Conferido em 21/11 — tudo 0 ⚡

| o quê | como | resultado |
|---|---|---|
| a sessão | `git worktree list` | a pasta principal do repositório, `master`, sem worktree |
| git × GitHub × produção | `git rev-parse`, `gh api`, MCP da Vercel | os três em **`2486a68`**; produção `READY`; nenhum commit, branch, PR ou deploy depois de 03/10 |
| **a árvore suja** | md5 contra o `MANIFESTO.md` do retrato de 03/10 | **28 de 28** — 14 modificados, 14 não rastreados; conferido de novo **depois** do build |
| o andaime | `git grep` | **9** na árvore, **0** no índice — como em 03/10 |
| `typecheck` · `lint` · `build` | os três | passam *(o build compilou em 3,8 min, com o cache frio; em 02/10, 4,6 s)* |
| as provas sem rede | os harnesses, rótulo `2111-retomada` | leitura **87 de 87** · item 0 **31 de 31** · aviso v5 **7 de 7** (F0 **5 de 5**) · 0 pedidos saíram da máquina |
| as chaves e a regra 7 | `npm run probe:keys` | Anthropic, Google, fal e OpenAI aceitas; xAI sem chave; secret scanning e push protection ligados |
| **a produção** | MCP do Supabase, só leitura, às 18h32 | **idêntica a 03/10** — a tabela abaixo; a última geração e o último lançamento são de **07/09** |
| a trava do navegador | `trava-navegador.mjs status` | instalada, **livre**; não foi exercitada |

**Evidência:** `scratchpad\evidencias\produto-diz-f1\f1-leitura-2111-retomada.md` e
`aviso-de-publico-v5-2111-retomada.md` · `produto-diz-item0\numeros-item0-estrutural-2111-retomada.md` · os logs
`scratchpad\retomada-2111-*.log`.

> ⚠️ **Abrir a sessão na pasta `creatortkslabs`, não na pasta-mãe.** A pasta-mãe não é repositório: uma sessão
> aberta nela não carrega o `CLAUDE.md` nem os MCPs do `.mcp.json` — foi o que aconteceu no começo de 21/11, e a
> produção só pôde ser relida depois da mudança de pasta.

> ⚠️ **O banco demora a responder depois de semanas parado.** As quatro primeiras leituras de 21/11 deram
> *connection timeout*; a quinta, cerca de um minuto depois, respondeu. **Timeout na primeira leitura não é
> projeto pausado** — tentar de novo antes de concluir. *(A causa é hipótese: banco frio. Não foi investigada.)*

### Onde estamos

**F1 e item 0 prontos e provados sem rede, NÃO commitados de propósito.**

| | o que é | por que não está commitado |
|---|---|---|
| **item 0** | Pose, Character Sheet e Produto com a foto inteira e a prévia local pelo seletor | espera a **prova ao vivo** (navegador) — e tem **commit próprio** |
| **F1** | a leitura de produto inteira: migration, ação, card, botão, seletor, aviso de público (**lista v5**) | **tem dinheiro:** espera a **metade paga do dono** (regra 8) |

**A árvore está suja, e é para estar:**

- o **item 0**;
- a **F1 inteira**, com a lista **v5** (`src/lib/product-reading/audience-terms.ts`, md5 `ef530423e67fa5d7332c52a56e63131f`);
- `supabase/migrations/20261002121933_product_readings.sql` — md5 **`9fc5df36f8146f382a05570b01258e9a`**, **não aplicada**;
- `supabase/travas/f1-leitura-de-produto.sql`;
- o **andaime** de `src/lib/supabase/database.types.ts` — **9 blocos `SAI ANTES DO COMMIT`**. **Esse arquivo não
  se mexe** (decisão do dono, 02/10): sai quando os tipos forem regerados do banco, depois da migration. Até lá o
  `git grep` do fechamento acusa **na árvore** (9) e dá **0 no índice** (`git grep --cached`) — commits saem
  **por caminho explícito**.

### ⛔ Aviso de proteção

**NÃO rodar `git clean`, `git checkout .`, `git restore .` nem `git stash`.** A árvore tem trabalho que **só
existe em disco** — 14 arquivos modificados e 14 não rastreados.

**O retrato da árvore**, se o pior acontecer: `D:\Z - Meus Projetos DevIA\Creator TKS Labs\scratchpad\commits\0310-3-fechamento\`

- `arvore.patch` — o `git diff HEAD --binary` dos 14 modificados — md5 **`596eb8e5c17a67567c3d366ec2f6a12e`**;
- `arquivos\` — a cópia inteira dos 28 arquivos;
- `MANIFESTO.md` — um md5 por arquivo — md5 **`7f2befd265982e3ebc5f1c88c1eb0cec`**.

Restaurar é copiar `arquivos\` por cima do repositório. *O retrato é da árvore que sobra depois do commit de
documentação de 03/10 — os cinco arquivos daquele commit não estão nele, estão no git.* O retrato do **item 0
sozinho** (a fronteira do commit dele) continua em `scratchpad\commits\0210-1-item0-tres-cards` — **uma
armadilha:** ele traz `decisoes.md` e o plano como estavam em 02/10 de manhã; no commit do item 0 esses dois não
entram.

### Os números de produção ANTES da migration — para a conferência depois

Lidos em produção, só por leitura (MCP), em 03/10 às 22h16 — **e relidos em 21/11 às 18h32: os mesmos.**

| o quê | antes da migration |
|---|---|
| saldo da carteira | **3.190 ⚡** (= a soma do ledger) |
| linhas de `extractions` | **8** |
| linhas de `ledger_transactions` | **110** |
| linhas de `generations` | **719** |
| migrations aplicadas | **39** — a última é `20260904210000`; a da F1 **não está**, e `record_product_reading` **não existe** |

*Em 21/11 o catálogo segue como a migration espera encontrar: 14 modelos, o Sonnet como padrão de extração a
20 ⚡, o Gemini 3.7 Flash só com `text_gen`, os dois `gemini-2.5-*` ainda ligados.*

A migration não grava em nenhuma das três tabelas nem na carteira: **depois dela, os quatro números têm de ser os
mesmos**, e as migrations, 40.

### Próximos passos, nesta ordem

0. **Decidir quem aplica a migration** *(novo, 21/11)*. O dono disse que quer **delegar a aplicação ao Code** —
   tudo o que não for segredo. **Hoje o Code não consegue:** o MCP do Supabase é só leitura por desenho, e o
   `db push` pede a connection string, que traz a senha do banco. **Até a decisão sair, vale o passo 1 como está**
   — e a regra do `CLAUDE.md` («o Claude Code nunca aplica migrations») só muda com a decisão registrada. →
   [`decisoes.md`](decisoes.md), 21/11/2026
1. **Jorge aplica a migration** pelo Session pooler —
   `npx supabase db push --db-url "<connection string do Session pooler>"`. Ela é tudo ou nada e confere o que
   instalou.
2. **Jorge roda, no SQL Editor:** `supabase/travas/f1-leitura-de-produto.sql` — esperado
   **`TOTAL 23 · OK 23 · FALHA 0 · nao exercitado 0`** — e depois `supabase/travas/escritores-do-ledger.sql` —
   esperado **`TOTAL 12 · OK 12 · FALHA 0`**, com a migration aplicada. *(Os dois relatórios chegam como "erro":
   é o formato da casa. Nenhum grava nada.)*
3. **Conferir saldo e contagens** contra a tabela acima.
4. **Code regera os tipos** (`database.types.ts`, do banco) **e tira o andaime** — com o `git grep` dando **0
   também na árvore**.
5. **Bastão do navegador** — perfil **«Jorge Alves - DevIA»**, porta **5599**, servidor subindo com
   `GEMINI_API_KEY= ANTHROPIC_API_KEY= npm run dev` — para a **prova ao vivo do item 0** e a **prova de tela da
   F1** (conferir a **altura do card em canvas antigo**). Depois, **commit do item 0**.
6. **Metade paga do Jorge, até 40 ⚡** (previsto **16**; com repetição, **32**): **3 fotos do catálogo** — Pijama
   Baby Doll, uma peça com público visível, uma semijoia sem evidência —, **3 leituras no Gemini 3.7 Flash a 4 ⚡**
   e **1 releitura pelo Haiku com o campo em branco**. **R1: o botão tem de dizer «Ler a foto · 4 ⚡», ou o clique
   não acontece.**
7. **Commit da F1.**

### Pendente do Jorge

- confirmar que **as 3 fotos existem no catálogo**;
- decidir **«tamanho único»** e **«one size»** — seguem na lista até lá;
- comparar, no painel do Google, as **requisições de imagem dos últimos 30 dias** com as linhas de `generations`.

### Pendente de prova ao vivo

- **O conserto do Google (`19dc765`):** o painel do Google tem de mostrar **1 pedido por imagem** na primeira
  imagem paga da F3.

### Condição da F2

**O texto que chega ao prompt é exatamente o que o card mostra e o aviso varre.**

### Backlog

- cards **Pose, Character Sheet e Produto com a foto inteira** — o item 0 já cobre; **confirmar** na prova ao vivo;
- **transporte do envio com progresso real** — *gatilho: envios acima de 5 MB como rotina*;
- **botão de apagar com auditoria de referências** — primeiro caso: os **13 envios de teste**;
- **detecção de formato** (1:1, 4:5, 9:16) — na frente de formatos IG.

### Regra do bastão

**Sem autorização do Jorge, navegador não é usado.** Autorização é por tarefa, dizendo perfil e porta.

> 💬 **Desde 21/11 o dono trabalha direto no Claude Code desktop** — o planejamento não chega mais colado do Claude
> chat, e a revisão que acontecia lá deixou de existir. **O que segura o dinheiro continua escrito no `CLAUDE.md`**
> (pior caso declarado, clique pago do dono) — **e o plano continua vindo antes do código** em toda fase com
> dinheiro (regra 9). Dúvida se pergunta aqui mesmo.

> 🔎 **Código novo sobre o banco de hoje é seguro — provado:** sem a migration, a lista de produto vem vazia, o
> botão nasce desligado e nada cobra; os outros seletores continuam de pé.

> 📁 **Evidência:** `D:\Z - Meus Projetos DevIA\Creator TKS Labs\scratchpad\evidencias\` — as desta frente em
> `produto-diz-item0\` e `produto-diz-f1\`. No disco D:, fora do repositório.

### Decidido em 03/10 (já feito)

- **Quem cobra a leitura de produto: `record_product_reading`** (a saída A). O invariante do ledger foi
  reescrito — *todo débito entra no ledger por função do banco que lê o preço do catálogo, append-only, com a
  carteira travada* — com lista fechada e script que a confere.
- **A lista do aviso: v4 e v5.** A regra do hífen revogada; exceções como frase; a sequência de tamanho sem resto;
  o espaço sozinho só junta tamanhos do mesmo tipo; a remoção leva o hífen. **Ficam como estão:** «Tamanho 38 M»
  sem destaque, as exceções com hífen ou espaço, e «kid-friendly», «teen-style» e «pré-adulto» acendendo.
- **O script do ledger acusa `EXECUTE`** em função `security definer`, para revisão manual — hoje, nenhuma.
- **Produção não referencia os `gemini-2.5-*`** que a migration desliga: 0 em fluxos, extrações, gerações,
  perfis, entidades e preços.

### Ainda abertas, de antes

| | o quê | estado |
|---|---|---|
| a | **«Colar com um card de Produto selecionado, para a foto entrar nele»** | não fiz: seria funcionalidade, e mudaria a regra da F1a (colar cria um Input de Imagem) |
| b | **3 navegadores com a extensão conectados à conta**, com nomes que não dizem o perfil | o dono escolhe a cada sessão, pelo pedido de conexão dentro do Chrome — regra «Navegador» (a) |

### Abertas em 21/11

| | o quê | estado |
|---|---|---|
| c | **O navegador embutido do aplicativo desktop** | a trava só vigia as ferramentas da extensão do Chrome (`mcp__claude-in-chrome__*`); o painel de navegador do desktop **não passa por ela**. Até o dono decidir, vale a regra do bastão para os dois, por frase |
| d | **A junção dos três sistemas** — TKS, Máquina de Conteúdo e Máquina de Edição num produto só, à venda, com modo amigável (por chat) e modo avançado (canvas) | **intenção declarada pelo dono; estratégia não decidida, plano não escrito.** Nada no código muda. → [`decisoes.md`](decisoes.md), 21/11/2026 |
| e | **O trabalho da F1 mora num disco só** | a árvore e o retrato de 03/10 estão no mesmo HD (D:). O retrato tem 688 KB — vale uma cópia fora do D: até o commit da F1 |
| f | **Três dívidas de documentação** | o `.env.example` lista `GOOGLE_AI_API_KEY` e `FAL_WEBHOOK_SECRET` (o código lê `GEMINI_API_KEY`, e o segredo não existe) e não lista `XAI_API_KEY` nem `FAL_WEBHOOK_URL`; o `arquitetura.md` §4 fala em 15 e 16 tabelas (são **21**) e a árvore de pastas do §5 ainda traz `config/models.json`; o inventário do `ROADMAP.md` é de 16/09 |

## 2 · Feito em 02/10 e 03/10 — tudo 0 ⚡

| o quê | onde |
|---|---|
| **As decisões do dono sobre os três pontos de 01/10, e a lista v2 do aviso de público** no plano — com as exceções («baby doll», «rosa bebê») e a gramática do tamanho | [`plano-produto-diz.md`](plano-produto-diz.md), item 9 da F1 · [`decisoes.md`](decisoes.md) |
| **Item 0 — a foto inteira nos outros três cards de Input**, e a prévia local pelo «Enviar imagem» do seletor; os quatro cards pedem a foto por um gancho só | `use-input-picture.ts` · `lib/canvas/picker-upload.ts` · os três cards |
| **O aviso de público** — acha e remove, puro, com a lista v2 | `lib/product-reading/audience-terms.ts` |
| **A migration da F1** — `extractions` aprende produto, o padrão da lista de produto, `record_product_reading` — **ensaiada num Postgres de verdade** sobre as 39 migrations de produção | `supabase/migrations/20261002121933_product_readings.sql` · `supabase/travas/f1-leitura-de-produto.sql` |
| **A leitura** — o contrato v2 byte a byte, a ação, o adaptador do Google, o registro e o catálogo próprios | `lib/product-reading/` · `lib/providers/google.ts` · `registry.ts` · `lib/ai/catalog.ts` |
| **O card** — Nome · Fotos · Descrição (2.000, com contador) · seletor · «Ler a foto · N ⚡» · o aviso | `input-product-node.tsx` · `lib/i18n/pt-BR.ts` |
| **✅ O conserto do Google, em produção (`19dc765`)** — o `NO_RETRIES` não chegava à API de Interactions; erro 408/409/429/500/503/queda faziam **5 pedidos** por chamada nos geradores de imagem e de texto; agora **1**. 9 provas HEAD × conserto; resposta 200 idêntica. Commit de 1 arquivo, montado por hash, **sem o adaptador de leitura** | `lib/providers/google.ts` · [`decisoes.md`](decisoes.md), 02/10 |
| **✅ 03/10 · O invariante do ledger, com lista fechada** — *todo débito entra por função do banco que lê o preço do catálogo, append-only, com a carteira travada*. **3 funções hoje** (`record_generation`, `record_extraction`, `complete_video_generation`) — **as mesmas em produção, lidas pelo MCP** — e 4 com a F1. Script só-leitura que fica vermelho com função nova fora da lista: 7 de 7 sabotagens acusadas | `supabase/travas/escritores-do-ledger.sql` · `escritores-do-ledger-0310.md` |
| **✅ 03/10 · A lista v4 do aviso** — a regra do hífen revogada (exceções como frase no lugar); conectores e espaço na sequência; G1–G4, EG1–EG4, XG1–XG4, o valor entre parênteses; número com unidade não é tamanho. 10 provas; 14 das 121 entradas antigas mudam, as previstas | `lib/product-reading/audience-terms.ts` · `aviso-de-publico-v4-0310.md` |
| **✅ 03/10 · A lista v5 do aviso** — o espaço sozinho só junta tamanhos do mesmo tipo («Tamanho M 2 peças» acende só «Tamanho M»); a remoção leva o hífen («Blusa infantil-azul» → «Blusa azul»). 7 provas, 42 casos; 4 das 170 entradas antigas mudam, as previstas; F0 5 de 5; leitura 87 de 87 | `lib/product-reading/audience-terms.ts` · `aviso-de-publico-v5-0310.md` · `f1-leitura-0310-2.md` |
| **✅ 03/10 · O script do ledger acusa `EXECUTE`** em função `security definer` de `public`, para revisão manual — o `INSERT` montado em tempo de execução passava (FALHA 0) e agora é acusado (FALHA 1); controles calados; total sem sabotagem igual (10 hoje, 12 com a F1); produção: 0 funções | `supabase/travas/escritores-do-ledger.sql` · `escritores-do-ledger-execute-0310.md` |
| **✅ A lista v3 do aviso de público** — «tamanhos», «infantis», 4 cores bebê, o «do» antes do número, e o hífen; 14 provas vermelho→verde | `lib/product-reading/audience-terms.ts` · `aviso-de-publico-v3-0210.md` |
| **✅ O código no ar × a migration** — os fluxos de hoje (extração por foto e por texto, falha grátis, saldo curto, `record_generation` ×3, `INSERT` antigo) rodados antes e depois, sobre linhas antigas: **10 de 12 idênticos**, as 2 diferenças esperadas e sem gasto; nenhuma coluna `NOT NULL` sem padrão | `hoje-contra-a-migration-0210.md` |

**Provas — todas estruturais, cada uma vermelho→verde:** a leitura de ponta a ponta, **87**; as travas do banco,
**50**, e o script do dono, **23 de 23**; o aviso de público, **16** sobre 104 casos (v2) e **14** (v3); o item 0,
**31**; a retentativa, **5**; o conserto do Google, **9**; o código no ar × a migration, **9**. `lint`, `typecheck` e `build` passam; o contrato de leitura está em **0** arquivos do pacote do
navegador.

## 3 · O gasto real — 02/10 e 03/10

**0 ⚡ e 0 centavos de provedor.** Nenhuma chamada a provedor de IA: o provedor das provas é um `fetch` falso, e as
chaves valem `chave-falsa-do-ensaio`. Saldo **3.190 ⚡** = a soma do ledger, conferido no banco em 02/10 e de novo
em 03/10 às 22h16: 110 lançamentos; 8 extrações; 719 gerações; 39 migrations — **a da F1 não está
aplicada.** O que houve foi leitura pelo MCP.

> 🔑 **Chaves e contas:** como em 27/09 — Anthropic, Google, fal e OpenAI aceitas pela sonda; xAI sem chave. **GitHub:**
> secret scanning e push protection ligados. O repositório é **público**.

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

**Frente 1 · F1 — 🟡 provada só no ensaio.** O que está provado é **o código**, sem rede: um clique faz no máximo
uma chamada e um débito; recusa e falha não cobram; o preço é o do catálogo; o pedido que sai é o que a F0 mediu.
**Não está provado:** a tela, o banco de produção com a migration, e os provedores de verdade.

**Dois fatos provados ao vivo, de graça:** **recusa de provedor não debita** (`a10f13c0`); e **o filtro que
barrou é do Google, verbatim** (`google.ts:258`).

**Dinheiro, depois do incidente de 29/08.** As quatro travas do motorista, cada uma com simulação
vermelha→verde reexecutável; a fechadura ED25519 do webhook; a trava de vida do endereço de retorno.

**Instrumentos.** `scratchpad\harness\medir-canvas.js` recusa número de canvas não pintado; o dev sobe sempre
na **5599**; **`npm run probe:keys`** confere as chaves **e a regra 7**; **`npm run sweep:orphans`** confere o
Storage contra o banco **e o próprio invariante**; **a trava de navegador entre projetos**. **E um novo, de 02/10:
o banco de ensaio** (`scratchpad\harness\banco-de-ensaio.ts`) — um Postgres de verdade, em memória, com as
migrations do repositório aplicadas como o CLI as aplica: uma migration deixa de ser um arquivo que nunca rodou
antes de chegar ao dono. *Prova que o SQL e as travas fazem o que dizem; não prova que a produção está igual —
isso se confere lá, pelo MCP.*

---

## O que está ABERTO

| # | o que falta | quem fecha |
|---|---|---|
| 1 | **🎯 Frente 1 — o produto diz o que é** — [`plano-produto-diz.md`](plano-produto-diz.md). **F0 ✅ · F1a ✅ · item 0 🟡 · F1 🟡** → **F2** → **F3**, a prova viva, 75 ⚡. Pior caso da carteira: **115 ⚡** (40 + 75), saldo 3.190 → 3.075 no teto — sem leitura extra da blusa. ⚠️ *A linha da frente 1 no ROADMAP §4 está velha e se corrige no fechamento da frente.* | **dono** — a migration, o bastão, a metade paga; Claude — o resto |
| 2 | **Um vizinho do conserto do Google:** um 403 da API de Interactions é lido como erro genérico (`provider`), não como chave recusada (`not_configured`) — só muda a frase na tela. A retentativa em si está consertada (`19dc765`); falta a prova ao vivo (ver o topo) | dono |
| 3 | **Três achados sobre o tipo dos arquivos, fora da F1a:** a **extração de personagem** manda à Anthropic o tipo do navegador (WebP chamado `.jpg` → 400, antes de cobrar — caminho que cobra, decisão do dono); o **envio da imagem canônica** grava o tipo do navegador; os **metadados dos 6 objetos antigos no Storage** dizem `image/jpeg` | dono |
| 4 | **Apagar asset da galeria, com auditoria de referências** — o botão não existe. **0 ⚡.** → §9 do [`plano-video-final.md`](plano-video-final.md). **Os 13 envios de teste e o projeto «Teste F1a — colar e soltar» são o primeiro caso dele — decisão do dono, 02/10: ficam onde estão, e nada de apagar por SQL** | Claude |
| 5 | **Coladas seguidas no mesmo ponto se sobrepõem** — a posição livre da casa desce só 64 px, e os cards têm mais de 300. Visual, 0 ⚡. | plano |
| 6 | **O selo «bloqueada pelo filtro do Google» nunca foi visto em tela** — a F3 é a oportunidade, a 0 ⚡ extra. | oportunidade |
| 7 | **Egress §4.5** — o egress na fatura, esperando o gráfico de Usage. | o relógio |
| 8 | **Perguntas com gatilho:** a **0.3** (a aba escondida trava o elo?); **recusa × concorrência** (n ≥ 30); **a trava de dono da linhagem, provada de um lado só** — o gatilho é a segunda conta. | medição |
| 9 | **Duas perguntas para a frente 5 (Publicação), antes de ela abrir:** publicar **não gasta e não tem volta**; **tokens da Meta por conta não cabem em variável de ambiente**. → [`ROADMAP.md`](ROADMAP.md) §3 e §4 | dono, quando a frente abrir |
| 10 | **Backlog nomeado:** **«transporte do envio com progresso real»** — *gatilho: quando envios acima de 5 MB virarem rotina (vídeo, Take Mode)*; até lá o teto por tamanho serve (decisão do dono, 02/10); **a resposta perdida de uma leitura não sobrevive a recarregar a página** (a leitura fica gravada e cobrada; o card não a recebe); **o custo real do Roteiro pode estar subcontado** — o adaptador de texto grava só os tokens de resposta, e o Google reporta o pensamento à parte (medido na leitura, com o mesmo modelo: 537 de 687); é só o registro do custo, não o Spark; **investigar se a trava de navegador consegue ler o perfil realmente conectado**; o envio que **nunca responde no registro** deixa 2 objetos — de propósito; saem pela varredura depois de 24 h; arquivar/ocultar na galeria; filtros e busca; o glifo ⇥ com contraste fraco; três arestas órfãs; o «Reanimar» é tudo-ou-nada; **montar duas vezes o mesmo roteiro faz DOIS filmes idênticos**; **uma leitura de carteira que falha vira «você tem 0 ⚡»** — **mente sobre dinheiro** *(a leitura de produto já não faz isso; os outros caminhos, sim)*; **os outros `<dialog>`** com o buraco do `nowheel`; re-semear o canvas quando o HMR cria um store vazio; `edited_at` × `updated_at` em relógios diferentes; **`nanoid` < 3.3.18** (1 alta do `npm audit`, transitiva do Next 16.3.0); **a sonda de chaves na TELA**; o cadastro com confirmação por e-mail no dev local precisaria da 5599 nos redirecionamentos do Supabase. | plano |

---

> **Projeto de prova da frente:** «Projeto teste Foto da Blusa» — o percurso da A′, com a foto
> `06778db7` (WebP — agora registrada como WebP) e a geração `0cf3f069`. **O controle da F3 estava
> intacto na última conferência (26/09)** — a F3 confere de novo antes do clique. **Nenhum teste de 02/10
> aconteceu nele** — nem em lugar nenhum da produção.

> **O dev sobe na 5599** (`npm run dev`). **Para o ambiente de vídeo** *(a Frente 1 não precisa)*: o túnel
> aponta para `http://localhost:5599` e vive **no comando** —
> `FAL_WEBHOOK_URL="https://<tunel-de-hoje>.trycloudflare.com/api/webhooks/fal" npm run dev`.
