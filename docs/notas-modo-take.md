# Notas — Modo Take (Ciclo C)

> **O que este arquivo é.** Registro da análise que o dono fez do **Dreamina / Seedance
> 2.5** em 02/09/2026, guardado antes de virar plano.
>
> **NADA AQUI EXECUTA, E NADA AQUI É DECISÃO.** É matéria-prima para o plano do Ciclo C,
> que só se escreve depois do Catálogo. Provedor e preço **não se decidem aqui**: viram
> linha de catálogo, pela invariante 2 e pela 6.

---

## 1. Onde a API existe, fora do Dreamina

O Dreamina é a plataforma; o modelo tem caminhos de API por fora. **Três candidatos
registrados, nenhum escolhido:**

| caminho | como aparece |
|---|---|
| **Together AI** | `ByteDance/Seedance-2.5` |
| **Replicate** | `bytedance/seedance-2.5` |
| **BytePlus** | o caminho do próprio grupo |

**A escolha é do Ciclo B (Catálogo), não deste.** *"Modelo novo = linha em `ai_models`
por migration + adaptador em `lib/providers/`"* — e o preço por resolução/duração na
tabela de preços, nunca hardcoded.

---

## 2. A forma do prompt, e por que ela desenha o Ciclo C

O modelo aceita um prompt com **papéis de referência marcados**:

- `[Image1]`, `[Image2]`… — **até 30 imagens**
- até **10 vídeos** e **10 áudios**
- **marcação de tempo por faixa** — o que acontece em cada trecho
- duração de **4 a 30 s**, com **extend**

**E aqui está a razão de isto importar para nós, e não ser só mais um modelo:**

| o que o modelo pede | o que a Máquina já tem |
|---|---|
| papéis de referência | **as entradas da Máquina** — `roteiro`, `referencias`, e os cards de Input |
| as imagens do prompt | **as imagens de cena já aprovadas**, uma por cena |
| a linha do tempo | **a lista de cenas**, com `duracao_segundos` e `acao` com marcas de tempo |

**O Ciclo C é compilador + provedor, não uma tela nova.** A ficha já é dado estruturado
desde o Ciclo 2 — *"ficha é dado, nunca prosa"* — e a `acao` já vem escrita como direção
com tempo (*"ri de forma escandalosa por meio segundo"*), que foi decisão de 15/08. **O
que falta é traduzir esse dado para a gramática de papéis + linha do tempo.**

---

## 3. Preço — citado, não verificado

Números que o dono trouxe da análise, **por plataforma**, registrados como referência e
**a verificar na página do provedor** quando o Catálogo os for cadastrar:

| modelo | preço citado |
|---|---|
| Seedance **2.5** | a partir de **US$ 0,097/s** |
| Seedance **2.0** | **US$ 0,066/s** |
| Kling (o que usamos hoje) | **~US$ 0,056/s** |

> ⚠️ **Preço citado é hipótese até o catálogo ler a fonte.** É a regra da casa desde
> 29/08 — *quando existe um painel, o painel é a fonte* —, e ela nasceu de um erro de 8×
> por inferir custo sem ler o provedor.

**O take é mais caro por segundo que o clipe de hoje.** Então o **teto do take é assunto
da R2**: um "take" que gera 30 s custa como seis clipes de 5 s, e o pior caso por escrito
(R1) tem de dizer isso antes do clique.

---

## 4. Áudio nativo — e o que ele faz com o Ciclo D

**O modelo sempre gera fala sincronizada, inclusive em pt-BR.** Não é opcional.

Consequência de desenho, registrada aqui e detalhada em [`notas-voz.md`](./notas-voz.md):
**o Ciclo D passa a ter dois caminhos para o mesmo campo `storyboard_scenes.fala`** — o
take com voz nativa, e o clipe mudo + TTS + lipsync. **Um campo, dois motores** — e é o
Catálogo que precisa saber dizer qual modelo faz qual.

---

## 5. O que NÃO copiar

**A caixa de prompt com anexos.** É a interface deles, e é uma interface de *chat com
arquivos pendurados*.

**Nós somos nodes com fios.** Um anexo dentro de uma caixa de texto é exatamente o que a
invariante 12 proíbe — *toda referência tem node, e a faixa é espelho, nunca porta de
entrada*. O papel `[Image1]` deles é o nosso **fio de um card**, e a diferença não é
estética: um fio se corta, se religa, se vê de longe e sobrevive ao reload. Um anexo numa
caixa, não.

---

## 6. Visão registrada, sem data

Anotada em [`produto.md`](./produto.md) §7.1, repetida aqui porque nasceu desta análise:

- **Smart Edit** — uma campanha, N produtos: **trocar o produto no vídeo sem regenerar**.
- **Edição por trecho** — mexer num pedaço sem refazer o take inteiro.
- **Modelo 3D como referência de movimento.**

---

## 7. Candidatos a linha do Catálogo — **registrar, não criar**

| candidato | para quê | preço |
|---|---|---|
| **Seedance 2.5** via Together AI · Replicate · BytePlus | take com papéis de referência e linha do tempo | **oficial a verificar na página do provedor** |

**Requisito que este ciclo impõe ao plano do Catálogo:** o catálogo precisa carregar
**capacidades como dado**, não só preço — *fala nativa (e quais idiomas)*, *referência de
áudio*, *lipsync*, *voice_id*. Sem isso, escolher o motor de uma cena com fala vira
`if` espalhado pelo código, que é exatamente o que a invariante 2 existe para impedir.
