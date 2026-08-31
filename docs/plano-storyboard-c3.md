# Plano — Frente Storyboard · Ciclo 3: A Máquina de Storyboard

> **O que este arquivo é.** O plano do ciclo, em disco, **antes da primeira linha de
> código de produto** (regra 9 do [`CLAUDE.md`](../CLAUDE.md)). Traz a régua, o mapa,
> as fases, a prova de cada uma, o status, e as decisões — as tomadas e a que ainda
> espera.
>
> **O que ele não é.** Não é diário — o *porquê* de cada decisão vai para
> [`docs/decisoes.md`](decisoes.md) na sessão em que ela acontece. Não é especificação
> de produto: a anatomia normativa do node vai para
> [`nodes-geracao.md`](nodes-geracao.md) quando a Fase 1 fechar.
>
> **Nota de procedência.** A versão de 28/08/2026 (`93807c7`) era **inteiramente
> prospectiva**. Nesta, as **Fases 0 e 1 estão descritas a partir do que foi medido** —
> são história — e as Fases 2 a 4 continuam sendo intenção. As duas metades estão
> marcadas, porque um documento que as apresenta com a mesma cara ensina a ler intenção
> como fato. Números que a medição corrigiu ficam **com a correção escrita**, nunca
> trocados em silêncio: a régua já foi corrigida duas vezes assim (54→50 e o −2→−3 da
> Fase 4).
>
> **O que o Jorge decidiu em 28/08/2026, na conferência de `93807c7`:** régua aceita
> como instrumento; Q1–Q4 aprovadas; Fase 0 aprovada como adição; **D1, D2 e D6 sim
> como escritos**; **D3 sim com conserto obrigatório**; **D4 na alternativa** (a cena
> de continuação **não** ganha imagem); **D5 sim com companheiro**; e uma **regra que
> faltava** — o ↻ depois de aprovada e depois do vídeo —, que virou a **D7**, **fechada
> na conferência seguinte do mesmo dia**, com a recomendação.
>
> **Status do ciclo: Fases 0, 1, 2 e 3 ✅ fechadas; as sete decisões ✅ tomadas.
> A Fase 3 fechou em 31/08/2026**, com dois cliques de campo — o primeiro provando o
> teto e achando a mira, o segundo provando a mira. **Abertas: a Fase 4** (o template
> no sidebar, mais `AGENTS.md`, `README.md` e o hábito do `ESTADO.md`) **e o
> Fechamento** (a régua percorrida pelo dono e o veredito do fluxo curto).
>
> O **defeito da atualização da tela** — o lote funcionava e não se anunciava — foi
> medido e consertado em 29/08 (o contador `▶ N de M`), e os dois cliques de 31/08 o
> confirmaram em campo: as miniaturas trocaram com a aba parada. O **veredito do elo**
> saiu da lista em 28/08 como **NÃO MEDIDO com gatilho** (ciclo de voz), que não é o
> mesmo que aprovado. Duas perguntas seguem abertas, as duas com instrumento e gatilho:
> a **0.3** (aba escondida) — que os cliques de 31/08 **não** responderam, os dois
> feitos deliberadamente com a aba à frente —, e **recusa × concorrência**, que decide
> em n ≥ 30. Uma terceira
> saiu da lista em 28/08: a **alavanca de segurança** virou decisão do dono, com
> instrumento (o próximo lote real de imagens), linha de base (6/10) e portão
> pré-registrado — o porquê está em [`decisoes.md`](decisoes.md). O teto continua 4 —
> nada muda sem medida.

---

## 1. O ciclo em duas linhas

O ciclo que **rege**. O Ciclo 1 provou que dois capítulos de vídeo emendam[^elo]; o Ciclo 2
produziu as fichas que dirigem os dois. A Máquina lê essas fichas — as que já estão no
banco — e conduz os motores existentes **em lote**: gera a imagem de cada cena, deixa
o dono aprovar ou repetir cena a cena, e anima só as aprovadas.

**Ela não acrescenta capacidade.** Cada cena continua sendo uma geração normal, pelo
mesmo Route Handler, com o preço do mesmo catálogo e a mesma linha de extrato. O que
ela acrescenta é **caminho curto** — e é por isso que a régua deste ciclo não é "as
peças funcionam".

---

[^elo]: **Correção escrita, 28/08/2026 — a frase é mais forte do que a medição
    sustenta.** O que o Ciclo 1 provou é que **o elo funciona**: o último quadro vira o
    primeiro do capítulo seguinte, com linhagem, e a história atravessa. Ele **não**
    provou que a junção é imperceptível — o dono verificou em 28/08 que, sem áudio e
    sem roteiro falado, dois clipes de 5 s da mesma personagem **não deixam distinguir
    emenda de corte suave**. Essa segunda pergunta nunca foi medida e agora tem
    endereço: o **ciclo de voz**. Fica escrita em vez de trocada em silêncio, como a
    régua já foi corrigida duas vezes. Ver [`decisoes.md`](decisoes.md).

---

## 2. A RÉGUA DE PASSOS — os dois números

