# ESTADO — onde o projeto está

> **Leia isto primeiro.** Uma página, reescrita **em toda pausa** (regra 9 do
> [`CLAUDE.md`](../CLAUDE.md)). Não é histórico: é o **checklist do projeto agora**.
> O *porquê* está em [`decisoes.md`](decisoes.md); o *o quê e em que ponto* de cada
> frente está no `plano-*.md` dela; o *como está hoje* está no código.

**Última reescrita:** 04/09/2026, com as **Fases 5 e 1 do «vídeo final» fechadas** — **o
filme existe e toca no canvas** — e com **três** defeitos que só a validação de tela
pegaria, achados, medidos e consertados.

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

**Mini-ciclo «O vídeo final» · Fase 5 — ✅ FECHADA em 04/09.** A Máquina vazia **cria** o
Roteiro ligado (não aponta para o template: apontar daria uma **segunda** Máquina a quem
já tem uma). **23 asserções estruturais verdes** — par criado, dois handles, geometria
invertida (ΔX 212 / ΔY 626), autosave, **as três recusas** e o desvio de colisão — mais a
validação de tela na 5599, que achou o que elas não pegariam: **os dois cards ficavam
selecionados**, porque o `click` sobe até o wrapper do node do React Flow e roda **depois**
do nosso `set`. *(Não é ponteiro: um `.click()` sintético fazia igual.)* Consertado com
`stopPropagation`, vermelho→verde medido. **O harness monta o store fora do React — nenhuma
prova estrutural pegaria isto.**

**Mini-ciclo «O vídeo final» · Fase 1 — ✅ FECHADA em 04/09. O FILME EXISTE.** De 3 clipes
pagos, **um arquivo**: asset `959dc554…`, **716×1284, 15.125 ms, 11.066.457 B** — o mesmo
tamanho que a Fase 0 mediu —, com linhagem **peça 1 → cena 1, peça 2 → cena 2, peça 3 →
cena 3** e o cartão **tocando** no canvas (`readyState = 4`, o decodificador confirmando
716×1284 e 15,125 s). **E o extrato não se moveu:** `generations` 716 → 716, ledger 108 →
108, saldo **3.280 → 3.280**.

**As travas da montagem, exercitadas contra os clipes reais:** a assinatura lida **dos
ARQUIVOS** recusa nomeando *"cena 3"* e dizendo em quê (codec, 540×960 ≠ 716×1284, 30 ≠ 24
fps) enquanto o banco diz `"720p"` para os dois; o teto de 50 MB recusa em duas portas, uma
delas **sem abrir arquivo**; e **363 de 363 quadros** do montado são idênticos, por hash de
pixel cru, aos das cenas na ordem certa. *Montado pela ordem de criação, o arquivo é
válido, tem a mesma duração e o mesmo número de quadros — e **242 dos 363 ficam fora do
lugar**. Nenhum número denuncia; só o vídeo.*

**No banco:** `asset_montage_parts` com RLS default-deny, **somente-leitura para o
usuário** — a única escrita é `record_montage`, como o ledger só recebe escrita por
`record_generation`. Dois triggers, os dois com vermelho→verde medido; e a armadilha
achada a tempo: **`on delete set null` é um UPDATE**, então um append-only ingênuo teria
tornado **indeletável** qualquer clipe que já tivesse entrado num filme.

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
| 1 | **[`plano-video-final.md`](plano-video-final.md), da Fase 2 em diante.** Ordem decidida em 03/09: **5 → 1 → 2 → 3 → ⏸️ PARADA → 4 → 6 → 7 → fechamento** — **a 0, a 5 e a 1 já fecharam.** Tudo **0 ⚡**, então sela com prova estrutural + validação de tela e vai para produção no mesmo dia. | Claude |
| 2 | **O `fix:` do produto — decidido em 03/09, ainda não executado.** A Máquina ganha o **Input de Produto** (foto + descrição na geração); enquanto não conectado, a tela avisa que o `produto` da ficha é **só nome**; e o **Roteiro passa a exigir onde o produto está na cena**. *Pôr o nome no prompt foi descartado: **nome não é foto**.* Depois deste mini-ciclo, antes do Catálogo. **Pior caso R1: 1 roteiro (15 ⚡) + 1 imagem (75 ⚡) = 90 ⚡** — a **única coisa em pauta com dinheiro dentro**, metade do dono obrigatória. | Jorge |
| 3 | **Egress §4.5** — o egress na fatura, esperando o gráfico de Usage. | o relógio |
| 4 | **Perguntas com gatilho:** a **0.3** (a aba escondida trava o elo?); **recusa × concorrência** (n ≥ 30); e **a trava de dono da linhagem, provada de um lado só** — o trigger de `asset_montage_parts` recusa peça cujo dono é **nulo**, mas o ramo *«peça de OUTRA pessoa existente»* **nunca foi exercitado**, porque a base tem **1 conta** *(medido em 04/09/2026)*. **O gatilho é a segunda conta:** no dia em que o painel super admin ou o primeiro convidado existir, esta prova roda — e até lá ela é uma trava que ninguém viu funcionar do lado que importa. | medição |
| 5 | **Backlog nomeado:** **os `assets.width`/`height` em `NULL` nos clipes de vídeo em geral** *(achado da Fase 0; o filme montado não herda isso — é a prova 5d da Fase 1)*; arquivar/ocultar na galeria; filtros e busca; o glifo ⇥ com contraste fraco; três arestas órfãs; o «Reanimar» é tudo-ou-nada; **montar duas vezes o mesmo roteiro faz DOIS filmes idênticos** *(04/09/2026 — **e já aconteceu**: `959dc554…` e `8fa08846…`, os dois com 11.066.457 B, 716×1284, 15.125 ms e 3 peças, no acervo agora. Nada impede, e o segundo custa **0 ⚡**; o que ele custa é confusão na galeria, duas linhas iguais sem nada que diga qual é a boa)*. **Conserto é de produto, não de banco:** perguntar antes, ou substituir o anterior. Adiado por decisão do dono; **`nanoid` < 3.3.18 — 1 alta do `npm audit`, achada em 04/09/2026** ao instalar a `mediabunny` *(que não é a culpada: ela tem **zero** dependências de runtime)*. Chega por `postcss`, transitiva do **Next 16.3.0 e do `@tailwindcss/postcss` 4.3.3**; hoje resolvida em **3.3.17**, e **3.3.18 corrige** (GHSA-2v37-7h3g-55p8, laço infinito com gerador custom e `size` zero). **Decisão à parte** — `audit fix` em transitiva do Next não entra de carona numa fase de vídeo. *(As arestas que não desenham viraram a Fase 4; o "falhou neste lote" virou a Fase 6; o `edited_at` virou a Fase 7.)* | plano |

