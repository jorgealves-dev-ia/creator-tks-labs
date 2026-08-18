# Plano — Frente Storyboard · Ciclo 2: O Roteiro

> **O que este arquivo é.** O plano aprovado do ciclo, em disco, com as cinco fases,
> o que cada uma entrega, a prova de cada uma e o status. Ele existe porque um plano
> que só vive na sessão morre com a sessão — e fechar tudo entre sessões é o modo
> normal de operar aqui, não exceção. A regra que o criou está no
> [`CLAUDE.md`](../CLAUDE.md#regras-para-o-claude-code), rule 9.
>
> **O que ele não é.** Não é diário: o *porquê* de cada decisão continua em
> [`docs/decisoes.md`](decisoes.md), e este arquivo aponta para lá em vez de repetir.
> Não é especificação de produto: quando o Roteiro ganhar um doc próprio de
> especificação, este continua sendo só o mapa das fases.
>
> **Nota de procedência, dita de uma vez.** As fases 0, 1 e 2 estão descritas a
> partir do que foi executado e registrado em `decisoes.md` e nos commits — é
> história, não intenção. A **Fase 3** foi transcrita do enunciado de retomada do
> Jorge de 17/08/2026 (o plano aprovado, condensado) e **conferida por ele contra o
> original no mesmo dia**, que é de onde vieram três correções: o ▸ é da Fase 4 e não
> desta (§3.3), o checklist voltou a ter os itens que a minha reconstrução tinha
> perdido (§3.5), e a ficha semeada ganhou quatro condições (§3.6). A **Fase 4** foi
> detalhada em 18/08/2026, antes da primeira linha de código dela: o que o enunciado
> do Jorge fixou está marcado como fixado, e as cinco escolhas que **eu** tomei ao
> detalhar estão reunidas na §4.10 em vez de espalhadas pelo texto — é ali que a
> conferência dele tem endereço.

---

## O ciclo em duas linhas

O ciclo que ensina o produto a **escrever** a história antes de desenhá-la. O Ciclo 1
provou que dois capítulos de vídeo emendam; este produz as fichas que dirigem os dois.

**A decisão que atravessa o ciclo inteiro, e que decide quase todas as outras: uma
ficha é dado estruturado, não texto.** Um roteiro em prosa obrigaria três motores — o
compilador de imagem, o prompt de vídeo, a voz futura — a reinterpretar o mesmo
parágrafo cada um do seu jeito. Uma ficha com `acao`, `cenario`, `enquadramento` e
`transicao` é lida igual pelos três.

---

## As duas regras herdadas, que valem em todas as fases

1. **Prova estrutural E prova ao vivo, as duas.** Firmada pelo Jorge na Fase 1 e
   válida além deste ciclo: *trava que nunca reprovou de verdade ainda não é trava*.
   Ler o catálogo do Postgres prova o que existe; executar o caso que **reprova**
   prova que a porta fecha.
2. **Toda geração paga é do Jorge, autorizada no momento — sem exceção.** A validação
   do Claude é a de interface: **zero Spark**, um print por item do checklist. Qualquer
   item que envolva geração ou dado financeiro volta para o dono.

**Endereço fixo da evidência:**
`D:\Z - Meus Projetos DevIA\Creator TKS Labs\scratchpad\evidencias\storyboard-c2-fase<N>\`,
um arquivo por item, com nome que diz **o que o print prova**.

---

## As cinco fases

| Fase | Entrega | Status |
|---|---|---|
| **0** | O modelo, escolhido por medição | ✅ fechada — 16/08/2026 |
| **1** | A fundação no banco: as fichas ganham casa, e o preço ganha trabalho | ✅ fechada — `f1e41d6` + `4d87ca1` |
| **2** | O motor: a ideia vira ficha, e a ficha tem dono | ✅ fechada — `3576f97` |
| **3** | A tela: o node de Roteiro inteiro | ✅ fechada — 17/08/2026 |
| **4** | **A ponte manual: a ficha vira bloco, por fio vivo** | ⏳ **aberta — detalhada em 18/08/2026, à espera do ok** |

---

## Fase 0 · o modelo, escolhido por medição e não por memória

**Entrega.** A escolha do modelo de texto e a receita v3, medidas fora do produto.

47 chamadas reais, dois candidatos, três versões de receita, R$ 1,34 do nosso bolso e
**zero Spark** — o probe roda fora do produto, com chave nossa.

**A prova, e o que ela decidiu:**

| | continuações corretas | custo | velocidade |
|---|---|---|---|
| `gemini-3.1-flash-lite` | 17/21 (81%) | 5× mais barato | 1,6× mais rápido |
| **`gemini-3.7-flash`** | **24/24 (100%)** | — | — |

O lite é 5× mais barato e perdeu assim mesmo. O argumento que fecha: *o roteiro é a
coisa mais barata do pipeline e dirige a mais cara.*

**As três durezas da receita v3 nasceram de defeitos medidos:** o rosto em câmera no
primeiro segundo de toda continuação (com o parágrafo do "VARIE"), a marca de tempo
explícita em toda ação, e o cenário próprio de cada cena.

**E um defeito que virou coluna, não regra.** O modelo declarou *"Condensado de 6 para
6 cenas"* sobre um roteiro que não foi condensado — e a correção não foi confiar
melhor na prosa, foi **parar de confiar nela**: nasceu `storyboards.cenas_no_original`,
e quem decide se houve condensação passou a ser a conta. **Esta é a fonte do item 8 do
checklist da Fase 3.**

→ [`decisoes.md`, 16/08/2026 — Fase 0](decisoes.md) · evidências em `storyboard-c2-fase0/`

---

## Fase 1 · as fichas ganham casa, e o preço ganha trabalho

**Entrega.** Quatro migrations, aplicadas pelo Jorge via Session pooler:

1. `media_kind += 'text'`, sozinha num arquivo (rótulo de enum não pode ser usado na
   transação que o cria).
2. `ai_model_text_prices` — a terceira irmã de image/video, com a dimensão sendo o
   **trabalho** (`roteiro` · `estruturar` · `cena`) em vez de tamanho ou duração.
   `record_generation` aprende `p_media_kind` e `p_job_kind`; **GN007 recusa trabalho
   sem preço**. Preço 15/15/5, régua da casa sobre o pior caso medido.
3. `storyboards` + `storyboard_scenes` — um storyboard por node, achado por
   `(project_id, node_id)`. **O node guarda a pergunta; o banco guarda a resposta.**
   A ficha guarda o **handle**, nunca a versão congelada. Teto de 10 em três camadas.
4. `cta_library` — catálogo curado, 17 entradas, cinco canais. É **sugestão**, não
   lista fechada; por isso `storyboard_scenes.cta_id` não tem FK.

**Regra nova da casa que nasceu aqui:** abaixo de ~20 ⚡, arredonda-se para **cima**.
No chão da régua, "ao mais próximo" zera a margem.

**A prova.** Parser real do Postgres (libpg-query) com o verificador sabotado em 6
casos mais controle; verificação lida do **catálogo** e não das migrations; teto de 10
avaliado nos casos que **reprovam** (inclusive o teto **contado**, que é coisa
diferente do CHECK de `ordem`); 14 travas executadas dentro de `BEGIN … ROLLBACK`,
14 OK; e o ramo de imagem do `record_generation` provado inalterado por md5 do corpo
no banco contra o da migration.

**A faxina que a verificação achou** (com as tabelas em zero linhas): um índice
redundante e dois `GRANT` de `anon` que faltavam revogar.

→ commits `f1e41d6` (migrations) e `4d87ca1` (types + faxina) · evidências em
`storyboard-c2-fase1/`

---

## Fase 2 · o motor, e a ordem que decide para que lado se erra

**Entrega.** O contrato (Zod + schema que viaja), a receita, o adaptador de texto
(`TextGenerationProvider`, a quinta capacidade da camada de adapters) e a rota
`POST /api/storyboards/generate`.

**A ordem de segurança é a única coisa não negociável do motor:**

> sessão → `@` resolvido **no escopo do projeto** → modelo e preço do catálogo →
> saldo → *daqui para baixo pode custar* → chamada → Zod → persistência →
> `record_generation`

Os quatro primeiros são antes de qualquer centavo: uma recusa no passo 2 não escreve
linha, não toca o ledger e não chama ninguém — **zero Spark, e não "quase zero"**.

**A persistência vem antes da cobrança**, e a escolha decide para que lado se erra:
**erra-se a favor de quem paga**, com teto de prejuízo conhecido de 15 ⚡.

**A prova.** 21 sabotagens do Zod recusadas com controle positivo; as duas faixas de
tarifa exercitadas sem esperar janeiro; 9 recusas ao vivo em duas rodadas com o banco
idêntico antes e depois até o microssegundo; e **uma geração paga com extrato
conferido linha a linha** — 15 ⚡, custo real 4c, ledger dizendo "Roteiro com @luna".

**Placar de dinheiro da fase:** 22 chamadas à rota, 21 recusas, **15 centavos**.

→ commit `3576f97` · evidências em `storyboard-c2-fase2/`

---

## Fase 3 · a tela — o node de Roteiro inteiro  ✅

**A fonte desta seção é o enunciado de retomada do Jorge de 17/08/2026**, que é o
plano aprovado condensado.

### 3.1 A anatomia do bloco

A anatomia normativa da §3 de [`nodes-geracao.md`](nodes-geracao.md), na versão do
Roteiro — duas colunas, a pergunta à esquerda e a resposta à direita:

```
┌─ cabeçalho padrão da casa (ícone · nome · duplicar · remover) ───────────────┐
│                                          │                                   │
│  CONFIGURAÇÃO                            │  TRILHO DE FICHAS                 │
│   modelo · canal                         │   título · formato · estilo       │
│   nº de cenas (stepper, travado em 10)   │   aviso de condensação            │
│   @ personagem · produto                 │                                   │
│                                          │   1 · "encara a lente e ri…"      │
│  CAMPO DE IDEIA                          │       5s · ✂ · rascunho · ✎       │
│   (ou o texto colado, no outro modo)     │   2 · "levanta a peça…"           │
│                                          │       5s · ⇥ · rascunho · ✎       │
│  [ BOTÃO ]                               │   …                               │
│  Custará 15 ⚡ · Saldo: N ⚡              │                                   │
│  aviso de ritmo, quando passa de ~45 s   │                                   │
└──────────────────────────────────────────┴───────────────────────────────────┘
```

**A ordem é normativa** (invariante 12): cabeçalho → configuração → o que se escreve →
botão → **custo e saldo** → resultado. O custo fala a verdade **antes** do clique.

### 3.2 O que cada parte é

| Parte | O que é |
|---|---|
| **cabeçalho** | O `NodeHeader` da casa, sem invenção: ícone, nome, duplicar, remover. Duplicar copia **a pergunta** e nunca a resposta — e aqui isso sai de graça, porque o node não guarda ficha nenhuma: o storyboard é achado por `(project_id, node_id)`. |
| **modelo** | Seletor do catálogo (`text_gen`). O preço de cada trabalho vem de `ai_model_text_prices`, nunca de quem chama. |
| **canal** | Os cinco do CHECK: `tiktok`, `tiktok_shop`, `reels`, `shorts`, `shopee`. Decide **qual biblioteca de CTA** entra na receita e no dropdown do overlay. |
| **nº de cenas** | Stepper **travado em 10** — o teto do banco, dito na tela antes de ser recusado no servidor. |
| **@ personagem** | Só quem trabalha **neste** projeto. Nulo é legítimo: roteiro de produto. O que viaja é o **handle**; a versão é assunto do servidor. |
| **produto** | Texto livre. A ficha guarda texto, não foto — anexar imagem é assunto do Input de Produto, na Fase 4. |
| **campo de ideia** | O que a pessoa escreve. Vazio, o botão explica em vez de recusar em silêncio. |
| **colar-e-estruturar** | O segundo modo do mesmo bloco: em vez da ideia, um roteiro pronto colado. Troca o `job` de `roteiro` para `estruturar`, e o nº de cenas some — quem conta as cenas do texto é o modelo. |
| **botão** | Um clique, um roteiro. Sob ele, no futuro do indicativo: `Custará 15 ⚡ · Saldo: N ⚡`. |
| **aviso de ritmo** | `nº de cenas × 5 s`. Acima de **~45 s**, avisa — **antes de gastar**, que é a única hora em que o aviso vale. |
| **trilho de fichas** | A resposta, lida do banco. Linha compacta: `nº · início da ação · duração · glifo ✂/⇥ · selo de status · ✎`. |
| **aviso de condensação** | Lê a **conta** (`cenas_no_original > total`), **nunca a frase do modelo**. `ajuste` entra só como ilustração de um fato já estabelecido pelo número. |
| **overlay `<dialog>`** | A ficha completa, editável. **"Regerar esta cena · 5 ⚡" só existe aqui** — nunca na lista. |
| **dropdown de CTA** | A biblioteca do canal, com o `hint` de cada entrada ensinando quando usar. Mais a opção de escrever um próprio (`cta_id` nulo). |
| **campo fala** | **Dormente**, e a tela diz isso em voz alta: editável e persistido, sem consumidor nenhum até a voz existir. |

### 3.3 Os glifos da linha compacta — e o que **não** está nela

- **✂ / ⇥** — a `transicao` da ficha: `corte` (plano novo) ou `continuacao` (começa no
  último quadro da anterior, a emenda do Ciclo 1). É a informação que decide se dois
  clipes emendam, e por isso está na linha e não escondida no overlay.
- **✎** — a **única** ação da linha: abre a ficha no overlay.

**O ▸ não entra na Fase 3, e a razão é uma regra da casa** *(correção do Jorge,
17/08/2026)*. O ▸ é a **ponte** — criar o bloco de imagem a partir da ficha — e a
ponte é a Fase 4. **Botão sem função não entra na tela:** um glifo que aparece antes
de fazer alguma coisa é uma promessa que a tela não pode cumprir, e a pessoa que o
clicou aprende que os botões daqui às vezes não fazem nada. O ▸ nasce junto com a
função dele.

E ele não vira expansor no meio-tempo: **ver a ficha completa é o overlay, caminho
único.** Dois caminhos para a mesma informação — um que expande na linha e outro que
abre em cima — seriam duas telas para manter, duas para divergir, e nenhuma das duas
sendo *a* resposta para "onde eu vejo esta cena inteira?".

### 3.4 Por que "Regerar esta cena" não pode estar na lista

É o único gesto **pago** do trilho, a 5 ⚡. Numa lista de dez linhas, dez botões de
gastar a um clique de distância transformam a rolagem num campo minado — e o gesto que
custa dinheiro passa a ser mais fácil que o gesto que só olha. Dentro do overlay ele
custa um passo a mais, e esse passo é a deliberação.

### 3.5 O checklist de prints — 12 itens, 15 arquivos

O checklist do plano aprovado, fundido com o que a reconstrução acrescentou
*(conferência do Jorge, 17/08/2026)*. Todos em
`scratchpad\evidencias\storyboard-c2-fase3\`, com nome que diz **o que o arquivo
prova** — e **zero Spark em todos**.

Três itens têm **controle negativo ou contagem de banco** junto: um aviso que só
acende nunca provou que sabe ficar apagado, e "não tocou no dinheiro" é uma contagem,
não uma imagem.

| # | Arquivo(s) | O que prova |
|---|---|---|
| 1 | `01-roteiro-na-prateleira-blocos.png` | O Roteiro na prateleira **Blocos** do trilho lateral, com **glifo próprio** — reconhecível ao lado de Gerar Imagem e Gerar Vídeo, antes de qualquer texto ser legível. |
| 2 | `02-anatomia-do-bloco-vazio.png` | O bloco recém-criado, na ordem normativa: cabeçalho → configuração → ideia → botão → custo e saldo → trilho. Nenhuma seção fora de lugar. |
| 3 | `03-stepper-travado-em-10.png` | O nº de cenas em 10 com o incremento recusado — o teto **dito na tela**, não descoberto no servidor. |
| 4 | `04-custo-e-saldo-antes-do-clique.png` | `Custará 15 ⚡ · Saldo: N ⚡` sob o botão, com o trilho vazio: o preço existe **antes** de qualquer geração. |
| 5 | `05-aviso-de-ritmo-acima-de-45s.png` <br> `05b-controle-negativo-ritmo-sem-aviso.png` | 10 cenas × 5 s = 50 s com o aviso aceso — **e o controle negativo**: um número abaixo do limite não acende nada. |
| 6 | `06-colar-e-estruturar.png` | O segundo modo: o texto colado no lugar da ideia, o nº de cenas ausente, e o botão dizendo o que vai fazer. |
| 7 | `07-arroba-nao-vinculada-aviso-e-botao-travado.png` <br> `07b-banco-intocado.txt` | Uma `@` que não trabalha neste projeto: **aviso na tela, botão travado** — e a contagem de `generations` e do ledger **idêntica antes e depois**, provando que a recusa aconteceu de graça e sem sair do navegador. |
| 8 | `08-trilho-linha-compacta-so-lapis.png` | A linha compacta com os seis campos e os glifos ✂/⇥, com **✎ como única ação** — e duas ausências que são metade do que o print prova: **sem ▸** (a ponte é Fase 4) e **sem "Regerar esta cena"** na lista. |
| 9 | `09-overlay-ficha-completa-regerar-e-fala-dormente.png` | O overlay `<dialog>` com a ficha inteira: **"Regerar esta cena · 5 ⚡" dentro dele**, e o campo fala com a frase que explica que ele está dormente. |
| 10 | `10-dropdown-cta-do-canal.png` | O dropdown de CTA aberto, com a biblioteca **do canal escolhido** e a opção de escrever um próprio. |
| 11 | `11-edicao-a-mao-edited-at-preenchido.png` <br> `11b-ledger-e-saldo-identicos.txt` | Editar uma ficha à mão **grava**, com `edited_at` preenchido no banco — e ledger e saldo **idênticos antes e depois**: editar não é gerar, e a tela não pode deixar dúvida sobre isso. |
| 12 | `12-condensacao-pela-conta.png` <br> `12b-controle-negativo-condensacao.png` | O aviso lendo `cenas_no_original > total` — **com o controle negativo**: um roteiro em que a conta não bate não acende aviso nenhum, **mesmo que a frase do modelo diga que condensou**. É o defeito da Fase 0 barrado na tela. |

### 3.6 A ficha semeada — o que ela prova e o que ela não prova

Os itens 8 a 12 precisam de fichas na tela, e a única porta de ficha no produto é uma
geração paga. A saída, **autorizada pelo Jorge em 17/08/2026 com quatro condições**, é
semear uma ficha à mão: uma linha em `storyboards` + `storyboard_scenes` escrita como o
próprio usuário (pelo RLS), sem passar por `generations` e sem tocar no ledger.

As quatro condições, e cada uma fecha um jeito de esta muleta virar mentira:

1. **A ideia prefixada `seed-validacao-`.** O dado se identifica sozinho, no banco, sem
   depender da memória de quem o criou. É a mesma doutrina de sempre: **o que
   identifica é o dado, nunca o rótulo** — e um roteiro de teste que se parece com um
   roteiro de verdade é exatamente o que ninguém quer encontrar daqui a três meses.

   *A condição nasceu como "`node_id` prefixado" e foi corrigida no mesmo dia, porque a
   primeira leitura dela levava a lugares piores que o problema.* Como o `node_id` de um
   storyboard tem de casar com o id do node no canvas, e o canvas gera uuid, prefixar o
   `node_id` exigiria **um script escrevendo à mão o `workflows.graph`** — pôr um roteiro
   automático a editar o documento que É a verdade do canvas, num grafo real de vinte
   nodes, para economizar dois cliques. A alternativa considerada em seguida — marcar o
   seed pelo **título** — é pior de outro jeito: título é rótulo, e é exatamente contra
   isso que `cenas_no_original` existe.
   
   O que ficou: **os dois nodes nascem pela interface** (uuid legítimo, e de graça isso
   exercita o caminho real de criação do bloco em vez de contorná-lo), e o prefixo mora
   em `storyboards.ideia` — dado nosso, na tabela nova, sem uma linha escrita fora dela.
2. **Contagem de `generations` e do ledger idêntica antes e depois** — do seed **e** da
   limpeza. É a prova de que a muleta não tocou em dinheiro, e ela é uma contagem
   porque "não cobrou" não é coisa que um print mostre.
3. **Apagada no fim, com a contagem provando** que sumiu. E o grafo tem prova própria:
   um retrato dos vinte nodes é tirado **antes** de qualquer coisa e outro **depois** da
   limpeza, e a diferença entre os dois tem de ser vazia — descontados os dois nodes de
   Roteiro que foram criados pela interface e apagados pela interface.
4. **Registrada aqui**, que é esta seção: **o seed prova a TELA.** Que o motor produz
   fichas de verdade foi provado na Fase 2 e volta a ser provado no fechamento desta,
   pela geração paga do Jorge — **sem exceção**. Nenhum print de ficha semeada conta
   como prova do caminho real, e o resumo da fase tem de dizer quais prints vieram do
   seed.

### 3.7 O que a Fase 3 **não** faz

- Não gera imagem nem vídeo a partir de uma ficha, e **não desenha o ▸**. Os dois são
  a Fase 4, pela regra da §3.3: botão sem função não entra na tela.
- Não reordena, não insere e não apaga cenas pela tela. O `deferrable` do unique existe
  para o Ciclo 3, e antecipar seria construir para um consumidor que ainda não existe.
- Não mexe no motor, no contrato, na receita nem no banco. Se a tela pedir mudança em
  qualquer um dos quatro, isso é **decisão registrada antes**, não conserto no caminho.

### 3.8 O que a validação de interface achou — 17/08/2026

Os 12 itens fecharam com **zero Spark**: `generations` em 59, `ledger_transactions`
em 45 e o saldo em 6.730 ⚡ do primeiro ao último print. Três achados que só a
validação produziu:

1. **A prateleira mentia sobre si mesma, pela segunda vez.** O rodapé do trilho dizia
   *"Storyboard e voz chegam nas próximas fases"* com o bloco de Roteiro desenhado três
   centímetros acima. O comentário no código já registrava que isso tinha acontecido com
   o vídeo em 13/08 — e aconteceu de novo. O rodapé encolheu para o que ainda não existe
   de verdade: **a voz**.
2. **O ▸ teria entrado por leitura minha, não por decisão.** Está registrado em §3.3
   como regra e não como detalhe, porque a lição vale além dele: *botão sem função não
   entra na tela*.
3. **Fast Refresh esvazia o store do Arsenal.** Editar um arquivo com a página aberta
   fez o `useEntitiesStore` perder a semeadura, e o seletor de personagem ficou vazio —
   parecendo um defeito do bloco. É artefato de desenvolvimento e não do produto (um
   reload devolveu tudo), mas custou uma investigação: **durante validação, editar
   código exige recarregar a página antes de acreditar no que se vê.**

### 3.9 O fechamento da fase — feito em 17/08/2026 ✅

Os 12 itens de interface fecharam com **zero Spark**, e o Jorge fez as duas gerações
pagas **pela interface**, com o extrato conferido linha a linha:

| trabalho | descrição no extrato | ⚡ | custo real |
|---|---|---|---|
| `roteiro` | "Roteiro com @luna" | 15 | 4c |
| `estruturar` | "Roteiro estruturado com @luna" | 15 | 2c |

Saldo 6.730 → 6.700. **As duas descrições diferentes** são o `case` do
`record_generation` funcionando — a Fase 2 tinha exercitado só o `roteiro`. E as
durezas da receita sobreviveram ao uso real: 6 cenas, **6 cenários distintos**, 2
continuações.

**O veredito, que nenhuma consulta dá:** *"as fichas dirigem"* — assinado pelo dono.

---

## Fase 4 · a ponte manual — a ficha vira bloco, por fio vivo  ⏳

**Detalhada em 18/08/2026, antes de qualquer código (regra 9).** O que está abaixo é
o enunciado de retomada do Jorge desenvolvido. O que **ele** fixou está marcado como
fixado; o que **eu** decidi ao detalhar está reunido na §4.10, para conferência antes
da primeira linha de código.

> **Esta fase é ENXUTA, e a restrição é decisão do dono** *(17/08/2026)*. Ela entrega a
> ponte e nada além: o ▸, o fio vivo e o "corte para assumir". **Sem expansão de
> escopo.** A razão está no sinal registrado no fechamento da Fase 3 — *o fluxo de
> criação está parecendo prolongado* —, e cada coisa a mais aqui é um passo a mais no
> fluxo que acabou de ser apontado como longo. Depois desta fase, **o Ciclo 3 (a
> Máquina) é prioridade absoluta**, à frente de qualquer capacidade nova.

**A entrega.** Uma ficha de cena vira um bloco **Gerar Imagem** no canvas, ligada à
ficha por um **fio vivo**: editar a ficha atualiza o bloco que já a recebeu — a mesma
doutrina que já rege os cards de Input (*"o fio é vivo"*).

**Manual, e a palavra é deliberada.** É a pessoa quem leva a ficha ao canvas, uma cena
de cada vez. Reger as dez de uma vez é a **Máquina do Ciclo 3**, e é ela quem vai ler
estas mesmas fichas.

### 4.1 A régua desta fase: quantos passos ela REMOVE

Desde 17/08/2026 a régua do produto é **"quantos passos até o vídeo"**. Uma fase que
acrescenta capacidade sem responder a essa pergunta está otimizando a coisa certa do
jeito errado — então a conta vem antes do desenho.

**Hoje uma ficha vira imagem em treze gestos.** Cena 3 de um roteiro de `@luna`, já
pronta no trilho:

| # | gesto | # | gesto |
|---|---|---|---|
| 1 | ✎ abre a ficha | 8 | colar a ação |
| 2 | selecionar a ação | 9 | reabrir a ficha para ler o cenário |
| 3 | copiar | 10 | digitar o cenário |
| 4 | fechar o overlay | 11 | digitar o movimento |
| 5 | clicar "Gerar Imagem" na prateleira | 12 | abrir "Ajustes de cena" |
| 6 | arrastar o bloco para onde ele cabe | 13 | traduzir `close_rosto` para "Close no rosto" e escolher |
| 7 | digitar `@` e escolher @luna na lista | — | *e então clicar em Gerar* |

**Depois da ponte, dois:** ▸ na linha, e Gerar.

E a diferença não está só no número: **cinco dos treze são cópia ou digitação entre
duas telas**, que é onde o erro entra. Um cenário lembrado errado é uma imagem paga
errada. A ponte não deixa a informação passar por mão nenhuma.

**Ela também não acrescenta passo a quem não usa Roteiro.** O ▸ só existe na linha de
uma ficha; um bloco Gerar Imagem que não é regido por ficha nenhuma continua
exatamente como hoje — mesma anatomia, mesmos campos, nenhum controle novo.

### 4.2 O gesto ▸ — o que acontece no clique

**Fixado pelo Jorge:** o ▸ nasce **agora**, na linha compacta, junto com a função — e
cria um bloco Gerar Imagem **à direita**, pré-preenchido, conectado, selecionado, com
a tela indo até ele. É o padrão do `addContinuation` (o "Continuar deste vídeo" do
Ciclo 1), aplicado a uma ficha em vez de a um último quadro.

Ele ficou fora da Fase 3 de propósito (§3.3): *um glifo que aparece antes de fazer
alguma coisa ensina que os botões daqui às vezes não fazem nada.*

Os três desfechos, decididos por **contagem** e não por memória — o mesmo desenho do
"garante o par, nunca duplica o que já existe":

| situação | o que acontece | nodes | arestas |
|---|---|---|---|
| **sem bloco** | nasce o bloco, ligado à cena, selecionado e enquadrado | **+1** | **+1** |
| **com bloco** | nada nasce: o bloco existente é **destacado**, a tela vai até ele e o ▸ diz que ele já existia | **0** | **0** |
| **bloco apagado** | a aresta órfã saiu junto com ele; o clique cai no primeiro ramo e **recria só o bloco** | **+1** | **+1** |

**O terceiro ramo não é caso especial no código, e é isso que ele prova.** Apagar o
bloco e clicar de novo devolve *um* bloco — não um segundo node de Roteiro, não uma
segunda ficha, não uma cópia do trilho. O grafo volta ao total que tinha. Quem recolhe
a aresta órfã já é o `onNodesChange` do store, que desde os cards de Input tira os fios
de um node removido.

**Como o clique sabe se já existe bloco:** pela aresta, com `source` = este node de
Roteiro e `sourceHandle` = `cena-N`. Não existe lista guardada em lugar nenhum — §4.4.

### 4.3 Campo estruturado → controle estruturado

**Fixado pelo Jorge**, e é o dividendo da decisão que atravessa o ciclo inteiro — *uma
ficha é dado estruturado, não texto*. Cada campo vai para o controle que já existe no
bloco, sem reinterpretação:

| campo da ficha | onde vai | como |
|---|---|---|
| `personagem` (handle) | `data.prompt`, na frente | `@handle` — a menção, resolvida **no servidor** |
| `acao` | `data.prompt` | a frase, em PT, como está |
| `cenario` | `data.prompt` | a frase, em PT, como está |
| `movimento` | `data.prompt` | a frase, em PT, como está |
| `enquadramento` | **`data.anguloKey`** | **atribuição direta** — mesma chave, mesmo dicionário |
| `produto` | **nada** | a tela manda conectar um Input de Produto |
| `fala` · `cta_id` / `cta_texto` · `duracao_segundos` · `transicao` | **nada** | o overlay diz por quê |

**A atribuição direta é uma decisão antiga sendo cobrada.** `ENQUADRAMENTO_KEYS` é a
§5.27 do character sheet reusada verbatim, e o comentário dela já previa esta fase:
*"a chave da ficha **é** a chave que o bloco Gerar Imagem já consome como `anguloKey`,
então a passagem é atribuição direta e não tabela de tradução."* Uma segunda lista
teria virado aqui uma função de conversão com oito casos e um `default` — e o
`default` de uma tabela de tradução é sempre por onde ela erra.

**A fórmula do prompt** *(decisão minha — §4.10, item 4)*:

```
@{handle} {acao}. {cenario}. {movimento}.
```

Pontuação normalizada (nunca dois pontos finais), partes vazias omitidas —
`movimento` pode vir string vazia e `personagem` pode ser nulo, que é o roteiro de
produto. Função **pura**: sem rede, sem relógio, sem aleatoriedade.

Duas coisas que essa ordem garante de graça, e as duas são invariantes:

- **A menção vira sujeito, e a cena dirige.** O texto **sem** a menção não fica vazio,
  então a invariante 13 cai no ramo certo: os padrões de cena do sheet **e o traje
  canônico não entram**, e `mencao_sujeito` grava no que a menção se transformou. É o
  comportamento que se quer — uma cena dirigida jamais recebe traje de banho por
  injeção do sistema.
- **A ficha não escapa do compilador.** Nada aqui traduz, resolve versão ou monta JSON.
  A ponte escreve exatamente o que uma pessoa escreveria no campo, e daí para baixo o
  caminho é o de sempre.

### 4.4 O fio vivo, e onde a corrente mora

**A corrente é a aresta, e só ela:** `storyboard --(sourceHandle: cena-3)--> generator`.
Nenhuma cópia no `data` do bloco.

Por quê: o bloco de vídeo guarda `sourceNodeId` no `data` porque precisa dizer *de qual
card* veio o still quando a mesma foto chega por dois caminhos. **Aqui essa ambiguidade
não existe** — a aresta já carrega as duas pontas *e* o número da cena —, e uma segunda
cópia só existiria para poder discordar da primeira. O grafo salvo já persiste
`sourceHandle`, então o vínculo sobrevive a um reload sem nenhuma coluna nova, sem
migration e sem campo novo no node.

**E o corte sai de graça.** Cortar o fio remove o vínculo inteiro, porque não sobrou
nada em lugar nenhum para limpar — o texto continua onde estava, no `data.prompt`. Isso
**é** o "corte para assumir": dali em diante o prompt é de quem cortou, e para de ser
regido pela ficha. É uma decisão que se vê no canvas, e é reversível religando.

**Um handle por linha do trilho** *(decisão minha — §4.10, item 3)*:
`<Handle type="source" id="cena-N">` na linha compacta, à direita. O fio sai **da
cena**, não do node. Num roteiro de dez fichas com três blocos pendurados, um fio
saindo da borda do bloco não diria qual cena rege qual imagem — e o canvas passaria a
esconder justamente a informação que ele existe para mostrar.

**A escrita, quando a ficha muda.** O `StoryboardNode` já relê o banco na montagem e a
cada tick do Realtime. Depois de cada leitura ele chama uma ação nova do store —
`syncSceneIntoBlocks` —, irmã do `syncInputInto` e pela mesma razão registrada lá: *a
regra é "o fio é vivo", e uma regra que cada componente precisa lembrar de cumprir é
uma regra que um componente vai esquecer.*

**Com uma dureza que o `syncInputInto` não precisa ter: ela só escreve se mudou.** Um
`updateNodeData` marca o canvas como sujo, e essa releitura acontece **toda vez que o
bloco monta** — sem a guarda, abrir um projeto passaria a gravá-lo. Compara-se prompt e
ângulo antes de tocar em qualquer coisa; iguais, nada acontece e o canvas continua
limpo.

**O campo travado enquanto regido** *(decisão minha — §4.10, item 1)*. Sob o prompt, a
frase fixada pelo Jorge — **"Este prompt vem da Cena N"** — e, ao lado dela, o gesto que
corta: *Assumir o prompt*. O campo é somente-leitura até alguém cortar.

A alternativa — editável, com a próxima edição da ficha por cima — é exatamente o
defeito que o "corte para assumir" existe para impedir, e mantê-la de pé daria ao
produto as duas coisas ao mesmo tempo: um gesto de assumir **e** um jeito de perder o
que se escreveu sem nunca ter usado. Um campo travado com o destravador ao lado ensina
o gesto na primeira vez que alguém tenta digitar.

**Religar devolve o comando.** Arrastar do handle da cena até o bloco cai no
`onConnect`, que reconhece o par `storyboard → generator`, lê o número da cena do
`sourceHandle` e preenche de novo — **sobrescrevendo** o texto assumido, porque é isso
que religar significa. Hoje esse fio já é aceito e não faz nada: o reconhecedor de
"anexar referência" não lista `storyboard` como fonte, então a aresta é desenhada e
nada é anexado. A fase **acrescenta** o ramo; não mexe nos que existem.

**E ele confirma quando há texto a perder** *(emenda do Jorge, 18/08/2026 — §4.10,
item 5)*. É o padrão que a Fase 3 já usa para "gerar por cima": *substituir com
confirmação, contando a perda*. Três casos, e só um deles pergunta:

| o prompt do bloco | o que acontece |
|---|---|
| vazio | sobrescreve **em silêncio** — não há nada a perder, e perguntar seria um diálogo sobre coisa nenhuma |
| igual ao que a ficha compila | sobrescreve **em silêncio** — a escrita não muda um caractere |
| não-vazio e **diferente** | **pergunta**: *"O prompt escrito à mão será substituído pelo da Cena N."* — Substituir · Cancelar |

**A pergunta acontece ANTES de a aresta existir**, e isso é o que a mantém honesta. O
fio solto vira uma **pendência efêmera** — a mesma máquina do `notice`, que vive fora
do documento salvo —, e só o *Substituir* cria a aresta e escreve. *Cancelar* descarta
a pendência e o canvas fica exatamente como estava: nenhum fio novo, nenhum caractere
perdido, nada gravado.

**Por que a confirmação é do religar e nunca do fio vivo.** Enquanto o fio existe o
campo está travado, então o prompt **não pode** divergir por mão humana — a única
divergência possível é a ficha ter mudado, que é precisamente o trabalho do fio vivo.
Se o sync perguntasse, ele perguntaria toda vez que alguém corrigisse uma ficha, e o
fio vivo viraria o questionário que o "corte para assumir" existe para não ser. O
religar é outro gesto: ali existe texto que ninguém mais rege, e ele é de quem
escreveu até que essa pessoa diga o contrário.

### 4.5 Nada abaixo muda

**Fixado pelo Jorge, e é o critério que mantém a fase enxuta.** A ponte preenche o
campo que uma pessoa preencheria à mão, e para aí:

| continua exatamente como está | por quê |
|---|---|
| o compilador (`lib/prompt/canvas.ts`) | função pura, invariante 10 — a ponte não o chama nem o altera |
| a tradução com cache | idem: o que a ponte escreve é PT, e quem traduz é quem sempre traduziu |
| `mencao_sujeito` | a menção continua sendo resolvida **no servidor** (invariante 13) |
| `prompt_compiled` | continua gravado pela rota de geração, bilíngue, por campo |
| o motor do Roteiro, o contrato, a receita | não são tocados |
| o banco | **nenhuma migration nesta fase** |
| a cobrança | a imagem custa o que o catálogo diz, debitada na execução (invariante 5) |

### 4.6 O que a tela passa a dizer

Três frases novas, e cada uma existe porque o silêncio no lugar dela seria uma
promessa falsa:

| onde | frase | por quê |
|---|---|---|
| sob o prompt do bloco regido | **"Este prompt vem da Cena N"**, com *Assumir o prompt* ao lado | fixada pelo Jorge. Sem ela, um campo que muda sozinho é indistinguível de um defeito |
| no bloco, quando a ficha tem produto | *"Esta cena tem um produto: «X». Conecte um Input de Produto para a foto entrar."* | a limitação declarada desde a migration: `produto` é texto livre, não existe foto para anexar |
| no overlay da ficha | o que **não** vai para a imagem — fala, CTA, duração e transição —, e o que cada um espera | são campos de vídeo e de voz. Um campo preenchido que não aparece na imagem parece defeito da ponte |
| no bloco, ao religar sobre texto escrito à mão | *"O prompt escrito à mão será substituído pelo da Cena N."*, com **Substituir · Cancelar** | a emenda de 18/08/2026: substituir com confirmação **contando a perda**, como a Fase 3 já faz ao gerar por cima |

### 4.7 Onde o código encosta

Nenhum arquivo do motor, nenhuma migration:

| arquivo | o que ganha |
|---|---|
| `lib/storyboard/scene-prompt.ts` **(novo)** | a função **pura** que compõe prompt PT + ângulo a partir de uma ficha. Um lugar só, porque a Máquina do Ciclo 3 vai chamá-la dez vezes |
| `lib/canvas/store.ts` | `addSceneBlock` (o ▸, com os três ramos), `syncSceneIntoBlocks` (o fio vivo, com a guarda do "só se mudou") e o ramo `storyboard → generator` no `onConnect` |
| `components/nodes/storyboard-node.tsx` | o ▸ e o handle na linha compacta; a chamada do sync depois de cada leitura |
| `components/nodes/generator-node.tsx` | a faixa "Este prompt vem da Cena N", o campo travado, *Assumir o prompt* e o aviso de produto |
| `components/nodes/storyboard-scene-dialog.tsx` | a frase do que não vai para a imagem |
| `lib/i18n/pt-BR.ts` | as frases |
| `docs/` | o fechamento da §4.9 |

### 4.8 O checklist de prova — 12 itens de interface, zero Spark

`scratchpad\evidencias\storyboard-c2-fase4\`, um arquivo por item, com nome que diz **o
que o print prova**. As fichas são as **reais**, geradas pelo Jorge no fechamento da
Fase 3 — **não há seed nesta fase**.

| # | arquivo(s) | o que prova |
|---|---|---|
| 1 | `01-glifo-na-linha-com-funcao.png` | o ▸ ao lado do ✎, com o título dizendo o que ele faz — o glifo nascendo junto com a função (§3.3) |
| 2 | `02-ramo-sem-bloco-nasce-ligado.png` <br> `02b-contagem-nodes-antes-depois.txt` | **+1 node e +1 aresta**, o bloco à direita, selecionado e enquadrado |
| 3 | `03-pre-preenchido-prompt-e-angulo.png` | `@luna` + ação + cenário + movimento no prompt, **e** o enquadramento da ficha no seletor de ângulo — a atribuição direta, visível |
| 4 | `04-este-prompt-vem-da-cena.png` | a frase sob o prompt, com o campo travado |
| 5 | `05-fio-vivo-editar-a-ficha-alcanca-o-bloco.png` | editar a ação no overlay e o prompt do bloco mudar **sem ninguém tocar no bloco** |
| 6 | `06-ramo-com-bloco-zero-e-destaca.png` <br> `06b-contagem-identica.txt` | ▸ de novo: **nada nasce**, o bloco é destacado, contagem idêntica |
| 7 | `07-corte-para-assumir.png` | cortado: o texto **fica**, a frase some, o campo destrava |
| 8 | `08-religar-confirma-antes-de-substituir.png` <br> `08b-religar-sem-perda-nao-pergunta.png` | religar sobre um prompt escrito à mão **pergunta antes**, nomeando a cena — **e o controle negativo**: sobre um prompt vazio ou idêntico ao da ficha, religar não pergunta nada e o prompt volta a ser o dela |
| 9 | `09-ramo-bloco-apagado-recria-so-ele.png` <br> `09b-contagem-nodes.txt` | apagar o bloco e clicar ▸: nasce **só** ele, e o resto do grafo fica idêntico |
| 10 | `10-produto-manda-conectar-input.png` | a ficha com produto: a frase que manda conectar, e **nenhuma foto anexada** |
| 11 | `11-overlay-diz-o-que-nao-vai-para-a-imagem.png` | fala, CTA, duração e transição com a frase que explica |
| 12 | `12-grafo-salvo-com-a-corrente.txt` | o `workflows.graph` com a aresta `storyboard → generator` e `sourceHandle: "cena-N"` — **a corrente no documento**, que é o que prova que ela sobrevive ao reload |
| — | `13-ledger-e-saldo-identicos.txt` | `generations` e `ledger_transactions` idênticos do primeiro ao último print |

**E o fechamento é do Jorge, sem exceção:** uma **imagem paga**, de uma ficha real,
gerada pelo ▸, com **"Ver prompt"** mostrando a cena compilada e a versão congelada
resolvida no servidor. É a única prova de que a ponte entregou uma *geração* e não uma
tela bonita — nenhum print de interface conta como ela.

### 4.9 O fechamento do ciclo, na mesma fase

**Fixado pelo Jorge.** A Fase 4 fecha o Ciclo 2, e o fechamento acontece **antes** do
commit:

1. **este arquivo** — Fase 4 ✅, a tabela das cinco fases e a linha que fecha o ciclo
2. **`docs/decisoes.md`** — as entradas datadas: a ponte, a corrente na aresta, o campo
   travado e a contagem de passos
3. **`docs/produto.md`** — o roadmap
4. **`docs/nodes-geracao.md`** — a anatomia do bloco Gerar Imagem ganha o estado
   **"regido por ficha"**. A §3 é normativa: um estado novo do bloco que não estiver lá
   é um estado que a próxima frente não vai saber que existe
5. `npm run lint` + `npm run typecheck`, **commit e push na mesma ação**, com
   `git log origin/master -1` colado no resumo

### 4.10 O que eu decidi ao detalhar, e você precisa conferir

Cinco escolhas que o enunciado não fixava. Se alguma estiver errada, é **agora** que
sai barato:

| # | decisão | a alternativa que descartei, e por quê |
|---|---|---|
| 1 | **campo travado** enquanto regido, com *Assumir o prompt* ao lado | editável com aviso — e a próxima edição da ficha apagaria o que a pessoa escreveu, que é o defeito que o corte existe para impedir |
| 2 | **a corrente mora só na aresta** (`sourceHandle: cena-N`) | uma cópia no `data` do bloco, que só existiria para poder discordar da aresta |
| 3 | **um handle por linha** do trilho | um handle único no node — o fio sairia da borda e não diria **qual cena** rege qual bloco |
| 4 | a fórmula `@handle {acao}. {cenario}. {movimento}.` | outra ordem, ou juntar tudo por vírgulas: esta mantém a menção como **sujeito** da frase, que é o que a invariante 13 espera |
| 5 | **religar sobrescreve** o prompt assumido — **e confirma quando há texto a perder** *(emenda do Jorge, 18/08/2026: aprovada com a emenda)* | perguntar **sempre**, inclusive no fio vivo, o que transformaria a regência num questionário; ou **nunca** perguntar, que apagaria em silêncio o que uma pessoa escreveu |

### 4.11 O que a Fase 4 **não** faz

- **Não leva as dez cenas de uma vez.** Isso é a Máquina, Ciclo 3, e é a prioridade
  seguinte.
- **Não anexa foto nenhuma.** `storyboard_scenes.produto` é texto livre porque produto
  deixou de ser entidade em 10/08/2026 e virou card de canvas — não existe linha para
  uma FK apontar. A tela manda conectar um Input de Produto em vez de fingir que
  resolve.
- **Não cria bloco de vídeo a partir da ficha.** `duracao_segundos` e `transicao`
  continuam sem consumidor: ligá-los é ciclo próprio, não um "já que estamos aqui".
- **Não reordena, insere nem apaga cenas.** Continua sendo o Ciclo 3.
- **Não mexe em motor, contrato, receita, banco, compilador ou tradução** (§4.5).

---

## O que fica para depois do ciclo

- **A voz.** `storyboard_scenes.fala` está gravada e dormente desde a Fase 1, e a tela
  declara isso. O consumidor chega numa fase futura.
- **Reordenar, inserir e apagar cenas.** O `unique deferrable` já está no banco
  esperando; quem vai usá-lo é o Ciclo 3.
- **A Máquina.** Reger as dez fichas de um roteiro de uma vez — o Ciclo 3, e **prioridade
  absoluta depois da Fase 4**. Ela não existe para acrescentar capacidade: existe para
  **comprimir o fluxo a "uma ideia e alguns cliques"**, que passou a ser o critério de
  sucesso do produto em 17/08/2026. O teste dela é o mesmo julgamento humano de hoje —
  se depois dela o fluxo ainda parecer longo, o desenho volta à mesa.
