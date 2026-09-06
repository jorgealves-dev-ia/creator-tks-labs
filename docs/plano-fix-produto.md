# Frente A′ — `fix:` o produto da ficha chega à imagem

> **Status:** 🟡 **PLANO EM APROVAÇÃO** — escrito em 06/09/2026, **nenhuma linha de código
> executada**. Regra 9 do [`CLAUDE.md`](../CLAUDE.md): o plano vai para o disco antes da
> primeira fase.
>
> **A investigação que o gerou custou 0 ⚡.** As duas provas ao vivo custam **90 ⚡** e são
> **do dono**.

---

## 1. Por que ele existe, em uma frase

O dono viu a **cena 3 sair errada** no percurso de 02/09: as cenas 1 e 2 nomeavam a peça na
própria `acao` (*"retira a blusa da Mine"*, *"já com a blusa vestida"*) e **escaparam por
sorte**; a 3 não nomeia, e saiu sem a blusa.

> ## **Nome não é foto.**

Pôr *"blusa da Mine"* no prompt faria o modelo **inventar uma blusa**, não vestir a **dela**
— resposta plausível na tela e errada no produto, a mesma classe de engano que o `-c copy`
comete ao entregar um arquivo válido com a duração errada.

---

## 2. A régua

**Uma cena de história de produto sai com o produto REAL, e a prova é a cena 3.** A régua
não é *"o prompt menciona o produto"*; é *"a blusa da foto aparece na imagem"*.

---

## 3. O que este `fix:` NÃO faz

1. **Não cria extrator de produto.** O card de produto **não extrai nada hoje** — a
   "descrição" é a frase que a pessoa escreve. Um extrator é outra frente, e custaria Sparks
   por leitura.
2. **Não põe o nome do produto no prompt.** Descartado pelo dono em 03/09 — é a saída (i), e
   ela é a doença.
3. **Não mexe no motorista de lote.** Nenhum gesto desta frente passa por ele.
4. **Não mexe em vídeo.** O clipe herda a imagem; consertar a imagem conserta o clipe.
5. **Não cria FK de produto.** `storyboard_scenes.produto` continua texto livre — produto é
   card de canvas desde 10/08/2026, e não há linha para uma FK apontar.

---

## 4. O QUE A INVESTIGAÇÃO ACHOU — 06/09/2026

### 4.1 · A Máquina: o slot existe, e o fio é INERTE

**A Máquina já tem duas entradas:**

| handle | onde | para quê |
|---|---|---|
| `BOARD_HANDLE` | `machine-node.tsx:766` | o fio do Roteiro |
| **`"referencias"`** | `machine-node.tsx:774` | **já existe**, e a legenda já promete: *«Cards de Input que entram em TODAS as cenas — o mesmo produto em dez imagens»* (`pt-BR.ts:1090`) |

**E ele não entrega nada.** Três achados, cada um com endereço:

1. **`pedirCena` manda `references: []`** — literal, `machine-node.tsx:492`. A Máquina passa
   `referencesEnabled` adiante mas **nunca coleta** referência nenhuma.
2. **O fio vivo não alcança a Máquina.** `syncInputInto` (`store.ts:384`) alimenta
   `type === "generator"` e `VIDEO_TARGET`; **`machine` não está na lista** e o laço faz
   `continue`.
3. **`wiredPair` também a ignora** (`store.ts:251`): exige `generator?.type === "generator"`,
   então o gesto de conectar não anexa nada.

> ### 🚩 O pior caso não é o slot faltar — é o slot PROMETER.
>
> Hoje o fio **desenha**, a legenda **promete «entram em todas as cenas»**, e a geração sai
> sem a foto. É a tela mentindo sobre o que a máquina faz — a mesma família de defeito que as
> Fases 3, 4, 6 e 7 acabaram de fechar.