**A ordem das frentes, decidida em 02/09/2026:**
**A · O vídeo final** → **B · Catálogo aberto** → **C · Modo Take** → **D · Voz e áudio**
→ **E · Passe de UI/UX** → **F · Publicação**.

As notas de C e D já estão em disco: [`notas-modo-take.md`](notas-modo-take.md) e
[`notas-voz.md`](notas-voz.md). **As duas impõem o mesmo requisito ao Catálogo:
capacidades como dado** — fala nativa e seus idiomas, referência de áudio, lipsync,
`voice_id`.

---

## O PRÓXIMO GESTO

**A Fase 2: o mini-player — e ela começa com meio caminho andado.** O cartão do Filme já
toca: a Fase 1 não podia deixar o canvas com imagem quebrada nem por uma hora, então o
cartão ganhou `kind` e vídeo virou `<video controls muted playsInline preload="metadata">`
— o próprio navegador dá o pôster do primeiro quadro.

**O que falta é o resto:** o player no **cartão de CENA** do trilho, que continua sem
nenhum, e o acabamento do que já existe — barra de progresso nossa, mudo com botão,
duração exibida conferindo com a do arquivo.

**E ela é o instrumento que falta para uma pergunta velha:** o veredito do elo — *"os
clipes emendam a ponto de parecer um filme só?"* — está **NÃO MEDIDO desde 28/08**
justamente porque ver os clipes em sequência dava trabalho. Agora dá para assistir ao
filme inteiro num cartão.

**0 ⚡.** Depois: Fase 3 (o modal por cima do vídeo), e aí a **⏸️ PARADA**.

> **⏸️ Depois da Fase 3, o trabalho para e o dono olha.** Ele tem de ver **o filme
> montado a partir dos 3 clipes reais** do «Projeto novo teste maquina storyboard» —
> como **cartão no canvas** e como **asset na galeria** —, com o print. Não é a metade
> do dono da regra 8 (não há dinheiro): **é o veredito de 02/09 sendo atendido na frente
> de quem o deu.** A documentação sela depois; ele vê antes.

> **A dependência já tem o ok:** `mediabunny` foi **aprovada em 03/09**, e entra cravada
> em **`1.55.6`, sem caret** — o projeto lançou seis versões em dezessete dias, e o que
> a diligência mediu foi esta. Atualizar vira gesto, não efeito colateral de um
> `npm install`.

> **🧹 Um projeto de rascunho ficou no estúdio e pode ser apagado:** «Projeto sem
> título 1», criado em 04/09 só para a validação de tela da Fase 5. Tem 4 pares
> Máquina+Roteiro vazios e nada mais — **nenhuma geração, nenhum Spark, nada no
> ledger**. As medições dele já estão em
> `scratchpad\evidencias\video-final-fase5\`, então apagar não perde nada. **Quem
> apaga é o Jorge** — apagar recurso remoto é dele.

> **Dois projetos de prova ficaram no estúdio:** «Prova · C3 Fase 4» (o par do template)
> e «Projeto novo teste maquina storyboard» (o percurso do dono, com os 3 clipes). O
> segundo já serviu à Fase 0 — **os 3 clipes estão copiados em
> `scratchpad\video-final-fase0\clipes\`**, então apagar o projeto agora não perde a
> medição.

> **Para subir o ambiente de vídeo:** o túnel vive **no comando**, nunca no arquivo —
> `FAL_WEBHOOK_URL="https://<tunel-de-hoje>.trycloudflare.com/api/webhooks/fal" npm run dev`.
