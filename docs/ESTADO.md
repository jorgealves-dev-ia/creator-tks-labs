# ESTADO — onde o projeto está

> **Leia isto primeiro.** Uma página, reescrita **em toda pausa** (regra 9 do
> [`CLAUDE.md`](../CLAUDE.md)). Não é histórico: é o **checklist do projeto agora**.
> O *porquê* está em [`decisoes.md`](decisoes.md); o *o quê e em que ponto* de cada
> frente está no `plano-*.md` dela; o *como está hoje* está no código — e **o lugar de
> tudo isso no mapa inteiro está em [`ROADMAP.md`](ROADMAP.md).**

**Última reescrita:** 16/09/2026, no fechamento do **ROADMAP** — o mapa, a nova arquitetura
e a fila medida até o post publicado.

> # 🗺️ O MAPA EXISTE: [`docs/ROADMAP.md`](ROADMAP.md)
>
> **Esboço inicial: 6 FEITOS · 7 PARCIAIS · 2 NÃO**, em 15 itens.
> **Até o primeiro post publicado pelo sistema: 5 frentes.**
>
> O ROADMAP é o **mapa vivo**: toda frente que fecha atualiza a linha dela lá, no mesmo
> commit do fechamento. **A fila das frentes mora lá (§4)** — este arquivo aponta, não copia.
>
> Árvore limpa, nada esperando validação. *Única prova pendente: o selo da recusa (item 3),
> e ela é **oportunista**.*

---

## O que está PROVADO

**A fundação.** Canvas de nodes, projetos, character sheet com versões congeladas, motor
de extração, compilador determinístico, geração de imagem canônica, ledger append-only
com as travas no banco. RLS em todas as tabelas — **21** em 16/09.

**Frente Storyboard · Ciclo 1 — o elo.** O último quadro de um clipe vira o primeiro do
seguinte, por asset derivado. ⚠️ *O **veredito humano** do elo continua **NÃO MEDIDO com
gatilho**.*

**Frente Storyboard · Ciclo 2 — o Roteiro.** Uma ideia vira fichas de cena estruturadas
no banco. Fechado.

**Frente Storyboard · Ciclo 3 — a Máquina. ✅ ENCERRADO.** A régua percorrida pelo dono:
3 cenas, 870 ⚡, do zero ao clipe — **3 cobranças de vídeo** numa janela de **643 ms**,
**zero reconciliação à mão**. Saldo 4.150 → 3.280.

**Mini-ciclo «O vídeo final» — ✅ FECHADO em 06/09 (`d17a2d8`).** Montagem em JavaScript
puro (`mediabunny`), sem `ffmpeg`: 122 ms contra 202 ms, **0,63 MB contra 75,0 MB**, arquivo
idêntico quadro a quadro. De 3 clipes pagos, **um filme** — e o extrato não se moveu.
`asset_montage_parts` com RLS e escrita só por `record_montage`.

**Frente A′ · o `fix:` do produto — ✅ FECHADA em 07/09. A FOTO CHEGA AO PROVEDOR.**
*Nome não é foto* (decisão de 03/09). **86 asserções estruturais** em cinco fases, e a prova
do dono **do banco, não da tela**: 90 ⚡ — o pior caso R1 exato —, saldo 3.280 → **3.190**.
O `params` de `0cf3f069` traz a foto do card (`06778db7`) na **posição 2**, ao lado da folha
da @luna v4, com `origem: "input"`, `grupo_id` igual ao id do node do card e duas diretivas
de fidelidade.

📌 **A fidelidade NÃO está provada e não era daquela frente** — a imagem saiu com um vestido
onde a foto é uma blusa, e a causa tem endereço: a palavra «blusa» nunca chegou ao modelo.
→ *o que está ABERTO*, item 1 — **é a frente 1 do ROADMAP.**

**Dois fatos provados ao vivo, de graça:** **recusa de provedor não debita** (`a10f13c0`,
`cost_charged_cents = 0`, fora do ledger); e **o filtro que barrou é do Google, verbatim**
(`google.ts:258` põe o prefixo, o resto é o corpo da resposta, sem reescrita).

**Mini-ciclo Egress.** Fases 0 a 5 fechadas, em produção.

