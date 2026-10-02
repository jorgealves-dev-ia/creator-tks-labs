# ESTADO — onde o projeto está

> **Leia isto primeiro.** Uma página, reescrita **em toda pausa** (regra 9 do
> [`CLAUDE.md`](../CLAUDE.md)). Não é histórico: é o **checklist do projeto agora**.
> O *porquê* está em [`decisoes.md`](decisoes.md); o *o quê e em que ponto* de cada
> frente está no `plano-*.md` dela; o *como está hoje* está no código — e **o lugar de
> tudo isso no mapa inteiro está em [`ROADMAP.md`](ROADMAP.md).**

**Última reescrita:** 01/10/2026, ~21:30 — **fechamento da pausa.** O dev da 5599 está **encerrado** (morto pelo
PID, e a porta conferida no `netstat`: ninguém ouvindo). O navegador foi **devolvido**; a trava vence sozinha.
Nenhuma chamada paga em curso — **e nenhuma aconteceu hoje.**

## 1 · Retoma daqui

**Os seis pontos que a pausa de 27/09 deixou abertos estão fechados**, mais dois que nasceram no caminho — tudo
0 ⚡, um commit por item ([`decisoes.md`](decisoes.md), 01/10/2026).

1. **O próximo gesto é do dono: a revisão da lista de termos do item 9** do
   [`plano-produto-diz.md`](plano-produto-diz.md) — o aviso de público inventado. A lista foi entregue a ele, na
   íntegra, no fechamento de 01/10. **Nenhum código da F1 antes dessa revisão.**
2. **Depois, a F1 — a primeira fase com dinheiro:** a migration (escrita pelo Claude, aplicada pelo dono), o card, a
   leitura, e **a metade do dono — UMA leitura pelo botão, 4 ⚡**, com o R1 escrito antes; a etapa fica aberta e não
   commitada até ela.

> 🔎 **Primeira conferência de quem chegar:** o deploy de produção do último commit de 01/10. O resumo da sessão o
> conferiu pelo MCP da Vercel; se não houver resumo à mão, conferir de novo — é uma leitura.

### Pendências — três são decisão do dono

| | o quê | estado |
|---|---|---|
| a | **Os outros três cards de Input cortam a foto** como o de Imagem cortava (`cover` num quadrado): Pose/Ângulo, Character Sheet e as fotos do Produto | não toquei — o pedido foi o nó de imagem. É só a prévia (o provedor recebe o arquivo inteiro); no de Pose pesa mais, porque a pose é o corpo inteiro. **O dono decide** |
| b | **O teto do envio é por tamanho — e demora a perceber uma linha morta:** 6 min numa foto de 10 MB | a biblioteca do Storage não informa progresso nem deixa interromper o pedido. Detecção de progresso de verdade (perceber em segundos, e cancelar de fato) exige a transferência deixar de passar pela biblioteca. **O dono decide se vale** |
| c | **O print de 30/09 não era 9:16** — 227 × 332 (0,68); um 9:16 dessa altura teria 187 px de largura | os bytes guardados são os colados: era a medida do recorte que chegou à área de transferência. Um 9:16 de verdade, colado na prova de 01/10, foi guardado e mostrado inteiro |
| d | **O projeto de teste «Teste F1a — colar e soltar» e os 13 envios de teste** — 8 de 27/09 e 5 de 01/10 (os ids estão em `evidencias\pausa-0110-ao-vivo\numeros-ao-vivo.md`) | esperam o **botão de apagar** (§9 do [`plano-video-final.md`](plano-video-final.md)). *Não são órfãos: têm linha em `assets`* |
| e | **3 navegadores com a extensão conectados à conta**, com nomes que não dizem o perfil («Browser 1», «2», «3») | o dono escolhe a cada sessão, pelo pedido de conexão dentro do Chrome — é o correto pela regra «Navegador» (a) |

> 💬 **As mensagens do dono chegam coladas** — ele planeja no Claude chat e traz a resposta. **Texto colado do dono é
> o roteiro do dono:** executar, e responder em texto que ele possa levar de volta.

