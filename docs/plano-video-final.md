# Plano — Mini-ciclo «O vídeo final»

> **O que este arquivo é.** O plano do mini-ciclo, em disco, **antes da primeira linha de
> código** (regra 9 do [`CLAUDE.md`](../CLAUDE.md)).
>
> **Status: 📋 RASCUNHO — aguardando aprovação do Jorge. NADA EXECUTA.**
>
> **Custo de todo o mini-ciclo: 0 ⚡, 0 submissões.** Nenhuma fase aqui chama provedor
> pago. Juntar arquivo, desenhar player e mudar um estado vazio não gastam Spark — e é
> por isso que este é **o rabo do Ciclo 3**, e não um ciclo novo.

---

## 1. Por que ele existe, em uma frase

O veredito do dono, em 02/09/2026, depois de percorrer a régua do zero:

> **O fluxo ficou curto, mas para antes do fim — três "vídeo pronto" e nenhum vídeo.**
> A Máquina precisa terminar em **UM vídeo**, montado no canvas, **sem Spark**.
> **Não é reabrir o desenho; é o rabo dele.**

Três clipes numa pasta são matéria-prima. **Um filme é entrega.** Este mini-ciclo é a
distância entre as duas coisas — e ela é curta.

---

## 2. A régua deste mini-ciclo

A régua do Ciclo 3 era *quantos gestos até o vídeo*. A deste é outra, e mais dura:

> ## **quantos gestos até UM ARQUIVO que dá para postar**

Hoje, depois dos 9 gestos da Máquina, ainda faltam: abrir cada clipe, baixar um a um,
abrir um editor, importar três arquivos, ordenar, exportar. **Seis gestos e um programa
que não é o nosso** — e é aí que o produto perde a pessoa.

**A meta: 9 + 1.** O décimo gesto é *Montar*, e ele devolve um arquivo.

---

## 3. O que este mini-ciclo NÃO faz

Dito antes das fases, porque o escopo é a metade do plano.

- **Não é editor de vídeo.** Sem corte, sem trim, sem transição desenhada, sem timeline
  arrastável. **Junta na ordem das cenas, e só.** Transição é `corte` porque é o que a
  ficha já diz.
- **Não é trilha sonora nem voz.** A voz é o Ciclo D e tem notas próprias.
- **Não mexe no motorista, nos portões, na cobrança nem no ledger.** Nenhum caminho
  daqui pode submeter nada a provedor pago. *Se alguma fase começar a encostar em
  dinheiro, ela está fora do escopo e a regra 8 volta a exigir a metade do dono.*
- **Não reabre o desenho da Máquina.** A anatomia da §3.2 do
  [`nodes-geracao.md`](./nodes-geracao.md) continua valendo; ganha **um** portão a mais.
- **Não resolve o `produto` fora do prompt** (achado da auditoria de 02/09). É defeito
  do compilador de cena, tem endereço próprio, e entra na lista de riscos abaixo por ser
  vizinho — não como entrega.

---

## 4. As fases

### Fase 0 · a medição, antes de desenhar

**Nada de código.** Três números que decidem o desenho das fases seguintes:

1. **O que temos, no banco.** Para os 3 clipes do percurso de 02/09: o `content_type`
   real, a resolução, o fps, a duração e o tamanho de cada arquivo no Storage. *Três
   clipes de 5 s do mesmo modelo têm o mesmo container? Se não têm, a Fase 1 muda.*
2. **O `ffmpeg` existe no runtime da Vercel?** E se existe, em que versão. **É a
   pergunta que decide a Fase 1 inteira** — ver os riscos.
3. **O tempo de uma concatenação de 3 × 5 s**, medido localmente, contra o
   `maxDuration` de 60 s. Com 10 cenas, extrapolado.

**Prova:** uma tabela com os três números. **Custo: 0 ⚡.**

---

### Fase 1 · A montagem — o botão que devolve um arquivo

**Entrega.** Um terceiro portão na Máquina — **«Montar o vídeo»** — que aparece **só
quando todos os clipes do roteiro existem**, junta os clipes **na ordem das cenas**, e
grava o resultado como **asset na galeria do projeto**, baixável.

**Onde ele fica, e por que ali.** Na anatomia da §3.2, a banda dos portões. Depois de
*Animar*, porque é o que vem depois. **Desabilitado com frase** enquanto falta clipe —
*"faltam 2 clipes"* —, nunca escondido: um botão que some ensina que ele não existe.

