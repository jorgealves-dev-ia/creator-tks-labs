# ESTADO — onde o projeto está

> **Leia isto primeiro.** Uma página, reescrita **em toda pausa** (regra 9 do
> [`CLAUDE.md`](../CLAUDE.md)). Não é histórico: é o **checklist do projeto agora**.
> O *porquê* está em [`decisoes.md`](decisoes.md); o *o quê e em que ponto* de cada
> frente está no `plano-*.md` dela; o *como está hoje* está no código — e **o lugar de
> tudo isso no mapa inteiro está em [`ROADMAP.md`](ROADMAP.md).**

**Última reescrita:** 26/09/2026, na **pausa da F0 da Frente 1** — o Haiku leu a blusa com o contrato
v2; o Gemini espera o *"liberado"* do dono.

> # 🚨 O GOOGLE NÃO GERA ATÉ O DONO REPOR O SALDO — `402`, pré-pago baixo
>
> **Causa confirmada pelo dono em 26/09: saldo pré-pago baixo.** Ele repõe e define **o gasto máximo
> mensal no AI Studio**, e avisa *"liberado"*. **A mesma chave desenha as imagens e escreve o Roteiro:
> até lá, a F3 está parada e a produção não gera** (recusa sem cobrar, mas sem entregar). **A
> verificação é a leitura do 3.7 Flash com o contrato v2 — nunca uma geração de imagem só para testar.**

> 🔑 **Chave da Anthropic: trocada pelo dono em 26/09 — a nova não vence.** A anterior **expirou por
> prazo programado** (criada em 08/08 com validade — não foi revogada), e a F0 achou por acaso. **Para
> conferir qualquer chave, sem gastar: `npm run probe:keys`.**

> # 🎯 FRENTE 1: PLANO APROVADO, F0 NA METADE — [`docs/plano-produto-diz.md`](plano-produto-diz.md)
>
> **F0(a) ✅** — o texto de 07/09 remontado com o compilador de hoje é **igual byte a byte**.
> **F0(b):** o **Haiku leu** a blusa duas vezes. Na rodada 3 inventou *"infantil"*; na rodada 4, com o
> **contrato v2** (o princípio de evidência do dono), **não** — gabarito 4/4, as três partes do
> contrato, **2 centavos contra os 4 ⚡**. O **3.7 Flash** (no lugar do 2.5, que voltou 404) espera o
> saldo do Google. **A escolha do padrão da lista de produto espera o lado a lado, os dois no v2.**
>
> **📝 Proposta F1a, esperando a decisão do dono:** o envio que lê o tipo nos bytes, e o colar/arrastar
> imagem no canvas pelo mesmo caminho — 0 ⚡, fase própria, **pode andar enquanto a F0 espera o Google**.
>
> O mapa continua sendo o [`ROADMAP.md`](ROADMAP.md) — **6 FEITOS · 7 PARCIAIS · 2 NÃO**, e **5
> frentes** até o primeiro post publicado pelo sistema. **A fila mora lá (§4)** — este arquivo
> aponta, não copia.
>
> Árvore limpa depois do commit do plano. *Única prova pendente: o selo da recusa (item 3), e ela
> é **oportunista** — a F3 da Frente 1 é justamente uma geração que o dono faria de qualquer forma.*

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
→ **é a Frente 1**, item 1 do que está aberto.

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
`README.md` como mapa, `.gitattributes` fixando o EOL — e, desde 26/09, **o índice do
`CLAUDE.md` lista o `ROADMAP.md`** e o `produto.md` §7.1 aponta para a fila de 16/09 em vez de
mostrar a de 02/09.

**O mapa — 16/09.** [`ROADMAP.md`](ROADMAP.md): o inventário lido do código e do banco, o
esboço item a item, **a arquitetura decidida pelo dono** — um núcleo; Estúdio, Modo Rápido e
MCP como superfícies; Publicação como módulo — e **a fila até o post publicado**. O porquê em
[`decisoes.md`](decisoes.md), 16/09.

---

## O que a Fase 0 do vídeo descobriu e ainda não virou código

Três achados medidos — o detalhe no §4.1 do [`plano-video-final.md`](plano-video-final.md):

1. **A ordem das cenas ≠ a ordem de criação das gerações.** Montar por `created_at` entrega
   o filme fora de ordem, **e o erro só aparece no vídeo**.
2. **O banco não sabe o que os arquivos são.** `assets.width`/`height` estão vazios em
   **35 de 35 vídeos e em 39 de 48 imagens** *(medido em 16/09)*. É a mesma lacuna que a frente
   3 do ROADMAP encontra: não há pixel do canal sem saber o pixel do arquivo.
