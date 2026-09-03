# ESTADO — onde o projeto está

> **Leia isto primeiro.** Uma página, reescrita **em toda pausa** (regra 9 do
> [`CLAUDE.md`](../CLAUDE.md)). Não é histórico: é o **checklist do projeto agora**.
> O *porquê* está em [`decisoes.md`](decisoes.md); o *o quê e em que ponto* de cada
> frente está no `plano-*.md` dela; o *como está hoje* está no código.

**Última reescrita:** 03/09/2026, com a **Fase 0 do «vídeo final» fechada** e as quatro
decisões do dono gravadas no plano.

---

## O que está PROVADO

**A fundação.** Canvas de nodes, projetos, character sheet com versões congeladas, motor
de extração, compilador determinístico, geração de imagem canônica, ledger append-only
com as travas no banco. As 15 tabelas com RLS default-deny.

**Frente Storyboard · Ciclo 1 — o elo.** O último quadro de um clipe vira o primeiro do
seguinte, por asset derivado. ⚠️ *O **veredito humano** do elo continua **NÃO MEDIDO com
gatilho**.*

**Frente Storyboard · Ciclo 2 — o Roteiro.** Uma ideia vira fichas de cena estruturadas
no banco. Fechado.

**Frente Storyboard · Ciclo 3 — a Máquina. ✅ ENCERRADO.** Fases 0 a 4 fechadas, as sete
decisões tomadas, e **a régua percorrida pelo dono**: 3 cenas, 870 ⚡, do zero ao clipe.
A cena entra na linha da geração, a Máquina rege o lote, o trilho espelha o banco, os
dois portões falam a verdade multiplicada antes do clique, e o template «Fluxo de
Storyboard» põe Roteiro + Máquina conectados num clique.

**O percurso de 02/09, por id:** exatamente **3 cobranças de vídeo**, cada uma com o seu
`provider_job_id`, submetidas numa janela de **643 ms** e voltando em 69 s, 74 s e 64 s —
**zero reconciliação à mão**. A conta fecha: 15 + 225 + 630 = **870 ⚡**, saldo 4.150 →
3.280.

**Mini-ciclo «O vídeo final» · Fase 0 — ✅ FECHADA em 03/09.** A montagem tem vencedor,
com número: **JavaScript puro (`mediabunny`), sem `ffmpeg`** — 122 ms contra 202 ms do
`ffmpeg -c copy`, binário de **0,63 MB contra 75,0 MB**, e o arquivo montado **idêntico
quadro a quadro** (363 de 363) à soma das cenas na ordem certa. Com 10 cenas, **885 ms e
35,0 MB**, dentro dos 50 MB do bucket com 30% de folga.

**Documentação para qualquer agente.** `AGENTS.md` como ponteiro para o `CLAUDE.md`,
`README.md` como mapa, `.gitattributes` fixando o EOL.

**Mini-ciclo Egress.** Fases 0 a 5 fechadas, em produção.

**Dinheiro, depois do incidente de 29/08.** As quatro travas do motorista, cada uma com
simulação vermelha→verde reexecutável; a fechadura ED25519 do webhook; a trava de vida do
endereço de retorno.

---

## O que a Fase 0 descobriu e ainda não virou código

Três achados medidos que **mudam o desenho da Fase 1** — o detalhe está no §4.1 do
[`plano-video-final.md`](plano-video-final.md):

1. **A ordem das cenas ≠ a ordem de criação das gerações.** O lote de 643 ms de 02/09
   saiu embaralhado: a cena 2 é a geração criada **por último**. Montar por `created_at`
   entrega o filme fora de ordem, **e o erro só aparece no vídeo**.
2. **O banco não sabe o que os arquivos são.** `assets.width`/`height` são `NULL`, e o
   `params.resolution` diz `"720p"` enquanto o arquivo tem **716×1284**. O portão de
   montar **lê os arquivos**, não o banco.
3. **Nenhuma biblioteca recusa clipe incompatível sozinha.** O `ffmpeg -c copy` entrega
   arquivo silenciosamente errado; o puro JS acerta a duração e erra a resolução
   declarada. **A trava é nossa** — e recusar custa zero.

---

## O que está ABERTO

