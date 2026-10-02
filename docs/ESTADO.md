# ESTADO — onde o projeto está

> **Leia isto primeiro.** Uma página, reescrita **em toda pausa** (regra 9 do
> [`CLAUDE.md`](../CLAUDE.md)). Não é histórico: é o **checklist do projeto agora**.
> O *porquê* está em [`decisoes.md`](decisoes.md); o *o quê e em que ponto* de cada
> frente está no `plano-*.md` dela; o *como está hoje* está no código — e **o lugar de
> tudo isso no mapa inteiro está em [`ROADMAP.md`](ROADMAP.md).**

**Última reescrita:** 02/10/2026, ~14:28 — **pausa para o dono, depois do retorno dele.** Nenhum dev no ar (a
5599 conferida no `netstat`: ninguém ouvindo). **O navegador não foi usado hoje** — o bastão ainda não foi
pedido. Nenhuma chamada paga em curso — **e nenhuma aconteceu hoje.** `origin/master` = `19dc765` (o conserto do
Google, o único código que foi para produção hoje).

## 1 · Retoma daqui

> ### ⚠️ A árvore de trabalho NÃO está limpa — de propósito
>
> Sobre o `19dc765` há **dois trabalhos escritos e provados, nenhum commitado**:
>
> | | o que é | por que não está commitado |
> |---|---|---|
> | **item 0** | Pose, Character Sheet e Produto com a foto inteira e a prévia local pelo seletor | espera a **prova ao vivo** (navegador) — e tem **commit próprio** |
> | **F1** | a leitura de produto inteira: migration, ação, card, botão, seletor, aviso de público | **tem dinheiro:** fica aberta até a **metade do dono** (regra 8) |
>
> Os dois mexem nos mesmos arquivos (`input-product-node.tsx`, `decisoes.md`, o plano). **As fronteiras de
> commit estão guardadas em retratos**, em `scratchpad\commits\`: `0210-1-item0-tres-cards` (o item 0 sozinho,
> 10 arquivos) e `0210-4-fim-do-retorno` (tudo, como ficou no fim de 02/10). Commitar o item 0 é restaurar o primeiro,
> commitar, e restaurar o segundo por cima (`node harness/retrato.mjs restaurar <rótulo>`). **Uma armadilha:** o
> retrato do item 0 traz `decisoes.md` e o plano **como estavam de manhã** — no commit do item 0 esses dois não
> entram; valem os desta pausa.
>
> **`src/lib/supabase/database.types.ts` leva um andaime marcado** — 9 blocos `SAI ANTES DO COMMIT`, as colunas e
> a função que a migration vai criar, para o `typecheck` rodar antes de ela existir no banco. **A trava do
> `git grep` do fechamento acusa, e é para acusar.** Ele sai quando o arquivo for regerado do banco. **Decisão do
> dono (02/10): esse arquivo não se mexe** — nada de tirar e repor o andaime. Commits saem **por caminho
> explícito**, e a conferência do gate, antes de commit de código, é no **índice** (`git grep --cached`): foi o que
> o commit do Google levou (0). Se o dono quiser o literal — 0 na árvore inteira —, só depois de regerar os tipos.

**Os próximos gestos, na ordem — os cinco primeiros são do dono:**

0. **⏳ Decidir quem cobra a leitura de produto** — A (a função irmã `record_product_reading`, o que está
   construído e provado), B (generalizar `record_extraction`) ou C (`record_generation`). Está em
   [`decisoes.md`](decisoes.md), 02/10, com o que cada uma custa. **Minha recomendação: A.** *A migration não deve
   ser aplicada antes disso:* se for B ou C, ela muda e as provas refazem-se.
1. **Aplicar a migration** `supabase/migrations/20261002121933_product_readings.sql`, pelo Session pooler —
   `npx supabase db push --db-url "<Session pooler>"`. Ela é **tudo ou nada** (um `BEGIN … COMMIT`, conferido na
   fonte do CLI 2.112.0) e **confere o que instalou**: se o padrão da lista de produto não for exatamente o
   `gemini-3.7-flash` a 4 ⚡, ela levanta exceção e não deixa nada.
2. **Rodar** `supabase/travas/f1-leitura-de-produto.sql` no SQL Editor (`BEGIN … ROLLBACK` — nada fica
   gravado). A última linha esperada: `TOTAL 23 · OK 23 · FALHA 0 · nao exercitado 0`.
3. **Dar o bastão do navegador** — perfil **«Jorge Alves - DevIA»**, porta **5599** — para a prova ao vivo do
   item 0 e a prova de tela da F1 (F1.6), **a 0 ⚡, com o servidor subindo com as chaves da Google e da Anthropic
   em branco** (`GEMINI_API_KEY= ANTHROPIC_API_KEY= npm run dev`): nenhum clique em «Ler a foto» é possível.
4. **A metade paga, até 40 ⚡** — os cliques são dele, no navegador dele, e só depois do «pode». R1: *se o
   botão não disser «Ler a foto · 4 ⚡», o clique não acontece.*
5. **Claude, depois de cada um:** regerar `database.types.ts` do banco; a prova ao vivo; a leitura do banco; e
   o fechamento com as especificações — a lista está no fim da seção F1 do
   [`plano-produto-diz.md`](plano-produto-diz.md).

> 🔎 **Código novo sobre o banco de hoje é seguro — provado:** sem a migration, a lista de produto vem vazia, o
> botão nasce desligado e nada cobra; os outros seletores continuam de pé.

### Pendências — decisões do dono

| | o quê | estado |
|---|---|---|
| a | **⏳ Quem cobra a leitura de produto** (A / B / C) | **a decidir — bloqueia a migration.** → [`decisoes.md`](decisoes.md), 02/10 |
| b | **O preço da regra do hífen na v3 do aviso:** nomes em forma de **slug** (*«blusa-infantil-azul»*, *«camiseta-masculina-basica»*) deixam de acender — e o catálogo dele usa slugs | aceitar o custo, ou tratar texto **sem espaço nenhum** como slug e deixar a regra de fora. Não decidi |
| c | **Duas leituras minhas da regra do hífen**, para ele confirmar: «infanto-juvenil» segue acendendo; a sequência de tamanho («Size-L») fica fora da regra | cada uma se inverte numa linha |
| d | **A condição da F2** (dono, 02/10): *o texto que chega ao prompt é exatamente o que o card mostra e o aviso varre* — o inglês da leitura só entra se o português for idêntico **e** a função não achar nada nele | registrada no plano; a F2 prova com um caso de público inventado só no inglês |
| e | **A prova ao vivo do conserto do Google** (`19dc765`) — na **primeira imagem paga da F3**: o painel do Google tem de mostrar **um** pedido por imagem | registrada; é o que fecha o commit que saiu sem a metade dele |
| f | **«Colar com um card de Produto selecionado, para a foto entrar nele»** | não fiz: seria funcionalidade, e mudaria a regra da F1a (colar cria um Input de Imagem). Nos três cards a prévia local entrou pelo seletor |
| g | **3 navegadores com a extensão conectados à conta**, com nomes que não dizem o perfil | o dono escolhe a cada sessão, pelo pedido de conexão dentro do Chrome — regra «Navegador» (a) |

**Decididas no retorno de 02/10 (já feitas):** o conserto do Google (`19dc765`); a lista v3; a blusa — **a F3 usa um
card já lido na F1 ou um texto colado, e o teto de 40 ⚡ não muda**; o servidor da prova de tela sem chaves.

> 💬 **As mensagens do dono chegam coladas** — ele planeja no Claude chat e traz a resposta. **Texto colado do dono é
> o roteiro do dono:** executar, e responder em texto que ele possa levar de volta.

> 📁 **Evidência:** `D:\Z - Meus Projetos DevIA\Creator TKS Labs\scratchpad\evidencias\` — as de 02/10 em
> `produto-diz-item0\` e `produto-diz-f1\`. No disco D:, fora do repositório.

## 2 · Feito em 02/10 — tudo 0 ⚡, nada commitado ainda

| o quê | onde |
|---|---|
| **As decisões do dono sobre os três pontos de 01/10, e a lista v2 do aviso de público** no plano — com as exceções («baby doll», «rosa bebê») e a gramática do tamanho | [`plano-produto-diz.md`](plano-produto-diz.md), item 9 da F1 · [`decisoes.md`](decisoes.md) |
| **Item 0 — a foto inteira nos outros três cards de Input**, e a prévia local pelo «Enviar imagem» do seletor; os quatro cards pedem a foto por um gancho só | `use-input-picture.ts` · `lib/canvas/picker-upload.ts` · os três cards |
| **O aviso de público** — acha e remove, puro, com a lista v2 | `lib/product-reading/audience-terms.ts` |
| **A migration da F1** — `extractions` aprende produto, o padrão da lista de produto, `record_product_reading` — **ensaiada num Postgres de verdade** sobre as 39 migrations de produção | `supabase/migrations/20261002121933_product_readings.sql` · `supabase/travas/f1-leitura-de-produto.sql` |
| **A leitura** — o contrato v2 byte a byte, a ação, o adaptador do Google, o registro e o catálogo próprios | `lib/product-reading/` · `lib/providers/google.ts` · `registry.ts` · `lib/ai/catalog.ts` |
| **O card** — Nome · Fotos · Descrição (2.000, com contador) · seletor · «Ler a foto · N ⚡» · o aviso | `input-product-node.tsx` · `lib/i18n/pt-BR.ts` |
| **✅ O conserto do Google, em produção (`19dc765`)** — o `NO_RETRIES` não chegava à API de Interactions; erro 408/409/429/500/503/queda faziam **5 pedidos** por chamada nos geradores de imagem e de texto; agora **1**. 9 provas HEAD × conserto; resposta 200 idêntica. Commit de 1 arquivo, montado por hash, **sem o adaptador de leitura** | `lib/providers/google.ts` · [`decisoes.md`](decisoes.md), 02/10 |
| **✅ A lista v3 do aviso de público** — «tamanhos», «infantis», 4 cores bebê, o «do» antes do número, e o hífen; 14 provas vermelho→verde | `lib/product-reading/audience-terms.ts` · `aviso-de-publico-v3-0210.md` |
| **✅ O código no ar × a migration** — os fluxos de hoje (extração por foto e por texto, falha grátis, saldo curto, `record_generation` ×3, `INSERT` antigo) rodados antes e depois, sobre linhas antigas: **10 de 12 idênticos**, as 2 diferenças esperadas e sem gasto; nenhuma coluna `NOT NULL` sem padrão | `hoje-contra-a-migration-0210.md` |

**Provas — todas estruturais, cada uma vermelho→verde:** a leitura de ponta a ponta, **87**; as travas do banco,
**50**, e o script do dono, **23 de 23**; o aviso de público, **16** sobre 104 casos (v2) e **14** (v3); o item 0,
**31**; a retentativa, **5**; o conserto do Google, **9**; o código no ar × a migration, **9**. `lint`, `typecheck` e `build` passam; o contrato de leitura está em **0** arquivos do pacote do
navegador.

## 3 · O gasto real — 02/10

**0 ⚡ e 0 centavos de provedor.** Nenhuma chamada a provedor de IA: o provedor das provas é um `fetch` falso, e as
chaves valem `chave-falsa-do-ensaio`. Saldo **3.190 ⚡** = a soma do ledger, conferido no banco no começo da sessão
e às 10h50: 110 lançamentos, o último de 07/09; 8 extrações; 719 gerações; 39 migrations — **a da F1 não está
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
| 2 | **Um vizinho do conserto do Google:** um 403 da API de Interactions é lido como erro genérico (`provider`), não como chave recusada (`not_configured`) — só muda a frase na tela. A retentativa em si está consertada (`19dc765`); falta a prova ao vivo (pendência e) | dono |
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
