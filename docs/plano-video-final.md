# Plano — Mini-ciclo «O vídeo final»

> **O que este arquivo é.** O plano do mini-ciclo, em disco, **antes da primeira linha de
> código** (regra 9 do [`CLAUDE.md`](../CLAUDE.md)).
>
> **Status: 🔵 EM EXECUÇÃO.** As quatro perguntas foram **respondidas pelo Jorge em
> 03/09/2026** e estão no §7. A **Fase 0 fechou** no mesmo dia, com vencedor e números.
> A **Fase 5** subiu para a frente pela decisão 1 e **mudou de forma na execução**:
> a Máquina vazia **cria** o Roteiro ligado em vez de apontar para o
> template.
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
- **Não conserta o `produto` fora do prompt.** Decisão 4 do Jorge: ele vira um `fix:`
  próprio **depois** deste mini-ciclo. Ver §9.

---

## 4. As fases

| ordem | fase | o que entrega | status |
|---|---|---|---|
| — | **0** | a medição que decide o desenho da Fase 1 | ✅ **FECHADA** 03/09/2026 — vencedor e números no §4.0 |
| 1ª | **5** | **a Máquina vazia CRIA o Roteiro ligado** — mudou de forma na execução — ver a seção da **Fase 5** | ✅ **FECHADA** 04/09/2026 — 23/23 provas + validação de tela, que achou e consertou um defeito |
| 2ª | **1** | «Montar o vídeo»: o portão que devolve UM arquivo | ✅ **FECHADA** 04/09/2026 — o filme real montado, tocando no canvas |
| 3ª | **2** | **a FILA de clipes** — mudou de forma antes do código | ✅ **FECHADA** 04/09/2026 — 3 cenas com **um** clique |
| 4ª | **3** | o vídeo por cima do modal — **e a causa não era o `z-index`** | ✅ **FECHADA** 04/09/2026 |
| ⏸️ | — | **PARADA — o dono vê o filme** | ✅ **«testei, está ok»** 04/09/2026 — com um achado, consertado: §4.2b |
| 5ª | **4** | as arestas que não desenham **e** o cartão que não diz «peça removida» | ⬜ não começou |
| 6ª | **6** | o estado *"enviando"* — o terceiro braço do ternário | ⬜ não começou |
| 7ª | **7** | aprovar a ficha não carimba `edited_at` | ⬜ não começou |
| — | — | fechamento do mini-ciclo, ritual do §8 | ⬜ |

**A ordem, decidida em 03/09: `5 → 1 → 2 → 3 → PARADA → 4 → 6 → 7 → fechamento`.**
A Fase 0 já correu, então o que resta começa na **5**. As fases **6 e 7** nasceram na
mesma conversa e ficam no fim, encostadas na 3 e na 4: as quatro são a mesma família —
**a tela mente sobre o que o banco diz**.

> **A fase que fechou, em detalhe — e ela mudou de forma.** A **Fase 5** é a mais barata do
> plano e mexe na porta de entrada. O plano dizia *“aponta para o «Fluxo de
> Storyboard»”*; **o que foi construído não aponta, faz** — o botão cria o Roteiro já
> ligado a esta Máquina, sem passar pelo menu. **Apontar teria dado uma segunda
> Máquina** a quem já tem uma, porque o template cria o par. O porquê inteiro, as três
> recusas e a prova estão na **seção da Fase 5**, adiante.

---

### 4.2 · A PARADA depois da Fase 3 — o dono vê o filme

Fechadas a 5, a 1, a 2 e a 3, **o trabalho para** e o Jorge olha. O que ele tem de ver,
nesta ordem:

1. **O filme montado a partir dos 3 clipes reais** do projeto «Projeto novo teste maquina
   storyboard» — os mesmos do percurso de 02/09, não um caso de teste;
2. **como cartão no canvas** (decisão 2), plugável;
3. **e como asset na galeria** — o asset é a verdade, o cartão é a vista;
4. **com o print.** Aqui o print é obrigatório e não decorativo: a afirmação *"virou um
   filme só, e está no canvas"* é inerentemente visual, e nenhum número a carrega. Um
   print decisivo, não uma série.

**Por que a parada existe, sendo tudo 0 ⚡.** Ela não é a metade do dono da regra 8 — não
há dinheiro em jogo, e a regra recalibrada de 31/08 não a exigiria. **É outra coisa: é o
veredito de 02/09 sendo atendido na frente de quem o deu.** O dono disse *"três «vídeo
pronto» e nenhum vídeo"*; a resposta a isso não é um parágrafo de documentação dizendo
que foi resolvido — é ele vendo o vídeo. **A documentação sela depois; ele vê antes.**

---

### 4.2b · O VEREDITO DA PARADA — 04/09/2026

O dono percorreu os três e disse, nas palavras dele:

> ## **«testei, está ok»**
>
> — sobre **o filme** e sobre **o cartão no canvas**.

O veredito de 02/09 está atendido. Ele dizia *"três «vídeo pronto» e nenhum vídeo"*; a
resposta não foi um parágrafo de documentação afirmando que resolveu — foi ele assistindo.

#### O achado da parada: o vídeo em pé passava da dobra

Junto do ok veio **um defeito, e ele valia a parada existir**:

> *"o vídeo em pé (716×1284) sai maior que a janela e os controles ficam abaixo da dobra;
> o dono precisa rolar para ver play, tempo e volume. A tela cheia do cartão faz certo —
> o navegador encaixa o vídeo inteiro com barras pretas. É esse o comportamento de
> referência."*

Nos **dois** overlays: a fila de clipes e o lightbox da galeria.

**Medido antes de mexer**, com um clipe em pé numa janela de 1600×709: o `<video>` saía com
**1284 px de altura** — o intrínseco —, o retângulo começava em **y = −272** e terminava em
**1012**, transbordando **303 px**; e o `<dialog>` respondia com `scrollHeight 1012 >
clientHeight 709`, isto é, **rolagem**.

**Duas causas, com ordem entre elas.** A raiz é que **o tamanho intrínseco não estava sendo
limitado**: o `max-height: 100%` do vídeo resolvia contra um pai de altura `auto`, e
**porcentagem contra altura automática não resolve**. O `<div>` que criou essa quebra
**entrou na Fase 2**, para as setas terem um `relative` — antes dele o vídeo era filho
direto do container de altura definida. *É regressão introduzida no meio deste mini-ciclo,
e achada pelo dono, não por mim.* A causa visível é o **`overflow: auto` que a folha do
navegador dá a todo `<dialog>`**: é ele que transforma transbordo em rolagem em vez de
recorte.

**O conserto não conserta a cadeia — descarta a cadeia.** O limite passa a ser a **janela**
(`calc(100dvh - 4.5rem)` de altura, `100vw` de largura), que não depende de ancestral
nenhum ter altura definida; mais `h-auto w-auto object-contain`, e `overflow-hidden` no
`<dialog>`. **É o que a tela cheia do navegador faz**, que foi a referência que o dono deu.

**Prova (§5, item 16), janela 1600×709 nos três:**

