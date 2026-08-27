# Plano — Mini-ciclo: Faxina de Egress

> **Status:** **plano aprovado pelo Jorge em 27/08/2026.** As duas decisões que
> ele esperava estão respondidas — `sharp` declarado (§1.1) e `Map` em memória
> (§3.2). **Fase 0 autorizada.**
> **Aberto em:** 27/08/2026, antes do Ciclo 3 (a Máquina).
> **Regra 9:** este arquivo existe **antes** do primeiro commit de código deste
> plano. O commit e o diário guardam o *porquê*; este arquivo guarda **onde
> estamos e o que falta**.

---

## O problema em duas linhas

O egress bateu **170% da cota free por dois ciclos seguidos**, e a galeria leva
**~5 s por imagem** para pintar. A causa provável — e as medições abaixo já
confirmam a maior parte dela — é que **o produto nunca teve miniatura**: um
quadro de 175 px na tela recebe o arquivo original de 1,8 MB, e recebe **de novo
a cada visita**, porque a URL assinada muda a cada assinatura e por isso nenhum
cache — nem do navegador, nem do CDN — jamais acerta.

---

## O que já está medido (fatos, não diagnóstico)

Tudo abaixo foi lido do banco e do código em 27/08/2026, antes de escrever o
plano. É o que sustenta as fases.

### O acervo

| | n | total | média | maior |
|---|---|---|---|---|
| imagens geradas | 40 | **72 MB** | **1,84 MB** | **7,57 MB** |
| imagens enviadas | 14 | 1,5 MB | 111 KB | 237 KB |
| vídeos | 3 | 12 MB | 3,98 MB | 4,41 MB |
| **total** | **57** | **85 MB** | | |

Toda imagem gerada é JPEG. **51 dos 52 JPEGs têm `width` e `height` nulos** — o
caminho de geração nunca gravou dimensão. Isso não quebra nada hoje, mas
significa que **o gerador de miniatura não pode perguntar ao banco qual é o
tamanho**: ele lê dos bytes, que é o que o `sharp` faz de graça.

> ⚠️ **Corrigido pela Fase 0.** Esta seção chegou a dizer que a maior dimensão
> era 960×960, lido de `assets.width/height` — mas com 51 linhas nulas **o banco
> não sabia**, e um `max()` sobre quase-tudo-nulo não é uma medição. Medidas no
> navegador, as imagens são de classe 2K: **1856×2304** e **2752×1536**. O
> diagnóstico preliminar estava **certo sobre as dimensões**; só o peso em bytes
> estava superestimado. Fica registrado porque é o mesmo erro que o plano acusa
> no diagnóstico inicial — **afirmar sobre um campo que ninguém preencheu.**

### A conta que fecha o diagnóstico

A galeria pagina de **24 em 24** (`GALLERY_PAGE_SIZE`), num grid de 6 colunas
dentro de `max-w-6xl` — **~175 px de lado** por quadro. Cada visita à galeria,
portanto:

```
24 imagens × 1,84 MB  ≈  44 MB por visita
```

Cota free: 5 GB/mês. A 170% são ~8,5 GB, ou seja **~193 visitas de galeria** no
período. Com Fast Refresh recarregando a página a cada edição, esse número é
plausível sem nenhuma outra explicação. **O diagnóstico fecha na aritmética.**

Com miniatura de ~50 KB: `24 × 50 KB ≈ 1,2 MB` — **corte de 97%**. Com URL
estável e cache imutável, a **segunda** visita custa **zero**.

### As três causas, no código

| # | Causa | Onde | Evidência |
|---|---|---|---|
| 1 | **Não existe miniatura.** O original vai para um quadro de 175 px. | `src/components/ui/image-grid.tsx` e os 14 arquivos com `<img>` | Zero uso de `next/image` no projeto inteiro — todo `<img>` cru apontando para o original |
| 2 | **A URL muda a cada assinatura.** O token é um JWT com o relógio do servidor dentro; duas assinaturas do mesmo caminho dão duas URLs. URL diferente = chave de cache diferente = **miss garantido** no navegador e no CDN. | `SIGNED_URL_TTL_SECONDS = 3600` em `lib/assets/actions.ts`, `lib/generation/history.ts`, `lib/entities/image-actions.ts`, `lib/projects/queries.ts` | É isto que explica **cached egress em 5%** |
| 3 | **`cacheControl` é o default.** Nenhum dos 6 pontos de upload passa a opção. | `max-age=3600` em **100%** dos objetos do bucket, lido de `storage.objects` | Nenhum `upload()` do repositório passa `cacheControl` |

