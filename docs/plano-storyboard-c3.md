# Plano — Frente Storyboard · Ciclo 3: A Máquina de Storyboard

> **O que este arquivo é.** O plano do ciclo, em disco, **antes da primeira linha de
> código** (regra 9 do [`CLAUDE.md`](../CLAUDE.md)). Traz a régua, o mapa, as fases,
> a prova de cada uma, o status, e as decisões que precisam da palavra do Jorge
> antes de virarem código.
>
> **O que ele não é.** Não é diário — o *porquê* de cada decisão tomada continua
> indo para [`docs/decisoes.md`](decisoes.md) na sessão em que for tomada. Não é
> especificação de produto: a anatomia normativa do node vai para
> [`nodes-geracao.md`](nodes-geracao.md) quando a Fase 1 fechar.
>
> **Nota de procedência, dita de uma vez.** Este arquivo é **inteiramente
> prospectivo** — nenhuma linha dele é história. O que o **Jorge fixou** no brief
> de abertura (28/08/2026) está marcado como **fixado**; o que **eu** decidi ao
> investigar o código e detalhar está reunido em **§6 (as quatro respostas)** e em
> **§7 (as decisões que precisam da sua palavra)**, em vez de espalhado pelo texto.
> É ali que a conferência tem endereço — e é agora que corrigir sai barato.
>
> **Status do ciclo: 🟡 aguardando conferência do Jorge. Nada executa antes.**

---

## 1. O ciclo em duas linhas

O ciclo que **rege**. O Ciclo 1 provou que dois capítulos de vídeo emendam; o Ciclo 2
produziu as fichas que dirigem os dois. A Máquina lê essas fichas — as que já estão no
banco — e conduz os motores existentes **em lote**: gera a imagem de cada cena, deixa
o dono aprovar ou repetir cena a cena, e anima só as aprovadas.

**Ela não acrescenta capacidade.** Cada cena continua sendo uma geração normal, pelo
mesmo Route Handler, com o preço do mesmo catálogo e a mesma linha de extrato. O que
ela acrescenta é **caminho curto** — e é por isso que a régua deste ciclo não é "as
peças funcionam".

---

## 2. A RÉGUA DE PASSOS — os dois números