| # | o que falta | quem fecha |
|---|---|---|
| 1 | **[`plano-video-final.md`](plano-video-final.md), da Fase 5 em diante.** Ordem decidida em 03/09: **5 → 1 → 2 → 3 → ⏸️ PARADA → 4 → 6 → 7 → fechamento** (a 0 já fechou). Tudo **0 ⚡**, então sela com prova estrutural + validação de tela e vai para produção no mesmo dia. | Claude |
| 2 | **O `produto` fora do prompt** — e o diagnóstico mudou em 03/09: **não é esquecimento, é decisão declarada** de 10/08 no próprio arquivo. Vira `fix:` depois deste mini-ciclo, **e começa por escolher entre três caminhos** (§9 do plano), não por um patch. Custa ~75 ⚡ para provar, então é a **única coisa em pauta com dinheiro dentro** — metade do dono obrigatória. | Jorge |
| 3 | **Egress §4.5** — o egress na fatura, esperando o gráfico de Usage. | o relógio |
| 4 | **Perguntas com gatilho:** a **0.3** (a aba escondida trava o elo?) e **recusa × concorrência** (n ≥ 30). | medição |
| 5 | **Backlog nomeado:** **os `assets.width`/`height` em `NULL` nos clipes de vídeo em geral** *(achado da Fase 0; o filme montado não herda isso — é a prova 5d da Fase 1)*; arquivar/ocultar na galeria; filtros e busca; o glifo ⇥ com contraste fraco; três arestas órfãs; o «Reanimar» é tudo-ou-nada. *(As arestas que não desenham viraram a Fase 4; o "falhou neste lote" virou a Fase 6; o `edited_at` virou a Fase 7.)* | plano |

**A ordem das frentes, decidida em 02/09/2026:**
**A · O vídeo final** → **B · Catálogo aberto** → **C · Modo Take** → **D · Voz e áudio**
→ **E · Passe de UI/UX** → **F · Publicação**.

As notas de C e D já estão em disco: [`notas-modo-take.md`](notas-modo-take.md) e
[`notas-voz.md`](notas-voz.md). **As duas impõem o mesmo requisito ao Catálogo:
capacidades como dado** — fala nativa e seus idiomas, referência de áudio, lipsync,
`voice_id`.

---

## O PRÓXIMO GESTO

**A Fase 5: a Máquina vazia aponta para o «Fluxo de Storyboard».** É a mais barata do
plano e mexe na porta de entrada — o card de Máquina sem roteiro passa a **oferecer o
caminho pronto** (um gesto que cria o Roteiro já ligado), em vez de só mandar arrastar um
fio. Ela subiu para a frente pela decisão 1 do dono, para que o próximo percurso já
comece certo.

**Prova:** contagem — o gesto cria 1 node e 1 aresta com `targetHandle = BOARD_HANDLE`, e
o estado vazio deixa de aparecer. **0 ⚡.**

> **⏸️ Depois da Fase 3, o trabalho para e o dono olha.** Ele tem de ver **o filme
> montado a partir dos 3 clipes reais** do «Projeto novo teste maquina storyboard» —
> como **cartão no canvas** e como **asset na galeria** —, com o print. Não é a metade
> do dono da regra 8 (não há dinheiro): **é o veredito de 02/09 sendo atendido na frente
> de quem o deu.** A documentação sela depois; ele vê antes.

> **A dependência já tem o ok:** `mediabunny` foi **aprovada em 03/09**, e entra cravada
> em **`1.55.6`, sem caret** — o projeto lançou seis versões em dezessete dias, e o que
> a diligência mediu foi esta. Atualizar vira gesto, não efeito colateral de um
> `npm install`.

> **Dois projetos de prova ficaram no estúdio:** «Prova · C3 Fase 4» (o par do template)
> e «Projeto novo teste maquina storyboard» (o percurso do dono, com os 3 clipes). O
> segundo já serviu à Fase 0 — **os 3 clipes estão copiados em
> `scratchpad\video-final-fase0\clipes\`**, então apagar o projeto agora não perde a
> medição.

> **Para subir o ambiente de vídeo:** o túnel vive **no comando**, nunca no arquivo —
> `FAL_WEBHOOK_URL="https://<tunel-de-hoje>.trycloudflare.com/api/webhooks/fal" npm run dev`.