### O achado que muda a forma do plano

**Os itens 2 e 3 do briefing são um item só.** `cacheControl: immutable` sem URL
estável **não faz absolutamente nada**: tanto o cache do navegador quanto o
Cloudflare na frente do Storage indexam pela URL inteira, query incluída. Token
novo → chave nova → o `max-age` de um ano nunca é consultado. Eles têm que
chegar **juntos**, ou o header é peso morto. Por isso os dois viraram a **Fase
3**, e não duas fases.

### O que já está disponível e não custa nada

- **`sharp` 0.35.3 já está em `node_modules`** — é `optionalDependency` do
  `next@16.3.0`, e está no lockfile marcado `"optional": true`. Declará-lo em
  `package.json` **não baixa um byte novo** nem acrescenta uma árvore
  transitiva: é promover o que já está instalado. Ainda assim é "dependência
  nova" pela divisão de autonomia — **autorizado pelo Jorge em 27/08/2026.**
- **`createSignedUrls` devolve erro por caminho**, com `signedUrl: null` quando
  o objeto não existe (conferido em `@supabase/storage-js/dist/index.cjs`,
  linhas 1111-1124). Ou seja: **dá para perguntar "existe miniatura?" na mesma
  viagem que já assina** — sem requisição extra e sem 404 no navegador.
- **As políticas do bucket já cobrem a miniatura.** As quatro políticas de
  `storage.objects` casam por `storage.foldername(name)[1]`, o primeiro nível de
  pasta, que é o UUID do dono. Um arquivo em
  `<user>/canvas/<projeto>/<uuid>.jpg.thumb.webp` está coberto por SELECT,
  INSERT, UPDATE e DELETE **sem tocar em política nenhuma**.

### O que **não** foi possível confirmar, e por quê

O briefing pede confirmar no Logs Explorer quais objetos dominam o egress real.
**Não dá.** A janela de consulta de logs do Supabase é de **24 horas**, e nas
últimas 24 h o app esteve parado: os 6 registros de `edge_logs` são `auth/token`
e o websocket do Realtime, **nenhuma requisição de Storage**.

Isso é um achado, não uma desculpa: **registro que expira em 24 h não serve de
baseline retroativo.** A confirmação vira trabalho da Fase 0 — produzir a visita
e ler o log dela, no mesmo dia.

---

## Missão e régua

Cortar o egress de navegação em ~99% e a galeria pintar quase instantânea, **sem
tocar na qualidade dos originais**.

A régua desta faxina é a mesma do produto — [critério do fluxo
curto](produto.md): **nenhuma fase pode acrescentar um passo ao fluxo do
usuário.** Uma faxina que cobra um clique a mais não é faxina, é troca.

---

## Os cinco requisitos inegociáveis

Herdados do briefing, e valem em todas as fases:

1. **Qualidade inviolável.** O original fica intacto, byte a byte. A miniatura é
   um derivado **a mais**, nunca uma substituição. Download entrega o original.
2. **Caminho determinístico, não coluna nova.** A miniatura de `p` é
   `p + ".thumb.webp"` — função pura do caminho, sem parsing, sem migration.
3. **Miniatura que falha não bloqueia geração paga.** Falha de derivado é clima:
   cai para o original e a geração segue. Nada de exceção subindo por causa de um
   arquivo de 50 KB.
4. **A prova tem número dos dois lados** — antes e depois, medidos, nunca
   sentidos.
5. **Zero Spark em toda a validação.** Nada encosta em `generations` nem no
   ledger.

---

## Fora do escopo (dito para não voltar como pergunta)

Armazenamento local custom (IndexedDB/blobs), service worker, modo offline, o
"cadeadinho" de fixar geração (backlog), transcodificação de vídeo, qualquer
mudança nos originais, e qualquer coisa que acrescente passo ao fluxo.

---

## As cinco fases

| Fase | Entrega | Status |
|---|---|---|
| **0** | A régua: medir antes de mexer, e responder as três perguntas em aberto | ✅ **fechada — 27/08/2026** (§0.5) |
| **1** | A miniatura nasce — e o acervo ganha as suas | ✅ **fechada — 27/08/2026** (§1.7) |
| **2** | A tela lê a miniatura — o corte de 97% aparece | ✅ **fechada — 27/08/2026** (§2.3) |
| **3** | A URL estável e o cache imutável, que só funcionam juntos | ⬜ não iniciada — **confirmada pela 0.1** |
| **4** | A prova consolidada e o fechamento | ⬜ não iniciada |
| **5** | **A assinatura em lote no canvas** — 66 chamadas em fila, 13,17 s | ✅ **aprovada em 27/08/2026, entra no ciclo** |