**O que o card de produto guarda** (`input-product-node.tsx:43-47`): `nome`, `assetIds`
(**teto 5**, `MAX_PHOTOS`), `instrucao`. **Não há extração** — o card nunca leu uma foto. A
conversão para referência **já existe e está pronta**: `inputReferences` (`store.ts:289`)
devolve uma entrada por foto com `kind: "produto"`, `groupId` = o id do card, `groupLabel` =
o nome, e a `instrucao` em todas.

### 4.2 · O compilador: ele JÁ SABE fazer isto

**Nada precisa ser inventado no compilador.** Ele compila produto desde 09/08/2026:

| peça | onde | o que faz |
|---|---|---|
| cláusula de fidelidade | `references.ts:64` | *"Reproduce the exact product shown in reference {n} — same colors, pattern, materials and details, without alteration"* — **nasceu de um biquíni que voltou com uma alça vermelha e outra azul** |
| `unidade_en` | `canvas.ts` | a frase que faz N fotos serem **um objeto** — só na primeira |
| `grupo` | `canvas.ts:189` | `{grupo_id, rotulo, ordens}` em todas as fotos do grupo: é o que torna *"3 fotos, 3 vagas"* **conferível** no histórico, em vez de prometido |
| `diretiva_en` | `canvas.ts:174` | vazia em todas menos a primeira — **um produto fala uma vez** |

**E a invariante 13 já deixou o lugar vago.** `canvas.ts:514`:

```ts
traje_canonico: directed ? null : (compiled?.structure.traje_canonico ?? null),
```

A cena da ficha é sempre texto dirigido → `directed` é verdadeiro → **o traje canônico já não
entra**. O produto ocupa exatamente o espaço que o traje deixou, sem violar nada: o que a
invariante proíbe é o **sistema** injetar traje; o produto entra por **fio de um card**, que é
a porta que a invariante 12 manda usar.

**📌 O compilador NÃO tem versão.** `prompt_compiled.structure` guarda `personagem.versao` —
a versão da *personagem*, `canvas.ts:211` — e **nada** que identifique o compilador. Toda
geração grava o texto compilado que usou, então **a mudança é auditável pelo conteúdo** (dá
para perguntar *"esta geração tem `grupo` de produto?"*), mas **não pelo carimbo**. Pergunta
para o dono, §8.3.

**A capacidade é o número apertado:**

| conta | valor |
|---|---|
| teto de referências do Nano Banana 2 (`gemini-3.1-flash-image`) | **6** (`presets.ts:108`) |
| a folha da `@luna`, imagem 1, obrigatória | **−1** |
| **livres para o produto** | **5** |
| teto de fotos de um card de produto | **5** |

**Cabe exatamente, e sem folga nenhuma.** Um modelo de 4 slots, ou um segundo card
conectado, estoura — e hoje a Máquina **não faz essa conta**.

### 4.3 · O Roteiro: o campo existe e ninguém disse para que serve

- `recipe.ts:228` — `blocoProduto` é **uma linha**: `Produto em cena: ${produto}`, ou
  *"Sem produto em cena."*
- `contract.ts:148` — no JSON schema da cena, `produto: { type: ["string","null"] }`,
  **sem `description`** — enquanto `acao` tem *"Direção de atuação com tempo, em português."*

**Um campo sem descrição num schema é um campo que o modelo preenche por analogia.** Foi o
que aconteceu: nas 6 cenas do Liquidificador o campo diz `"Liquidificador"` — o **nome**,
seis vezes, e nunca **onde ele está**.

**A regra nova, do dono:** *em história de produto, toda ficha diz onde o produto está na
cena* — **na mão**, **vestido**, **na mesa**, **na bancada**. Ela entra em **dois** lugares, e
os dois são necessários: a `description` do campo (que é o que o modelo lê ao preencher) e uma
regra em `blocoProduto` com exemplo bom e ruim — o padrão das Durezas 1–3, que existe porque
*"a instrução abstrata sozinha não bastou"*.

### 4.4 · A tela: o aviso JÁ EXISTE — no bloco errado

`pt-BR.ts:1754`:

```
sceneProduct: (nome) =>
  `Esta cena tem um produto: ${nome}. Conecte um Input de Produto para a foto dele entrar.`
```

**Renderizado em um lugar só:** `generator-node.tsx:1040`, o bloco Gerar Imagem de cena
única. **A Máquina não o mostra** — e a Máquina é onde as seis cenas são geradas de uma vez.

---

## 5. AS FASES

**Ordem escolhida: da verdade para trás.** Primeiro a Máquina passa a **entregar** o que o
slot promete; depois a tela para de mentir enquanto não entrega; só então o Roteiro passa a
pedir melhor. *Consertar o Roteiro primeiro produziria fichas melhores para um caminho que
ainda joga a foto fora.*

| ordem | fase | entrega | custo |
|---|---|---|---|
| 1ª | **P1** | **o fio vivo alcança a Máquina** — Input conectado contribui de verdade | 0 ⚡ |
| 2ª | **P2** | **a conta de vagas na Máquina**, antes do clique | 0 ⚡ |
| 3ª | **P3** | **o aviso «só nome»** por cena, e ele some ao conectar | 0 ⚡ |
| 4ª | **P4** | **o Roteiro exige a posição do produto** | 0 ⚡ estrutural |
| ⏸️ | — | **as duas provas do dono** | **90 ⚡** |

### P1 · O fio vivo alcança a Máquina

**Três pontos, os três já localizados:**

1. `store.ts:251` — `wiredPair` passa a aceitar `machine` como destino *(ou nasce um irmão
   `wiredMachine`, se misturar os dois piorar a leitura)*.
2. `store.ts:384` — `syncInputInto` ganha o ramo da Máquina, ao lado do que já existe para o
   bloco de vídeo.
3. `machine-node.tsx:492` — `references: []` vira a leitura das referências do node.

**A regra que decide o desenho:** *o mesmo produto em dez imagens*. A referência do card é
**do bloco**, não da cena — ela entra **igual em todas** as cenas do lote, e é isso que a
legenda do handle já promete desde que ele existe.

**Prova (0 ⚡):** o grafo montado fora do React — um Input de Produto com 3 fotos ligado a uma
Máquina de 3 cenas → as 3 requisições saem com **as mesmas 3 referências**, `kind: "produto"`,
mesmo `groupId`, `groupLabel` = o nome do card. **Vermelho→verde**: com o código de hoje, as
três saem com `references: []`.

### P2 · A conta de vagas, antes do clique

`generatorCapacity` (`capacity.ts:42`) já existe e é pura; a Máquina não a usa. Ela passa a
usar, com `reserved = 1` quando a ficha tem `personagem_handle` *(a folha é imagem 1)*.

**Recusa antes de gastar**, com a frase dizendo o número: *"este modelo aceita 6 imagens; a
folha ocupa 1 e o produto traz 6"*. **Nunca truncar em silêncio** — cortar a 6ª foto sozinho é
a tela decidindo por quem clicou, e o portão acabou de prometer um número.

**Prova (0 ⚡):** tabela — 5 fotos + folha = **passa**; 6 fotos + folha = **recusa, com o
número**; 6 fotos sem personagem = **passa**; modelo conservador (1 slot) + folha = **recusa**.

### P3 · O aviso «só nome», e ele morre ao conectar

A frase `sceneProduct` já existe. A Máquina passa a mostrá-la **por cena que tem `produto`**, e
**só enquanto não houver Input de Produto conectado**.

**Três estados, e os três precisam de frase própria** — é a lição da Fase 6, dois dias velha:
*dois braços para três estados é uma tela que mente no terceiro*.

| estado | o que a tela diz |
|---|---|
| ficha tem produto, **nenhum** Input conectado | *"Esta cena tem um produto: X. Conecte um Input de Produto para a foto dele entrar."* |
| Input conectado, **chave «Input Referências» DESLIGADA** | *"O produto está conectado e mudo. Ligue «Input Referências» para ele entrar."* |
| Input conectado **e** chave ligada | **nada** — *aviso que fica depois de resolvido é aviso que se aprende a ignorar* |