**Como junta.** Concatenação sem recodificar quando os clipes são compatíveis
(`ffmpeg -f concat -c copy`), e com recodificação quando não são. **A Fase 0 diz qual
dos dois é o caso real** — e se for recodificar, o tempo dela é que decide entre rota
síncrona e job assíncrono.

**Invariantes que valem aqui, sem exceção:**
- **Ingestão de assets (3):** o vídeo montado é copiado para o Storage e registrado em
  `assets`. Nunca uma URL de terceiro como fonte definitiva.
- **Linhagem:** o asset final aponta para os clipes que o formaram — a mesma ideia do
  `derived_from_asset_id` do elo, para a galeria saber de onde ele veio.
- **Dinheiro (5):** **nada é gravado em `generations` nem no ledger.** Montagem não é
  geração: não chama modelo, não tem `cost_real_cents`, não cobra. *Se algum dia
  montagem passar a custar, ela vira geração e volta para a régua do dinheiro.*

**Prova:** o arquivo existe, abre, tem a duração somada das cenas (3 × 5 s = 15 s ± 1),
está em `assets` com linhagem, e **o extrato não se moveu** — `generations`,
`ledger_transactions` e saldo idênticos antes e depois.

---

### Fase 2 · O mini-player — ver sem sair do canvas

**Entrega.** Um player no **cartão de cena** do trilho e no **cartão do vídeo final**.
Play/pause, barra de progresso, mudo. **Não é editor** — é a resposta à pergunta *"ficou
bom?"* sem abrir outra aba.

**Por que junto da montagem:** montar sem poder assistir é entregar um arquivo às cegas.
E o veredito do elo — *"os clipes emendam a ponto de parecer um filme só?"* — está **NÃO
MEDIDO desde 28/08** justamente porque ver os clipes em sequência dava trabalho. **Este
player é o instrumento que falta para aquela pergunta.**

**Prova:** o player toca o clipe da cena e o vídeo final; a duração exibida bate com a do
arquivo; a aba escondida não quebra (a limitação de decodificação já é conhecida —
15/08).

---

### Fase 3 · O vídeo abrindo por baixo do modal da galeria

**Entrega.** O conserto do defeito relatado pelo dono. **Diagnóstico antes de conserto**,
e o navegador antes do diagnóstico: reproduzir, ler o DOM e o `z-index` real, e **só
então** dizer qual camada está errada. *Escrever o conserto antes de ver a medida é como
o `fitView` da Fase 4 — a causa provável não é a causa.*

**Prova:** a medida do `z-index` antes e depois, e o modal por cima em três estados
(galeria do projeto, seletor de referência, e o player da Fase 2).

---

### Fase 4 · As arestas que não desenham na carga fria

**Entrega.** O item que entrou no backlog em 02/09 com reprodução escrita: numa carga
fria do «Primeiros Testes», **19 arestas válidas desenham zero**; o `workflows.graph` tem
as 22. **Nenhum dado se perde** — o vínculo funciona, o desenho é que falta.

A hipótese está declarada como hipótese: os `handleBounds` são medidos **depois** do
render, e aresta recém-criada ou grafo grande em carga fria caem nessa janela. **A Fase 4
começa medindo isso e não presumindo.**

**Prova:** contagem de arestas no DOM × no grafo salvo, em carga fria, antes e depois —
no projeto grande, que é onde falha.

---

### Fase 5 · A Máquina vazia aponta para o Fluxo

**Entrega.** O card que hoje diz *"Nenhum roteiro ligado · Arraste um fio do bloco de
Roteiro até a entrada «Roteiro»"* passa a **oferecer o caminho pronto**: um gesto que
cria o Roteiro já ligado a esta Máquina, ao lado da instrução de arrastar.

**Por que ela existe:** o dono **não achou o «Fluxo de Storyboard» na primeira vez** e
montou à mão o que um clique fazia. O item tem seção própria e glifo próprio, e mesmo
assim não foi encontrado por quem sabia que existia. **A Máquina vazia é onde a pessoa
está olhando no instante exato em que o atalho seria útil.**

**Prova:** contagem — o gesto cria 1 node e 1 aresta, com `targetHandle = BOARD_HANDLE`,
e o estado vazio deixa de aparecer.

---

## 5. As provas pré-registradas do mini-ciclo