---

## Fase 0 · a régua — medir antes de mexer

**Zero código.** Produz os números do "antes" e responde o que decide a forma das
fases seguintes. Sem esta fase, a Fase 4 não tem com o que comparar — e "ficou
mais rápido" sem número é exatamente o que este projeto não aceita.

### 0.1 A pergunta que decide se a Fase 3 existe

**Duas assinaturas do mesmo caminho dão a mesma URL?**

O raciocínio diz que não (o token carrega o relógio do servidor), e o "cached
egress em 5%" concorda. Mas **raciocínio não é medição**, e esta custa dez
segundos: chamar `signAssetUrls` duas vezes para o mesmo asset, com alguns
segundos de intervalo, e comparar as strings.

- **Diferentes** → a Fase 3 existe como escrita.
- **Iguais** → a Fase 3 encolhe para só o `cacheControl`, e o plano é corrigido
  aqui antes de qualquer código.

### 0.2 O baseline da galeria

`/galeria` com o cache do navegador **limpo**, DevTools → Network:

- total transferido na visita (o número que vira "antes");
- tempo até a última imagem pintar;
- **por imagem**: TTFB e tempo de transferência, separados.

### 0.3 O baseline do canvas — e a decomposição dos 5 s

Mesma medição no `/studio` com um projeto que tenha vários resultados.

Aqui há **duas hipóteses concorrentes** para os "~5 s por imagem", e a medição
tem que separá-las — o plano não pode pré-julgar:

| Hipótese | Como se reconhece |
|---|---|
| **Banda.** 44 MB dividido em 6 conexões paralelas: cada imagem leva segundos porque disputa a mesma banda. | TTFB baixo, **tempo de transferência alto** |
| **Assinatura serializada.** Cada node chama `signAssetUrls([um id])` por conta própria — N nodes, N idas ao servidor, e Server Actions do Next entram numa fila. O último espera a soma de todos. | **TTFB alto e crescente** por node, transferência curta |

As duas têm conserto diferente: a primeira é a miniatura (Fases 1-2), a segunda é
uma assinatura em lote no canvas. **Se a segunda aparecer, ela entra no plano
como fase nova** — e é por isso que a medição vem antes.

### 0.4 A confirmação no log

Logo após a visita da 0.2, ler `edge_logs` da **mesma janela** e confirmar quais
objetos dominaram o tráfego. Confirma o diagnóstico no fato, não no palpite — que
é o item (a) do briefing, pago no único momento em que a janela de 24 h permite
pagá-lo.

### Prova da Fase 0

`scratchpad/evidencias/egress-fase0/`

| # | Arquivo | O que prova |
|---|---|---|
| 1 | `01-duas-assinaturas-mesmo-caminho.png` | As duas URLs lado a lado — iguais ou diferentes |
| 2 | `02-baseline-galeria-total-transferido.png` | O total em MB de uma visita à galeria, cache limpo |
| 3 | `03-baseline-galeria-por-imagem.png` | TTFB e transferência separados, por imagem |
| 4 | `04-baseline-canvas.png` | O mesmo no studio — e qual das duas hipóteses o TTFB acusa |
| 5 | `05-edge-logs-da-visita.txt` | Os objetos que dominaram, lidos do log da mesma janela |
| 6 | `numeros-antes.md` | Os números transcritos, que a Fase 4 vai comparar |

### 0.5 O que a Fase 0 achou — fechada em 27/08/2026 ✅

Números completos em
`scratchpad/evidencias/egress-fase0/numeros-antes.md`. **Zero Spark, zero linha
em `generations`, zero lançamento no ledger.**

**0.1 — as URLs mudam, todas.** 24 caminhos comparados entre duas visitas, **24
tokens diferentes, nenhum igual**. O payload decodificado é
`{url, scope, iat, exp}` com `exp − iat = 3600`: o `iat` é o relógio do servidor
no instante da assinatura, e é por isso que a URL nunca se repete. **A Fase 3
existe como escrita.**

**0.2 — a galeria é BANDA.** 22 MB por visita (21 imagens), **20 de 20
requisições sobrepostas**, janela de 1,74 s, **mediana de 1.164 ms por imagem**.
Hoje deu 1,74 s porque a conexão da medição está a ~100 Mbps; **os bytes são a
invariante, a banda não é** — em 20 Mbps os mesmos 22 MB levam ~9 s e cada imagem
aparenta ~5 s. A medição não contradiz o relato do Jorge: explica-o.