3. **Nenhuma biblioteca recusa clipe incompatível sozinha.** A trava é nossa — e recusar
   custa zero.

---

## O que está ABERTO

| # | o que falta | quem fecha |
|---|---|---|
| 1 | **🎯 Frente 1 — o produto diz o que é. Plano APROVADO em 26/09: [`plano-produto-diz.md`](plano-produto-diz.md). F0 na metade: (a) ✅ byte a byte; (b) Haiku ✅ leu — com o contrato v2, sem o *"infantil"* —, 3.7 Flash espera o saldo do Google — o detalhe no plano, em *O que a F0 achou*. Proposta F1a (envio pelos bytes + colar/arrastar) esperando o dono.** A lista de produto nasce com **Haiku e 3.7 Flash**; as linhas 2.5 de `extraction` ficam inativas na migration da F1. Decisões do dono de **21/09**: o card ganha **Nome e Descrição**, preenchidos pelo botão **«Ler a foto · N ⚡»** (com seletor de modelo), colados à mão ou editados; **texto livre em pt e en, sem taxonomia**; o compilador cola o inglês no bloco do produto; **a chave «Input Referências» continua mandando**. **Três achados da investigação de 26/09 têm dinheiro dentro:** o adapter é registrado **por fornecedor** (ligar o Google para produto acenderia o Gemini também na ficha de personagem); o padrão de extração é o **Sonnet, a 20 ⚡**; e `extractions` exige personagem — **a F1 nasce com migration, aplicada pelo Jorge**. Pior caso R1 registrado pelo dono: **87 ⚡ de preço, 79 ⚡ da carteira** — saldo 3.190 → 3.111; *a segunda leitura do Haiku (contrato v2) somou +4 ⚡ de preço fora da carteira: 91 de preço, 79 da carteira*. **A F1 vem no padrão RAISE EXCEPTION**, e a migration confere que o padrão da lista de produto é um modelo só, a 4 ⚡, e nunca o Sonnet. ⚠️ *A linha da frente 1 no ROADMAP §4 ficou velha — diz "um dia" e "estrutural sem dinheiro" — e se corrige no fechamento.* ⚠️ *Com o 2.5 Flash fora, o substituto custa 2,5× na entrada e 1,5× na saída, e dobra em 2027: os 4 ⚡ podem não cobrir — e "a 4 ⚡" na conferência da migration pode ter de mudar junto com o preço.* | **dono** — o *"liberado"* do Google; e se a F1a anda |
| 2 | **Apagar asset da galeria, com auditoria de referências** — o botão não existe. Os triggers de 04/09 já tornam o apagamento **seguro**; falta **a tela** e **a auditoria da imagem usada como referência**, que mora no `data` de um node dentro do `graph` e **não tem FK**. **0 ⚡.** → §9 do [`plano-video-final.md`](plano-video-final.md). *Fora do caminho do post — fica atrás das cinco frentes, salvo decisão do dono.* | Claude |
| 3 | **O selo «bloqueada pelo filtro do Google» nunca foi visto em tela.** Ele só aparece quando a **última** imagem de uma cena é uma recusa — e a única recusa do banco (`a10f13c0`, 07/09) foi seguida de uma geração boa 58 s depois. **A última geração do banco é essa, `0cf3f069`, de 07/09** (medido em 26/09). **Decisão do dono, 07/09:** *a próxima recusa numa geração que ele faria de qualquer forma fecha esta prova, com 0 ⚡ extra* — **e a F3 da Frente 1 é uma delas.** Até lá valem a tabela-verdade (13/13) e os dois elos do dado conferidos no banco. | oportunidade |
| 4 | **Egress §4.5** — o egress na fatura, esperando o gráfico de Usage. | o relógio |
| 5 | **Perguntas com gatilho:** a **0.3** (a aba escondida trava o elo?) — falta medir o **percurso completo** com a aba atrás; **recusa × concorrência** (n ≥ 30); e **a trava de dono da linhagem, provada de um lado só** — o gatilho é **a segunda conta**. | medição |
| 6 | **Duas perguntas registradas para a frente 5 (Publicação), antes de ela abrir:** publicar **não gasta e não tem volta** — a primeira publicação real é metade do dono?; e **tokens da Meta por conta não cabem em variável de ambiente** — morar no banco é exceção às regras de Segurança, a registrar antes do primeiro token. → [`ROADMAP.md`](ROADMAP.md) §3 e §4 | dono, quando a frente abrir |
| 7 | **Backlog nomeado:** arquivar/ocultar na galeria; filtros e busca; o glifo ⇥ com contraste fraco; três arestas órfãs; o «Reanimar» é tudo-ou-nada; **montar duas vezes o mesmo roteiro faz DOIS filmes idênticos** (`959dc554…` e `8fa08846…` — conserto de produto, não de banco); **uma leitura de carteira que falha vira «você tem 0 ⚡»** (`walletResult.data?.balance_cents ?? 0` em `src/app/studio/page.tsx`) — falha fechada, mas **mente sobre dinheiro**; **os outros `<dialog>`** — wizard, save-version, sheet-editor, reference-picker, lightbox — têm **o mesmo buraco do `nowheel`** que o diálogo de cena tinha; re-semear o canvas quando o HMR cria um store vazio (ferramenta de dev); **`edited_at` e `updated_at` usam relógios diferentes** (~2 s); **`nanoid` < 3.3.18 — 1 alta do `npm audit`**, transitiva do Next 16.3.0 (GHSA-2v37-7h3g-55p8) — decisão à parte; **a sonda de chaves na TELA** (pedido do dono, 26/09) — *"chave válida ✓/✗"*; **o script já existe** (`npm run probe:keys`, 0 ⚡, cada resposta lida contra um controle com chave falsa) — falta a versão que o dono vê sem terminal; **os 6 registros com tipo errado** (varredura de 26/09: 6 envios `image/jpeg` que são WebP, de 104 arquivos) — corrigir o banco é decisão do dono, à parte; o conserto do caminho está na proposta F1a. | plano |