| overlay | clipe | intrínseco | na tela | dentro da janela | dialog rola |
|---|---|---|---|---|---|
| fila | cena 3, em pé | 716×1284 | **355×637** | ✅ | não |
| galeria | fixture, deitado | 1280×720 | **1132×637** | ✅ | não |
| galeria | filme, em pé | 716×1284 | **355×637** | ✅ | não |

`scrollTop = 0` e `overflow: hidden` nos três, proporção mantida nos três, controles
nativos visíveis sem rolar nos três.

**A quarta combinação — fila + deitado — não é alcançável no produto**, e isso fica dito em
vez de contornado: a fila se monta dos clipes do trilho, e todo clipe do trilho vem da
Máquina no formato do projeto. Pôr um deitado ali exigiria forjar linha em `generations`,
que é a tabela do dinheiro. **O que sustenta a cobertura é que os dois overlays são o mesmo
componente e o `<video>` é um só no arquivo** — a regra sob teste está num `className`
único, exercitado nas duas orientações.

*O clipe deitado foi um sintético de 1280×720 feito do próprio material (0 ⚡), subido como
fixture e removido no fim.*

---

### 4.0 · Fase 0 — FECHADA em 03/09/2026

**O vencedor: montagem em JavaScript puro, sem `ffmpeg`** (`mediabunny`). Ele não
recodifica nada — copia os pedaços já comprimidos de um MP4 para outro e desloca o
relógio. Os três números que decidiram:

| técnica | tempo (3 clipes reais) | binário que exige | saída |
|---|---|---|---|
| **puro JS (`mediabunny`)** | **122 ms** | **0,63 MB** | 11.066.457 B |
| `ffmpeg -f concat -c copy` | 202 ms | 75,0 MB | 11.066.760 B |
| `ffmpeg` recodificando (x264 veryfast) | 1.571 ms | 75,0 MB | 3.672.118 B |

**A prova mais forte:** os **363 quadros** do arquivo montado são **idênticos, um a um**,
à soma das três cenas na ordem certa — comparados por hash de pixel cru, não por
aparência. Nenhum quadro foi decodificado e recomprimido; o filme é os clipes.

**O que os clipes reais SÃO** (lido dos arquivos, não do banco):

| | cena 1 | cena 2 | cena 3 |
|---|---|---|---|
| codec / perfil | h264 Main | h264 Main | h264 Main |
| resolução | 716×1284 | 716×1284 | 716×1284 |
| fps | 24/1 | 24/1 | 24/1 |
| quadros | 121 | 121 | 121 |
| duração | 5,042 s | 5,042 s | 5,042 s |
| áudio | **nenhum** | **nenhum** | **nenhum** |
| bytes | 3.471.107 | 4.240.754 | 3.357.074 |

Os três têm **uma assinatura só** — dá para juntar sem recodificar. **Recodificar
encolheria o arquivo 3× (11,1 MB → 3,7 MB), mas perde qualidade e custa 13× mais
tempo; ficou como plano B, não como padrão.**

**Os cinco achados que a Fase 0 entrega para o desenho da Fase 1** estão no §4.1, porque
é lá que viram código.

---

### Fase 1 · A montagem — o botão que devolve um arquivo

**Entrega.** Um terceiro portão na Máquina — **«Montar o vídeo»** — que aparece **só
quando todos os clipes do roteiro existem**, junta os clipes **na ordem das cenas**, e
grava o resultado como **asset na galeria** e **cartão de Resultado no canvas**
(decisão 2).

**Onde ele fica, e por que ali.** Na anatomia da §3.2, a banda dos portões. Depois de
*Animar*, porque é o que vem depois. **Desabilitado com a contagem do que falta**
(decisão 3) — *"faltam 2 clipes"* —, nunca escondido: um botão que some ensina que ele
não existe.

#### 4.1 · O que a Fase 0 mandou para cá

**(a) A ordem é `storyboard_scenes.ordem` — nunca `created_at`, nunca o nome do
arquivo.** Medido no percurso de 02/09: o lote de 643 ms submeteu as três cenas **fora
de ordem**, e a cena 2 é a geração criada **por último**.

| ordem da cena | geração | criada em |
|---|---|---|
| 1 | `1cd30872…` | 22:30:33.**255** |
| 2 | `850c84aa…` | 22:30:33.**898** ← a última |
| 3 | `ef3a65f7…` | 22:30:33.**584** ← a segunda |

Montar por hora de criação entregaria o filme embaralhado, **e ninguém veria o erro no
código** — só no vídeo.

**(b) O portão lê os ARQUIVOS, não o banco, e recusa nomeando o clipe que destoa.**
O banco não sabe a resolução: `assets.width` e `height` são `NULL` nos três, e o
`params.resolution` diz `"720p"` enquanto o arquivo tem **716×1284**. Pior: nenhuma das
duas bibliotecas recusa sozinha um clipe incompatível —

- o `ffmpeg -c copy` entrega um arquivo **silenciosamente errado** (18,896 s onde
  deviam ser 15,118 s);
- o puro JS acerta a duração mas **declara a resolução do primeiro clipe** para todos.

**A trava é nossa, e a recusa custa zero:** ler codec, resolução, fps e duração dos
arquivos, comparar a assinatura, e recusar **antes** de montar — dizendo qual clipe
destoa. *Ler três cabeçalhos de MP4 não gasta Spark e não chama ninguém.*

**(c) O gate de tamanho, com o número na frase.** O bucket recusa acima de **50 MB**, e
**esse limite é configuração nossa** — `supabase/migrations/20260807140500_storage_assets_bucket.sql:11`,
posto para bater com o teto do plano Free, com o comentário *"Raise it when the plan
changes"*. Medido: **3.688.819 B por cena de 5 s**.

| cenas | tamanho | cabe em 50 MB? |
|---|---|---|
| 3 | 10,6 MB *(medido)* | sim |
| **10** | **35,0 MB *(medido)*** | **sim — 30% de folga** |
| 14 | 49,3 MB *(previsto)* | sim, no limite |
| 15 | 52,8 MB *(previsto)* | **não** |

A linha de 10 cenas foi **medida**, não extrapolada: os 3 clipes reais ciclados até 10
dão **36.668.051 B em 885 ms**, 50,417 s, 1.210 quadros. *(A previsão errou por 0,6% no
tamanho — e por 2× no tempo, que eu havia estimado em 0,4 s. Vale o medido.)*
**885 ms contra `maxDuration = 60` decide a rota: montagem é síncrona.** A ressalva é
que esses 885 ms não incluem rede — em produção a função ainda baixa ~35 MB do Storage e
devolve ~35 MB, e **esse tempo não foi medido**.

**O teto de hoje segura:** `TETO_CENAS = 10` em `src/lib/storyboard/contract.ts:102`.
O gate soma os bytes e recusa com o número **antes** de montar — e o dia em que
`TETO_CENAS` subir de 14, ou a resolução crescer, é o dia em que essa conta estoura.
Por isso o gate existe agora, com o teto folgado, e não depois.