**0.3 — o canvas é FILA, e é outra doença.** A segunda hipótese apareceu:

| | |
|---|---|
| Server Actions numa carga | **66** |
| folga mediana entre uma e a seguinte | **1 ms** (60 de 65 abaixo de 5 ms) |
| soma das durações ÷ janela real | 13,03 s ÷ 13,17 s = **razão 1,01** |
| TTFB de cada chamada | 111 ms — **cada uma é rápida** |
| última imagem do canvas | **16,50 s** |

Razão 1,01 é fila perfeita: paralelas, a janela seria ≈ a maior chamada
(~300 ms). **Nenhuma miniatura conserta isto** — o gargalo não são os bytes, é o
número de idas ao servidor. Por isso virou a **fase proposta 5**, e não entrou de
carona: o plano dizia que se essa hipótese aparecesse, ela voltaria para o Jorge.

**0.4 — a proporção, que é o defeito.** Caixa de **173 px**, DPR **1**, imagens
de **1856×2304** e **2752×1536**: **56× de desperdício em área na média**, 143×
no pior caso.

#### As duas armadilhas de instrumento, registradas porque quase viraram achado

**O `transferSize` mente por omissão.** A primeira leitura devolveu
`transferSize: 0` nos 34 recursos, e a conclusão natural — *"34 de 34 servidos do
cache"* — teria sido **exatamente o contrário da verdade** num plano cujo tema é
cache. Denunciou-se pela inconsistência interna: `total_ms 1535` com
`baixando_ms 7465`. Causa: cross-origin **sem `Timing-Allow-Origin`** zera
`transferSize`, `encodedBodySize` e `responseStart`. Só `startTime`, `duration` e
`responseEnd` sobrevivem.

Consequência que fica para as fases seguintes: **do lado do navegador não existe
instrumento que confirme o "cached egress"** — quem tem esse número é o painel do
Supabase. A prova da Fase 3 tem que ser feita com o que é legível: a **URL
idêntica** entre duas visitas e a ausência de requisição.

**O 503 que não era erro.** O log de rede mostrou **16 requisições 503** para 3
vídeos. Antes de virar achado, foi conferido: `fetch` direto nos mesmos URLs
devolveu **206 em todos**, concorrente e sequencial. É como o log marca
requisição de mídia **abortada** — `preload="metadata"` pede, recebe o `moov` e
cancela. Não é erro de servidor.

*(De quebra: o `moov` destes MP4 está no início e tem ~5,6 kB, então
`preload="metadata"` puxa muito pouco. **O pôster de vídeo move ainda menos o
ponteiro do que a §1.5 estimava** — continua barato pela regra única, mas a
ressalva de "menor metade" fica mais forte, não mais fraca.)*

---

## Fase 1 · a miniatura nasce — e o acervo ganha as suas

Nada muda na tela nesta fase. O que ela entrega é **o derivado existindo e estando
correto** — provável olhando os arquivos, sem depender de nenhuma mudança de
interface. Se a miniatura estiver errada, quero descobrir isso aqui, e não junto
com um bug de layout.

### 1.1 A dependência — o ok do Jorge

`sharp` entra em `package.json` como dependência declarada. Como está escrito
acima, isso **não baixa nada**: a versão 0.35.3 já está instalada como
`optionalDependency` do Next. Mas depender de um pacote que só existe por ser
opcional de outro é frágil — `npm i --no-optional` derrubaria a geração de
miniatura sem aviso. **Declarar é honestidade, não custo.**

> ✅ **Autorizado pelo Jorge em 27/08/2026:** *"já está no disco, declarar é
> formalizar."*

### 1.1b O oportunista de uma linha — `width`/`height`

O `sharp` **já vai decodificar** cada imagem para produzir a miniatura, e nesse
ponto as dimensões estão na mão. Foi a ausência delas (51 de 52 nulas) que
produziu o "960×960" errado do plano.

**A regra que decide, dita antes de olhar o código: se gravar custar uma linha,
grava; se custar mais que uma linha, vira backlog.** Fase enxuta continua valendo
— um derivado oportunista não pode virar sub-projeto, e "seria bom ter" não é
critério.

### 1.2 A regra do caminho

```
thumbPath(p) = p + ".thumb.webp"
```

Função pura, total, sem parsing. **Acrescenta, nunca substitui a extensão** —
trocar `.jpg` por `.webp` colidiria se dois assets diferissem só na extensão. E
uma guarda barata no upload de original: **um caminho de original nunca pode
terminar em `.thumb.webp`**.