Desde o sinal do fundador de 17/08/2026 (*"o fluxo de criação está me parecendo
prolongado"*) a régua do produto é **quantos gestos custa chegar ao vídeo**. Então a
conta vem antes do desenho, e cada fase declara quantos passos remove.

**A regra de contagem, dita antes dos números para que eles possam ser conferidos:**
um gesto é **um clique, um arraste ou um campo preenchido**. Não contam pan, zoom,
rolagem nem olhar. O caso é sempre o mesmo: **um roteiro de 6 cenas com `@luna` já
vinculada ao projeto, 4 cenas de corte e 2 de continuação, terminando em 6 clipes.**

> ### ⚠ Correção do número publicado em `93807c7`: eram **50**, não 54
>
> A primeira versão contou **12 gestos** de imagem (uma imagem por cena) e, três
> parágrafos abaixo, animou as duas continuações pelo elo — ou seja, **pagava por seis
> imagens e usava quatro**. A inconsistência era minha e estava dentro da mesma tabela.
>
> A decisão **D4** do Jorge tornou a incoerência explícita e a régua se corrigiu junto:
> o caminho de hoje que produz **este mesmo resultado** gera **4 imagens**, não 6.
> **50 → 9**, e a correção fica escrita em vez de trocada em silêncio — um número
> aceito que muda sem dizer por quê é pior que um número errado.

### 2.1 O caminho de hoje — **50 gestos**

| bloco | gestos | detalhe |
|---|---:|---|
| **A · o roteiro** | **6** | clicar "Roteiro" na prateleira · canal · nº de cenas · `@luna` · escrever a ideia · Gerar roteiro |
| **B · as 4 imagens** | **8** | só as cenas de **corte**; por cena, a ponte da Fase 4: **▸** e **Gerar** |
| **C · os 6 vídeos** | **36** | ver abaixo |
| | **50** | |

O bloco C, aberto, porque é onde os números moram:

| cena | gestos | quais |
|---|---:|---|
| **corte** (×4) | 7 cada = **28** | "Usar no fluxo" na imagem → cartão Resultado · "Gerar Vídeo" na prateleira · arrastar o bloco · arrastar o fio do cartão até ele · abrir a ficha no Roteiro para ler ação e movimento · digitar o prompt · Gerar |
| **continuação** (×2) | 4 cada = **8** | "Continuar deste vídeo" no bloco anterior · abrir a ficha · digitar o prompt · Gerar |

**E há uma repetição a mais que não é hipótese: é medida.** No fechamento do Ciclo 2 o
mesmo prompt foi recusado e aceito com **27 segundos de diferença** — o filtro do
provedor não é função determinística do texto. Com uma recusa no lote, hoje são **51**.

### 2.2 O caminho com a Máquina — **9 gestos**

| # | gesto |
|---:|---|
| 1 | clicar **"Máquina de Storyboard"** no sidebar → Roteiro + Máquina, já conectados |
| 2–5 | canal · nº de cenas · `@luna` · escrever a ideia |
| 6 | **Gerar roteiro** |
| 7 | **Gerar as 4 imagens** — o total já está na tela: `4 × 75 = 300 ⚡ · Saldo: N ⚡` |
| 8 | **Aprovar as 4** |
| 9 | **Animar as 6** — `6 × 210 = 1.260 ⚡ · Saldo: N ⚡` |

Com a mesma recusa medida: **10** (o **↻** da cena recusada, e ela entra na aprovação
que já estava contada).

### 2.3 Os dois números, e o que cada fase remove

> ## **50 → 9**   *(com a recusa medida: 51 → 10)*

| fase | passos que remove | de onde |
|---|---:|---|
| **0** · o elo em lote, medido | **0** | fase de medição — não toca a tela |
| **1** · fundação, anatomia e trilho | **0** | é a fundação, e dizer que ela remove passos seria mentira |
| **2** · lote de imagens + aprovar/repetir | **−6** | o bloco B (8) vira dois gestos |
| **3** · lote de vídeo + continuação | **−35** | o bloco C (36) vira um gesto |
| **4** · o template no sidebar | **−3** | não sai dos 50: remove a montagem **da própria Máquina** em todo projeto novo — **medido na Fase 1**, não estimado (§8 · Fase 1) |

**A conta fecha exatamente: 50 − 6 − 35 = 9.** As fases 0 e 1 não movem o número, e
está escrito assim de propósito — uma fase que não corta passo é uma fase que precisa
justificar-se por outra coisa, e é melhor que ela diga isso em voz alta.

**E o que a régua não mede, dito junto:** cinco dos gestos de hoje são **cópia entre
duas telas** (ler a ficha, digitar o prompt do vídeo, seis vezes). É onde o erro entra
— um movimento lembrado errado é um vídeo pago errado. A Máquina não deixa a
informação passar por mão nenhuma, e isso não aparece em nenhum dos dois números.

---

## 3. O mapa — onde a Máquina encosta, e o que ela não reinventa

A Máquina é **maestro**. A lista abaixo é o inventário do que ela **rege sem tocar**,
e existe para que a primeira revisão de código tenha contra o que conferir.

| peça que já existe | a Máquina | por quê |
|---|---|---|
| `POST /api/generations/canvas` | **chama, sem mudar** | é o único caminho de imagem paga. Rota e não Server Action justamente porque N pedidos precisam sair em paralelo |
| `POST /api/generations/video` + webhook da fal | **chama, sem mudar** | vídeo é assíncrono por invariante; a linha nasce `queued` antes da chamada |
| `record_generation` / `complete_video_generation` | **fonte única de cobrança** | ganham **um parâmetro** (§7 · D1) e nada mais. O preço continua vindo do catálogo |
| `ai_model_image_prices` / `ai_model_video_prices` | **lê para somar o portão** | o total do lote é a soma do catálogo, nunca uma constante de tela |
| `lib/storyboard/scene-prompt.ts` | **chama N vezes** | função pura, escrita na Fase 4 do C2 *"porque a Máquina do Ciclo 3 vai chamá-la dez vezes"*. A dívida vence agora |
| `lib/generation/queue.ts` | **reutiliza** (§6 · Q2) | mesmo teto de 4, mesmo `structuredClone`, mesma subtração de saldo |
| `useBalance` / canal de `wallets` | **herda** | o saldo surdo foi consertado em 14/08; a Máquina não pode reinventá-lo |
| `generations:<projectId>` (Realtime) | **escuta o que já existe** | um canal por projeto, não um por cena |
| `lib/assets/last-frame.ts` + `findDerivedFrame` | **reutiliza para o elo** | a Fase 0 mediu: 1,5 MB e meio segundo por elo, e a segunda vez custa zero |
| `signWithThumbnails` / cache de URLs | **herda** | o trilho desenha miniatura; o zoom pede o original |
| `GN005` / `GN006` | **intactos** | `@` continua resolvendo no servidor, só personagem vinculada **a este projeto** |

**Uma coisa que a Máquina não faz, e que precisa estar escrita:** ela **não compila
nada**. O que ela manda para a rota é exatamente o que uma pessoa digitaria no campo —
o texto PT da ficha e a chave de ângulo. Daí para baixo o caminho é o de sempre:
tradução com cache, `mencao_sujeito`, `prompt_compiled` bilíngue, versão congelada
resolvida no servidor.

---

## 4. A anatomia do node

**Fixado pelo Jorge** (requisito 6, e o PDF *Esboço do Máquina de Storyboard* como
alvo): **horizontal**, entradas em cima, trilho no corpo, **cada cena com um conector
de saída embaixo**, plugável em qualquer node existente.

```
      ▽ roteiro        ▽ referências (personagem · produto · cenário)
┌──────────────────────────────────────────────────────────────────────────┐
│  ⚙ MÁQUINA DE STORYBOARD                                    ⧉    🗑      │  cabeçalho
├──────────────────────────────────────────────────────────────────────────┤
│  «Manhã de treino» · 6 cenas · TikTok · @luna                            │  o roteiro regido
│  modelo ▾   qualidade ▾ 2K       ⌥ Input Referências ○ desligada          │  configuração
├──────────────────────────────────────────────────────────────────────────┤
│  ┌───────┬───────┬───────┬───────┬───────┬───────┐                       │
│  │ 1  ✂  │ 2  ⇥  │ 3  ✂  │ 4  ✂  │ 5  ⇥  │ 6  ✂  │                       │
│  │ [img] │ ↳ da 1│   ⟳   │ [img] │ ↳ da 4│   ⚠   │   o trilho             │
│  │aprov. │emenda │gerando│aprov. │emenda │recusada                        │
│  │ ↻  ▶  │  ▶    │       │ ↻  ▶  │  ▶    │  ↻                             │
│  └───┬───┴───┬───┴───┬───┴───┬───┴───┬───┴───┬───┘                       │
├──────────────────────────────────────────────────────────────────────────┤
│  [ Gerar as 4 imagens ]      [ Animar as 4 aprovadas + 2 emendas ]       │  os dois portões
│  4 × 75 = 300 ⚡ · Saldo 6.550 ⚡   6 × 210 = 1.260 ⚡ · Saldo 6.550 ⚡    │  custo colado no botão
└────△───────△───────△───────△───────△───────△────────────────────────────┘
     1       2       3       4       5       6        uma saída por cena
```

**A ordem normativa da §3 de [`nodes-geracao.md`](nodes-geracao.md), adaptada — D6,
aprovada.** A anatomia da casa é *cabeçalho → configuração → chave de inputs →
**prompt** → botão → custo e saldo → resultado*. A Máquina **não tem prompt**: as
fichas são o prompt. Então a banda do prompt some, o trilho ocupa o corpo, e o par
**botão + custo logo abaixo dele** fica onde sempre esteve. O que não muda: **o custo
fala a verdade multiplicada antes do clique.**

**O que cada parte é:**

| parte | o que é |
|---|---|
| **entrada `roteiro`** (topo) | o fio que vem do node de Roteiro. É por ele que a Máquina sabe **qual** storyboard rege — §6 · Q3 |
| **entrada `referências`** (topo) | os mesmos cards de Input de sempre (Imagem · Produto · Pose · Sheet). Entram em **todas** as cenas — é a "consistência visual" do esboço: o mesmo produto em dez cenas |
| **chave "Input Referências"** | **nasce desligada**, invariante 12, sem exceção para a Máquina. Desligada, os inputs ficam conectados e visíveis, e `referencias_mudas` é gravado em cada cena |
| **modelo · qualidade** | do catálogo. Uma escolha para o lote inteiro — o preço por resolução vem de `ai_model_image_prices`, nunca de quem chama |
| **formato** | **não é escolha**: vem do `canal` do storyboard, pelos presets de `format-presets.json`. Um passo a menos, e a informação já existia |
| **o trilho** | uma coluna por cena: número, glifo de transição (✂ corte · ⇥ continuação), a miniatura **ou** a frase da emenda, o selo de estado e as ações da cena |
| **coluna de corte** | miniatura da imagem, **↻ repetir** (D3) e **✓ aprovar** |
| **coluna de continuação** | **sem imagem própria** (D4). Antes do vídeo diz **"continua da cena N"**; depois, mostra **o quadro derivado do elo** — que é o primeiro quadro de verdade dela |
| **✓ aprovar** | por cena; e **"Aprovar as N"** no portão, habilitado só quando há N imagens para aprovar |
| **▶ / △ saída** | o conector de baixo entrega a imagem aprovada da cena (ou, na continuação, o quadro do elo) a qualquer node |
| **os dois portões** | separados por requisito. O de vídeo conta **aprovadas + as continuações delas**, e só anima essas |

**Fora do escopo deste ciclo, dito aqui para não ser esquecido:** a arte da máquina
(fundo transparente, soquetes alinhados, flutuação) é **Passe de UI/UX**. Este ciclo
entrega **anatomia**, não glamour — decisão do Jorge no brief.

---

## 5. Os requisitos inegociáveis, e o que cada um decide

Transcritos do brief de 28/08/2026, com a consequência de desenho ao lado.

1. **Maestro, não motor.** Nenhum caminho novo de geração ou cobrança. → a Máquina não
   tem rota própria, não fala com provedor, não conhece preço.
2. **Recusa = cena para repetir, nunca lote perdido.** → o lote é uma **sequência de
   gerações individuais**, nunca uma transação. Falha de uma cena custa zero, não trava
   nem apaga as outras. *(A recusa de política já é linha `failed` com `0/0` em
   `generations`, provado em 26/08 — o trilho lê isso do banco.)*
3. **Portões de custo.** Total antes do clique, somado pelo catálogo; dois portões
   separados; vídeo só de cena aprovada; **saldo insuficiente recusa antes de gastar,
   dizendo quanto falta**.
4. **Trilho espelho do banco.** O estado por cena persiste no banco, não em node state.
   → §7 · D1 é a decisão que sustenta este requisito, e §7 · D2 é o limite honesto dele.
5. **Continuação em lote.** Cena de continuação só anima depois do vídeo anterior
   pronto **e** do último quadro extraído. Cenas de corte correm em paralelo dentro do
   teto de 4. → **a Fase 0 mediu e o elo fica como está** (§8 · Fase 0).
6. **Anatomia da imagem.** §4 acima. A tela é o manual: custo, estado e próximo gesto
   legíveis sem tooltip.
7. **Template no sidebar.** Roteiro + Máquina conectados e posicionados, duplicáveis e
   removíveis como qualquer node.
8. **Ritual.** Prova estrutural **e** prova ao vivo por fase; geração paga é do Jorge,
   autorizada na hora; **fase com metade da prova pendente fica aberta e sem commit**
   (regra 8); navegador anunciado antes; commit **e** push na mesma ação, com
   `git log origin/master -1` no resumo.

---

## 6. As quatro respostas — **aprovadas em 28/08/2026**

### Q1 · Edição da ficha — **uma porta só** ✅

**O Roteiro edita; a Máquina espelha e repete.** O trilho da Máquina **não tem ✎**.

Três razões, e a terceira é a que decide:

1. É a regra que a §3.3 do Ciclo 2 já fixou para a própria ficha: *"ver a ficha
   completa é o overlay, caminho único — dois caminhos para a mesma informação seriam
   duas telas para manter, duas para divergir, e nenhuma das duas sendo **a** resposta"*.
2. O editor já existe e é bom: `storyboard-scene-dialog.tsx`, com CTA por canal, a fala
   dormente e as travas do Zod. Um segundo editor seria uma segunda chance de a cena 1
   virar continuação.
3. **A Máquina e o Roteiro fazem perguntas diferentes.** O Roteiro pergunta *"o que
   acontece nesta cena?"*; a Máquina pergunta *"esta imagem serve?"*. Misturar as duas
   no mesmo trilho é o que transforma um painel de decisão num formulário.

**Com uma ponte de um clique, para que "uma porta" não vire "porta longe":** a coluna
da cena leva o nome da cena como botão — clicar **seleciona o node de Roteiro, leva a
tela até ele e abre o overlay daquela ficha**. Um editor, um clique de distância. É o
mesmo gesto que o ▸ faz no sentido contrário.

### Q2 · A fila — **reutilizar `useQueue`, com dois campos opcionais e aditivos** ✅

A fila do bloco de imagem é o único lugar do cliente que decide **quando uma requisição
paga sai**, e ela já resolve quatro coisas que a Máquina precisaria resolver de novo:

- o teto de 4 concorrentes (`MAX_CONCURRENT_IMAGES`), que conta **imagens, não cliques**;
- o `structuredClone` do pedido no instante do clique — um input editado no meio do
  lote não muda o que já foi enfileirado;
- o `pump` sem relógio e sem laço: quem termina chama o próximo;
- **`useBalance.getState().spend(...)` a cada imagem que cai** — que não é detalhe: o
  saldo surdo de 14/08 custou uma manhã, e um segundo executor que esquecesse essa
  linha o traria de volta exatamente onde há dez cobranças seguidas.

Um teto de 4 sobre 10 cenas também é a resposta certa de produto: o lote **anda visível**
em vez de disparar dez pedidos e voltar tudo junto.

**O que falta, e é aditivo:**

| campo novo em `QueueSlot` | para quê | por que não dá para viver sem |
|---|---|---|
| `tag?: string` | de quem é este slot (`cena-3`) | o slot carrega o pedido congelado; a atribuição precisa viajar **junto** dele, não num mapa paralelo que uma remontagem perde |
| `onSettled?: (slot) => void` | reler o trilho assim que um slot cai | **prontidão, não persistência** *(corrigido em 28/08)*. Quem faz o desfecho sobreviver à sessão é `generations.scene_id`, escrito pelo servidor na transação que cobra; este callback só evita esperar a volta do Realtime. Trocar os dois nomes é como se perde uma garantia sem notar |

Nenhum dos dois muda uma linha do caminho do dinheiro, e o bloco Gerar Imagem não os
usa — ele continua exatamente como está.

**A alternativa descartada — fila própria:** duas cópias do único código que decide
quando um pedido pago sai. Elas divergiriam no lugar mais caro possível, e a segunda a
divergir seria a que ninguém testa.

> **A exceção que o vídeo já tinha, e que continua valendo:** o lote de vídeo **não**
> usa esta fila. Lá a linha nasce `queued` no banco antes da chamada, e o estado vivo
> **é** o banco (decisão de 13/08). A Máquina lê `generations` e o Realtime avisa
> quando reler — nada em memória para divergir.

### Q3 · Como a Máquina recebe o storyboard — **pela aresta** ✅

Um fio do node de Roteiro (saída nova, `roteiro`) até a entrada `roteiro` da Máquina.
A Máquina lê `edge.source` → o `node_id` do Roteiro → `(project_id, node_id)` → o
storyboard. **Nenhum id no `data`, nenhuma coluna nova.**

É a decisão da Fase 4 do Ciclo 2 repetida onde ela vale de novo: *"a corrente mora na
aresta; uma segunda cópia só existiria para poder discordar da primeira"*.

**Duas consequências que precisam estar escritas:**

- **Uma Máquina por roteiro.** Duas Máquinas no mesmo storyboard disputariam o estado
  das mesmas fichas. O segundo fio é **recusado com frase** — *"este roteiro já é regido
  por uma Máquina"* —, no mesmo `notice` efêmero que já recusa fios hoje.
- **Cortar o fio não apaga nada.** As gerações continuam no banco, ligadas às cenas; a
  Máquina apenas para de reger. Religar devolve o trilho inteiro.

**Ficha que muda depois da imagem gerada → a cena fica `desatualizada`.** A comparação
lê **a diretiva gravada na geração**, e **não** o `prompt_user_pt` inteiro — essa é a
correção que a **D3** impôs, e ela está detalhada lá. A cena está desatualizada quando
`buildSceneDirective(ficha de agora)` difere de
`prompt_compiled.structure.storyboard.diretiva_pt` **ou** do `ajustes_cena` gravado.
Mesma comparação que o `matchesDirective` do store já faz para o fio vivo — **uma
conta, um lugar**.

O selo é **informativo, nunca bloqueante**. Quem decide se a mudança na ficha importa é
quem a escreveu — a tela só se recusa a fingir que não houve mudança.

### Q4 · Onde moram as imagens e os vídeos do lote — **onde sempre moraram** ✅

**Assets normais.** `record_generation` grava `generations` + `assets` como em qualquer
geração; a Galeria os lista; o cartão do projeto os conta; a miniatura e a URL estável
do mini-ciclo de Egress valem sem uma linha nova. **Nada de acervo paralelo.**

O que a Máquina acrescenta é **um ponteiro por cena, e só um**:
`storyboard_scenes.imagem_aprovada_asset_id` — *qual* imagem desta cena foi aprovada.
Todas as tentativas (inclusive as recusadas) já estão em `generations`; a aprovação é a
única coisa que é **decisão** e não fato, e por isso é a única que precisa de coluna.

> **E ela é coluna nova, não a `status` que já existe.** `storyboard_scenes.status`
> (`rascunho` · `aprovada`) é editável no overlay desde a Fase 3 do C2 e responde a
> outra pergunta: *o **texto** desta ficha foi revisado?* A da Máquina é *qual **imagem**
> desta cena foi aprovada?*. São duas perguntas, e reusar uma coluna para as duas
> faria a segunda ser lida como a primeira. É a mesma separação de 15/08: `source`
> responde quem pôs o arquivo aqui, `derived_from_asset_id` responde de onde vieram os
> pixels.

**E ela é `ON DELETE NO ACTION`** *(emenda do Jorge na conferência pós-aplicação,
28/08/2026)*. Nasceu `SET NULL`, pelo precedente de `entities.cover_asset_id` — e o
precedente era o errado: **capa é cosmético, aprovação é decisão.** Com SET NULL,
apagar o asset apagaria a aprovação sem rastro, e a pessoa descobriria no portão de
vídeo. O precedente certo é `entity_images_reject_canonical_delete`: imagem citada por
uma versão congelada não pode ser apagada.

**E `NO ACTION`, não `RESTRICT`:** RESTRICT é checado imediatamente e não pode ser
adiado, então na cascata de exclusão de conta — onde `assets` e `storyboard_scenes`
caem no mesmo `delete from auth.users` — ele abortaria a exclusão **conforme a ordem,
que não é definida**. NO ACTION espera o fim do statement, quando as duas já sumiram.
**E isso não ficou em teoria: a trava 13 exercitou o diamante, e as duas linhas
sumiram juntas.**

**"Usar no fluxo" continua existindo, e ganha um irmão:** o conector de saída da cena,
com `machine` acrescentado à lista de fontes que já tem cinco membros.

---

## 7. As decisões

Sete, **todas decididas pelo Jorge em 28/08/2026**. D1–D6 na conferência de
`93807c7`; a **D7** nasceu dessa conferência e foi fechada na seguinte, no mesmo dia.
**Nenhuma decisão deste ciclo está pendente.**

### D1 · `generations.scene_id` — a cena entra na linha da geração ✅ **SIM**

**O que decide:** requisito 1 pede *"uma linha de extrato por cena, descrição dizendo
qual cena de qual storyboard"*, e requisito 4 pede o trilho como espelho do banco.
Nenhum dos dois é possível hoje: uma geração sabe de qual **node** veio, nunca de qual
**cena**.

**Como fica:** uma coluna `scene_id` em `generations`, com FK composta
`(scene_id, user_id) → storyboard_scenes (id, user_id)` e `on delete set null
(scene_id)` — para que substituir um roteiro (que apaga as fichas) **nunca** apague
história de quem pagou o quê. Mais o parâmetro `p_scene_id` em `record_generation` e em
`submit_video_generation`, e a frase do extrato ganhando um ramo:

> `Cena 3 · «Manhã de treino»`

**Por que isto não é "caminho de cobrança novo":** é a mesma função aprendendo mais um
fato, exatamente como o Ciclo 2 fez com `p_media_kind` e `p_job_kind`. O preço continua
vindo do catálogo, a transação continua sendo uma, e **a descrição continua sendo
composta no servidor** — o navegador aponta uma linha, nunca escreve um nome.

**O que se ganha de graça:** o histórico por cena (todas as tentativas, inclusive as
recusadas), a reconciliação depois de um reload, e o estado da cena sendo **leitura**,
não memória.

**A alternativa descartada:** um `node_id` composto (`<id da máquina>#cena-3`).
Custaria zero migration e funcionaria — mas sobrecarregaria uma coluna cujo comentário
diz *"the React Flow node id"*, e deixaria o extrato sem como nomear a cena sem
**parsear uma string em SQL**.

> **Cuidado obrigatório, porque isto encosta na função do dinheiro:** a prova da Fase 1
> compara o corpo da `record_generation` no banco contra o da migration por md5 e faz o
> diff das linhas executáveis — o método da Fase 1 do Ciclo 2.

### D2 · O limite honesto do "estado no banco" ✅ **SIM**

Requisito 4 diz que o estado persiste no banco. **Ele persiste — com uma assimetria que
é da natureza dos dois motores:**

| | quem sabe que há trabalho em voo |
|---|---|
| **vídeo** | **o banco**. `submit_video_generation` grava `queued` antes de a fal ser chamada |
| **imagem** | **só o navegador**. `record_generation` grava a linha **depois** de a imagem existir |

Se a sessão morrer no meio do lote de imagens, as cenas **já concluídas** estão no
banco (com `scene_id`), e as em voo não aparecem como "gerando" — reaparecem
**prontas** se o servidor terminou, ou **sem imagem** se não. O trilho volta certo em
qualquer um dos dois casos, porque ele **lê**.

**Aceitar a assimetria, e não escrever intenção no banco.** Escrever "gerando" antes do
pedido criaria um estado que ninguém confirma — uma cena travada em "gerando" para
sempre depois de uma aba fechada. É a mesma razão pela qual o vídeo **não** herdou a
fila do cliente, vista pelo outro lado.

**O que fecha o buraco sem inventar nada:** ao montar, a Máquina lê as gerações **deste
lote** e reata o que já está ligado por `scene_id`. Uma imagem paga por um lote
interrompido reaparece na cena dela — não some, e não é paga duas vezes.

### D3 · "Repetir" com instrução — efêmera ✅ **SIM, com conserto obrigatório**

O ↻ da cena aceita uma instrução opcional (*"mais fechado no rosto"*). Ela é anexada ao
prompt **daquela tentativa** e **não** volta para a ficha — é o que mantém a Q1 de pé:
uma porta só para editar.

> #### ⚠ O conserto que o Jorge exigiu, e o defeito que ele pegou
>
> **Como estava escrito, a D3 quebrava a comparação da Q3.** A instrução ia colada no
> texto enviado, e a comparação de "desatualizada" era por **igualdade estrita** contra
> `prompt_user_pt`. Consequência: uma cena aprovada a partir de um ↻ **com instrução**
> acenderia **"desatualizada" sem a ficha ter mudado** — um selo mentindo sobre a única
> coisa que ele existe para dizer.
>
> **O conserto: diretiva e instrução viajam em campos separados** de
> `prompt_compiled.structure`, e a comparação lê **só a diretiva**:
>
> ```
> prompt_compiled.structure.storyboard = {
>   ordem:        3,
>   diretiva_pt:  "@luna aponta para o liquidificador…",   ← o que a ficha compila
>   instrucao_pt: "mais fechado no rosto"                  ← o que a pessoa dirigiu
> }                                                          (null quando não houve)
> ```
>
> **A auditoria continua inteira** — `prompt_user_pt` segue guardando o texto exato que
> foi enviado, os dois pedaços juntos, e agora dá para dizer **qual metade veio de
> onde**, que antes não dava.
>
> **Controle novo, obrigatório, na prova da Fase 2:** ↻ com instrução → aprovar →
> **o selo "desatualizada" não acende**. É um controle negativo, e é a única forma de
> provar que o conserto pegou: um selo que só acende nunca provou que sabe ficar
> apagado.

### D4 · A cena de continuação **não** ganha imagem ✅ **ALTERNATIVA, decidida pelo Jorge**

**O critério dele, e ele encerra a discussão:** *uma imagem só vale 75 ⚡ se entrar no
vídeo — e no Kling 2.1 standard, que recebe **um** `image_url`, a imagem de uma cena de
continuação não entra.* O primeiro quadro dela é o **último quadro do clipe anterior**,
pelo elo do Ciclo 1.

**Como o trilho fica:**

| momento | a coluna de uma cena `⇥` mostra |
|---|---|
| antes do vídeo | **"continua da cena N"** — sem miniatura, sem custo, sem ↻ de imagem |
| depois do vídeo | **o quadro derivado do elo**, que é o primeiro quadro de verdade dela |

**A aprovação dela é herdada:** aprovar a cena que ela emenda aprova a emenda junto —
não há segunda imagem para julgar, e pedir um clique por uma decisão que já foi tomada
seria burocracia. **O portão de vídeo conta `aprovadas + as continuações delas`**, e é
por isso que ele diz *"Animar as 4 aprovadas + 2 emendas"* em vez de um número só.

**O que isso custa e o que economiza:** num roteiro de 6 cenas com 2 continuações,
**150 ⚡ a menos** por rodada — e uma coluna que nunca promete um primeiro quadro que
não vai acontecer.

**O que a decisão amenda, e a emenda vai para o diário:** a visão da frente de
15/08/2026, item **b**, fixou que *"a espinha é uma imagem por cena"*. **Continua
valendo para as cenas de corte.** Para as de continuação, a espinha é o **quadro do
elo** — que é uma imagem por cena também, só que **derivada e grátis** em vez de gerada
e paga. A emenda é registrada em [`decisoes.md`](decisoes.md), não escondida aqui.

> **A condição de reversão, escrita pelo Jorge e já resolvida:** *"se a Fase 0 fizer a
> continuação partir da própria imagem, D4 volta como escrito"*. A Fase 0 mediu e **não
> fez** — o elo custa 1,5 MB e meio segundo, e continua sendo a partida certa. **D4 fica
> na alternativa.** A condição continua escrita porque o dia em que entrar no catálogo
> um modelo de vídeo **multi-referência** ela volta a valer.

### D5 · Duração fora do catálogo não anima ✅ **SIM, com companheiro**

`ai_model_video_prices` tem **uma linha: 5 segundos**. A ficha aceita
`duracao_segundos` de 1 a 60. Uma cena de 8 segundos **não é animável** — regra de
13/08: *"não se oferece o que não se sabe cobrar"*.

A coluna dessa cena fica fora do portão de vídeo, com a frase que ensina o conserto
(*"a duração desta cena não está no catálogo do modelo — ajuste para 5s no Roteiro"*).

> #### O companheiro, exigido pelo Jorge: a ficha nasce animável
>
> Recusar no portão conserta **tarde**. O gerador do Roteiro passa a **receber as
> durações do catálogo** e o schema que viaja ao modelo **valida contra elas** — uma
> ficha com duração que ninguém sabe cobrar deixa de nascer.
>
> **Entra na Fase 1**, e não na 3. A razão é a ordem do estrago: consertar só no portão
> deixaria **duas fases inteiras** produzindo fichas que o portão vai recusar, e o
> primeiro lote de vídeo do Jorge encontraria cenas mortas que o produto criou sozinho.
> Também é a fase certa por natureza — é o encanamento que fala com o catálogo, e ela
> não corta passo nenhum, então não desequilibra a régua.
>
> **A frase de D5 continua existindo, e é para o roteiro colado.** O modo
> `estruturar` recebe texto de fora e o modelo pode devolver qualquer duração; e uma
> ficha escrita à mão no overlay também pode. **A trava de nascimento não substitui a do
> portão** — é a doutrina das três camadas do teto de 10, aplicada à duração.

### D6 · A anatomia adapta a ordem normativa ✅ **SIM**

Descrito em §4. A banda do prompt some (as fichas **são** o prompt), o trilho ocupa o
corpo, e **botão + custo colado abaixo dele** ficam onde a invariante 12 os pôs. A §3
de `nodes-geracao.md` é normativa e recebe a Máquina no fechamento.

### D7 · O ↻ depois de aprovada e depois do vídeo ✅ **SIM, com a recomendação**

**A regra que faltava, apontada pelo Jorge na conferência de `93807c7`** — ele deu a
forma da resposta e pediu que ela fosse escrita nos dois sentidos — **e fechada por ele
no mesmo dia, na recomendação.**

**O ↻ existe em todo estágio, imagem e vídeo, e cada um é uma geração normal.** Uma cena
nunca fica trancada — nem depois de aprovada, nem depois de virar vídeo. Duas razões:

1. **A recusa não é determinística** (medido, 26/08). Trancar a cena depois do primeiro
   desfecho transformaria uma repetição de um clique em desmontar o lote.
2. É a doutrina do Ciclo 1 aplicada aqui: *"a Cena 04 ficou errada — ele volta para a
   cena 04, não para o roteiro"*. Uma etapa se refaz sem destruir o fluxo.

**E aprovar uma imagem nova tem consequência, que é a metade que o Jorge fixou:**

| o que acontece | efeito |
|---|---|
| aprovar imagem nova numa cena **que já tem vídeo** | o vídeo dela vira **`desatualizado`** |
| e as cenas `⇥` **abaixo dela** | viram `desatualizado` **em cadeia**, até o primeiro corte — o quadro de partida delas veio do vídeo velho |

**A verificação é dado, nunca rótulo — e não custa coluna nenhuma.** O vídeo guarda
`generations.params.source_asset_id`: a imagem de que ele partiu. O vídeo está
desatualizado quando esse id **não é** o `imagem_aprovada_asset_id` de agora.

**E a continuação acende sozinha**, sem propagação escrita em lugar nenhum: o quadro
derivado **carrega o clipe de origem** em `assets.derived_from_asset_id`, então o
`source_asset_id` de um vídeo de continuação aponta para um quadro que aponta para o
clipe anterior. Trocar o clipe anterior troca o quadro, e a comparação da cena de baixo
falha por conta própria. **A cadeia sai da forma do dado** — é o dividendo da coluna de
15/08 sendo cobrado três ciclos depois.

**Três coisas que a regra deliberadamente não faz:**

- **não apaga nada** — o vídeo antigo continua no acervo, na galeria e no extrato. Foi
  pago, e o que foi pago não desaparece porque alguém mudou de ideia;
- **não regera sozinha** — o portão de vídeo passa a dizer *"2 cenas desatualizadas ·
  reanimar por 420 ⚡"*, e quem clica é uma pessoa;
- **não bloqueia** — desatualizado é selo informativo, como o da ficha (Q3).

**A alternativa, dita porque o Jorge pediu os dois lados:** ↻ **não** existir depois do
vídeo. Seria mais simples — nenhuma cadeia, nenhuma propagação, nenhum selo novo — e
compraria essa simplicidade cobrando de quem menos pode pagar: a pessoa que descobriu
na cena 4 que a 2 ficou errada teria de recomeçar o lote. **Não recomendo**, e a
recomendação é a de cima.

**Onde ela entra:** a propagação e o selo de vídeo desatualizado são da **Fase 3** (é lá
que existe vídeo); o ↻ depois de aprovada é da **Fase 2**. **Nenhuma coluna nova nas
duas** — a decisão inteira é leitura de dado que já está gravado.

---

## 8. As fases

| Fase | Entrega | Passos | Status |
|---|---|---:|---|
| **0** | O elo em lote, medido antes de desenhado — **zero Spark** | 0 | ✅ **fechada — 28/08/2026** |
| **1** | Fundação: a cena entra na geração, a Máquina nasce, o trilho espelha, a ficha nasce animável | 0 | ✅ **fechada — 28/08/2026** |
| **2** | Lote de imagens com portão · aprovar e repetir por cena | **−6** | ✅ **fechada — 28/08/2026** |
| **3** | Lote de vídeo com portão · continuação em lote · o desatualizado em cadeia | **−35** | 🔵 **aberta** |
| **4** | O template no sidebar — o fluxo padrão | **−3** | 🟡 não iniciada |
| **Fech.** | O Jorge percorre o caminho do zero, com a régua ao lado | — | 🟡 não iniciada |

---

### Fase 0 · o elo em lote, medido antes de desenhado ✅ **fechada em 28/08/2026**

**Por que existiu.** O requisito 5 mandava **investigar** se a extração atual
(navegador, vídeo inteiro) serve ao lote *"sem repetir a doença do Egress"*. Custou uma
sessão, **zero Spark** e nenhuma escrita no banco — os três clipes do Ciclo 1 já
estavam no Storage.

**O veredito em uma linha: o elo não é a doença do Egress, e o portão pré-registrado não
disparou.**

| # | pergunta | resposta medida |
|---|---|---|
| **0.1** | quantos bytes custa um elo? | **~1,5 MB** — e o achado é outro: **a extração não baixa o vídeo inteiro.** Ela pede um **range da cauda**: 1.692.423 e 1.305.548 bytes de arquivos de 4,5 e 4,1 MB (37,5% e 31,9%). Cadeia de 3 ≈ **4,5 MB**, uma vez na vida |
| **0.2** | quanto tempo leva a cadeia? | **1.531 ms** para três elos (segunda rodada: 1.501 ms). Por elo: 484–538 ms, dos quais 8–13 ms de metadata |
| **0.3** | a aba escondida trava a cadeia? | 🟡 **ABERTA, com nome e dono.** Não medida — duas tentativas, as duas confundidas pelo instrumento. **Fecha na metade do Jorge na Fase 3**, e o desenho já assume o pior caso. Ver abaixo |
| **0.4** | a segunda extração custa zero? | **Sim: zero requisições** de Storage no `edge_logs` da janela da segunda rodada |

**O número que decide, e não é nenhum dos quatro.** Um clipe do Kling levou **66 s,
72 s e 91 s** nas três gerações pagas do Ciclo 1. Três continuações são **3 a 4,5
minutos** de provedor. **O elo é ~0,6% do tempo da cadeia** — quem manda no relógio é a
geração, não a extração. E contra a doença do Egress (~44 MB **por visita**, ~193
visitas, ~8,5 GB), 4,5 MB **uma vez** não é a mesma classe de custo.

**A armadilha de instrumento, registrada porque quase virou achado.** Na carga da
galeria as três requisições vieram com `Range: bytes=0-` e `content_length` igual ao
**arquivo inteiro** — 12.221.203 bytes somados. Isso é a **oferta do servidor, não o
consumo do navegador**: `preload="metadata"` pede, recebe o `moov` (~5,6 kB, medido na
Fase 0 do Egress) e cancela. Ler `content_length` como egress inflaria o número em
~2.000×. É a terceira vez neste projeto que um campo de instrumento mente por omissão,
depois do `transferSize` e do `metadata()` do sharp.

**O que ficou sem prova, dito em vez de contado — e a 0.3 fica ABERTA com nome.** Ela
não foi medida: duas tentativas, as duas confundidas. Tentativa 1: a aba começou
escondida (`visAoIniciar: hidden`) e **terminou visível** — o sucesso não é atribuível.
Tentativa 2: com amostragem de 1 em 1 segundo, a aba **nunca ficou escondida** (12
amostras, todas `visible`). É a mesma limitação registrada em 15/08: **a extensão ativa
a aba para executar qualquer script.**

> **E ela ganhou dono, data e instrumento** *(decisão do Jorge, 28/08/2026)*. **A 0.3
> fecha na metade do dono da Fase 3**, com uma **troca deliberada de aba por 30 s no
> meio da cadeia** — quem não é dirigido por extensão é o Jorge, e a mão dele **é** o
> instrumento que faltou aqui. Até lá a pergunta continua aberta e **está escrita como
> aberta**: uma pergunta sem resposta e uma respondida não podem ter a mesma aparência,
> pela mesma razão que uma etapa esperando prova não pode parecer fechada.

O que a tentativa 1 mostra assim mesmo, e é sinal real: com a aba escondida,
`loadedmetadata` levou **1.467 ms** contra **8–13 ms** visível — **110× a 180× mais
lento**, mesmo arquivo, mesmo cache. Aponta na mesma direção da medição de 15/08 (8
repetições) sem substituí-la.

**E o desenho não depende de resolver isto.** O `diagnose()` de `last-frame.ts` pergunta
a visibilidade **antes** do erro e devolve `hidden_tab`. A cadeia **pausa com causa
nomeada**, nunca gira — que é o que a decisão de 15/08 já mandava.

**Zero Spark, e a prova não é a igualdade dos números: é a data da última linha.**
`generations` 64, `ledger_transactions` 49, `assets` 58, derivados 1, saldo 6.550 ⚡ —
e a linha mais recente das três tabelas é de **28/08 às 00:24:20 UTC**, a geração paga
do fechamento da Fase 3 do Egress. **Nada foi escrito hoje.** A extração desta fase
nunca chamou `registerDerivedFrame`.

**Nota de ambiente, para a próxima fase não redescobrir:** a `localhost:3000` **recusou
execução de JS** pela extensão (permissão é por origem, porta inclusa) e a medição rodou
em **`localhost:5599`**, como a memória do projeto já mandava.

**Evidência** — quatro arquivos, sem nenhuma URL assinada:
`scratchpad\evidencias\storyboard-c3-fase0\`
`numeros-fase0.md` · `elo-baixa-a-cauda-nao-o-video-inteiro.txt` ·
`segunda-extracao-zero-requisicoes.txt` ·
`aba-escondida-inconclusivo-limite-do-instrumento.txt`

---

### Fase 1 · fundação — a cena entra na geração, a Máquina nasce, o trilho espelha

**Entrega.** A base inteira, **sem gerar nada**.

1. **A migration (D1).** `generations.scene_id` com FK composta e `on delete set null
   (scene_id)`; `storyboard_scenes` ganha `unique (id, user_id)` (para a FK) e
   `imagem_aprovada_asset_id`; `assets` ganha `unique (id, user_id)` (precedente:
   `projects_id_user_id_unique`, 11/08); `p_scene_id` em `record_generation` e em
   `submit_video_generation`; o ramo de descrição do extrato em `record_generation` e em
   `complete_video_generation`; índice em `generations (scene_id)`.
   → **arquivo escrito pelo Claude, aplicado pelo Jorge** via Session pooler.
2. **O companheiro da D5: a ficha nasce animável.** O gerador do Roteiro recebe as
   durações de `ai_model_video_prices` e o schema que viaja ao modelo valida contra
   elas.
3. **O node.** `components/nodes/machine-node.tsx` com a anatomia da §4, o cabeçalho
   padrão da casa, a entrada `roteiro`, a entrada de referências, a chave **nascendo
   desligada**, e uma saída por cena.
4. **A saída nova do Roteiro** (`roteiro`) e o ramo `storyboard → machine` no
   `onConnect`, com a recusa do segundo fio (§6 · Q3).
5. **O trilho, lendo o banco.** As fichas por `(project_id, node_id do Roteiro)`, as
   gerações por `scene_id`, o estado derivado, o Realtime do projeto avisando quando
   reler. **Nenhum botão que gaste existe ainda** — *botão sem função não entra na tela*.

**Passos removidos: 0.** É a fundação, e está escrito assim de propósito.

> ### ✅ Fechada em 28/08/2026 — as duas metades
>
> **Estrutural.** As duas migrations aplicadas (`20260828143000` e
> `20260828160000`), `database.types.ts` regerado do banco, e **as travas
> recusaram 14/14, com zero "não exercitado"** — inclusive o cruzamento entre
> donos e a cascata do diamante, que exigiram um segundo usuário de verdade.
> Mais **20/20** no companheiro da D5 e **30/30** no store da Máquina.
>
> **Ao vivo, zero Spark.** O canvas foi de 24 nodes / 18 arestas para 25 / 19 e
> voltou a 24 / 18; o trilho espelhou as 6 fichas reais (4 cortes, 2 emendas); a
> chave nasceu `checked = false`; e o segundo fio no mesmo roteiro **não criou
> aresta nenhuma** (19 antes, 19 depois), com a frase na tela. `generations` 64,
> ledger 49, saldo 6.550 — e a última linha das duas tabelas continua sendo a
> geração paga do Egress. **Veredito do dono: entendi sem explicação.**
>
> A migration nasceu com um erro que a conferência do dono pegou: a aprovação
> nascera com `ON DELETE SET NULL`, que apagaria uma decisão em silêncio. A
> segunda migration a trocou por **`NO ACTION`** — nem SET NULL, nem RESTRICT,
> pela razão registrada na **§6 · Q4** e no diário.

**Prova — as duas metades.**

*Estrutural:* a migration pelo **parser real do Postgres** (`libpg-query`) com o
verificador sabotado; as travas novas executadas dentro de `BEGIN … ROLLBACK`,
incluindo os casos que **reprovam** (uma cena de outro usuário, um asset de outro
usuário, o `set null` de uma ficha apagada preservando a linha da geração); o **md5 do
corpo de `record_generation`** no banco contra o da migration, mais o diff das linhas
executáveis dos ramos que não mudaram; e o companheiro da D5 provado **pelo caso que
reprova** — uma duração fora do catálogo recusada pelo schema, com controle positivo
nos 5 s.

*Ao vivo, zero Spark:* o node na prateleira; o fio ligando; o segundo fio recusado com
frase; o trilho desenhando as fichas reais do Ciclo 2, com as de corte e as de
continuação **desenhadas diferente** (D4); a chave **desligada** ao nascer; e a
contagem de `generations`, `ledger_transactions` e saldo **idêntica do primeiro ao
último dado**.

---

### Fase 2 · o lote de imagens, com portão — e aprovar/repetir por cena

**Entrega.**

> #### ⚠ Requisito medido na Fase 1: o portão só é **1 gesto** com defaults de verdade
>
> A régua conta o passo 7 como **um** gesto — *"Gerar as 4 imagens"*, com o total
> `4 × 75 = 300 ⚡` já na tela. Para o total existir antes do clique, a Máquina
> precisa **já saber** modelo e qualidade.
>
> **Então os dois nascem com o default do catálogo**, como o bloco Gerar Imagem
> já faz (`models.find(isDefault) ?? models[0]`), e o seletor existe para quem
> quiser trocar — nunca para quem precisa começar.
>
> **Um seletor vazio custa +2 na régua**, e são dois gestos que a Fase 4 **não
> recupera**: ela remove montagem, e escolher modelo não é montagem. Ficaria
> `50 → 11` em vez de `50 → 9`.
>
> É o mesmo motivo de eles não existirem na Fase 1: um seletor que configura
> coisa nenhuma é a promessa vazia de um botão morto com outra roupa.

- O portão: **"Gerar as N imagens"** — **N = as cenas de corte** (D4) —, com
  `N × preço(qualidade) = total ⚡ · Saldo` **antes** do clique, somado do catálogo.
- **Saldo insuficiente recusa o lote inteiro, dizendo quanto falta.** Tudo ou nada, como
  o `enqueue` já faz — meia quantidade seria a tela decidindo por quem clicou.
- A execução: `useQueue` com `tag` e `onSettled` (§6 · Q2), teto de 4, uma requisição
  por cena, **débito por imagem executada**.
- Por cena de corte: **↻ repetir** (com instrução opcional, D3) e **✓ aprovar**; no
  portão, **"Aprovar as N"**. As cenas `⇥` mostram **"continua da cena N"** e herdam a
  aprovação da cena que emendam.
- **O ↻ continua existindo depois de aprovada** (D7).
- Os selos: `rascunho · gerando · pronta · aprovada · falhou · recusada · sem saldo ·
  desatualizada · emenda`.

**Passos removidos: 6** (o bloco B, de 8 para 2).

**Prova — as duas metades.**

*Estrutural (o store e a fila rodando fora do React, como a Fase 4 do C2 fez com 49
verificações):* a soma do portão contra o catálogo em três qualidades, **contando só as
cenas de corte**; a recusa por saldo com o número que falta; o teto de 4 respeitado com
10 cenas; a atribuição `slot → cena` sobrevivendo a uma leva parcial; uma cena que falha
**não** derrubando as outras; `onSettled` escrevendo o desfecho; e a comparação de
`desatualizada` nos dois sentidos.

**Os dois controles negativos obrigatórios**, e o primeiro é o conserto da D3:

| controle | o que ele impede |
|---|---|
| **↻ com instrução → aprovar → o selo "desatualizada" NÃO acende** | o defeito que o Jorge pegou na conferência: a instrução entrando na comparação e acusando mudança onde não houve |
| ficha **não** editada → o selo não acende | um selo que só acende nunca provou que sabe ficar apagado |

*Ao vivo, zero Spark:* o portão dizendo o total antes do clique; o botão travado com o
saldo curto; "Aprovar as N" desabilitado com o trilho vazio; a coluna de continuação
sem miniatura e sem custo; contagem de banco idêntica.

*A metade do dono — **e a fase não fecha nem commita sem ela** (regra 8):* **um lote
real de imagens**, com o extrato conferido linha a linha — **uma linha por cena,
nomeando a cena** (a prova de D1 que nenhum print dá), o saldo caindo exatamente a soma
anunciada, e o veredito sobre o que nenhuma consulta responde: *o trilho mostra o
storyboard?*

---

### Fase 3 · o lote de vídeo, com portão — e a continuação em lote

**Entrega.**

- O portão: **"Animar as N aprovadas + M emendas"**, com o total do catálogo de vídeo.
  **Vídeo só de cena aprovada** (ou de continuação de uma aprovada), sem exceção.
- Cenas de **corte** animam em paralelo, dentro do teto de 4.
- Cenas de **continuação** entram na cadeia: a cena N só é submetida depois de o vídeo
  de N−1 estar pronto **e** do quadro extraído — o elo do Ciclo 1, com `findDerivedFrame`
  como passo zero. **A Fase 0 mediu o custo: 1,5 MB e meio segundo por elo.**
- **A cláusula da 0.3 aberta — a cadeia é desenhada para o pior caso** *(decisão do
  Jorge, 28/08/2026)*. A Fase 0 **não** conseguiu medir se a aba escondida trava o elo,
  então o desenho **assume que trava**: se a aba não estiver à frente quando a cadeia
  precisar de um quadro, ela **para com a causa nomeada** e a tela diz **"aguardando a
  aba voltar"** — nunca gira, nunca falha em silêncio, e retoma sozinha quando a aba
  volta. **Desenhar para o pior caso é o que permite a pergunta continuar aberta sem
  parar o ciclo:** se a medição da Fase 3 mostrar que o navegador aguenta, o produto já
  estava certo; se mostrar que trava, o produto já estava certo também.
- O estado vivo vem do **banco** (`generations` por `scene_id`, `media_kind = 'video'`)
  e o Realtime avisa. **Nenhuma fila de cliente para o vídeo.**
- Uma cena que falha ou é recusada não trava a cadeia: as de corte seguem; as de
  continuação **abaixo dela** ficam com a frase que diz o que falta.
- **O desatualizado em cadeia (D7):** aprovar imagem nova numa cena que já tem vídeo
  marca o vídeo dela e as continuações abaixo, até o primeiro corte — **por comparação
  de `params.source_asset_id`, nunca por marcação guardada**. Nada é apagado, nada é
  regerado sozinho, e o portão passa a oferecer *"reanimar N cenas"* com o custo.

**Passos removidos: 35** (o bloco C, de 36 para 1).

> #### ✅ A Fase 3 FECHOU — 31/08/2026, com dois cliques de campo
>
> **Fechada e commitada**, depois de dois cliques pagos no mesmo dia. O primeiro
> (12:15, 210 ⚡) **provou o teto e achou a mira**: uma submissão de um clique,
> mas para a cena errada. O segundo (14:49, 420 ⚡), com o conserto, **provou a
> mira**: duas submissões, as duas autorizadas, nenhuma terceira.
>
> | o que a fase precisava provar em campo | resultado |
> |---|---|
> | **teto** — um clique, N submissões para um lote de N | ✅ 1/1 e 2/2 |
> | **mira** — só as autorizadas, nunca a candidata do outro botão | ✅ cenas 5 e 2, nenhuma terceira |
> | **caminho de volta** — o webhook fechando sozinho | ✅ 78 s e 66 s, zero reconciliação à mão |
> | **cadeia** — a emenda partindo do quadro do clipe NOVO | ✅ quadro derivado 2 s antes da submissão |
> | **D7 em cascata** — a de baixo acende e **espera clique** | ✅ cena 6 acesa e parada |
>
> **A régua do dia: 630 ⚡, 3 clipes, 0 submissões acidentais** — contra 4.200 ⚡ e
> 626 submissões dois dias antes.
>
> O quadro abaixo é o estado de **29/08**, preservado como história: é o que a
> fase era depois do incidente e antes dos dois cliques.
>
> #### 🔴 Onde a Fase 3 estava — 29/08/2026, depois do incidente
>
> **A fase está ABERTA e NÃO COMMITADA**, e agora por um motivo maior do que o
> defeito de tela que abriu o dia: **um clique de 210 ⚡ produziu 626 submissões**.
> O post-mortem inteiro está em [`decisoes.md`](decisoes.md); aqui fica só o
> estado.
>
> **O que foi provado e está de pé**
>
> | prova | estado |
> |---|---|
> | o portão, com a linha que o dono fixou | ✅ |
> | estrutural: cadeia, teto, D5, D7, reanimação, 0.3 | ✅ **78/78** |
> | lote pago de imagens → vídeo, com o extrato nomeando cada cena | ✅ |
> | reconciliação manual fechando e cobrando certo | ✅ |
> | webhook pelo túnel, com as emendas voltando sozinhas | ✅ |
> | a fechadura do webhook (3 × 401, 3 causas, zero escrita) | ✅ **refeita hoje** |
> | **a trava de VIDA do endereço de retorno, nos dois sentidos** | ✅ **29/08** |
> | **o defeito da atualização — medido e consertado (A + B)** | ✅ **29/08** |
> | **R2 · o teto do motorista — simulação vermelho 200 → verde 1** | ✅ **29/08** |
>
> **O que o incidente acrescentou ao código desta fase**
>
> - **A trava de vida** (`webhookResponde` + rota + portão): uma ida à rede por
>   clique, só `401`/`405` são vida, recusa antes do primeiro Spark. Nasceu do
>   achado "presente e **morta**" — a linha de ontem sobreviveu no `.env.local`
>   apontando para um túnel derrubado, e a trava de forma não distingue os dois.
> - **A segunda linha da D4** — a coluna de uma cena `⇥` passa a mostrar o quadro
>   derivado depois do vídeo, como a decisão sempre dizia. Não é emenda: é a
>   metade que a Fase 3 não tinha entregado.
> - **O contador `▶ N de M`** no cabeçalho. O defeito da atualização era de
>   anúncio, não de propagação: **0,49% do node mudava** quando um clipe chegava.
> - **O ↻ do vídeo por cena** — a D7 dizia "o ↻ existe em todo estágio, imagem e
>   vídeo", e um clipe em dia estava trancado para sempre.
> - **R2.1 e R2.2, o teto do motorista** — o conserto do laço.
>
> ### ⛔ O que falta para fechar
>
> 1. ~~**A contagem no fal**~~ → ✅ **feita em 31/08, e ela achou outra coisa.**
>    Um clique, **uma** submissão — o teto segurou em campo. **Mas a mira errou:**
>    «Reanimar 1 cena» animou a cena **1** (candidata do lote comum) em vez da
>    cena **5** (a marcada). Consertado no mesmo dia — **R2.4**, o lote é uma
>    lista fechada — com vermelho→verde em `mira-do-lote.ts`. **Falta o clique de
>    campo do conserto.**
> 2. ~~**O estorno dos 4.200 ⚡**~~ → ✅ **aplicado pelo dono em 29/08 18:22 UTC**:
>    19 linhas `refund`, +3.990 ⚡, saldo conferido (`10.000 − 9.210 + 3.990 = 4.780`).
> 3. ~~**Os 19 clipes na galeria**~~ → ✅ **decidido: ficam.** *Entidade com
>    história financeira não se apaga.* Arquivar/ocultar virou backlog.
> 4. **D5 ao vivo**, deliberadamente fora (provada no estrutural).
> 5. ~~O veredito do elo~~ → **NÃO MEDIDO com gatilho** (ciclo de voz).
>
> **Nenhum clique pago acontece antes de** (R1 + R2): simulação verde ✅, teto
> provado ✅, e **o pior caso do próximo clique escrito e igual ao número do
> portão**.
>
> #### O que o clique de campo de 31/08 acrescentou ao código
>
> - **R2.4 · a mira** — `planoDeVideo` recebe `autorizadas` e o lote em curso vira
>   uma **lista fechada**. A pergunta mora no plano, não no motorista, porque a
>   tela lê o mesmo `situacao`: filtrar só no despacho consertaria o dinheiro e
>   deixaria a tela mentindo. Frase própria na coluna (*"fica para o próximo"*).
> - **A leitura do vídeo da cena** — `videoDaCena()`: a tentativa **viva**, senão o
>   último clipe **bom**, senão a última tentativa. Era "a última, qualquer que
>   fosse", e por isso a cena 1 — 22 clipes bons e 606 linhas mortas do incidente —
>   lia `falhou` e o portão comum se oferecia para pagá-la de novo.
> - **A quarta maneira de o endereço de retorno falhar**: o túnel caiu **no meio da
>   sessão**, com o servidor vivo. A trava recusou com `status: 530` — e é a
>   primeira vez que ela pega a morte acontecendo, e não a herdada de ontem.

**Prova — as duas metades.**

*Estrutural:* a ordem da cadeia (uma continuação nunca submetida antes do quadro
anterior existir), o paralelismo das de corte dentro do teto, a soma do portão contra o
catálogo **contando aprovadas + emendas**, a recusa da cena com duração fora do catálogo
(D5), uma falha no meio da cadeia **não** apagando nem travando as demais, e a
**propagação do desatualizado** — com o controle negativo: aprovar a **mesma** imagem de
novo não marca nada.

*Ao vivo, zero Spark:* o portão contando aprovadas e emendas separadamente; a frase da
cena que aguarda a anterior; a cena de duração inválida fora do lote com a frase que
ensina o conserto; a pausa da aba escondida com a causa nomeada.

*A metade do dono — **e a fase não fecha nem commita sem ela**:* **um lote real com pelo
menos uma continuação**, e as três leituras que fecham o ciclo: o extrato nomeando cada
cena; a imagem de partida da cena de continuação sendo **o asset derivado** do clipe
anterior (uma coluna apontando para outra, como em 15/08); e o veredito humano — *os
clipes emendam?*

> **E a metade do dono é também o instrumento da 0.3** *(fixado pelo Jorge,
> 28/08/2026)*. Ela inclui uma **troca deliberada de aba por 30 segundos no meio da
> cadeia**, com o que aconteceu registrado: o elo parou ou seguiu? a frase apareceu? a
> cadeia retomou sozinha ao voltar?
>
> **Isto resolve a 0.3 pelo único caminho que sobrou.** A extensão que dirige o
> navegador ativa a aba para executar qualquer script, então eu não consigo produzir o
> estado; **a mão do Jorge produz**. É a mesma divisão de sempre — há metades que
> nenhuma consulta responde —, aplicada desta vez não a um julgamento, mas a uma
> **condição de máquina que o meu instrumento não alcança.**

---

### Fase 4 · o template no sidebar — o fluxo padrão

**Entrega.** Um item **"Máquina de Storyboard"** no trilho lateral que, num clique,
põe no canvas **Roteiro + Máquina, conectados e posicionados**, com a tela indo até
eles. Duplicar e remover funcionam como em qualquer node, porque **são** nodes comuns —
o template é um gesto de criação, não um tipo novo.

**Passos removidos: 3** — não dos 50, e sim da montagem da própria Máquina em todo
projeto novo. É a diferença entre *"aqui estão as peças"* e *"aqui está o fluxo"*, que
é a frase do esboço do Jorge.

> **O número era 2 e virou 3 por medição, na validação ao vivo da Fase 1.** A conta
> original tinha *clicar · arrastar · ligar o fio*; a tela mostrou um quarto gesto que
> nenhuma conta previa e que é **obrigatório**: **enquadrar**. O node de Roteiro estava
> em `y = 1162` num viewport de 675 px, e as duas pontas do fio simplesmente **não cabem
> na tela juntas** — sem um `fitView` ou um zoom, o arraste não tem como começar e
> terminar. O que se remove é *clicar na prateleira · enquadrar · arrastar o fio*, menos
> o clique que o template gasta por si: **−3**.
>
> O total de 9 não muda — o caminho de 9 já pressupõe o template. O que muda é **quanto
> a Fase 4 vale**, e ela vale mais do que eu tinha escrito.

**Prova:** contagem de nodes e arestas antes e depois (**+2 nodes, +1 aresta**), a
aresta certa no grafo **salvo** (a corrente sobrevivendo ao reload), e o item na
prateleira com glifo próprio — **e o rodapé da prateleira conferido**, porque ele já
mentiu sobre si mesmo duas vezes (13/08 e 17/08).

#### E, junto com o template: a documentação para **qualquer** agente *(Jorge, 31/08/2026)*

Três arquivos, e eles não são sobre este ciclo — são sobre o repositório ser legível
por quem chegar, seja o Claude Code de amanhã ou outro agente qualquer:

| arquivo | o que é |
|---|---|
| **`AGENTS.md`** (raiz) | o mesmo conteúdo do `CLAUDE.md`, ou um ponteiro para ele. A convenção que outros agentes procuram tem outro nome, e um repositório com regras invisíveis é um repositório sem regras |
| **`README.md`** (raiz) | o **mapa do projeto**: o que é o produto, como subir, onde ficam as coisas, para onde ir a seguir |
| **`docs/ESTADO.md`** | **uma página**: o que está provado, o que está aberto, o próximo gesto. **Reescrita em toda pausa** — a regra 9 do `CLAUDE.md` passou a exigi-la em 31/08/2026 |

> **O ESTADO nasceu antes da Fase 4**, na sessão de 31/08: a regra que o exige em toda
> pausa foi escrita naquele dia, e uma regra que pede um arquivo inexistente não é
> regra. O que a Fase 4 entrega dele é o **hábito** — a reescrita virando parte do
> ritual de fechamento —, junto com os outros dois arquivos.
>
> **Por que os três juntos.** O `CLAUDE.md` diz as invariantes, o `plano-*.md` diz onde
> paramos numa frente e o `decisoes.md` diz por quê. Falta a porta de entrada: alguém
> que abre este repositório hoje não tem uma página que responda *"o que é isto e em
> que pé está"* sem ler seis arquivos. **É o checklist do projeto**, na frase do dono.

---

### Fechamento · a régua, e o veredito

1. **O Jorge percorre o caminho do zero**, num projeto novo, com a régua ao lado —
   contando os gestos de verdade contra os 9 previstos.
2. **O veredito, que nenhuma consulta dá:** o fluxo ficou curto? *Se depois da Máquina
   ele ainda parecer longo, o desenho volta à mesa* — está registrado desde 17/08 e vale
   como está escrito.
3. Docs: este arquivo (status das fases + a linha que fecha o ciclo),
   [`decisoes.md`](decisoes.md) (as entradas datadas), [`produto.md`](produto.md) (o
   roadmap) e [`nodes-geracao.md`](nodes-geracao.md) (**a anatomia da Máquina entra na §3,
   que é normativa**).
4. `npm run lint` + `npm run typecheck`, **commit e push na mesma ação**, com
   `git log origin/master -1` colado no resumo.

---

## 9. O que este ciclo **não** faz

- **Montagem final e trilha sonora.** A Máquina entrega N clipes, não um filme.
- **Voz e lipsync.** `storyboard_scenes.fala` continua dormente, e a tela continua
  dizendo isso.
- **Conexões entre projetos.** O `GN005`/`GN006` permanece.
- **Modelos novos pelo nome.** O Seedance entra como linha do catálogo quando vier.
- **A arte da máquina** (neon, flutuação, brilho por estado) — é o Passe de UI/UX.
- **Máquina de Influencers.** Compartilha o maestro futuro (15/08, item i), e não é deste ciclo.
- **Mais de 10 cenas.** O teto de 10 está em três camadas e continua.
- **Reordenar, inserir e apagar cenas pela tela.** O `unique deferrable` continua esperando.
- **Folha montada exportável (PDF).** É visão registrada (15/08, item b) e não é escopo.

---

## 9b. Backlog nomeado — fora deste ciclo

Itens que o dono nomeou durante o ciclo e que **deliberadamente não entram nele**,
registrados aqui para não voltarem como ideia nova daqui a um mês.

| item | por que fica fora |
|---|---|
| **Galeria — filtros por tipo (imagens · avatares · vídeos) e busca por nome** | A régua do ciclo é *quantos gestos até o vídeo*, e filtro de galeria não remove gesto desse caminho. Parte do trabalho é espalhar o que já existe: o modal do estúdio tem três filtros e busca, a `/galeria` não tem nenhum dos dois. |
| **Passe de UI/UX: o glifo ⇥ tem contraste fraco** | Registrado em 28/08, junto com as três arestas órfãs do grafo salvo. |
| **O «Reanimar» é tudo-ou-nada** | Achado em 31/08: uma cena desatualizada entra no lote de reanimação sozinha, e não há gesto para deixá-la de fora. É desenho da D7, não defeito — mas quem quer refazer só uma paga pelas duas. Decide-se com uso, não agora. |

---

## 9c. A ordem dos próximos ciclos — **decidida pelo Jorge em 31/08/2026**

Não é escopo deste ciclo; está aqui porque a pergunta *"e depois?"* voltava a cada
pausa, e uma ordem decidida e escrita não se rediscute.

| # | ciclo | o que ele resolve |
|---:|---|---|
| **4** | **Catálogo aberto** | provedores e modelos como **dado**: *"modelo novo = linha no catálogo + adaptador"*, começando pelos que o dono vai usar. É a invariante 2 + a 6 saindo do papel. |
| **5** | **Modo Take** | a repetição barata do que já existe, no lugar de refazer tudo. |
| **6** | **Voz e áudio** | `storyboard_scenes.fala` deixa de dormir. |
| — | **Passe de UI/UX** | a arte da máquina, o contraste do ⇥, o acabamento. |
| — | **Publicação** | o produto saindo para fora. |

**O rascunho do `docs/plano-catalogo-c4.md` sai quando o Ciclo 3 fechar — e só o
plano, nada executa** *(instrução literal do dono)*. Pela regra 9, ele volta para
conferência antes de qualquer código.

---

## 10. Riscos nomeados

| risco | por que ele é real | o que o contém |
|---|---|---|
| **Mexer em `record_generation`** | é a função do dinheiro, e serve imagem, texto e vídeo | md5 do corpo + diff das linhas executáveis dos ramos intactos |
| **Dez recusas de política num lote** | o filtro não é determinístico — medido em 26/08 | cada cena é uma geração; recusa custa zero e ganha ↻ próprio |
| **A cadeia parar com a aba escondida** | medido 8× em 15/08, e a **0.3 continua aberta** — a Fase 0 não conseguiu reproduzir | a cadeia é **desenhada para o pior caso**: para com causa nomeada, diz *"aguardando a aba voltar"* e retoma sozinha. A pergunta fecha na metade do dono da Fase 3, com uma troca de aba de 30 s |
| **Validar canvas em aba escondida** | custou uma hora em 18/08 | janela visível e em primeiro plano; `browser_batch` para manter a aba ativa |
| **O canvas ficar lento com blocos a mais** | a Fase 5 do Egress cortou 53 assinaturas para 1 | o trilho assina **em lote**, uma vez, e desenha **miniatura** |
| **O plano divergir de si mesmo** | aconteceu no plano do Egress: dois status para a mesma fase | aprovar uma decisão é editar **todo** lugar que falava dela — foi o que esta revisão fez com a régua, a anatomia, a Q3 e as fases |

---

## 11. O ritual, e o endereço da prova

- **Prova em número; print só quando o número não alcança** (regra do fundador,
  27/08/2026). O entregável de cada item é **dado**. Print entra só quando a afirmação é
  inerentemente visual, e aí **um**.
- **Toda geração paga é do Jorge**, autorizada no momento. A validação do Claude é de
  interface: **zero Spark**, com a contagem de `generations`, `ledger_transactions` e
  saldo idêntica do primeiro ao último dado.
- **Evidência fecha, commit sela.** Fase com metade da prova pendente fica **aberta e
  não commitada** — vale para as Fases 2 e 3.
- **Endereço fixo:**
  `D:\Z - Meus Projetos DevIA\Creator TKS Labs\scratchpad\evidencias\storyboard-c3-fase<N>\`,
  um arquivo por item, com nome que diz **o que aquele arquivo prova**.
- **URL assinada nunca sai do scratchpad** *(regra do Jorge, 28/08/2026)*. O repositório
  é público e a URL do Storage carrega **token na query string**. Todo arquivo de
  evidência guarda **caminho truncado e bytes**, nunca a URL — e evidência **nunca** vai
  para `docs/`. O `.gitignore` já cobre o scratchpad; esta linha existe para que ninguém
  precise descobrir o porquê depois.
- **Antes de validar:** conferir a porta, e **anunciar o navegador antes da primeira
  tentativa**. A Fase 0 aprendeu que **`localhost:3000` recusa execução de JS** pela
  extensão — a validação roda em **`localhost:5599`**.
- **Anunciar a 5599 inclui pedir a PERMISSÃO, não só a aba** *(medido na Fase 1)*. A
  permissão da extensão **morre com o grupo de abas**: fechar as abas no fim de uma
  fase — que é higiene — custa reconceder na fase seguinte. A Fase 0 mediu nesta mesma
  origem e a Fase 1 foi bloqueada nela, com a assinatura registrada em 18/08: a aba é
  navegada e **volta sozinha para `chrome://newtab/`**. O `curl` separa os dois casos em
  um segundo: 307 é o app vivo, e o problema é permissão.
- **A 5599 entra no protocolo de pausa junto com a 3000** *(regra do Jorge,
  28/08/2026)*. Ao parar para buildar ou ao encerrar, matar **as duas**: um `next dev`
  sobrevivente na 5599 é a mesma armadilha que o da 3000 — um servidor velho validando
  o que não vai ser commitado —, e agora ela tem duas portas para se esconder.
  `netstat -ano | grep -E ":(3000|5599) "` → `taskkill //PID <pid> //T //F`.
- **Migrations:** o Claude escreve o arquivo e avisa; **quem aplica é o Jorge**, pelo
  Session pooler.
- **Evidência e prova reexecutável são coisas diferentes, e moram em lugares
  diferentes** *(decidido em 28/08/2026)*. Evidência é o **retrato de uma rodada** e
  fica em `scratchpad/evidencias/`. Uma **trava de banco** responde *"isto ainda
  recusa?"* — pergunta que volta toda vez que alguém encostar na função — e por isso é
  versionada, em **`supabase/travas/`**. Roda à mão, no SQL Editor ou no psql; não é
  pgTAP e não entra em `supabase/tests/`, que implicaria um contrato de ferramenta que
  ela não tem. Sem segredo, sem URL assinada, sem nomear dado de ninguém.