**A chave nasce desligada, e isso é invariante 12** — o caso base é gerar sem referência. Então
o segundo estado **não é raro: é o que acontece logo depois de conectar**, e uma tela que o
confundisse com o terceiro mandaria a pessoa gerar seis imagens achando que a foto entrou.

**Prova (0 ⚡):** os três estados na tela, lidos do DOM, com o grafo real.

### P4 · O Roteiro exige onde o produto está

Duas escritas, nenhuma geração:

1. `contract.ts:148` — o campo `produto` ganha `description`.
2. `recipe.ts:228` — `blocoProduto` vira regra com exemplos, no padrão das Durezas:

```
Bom:  "blusa da Mine, vestida no corpo"
Bom:  "liquidificador, na bancada ao lado dela"
Bom:  "blusa da Mine, dobrada nas mãos dela"
Ruim: "blusa da Mine"        (diz o quê, não diz onde)
Ruim: "o produto"            (não diz nem o quê)
```

**Prova estrutural (0 ⚡):** a receita montada para um roteiro **com** produto contém a regra e
os exemplos; **sem** produto, não contém — nada de instrução órfã num roteiro sem produto.
**Prova ao vivo: 15 ⚡, do dono.**

---

## 6. AS PROVAS PRÉ-REGISTRADAS

### 6.1 · Estruturais — 0 ⚡, e todas antes de qualquer clique

| # | o que prova | como |
|---|---|---|
| E1 | o Input conectado à Máquina **contribui** | 3 cenas × 3 fotos → 3 pedidos com as mesmas 3 referências, mesmo `groupId` |
| E2 | **vermelho→verde**: o código de hoje falha em E1 | as 3 saem com `references: []` |
| E3 | o **prompt compilado** carrega a foto e a frase | `structure.referencias[i].tipo === "produto"`, `fidelidade_en` presente, `unidade_en` só na primeira, `grupo.ordens` com as 3 posições |
| E4 | a **descrição escrita no card** chega | a `instrucao_pt` do card presente em todas as fotos do grupo |
| E5 | o traje canônico **continua fora** (invariante 13) | `structure.traje_canonico === null` e `regra_diretor === "prompt_dirige"` |
| E6 | a conta de vagas **recusa antes de gastar** | a tabela do P2 |
| E7 | os **três** estados do aviso | lidos do DOM, com o harness de pintura |
| E8 | a receita **exige a posição** | a regra presente com produto, ausente sem |

### 6.2 · Ao vivo — **do dono**, e a régua é a cena 3

> ## ⚠️ PIOR CASO R1, ESCRITO ANTES DOS CLIQUES
>
> ### Clique 1 — 1 roteiro = **15 ⚡**. Clique 2 — 1 imagem 2K = **75 ⚡**. **Total: 90 ⚡.**
>
> Conferido no catálogo em 06/09: `gemini-3.7-flash` · `roteiro` = **15**;
> `gemini-3.1-flash-image` · `2K` = **75**.
>
> **Se o número que o portão mostrar não for 15 e depois 75, o clique não acontece.**
>
> **Uma cena, não seis.** O segundo clique é o ↻ de **uma** cena — o portão de cena única.
> **O motorista de lote não está no caminho de nenhum dos dois**, e é isso que faz o pior caso
> ser um número em vez de "ilimitado", que era o buraco de 29/08.

| # | gesto | o que prova | custo |
|---|---|---|---|
| V1 | gerar **1 roteiro** de produto | **as fichas dizem onde a blusa está** — todas, não uma | 15 ⚡ |
| V2 | conectar o Input de Produto com a **foto real da blusa** e refazer **a cena 3** | **a blusa aparece, e é a dela** | 75 ⚡ |

**A cena 3 e não outra**, porque é a que falhou em 02/09: ela **não nomeia a peça na `acao`**,
então é a única que não escapa por sorte. Provar na cena 1 provaria o que já funcionava.

