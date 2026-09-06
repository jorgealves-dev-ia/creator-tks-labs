# ESTADO — onde o projeto está

> **Leia isto primeiro.** Uma página, reescrita **em toda pausa** (regra 9 do
> [`CLAUDE.md`](../CLAUDE.md)). Não é histórico: é o **checklist do projeto agora**.
> O *porquê* está em [`decisoes.md`](decisoes.md); o *o quê e em que ponto* de cada
> frente está no `plano-*.md` dela; o *como está hoje* está no código.

**Última reescrita:** 06/09/2026, com o **INCIDENTE dos vínculos ENCERRADO por medição**:
não havia perda de dado, em nenhum momento — a causa é **a aba nunca ter sido pintada**,
e ela reproduz igual em produção. As Fases 5, 1, 2 e 3 fecharam e a PARADA foi aprovada
(«testei, está ok»). Falta a Fase 4 · item 2, a 6, a 7 e o fechamento.

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
| 1 | **O mini-ciclo «O vídeo final», na reta final.** Ordem decidida em 03/09: **5 → 1 → 2 → 3 → ⏸️ PARADA → 4 → 6 → 7 → fechamento**; a 0, a 5, a 1, a 2, a 3 e a PARADA já fecharam, e o incidente que interrompeu a 4 **está encerrado por medição**. Falta a **Fase 4 · item 2** (o cartão diz «peça removida»), a **6** (o estado *enviando*), a **7** (aprovar não carimba `edited_at`) e o **fechamento**. Tudo **0 ⚡**: sela com prova estrutural + validação de tela e vai para produção no mesmo dia. | Claude |
| 2 | **O `fix:` do produto — decidido em 03/09, ainda não executado.** A Máquina ganha o **Input de Produto** (foto + descrição na geração); enquanto não conectado, a tela avisa que o `produto` da ficha é **só nome**; e o **Roteiro passa a exigir onde o produto está na cena**. *Pôr o nome no prompt foi descartado: **nome não é foto**.* Depois deste mini-ciclo, antes do Catálogo. **Pior caso R1: 1 roteiro (15 ⚡) + 1 imagem (75 ⚡) = 90 ⚡** — a **única coisa em pauta com dinheiro dentro**, metade do dono obrigatória. | Jorge |
| 3 | **Egress §4.5** — o egress na fatura, esperando o gráfico de Usage. | o relógio |
| 4 | **Perguntas com gatilho:** a **0.3** (a aba escondida trava o elo?); **recusa × concorrência** (n ≥ 30); e **a trava de dono da linhagem, provada de um lado só** — o trigger de `asset_montage_parts` recusa peça cujo dono é **nulo**, mas o ramo *«peça de OUTRA pessoa existente»* **nunca foi exercitado**, porque a base tem **1 conta** *(medido em 04/09/2026)*. **O gatilho é a segunda conta:** no dia em que o painel super admin ou o primeiro convidado existir, esta prova roda — e até lá ela é uma trava que ninguém viu funcionar do lado que importa. | medição |
| 5 | **Backlog nomeado:** **os `assets.width`/`height` em `NULL` nos clipes de vídeo em geral** *(achado da Fase 0; o filme montado não herda isso — é a prova 5d da Fase 1)*; arquivar/ocultar na galeria; filtros e busca; **apagar asset da galeria com auditoria de referências** — *saiu do backlog e virou trabalho nomeado no §9 do [`plano-video-final.md`](plano-video-final.md) em 06/09, porque o dono foi apagar o filme duplicado e **o botão não existe**; os triggers de 04/09 já tornam seguro o apagamento (cascade para o filme, «peça removida» para o clipe), o que falta é a tela e a auditoria da imagem usada como referência, que não tem FK nenhuma*; o glifo ⇥ com contraste fraco; três arestas órfãs; o «Reanimar» é tudo-ou-nada; **montar duas vezes o mesmo roteiro faz DOIS filmes idênticos** *(04/09/2026 — **e já aconteceu**: `959dc554…` e `8fa08846…`, os dois com 11.066.457 B, 716×1284, 15.125 ms e 3 peças, no acervo agora. Nada impede, e o segundo custa **0 ⚡**; o que ele custa é confusão na galeria, duas linhas iguais sem nada que diga qual é a boa)*. **Conserto é de produto, não de banco:** perguntar antes, ou substituir o anterior. Adiado por decisão do dono; **`nanoid` < 3.3.18 — 1 alta do `npm audit`, achada em 04/09/2026** ao instalar a `mediabunny` *(que não é a culpada: ela tem **zero** dependências de runtime)*. Chega por `postcss`, transitiva do **Next 16.3.0 e do `@tailwindcss/postcss` 4.3.3**; hoje resolvida em **3.3.17**, e **3.3.18 corrige** (GHSA-2v37-7h3g-55p8, laço infinito com gerador custom e `size` zero). **Decisão à parte** — `audit fix` em transitiva do Next não entra de carona numa fase de vídeo. *(As arestas que não desenham viraram a Fase 4; o "falhou neste lote" virou a Fase 6; o `edited_at` virou a Fase 7.)* | plano |