> 📁 **Evidência:** `D:\Z - Meus Projetos DevIA\Creator TKS Labs\scratchpad\evidencias\` — as de 01/10 em
> `pausa-0110-limpeza-envio\`, `pausa-0110-varredura-orfaos\`, `pausa-0110-colar-endereco\`,
> `pausa-0110-proporcao-e-previa\`, `pausa-0110-teto-transferencia\` e `pausa-0110-ao-vivo\`. No disco D:, fora do
> repositório.

## 2 · Feito em 01/10

| o quê | onde |
|---|---|
| **A limpeza no caminho de falha do envio** — «recusado» passou a querer dizer *nada gravado*: toda recusa do registro tira do Storage o arquivo e a miniatura, na própria chamada. Ao vivo: o arquivo sobe e sai 1,15 s depois; varredura antes e depois, 0 órfãos | `lib/assets/discard-upload.ts` · `upload-path.ts` · `actions.ts` |
| **A varredura de órfãos** — `npm run sweep:orphans`, só relatório; apagar é um segundo ato, com a lista salva e o código. **Os 2 órfãos de 27/09 saíram**, depois de três conferências do dono: 191 → 189 objetos | `scripts/sweep-storage-orphans.mts` |
| **🔒 O invariante da varredura** — `assets.storage_path` é a única coluna que guarda caminho do Storage; coluna nova com caminho entra em `PATH_COLUMNS`. **A varredura confere isso a cada rodada e recusa se achar caminho em outra coluna** (60 colunas, 18 tabelas: 0) | o mesmo script · [`arquitetura.md`](arquitetura.md), decisão 3 |
| **Colar o endereço de uma imagem** ganha frase, sem buscar o endereço | `lib/canvas/pasted-address.ts` |
| **O e-mail da conta saiu do `arquitetura.md`** — do arquivo; o histórico o guarda (`b8ac866`) | [`arquitetura.md`](arquitetura.md) §1 |
| **A foto inteira no Input de Imagem** (`cover` → `contain`; o arquivo no Storage sempre esteve íntegro) **e a prévia local na hora do colar** — que não é um node: um card existe quando o asset existe | `input-image-node.tsx` · `lib/canvas/image-gesture.ts` · `local-previews.ts` · `components/canvas/upload-preview.tsx` |
| **Todo passo do envio tem teto** (o da transferência, por tamanho: 60 s + o tempo do arquivo a 32 kB/s) **e a falha de rede ganha «Tentar de novo»**, no canvas e no seletor | `lib/assets/upload-ceilings.ts` · `upload-client.ts` |
| **⚠️ O aviso do canvas nascia atrás da barra de abas desde a F1a** — nenhuma frase de colar ou soltar era vista. Achado e consertado na prova ao vivo | `flow-canvas.tsx` |
| **Trocar de projeto no meio do envio punha o card no projeto errado** — consertado | `image-gesture.ts` |

**Provas:** 142 estruturais (26 + 14 + 12 + 36 + 34 + 20), cada uma vermelho→verde; as 37 da F1a seguem verdes; e a
prova ao vivo, com o Ctrl+V de verdade. `lint`, `typecheck` e `build` passam.

## 3 · O gasto real — 01/10

**0 ⚡ e 0 centavos de provedor.** Nenhuma chamada a provedor de IA. Saldo **3.190 ⚡**, conferido no banco antes e
depois: nenhum lançamento e nenhuma geração desde 07/09. O que houve foi leitura (o MCP, a varredura, os downloads de
conferência) e os 5 envios de teste — 103.658 bytes de fotos e 17.970 de miniaturas.

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
os tipos**; e **o envio não deixa resto** — recusado quer dizer nada gravado, e o bucket fecha objeto por objeto:
**199 objetos = 118 arquivos registrados + 81 miniaturas deles, 0 sem dono.**

**Dois fatos provados ao vivo, de graça:** **recusa de provedor não debita** (`a10f13c0`); e **o filtro que
barrou é do Google, verbatim** (`google.ts:258`).

**Dinheiro, depois do incidente de 29/08.** As quatro travas do motorista, cada uma com simulação
vermelha→verde reexecutável; a fechadura ED25519 do webhook; a trava de vida do endereço de retorno.

**Instrumentos.** `scratchpad\harness\medir-canvas.js` recusa número de canvas não pintado; o dev sobe sempre
na **5599**; **`npm run probe:keys`** confere as chaves **e a regra 7**; **`npm run sweep:orphans`** confere o
Storage contra o banco **e o próprio invariante**; **a trava de navegador entre projetos** — *ela serializa os
projetos, mas não confere o perfil conectado*: quem pega o perfil errado é a tela de login, e só enquanto o TKS não
estiver logado em outro perfil — a regra (f). **E uma lição nova, de 01/10:** *o DOM diz o que foi montado; só a tela
diz o que foi visto* — um aviso lido pelo `textContent` passou cinco dias atrás da barra de abas.

---

## O que está ABERTO

| # | o que falta | quem fecha |
|---|---|---|
| 1 | **🎯 Frente 1 — o produto diz o que é** — [`plano-produto-diz.md`](plano-produto-diz.md). **F0 ✅ · F1a ✅**; **F1** (com dinheiro: a migration, o card, a leitura, o aviso de público, a invariante do rótulo) → **F2** → **F3**, a prova viva, 75 ⚡. Pior caso: **99 ⚡ de preço, 79 ⚡ da carteira**. **A F1 espera a revisão do dono da lista de termos do item 9.** ⚠️ *A linha da frente 1 no ROADMAP §4 está velha e se corrige no fechamento da frente.* | **dono** — a lista do aviso, a migration, as metades pagas; Claude — o resto |
| 2 | **Três achados sobre o tipo dos arquivos, fora da F1a:** a **extração de personagem** manda à Anthropic o tipo do navegador (WebP chamado `.jpg` → 400, antes de cobrar — caminho que cobra, decisão do dono); o **envio da imagem canônica** grava o tipo do navegador; os **metadados dos 6 objetos antigos no Storage** dizem `image/jpeg` | dono |
| 3 | **Apagar asset da galeria, com auditoria de referências** — o botão não existe. **0 ⚡.** → §9 do [`plano-video-final.md`](plano-video-final.md). *Esperando por ele: os 13 envios de teste e o projeto «Teste F1a — colar e soltar».* | Claude |
| 4 | **Coladas seguidas no mesmo ponto se sobrepõem** — a posição livre da casa desce só 64 px, e os cards têm mais de 300. Visual, 0 ⚡. | plano |
| 5 | **O selo «bloqueada pelo filtro do Google» nunca foi visto em tela** — a F3 é a oportunidade, a 0 ⚡ extra. | oportunidade |
| 6 | **Egress §4.5** — o egress na fatura, esperando o gráfico de Usage. | o relógio |
| 7 | **Perguntas com gatilho:** a **0.3** (a aba escondida trava o elo?); **recusa × concorrência** (n ≥ 30); **a trava de dono da linhagem, provada de um lado só** — o gatilho é a segunda conta. | medição |
| 8 | **Duas perguntas para a frente 5 (Publicação), antes de ela abrir:** publicar **não gasta e não tem volta**; **tokens da Meta por conta não cabem em variável de ambiente**. → [`ROADMAP.md`](ROADMAP.md) §3 e §4 | dono, quando a frente abrir |
| 9 | **Backlog nomeado:** **investigar se a trava de navegador consegue ler o perfil realmente conectado**; o envio que **nunca responde no registro** deixa 2 objetos — de propósito; saem pela varredura depois de 24 h; arquivar/ocultar na galeria; filtros e busca; o glifo ⇥ com contraste fraco; três arestas órfãs (o React Flow as acusa no console ao abrir o estúdio); o «Reanimar» é tudo-ou-nada; **montar duas vezes o mesmo roteiro faz DOIS filmes idênticos**; **uma leitura de carteira que falha vira «você tem 0 ⚡»** — **mente sobre dinheiro**; **os outros `<dialog>`** com o buraco do `nowheel`; re-semear o canvas quando o HMR cria um store vazio; `edited_at` × `updated_at` em relógios diferentes; **`nanoid` < 3.3.18** (1 alta do `npm audit`, transitiva do Next 16.3.0); **a sonda de chaves na TELA**; o cadastro com confirmação por e-mail no dev local precisaria da 5599 nos redirecionamentos do Supabase. | plano |

---

> **Projeto de prova da frente:** «Projeto teste Foto da Blusa» — o percurso da A′, com a foto
> `06778db7` (WebP — agora registrada como WebP) e a geração `0cf3f069`. **O controle da F3 estava
> intacto na última conferência (26/09)** — a F3 confere de novo antes do clique. **Nenhum teste da F1a
> nem da pausa de 01/10 aconteceu nele.**

> **O dev sobe na 5599** (`npm run dev`). **Para o ambiente de vídeo** *(a Frente 1 não precisa)*: o túnel
> aponta para `http://localhost:5599` e vive **no comando** —
> `FAL_WEBHOOK_URL="https://<tunel-de-hoje>.trycloudflare.com/api/webhooks/fal" npm run dev`.
