# ESTADO — onde o projeto está

> **Leia isto primeiro.** Uma página, reescrita **em toda pausa** (regra 9 do
> [`CLAUDE.md`](../CLAUDE.md)). Não é histórico: é o **checklist do projeto agora**.
> O *porquê* está em [`decisoes.md`](decisoes.md); o *o quê e em que ponto* de cada
> frente está no `plano-*.md` dela; o *como está hoje* está no código — e **o lugar de
> tudo isso no mapa inteiro está em [`ROADMAP.md`](ROADMAP.md).**

**Última reescrita:** 26/09/2026, à noite — **pausa do dono até 27/09. Nada em execução**: nenhum
servidor na 5599 nem na 3000, nenhum processo `node`, nenhuma chamada paga no meio.

# ⏸️ RETOMA DO MARCADOR

## 1 · Feito e commitado em 26/09 — tudo no `origin/master`

| commit | o que entrou |
|---|---|
| `33903aa` | o **plano da Frente 1**, aprovado com as cinco respostas do dono; o `produto.md` §7.1 apontando para a fila do ROADMAP; o índice do `CLAUDE.md` com o ROADMAP e três status corrigidos; *"RLS nas 21 tabelas"* |
| `35ecb08` | **F0(a)**: o texto de 07/09 remontado com o compilador de hoje, **igual byte a byte**; F0(b) rodada 1: as duas leituras recusadas antes de gerar |
| `cc58a30` | F0 rodadas 2 e 3: **a foto é WebP registrada como JPEG**; o `402` do Google; o Haiku leu — e inventou *"infantil"* |
| `bb0c2b0` | **o único código do dia, fechado:** a porta fixa **5599** (`package.json`) e a sonda de chaves (`scripts/probe-provider-keys.mts`, `npm run probe:keys`) |
| `500ac4a` | o **contrato v2** e a rodada 4 — o *"infantil"* sumiu; a **varredura de tipos** (104 arquivos: 98 batem, 6 divergem); a proposta F1a |
| *este commit* | as decisões do fechamento da noite; este ESTADO |

## 2 · Pela metade

**No repositório: nada.** Depois deste commit, `git status` fica limpo. **Nenhum código de fase
aberta:** a F1 e a F1a não começaram, e o único código de hoje (`bb0c2b0`) está fechado.