Sem coluna, sem migration, sem política nova — pelos motivos já medidos acima.

### 1.3 O formato

| | |
|---|---|
| formato | **WebP** |
| lado maior | **512 px** |
| qualidade | ~72 |
| alvo | **~50 KB** |

512 px porque o maior consumidor é o grid — **medido na Fase 0 em 173 px de
largura, em tela de DPR 1**. 512 cobre com folga, serve os cards maiores do
canvas e aguenta uma tela DPR 2 sem reamostrar para cima. *(O plano assumia DPR 2
e 175 px; a Fase 0 mediu 1 e 173. A escolha não muda — mas agora é medida.)*

### 1.4 Os dois produtores — e por que são dois

Cada produtor faz a miniatura **onde os bytes já estão**, e por isso nenhum dos
dois gasta um byte de egress a mais:

| Produtor | Para quê | Onde |
|---|---|---|
| **servidor, com `sharp`** | imagem **gerada** — o servidor já tem os bytes na mão para subir o original | `lib/generation/canvas-generate.ts`, `lib/generation/actions.ts` |
| **navegador, com canvas** | imagem **enviada** — o arquivo vai do navegador direto ao bucket, sem passar pelo servidor | `reference-picker.tsx`, `canonical-images-column.tsx`, `extraction-panel.tsx` |

Um produtor só custaria um download: fazer a miniatura da gerada no navegador
exigiria baixar 1,8 MB que o servidor já tinha; fazer a da enviada no servidor
exigiria baixar do bucket o que o navegador já tinha. **Dois produtores é o
desenho que gasta menos, não o que se repete.**

O tempo do `sharp` (redimensionar um JPEG de 2,5 MB para 512 px WebP) fica na casa
de 100 ms, dentro de um `maxDuration = 60` que já abriga a geração inteira. **A
Fase 1 mede esse tempo e registra** — é o item (b) do briefing.

### 1.5 O pôster de vídeo, pela mesma regra

O pôster de um vídeo é **a miniatura do caminho do vídeo** — `<path>.thumb.webp`,
exatamente a mesma função. Assim o consumidor da Fase 2 não ganha um ramo: ele
pede a miniatura do caminho e desenha um `<img>`, sem saber se por trás havia um
JPEG ou um MP4.

Quem produz é o navegador, com a máquina já provada em `lib/assets/last-frame.ts`
— o mesmo `<video>` + canvas, buscando `t=0` em vez de `duration`. E herda a
restrição já documentada lá: **aba escondida não decodifica**. Por isso o pôster é
**oportunista**: sai quando alguém está olhando, e quando não sai a grade continua
exatamente como hoje, com `<video preload="metadata">`.

> **Meia verdade dita em voz alta:** vídeo é a **menor** metade do ganho — 12 MB
> em 3 arquivos, contra 72 MB em 40 imagens. Está no plano porque o briefing pede
> e porque sai quase de graça pela regra única, não porque move o ponteiro.

### 1.6 O backfill dos 54 arquivos existentes

Uma ação idempotente que, para cada asset de imagem sem miniatura: baixa o
original, gera a miniatura, sobe, e **pula se já existe**.

- **Onde roda:** Server Action chamada de uma tela, **com a sessão do próprio
  Jorge**. Sem `SERVICE_ROLE_KEY`, sem script fora do Next, sem manuseio de
  segredo — o RLS já escopa tudo ao dono.
- **Custo, dito antes:** ~73 MB de egress **uma vez**. É o preço do conserto, e é
  menos de duas visitas à galeria de hoje.
- **Ela fica.** Idempotente, é a ferramenta de reparo para o requisito 3: quando
  uma miniatura falhar em nascer, rodar de novo é o guarda-chuva.
- **Só acrescenta.** Nunca escreve num caminho que não termine em `.thumb.webp`.
  O requisito 1 é garantido pela forma da função, não pela lembrança de quem a
  chama.

### Prova da Fase 1

`scratchpad/evidencias/egress-fase1/` — entre outros: a listagem do bucket
mostrando original e `.thumb.webp` lado a lado com os dois tamanhos; o original
baixado **antes e depois** com o mesmo SHA-256 (o requisito 1 provado, não
afirmado); o tempo do `sharp` medido; o backfill com 54/54 e a segunda execução
pulando todas.

### 1.7 O que a Fase 1 entregou — fechada em 27/08/2026 ✅

Números completos em `scratchpad/evidencias/egress-fase1/numeros-fase1.md`.
**Zero Spark, zero linha em `generations`, zero lançamento no ledger.**

