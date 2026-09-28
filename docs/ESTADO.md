# ESTADO — onde o projeto está

> **Leia isto primeiro.** Uma página, reescrita **em toda pausa** (regra 9 do
> [`CLAUDE.md`](../CLAUDE.md)). Não é histórico: é o **checklist do projeto agora**.
> O *porquê* está em [`decisoes.md`](decisoes.md); o *o quê e em que ponto* de cada
> frente está no `plano-*.md` dela; o *como está hoje* está no código — e **o lugar de
> tudo isso no mapa inteiro está em [`ROADMAP.md`](ROADMAP.md).**

**Última reescrita:** 27/09/2026, ~23:30 — **pausa do dia.** O dev da 5599 está **encerrado** (porta livre,
conferida no `netstat` depois de matar o sobrevivente pelo PID). A trava do navegador está **vencida** — não
bloqueia projeto nenhum, e o fim desta sessão apaga o arquivo. Nenhuma chamada paga em curso.

## 1 · Retoma daqui

**Frente 1 · F0 e F1a fechadas** ([`plano-produto-diz.md`](plano-produto-diz.md)).

1. **Primeira tarefa do Claude, 0 ⚡: a limpeza no caminho de falha do envio.** Falhou o registro, o arquivo e a
   miniatura que já subiram saem do Storage no mesmo gesto — **sem depender do botão de apagar** (decisão do dono).
   O que entrega, a prova e o caso que ela não cobre (a aba fechada no meio, que só uma varredura pega — **o dono
   decide se entra**): plano, fim da seção F1a, *Dívida aberta*.
2. **Próxima fase: a F1 — a primeira com dinheiro — bloqueada pela revisão do dono da lista de termos do item 9**
   (a lista proposta está no plano, F1 item 9). Depois: a migration (escrita pelo Claude, aplicada pelo dono), o
   card, a leitura, e **a metade do dono — UMA leitura pelo botão, 4 ⚡**, com o R1 escrito antes; a etapa fica
   aberta e não commitada até ela.

### Pendências

| | o quê | estado |
|---|---|---|
| a | **As respostas do item 1 — o envio que travava** | **(a) causa eliminada**, não só limitada: 8 de 8 envios depois do conserto levaram **0,7–1,7 s** da subida ao registro (banco), e o teto nunca disparou. **(b) o teto cobre só a leitura dos 16 bytes no servidor**, não a transferência — sem recusa falsa em conexão lenta; mas **a transferência não tem teto nosso**: rede empacada deixa «Enviando…» até o navegador desistir ou a página recarregar — *ponto a decidir*. **(c) o arquivo fica órfão — sim** → a tarefa 1 |
| b | **O teste manual do dono: «Copiar imagem» num site**, e Ctrl+V no canvas | esperado: um card com rótulo «Colada · dd/mm hh:mm:ss», sob o ponteiro, 0 ⚡. *Se o que for copiado for o **endereço** da imagem, hoje o canvas não faz nada e não diz nada* — o arrastar de link tem frase, o colar não |
| c | **O órfão de hoje** — bucket `assets`: `65dd5296-10fc-4594-908d-990fcfe8b3b6/references/ee8f3d30-015d-40b7-b84b-61be3a3e86db.png` e a miniatura `….png.thumb.webp` — 2 objetos, 6.889 bytes, 27/09 22:41 (28/09 01:41 UTC) | **os únicos órfãos do bucket: 2 de 189 objetos.** A tarefa 1 não o alcança (já passou): sai pela varredura, se o dono a aprovar, ou à mão no painel do Storage — **o MCP é só leitura** |
| d | **O projeto de teste «Teste F1a — colar e soltar» e os 8 envios** | esperam o **botão de apagar** (§9 do [`plano-video-final.md`](plano-video-final.md)) |
| e | **3 navegadores com a extensão conectados à conta** | **o seletor a cada sessão é o correto** pela regra «Navegador» (a) — nada a consertar |