Desde o sinal do fundador de 17/08/2026 (*"o fluxo de criação está me parecendo
prolongado"*) a régua do produto é **quantos gestos custa chegar ao vídeo**. Então a
conta vem antes do desenho, e cada fase declara quantos passos remove.

**A regra de contagem, dita antes dos números para que eles possam ser conferidos:**
um gesto é **um clique, um arraste ou um campo preenchido**. Não contam pan, zoom,
rolagem nem olhar. O caso é sempre o mesmo: **um roteiro de 6 cenas com `@luna` já
vinculada ao projeto, 4 cenas de corte e 2 de continuação, terminando em 6 clipes.**

### 2.1 O caminho de hoje — **54 gestos**

| bloco | gestos | detalhe |
|---|---:|---|
| **A · o roteiro** | **6** | clicar "Roteiro" na prateleira · canal · nº de cenas · `@luna` · escrever a ideia · Gerar roteiro |
| **B · as 6 imagens** | **12** | por cena, a ponte da Fase 4: **▸** e **Gerar** |
| **C · os 6 vídeos** | **36** | ver abaixo |
| | **54** | |

O bloco C, aberto, porque é onde os números moram:

| cena | gestos | quais |
|---|---:|---|
| **corte** (×4) | 7 cada = **28** | "Usar no fluxo" na imagem → cartão Resultado · "Gerar Vídeo" na prateleira · arrastar o bloco · arrastar o fio do cartão até ele · abrir a ficha no Roteiro para ler ação e movimento · digitar o prompt · Gerar |
| **continuação** (×2) | 4 cada = **8** | "Continuar deste vídeo" no bloco anterior · abrir a ficha · digitar o prompt · Gerar |

**E há uma repetição a mais que não é hipótese: é medida.** No fechamento do Ciclo 2 o
mesmo prompt foi recusado e aceito com **27 segundos de diferença** — o filtro do
provedor não é função determinística do texto. Com uma recusa no lote, hoje são
**55**.

### 2.2 O caminho com a Máquina — **9 gestos**

| # | gesto |
|---:|---|
| 1 | clicar **"Máquina de Storyboard"** no sidebar → Roteiro + Máquina, já conectados |
| 2–5 | canal · nº de cenas · `@luna` · escrever a ideia |
| 6 | **Gerar roteiro** |
| 7 | **Gerar as 6 imagens** — o total já está na tela: `6 × 75 = 450 ⚡ · Saldo: N ⚡` |
| 8 | **Aprovar as 6** |
| 9 | **Animar as 6** — `6 × 210 = 1.260 ⚡ · Saldo: N ⚡` |

Com a mesma recusa medida: **10** (o **↻** da cena recusada, e ela entra na aprovação
que já estava contada).

### 2.3 Os dois números, e o que cada fase remove

> ## **54 → 9**   *(com a recusa medida: 55 → 10)*

| fase | passos que remove | de onde |
|---|---:|---|
| **0** · o elo em lote, medido | **0** | fase de medição — não toca a tela |
| **1** · fundação, anatomia e trilho | **0** | é a fundação, e dizer que ela remove passos seria mentira |
| **2** · lote de imagens + aprovar/repetir | **−10** | o bloco B (12) vira dois gestos |
| **3** · lote de vídeo + continuação | **−35** | o bloco C (36) vira um gesto |
| **4** · o template no sidebar | **−2** | não sai dos 54: remove a montagem **da própria Máquina** (clicar · arrastar · ligar o fio ao Roteiro) em todo projeto novo |

**A conta fecha exatamente: 54 − 10 − 35 = 9.** As fases 0 e 1 não movem o número, e
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
| `lib/assets/last-frame.ts` + `findDerivedFrame` | **reutiliza para o elo** | o passo zero já evita re-extrair |
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
│  │ [img] │ [img] │   ⟳   │ [img] │   —   │   ⚠   │   o trilho             │
│  │pronta │aprov. │gerando│aprov. │aguarda│recusada                        │
│  │ ↻  ✓  │  ▶    │       │  ▶    │ a 4   │  ↻                             │
│  └───┬───┴───┬───┴───┬───┴───┬───┴───┬───┴───┬───┘                       │
├──────────────────────────────────────────────────────────────────────────┤
│  [ Gerar as 6 imagens ]      [ Animar as 3 aprovadas ]                   │  os dois portões
│  6 × 75 = 450 ⚡ · Saldo 6.550 ⚡   3 × 210 = 630 ⚡ · Saldo 6.550 ⚡      │  custo colado no botão
└────△───────△───────△───────△───────△───────△────────────────────────────┘
     1       2       3       4       5       6        uma saída por cena
```

**A ordem normativa da §3 de [`nodes-geracao.md`](nodes-geracao.md), adaptada — e a
adaptação é decisão minha (§7 · D6).** A anatomia da casa é *cabeçalho →
configuração → chave de inputs → **prompt** → botão → custo e saldo → resultado*. A
Máquina **não tem prompt**: as fichas são o prompt. Então a banda do prompt some, o
trilho ocupa o corpo, e o par **botão + custo logo abaixo dele** fica onde sempre
esteve. O que não muda: **o custo fala a verdade multiplicada antes do clique.**

**O que cada parte é:**

| parte | o que é |
|---|---|
| **entrada `roteiro`** (topo) | o fio que vem do node de Roteiro. É por ele que a Máquina sabe **qual** storyboard rege — §6 · Q3 |
| **entrada `referências`** (topo) | os mesmos cards de Input de sempre (Imagem · Produto · Pose · Sheet). Entram em **todas** as cenas — é a "consistência visual" do esboço: o mesmo produto em dez cenas |
| **chave "Input Referências"** | **nasce desligada**, invariante 12, sem exceção para a Máquina. Desligada, os inputs ficam conectados e visíveis, e `referencias_mudas` é gravado em cada cena |
| **modelo · qualidade** | do catálogo. Uma escolha para o lote inteiro — o preço por resolução vem de `ai_model_image_prices`, nunca de quem chama |
| **formato** | **não é escolha**: vem do `canal` do storyboard, pelos presets de `format-presets.json`. Um passo a menos, e a informação já existia |
| **o trilho** | uma coluna por cena: número, glifo de transição (✂ corte · ⇥ continuação), a miniatura, o selo de estado e as ações da cena |
| **↻ repetir** | por cena, com **instrução opcional** — §7 · D3 |
| **✓ aprovar** | por cena; e **"Aprovar as N"** no portão, para o caso normal de olhar seis imagens de uma vez |
| **▶ / △ saída** | o conector de baixo entrega **a imagem aprovada daquela cena** a qualquer node — é o "cada ponto se conecta a um bloco" do esboço |
| **os dois portões** | separados por requisito. O de vídeo só conta cenas **aprovadas**, e só anima essas |

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
   teto de 4. → é a Fase 0 que decide **como** (medindo, não argumentando).
6. **Anatomia da imagem.** §4 acima. A tela é o manual: custo, estado e próximo gesto
   legíveis sem tooltip.
7. **Template no sidebar.** Roteiro + Máquina conectados e posicionados, duplicáveis e
   removíveis como qualquer node.
8. **Ritual.** Prova estrutural **e** prova ao vivo por fase; geração paga é do Jorge,
   autorizada na hora; **fase com metade da prova pendente fica aberta e sem commit**
   (regra 8); navegador anunciado antes; commit **e** push na mesma ação, com
   `git log origin/master -1` no resumo.

---

## 6. As quatro respostas

### Q1 · Edição da ficha — **uma porta só. Confirmo a recomendação da casa.**

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

### Q2 · A fila — **reutilizar `useQueue`, com dois campos opcionais e aditivos.**

Preferência forte do brief, e a investigação concorda. A fila do bloco de imagem é o
único lugar do cliente que decide **quando uma requisição paga sai**, e ela já resolve
quatro coisas que a Máquina precisaria resolver de novo:

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
| `onSettled?: (slot) => void` | escrever o desfecho da cena assim que ele existe | é o que faz o estado sobreviver à sessão. Sem ele, o único lugar que sabe que a cena 3 falhou é a memória do navegador |

Nenhum dos dois muda uma linha do caminho do dinheiro, e o bloco Gerar Imagem não os
usa — ele continua exatamente como está.

**A alternativa descartada — fila própria:** duas cópias do único código que decide
quando um pedido pago sai. Elas divergiriam no lugar mais caro possível, e a segunda a
divergir seria a que ninguém testa. É o mesmo argumento que fez a Galeria ser um *modo*
do seletor em vez de uma segunda tela.

> **A exceção que o vídeo já tinha, e que continua valendo:** o lote de vídeo **não**
> usa esta fila. Lá a linha nasce `queued` no banco antes da chamada, e o estado vivo
> **é** o banco (decisão de 13/08). A Máquina lê `generations` e o Realtime avisa
> quando reler — nada em memória para divergir.

### Q3 · Como a Máquina recebe o storyboard — **pela aresta. Ela não guarda id nenhum.**

Um fio do node de Roteiro (saída nova, `roteiro`) até a entrada `roteiro` da Máquina.
A Máquina lê `edge.source` → o `node_id` do Roteiro → `(project_id, node_id)` → o
storyboard. **Nenhum id no `data`, nenhuma coluna nova.**

É a decisão da Fase 4 do Ciclo 2 repetida onde ela vale de novo: *"a corrente mora na
aresta; uma segunda cópia só existiria para poder discordar da primeira"*. E é o padrão
que o próprio Roteiro já usa para se reencontrar depois de um reload.

**Duas consequências que precisam estar escritas:**

- **Uma Máquina por roteiro.** Duas Máquinas no mesmo storyboard disputariam o estado
  das mesmas fichas. O segundo fio é **recusado com frase** — *"este roteiro já é regido
  por uma Máquina"* —, no mesmo `notice` efêmero que já recusa fios hoje. Mesma doutrina
  do "garante o par, nunca duplica".
- **Cortar o fio não apaga nada.** As gerações continuam no banco, ligadas às cenas; a
  Máquina apenas para de reger. Religar devolve o trilho inteiro — porque ele nunca
  esteve na Máquina.

**Ficha que muda depois da imagem gerada → a cena fica `desatualizada`.** E a
comparação **não precisa de coluna nova**: `generations.prompt_user_pt` guarda o texto
PT exato que foi enviado, e `prompt_compiled.structure.ajustes_cena` guarda o ângulo.
A cena está desatualizada quando `buildSceneDirective(ficha de agora)` difere do que
está gravado na geração que produziu a imagem aprovada. É a mesma comparação que o
`matchesDirective` do store já faz para o fio vivo — **uma conta, um lugar**.

O selo é **informativo, nunca bloqueante**: a imagem aprovada continua valendo e
continua animável. Quem decide se a mudança na ficha importa é quem a escreveu — a tela
só se recusa a fingir que não houve mudança.

### Q4 · Onde moram as imagens e os vídeos do lote — **onde sempre moraram.**

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

**"Usar no fluxo" continua existindo, e ganha um irmão:** o conector de saída da cena.
Arrastar dele para um bloco entrega a imagem aprovada — o mesmo `attachResultCard` /
`wiredStill` de sempre, com `machine` acrescentado à lista de fontes que já tem cinco
membros.

---

## 7. As decisões que precisam da sua palavra

Seis. Se alguma estiver errada, **é agora que sai barato**.

### D1 · `generations.scene_id` — a cena entra na linha da geração

**O que decide:** requisito 1 pede *"uma linha de extrato por cena, descrição dizendo
qual cena de qual storyboard"*, e requisito 4 pede o trilho como espelho do banco.
Nenhum dos dois é possível hoje: uma geração sabe de qual **node** veio, nunca de qual
**cena**.

**A proposta:** uma coluna `scene_id` em `generations`, com FK composta
`(scene_id, user_id) → storyboard_scenes (id, user_id)` e `on delete set null
(scene_id)` — para que substituir um roteiro (que apaga as fichas) **nunca** apague
história de quem pagou o quê. Mais o parâmetro `p_scene_id` em `record_generation` e em
`submit_video_generation`, e a frase do extrato ganhando um ramo:

> `Cena 3 · «Manhã de treino»`

**Por que isto não é "caminho de cobrança novo":** é a mesma função aprendendo mais um
fato, exatamente como o Ciclo 2 fez com `p_media_kind` e `p_job_kind`. O preço continua
vindo do catálogo, a transação continua sendo uma, e **a descrição continua sendo
composta no servidor** — o navegador aponta uma linha, nunca escreve um nome.

**O que se ganha de graça, e é muito:** o histórico por cena (todas as tentativas,
inclusive as recusadas), a reconciliação depois de um reload, e o estado da cena sendo
**leitura**, não memória.

**A alternativa que descartei:** um `node_id` composto (`<id da máquina>#cena-3`).
Custaria zero migration e funcionaria — mas sobrecarregaria uma coluna cujo comentário
diz *"the React Flow node id"*, e deixaria o extrato sem como nomear a cena sem
**parsear uma string em SQL**. Um atalho que a primeira pessoa a ler o extrato paga.

> **Cuidado obrigatório, porque isto encosta na função do dinheiro:** a prova da Fase 1
> compara o corpo da `record_generation` no banco contra o da migration por md5 e faz o
> diff das linhas executáveis — o mesmo método da Fase 1 do Ciclo 2, que provou o ramo
> de imagem inalterado com 22 linhas antes e 22 depois.

### D2 · O limite honesto do "estado no banco" — e ele é do produto, não do desenho

Requisito 4 diz que o estado persiste no banco. **Ele persiste — com uma assimetria que
é da natureza dos dois motores, e que não posso apagar sem inventar um caminho novo:**

| | quem sabe que há trabalho em voo |
|---|---|
| **vídeo** | **o banco**. `submit_video_generation` grava `queued` antes de a fal ser chamada |
| **imagem** | **só o navegador**. `record_generation` grava a linha **depois** de a imagem existir |

Consequência: se a sessão morrer no meio do lote de imagens, as cenas **já concluídas**
estão no banco (com `scene_id`), e as em voo não aparecem como "gerando" — reaparecem
**prontas** se o servidor terminou, ou **sem imagem** se não. O trilho volta certo em
qualquer um dos dois casos, porque ele **lê**.

**A recomendação: aceitar a assimetria e não escrever intenção no banco.** Escrever
"gerando" antes do pedido criaria um estado que ninguém confirma — uma cena travada em
"gerando" para sempre depois de uma aba fechada, e uma segunda cópia da verdade
discordando do fato exatamente onde ele custa dinheiro. É a mesma razão pela qual o
vídeo **não** herdou a fila do cliente, vista pelo outro lado.

**O que fecha o buraco sem inventar nada:** ao montar, a Máquina lê as gerações **deste
lote** e reata o que já está ligado por `scene_id`. Uma imagem paga por um lote
interrompido reaparece na cena dela — não some, e não é paga duas vezes.

### D3 · "Repetir" com instrução — **efêmera, e nunca escreve na ficha**

O ↻ da cena aceita uma instrução opcional (*"mais fechado no rosto"*). Ela é **anexada
ao prompt daquela tentativa** e **não** volta para a ficha — é o que mantém a Q1 de pé:
uma porta só para editar.

Ela fica registrada onde tudo fica: `prompt_user_pt` guarda exatamente o texto que foi
enviado, então a auditoria mostra a tentativa como ela foi, sem que a ficha tenha
mudado. **O que a pessoa dirigiu numa tentativa não vira a história da cena.**

### D4 · A cena de continuação **também ganha imagem** — e a tela diz o que ela é

**O caso.** Uma cena `⇥ continuação` anima a partir do **último quadro do clipe
anterior** (o elo do Ciclo 1, fixado no requisito 5). Então a imagem gerada para ela
**não** é o primeiro quadro do vídeo dela.

**A recomendação: gerar a imagem assim mesmo**, por três razões:

1. A visão da frente (15/08, item b) fixou que **a espinha do storyboard é uma imagem
   por cena** — a folha montada é feita a partir delas.
2. Sem imagem, uma cena de continuação **não tem o que aprovar**, e o portão de vídeo
   perde justamente as cenas em que a emenda pode dar errado.
3. Trocar `⇥` por `✂` depois de gerar deixaria a cena órfã de imagem, e a pessoa
   pagaria de novo por uma coisa que o lote já poderia ter.

**E a honestidade fica na tela, não no comentário:** a coluna de uma cena de
continuação diz, sob a miniatura, **"emenda a cena N — o vídeo começa no último quadro
dela"**. Sem essa frase, a imagem promete um primeiro quadro que não vai acontecer.

**A alternativa, com o argumento dela, porque ela é boa:** não gerar imagem para cenas
de continuação economiza `75 ⚡` por cena (`150 ⚡` no caso de 6 cenas com 2
continuações) e é rigorosamente honesta — *"a imagem é a cena"* só vale quando a imagem
**é** o primeiro quadro. **Se você preferir esta, ela é barata de adotar agora e cara
depois:** ela muda o portão, o trilho e a aprovação.

### D5 · Duração fora do catálogo não anima, e a tela diz por quê

`ai_model_video_prices` tem **uma linha: 5 segundos**. A ficha tem
`duracao_segundos` (1 a 60, default 5). Uma cena de 8 segundos **não é animável** — e a
regra da casa é de 13/08: *"não se oferece o que não se sabe cobrar"*.

A coluna dessa cena fica fora do portão de vídeo, com a frase que ensina o conserto
(*"a duração desta cena não está no catálogo do modelo — ajuste para 5s no Roteiro"*).
**A ausência é a funcionalidade**, e destravar 10s continua sendo uma linha de SQL.

### D6 · A anatomia adapta a ordem normativa, porque não há prompt

Descrito em §4. A banda do prompt some (as fichas **são** o prompt), o trilho ocupa o
corpo, e **botão + custo colado abaixo dele** ficam onde a invariante 12 os pôs. Se
você preferir outra ordem, ela precisa ser decidida antes da Fase 1 — porque a §3 de
`nodes-geracao.md` é normativa e a Máquina vai entrar nela.

---

## 8. As fases

| Fase | Entrega | Passos | Status |
|---|---|---:|---|
| **0** | O elo em lote, medido antes de desenhado — **zero Spark** | 0 | 🟡 não iniciada |
| **1** | Fundação: a cena entra na geração, a Máquina nasce, o trilho espelha | 0 | 🟡 não iniciada |
| **2** | Lote de imagens com portão · aprovar e repetir por cena | **−10** | 🟡 não iniciada |
| **3** | Lote de vídeo com portão · continuação em lote | **−35** | 🟡 não iniciada |
| **4** | O template no sidebar — o fluxo padrão | **−2** | 🟡 não iniciada |
| **Fech.** | O Jorge percorre o caminho do zero, com a régua ao lado | — | 🟡 não iniciada |

---

### Fase 0 · o elo em lote, medido antes de desenhado

**Por que existe.** O requisito 5 manda **investigar** se a extração atual (navegador,
vídeo inteiro) serve ao lote *"sem repetir a doença do Egress"*. Uma fase de medição
custa uma sessão e **zero Spark** — os dois clipes do Ciclo 1 já estão no Storage —, e
o mini-ciclo de Egress acabou de provar três vezes seguidas que **o instrumento faz
parte do achado**.

**A resposta parcial que o diário já dá, e que a medição vai confirmar ou derrubar:** a
doença do Egress era **repetição de bytes de exibição** (24 imagens de 1,84 MB a cada
visita, ~193 visitas). O elo baixa **um** vídeo, **uma vez na vida** — `findDerivedFrame`
já pula a segunda. São classes diferentes de custo. *Isto é hipótese até a Fase 0
medir.*

**As perguntas, e o que cada uma decide:**

| # | pergunta | o que muda conforme a resposta |
|---|---|---|
| 0.1 | quantos **bytes** custa um elo, e quantos custa uma cadeia de 3 continuações? | se for da ordem de MB por elo e uma vez só, fica como está |
| 0.2 | quanto **tempo** leva o decode encadeado (3 vídeos em sequência, decodificador quente)? | se passar de dezenas de segundos, o portão de vídeo precisa dizer isso antes do clique |
| 0.3 | a aba escondida trava a cadeia? em que ponto exato? | decide a frase e o comportamento do lote quando alguém troca de aba no meio |
| 0.4 | a URL estável do mini-ciclo de Egress faz a **segunda** extração custar zero? | se sim, repetir uma cena de continuação é barato; se não, o passo zero é a única defesa |

**O portão pré-registrado — escrito antes de medir, que é o que o torna honesto:** se
0.1 ou 0.2 mostrarem que a cadeia de continuações é cara ou lenta o bastante para
mudar o produto, **a alternativa volta para o Jorge como decisão** (extração no
servidor foi medida em 15/08 e custava 68 MB de bundle; ela não é impossível, é cara).
**Não** será emendada no meio da Fase 3.

**Prova:** um arquivo de números por pergunta, em
`scratchpad\evidencias\storyboard-c3-fase0\`, com o instrumento nomeado e a razão de
ele poder responder aquela pergunta. Zero Spark, e a contagem de `generations` e do
ledger idêntica no começo e no fim.

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
2. **O node.** `components/nodes/machine-node.tsx` com a anatomia da §4, o cabeçalho
   padrão da casa, a entrada `roteiro`, a entrada de referências, a chave **nascendo
   desligada**, e uma saída por cena.
3. **A saída nova do Roteiro** (`roteiro`) e o ramo `storyboard → machine` no
   `onConnect`, com a recusa do segundo fio (§6 · Q3).
4. **O trilho, lendo o banco.** As fichas por `(project_id, node_id do Roteiro)`, as
   gerações por `scene_id`, o estado derivado, o Realtime do projeto avisando quando
   reler. **Nenhum botão que gaste existe ainda** — regra da casa: *botão sem função não
   entra na tela*.

**Passos removidos: 0.** É a fundação, e está escrito assim de propósito.

**Prova — as duas metades.**

*Estrutural:* a migration pelo **parser real do Postgres** (`libpg-query`) com o
verificador sabotado; as travas novas executadas dentro de `BEGIN … ROLLBACK`,
incluindo os casos que **reprovam** (uma cena de outro usuário, um asset de outro
usuário, o `set null` de uma ficha apagada preservando a linha da geração); e o **md5 do
corpo de `record_generation`** no banco contra o da migration, mais o diff das linhas
executáveis dos ramos que não mudaram.

*Ao vivo, zero Spark:* o node na prateleira; o fio ligando; o segundo fio recusado com
frase; o trilho desenhando as 6 fichas reais do Ciclo 2 com estado `rascunho`; a chave
**desligada** ao nascer; e a contagem de `generations`, `ledger_transactions` e saldo
**idêntica do primeiro ao último dado**.

---

### Fase 2 · o lote de imagens, com portão — e aprovar/repetir por cena

**Entrega.**

- O portão: **"Gerar as N imagens"**, com `N × preço(qualidade) = total ⚡ · Saldo`
  **antes** do clique, somado do catálogo.
- **Saldo insuficiente recusa o lote inteiro, dizendo quanto falta.** Tudo ou nada, como
  o `enqueue` já faz — meia quantidade seria a tela decidindo por quem clicou.
- A execução: `useQueue` com `tag` e `onSettled` (§6 · Q2), teto de 4, uma requisição
  por cena, **débito por imagem executada**.
- Por cena: **↻ repetir** (com instrução opcional, D3) e **✓ aprovar**; no portão,
  **"Aprovar as N"**, habilitado só quando há N imagens para aprovar.
- Os selos: `rascunho · gerando · pronta · aprovada · falhou · recusada · sem saldo ·
  desatualizada`.

**Passos removidos: 10** (o bloco B, de 12 para 2).

**Prova — as duas metades.**

*Estrutural (o store e a fila rodando fora do React, como a Fase 4 do C2 fez com 49
verificações):* a soma do portão contra o catálogo em três qualidades; a recusa por
saldo com o número que falta; o teto de 4 respeitado com 10 cenas; a atribuição
`slot → cena` sobrevivendo a uma leva parcial; uma cena que falha **não** derrubando as
outras; `onSettled` escrevendo o desfecho; e a comparação de `desatualizada` nos dois
sentidos — **inclusive o controle negativo**, uma ficha que não mudou e não acende nada.

*Ao vivo, zero Spark:* o portão dizendo o total antes do clique; o botão travado com o
saldo curto; "Aprovar as N" desabilitado com o trilho vazio; contagem de banco idêntica.

*A metade do dono — **e a fase não fecha nem commita sem ela** (regra 8):* **um lote
real de 6 imagens**, com o extrato conferido linha a linha — **6 linhas nomeando as 6
cenas** (a prova de D1 que nenhum print dá), o saldo caindo exatamente a soma
anunciada, e o veredito sobre o único item que nenhuma consulta responde: *o trilho
mostra o storyboard?*

---

### Fase 3 · o lote de vídeo, com portão — e a continuação em lote

**Entrega.**

- O portão: **"Animar as N aprovadas"**, com o total do catálogo de vídeo. **Vídeo só de
  cena aprovada**, sem exceção.
- Cenas de **corte** animam em paralelo, dentro do teto de 4.
- Cenas de **continuação** entram na cadeia: a cena N só é submetida depois de o vídeo
  de N−1 estar pronto **e** do quadro extraído — o elo do Ciclo 1, com o passo zero
  (`findDerivedFrame`) evitando re-extração, e o desenho da Fase 0 respondendo às
  perguntas 0.2 e 0.3.
- O estado vivo vem do **banco** (`generations` por `scene_id`, `media_kind = 'video'`)
  e o Realtime avisa. **Nenhuma fila de cliente para o vídeo.**
- Uma cena que falha ou é recusada não trava a cadeia: as de corte seguem; as de
  continuação **abaixo dela** ficam com a frase que diz o que falta.

**Passos removidos: 35** (o bloco C, de 36 para 1).

**Prova — as duas metades.**

*Estrutural:* a ordem da cadeia (uma continuação nunca submetida antes do quadro
anterior existir), o paralelismo das de corte dentro do teto, a soma do portão contra o
catálogo, a recusa da cena com duração fora do catálogo (D5), e uma falha no meio da
cadeia **não** apagando nem travando as demais.

*Ao vivo, zero Spark:* o portão contando só as aprovadas; a frase da cena que aguarda a
anterior; a cena de duração inválida fora do lote com a frase que ensina o conserto.

*A metade do dono — **e a fase não fecha nem commita sem ela**:* **um lote real com pelo
menos uma continuação**, e as três leituras que fecham o ciclo: o extrato nomeando cada
cena; a imagem de partida da cena de continuação sendo **o asset derivado** do clipe
anterior (uma coluna apontando para outra, como em 15/08); e o veredito humano — *os
clipes emendam?*

---

### Fase 4 · o template no sidebar — o fluxo padrão

**Entrega.** Um item **"Máquina de Storyboard"** no trilho lateral que, num clique,
põe no canvas **Roteiro + Máquina, conectados e posicionados**, com a tela indo até
eles. Duplicar e remover funcionam como em qualquer node, porque **são** nodes comuns —
o template é um gesto de criação, não um tipo novo.

**Passos removidos: 2** — não dos 54, e sim da montagem da própria Máquina em todo
projeto novo (clicar · arrastar · ligar o fio). É a diferença entre *"aqui estão as
peças"* e *"aqui está o fluxo"*, que é a frase do esboço do Jorge.

**Prova:** contagem de nodes e arestas antes e depois (**+2 nodes, +1 aresta**), a
aresta certa no grafo **salvo** (a corrente sobrevivendo ao reload), e o item na
prateleira com glifo próprio — **e o rodapé da prateleira conferido**, porque ele já
mentiu sobre si mesmo duas vezes (13/08 e 17/08).

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
   que é normativa** — um node que não estiver lá é um node que a próxima frente não vai
   saber que existe).
4. `npm run lint` + `npm run typecheck`, **commit e push na mesma ação**, com
   `git log origin/master -1` colado no resumo.

---

## 9. O que este ciclo **não** faz

Fixado pelo Jorge no brief, e repetido aqui porque um plano que não diz o que recusou é
um plano que vai crescer no meio.

- **Montagem final e trilha sonora.** A Máquina entrega N clipes, não um filme.
- **Voz e lipsync.** `storyboard_scenes.fala` continua dormente, e a tela continua
  dizendo isso.
- **Conexões entre projetos.** O `GN005`/`GN006` permanece: `@` só resolve personagem
  vinculada **a este** projeto.
- **Modelos novos pelo nome.** O Seedance entra como linha do catálogo quando vier — sem
  engenharia, pela invariante 2.
- **A arte da máquina** (neon, flutuação, brilho por estado). Anatomia sim, glamour não:
  é o Passe de UI/UX.
- **Máquina de Influencers.** Ela compartilha o maestro futuro (visão de 15/08, item i),
  e não é deste ciclo.
- **Mais de 10 cenas.** O teto de 10 está em três camadas e continua.
- **Reordenar, inserir e apagar cenas pela tela.** O `unique deferrable` continua
  esperando; quem o usar precisa de decisão própria, não de um *"já que estamos aqui"*.
- **Folha montada exportável (PDF).** É visão registrada (15/08, item b) e não é escopo.

---

## 10. Riscos nomeados

| risco | por que ele é real | o que o contém |
|---|---|---|
| **Mexer em `record_generation`** | é a função do dinheiro, e ela serve imagem, texto e vídeo | md5 do corpo + diff das linhas executáveis dos ramos intactos, como na Fase 1 do C2 |
| **Dez recusas de política num lote** | o filtro não é determinístico — medido em 26/08 | requisito 2: cada cena é uma geração; recusa custa zero e ganha ↻ próprio |
| **A cadeia de continuações parar no meio** | o navegador não decodifica vídeo em aba escondida (medido 8×, 15/08) | Fase 0 mede onde exatamente; a tela diz o que falta, em vez de girar |
| **Validar canvas em aba escondida** | custou uma hora em 18/08 — o React Flow não desenha aresta com node não medido | janela visível e em primeiro plano em toda validação; `browser_batch` para manter a aba ativa |
| **O canvas ficar lento com 10 blocos a mais** | a Fase 5 do Egress cortou 53 assinaturas para 1, e a Máquina povoa canvas | o trilho assina **em lote**, uma vez, e desenha **miniatura**; nunca uma assinatura por cena |
| **O plano divergir de si mesmo** | aconteceu no plano do Egress: dois status para a mesma fase | aprovar uma fase é editar **todo** lugar que falava dela no condicional |

---

## 11. O ritual, e o endereço da prova

- **Prova em número; print só quando o número não alcança** (regra do fundador,
  27/08/2026). O entregável de cada item é **dado** — contagem, tabela, leitura de log,
  banco ou DOM. Print entra só quando a afirmação é inerentemente visual, e aí **um**.
- **Toda geração paga é do Jorge**, autorizada no momento. A validação do Claude é de
  interface: **zero Spark**, com a contagem de `generations`, `ledger_transactions` e
  saldo idêntica do primeiro ao último dado.
- **Evidência fecha, commit sela.** Fase com metade da prova pendente fica **aberta e
  não commitada** — vale para as Fases 2 e 3, que têm metade do dono.
- **Endereço fixo:**
  `D:\Z - Meus Projetos DevIA\Creator TKS Labs\scratchpad\evidencias\storyboard-c3-fase<N>\`,
  um arquivo por item, com nome que diz **o que aquele arquivo prova**.
- **Antes de validar:** conferir que a porta 3000 serve o código novo
  (`netstat -ano | grep :3000`), e **anunciar o navegador antes da primeira tentativa**.
- **Migrations:** o Claude escreve o arquivo e avisa; **quem aplica é o Jorge**, pelo
  Session pooler.