**A ordem das frentes, decidida em 02/09/2026:**
**A · O vídeo final** → **B · Catálogo aberto** → **C · Modo Take** → **D · Voz e áudio**
→ **E · Passe de UI/UX** → **F · Publicação**.

As notas de C e D já estão em disco: [`notas-modo-take.md`](notas-modo-take.md) e
[`notas-voz.md`](notas-voz.md). **As duas impõem o mesmo requisito ao Catálogo:
capacidades como dado** — fala nativa e seus idiomas, referência de áudio, lipsync,
`voice_id`.

---

## ✅ INCIDENTE ENCERRADO — e a causa não era nossa

> # NUNCA HOUVE PERDA. Nem em produção, nem no dev, nem por um instante.

**A causa, medida em 06/09:** o canvas só desenha aresta depois que o React Flow
**mede** os nodes, e ele mede por `ResizeObserver`. **Em aba que nunca foi pintada o
Chrome não faz layout**, o observer não dispara, os 27 nodes ficam em
`style.visibility: hidden` — a marca do React Flow para *"ainda não medi"* — e **sem
posição de handle não existe aresta para desenhar**. O container fica vazio e o React
Flow não avisa nada, porque para ele não houve erro.

**A tabela que decide** — mesma URL, mesmo projeto, mesma espera; a **única** variável é
se houve um `screenshot` (que pinta a aba) entre a navegação e a medição:

| build | pintada? | nodes no DOM | arestas no DOM | `visibility:hidden` | **store nodes/arestas** |
|---|---|---|---|---|---|
| dev — StrictMode **ligado** | não (×3) | 27 | **0** | **27** | **27 / 23** |
| dev — StrictMode **ligado** | sim | 27 | 19 | 0 | **27 / 23** |
| prod — StrictMode **desligado** | não (×2) | 27 | **0** | **27** | **27 / 23** |
| prod — StrictMode **desligado** | sim | 27 | 19 | 0 | **27 / 23** |

**O interceptador do §11 (a) foi escrito e rodou em ≥ 12 cargas: `🚨 ARESTAS A ZERO` = 0.**
*Ninguém escreve `[]`.* E a medição é feita **pela própria página**, em marcos de 1/3/6/10 s
guardados em `window.__MED__` — ler a tela pela extensão **ativa a aba**, e ativar a aba é
exatamente a variável em teste.

**Três consequências:**

1. **O StrictMode está inocente**, e isso é medido dos dois lados: produção não o tem e
   reproduz o sintoma igual. **O incidente nunca foi dev-only — era aba-não-pintada.**
   Produção desenhou 20 de 20 em 04/09 porque o Jorge estava **olhando para a tela**.
2. **A Fase 4 · item 1 nunca existiu como defeito de produto.** Os *"19 que desenham
   zero"* de 02/09 são, hoje, **exatamente os 19 que uma aba pintada desenha no primeiro
   segundo**. Agora não é «provavelmente»: é medido.
3. **A trava do grafo FICA — decisão do dono, 06/09 — e o porquê muda.** O valor dela é
   pôr **o servidor como juiz**: a régua mora na linha do banco, não em quantas arestas o
   navegador acha que carregou. E o achado do HMR abaixo mostra que a classe *"o navegador
   pode segurar um store que não é o documento"* é real. ⚠️ *O caminho «arrasto grava `[]`
   por cima de 23» **não foi demonstrado**: no estado medido o store novo nasce com
   `projectId: null` e o canvas nem renderiza.* Ela continua sendo o que era — **seguro
   barato**.

**A lição virou MECANISMO, não frase** *(emenda do dono, 06/09)*. A armadilha já estava
escrita — *«NADA de canvas vale em aba escondida»*, 18/08/2026 — e mordeu assim mesmo, por
três semanas. Agora `scratchpad\harness\medir-canvas.js` **recusa devolver número** de um
canvas não pintado, por duas portas: **pintura ao vivo** (`visible` + um `rAF` que dispara)
ou **pintura anterior** (**nenhum** node em `visibility: hidden`). Vermelho→verde medido:
sem `screenshot`, *"27 de 27 nodes por medir · LEITURA RECUSADA"*; com `screenshot`,
`27 nodes · 20 arestas · 0 por medir`. Está na regra 8 do [`CLAUDE.md`](../CLAUDE.md).
**E toda afirmação sobre o store lê o store.**