**Fora do repositório, por regra** — o `scratchpad\`, que nunca entra em commit:

| arquivo | estado |
|---|---|
| `harness\f0-leituras.ts` | pronto para o contrato v2, com o tipo da foto lido nos bytes — **mas faz UMA leitura por modelo e não tem os dois critérios extras: ajustar antes do lado a lado** |
| `harness\f0-texto-de-hoje.ts` · `f0-foto.ts` · `f0-sonda-google.ts` · `f0-varredura-mime.ts` | prontos. **A varredura é a prova do script dos 6 registros:** roda de novo, e tem de dar 104 / 0 / 0 |
| `evidencias\produto-diz-f0\` | as quatro rodadas, os dois contratos (v0 e v2, md5 `a12a8dd4…`), a foto (md5 `2cb6f65a…`) e a varredura |

**A F0 está pela metade:** (a) fechada; (b) o Haiku leu duas vezes; **o 3.7 Flash nunca leu** — e o
Google foi liberado.

## 3 · O gasto real desta rodada — 26/09

| o quê | custo real | da carteira |
|---|---|---|
| F0 rodadas 1 e 2 — quatro chamadas, **todas recusadas antes de gerar** (`401`, `404`, `400`, `402`) | 0 | 0 |
| F0 rodada 3 — Haiku, contrato v0 | 2 centavos | 0 |
| F0 rodada 4 — Haiku, contrato v2 | 2 centavos | 0 |
| sondas de metadados e de chaves; varredura de tipos (104 × 32 bytes) | 0 | 0 |
| **total** | **4 centavos de provedor** | **0 Spark — saldo 3.190 ⚡, conferido no banco: nenhum lançamento, nenhuma geração, nenhuma extração em 26/09** |

## 4 · O próximo passo exato — o lado a lado que fecha a F0

Decidido pelo dono em 26/09: **Haiku × 3.7 Flash, contrato v2, duas leituras por modelo**, com dois
critérios extras além do gabarito — **a posição do elástico** (é do punho) e **o tratamento do
tecido** (aparência, nunca composição).

1. **Ajustar o `f0-leituras.ts`:** duas leituras por modelo e os dois critérios extras (0 ⚡).
2. **Escrever o R1 antes do clique:** quatro chamadas, **no máximo 16 ⚡ de preço de catálogo, 0 Spark
   da carteira**. *Se a rodada 4 contar como uma das duas do Haiku: três chamadas, 12 ⚡ — o dono
   decide ao retomar.*
3. **Rodar.** **A primeira leitura do 3.7 Flash é a verificação da cobrança** — se voltar `402`,
   parar. ⚠️ **A conta de faturamento do Google é compartilhada com outro projeto:** um `402` pode vir
   sem nenhuma geração nossa.
4. **O dono escolhe o padrão da lista de produto**, com as quatro leituras ao lado da foto → a F1
   começa (migration no padrão RAISE EXCEPTION, aplicada por ele).

**Aprovado, e pode andar em paralelo, 0 ⚡:** a **F1a** — antes do código, confirmar com o dono **a
regra de nome da imagem colada** (a proposta está no plano: *"Colada · dd/mm hh:mm"*) —; e **o script
dos 6 registros** (só `assets.mime_type`; o dono roda; a prova é a varredura: 104 / 0 / 0).

> 🔑 **Chaves:** a da Anthropic foi trocada em 26/09 — a anterior **expirou por prazo programado**
> (criada em 08/08), e **a nova não vence**. O Google foi **liberado**: saldo pré-pago reposto,
> **recarga automática desativada**. **Para conferir qualquer chave, sem gastar: `npm run probe:keys`**
> — prova a chave, não o saldo.

---

## O que está PROVADO

**A fundação.** Canvas de nodes, projetos, character sheet com versões congeladas, motor
de extração, compilador determinístico, geração de imagem canônica, ledger append-only
com as travas no banco. RLS em todas as **21** tabelas.

**Frente Storyboard · Ciclo 1 — o elo.** O último quadro de um clipe vira o primeiro do
seguinte, por asset derivado. ⚠️ *O **veredito humano** do elo continua **NÃO MEDIDO com
gatilho**.*

**Frente Storyboard · Ciclo 2 — o Roteiro.** Uma ideia vira fichas de cena estruturadas
no banco. Fechado.

**Frente Storyboard · Ciclo 3 — a Máquina. ✅ ENCERRADO.** A régua percorrida pelo dono:
3 cenas, 870 ⚡, do zero ao clipe — **3 cobranças de vídeo** numa janela de **643 ms**,
**zero reconciliação à mão**. Saldo 4.150 → 3.280.

**Mini-ciclo «O vídeo final» — ✅ FECHADO em 06/09 (`d17a2d8`).** Montagem em JavaScript
puro (`mediabunny`), sem `ffmpeg`: 122 ms contra 202 ms, **0,63 MB contra 75,0 MB**, arquivo
idêntico quadro a quadro. De 3 clipes pagos, **um filme** — e o extrato não se moveu.

**Frente A′ · o `fix:` do produto — ✅ FECHADA em 07/09. A FOTO CHEGA AO PROVEDOR.**
*Nome não é foto* (03/09). A prova do dono **do banco, não da tela**: 90 ⚡ — o pior caso R1
exato —, saldo 3.280 → **3.190**. **A fidelidade não estava provada** — saiu um vestido onde a
foto é uma blusa, porque a palavra «blusa» nunca chegou ao modelo: **é a Frente 1.**

**Frente 1 · F0(a) — 26/09.** O compilador de hoje reproduz o texto de 07/09 **byte a byte**
(1.557 caracteres): *blouse* 0, *dress* 0, *hem* 1 — a linha de base da F2. **E o princípio de
evidência funciona:** com ele no contrato, a leitura parou de inventar *"infantil"*.

**Dois fatos provados ao vivo, de graça:** **recusa de provedor não debita** (`a10f13c0`, fora
do ledger); e **o filtro que barrou é do Google, verbatim** (`google.ts:258`).

**Mini-ciclo Egress.** Fases 0 a 5 fechadas, em produção.

**Dinheiro, depois do incidente de 29/08.** As quatro travas do motorista, cada uma com
simulação vermelha→verde reexecutável; a fechadura ED25519 do webhook; a trava de vida do
endereço de retorno.

**O «incidente dos vínculos» — ✅ ENCERRADO em 06/09: era artefato de medição.** A lição virou
**mecanismo**: `scratchpad\harness\medir-canvas.js` recusa número de canvas não pintado. **Toda
afirmação sobre o store lê o store.**

**Ferramentas e documentação.** `AGENTS.md` como ponteiro para o `CLAUDE.md`; `README.md` como mapa;
`.gitattributes` fixando o EOL; o índice do `CLAUDE.md` lista o `ROADMAP.md`. **Desde 26/09:** o dev
sobe sempre na **5599**, e **`npm run probe:keys`** confere as chaves sem gastar, cada resposta lida
contra um controle com chave falsa — na primeira execução, Anthropic, Google, fal e OpenAI aceitas, xAI
sem chave.

**O mapa — 16/09.** [`ROADMAP.md`](ROADMAP.md): o inventário, o esboço item a item, **a arquitetura
decidida pelo dono** e **a fila até o post publicado**.

---

## O que a Fase 0 do vídeo descobriu e ainda não virou código

Três achados medidos — o detalhe no §4.1 do [`plano-video-final.md`](plano-video-final.md):

1. **A ordem das cenas ≠ a ordem de criação das gerações.** Montar por `created_at` entrega
   o filme fora de ordem, **e o erro só aparece no vídeo**.
2. **O banco não sabe o que os arquivos são.** `assets.width`/`height` estão vazios em **35 de 35
   vídeos e em 39 de 48 imagens** *(16/09)* — e, desde a varredura de 26/09, sabe-se que **6 envios
   têm até o tipo errado**. É a mesma lacuna que a frente 3 do ROADMAP encontra.
3. **Nenhuma biblioteca recusa clipe incompatível sozinha.** A trava é nossa — e recusar custa zero.

---

## O que está ABERTO

| # | o que falta | quem fecha |
|---|---|---|
| 1 | **🎯 Frente 1 — o produto diz o que é** — [`plano-produto-diz.md`](plano-produto-diz.md). Plano **aprovado** em 26/09; **F0 pela metade** (o lado a lado da *Retoma*, bloco 4); **F1a aprovada**, não começou; **F1 e F2** esperam a F0; **F3** — a prova viva, 75 ⚡ — depois delas. A lista de produto nasce com **Haiku e 3.7 Flash**, com **padrão próprio** decidido pela F0 (o Sonnet a 20 ⚡ nunca é ele); as linhas 2.5 de `extraction` ficam inativas na migration da F1, que vem no padrão RAISE EXCEPTION e é aplicada pelo dono. Pior caso R1 registrado: **87 ⚡ de preço, 79 ⚡ da carteira** — saldo 3.190 → 3.111; a rodada 4 somou **+4 ⚡ de preço fora da carteira** (91 de preço; a carteira segue 79). ⚠️ *A linha da frente 1 no ROADMAP §4 ficou velha — diz "um dia" e "estrutural sem dinheiro" —, e se corrige no fechamento.* ⚠️ *O 3.7 Flash custa 2,5× o antigo 2.5 Flash na entrada, e dobra em 2027: os 4 ⚡ podem não cobrir — o lado a lado mede.* | Claude — o lado a lado; **dono** — a escolha do padrão |
| 2 | **Apagar asset da galeria, com auditoria de referências** — o botão não existe; falta **a tela** e **a auditoria da imagem usada como referência**, que mora no `data` de um node dentro do `graph` e **não tem FK**. **0 ⚡.** → §9 do [`plano-video-final.md`](plano-video-final.md). *Fora do caminho do post.* | Claude |
| 3 | **O selo «bloqueada pelo filtro do Google» nunca foi visto em tela.** A última geração do banco é `0cf3f069`, de 07/09. **Decisão do dono, 07/09:** *a próxima recusa numa geração que ele faria de qualquer forma fecha esta prova, com 0 ⚡ extra* — **e a F3 da Frente 1 é uma delas.** | oportunidade |
| 4 | **Egress §4.5** — o egress na fatura, esperando o gráfico de Usage. | o relógio |
| 5 | **Perguntas com gatilho:** a **0.3** (a aba escondida trava o elo?); **recusa × concorrência** (n ≥ 30); e **a trava de dono da linhagem, provada de um lado só** — o gatilho é **a segunda conta**. | medição |
| 6 | **Duas perguntas para a frente 5 (Publicação), antes de ela abrir:** publicar **não gasta e não tem volta** — a primeira publicação real é metade do dono?; e **tokens da Meta por conta não cabem em variável de ambiente** — exceção às regras de Segurança, a registrar antes do primeiro token. → [`ROADMAP.md`](ROADMAP.md) §3 e §4 | dono, quando a frente abrir |
| 7 | **Backlog nomeado:** arquivar/ocultar na galeria; filtros e busca; o glifo ⇥ com contraste fraco; três arestas órfãs; o «Reanimar» é tudo-ou-nada; **montar duas vezes o mesmo roteiro faz DOIS filmes idênticos** (`959dc554…` e `8fa08846…`); **uma leitura de carteira que falha vira «você tem 0 ⚡»** (`src/app/studio/page.tsx`) — **mente sobre dinheiro**; **os outros `<dialog>`** têm **o mesmo buraco do `nowheel`**; re-semear o canvas quando o HMR cria um store vazio; **`edited_at` e `updated_at` usam relógios diferentes** (~2 s); **`nanoid` < 3.3.18** — 1 alta do `npm audit`, transitiva do Next 16.3.0; **a sonda de chaves na TELA** — o script já existe, falta a versão que o dono vê sem terminal; **o cadastro com confirmação por e-mail feito no dev local** precisaria da 5599 na lista de redirecionamentos do Supabase (o login com senha não depende da porta). | plano |

As notas do **Modo Take** e da **Voz** já estão em disco — [`notas-modo-take.md`](notas-modo-take.md)
e [`notas-voz.md`](notas-voz.md) —, e as duas impõem o mesmo requisito ao **Catálogo aberto**:
**capacidades como dado**. Na fila de 16/09, as três ficam **depois** do primeiro post.

---

> **Projeto de prova da frente:** «Projeto teste Foto da Blusa» — o percurso da A′, com a foto
> `06778db7` (WebP, registrada como JPEG — um dos 6) e a geração `0cf3f069`. **O controle da F3
> está intacto em 26/09:** a ficha da cena 2 não foi tocada desde 07/09 (e tem `produto: null`), a
> @luna ativa é a v4, o card tem nome e 1 foto. O **filme duplicado fica** no acervo até o item 2
> existir.

> **O dev sobe na 5599, fixa desde 26/09** (`npm run dev`) — a porta em que a extensão do Chrome tem
> permissão; a 3000 é dos outros projetos da máquina. **Para o ambiente de vídeo** *(a Frente 1 não
> precisa — é só imagem)*: o túnel aponta para `http://localhost:5599` e vive **no comando**, nunca no
> arquivo — `FAL_WEBHOOK_URL="https://<tunel-de-hoje>.trycloudflare.com/api/webhooks/fal" npm run dev`.