**(d) A biblioteca, por escrito, antes de entrar no `package.json`.**

| | |
|---|---|
| nome / versão | `mediabunny` **`1.55.6`** — **cravada, sem caret** |
| licença | **MPL-2.0**, e a obrigação é **por arquivo**: alterar **os arquivos da própria biblioteca** obriga a manter esses arquivos abertos. **O nosso código não é afetado**, nem por importá-la nem por distribuí-la junto |
| repositório | `github.com/Vanilagy/mediabunny` — 7.084 estrelas, 292 forks, não arquivado |
| manutenção | 177 versões desde 16/06/2025; seis lançamentos nos últimos 17 dias; **último push em 03/09/2026** |
| dependências de runtime | **zero** — as duas do `package.json` são pacotes só de tipos, sem `main` |
| risco real | **um mantenedor só.** É o único risco sério, e é o de sempre nesse tipo de biblioteca |

✅ **Aprovada pelo Jorge em 03/09/2026.** Entra **cravada em `1.55.6`, sem `^`**: um caret
deixaria o npm trazer sozinho a próxima 1.56 de um projeto que lançou seis versões em
dezessete dias, e o que a diligência mediu foi **esta** versão. Atualizar passa a ser um
gesto, com leitura do changelog, e não efeito colateral de um `npm install`.

**O plano B, se ela sumir**, em ordem de esforço: (1) **copiar o código para dentro do
repo** — a MPL-2.0 permite, e com **zero dependências** isso é um arquivo, não uma
árvore *(alterações nossas nesses arquivos ficam MPL-2.0, que é um preço conhecido e
pequeno)*; (2) a versão cravada continua baixável — o npm não deixa despublicar depois de
72 h; (3) **`ffmpeg-static`**, o perdedor desta fase, que continua existindo.
**A montagem fica atrás de uma função nossa** — trocar o motor é reescrever essa
função, não caçar chamadas pelo código.

**(e) Não há áudio.** Nenhum dos três clipes tem faixa de som. A montagem não sincroniza
nada hoje — e o dia em que o Ciclo D trouxer voz, isto vira requisito novo, não ajuste.

#### 4.1b · A rota, declarada antes do código — exigência do dono, 04/09/2026

Três coisas ficam escritas **antes** de existir uma linha da rota, porque as três são
do tipo que, se ficarem para depois, ficam para nunca.

**(a) A rota é autenticada, e o dono do filme sai da SESSÃO — nunca do corpo do pedido.**

E não *"a rota lê a sessão e preenche o `user_id`"*, que seria uma promessa de código. O
dono é resolvido **dentro do banco**, pela função `record_montage`, que faz
`v_user_id := (select auth.uid())` — o mesmo desenho de `record_generation` e
`record_extraction`. Um `user_id` que chegasse pelo corpo do pedido seria um campo que o
cliente escolhe: quem manda o pedido escolheria de quem é o filme.

*E o trigger de `asset_montage_parts` de 04/09 fecha a mesma porta por baixo* — mesmo que
alguém escrevesse à mão, a linha só entra se o dono for o dono do filme.

**(b) `cabeNoBucket` é chamada ANTES de baixar um único byte, e a recusa carrega o número.**

A ordem da rota é esta, e a primeira posição não é estilo:

```
1. sessão            quem é, e o roteiro é dele?
2. cenas na ORDEM    storyboard_scenes.ordem — nunca created_at
3. falta clipe?      recusa dizendo QUANTOS faltam, sem tocar no Storage
4. cabeNoBucket      soma assets.byte_size — recusa com o número, sem baixar nada
5. baixa             só agora os bytes saem do Storage
6. montarVideo       a trava lê os ARQUIVOS e recusa nomeando o clipe que destoa
7. sobe + grava      o filme no Storage, e record_montage numa transação só
```

Os passos 3 e 4 são as duas recusas que **custam zero**: nenhuma abre arquivo, nenhuma
gasta egress. Baixar 35 MB para depois concluir que não cabia em 50 MB é pagar para
descobrir o que o banco já sabia.

**(c) O asset do filme nasce com os quatro números MEDIDOS, e as peças entram na MESMA
transação.**

`width`, `height`, fps e duração vêm do arquivo montado (prova **5d**) — a montagem já leu
os quatro para decidir se podia montar, então gravá-los custa **zero a mais**. Os clipes de
vídeo têm `assets.width`/`height` em `NULL`; o filme **não pode** nascer com o mesmo
defeito, porque ele é a coisa que a pessoa vai baixar e postar.

**E as peças não podem ser um segundo pedido.** *Filme sem lista de peças é linhagem
perdida* — e perdida do jeito pior, calada: o arquivo existe, abre, toca, e ninguém
descobre que a linhagem sumiu até o dia em que alguém perguntar de onde ele veio.

> **Isto obriga uma segunda migration, e é honesto dizer por quê:** o PostgREST **não faz
> transação multi-tabela**. Dois pedidos — um para `assets`, outro para
> `asset_montage_parts` — têm uma janela entre eles, e uma função serverless que morra ali
> deixa um filme órfão de linhagem. A saída é a que a casa já usa para exatamente esta
> classe de problema: **uma função no banco**, `record_montage`, que insere o asset e as N
> peças **numa transação só** — a mesma forma de `record_generation` e `record_extraction`,
> que gravam e cobram juntos ou não gravam nada.

**Prova da (c):** matar a rota entre os dois passos não é reproduzível à mão, mas a
garantia é: **ou o filme e as peças existem, ou nenhum dos dois.** O que se mede é o
resultado — asset criado **com** as N peças na ordem, e `width`/`height`/fps/duração
preenchidos.

#### 4.1c · A invariante nova — `record_montage` é a ÚNICA porta

Decidida pelo dono em 04/09/2026, ao revisar a função: *"ela é a única porta para
`asset_montage_parts`, como `record_generation` é para o ledger?"* Não era. **Passou a
ser.**

> ## `asset_montage_parts` é somente-leitura para o usuário. A única escrita é `record_montage`.

A policy de INSERT para `authenticated` saiu. Sem ela, o PostgREST não insere linha
nenhuma naquela tabela; `record_montage` é `security definer` e passa por cima do RLS, que
é exatamente o mesmo arranjo de `ledger_transactions` — somente-leitura para o usuário, e
escrita só por `record_generation` / `record_extraction`.

**O ganho não é a trava a mais — é o número de lugares onde a regra mora.** Com duas
portas, toda regra nova precisa ser escrita duas vezes, e a segunda é a que alguém
esquece. A policy de SELECT fica: ler a própria linhagem é o ponto de ela existir.

**E a função ficou com a superfície que uma `security definer` precisa ter.** As quatro
perguntas do dono acharam três coisas, e as três estão fechadas:

| pergunta | como estava | como está |
|---|---|---|
| `search_path` fixo? | ✅ já estava — `set search_path = ''`, tudo qualificado | — |
| valida as peças? | dono **sim** (`N part(s) do not belong to the caller`); **tipo não** | + `N part(s) are not video assets` |
| única porta? | **não** — havia policy de INSERT | ✅ policy removida |
| dá para chamar duas vezes? | **dá** | segue dando — ver abaixo |