**Dinheiro, depois do incidente de 29/08.** As quatro travas do motorista, cada uma com
simulação vermelha→verde reexecutável; a fechadura ED25519 do webhook; a trava de vida do
endereço de retorno.

**O «incidente dos vínculos» — ✅ ENCERRADO em 06/09: era artefato de medição.** Em aba que
o Chrome nunca pintou, o React Flow não desenha aresta nenhuma, com o store cheio. A lição
virou **mecanismo**: `scratchpad\harness\medir-canvas.js` recusa número de canvas não
pintado (regra 8 do [`CLAUDE.md`](../CLAUDE.md)). **Toda afirmação sobre o store lê o store.**

**Documentação para qualquer agente.** `AGENTS.md` como ponteiro para o `CLAUDE.md`,
`README.md` como mapa, `.gitattributes` fixando o EOL.

**O mapa — 16/09.** [`ROADMAP.md`](ROADMAP.md): o inventário lido do código e do banco, o
esboço item a item, **a arquitetura decidida pelo dono** — um núcleo; Estúdio, Modo Rápido e
MCP como superfícies; Publicação como módulo — e **a fila até o post publicado**, que
**substitui a de 02/09**. O porquê, e as correções feitas antes do commit, em
[`decisoes.md`](decisoes.md), 16/09.

---

## O que a Fase 0 do vídeo descobriu e ainda não virou código

Três achados medidos — o detalhe no §4.1 do [`plano-video-final.md`](plano-video-final.md):

1. **A ordem das cenas ≠ a ordem de criação das gerações.** Montar por `created_at` entrega
   o filme fora de ordem, **e o erro só aparece no vídeo**.
2. **O banco não sabe o que os arquivos são.** `assets.width`/`height` estão vazios em
   **35 de 35 vídeos e em 39 de 48 imagens** *(medido em 16/09 — antes se sabia só dos
   vídeos)*. É a mesma lacuna que a frente 3 do ROADMAP encontra: não há pixel do canal sem
   saber o pixel do arquivo.
3. **Nenhuma biblioteca recusa clipe incompatível sozinha.** A trava é nossa — e recusar
   custa zero.

---

## O que está ABERTO

| # | o que falta | quem fecha |
|---|---|---|
| 1 | **🎯 O produto diz o que é — a frente 1 do ROADMAP.** A foto chega e o modelo desenhou um **vestido**: a palavra «blusa» **nunca entrou no texto**. O nome do card viaja como `grupo.rotulo`, **metadado de auditoria**; a descrição do card estava **vazia**; e o Roteiro escreveu *"a barra da peça"* — `hem`, vocabulário de vestido. Dois caminhos, não excludentes: **(a)** o nome do card vira **palavra no prompt**; **(b)** a descrição **nasce com valor padrão derivado do nome**. | plano |
| 2 | **Apagar asset da galeria, com auditoria de referências** — o botão não existe. Os triggers de 04/09 já tornam o apagamento **seguro**; falta **a tela** e **a auditoria da imagem usada como referência**, que mora no `data` de um node dentro do `graph` e **não tem FK**. **0 ⚡.** → §9 do [`plano-video-final.md`](plano-video-final.md). *Fora do caminho do post — fica atrás das cinco frentes, salvo decisão do dono.* | Claude |
| 3 | **O selo «bloqueada pelo filtro do Google» nunca foi visto em tela.** Ele só aparece quando a **última** imagem de uma cena é uma recusa — e a única recusa do banco (`a10f13c0`, 07/09) foi seguida de uma geração boa 58 s depois. **Desde 08/09, zero gerações** (medido em 16/09). Provocar uma recusa custaria **75 ⚡ se o filtro deixar passar**. **Decisão do dono, 07/09:** *a próxima recusa numa geração que ele faria de qualquer forma fecha esta prova, com 0 ⚡ extra.* Até lá valem a tabela-verdade (13/13) e os dois elos do dado conferidos no banco. | oportunidade |
| 4 | **Egress §4.5** — o egress na fatura, esperando o gráfico de Usage. | o relógio |
| 5 | **Perguntas com gatilho:** a **0.3** (a aba escondida trava o elo?) — falta medir o **percurso completo** com a aba atrás; **recusa × concorrência** (n ≥ 30); e **a trava de dono da linhagem, provada de um lado só** — o gatilho é **a segunda conta**. | medição |
| 6 | **Dois documentos atrás do ROADMAP:** `docs/produto.md` §7.1 ainda mostra a **ordem de 02/09** (A → F), e o índice do `CLAUDE.md` **não lista** o `ROADMAP.md`. Ficaram fora do commit de 16/09 por escopo declarado — *hoje, quem chega pelo índice não acha o mapa, e quem lê o `produto.md` acha a fila velha.* | dono decide quando |
| 7 | **Duas perguntas registradas para a frente 5 (Publicação), antes de ela abrir:** publicar **não gasta e não tem volta** — a primeira publicação real é metade do dono?; e **tokens da Meta por conta não cabem em variável de ambiente** — morar no banco é exceção às regras de Segurança, a registrar antes do primeiro token. → [`ROADMAP.md`](ROADMAP.md) §3 e §4 | dono, quando a frente abrir |
| 8 | **Backlog nomeado:** arquivar/ocultar na galeria; filtros e busca; o glifo ⇥ com contraste fraco; três arestas órfãs; o «Reanimar» é tudo-ou-nada; **montar duas vezes o mesmo roteiro faz DOIS filmes idênticos** (`959dc554…` e `8fa08846…` — conserto de produto, não de banco); **uma leitura de carteira que falha vira «você tem 0 ⚡»** (`walletResult.data?.balance_cents ?? 0` em `src/app/studio/page.tsx`) — falha fechada, mas **mente sobre dinheiro**; **os outros `<dialog>`** — wizard, save-version, sheet-editor, reference-picker, lightbox — têm **o mesmo buraco do `nowheel`** que o diálogo de cena tinha; re-semear o canvas quando o HMR cria um store vazio (ferramenta de dev); **`edited_at` e `updated_at` usam relógios diferentes** (~2 s); **`nanoid` < 3.3.18 — 1 alta do `npm audit`**, transitiva do Next 16.3.0 (GHSA-2v37-7h3g-55p8) — decisão à parte. | plano |