As notas do **Modo Take** e da **Voz** já estão em disco — [`notas-modo-take.md`](notas-modo-take.md)
e [`notas-voz.md`](notas-voz.md) —, e as duas impõem o mesmo requisito ao **Catálogo aberto**:
**capacidades como dado** (fala nativa e seus idiomas, referência de áudio, lipsync,
`voice_id`). Na fila de 16/09, as três ficam **depois** do primeiro post.

---

## O PRÓXIMO GESTO

# O *"liberado"* do Google fecha a F0 — e a F1a pode andar antes dele

1. **Quando o dono disser *"liberado"*:** uma leitura do **3.7 Flash com o contrato v2** — fora do
   produto, zero Spark da carteira, e ela **é** a verificação da cobrança (nunca uma imagem só para
   testar). Aí o **lado a lado Haiku × 3.7 Flash, os dois no v2**, e **a escolha do dono**: o que ler
   melhor a blusa vira **o padrão da lista de produto** (resposta 9.4). A F1 começa — migration no
   padrão RAISE EXCEPTION, aplicada pelo dono.
2. **Enquanto isso, se o dono quiser: a F1a** — o envio que lê o tipo nos bytes, e o colar/arrastar
   imagem no canvas pelo mesmo caminho. 0 ⚡, fase própria, proposta no plano.
3. **Os 6 registros com o tipo errado** — corrigir o banco ou só o caminho: decisão do dono.

*Tudo pronto:* `scratchpad\harness\f0-leituras.ts` (lê o tipo da foto nos bytes; sem `--so-haiku`
chama os dois) · o contrato v2 em `scratchpad\evidencias\produto-diz-f0\contrato-leitura-v2.md` · os
números das quatro rodadas em `numeros-f0*.md` · a varredura em `varredura-mime-assets.md`.

> **Projeto de prova da frente:** «Projeto teste Foto da Blusa» — o percurso da A′, com a foto
> `06778db7` e a geração `0cf3f069`. **O controle da F3 está intacto em 26/09:** a ficha da cena 2
> não foi tocada desde 07/09 (e tem `produto: null`), a @luna ativa é a v4, o card tem nome e 1
> foto, e o saldo é **3.190 ⚡**, sem lançamento desde 07/09. Os outros projetos: «Prova · C3 Fase 4»
> e «Projeto novo teste maquina storyboard» (os 3 clipes, copiados em
> `scratchpad\video-final-fase0\clipes\`). O **filme duplicado fica** no acervo até o item 2 existir.

> **O dev sobe na 5599, fixa desde 26/09** (`npm run dev`) — a porta em que a extensão do Chrome tem
> permissão; a 3000 fica para os outros projetos da máquina (em 16/09 estava com o `jessykasemijoias`).
> **Para subir o ambiente de vídeo** *(a Frente 1 não precisa — é só imagem)*: o túnel aponta para
> `http://localhost:5599` e vive **no comando**, nunca no arquivo —
> `FAL_WEBHOOK_URL="https://<tunel-de-hoje>.trycloudflare.com/api/webhooks/fal" npm run dev`.