**E uma quarta coisa, que a pergunta 2 destravou sem ser sobre ela:** `p_storage_path` era
**texto livre numa função `security definer`** — dava para criar linha em `assets`
apontando para qualquer caminho do bucket, inclusive o de outra pessoa. *Medido antes de
chamar de buraco:* o RLS do Storage recorta por `(storage.foldername(name))[1] =
auth.uid()` e `signAssetUrls` assina com o cliente de **sessão**, então o arquivo alheio
não sai assinado — o estrago de hoje é menor, linhas apontando para lugar nenhum. **Mas a
casa já decidiu que essa checagem é do caminho de escrita:** `registerDerivedFrame` faz
`startsWith(userId + "/")` desde 15/08. Agora `record_montage` faz a mesma coisa, no banco.

**O que ela deliberadamente NÃO confere:** que as peças são os clipes **deste** storyboard.
Ela não o recebe, e fechar isso a acoplaria ao roteiro. O que sobra em aberto é pequeno e é
**do próprio dono** — montar um filme com clipes dele em qualquer ordem é uma coisa que o
produto provavelmente vai querer oferecer. *Não é vazamento; é liberdade.*

#### 4.1d · «Um asset pertence a um projeto» — decisão do dono, 04/09/2026

**O buraco é mais velho que o filme.** A galeria lista `generations` e mostra
`result_asset_id`. Isso funciona enquanto todo arquivo do acervo nasce de uma geração — e
**dois já não nascem**: o **filme montado** (montagem não é geração) e o **quadro derivado
do elo** (recortado de um clipe desde 15/08/2026, pela mesma razão).

Medido em 04/09: a galeria do projeto diz *«6 imagens»* e mostra 3 clipes e 3 imagens; os
dois filmes não estão lá. **E os quadros do elo estão invisíveis desde 15/08 sem ninguém
notar** — o filme só tornou o buraco visível, porque ele é a entrega.

**Duas saídas mais baratas foram recusadas, e pelo mesmo motivo: as duas fazem a galeria
adivinhar.** Pescar filmes pelo caminho do Storage amarra a galeria a uma convenção de
nome de arquivo; unir por `asset_montage_parts` é correto por FK mas **só serve para
filme** — não conserta o quadro do elo, e o próximo asset sem geração recomeça a
discussão. *"Um asset pertence a um projeto"* conserta a classe inteira.

##### O passado, e o número que sobra

Três passes, nenhum adivinhando — os três seguem uma FK existente até um `project_id` que
já estava gravado: **geração → projeto**, **peça → clipe → projeto**, **derivado → origem →
projeto** (nesta ordem, porque o terceiro lê o que o primeiro escreveu). O `db push`
imprime as contagens.

**Previsto pela medição de 04/09: 85 dos 102 assets ganham projeto, e 17 ficam nulos.**
Os 17 foram conferidos um a um e **nenhum é acidente**:

| quantos | o que são | por que não têm projeto |
|---|---|---|
| 11 | `image/upload` | envio avulso — a pessoa trouxe o arquivo, não gerou |
| 6 | imagens de entidade (3 geradas, 3 enviadas) | **a folha canônica nasce no editor da personagem**, que não é um projeto |

**Órfão fica nulo e a galeria de projeto ignora** — ela filtra por `project_id`, então nulo
não aparece. É por isso que a coluna **não pode** ser `not null`: uma trava que recusasse
nulo recusaria a folha canônica.

##### O futuro: dois triggers, e não uma lista de caminhos para lembrar

A exigência era *"todo caminho que cria asset passa a preencher `project_id` — exigência no
banco se der"*. **Dá, e por um desenho melhor do que lembrar em cada chamador.**

| trigger | onde | o que carimba |
|---|---|---|
| `assets_herdar_projeto` | `before insert on assets` | o **derivado** herda o projeto de quem ele recortou — tira a responsabilidade de `registerDerivedFrame` e de qualquer derivação futura |
| `generations_carimbar_projeto_do_asset` | `after insert or update of result_asset_id, project_id on generations` | **o ponto por onde todos passam**: o asset de imagem nasce numa rota, o de vídeo no webhook, e amanhã pode ser outro lugar — mas todos acabam gravando `result_asset_id` |

**O segundo é o que cobre os caminhos que eu não conheço**, e é por isso que ele existe em
vez de uma lista: uma lista descreve os chamadores de hoje; o trigger pega o de amanhã.

**Sobra um caminho que nenhum dos dois alcança: o filme.** Ele não deriva de um asset só e
não tem geração. Então `record_montage` ganhou `p_project_id` **sem `default`** — quem
chamar sem ele não compila nem executa —, e a função confere que o projeto é do chamador,
como já conferia o caminho do Storage e as peças. *A assinatura antiga foi derrubada com
`drop function`: um `create or replace` com parâmetro a mais criaria uma **segunda** função
com o mesmo nome, e o dia em que alguém chamasse a antiga o filme voltaria a nascer sem
projeto — calado, como todo o resto desta página.*

##### Provas

| # | o que prova | forma |
|---|---|---|
| **12** | **o filme aparece na galeria do projeto** | banco + tela |
| **13** | **um quadro derivado do elo aparece na galeria** — invisível desde 15/08 | banco + tela |
| **14** | **a contagem do rodapé bate com o que está na tela** — *"ele já mentiu duas vezes na prateleira, não vai estrear na galeria"* | número |
| **15** | **zero Spark**: `generations`, ledger e saldo idênticos | número |

---

#### Invariantes que valem aqui, sem exceção

- **Ingestão de assets (3):** o vídeo montado é copiado para o Storage e registrado em
  `assets`. Nunca uma URL de terceiro como fonte definitiva.
- **Linhagem:** o asset final aponta para os clipes que o formaram — a mesma ideia do
  `derived_from_asset_id` do elo, para a galeria saber de onde ele veio.
- **Dinheiro (5):** **nada é gravado em `generations` nem no ledger.** Montagem não é
  geração: não chama modelo, não tem `cost_real_cents`, não cobra. *Se algum dia
  montagem passar a custar, ela vira geração e volta para a régua do dinheiro.*
- **O asset do filme nasce com os metadados MEDIDOS** — `width`, `height`, fps e duração
  lidos do arquivo montado, nunca `NULL` e nunca herdados. A montagem já leu esses quatro
  números para decidir se podia montar; gravá-los custa zero a mais. *É a prova 5d.*
- **`asset_montage_parts` é somente-leitura para o usuário** *(04/09/2026)*: a única
  escrita é `record_montage`, como o ledger só recebe escrita por `record_generation`.
  → §4.1c
- **A dependência já tem o ok** (03/09/2026), cravada em `1.55.6` sem caret — §4.1(d).