| | originais | miniaturas |
|---|---|---|
| arquivos | 58 | **55** |
| peso total | **85 MB** | **1.069 kB** |
| média | 1.530 kB | **20 kB** |
| `cacheControl` | `max-age=3600` | **`max-age=31536000`** |

**20 kB de média contra os ~50 kB projetados** — o alvo caiu com folga.

**Requisito 1, provado e não afirmado:** **0 de 57 originais** modificados nas
duas horas do backfill; o mais recente é do dia anterior. Só acrescentou.

**Backfill:** 54 de 54, **zero falhas**, **73,5 MB** baixados uma vez — a
previsão do plano era ~73 MB. A quarta execução pulou todas as 54 e baixou
**zero byte** em 0,2 s: a idempotência que faz dela também a ferramenta de
reparo.

#### O bug de orientação, barrado antes de embarcar

`metadata()` do sharp **ignora a orientação EXIF mesmo com `autoOrient: true`**:
num JPEG de 2000×1200 com `orientation: 6`, responde 2000×1200 enquanto a imagem
é vista 1200×2000. O correto é `metadata().autoOrient`.

**E a armadilha é que a miniatura já saía certa** — a rotação é aplicada no
pipeline. Nada na tela denunciaria: só a coluna `width` ficaria com largura e
altura trocadas, em silêncio, para sempre. Uma foto de celular em pé gravada
como paisagem. Achado porque a afirmação foi **medida em vez de lida**, com uma
imagem de teste construída para falhar.

#### O oportunista do `width`/`height` veio partido em dois

A regra era *uma linha entra, mais que isso vira backlog*. A resposta se partiu,
e o motivo é uma propriedade do banco: **`assets` não tem política de UPDATE** —
só SELECT, INSERT e DELETE. Com RLS default-deny, o `update` que eu havia escrito
no backfill afetou **zero linhas e não reclamou**. Descoberto porque a coluna foi
conferida depois de rodar, em vez de confiar no "best-effort" que eu mesmo
escrevi.

| | custo | resultado |
|---|---|---|
| **imagens novas** (INSERT) | uma linha, sem política | ✅ **entrou** — provado por upload real: 1600×2400 gravados |
| **52 linhas antigas** (UPDATE) | migration criando política | ⬜ **backlog** |

E o backlog não é só por custo: **uma linha de `assets` é o registro de um
arquivo que existe, e é escrita uma vez.** A política trocaria uma imutabilidade
deliberada por um dado cosmético. O `update` morto foi removido.

#### O pôster de vídeo — ❌ **cortado pela medição, não por escopo**

A §1.5 já o chamava de "menor metade". A Fase 0 mediu o `moov` destes MP4 em
**~5,6 kB, no início do arquivo** — o `preload="metadata"` que a grade já usa
puxa quase nada. O pôster custaria um caminho de upload oportunista com
tratamento de aba escondida, para economizar quilobytes.

> ❌ **Cortado pelo Jorge em 27/08/2026**, e a forma importa: o item era do
> **briefing dele**, e foi a **Fase 0 que o desautorizou**. Ninguém decidiu que
> era muito trabalho — a medição mostrou que o ganho não existia.
> **O briefing propõe, a medição dispõe.**

---

## Fase 2 · a tela lê a miniatura

Onde o corte de 97% aparece.

### 2.1 A regra do consumidor

**Grade, faixa, cards do canvas e recentes → miniatura.
Clique, zoom e download → original, sempre.**

O `signAssetUrls` passa a assinar **os dois caminhos** por asset numa viagem só —
o que é possível de graça porque `createSignedUrls` já responde por caminho e diz
`null` para o que não existe. Sem miniatura, a resposta traz o original e a tela
não sabe a diferença: **é o fallback do requisito 3, e ele mora na forma da
resposta, não num `try`.**

### 2.2 Os consumidores

`ImageGrid` (galeria e seletor de referências, os dois únicos usos), e os cards:
`input-image-node`, `input-pose-node`, `input-product-node`, `input-sheet-node`,
`result-node`, `result-grid`, `result-frame`, `reference-strip`, `project-card`,
`canonical-images-column`, `identity`, `video-generator-node`.

O `Lightbox` e o `signAssetDownload` **não mudam** — eles são o lado do original,
e o requisito 1 é justamente que eles continuem sendo.

### 2.3 O que a Fase 2 entregou — fechada em 27/08/2026 ✅