As notas do **Modo Take** e da **Voz** já estão em disco — [`notas-modo-take.md`](notas-modo-take.md)
e [`notas-voz.md`](notas-voz.md) —, e as duas impõem o mesmo requisito ao **Catálogo aberto**:
**capacidades como dado** (fala nativa e seus idiomas, referência de áudio, lipsync,
`voice_id`). Na fila de 16/09, as três ficam **depois** do primeiro post.

---

## O PRÓXIMO GESTO

# Frente 1 do ROADMAP — o produto diz o que é

**Primeiro o plano, depois o código** (regra 9): escrever `docs/plano-*.md` da frente — as
fases, a prova de cada uma e os dois caminhos já escritos no item 1 — e **devolver ao dono
antes da primeira linha de código**.

**0 ⚡ na parte estrutural; nenhum dos dois caminhos toca o motor de geração.** ⚠️ *Ver a
fidelidade de verdade custa uma imagem (75 ⚡) — ela só se vê gerando, e aí a metade é do
dono, com o pior caso escrito antes do clique.*

📌 **Por onde o plano começa — e isto já está medido:** a instrução do card é traduzida **na
hora da geração, pela action, antes de chegar ao compilador**, que continua puro, sem rede
(`src/lib/prompt/canvas.ts:32-35` e `:69`). É o caminho natural para o nome do card também:
traduzir antes, compilar depois — nunca uma chamada de rede dentro do compilador.

> **Projeto de prova da frente:** «Projeto teste Foto da Blusa» — o percurso da A′, com a
> foto `06778db7` e a geração `0cf3f069`. Os outros: «Prova · C3 Fase 4» e «Projeto novo
> teste maquina storyboard» (os 3 clipes, copiados em `scratchpad\video-final-fase0\clipes\`).
> O **filme duplicado fica** no acervo até o item 2 existir.

> **Para subir o ambiente de vídeo:** o túnel vive **no comando**, nunca no arquivo —
> `FAL_WEBHOOK_URL="https://<tunel-de-hoje>.trycloudflare.com/api/webhooks/fal" npm run dev`.
> *E a porta 3000 pode estar com outro repositório: em 16/09 estava com o `jessykasemijoias`.*