**Prova — FEITA em 04/09/2026, com os 3 clipes reais:** asset `959dc554…` · **716×1284,
15.125 ms, 11.066.457 B** (o mesmo tamanho que a Fase 0 mediu) · linhagem **peça 1 → cena 1,
peça 2 → cena 2, peça 3 → cena 3** · e **o extrato não se moveu**: `generations` 716 → 716,
ledger 108 → 108, saldo 3.280 → 3.280, último lançamento ainda de 02/09 22:31:47.

**E o cartão do Filme não sai desta fase quebrado — decisão do dono, 04/09.** Na primeira
prova de campo ele desenhou `<img>` apontando para um MP4: ícone de imagem partida no canvas.
A escolha foi entre *"dívida nomeada até a Fase 2"* e *"o cartão nasce sabendo o que é"*, e
venceu a segunda: **a Fase 1 não deve deixar o canvas mostrando imagem quebrada nem por uma
hora.** O cartão ganhou `kind`, e vídeo vira `<video controls muted playsInline
preload="metadata">` — o próprio navegador dá o pôster do primeiro quadro. *O player
desenhado por nós continua sendo a Fase 2; isto é o mínimo para o cartão não nascer torto.*

---

### Fase 2 · O player — e ele é uma FILA, não um player por cartão

> **A fase mudou de forma antes do código, por exigência do dono em 04/09/2026.**
> O plano dizia *"um player no cartão de cena do trilho e no cartão do vídeo final"*.
> O cartão do vídeo final **já toca** desde a Fase 1 (ele não podia nascer quebrado). E
> para o cartão de cena o dono pôs a régua que estava faltando:
>
> > *"o player no cartão de cena é o instrumento do veredito do elo. Ele precisa deixar
> > ver os três clipes em sequência sem esforço — se para ver o clipe 2 depois do 1 eu
> > tiver que caçar o botão, o instrumento não serve para o que existe."*
>
> **Isso reprova o desenho original.** Um player de 120 px em cada cartão do trilho
> entrega três vídeos que **continuam sendo clicados um por um** — é o gesto de hoje com
> uma tela menor. O que responde *"os clipes emendam a ponto de parecer um filme só?"* é
> **assistir aos três em fila**, e é isso que a fase entrega.

**Entrega.** O overlay que já existe (`lightbox.tsx`, que já sabe distinguir vídeo de
imagem desde a Fase 3 do Ciclo 3) passa a receber **uma fila ordenada** em vez de um asset
solto:

- abre na cena que foi clicada, e **avança sozinha no `ended`** — cena 1 acaba, cena 2
  começa, sem nenhum clique;
- diz **onde se está** (*"cena 2 de 3"*), porque uma fila que avança sozinha sem dizer
  onde chegou troca uma dúvida por outra;
- **← →** e as setas do teclado para voltar e pular, para quem quer rever a emenda;
- o cartão de cena **não ganha player nenhum**: o ▶ que já existe passa a abrir a fila
  naquela cena. Zero UI nova num cartão de 7,5 rem.

**Por que a fila mora no overlay, e não no trilho.** O trilho é onde se **decide** (aprovar,
refazer, marcar); o overlay é onde se **olha**. Pôr três vídeos tocando dentro do card da
Máquina disputaria atenção com os portões que gastam dinheiro — e faria um canvas com duas
Máquinas ter seis vídeos vivos.

**Prova:** a fila percorrida do começo ao fim **com um clique só** — abrir na cena 1 e
contar quantos gestos até o fim da cena 3 (**meta: 1**), com o `src` do `<video>` mudando
de clipe a clipe e o rótulo acompanhando. Mais a duração exibida conferindo com a do
arquivo. **0 ⚡.**

*E ela fecha uma dívida velha: o veredito humano do elo está **NÃO MEDIDO desde
28/08/2026** justamente porque ver os clipes em sequência dava trabalho. Depois desta fase,
dá um clique.*

---

### Fase 3 · O vídeo abrindo por baixo do modal da galeria

**Entrega.** O conserto do defeito relatado pelo dono. **Diagnóstico antes de conserto**,
e o navegador antes do diagnóstico: reproduzir, ler o DOM e o `z-index` real, e **só
então** dizer qual camada está errada. *Escrever o conserto antes de ver a medida é como
o `fitView` da Fase 4 — a causa provável não é a causa.*

**Prova — FEITA em 04/09/2026, e ela reprovou o próprio instrumento que esta linha
previa.** Reproduzido antes de qualquer conserto: a galeria é um `<dialog>` aberto com
`showModal()`, logo `:modal`, logo no **top layer** — uma camada do navegador **acima de
todo o documento**, onde `z-index` não chega. Com o lightbox em `z-50`, o
`elementFromPoint` no meio da tela devolvia o `div` de rolagem da galeria.

> **Subir `z-50` para `z-[9999]` não mudaria nada.** A disputa não é de número: é de
> camada. *O risco estava escrito na tabela do §6 antes de a fase começar — "consertar o
> `z-index` sem medir; a causa provável raramente é a causa". Era o caso.*

**O conserto:** o overlay virou `<dialog>` + `showModal()`. Os dois passam a estar no top
layer, e ali ganha **quem entrou por último**. Depois: 2 diálogos, os dois `:modal`, o
elemento no meio da tela é o `<video>` e **pertence ao lightbox** — com o **`z-index`
ainda em 50, intocado**, que é a prova de que o número nunca foi o problema.

---

### Fase 4 · Duas coisas que o banco sabe e a tela não mostra

#### Item 1 · as arestas que não desenham na carga fria

**Entrega.** O item que entrou no backlog em 02/09 com reprodução escrita: numa carga
fria do «Primeiros Testes», **19 arestas válidas desenham zero**; o `workflows.graph` tem
as 22. **Nenhum dado se perde** — o vínculo funciona, o desenho é que falta.

A hipótese está declarada como hipótese: os `handleBounds` são medidos **depois** do
render, e aresta recém-criada ou grafo grande em carga fria caem nessa janela. **A Fase 4
começa medindo isso e não presumindo.**

**Prova:** contagem de arestas no DOM × no grafo salvo, em carga fria, antes e depois —
no projeto grande, que é onde falha.

#### Item 2 · o cartão do filme diz «peça removida» — decisão do dono, 04/09/2026

**Entrega.** Quando um clipe que formou o filme é apagado, o banco anula a peça
(`asset_montage_parts.part_asset_id` → `null`, pelo `on delete set null`) **e o filme
continua inteiro** — os bytes dele são dele. Hoje isso é verdade **só no banco**: o cartão
do filme não tem como dizer que a posição 2 veio de um clipe que não existe mais.

**Por que ela caiu nesta fase, e não na 1.** É a família desta fase, dita no §4: **a tela
mente sobre o que o banco diz.** O dono perguntou, ao revisar a migration, se o `set null`
ficava legível na tela ou só no banco; a resposta honesta era *só no banco*, e um `set
null` invisível é a mesma classe de defeito das arestas que não desenham — o dado está
certo e a tela não conta.

**A regra:** a peça anulada aparece como **«peça removida»** na posição dela, e a posição
**não some** — um buraco na numeração obrigaria quem lê a adivinhar se faltou uma peça ou
se o filme só tinha duas. É o mesmo argumento que fez a coluna ser anulável em vez de a
linha ser apagada.

