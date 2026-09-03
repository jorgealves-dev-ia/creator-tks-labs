# Notas — Voz e áudio (Ciclo D)

> **O que este arquivo é.** Registro da decisão de desenho que o dono tomou em
> 02/09/2026, guardado antes de virar plano.
>
> **NADA AQUI EXECUTA.** É matéria-prima para o plano do Ciclo D, que se escreve depois
> do Catálogo. Provedores e preços citados **viram linha de catálogo**, não escolha
> daqui.

---

## 1. A decisão de desenho, e ela é a que organiza todo o resto

> ## **Voz é identidade, não efeito.**

É a **Regra 11 estendida** — a mesma doutrina que faz o DNA visual ser imutável e a
menção `@` resolver para versão congelada. Uma personagem não *"recebe uma voz"* a cada
geração: **ela tem uma voz**, do mesmo jeito que tem um rosto.

A consequência prática é imediata: se a voz fosse efeito, ela viveria no node de geração
e mudaria a cada clique. Sendo identidade, **ela vive na ficha da personagem**, é
versionada, e toda geração a resolve do mesmo lugar de onde resolve o rosto.

---

## 2. A ficha ganha "identidade de voz"

Três campos, e cada um responde a uma pergunta diferente:

| campo | o que é | por que separado |
|---|---|---|
| **amostra oficial** | um **asset**, versionado | é a referência de áudio que um modelo de take consome como `[Audio1]`. Sendo asset, ela herda Storage, galeria e linhagem |
| **descrição** | idade, tom, energia, sotaque | é o que **entra em prompt** quando o motor aceita descrição em vez de amostra — e é legível por gente |
| **origem** | provedor + `voice_id` | **dado de Catálogo**, não da ficha. A ficha aponta; quem sabe o que aquele id significa é o catálogo |

**Versionada como o resto do DNA visual.** Trocar a voz de uma personagem é uma versão
nova, não um `UPDATE` — pela mesma razão que trocar o rosto é: uma geração antiga tem de
continuar explicável.

---

## 3. Os dois caminhos, para o mesmo campo `fala`

`storyboard_scenes.fala` está dormente desde o Ciclo 2. Ele acorda com **dois motores
possíveis**, e o Catálogo é quem sabe qual modelo faz qual:

### Caminho A — o take com voz nativa (Seedance)

A amostra oficial entra como **`[Audio1]`**, a fala entra na **linha do tempo** do
prompt, e o modelo devolve o clipe **já com a fala sincronizada**.

> **A fidelidade da clonagem é uma pergunta aberta**, e ela tem endereço: **a Fase 0 do
> Ciclo D**. *Quanto a voz do clipe se parece com a amostra?* — é medição, não suposição,
> e ela precede o desenho como a Fase 0 do Ciclo 3 precedeu a Máquina.

### Caminho B — o clipe mudo + TTS + lipsync (o que já temos)

1. **ElevenLabs TTS** com o `voice_id` da ficha → o áudio da fala
2. **`fal-ai/kling-video/lipsync/audio-to-video`** → o clipe mudo ganha a boca certa

**Preço citado, a verificar:** **US$ 0,014 por 5 s**, ~12 min de processamento
*(fonte: fal)*.

### O que fica de fora, e por quê

**A voz nativa do Kling.** Ela só fala **zh/en** e **traduz** o resto — quer dizer, um
roteiro em pt-BR sairia noutro idioma. Para um produto cujo público é TikTok Shop
brasileiro, isso não é limitação: é o motor errado.

---

## 4. Onde "dar voz" mora no fluxo

**É uma etapa da Máquina, entre *Animar* e *Montagem*.**

```
Gerar imagens  →  Aprovar  →  Animar  →  [ Dar voz ]  →  Montar
```

E o mecanismo de substituição **já existe**: o clipe com voz substitui o mudo **pelo
mesmo caminho da D7** — o `↻` que troca o clipe de uma cena, com a cadeia do
"desatualizado" acendendo sozinha por comparação de colunas, não por bandeira guardada.
*Nada de mecanismo novo: a D7 foi desenhada em 28/08 para exatamente esta forma de
problema.*

---

## 5. ⚠️ Uma regra a criar ANTES do primeiro `voice_id`

> **Só voz sintética desenhada, ou gravada com consentimento.**

Ela precisa existir **antes** de o primeiro `voice_id` entrar no banco, e não depois. É a
irmã da invariante 7 — *personagens 100% sintéticos, nada de face swap de pessoas reais*
— aplicada ao que a voz tem de específico: **clonar uma voz é mais fácil e menos visível
que clonar um rosto**, e um `voice_id` no banco não diz de onde veio.

Ela entra no [`CLAUDE.md`](../CLAUDE.md) como invariante quando o Ciclo D abrir.

---

## 6. Candidatos a linha do Catálogo — **registrar, não criar**

| candidato | capacidade | preço |
|---|---|---|
| **ElevenLabs** | TTS com `voice_id` | **por caractere** |
| **`fal-ai/kling-video/lipsync/audio-to-video`** | lipsync | **US$ 0,014 / 5 s** *(fonte: fal, a confirmar)* |
| **Seedance 2.5** (Together AI · Replicate · BytePlus) | take com **fala nativa** e referência de áudio | **oficial a verificar na página do provedor** |

---

## 7. 📌 REQUISITO PARA O PLANO DO CATÁLOGO

O catálogo precisa carregar **capacidades como dado**, não só preço:

- **fala nativa** — e **quais idiomas** (é o que elimina o Kling deste caminho)
- **referência de áudio** — aceita `[Audio1]`?
- **lipsync**
- **`voice_id`** — o modelo tem vozes nomeadas?

**Sem isso, escolher o motor de uma cena com fala vira `if` espalhado pelo código** — que
é exatamente o que a invariante 2 existe para impedir. O mesmo requisito está registrado
em [`notas-modo-take.md`](./notas-modo-take.md) §7, porque os dois ciclos dependem dele.