Números completos em `scratchpad/evidencias/egress-fase2/numeros-fase2.md`.
**Zero Spark, zero linha em `generations`, zero lançamento no ledger.**

**Os mesmos 21 arquivos que a Fase 0 mediu:**

| | bytes | |
|---|---|---|
| antes (originais) | 23.101.806 | **22,03 MB** |
| depois (miniaturas) | 479.392 | **468 kB** |
| | | **corte de 97,92%** — 48× menos |

O plano prometia ~97%. Entregou **97,92%**.

**O que a tela de fato pediu:** galeria 21 miniaturas e **zero** `.jpg`
original; canvas 24 miniaturas e **zero** `.jpg` original; **zero imagens
quebradas** nas duas. As não-miniaturas são todas `.mp4` — os 3 vídeos, que não
têm miniatura.

**Tempo, como ilustração e não como régua** (o método do diário: bytes são a
invariante, a banda não é): janela de download 1,74 s → **0,76 s**; mediana por
imagem 1.164 ms → **170 ms**.

**Requisito 1, as duas metades numa tela só:** com o Lightbox aberto sobre a
grade, o zoom pede **o original `.jpg` em 2752×1536** e a grade atrás pede
miniatura em 412×512.

**A varredura que importava** — nenhuma URL de exibição vazou para caminho de
geração paga:

| caminho | lê | |
|---|---|---|
| referências que vão ao provedor (`asset-payloads.ts`) | `download(storage_path)` no servidor | ✅ intocado |
| download do usuário (`signAssetDownload`) | `createSignedUrl(storage_path)` | ✅ intocado |
| extração do último quadro | `.full`, explícito | ✅ matéria-prima, não miniatura |

**O que ela não consertou, e já se sabia:** o canvas continua em **15,24 s** com
as **66 Server Actions em fila**. Miniatura corta bytes; o gargalo do canvas é
contagem de idas. É a Fase 5.

---

## Fase 3 · a URL estável e o cache imutável

Só funcionam juntos, pelo motivo já explicado: cache indexa por URL.

**Depende do resultado da Fase 0.1.** Se as URLs vierem iguais, esta fase encolhe.

### 3.1 O par

| | hoje | depois |
|---|---|---|
| TTL da assinatura | 1 h | **7 dias** |
| `cacheControl` no upload | `max-age=3600` (default) | **`max-age=31536000, immutable`** |
| a URL entre duas visitas | muda | **a mesma, enquanto valer** |

`immutable` é literalmente verdade aqui: um asset nosso **nunca** muda de conteúdo
— o caminho carrega um UUID e uma segunda geração é um arquivo novo. É o caso de
livro para esse header.

### 3.2 Onde a URL fica guardada — a decisão que é do Jorge

Para reusar a URL é preciso guardá-la. Três caminhos, e eu recomendo o primeiro:

| | Como | A favor | Contra |
|---|---|---|---|
| **A — `Map` no módulo do servidor** ✅ *recomendado* | cache em memória por `storage_path`, reusado até 80% da validade | zero migration, zero risco: quando erra, entrega uma URL nova — que é o comportamento de hoje | acerto depende da instância estar quente; em **localhost o acerto é 100%**, e isso pode fazer a medição parecer melhor do que a produção |
| **B — tabela `asset_signed_urls`** | `(storage_path, signed_url, expires_at)` | acerto ~100%, independente de instância | migration, e uma tabela nova para um dado descartável |
| **C — bucket público só de miniaturas** | sem assinatura nenhuma, URL eterna, CDN perfeito | de longe o mais simples e o mais rápido | **a miniatura deixa de ser privada.** URL não adivinhável é obscuridade, não controle de acesso |

**Minha recomendação: A, medido.** Se o acerto medido em produção decepcionar, B
entra depois — e aí é uma migration pequena que o Jorge aplica pelo ritual.

**Sobre C, sou explícito em recomendar contra**: o produto inteiro existe para
gerar o rosto de uma influencer que é da pessoa. Uma miniatura vazada é uma imagem
vazada, e "ninguém vai adivinhar o UUID" não é uma política de segurança. Está na
tabela porque o Jorge tem que saber que a opção existe — não porque eu ache que
devemos.

> ✅ **Decidido pelo Jorge em 27/08/2026: A — `Map` em memória.** E a advertência
> da linha "contra" continua valendo: **a medição de localhost vai mentir a
> favor.** A prova desta fase tem que ser lida com isso na mão.
>
> **C foi visto e recusado**, com a razão registrada em
> [`decisoes.md`](decisoes.md): *"ninguém adivinha o UUID" não é política de
> segurança para o rosto de uma influencer que é da pessoa.* Fica escrito para
> quem reencontrar a ideia daqui a seis meses saber que ela não foi esquecida —
> foi recusada.