**Prova:** apagar um clipe de um filme montado, e ler os dois lados no mesmo instante —
`part_asset_id` nulo no banco, «peça removida» na posição certa do cartão, e a contagem de
posições **inalterada** antes e depois.

---

### Fase 5 · A Máquina vazia CRIA o Roteiro ligado

> **A fase mudou de forma na execução, e a mudança tem nome.** O plano dizia *"a Máquina
> vazia **aponta** para o «Fluxo de Storyboard»"* — um atalho que levasse a pessoa até o
> template do menu lateral. **O que foi construído não aponta: faz.** O botão cria o
> Roteiro já ligado a esta Máquina, ali mesmo, sem passar pelo menu.
>
> **Por que apontar não servia.** O «Fluxo de Storyboard» cria **o par** — um Roteiro
> *e* uma Máquina. Quem está lendo esta mensagem **já tem a Máquina**: mandá-lo ao
> template lhe daria uma segunda, e o problema de quem tem duas Máquinas é pior que o de
> quem não achou o menu. **O gesto certo aqui é a metade de trás do template**, e é
> exatamente isso que o `attachStoryboardToMachine` é.

**Entrega.** O card que dizia *"Nenhum roteiro ligado · Arraste um fio do bloco de
Roteiro até a entrada «Roteiro»"* ganha, **acima da instrução**, o botão **«Criar o
Roteiro ligado a esta Máquina»**. Um clique cria o Roteiro, o fio e o enquadramento; a
instrução de arrastar continua embaixo, reescrita para quem **já tem** um Roteiro no
canvas e não quer um segundo.

**Por que ela existe:** o dono **não achou o «Fluxo de Storyboard» na primeira vez** e
montou à mão o que um clique fazia. O item tem seção própria e glifo próprio, e mesmo
assim não foi encontrado por quem sabia que existia. **O menu lateral é onde o atalho
está; a Máquina vazia é onde a pessoa está olhando** no instante em que ele serve — e o
instante vence o lugar.

**A geometria é a do template, ao contrário.** Lá a Máquina nasce **abaixo e à direita**
do Roteiro; aqui o Roteiro nasce **acima e à esquerda** da Máquina, nas mesmas duas
constantes (`MACHINE_HANDLE_OFFSET`, `STORYBOARD_NODE_HEIGHT + PAIR_GAP`), para o fio
sair vertical dos dois lados. O enquadramento usa `setCenter` com a caixa que o store
devolve — **nunca `fitView`**, que descobre limites a partir de `measured` e cairia num
retângulo de área zero num card criado neste instante. **E a caixa cobre os DOIS cards:**
quem clicou estava olhando para a Máquina, e um salto que a deixasse fora da tela
esconderia a peça que fez a pergunta.

#### As três recusas, e por que existem sem frase

`attachStoryboardToMachine` devolve `null` — **sem criar nada** — em três casos:

| recusa | quando | por que a guarda existe se o botão não aparece ali |
|---|---|---|
| **Máquina já regida** | `findGoverningBoard` acha um Roteiro | é a trava do 1:1, de novo. O botão só existe na Máquina vazia, então este caminho *não deveria* acontecer — e **"não deveria" é o que separa uma guarda de uma suposição** |
| **id inexistente** | nenhum node com aquele `id` | o `id` vem do React Flow, mas um store que confia no chamador é um store que cria fio órfão quando o chamador erra |
| **id que não é Máquina** | o node existe, mas o `type` é outro | sem esta, um `id` de Roteiro criaria um Roteiro ligado a um Roteiro — um fio que a tela desenha e ninguém lê |

**Nenhuma delas fala com a pessoa, e isso é decisão.** O botão não existe nesses estados,
então uma mensagem de erro seria a resposta a uma pergunta que ninguém fez. **O `null` é
a rede embaixo, não o aviso** — ele impede o estrago, não o explica.

**E há uma quarta condição, que não é recusa:** o card novo **desvia** de quem já ocupa o
lugar (`freePosition`). Sem isso, o clique nasceria embaixo de um card existente e
pareceria não ter feito nada — **e um botão que parece não fazer nada é clicado de novo**.

**Prova pré-registrada:** a **tabela das 23 asserções estruturais** (harness sem banco e
sem rede, 0 ⚡) **mais um print** do gesto na tela. O print entra porque a afirmação
*"o botão está dentro do estado vazio, acima da instrução"* é inerentemente visual e
nenhum número a carrega; **um, não uma série**.

#### O que a tela achou e as 23 provas não pegaram — 04/09/2026

**Depois do gesto, os DOIS cards ficavam selecionados**, contra o que o store faz de
propósito e contra o comentário que diz por quê. Não é estética: com dois selecionados, a
próxima tecla **Delete apaga o par inteiro** em vez do card que a pessoa vê marcado.

**A causa foi medida, não chutada** — e o suspeito óbvio estava errado. Não é a seleção
por ponteiro do React Flow: um `button.click()` **sintético**, sem `mousedown` e sem
ponteiro nenhum, selecionava a Máquina igual. Quem seleciona é o **evento `click`
subindo até o wrapper do node**, e ele roda **depois** do nosso `set`. O conserto é um
`evento.stopPropagation()` no `onClick` do botão.

> **O store estava certo o tempo todo — as 23 asserções passavam com o defeito de pé.**
> O harness monta o store **fora do React**: não existe wrapper de node para o evento
> subir, então a propagação **não é observável ali** — e nenhuma prova estrutural
> pegaria isto, por mais que se escrevessem. **A tela pegou de primeira.**
>
> É o argumento concreto de por que a validação de tela não é carimbo: ela não repete o
> que o harness já disse, ela cobre **a camada que o harness não alcança**.