| # | o que prova | forma |
|---|---|---|
| 1 | o arquivo montado **existe e abre**, com a duração somada das cenas | número (duração, bytes) |
| 2 | ele está em **`assets`** com linhagem para os clipes de origem | banco |
| 3 | **zero dinheiro**: `generations`, `ledger_transactions`, `assets` de geração e saldo idênticos, com o timestamp da última linha inalterado | número |
| 4 | a ordem é a das cenas — o quadro em `t=5s` é o começo da cena 2 | número/quadro |
| 5 | o portão **não aparece habilitado** com um clipe faltando, e diz quantos faltam | texto |
| 6 | o modal da galeria fica **por cima** do vídeo, medido no `z-index` | número |
| 7 | as arestas desenham na carga fria do projeto grande — DOM = grafo salvo | número |
| 8 | a Máquina vazia cria o Roteiro ligado: +1 node, +1 aresta com o handle certo | número |

**Evidência:** `scratchpad\evidencias\video-final-fase<N>\`, um arquivo por item, com
nome que diz o que aquele arquivo prova.

---

## 6. Riscos nomeados

| risco | por que é real | o que o contém |
|---|---|---|
| **`ffmpeg` não existir no runtime da Vercel** | é a suposição que carrega a Fase 1 inteira, e ela **não foi verificada** | **a Fase 0 pergunta isso antes de qualquer código.** Se não existir: binário empacotado, WebAssembly no servidor, ou um provedor de montagem — e a escolha muda o plano, então ela é dele |
| **O `maxDuration` de 60 s** | recodificar 10 clipes pode estourar o teto da função | a Fase 0 mede com 3 e extrapola. Se estourar, montagem vira **job assíncrono** — o padrão que o vídeo já usa, sem inventar nada |
| **Clipes incompatíveis entre si** | concatenação sem recodificar exige mesmo codec, resolução e fps | a Fase 0 lê os três do banco. Modelos diferentes na mesma Máquina é o caso que quebra |
| **Montagem virar "editor"** | todo pedido razoável (cortar 2 s, trocar a ordem) empurra para lá | o §3 está escrito antes das fases de propósito. **Junta na ordem, e só** |
| **Alguém achar que montagem custa** | um portão a mais na banda dos portões parece um portão de gasto | o botão **não mostra custo**, porque não tem. Se um dia tiver, vira geração e volta para a régua do dinheiro |
| **Consertar o `z-index` sem medir** | a causa provável raramente é a causa — o `fitView` da Fase 4 é o caso recente | navegador antes de diagnóstico, diagnóstico antes de conserto |

---

## 7. Perguntas que só o Jorge responde

1. **A ordem das fases.** Proponho **0 → 1 → 2 → 3 → 4 → 5**: a montagem primeiro porque
   é o veredito, o player logo atrás porque montar sem ver é entregar às cegas. Mas a
   **Fase 5** (a Máquina apontando para o Fluxo) é *barata e mexe na porta de entrada* —
   se ela vier primeiro, o próximo percurso já começa certo. **Ela sobe?**
2. **O vídeo montado nasce como node no canvas, ou só como asset na galeria?** O veredito
   diz *"montado no canvas"*, o que sugere um **cartão de Resultado** com o filme —
   plugável, como todo resultado. Confirma?
3. **Com uma cena sem clipe, o botão fica desabilitado — ou monta o que existe?**
   Recomendo **desabilitado com a contagem**: montar 2 de 3 entrega um filme que parece
   pronto e não está.
4. **O `produto` fora do prompt** (achado da auditoria) entra aqui como Fase 6, ou vai
   para o Catálogo/backlog? Ele é a causa da cena 3 ter saído de roupa íntima, e é
   barato — mas **não é vídeo final**, e enfiá-lo aqui alarga o escopo que o §3 acabou
   de fechar.

---

## 8. O ritual

O de sempre, com uma diferença que vale escrever: **nada neste mini-ciclo gasta**, então
pela regra 8 recalibrada (31/08) **tudo aqui sela com prova estrutural + validação de
tela feita pelo Claude, e vai para produção no mesmo dia.** A metade do dono volta a ser
obrigatória no instante em que alguma fase encostar em provedor pago — e, se isso
acontecer, é sinal de que ela saiu do escopo.

- Prova em número; print só quando o número não alcança, e aí **um**.
- Evidência em `scratchpad\evidencias\`, um arquivo por item.
- `npm run lint` + `npm run typecheck`; o ESTADO reescrito **no mesmo commit**;
  `git grep -n "SAI ANTES DO COMMIT" -- src/ supabase/` vazio; **commit e push na mesma
  ação**, com `git log origin/master -1` colado no resumo.