**Achado lateral, medido no caminho:** editar `src/lib/canvas/store.ts` com a página
aberta **apaga o canvas** — o `create()` do zustand roda de novo e nasce um **segundo
store, vazio**; o efeito que semeia tem dependência `[]` e nunca mais roda. É a memória
`fast-refresh-esvazia-store` com o mecanismo medido. **Recarregar resolve, e é a única
coisa que resolve.** 📌 **Backlog nomeado:** re-semear quando o store nasce vazio com
`props` boas é **ferramenta de dev, não produto** — some no build — e custa uma peça a mais
no caminho da carga. **Anotado, não feito** (decisão do dono, 06/09).

Evidência: `scratchpad\evidencias\incidente-vinculos\` — `causa-raiz-nao-e-strictmode-e-a-aba-nao-pintada.md`,
`o-interceptador-ninguem-escreve-vazio.md`, `achado-lateral-hmr-em-store-ts-esvazia-o-canvas.md`.

---

## O PRÓXIMO GESTO

| # | o que |
|---|---|
| 1 | ~~a medição em produção~~ ✅ **feita: produção desenha 20 de 20** |
| 2 | ~~a causa raiz~~ ✅ **nomeada e medida em 06/09: a aba nunca pintada. Não é o StrictMode, não é dev-only, e nunca houve perda** |
| 3 | **Fase 4 · item 2** — o cartão do filme dizendo «peça removida» na posição, com a contagem inalterada *(o item 1 morreu com o incidente: nunca existiu)* |
| 4 | **Fase 6** — o estado *«enviando»* |
| 5 | **Fase 7** — aprovar não carimba `edited_at` |
| 6 | **fechamento** do mini-ciclo, ritual do §8 |

**Tudo 0 ⚡.**

> **A sonda do incidente ainda está no disco e marcada `SAI ANTES DO COMMIT`** —
> `src/lib/canvas/sonda-vinculos.ts` mais os pontos em `store.ts` e `flow-canvas.tsx`.
> Ela **não pode** entrar em nenhum commit; a trava do `git grep` da regra 8 pega os
> quatro arquivos.

> **⏸️ Depois da Fase 3, o trabalho para e o dono olha.** Ele tem de ver **o filme
> montado a partir dos 3 clipes reais** do «Projeto novo teste maquina storyboard» —
> como **cartão no canvas** e como **asset na galeria** —, com o print. Não é a metade
> do dono da regra 8 (não há dinheiro): **é o veredito de 02/09 sendo atendido na frente
> de quem o deu.** A documentação sela depois; ele vê antes.

> **A dependência já tem o ok:** `mediabunny` foi **aprovada em 03/09**, e entra cravada
> em **`1.55.6`, sem caret** — o projeto lançou seis versões em dezessete dias, e o que
> a diligência mediu foi esta. Atualizar vira gesto, não efeito colateral de um
> `npm install`.

> **🧹 O «Projeto sem título 1» JÁ FOI APAGADO pelo dono** *(06/09)*. Era o rascunho da
> validação de tela da Fase 5; as medições dele já estavam em
> `scratchpad\evidencias\video-final-fase5\`, então nada se perdeu.

> **🎬 O filme duplicado FICA no acervo, por decisão do dono** *(06/09)*. São dois assets
> idênticos — `959dc554…` e `8fa08846…`, os dois com 11.066.457 B, 716×1284, 15.125 ms e 3
> peças —, e **nenhum dos dois pode ser apagado hoje: o botão não existe.** É o que
> transformou «apagar asset da galeria» em trabalho nomeado no §9 do plano.

> **Dois projetos de prova ficaram no estúdio:** «Prova · C3 Fase 4» (o par do template)
> e «Projeto novo teste maquina storyboard» (o percurso do dono, com os 3 clipes). O
> segundo já serviu à Fase 0 — **os 3 clipes estão copiados em
> `scratchpad\video-final-fase0\clipes\`**, então apagar o projeto agora não perde a
> medição.

> **Para subir o ambiente de vídeo:** o túnel vive **no comando**, nunca no arquivo —
> `FAL_WEBHOOK_URL="https://<tunel-de-hoje>.trycloudflare.com/api/webhooks/fal" npm run dev`.