**Evidência:** `scratchpad\evidencias\video-final-fase5\` —
`23-provas-estruturais-do-gesto.md`, `validacao-de-tela-os-quatro-passos.md` e
`botao-dentro-do-estado-vazio-acima-da-instrucao.jpg`.

---

### Fase 6 · O estado "enviando" — o terceiro braço do ternário

**Entrega.** O achado **(b)** da auditoria de 02/09, com endereço:
`src/lib/storyboard/machine-video.ts:418`.

```ts
motivo: cena.video === "pronto" ? "ja_tem_video" : "falhou_no_lote",
```

O ternário tem **dois braços para três estados**. Uma cena que foi submetida e está **em
voo** — enfileirada ou rodando, sem clipe ainda — não é `"pronto"`, então cai no `else` e
a tela anuncia **"falhou neste lote"** para um trabalho que não falhou. *A guarda em si
está certa e é a trava R2.1 do incidente de 29/08: a cena não volta ao lote. O que está
errado é só a frase.*

**A regra:** **"falhou" só quando o banco escreveu `failed`.** Em voo é *"enviando"*, e
essa é a terceira frase que falta.

**Prova:** os três estados percorridos, cada um com o `motivo` que o código devolve e a
frase que a tela mostra, ao lado do `generations.status` no banco no mesmo instante.
**Zero submissão** — a Fase 6 não clica em Animar, ela lê estado que já existe.

---

### Fase 7 · Aprovar a ficha não carimba `edited_at`

**Entrega.** O achado **(d)**: `src/lib/storyboard/actions.ts:323`, dentro de
`saveScene`, escreve `edited_at` **em toda gravação** — inclusive quando o único campo
que mudou foi `status`. Aprovar uma ficha é uma gravação; então **aprovar acusa de
"editada à mão" quem só aprovou**.

**A regra:** `edited_at` só é carimbado quando **um campo editável mudou de valor** —
`acao`, `cenario`, `enquadramento`, `movimento`, `fala`, `produto`, `cta_*`,
`duracao_segundos`, `transicao`. `status` não é edição de conteúdo.

*Por que importa além da estética:* o comentário do próprio arquivo diz que `edited_at`
**é a coluna que a confirmação de "gerar de novo" vai contar em voz alta antes de
substituir**. Uma coluna de auditoria que marca todo mundo não distingue ninguém.

**Prova:** aprovar uma ficha sem tocar em campo nenhum → `edited_at` **inalterado**
(o valor antes e depois, do banco). Editar um campo → `edited_at` **muda**. Duas linhas
de número, e o selo da tela conferindo com as duas.

---

## 5. As provas pré-registradas do mini-ciclo

| # | o que prova | forma | fase |
|---|---|---|---|
| 1 | o arquivo montado **existe e abre**, com a duração somada das cenas | número (duração, bytes) | 1 |
| 2 | ele está em **`assets`** com linhagem para os clipes de origem, e como cartão de Resultado no canvas | banco + contagem de nodes | 1 |
| **2b** | **o trigger de INSERT é do BANCO, não do código:** recusa linha cujo `user_id` não é o dono do filme, e recusa peça que não é da mesma pessoa | vermelho→verde no banco | 1 |
| **2c** | **a armadilha do `on delete set null`:** o trigger de UPDATE deixa passar a transição peça→nula — que é o UPDATE que a cascata emite — e recusa **toda** outra alteração da linha; **e apagar um clipe já usado num filme FUNCIONA**, com o filme de pé e a contagem de posições intacta | vermelho→verde no banco | 1 |
| **11** | **a fila percorre as 3 cenas com UM clique** — gestos contados do começo ao fim, `src` do `<video>` mudando e o rótulo acompanhando | número (gestos) | 2 |
| **12** | **o filme aparece na galeria do projeto** — e a galeria passa a listar `assets`, não `generations` | banco + tela | PARADA |
| **13** | **um quadro derivado do elo aparece na galeria** — invisível desde 15/08/2026 sem ninguém notar | banco + tela | PARADA |
| **14** | **a contagem do rodapé bate com o que está na tela** — *«ele já mentiu duas vezes na prateleira, não vai estrear na galeria»* | número | PARADA |
| **16** | **o vídeo cabe na janela nos DOIS overlays e nos DOIS formatos** — retângulo ⊂ viewport, controles sem rolar, `scrollTop = 0` | número + 3 prints | PARADA |
| 3 | **zero dinheiro**: `generations`, `ledger_transactions`, `assets` de geração e saldo idênticos, com o timestamp da última linha inalterado | número | 1 |
| **4** | **a ordem vem de `storyboard_scenes.ordem`, e a prova ASSISTE:** hash de quadro **por posição** — cada cena ocupa a faixa de quadros que lhe cabe no montado, idêntica uma a uma | quadro (hash de pixel cru) | 1 |
| 5 | o portão **não aparece habilitado** com um clipe faltando, e diz quantos faltam | texto | 1 |
| **5b** | **o portão lê os ARQUIVOS e recusa nomeando o clipe que destoa** — provado com o clipe **540×960@30fps** que a Fase 0 já produziu | texto da recusa + assinatura lida | 1 |
| **5c** | **a soma dos bytes contra `file_size_limit`, e a recusa traz o número** | número | 1 |
| **5d** | **o asset do filme nasce com `width`, `height`, fps e duração MEDIDOS** — não herda o `NULL` dos clipes | banco | 1 |
| 6 | o modal da galeria fica **por cima** do vídeo, medido no `z-index` | número | 3 |
| 7 | as arestas desenham na carga fria do projeto grande — DOM = grafo salvo | número | 4 |
| **7b** | **apagar um clipe do filme:** `part_asset_id` nulo no banco, «peça removida» na posição certa do cartão, e a contagem de posições **inalterada** | banco + texto | 4 |
| **8** | **a Máquina vazia cria o Roteiro ligado** — as **23 asserções** do harness (o par criado, o handle, a geometria, o autosave, **as três recusas** e o desvio de colisão) **mais um print** do gesto na tela | tabela de 23 + 1 print | 5 |
| 9 | cena em voo mostra *"enviando"*; *"falhou"* só com `generations.status = 'failed'` | número | 6 |
| 10 | aprovar **não** move `edited_at`; editar **move** | número | 7 |

**As provas 2b e 2c entraram por decisão do dono em 04/09**, ao revisar a migration — e as
duas nasceram de respostas minhas que **não eram o que ele perguntou**. Ele perguntou se
"sem UPDATE" era trigger *como no ledger*; era só ausência de policy, que trava o usuário e
**não trava a service role** — que é justamente quem escreve ali. Virou trigger. **E escrever
esse trigger revelou a armadilha da 2c:** `on delete set null` **é um UPDATE**, então um
trigger que recusasse todo UPDATE tornaria **indeletável** qualquer clipe que já tivesse
entrado num filme — uma trava de auditoria virando trava de produto, descoberta só no dia em
que alguém tentasse apagar um clipe. *Uma trava que ninguém exercitou é uma trava que ninguém
sabe se existe — e uma que ninguém exercitou pode estar travando a coisa errada.*

**As provas 4, 5b e 5c são pré-registradas por decisão de 03/09** — elas não são desenho
da Fase 1, são **o que a Fase 1 tem de provar para fechar**. A Fase 0 já entregou os dois
instrumentos: o comparador de quadros por posição e o clipe destoante de 540×960@30fps.
*Uma trava que ninguém exercitou é uma trava que ninguém sabe se existe — foi a lição do
motorista, e vale aqui pelo mesmo motivo.*

**E a prova 5d fecha um buraco que a Fase 0 achou.** Os clipes de vídeo têm
`assets.width`/`height` em `NULL` — o filme montado **não pode nascer com o mesmo
defeito**, porque ele é a coisa que a pessoa vai baixar e postar, e porque um asset que
não sabe suas próprias dimensões obriga todo consumidor a abrir o arquivo para descobrir.
A montagem **já leu** codec, resolução, fps e duração para decidir se podia montar
(prova 5b): gravar esses quatro números no asset custa zero a mais. *Os `NULL` dos
clipes de vídeo em geral são item do backlog nomeado, não desta fase.*

**Evidência:** `scratchpad\evidencias\video-final-fase<N>\`, um arquivo por item, com
nome que diz o que aquele arquivo prova.

---

## 6. Riscos nomeados

| risco | por que é real | o que o contém |
|---|---|---|
| ~~**`ffmpeg` não existir no runtime da Vercel**~~ | ~~é a suposição que carrega a Fase 1 inteira~~ | ✅ **resolvido na Fase 0: o vencedor não usa `ffmpeg`.** A pergunta deixou de ser carga |
| ~~**O `maxDuration` de 60 s**~~ | ~~recodificar 10 clipes pode estourar o teto~~ | ✅ **resolvido e medido: 885 ms com 10 cenas** (122 ms com 3). Montagem é rota síncrona. *O que falta medir é a rede — baixar e devolver ~35 MB* |
| ~~**Clipes incompatíveis entre si**~~ | ~~concatenar sem recodificar exige mesmo codec, resolução e fps~~ | ✅ **medido: assinatura única nos três.** O risco virou **trava** — §4.1(b), e ela é nossa porque nenhuma biblioteca recusa sozinha |
| **A biblioteca tem um mantenedor só** | é o risco que sobra depois da Fase 0, e não some | §4.1(d): MPL-2.0 + zero dependências = copiar para dentro é um arquivo. Plano B é o `ffmpeg-static` |
| **O teto de 50 MB do bucket** | 15 cenas de 5 s estouram; hoje o `TETO_CENAS` é 10 e segura com 30% de folga | §4.1(c): o gate soma e recusa com o número **antes** de montar |
| **Montagem virar "editor"** | todo pedido razoável (cortar 2 s, trocar a ordem) empurra para lá | o §3 está escrito antes das fases de propósito. **Junta na ordem, e só** |
| **Alguém achar que montagem custa** | um portão a mais na banda dos portões parece um portão de gasto | o botão **não mostra custo**, porque não tem. Se um dia tiver, vira geração e volta para a régua do dinheiro |
| **Consertar o `z-index` sem medir** | a causa provável raramente é a causa — o `fitView` da Fase 4 é o caso recente | navegador antes de diagnóstico, diagnóstico antes de conserto |

---

## 7. As quatro decisões do Jorge — 03/09/2026

As perguntas deste plano foram respondidas. Ficam aqui como decisão, não como pergunta.

1. **A ordem é `5 → 0 → 1 → 2 → 3 → 4`.** A Fase 5 sobe: é barata e mexe na porta de
   entrada, então o próximo percurso já começa certo.
2. **O filme nasce como cartão de Resultado no canvas, plugável, E como asset na
   galeria — e o asset é a verdade.** O cartão é a vista; se os dois divergirem, quem
   manda é a linha em `assets`.
3. **Cena sem clipe: o botão fica desabilitado, com a contagem do que falta.** Montar 2
   de 3 entregaria um filme que parece pronto e não está.
4. **O `produto` fora do prompt NÃO entra neste mini-ciclo.** Vira um `fix:` próprio,
   depois daqui e antes do Catálogo. Ver §9.

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

---

## 9. Depois deste mini-ciclo

**`fix:` o `produto` da ficha não chega à imagem — e ele não é um esquecimento.**

O achado **(c)** tinha endereço (`src/lib/storyboard/scene-prompt.ts:45`) e a leitura de
03/09 corrige o diagnóstico: **o código não esqueceu o `produto`, ele decidiu não
usá-lo**, e diz por quê no próprio arquivo —

> *"O produto da cena, que **não** vira nada no bloco. Viaja porque a tela precisa dizer
> que ele existe: `storyboard_scenes.produto` é texto livre desde a migration — produto
> virou card de canvas em 10/08/2026 e não há linha para uma FK apontar. O bloco manda
> conectar um Input de Produto em vez de fingir que resolveu."*

**O que é fato:** o campo está preenchido nas três cenas do percurso de 02/09 (*"blusa da
Mine"*), e o dono viu a cena 3 sair errada. **O que não é fato:** que a causa seja esta
linha. Uma decisão consciente de 10/08 e um defeito de 02/09 não são a mesma coisa, e
tratar a primeira como a segunda é reverter uma escolha sem discutir a escolha.

### A decisão do dono — 03/09/2026

Das três saídas que estavam na mesa, **vence a (ii), com a (iii) dentro dela**. A **(i)
está descartada**, e a razão cabe em quatro palavras:

> ## **nome não é foto**

Pôr *"blusa da Mine"* no prompt faria o modelo **inventar uma blusa**, não vestir a
**dela**. Seria uma resposta plausível na tela e errada no produto — a mesma classe de
engano que o `-c copy` comete ao entregar um arquivo válido com a duração errada.

**O `fix:` tem três partes:**

**1 · A Máquina ganha o Input de Produto.** Foto **e** descrição extraída entram na
geração. É o desenho de 10/08 sendo cumprido em vez de contornado: o produto do card tem
imagem, e imagem é o que resolve consistência de produto — do mesmo jeito que a folha da
personagem resolve consistência de personagem.

**2 · Enquanto ele não está conectado, a tela avisa** que o `produto` da ficha é **só
nome**. É a (iii), e ela não é consolo: é o que impede alguém de gerar dez cenas achando
que o campo preenchido está fazendo alguma coisa. *O aviso morre no instante em que o
Input aparece — aviso que fica depois de resolvido é aviso que se aprende a ignorar.*

**3 · O Roteiro passa a exigir onde o produto está na cena.** Em história de produto,
**toda ficha diz a posição** — *na mão*, *vestido*, *na mesa*. **Foi exatamente isto que
faltou na cena 3:** as cenas 1 e 2 nomeiam a peça na própria `acao` (*"retira a blusa da
Mine"*, *"já com a blusa vestida"*) e escaparam **por sorte**; a 3 não nomeia, e saiu
sem. Depender de o modelo de roteiro lembrar de vestir a personagem em toda ação é
depender de sorte uma vez por cena — e com dez cenas a sorte acaba.

**Quando:** depois deste mini-ciclo, **antes do Catálogo aberto**.

**Por que fora daqui:** não é vídeo final, e enfiá-lo neste plano alargaria o escopo que
o §3 acabou de fechar.

### O ritual deste `fix:`, e ele é o outro

**É a única coisa em pauta com dinheiro dentro.** Ele só se prova **gerando** — e agora
são dois gestos pagos, não um: o roteiro precisa ser refeito para provar a parte 3, e a
imagem precisa ser gerada para provar as partes 1 e 2.

> ## **Pior caso (R1): 1 roteiro (15 ⚡) + 1 imagem (75 ⚡) = 90 ⚡**
>
> *Se tudo der errado, custa 90 ⚡.* Duas requisições, dois débitos, **sem lote e sem
> motorista no caminho** — nenhum dos dois gestos passa pelo despachante de lote, que é
> a peça que multiplicou em 29/08.

**A metade do dono é obrigatória**, o pior caso está escrito **antes** do clique, e a
etapa fica **aberta e não commitada** até a validação dele chegar. *Se o número que o
portão mostrar não for 15 e 75, o clique não acontece* — a diferença entre os dois é o
buraco por onde o dinheiro sai.