---

## 7. RISCOS NOMEADOS

1. **A folga de vagas é zero.** 5 fotos + folha = 6 = o teto exato do Nano Banana 2. Qualquer
   coisa a mais estoura, e **hoje a Máquina não conta**. É o P2, e ele vem antes de qualquer
   prova paga.
2. **O produto entra em TODAS as cenas.** É o que a legenda promete e é o desenho certo para
   *unboxing*; numa história onde o produto **some** em uma cena, ele entraria assim mesmo.
   → pergunta 8.1.
3. **Mudar a receita muda o que o Gemini devolve, e a receita não tem versão.** Um roteiro
   gerado amanhã não é comparável a um de ontem, e nada no banco diz qual receita o produziu.
   → pergunta 8.2.
4. **O compilador também não tem versão.** A auditoria consegue perguntar *"esta geração levou
   produto?"* pelo conteúdo, nunca *"que compilador a fez?"*. → pergunta 8.3.
5. **A prova V2 pode falhar por motivo alheio.** Recusa de política do provedor é erro
   **esperado** (invariante 7) e **não cobra** — mas gasta a sessão do dono. O gesto é
   repetível.
6. **`sceneProduct` é hoje texto do bloco de imagem.** Reusá-lo na Máquina põe uma frase em
   dois contextos; se ela precisar divergir, divergem **duas chaves**, nunca uma condicional
   dentro da frase.

---

## 8. AS PERGUNTAS QUE SÓ O DONO RESPONDE

**8.1 · O produto entra em todas as cenas, sem exceção?** Hoje a legenda promete isso. A
alternativa — *só nas cenas cuja ficha tem `produto` preenchido* — é uma linha de código e muda
o significado do card. **Recomendo: todas.** O card é do bloco, e *"o mesmo produto em dez
imagens"* é a frase que a Máquina já assinou.

**8.2 · A receita do Roteiro ganha versão agora, ou fica para o Catálogo?** É uma coluna e um
carimbo em `storyboards`. **Recomendo: fica** — é assunto do Catálogo aberto (frente B), e
enfiá-la aqui alarga o escopo que o §3 acabou de fechar.

**8.3 · O `prompt_compiled` ganha um carimbo de compilador?** Mesma resposta e mesma razão —
com uma agravante: esta é **a mudança de compilador mais visível desde a Camada 2**, e é a
primeira vez que uma geração da Máquina passa a levar imagem além da folha.

**8.4 · Qual produto e qual foto para a V2?** A **blusa da Mine** tem 3 clipes e um filme, mas
**as fotos do produto** precisam existir na galeria. Se não existirem, subir uma foto é gesto do
dono e **0 ⚡**.

**8.5 · O roteiro da V1 é novo ou reaproveita o «Unboxing e Provador Blusa da Mine»?** Novo
custa 15 ⚡ e prova a regra nova; reaproveitar custa 0 ⚡ e **não prova nada** — as fichas de lá
foram escritas pela receita velha.

---

## 9. O RITUAL

- **P1 a P4 são 0 ⚡:** selam com **prova estrutural + validação de tela**, com prova por item em
  número, e vão para produção no mesmo dia (regra 8 recalibrada em 31/08).
- **V1 e V2 têm dinheiro dentro:** a metade do dono é **obrigatória**, o pior caso está escrito
  acima, e **a etapa fica aberta e não commitada** até a validação dele chegar. *Uma etapa
  esperando prova e uma etapa fechada não podem ter a mesma aparência no git.*
- Evidência em `scratchpad\evidencias\fix-produto-<fase>\`, um arquivo por item.
- `npm run lint` + `npm run typecheck`; ESTADO reescrito **no mesmo commit**;
  `git grep -n "SAI ANTES DO COMMIT" -- src/ supabase/` vazio; **commit e push na mesma ação**,
  com `git log origin/master -1` colado no resumo.
- **Toda leitura de número do canvas passa pelo harness de pintura** — regra de 06/09.