> 📁 **Evidência:** `D:\Z - Meus Projetos DevIA\Creator TKS Labs\scratchpad\evidencias\` — **durável, conferido em
> 27/09:** no disco D: (243 GB livres), dentro da pasta do projeto e **fora do repositório** — a raiz do git é
> `creatortkslabs\`, e o git recusa o caminho (*"is outside repository"*). Não é o `.gitignore` que a esconde: **o
> git nem a enxerga.** 401 arquivos em 57 pastas; o mais antigo é de 11/08/2026.

## 2 · Feito em 27/09

| o quê | onde |
|---|---|
| **✅ F1a FECHADA** — o envio lê o tipo nos bytes (navegador, servidor e carregador ao provedor), e **colar e soltar imagem no canvas** pelo mesmo caminho. 37 provas estruturais + a prova ao vivo com o Ctrl+V de verdade; **dois defeitos que só a prova ao vivo achou**, consertados e reprovados | plano, F1a · [`nodes-geracao.md`](nodes-geracao.md) §3.1 · [`arquitetura.md`](arquitetura.md) decisão 3 |
| **✅ F0 FECHADA** — o padrão da lista de produto é o **Gemini 3.7 Flash** (o Haiku fica no seletor); o **aviso de público** e a **invariante do rótulo** entram na F1 | plano, F0 e F1 itens 9–10 |
| **Os 6 registros corrigidos** — script rodado pelo dono; **104 / 0 / 0** | `evidencias\produto-diz-f1a\` |
| **A regra 7 conferida pela sonda** (GitHub: as duas proteções ligadas; 0 alertas) · nenhum `.env*` nem chave no histórico | `scripts/probe-provider-keys.mts` |
| **A regra «Navegador» e a trava entre projetos** — e, na pausa, **o reforço do dono**: **(f)** o TKS só fica logado no perfil «Jorge Alves - DevIA»; **(g)** conta ou time conferidos na tela antes de qualquer painel | [`CLAUDE.md`](../CLAUDE.md) · `~/.claude/hooks/trava-navegador.mjs` |

## 3 · O gasto real — 27/09

| o quê | custo real | da carteira |
|---|---|---|
| F0 rodada 5 — Flash 1, Flash 2, Haiku 2 | **7 centavos** | 0 |
| a prova ao vivo da F1a — 8 envios de teste, 0 chamadas a provedor | 0 | 0 |
| 5 sessões `claude -p` de teste da trava de navegador, em Haiku | US$ 0,13 de uso de Claude | 0 |
| **total da F0 inteira** | **11 centavos de provedor** | **0 Spark — saldo 3.190 ⚡** |

> 🔑 **Chaves e contas:** Anthropic, Google, fal e OpenAI aceitas pela sonda em 27/09; xAI sem chave. **GitHub:**
> secret scanning e push protection ligados — conferidos pela sonda. O repositório é **público** (conferido pela
> API; o `arquitetura.md` dizia «privado» e foi corrigido).

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

**Frente 1 · F0 e F1a — ✅ FECHADAS em 27/09.** O compilador reproduz o texto de 07/09 byte a byte; o contrato
v2 está no plano byte a byte; o padrão é o 3.7 Flash; e **o acervo diz a verdade sobre os tipos** — os envios
novos pelos bytes, os 104 antigos **104 / 0 / 0**, e o provedor recebe o tipo dos bytes.

**Dois fatos provados ao vivo, de graça:** **recusa de provedor não debita** (`a10f13c0`); e **o filtro que
barrou é do Google, verbatim** (`google.ts:258`).

**Dinheiro, depois do incidente de 29/08.** As quatro travas do motorista, cada uma com simulação
vermelha→verde reexecutável; a fechadura ED25519 do webhook; a trava de vida do endereço de retorno.

**Instrumentos.** `scratchpad\harness\medir-canvas.js` recusa número de canvas não pintado; o dev sobe sempre
na **5599**; **`npm run probe:keys`** confere as chaves **e a regra 7**; **a trava de navegador entre projetos**
— dois terminais reais e a primeira chamada real ao Chrome. *E o limite dela, registrado:* **a trava serializa os
projetos, mas não confere o perfil conectado** — quem pega o perfil errado é a tela de login, e só enquanto o TKS
não estiver logado em outro perfil: é a regra (f).

---

## O que está ABERTO

| # | o que falta | quem fecha |
|---|---|---|
| 1 | **🎯 Frente 1 — o produto diz o que é** — [`plano-produto-diz.md`](plano-produto-diz.md). **F0 ✅ · F1a ✅** (com a dívida da limpeza — a tarefa 1 acima); **F1** (com dinheiro: a migration, o card, a leitura, o aviso de público, a invariante do rótulo) → **F2** → **F3**, a prova viva, 75 ⚡. Pior caso: **99 ⚡ de preço, 79 ⚡ da carteira**. ⚠️ *A linha da frente 1 no ROADMAP §4 está velha e se corrige no fechamento da frente.* | **dono** — a lista do aviso, a migration, as metades pagas; Claude — o resto |
| 2 | **Três achados sobre o tipo dos arquivos, fora da F1a:** a **extração de personagem** manda à Anthropic o tipo do navegador (WebP chamado `.jpg` → 400, antes de cobrar — caminho que cobra, decisão do dono); o **envio da imagem canônica** grava o tipo do navegador; os **metadados dos 6 objetos antigos no Storage** dizem `image/jpeg` | dono |
| 3 | **Apagar asset da galeria, com auditoria de referências** — o botão não existe. **0 ⚡.** → §9 do [`plano-video-final.md`](plano-video-final.md). *Esperando por ele: os 8 envios de teste e o projeto «Teste F1a — colar e soltar».* | Claude |
| 4 | **Coladas seguidas no mesmo ponto se sobrepõem** — a posição livre da casa desce só 64 px, e os cards têm mais de 300. Visual, 0 ⚡. | plano |
| 5 | **O selo «bloqueada pelo filtro do Google» nunca foi visto em tela** — a F3 é a oportunidade, a 0 ⚡ extra. | oportunidade |
| 6 | **Egress §4.5** — o egress na fatura, esperando o gráfico de Usage. | o relógio |
| 7 | **Perguntas com gatilho:** a **0.3** (a aba escondida trava o elo?); **recusa × concorrência** (n ≥ 30); **a trava de dono da linhagem, provada de um lado só** — o gatilho é a segunda conta. | medição |
| 8 | **Duas perguntas para a frente 5 (Publicação), antes de ela abrir:** publicar **não gasta e não tem volta**; **tokens da Meta por conta não cabem em variável de ambiente**. → [`ROADMAP.md`](ROADMAP.md) §3 e §4 | dono, quando a frente abrir |
| 9 | **Backlog nomeado:** **investigar se a trava de navegador consegue ler o perfil realmente conectado**; **o e-mail da conta está no `arquitetura.md`, público com o repositório** — se sai, é decisão do dono (o histórico o guarda); arquivar/ocultar na galeria; filtros e busca; o glifo ⇥ com contraste fraco; três arestas órfãs (o React Flow as acusa no console ao abrir o estúdio); o «Reanimar» é tudo-ou-nada; **montar duas vezes o mesmo roteiro faz DOIS filmes idênticos**; **uma leitura de carteira que falha vira «você tem 0 ⚡»** — **mente sobre dinheiro**; **os outros `<dialog>`** com o buraco do `nowheel`; re-semear o canvas quando o HMR cria um store vazio; `edited_at` × `updated_at` em relógios diferentes; **`nanoid` < 3.3.18** (1 alta do `npm audit`, transitiva do Next 16.3.0); **a sonda de chaves na TELA**; o cadastro com confirmação por e-mail no dev local precisaria da 5599 nos redirecionamentos do Supabase. | plano |

---

> **Projeto de prova da frente:** «Projeto teste Foto da Blusa» — o percurso da A′, com a foto
> `06778db7` (WebP — agora registrada como WebP) e a geração `0cf3f069`. **O controle da F3 estava
> intacto na última conferência (26/09)** — a F3 confere de novo antes do clique. **Nenhum teste da F1a
> aconteceu nele.**

> **O dev sobe na 5599** (`npm run dev`). **Para o ambiente de vídeo** *(a Frente 1 não precisa)*: o túnel
> aponta para `http://localhost:5599` e vive **no comando** —
> `FAL_WEBHOOK_URL="https://<tunel-de-hoje>.trycloudflare.com/api/webhooks/fal" npm run dev`.
