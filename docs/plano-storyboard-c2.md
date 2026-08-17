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
> perdido (§3.5), e a ficha semeada ganhou quatro condições (§3.6). A **Fase 4** está
> no nível de mapa: ela ainda vai ser planejada em detalhe quando chegar a vez.

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
| **3** | **A tela: o node de Roteiro inteiro** | ⏳ **pendente — é esta** |
| **4** | A ponte manual: a ficha vira bloco, por fio vivo | ⏳ pendente |

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

## Fase 3 · a tela — o node de Roteiro inteiro  ⏳

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

1. **`node_id` prefixado `seed-validacao-`.** O dado se identifica sozinho, no banco,
   sem depender da memória de quem o criou. É a mesma doutrina de sempre: **o que
   identifica é o dado, nunca o rótulo** — e um roteiro de teste que se parece com um
   roteiro de verdade é exatamente o que ninguém quer encontrar daqui a três meses.
2. **Contagem de `generations` e do ledger idêntica antes e depois** — do seed **e** da
   limpeza. É a prova de que a muleta não tocou em dinheiro, e ela é uma contagem
   porque "não cobrou" não é coisa que um print mostre.
3. **Apagada no fim, com a contagem provando** que sumiu.
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

### 3.8 O fechamento da fase

Quando os 8 itens estiverem provados, o Jorge é chamado e faz, **pela interface**:

1. um roteiro pago de ponta a ponta;
2. um colar-e-estruturar;

com o extrato conferido linha a linha nos dois. Só então o commit — que, pela regra 8
do `CLAUDE.md`, é a mesma ação que o `git push`.

---

## Fase 4 · a ponte manual — a ficha vira bloco, por fio vivo  ⏳

**Nível de mapa.** O detalhe vira plano quando a Fase 3 fechar.

**A entrega.** Uma ficha de cena vira um bloco **Gerar Imagem** no canvas, ligada à
ficha por um **fio vivo**: editar a ficha atualiza o bloco que já a recebeu — a mesma
doutrina que já rege os cards de Input (*"o fio é vivo"*).

**E é aqui que o ▸ nasce**, na linha compacta do trilho, junto com a função que ele
executa. Ele ficou de fora da Fase 3 de propósito (§3.3): um glifo que aparece antes de
fazer alguma coisa ensina que os botões daqui às vezes não fazem nada.

**E o gesto que dá nome à fase: "corte para assumir".** Cortar o fio é o ato de
**assumir** o prompt: dali em diante ele é de quem cortou, e para de ser regido pela
ficha. Sem isso, um bloco ajustado à mão seria sobrescrito pela próxima edição da
ficha — e a alternativa (perguntar a cada edição) transformaria o fio vivo num
questionário. Um corte é uma decisão que se vê no canvas, e é reversível religando.

**Manual, e a palavra é deliberada.** É a pessoa quem leva a ficha ao canvas, uma
cena de cada vez. Reger as dez de uma vez é a **Máquina do Ciclo 3**, e é ela quem vai
ler estas mesmas fichas.

**A limitação já conhecida, declarada desde a migration:** a ponte **não anexa foto
nenhuma**. `storyboard_scenes.produto` é texto livre porque produto deixou de ser
entidade em 10/08/2026 e virou card de canvas — não existe linha para uma FK apontar.
A tela diz "conecte um Input de Produto" em vez de fingir que resolve.

---

## O que fica para depois do ciclo

- **A voz.** `storyboard_scenes.fala` está gravada e dormente desde a Fase 1, e a tela
  declara isso. O consumidor chega numa fase futura.
- **Reordenar, inserir e apagar cenas.** O `unique deferrable` já está no banco
  esperando; quem vai usá-lo é o Ciclo 3.
- **A Máquina.** Reger as dez fichas de um roteiro de uma vez — o Ciclo 3.