### Prova da Fase 3

Duas visitas seguidas à galeria com o cache **ligado**: a segunda tem que
transferir **perto de zero**, com as imagens marcadas como servidas do cache. E a
mesma URL, copiada das duas visitas, idêntica caractere a caractere.

---

## Fase 4 · a prova consolidada e o fechamento

Uma tabela só, os mesmos instrumentos, os dois lados:

| Métrica | Antes (Fase 0) | Depois | Corte |
|---|---|---|---|
| MB por visita à galeria (cache limpo) | | | |
| MB por visita à galeria (cache quente) | | | |
| tempo até a última imagem pintar | | | |
| MB por carga do studio | | | |

Mais: `docs/decisoes.md` com a entrada datada, este arquivo com os status
fechados, e o commit + push com a saída de `git log origin/master -1` colada no
resumo.

---

## Fase 5 · a assinatura em lote no canvas  ✅ aprovada

**Não estava no plano.** Nasceu da Fase 0.3, e está aqui em vez de ter entrado de
carona porque o plano dizia, antes de medir, que se esta hipótese aparecesse ela
**voltaria para o Jorge** como fase proposta.

> ✅ **Aprovada em 27/08/2026.** Os três motivos do dono: **(a)** o portão estava
> pré-registrado, então isto é *o plano se honrando, não escopo crescendo* —
> escopo que cresce é o que ninguém previu, e este tinha a condição de disparo
> por escrito; **(b)** 13-16,5 s por abertura de canvas é o território do sinal do
> fundador, e **o Ciclo 3 vai abrir e povoar canvas o tempo todo — construir a
> Máquina sobre fila serializada é multiplicar a espera já reclamada**;
> **(c)** o conserto usa máquina que já existe.

**O fato:** 66 Server Actions numa carga de canvas, em fila perfeita (razão
1,01), somando **13,17 s** antes de a última imagem começar a aparecer — e cada
chamada individual custando só 111 ms. Não é lentidão do servidor: é **contagem
de idas**.

**A causa:** cada card assina por conta própria, `signAssetUrls([um id])` — em
`result-node`, `input-image-node`, `input-pose-node`, `input-product-node`,
`input-sheet-node`, `reference-strip`, `video-generator-node` e `use-portraits`.
A galeria já faz certo: uma assinatura em lote, no servidor, para a página
inteira.

**Por que é fase separada, e não um remendo dentro da Fase 2:** ela não corta
byte nenhum. É a **outra** doença — a galeria sofre de bytes, o canvas sofre de
viagens —, e misturar as duas faria a prova da Fase 2 medir duas coisas ao mesmo
tempo, sem poder atribuir o ganho a nenhuma delas.

**O desenho provável** (a detalhar se o Jorge aprovar): um coletor no store do
canvas que junta os ids pedidos no mesmo tick e faz **uma** chamada, com os cards
lendo do mapa em vez de pedirem sozinhos. O `MAX_IDS = 60` que já existe em
`signAssetUrls` foi escrito para exatamente isto.

> 🟡 **Aguarda decisão do Jorge:** entra neste mini-ciclo, ou vira item de
> backlog para depois do Ciclo 3?

---

## Quem valida o quê

Pela emenda de 11/08/2026 da regra 8: este mini-ciclo é **inteiramente sem
geração** — zero Spark, nada tocando `generations` nem o ledger (requisito 5).
Portanto **o Claude valida no navegador**, com um print por item do roteiro de cada
fase, e o commit espera o ok do Jorge dado sobre os prints.

Duas ressalvas ditas antes:

- O **backfill escreve no Storage remoto**. Só acrescenta arquivos `.thumb.webp`
  e nunca toca em original, mas é escrita em recurso remoto — **peço o ok antes
  de rodar**, não depois.
- Se a Fase 0.3 revelar que a lentidão do canvas é **assinatura serializada** e
  não banda, isso é escopo novo. Ele **volta para o Jorge** como fase proposta, em
  vez de entrar de carona.

---

## O que este mini-ciclo **não** faz

Não toca em nenhum original. Não muda formato, resolução ou compressão do que já
existe. Não acrescenta passo ao fluxo. Não mexe em geração, preço, ledger ou
catálogo. Não implementa o "cadeadinho". E não abre o Ciclo 3 — a Máquina
continua sem plano em disco, e escrevê-lo é a primeira tarefa de quando ele
começar.
