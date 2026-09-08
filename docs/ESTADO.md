# ESTADO — onde o projeto está

> **Leia isto primeiro.** Uma página, reescrita **em toda pausa** (regra 9 do
> [`CLAUDE.md`](../CLAUDE.md)). Não é histórico: é o **checklist do projeto agora**.
> O *porquê* está em [`decisoes.md`](decisoes.md); o *o quê e em que ponto* de cada
> frente está no `plano-*.md` dela; o *como está hoje* está no código.

**Última reescrita:** 07/09/2026, no fechamento dos **três itens de UI** — no mesmo dia
em que a **Frente A′** fechou.

> # ✅ ÁRVORE LIMPA. Nada esperando validação, nada não commitado.
>
> A frente **A′ · o `fix:` do produto** foi **provada pelo dono e fechada** em 07/09, e os
> **três itens de UI** que o percurso dela revelou fecharam no mesmo dia. O mini-ciclo
> «O vídeo final» está fechado desde 06/09. **O próximo gesto é novo trabalho.**
>
> *Única linha em aberto com prova pendente: o selo da recusa (item 3), e ela é
> **oportunista** — fecha sozinha na próxima recusa, sem ⚡ extra.*

---

## O que está PROVADO

**A fundação.** Canvas de nodes, projetos, character sheet com versões congeladas, motor
de extração, compilador determinístico, geração de imagem canônica, ledger append-only
com as travas no banco. As 15 tabelas com RLS default-deny.

**Frente Storyboard · Ciclo 1 — o elo.** O último quadro de um clipe vira o primeiro do
seguinte, por asset derivado. ⚠️ *O **veredito humano** do elo continua **NÃO MEDIDO com
gatilho**.*

**Frente Storyboard · Ciclo 2 — o Roteiro.** Uma ideia vira fichas de cena estruturadas
no banco. Fechado.

**Frente Storyboard · Ciclo 3 — a Máquina. ✅ ENCERRADO.** Fases 0 a 4 fechadas, as sete
decisões tomadas, e **a régua percorrida pelo dono**: 3 cenas, 870 ⚡, do zero ao clipe.
O percurso de 02/09, por id: exatamente **3 cobranças de vídeo**, submetidas numa janela de
**643 ms**, voltando em 69/74/64 s, **zero reconciliação à mão**. A conta fecha:
15 + 225 + 630 = **870 ⚡**, saldo 4.150 → 3.280.

**Mini-ciclo «O vídeo final» — ✅ FECHADO em 06/09, em produção (`d17a2d8`).**
A montagem tem vencedor com número — **JavaScript puro (`mediabunny`), sem `ffmpeg`**: 122 ms
contra 202 ms, binário de **0,63 MB contra 75,0 MB**, arquivo **idêntico quadro a quadro**
(363 de 363). **O filme existe:** de 3 clipes pagos, um asset `959dc554…`, 716×1284,
15.125 ms, tocando no canvas — **e o extrato não se moveu** (saldo 3.280 → 3.280).
As travas leem **os arquivos**, não o banco, e recusam nomeando a cena e o motivo.
No banco, `asset_montage_parts` com RLS default-deny e escrita só por `record_montage`.
As Fases 4·2, 6 e 7 consertaram as três telas que mentiam sobre o que o banco diz.

**Frente A′ · o `fix:` do produto — ✅ FECHADA em 07/09. A FOTO CHEGA AO PROVEDOR.**

*Nome não é foto* (decisão de 03/09): pôr *"blusa da Mine"* no prompt faria o modelo
**inventar** uma blusa em vez de vestir a **dela**. As três partes do `fix:` — a Máquina
ganha o Input de Produto, a tela avisa enquanto ele não está conectado, e o Roteiro exige
**onde** o produto está.

**86 asserções estruturais**, em cinco fases: P1 o fio vivo alcança a Máquina (**9/9**, com
o predicado antigo vermelho ao lado); P2 a conta de vagas recusa antes de gastar
(**13/13**); P3 os três estados do produto e a emenda no portão (**27/27**); P4 o Roteiro
exige a posição (**13/13**); P5 a Máquina **nascida do template** faz tudo igual
(**24/24**) — o alcance é por **tipo de node**, não por origem.

**A prova do dono, e ela é do banco:** o percurso custou **90 ⚡ — o pior caso R1 exato**
(15 do roteiro + 75 da imagem), saldo 3.280 → **3.190**. A imagem saiu com um vestido onde a
foto é uma blusa, e o dono **recusou a tela como prova** — ela não distingue *"a foto chegou
e o modelo desobedeceu"* de *"a foto não chegou"*. O `params` de `0cf3f069` mostra
`06778db7` (upload de 07/09) na **posição 2**, ao lado da folha da @luna v4; o
`prompt_compiled.structure.referencias` traz `origem: "input"`, `grupo_id` **igual ao id do
node do card**, `referencias_mudas: null` e duas diretivas de fidelidade. **A foto sai do
card, atravessa a Máquina e é anunciada ao modelo.**

📌 **A fidelidade NÃO está provada e não é desta frente.** A causa está achada e tem
endereço — a palavra «blusa» nunca chegou ao modelo. → *o que está ABERTO*, item 1.

**Dois fatos provados ao vivo, de graça:** **recusa de provedor não debita** (`a10f13c0`,
`cost_charged_cents = 0`, fora do ledger — antes provado por simulação, agora por um 400
real); e **o filtro que barrou é do Google, verbatim** (`google.ts:258` põe o prefixo, o
resto é o corpo da resposta, copiado sem reescrita — invariante 7).

**Mini-ciclo Egress.** Fases 0 a 5 fechadas, em produção.

**Dinheiro, depois do incidente de 29/08.** As quatro travas do motorista, cada uma com
simulação vermelha→verde reexecutável; a fechadura ED25519 do webhook; a trava de vida do
endereço de retorno.

**O «incidente dos vínculos» — ✅ ENCERRADO em 06/09: era artefato de medição.** **Nunca
houve perda.** Em aba que o Chrome nunca pintou não há layout, o React Flow não mede os
nodes e **não desenha aresta nenhuma**, com o store cheio o tempo todo. A lição virou
**mecanismo**: `scratchpad\harness\medir-canvas.js` recusa devolver número de canvas não
pintado, e está na regra 8 do [`CLAUDE.md`](../CLAUDE.md). **E toda afirmação sobre o store
lê o store.** → [`decisoes.md`](decisoes.md), 06/09.

**Documentação para qualquer agente.** `AGENTS.md` como ponteiro para o `CLAUDE.md`,
`README.md` como mapa, `.gitattributes` fixando o EOL.

---

## O que a Fase 0 do vídeo descobriu e ainda não virou código

Três achados medidos — o detalhe no §4.1 do [`plano-video-final.md`](plano-video-final.md):

1. **A ordem das cenas ≠ a ordem de criação das gerações.** Montar por `created_at` entrega
   o filme fora de ordem, **e o erro só aparece no vídeo**.
2. **O banco não sabe o que os arquivos são.** `assets.width`/`height` são `NULL` e
   `params.resolution` diz `"720p"` enquanto o arquivo tem 716×1284. O portão **lê os
   arquivos**.
3. **Nenhuma biblioteca recusa clipe incompatível sozinha.** A trava é nossa — e recusar
   custa zero.

---

## O que está ABERTO

| # | o que falta | quem fecha |
|---|---|---|
| 1 | **🎯 O produto precisa dizer O QUE É, não só onde está** — *nasceu da nota de 07/09, e é o endereço direto da próxima frente*. A foto chega e o modelo desenhou um **vestido**: a palavra «blusa» **nunca entrou no texto**. O nome do card viaja como `grupo.rotulo`, **metadado de auditoria**, e não vira palavra no prompt; a descrição do card estava **vazia**; e o Roteiro escreveu *"a barra da peça"* — `hem`, vocabulário de vestido — com *"da cabeça aos pés"* ao lado. Dois caminhos, não excludentes: **(a)** o nome do card vira **palavra no prompt**; **(b)** a descrição **nasce com valor padrão derivado do nome** — um campo vazio ao lado de um nome cheio é informação existindo e não viajando. | plano |
| 2 | **Apagar asset da galeria, com auditoria de referências** — *o dono foi apagar o filme duplicado e **o botão não existe***. Os triggers de 04/09 já tornam **seguro** o apagamento (cascade para o filme, «peça removida» para o clipe); falta **a tela** e **a auditoria da imagem usada como referência**, que mora no `data` de um node dentro do `graph` e **não tem FK — logo, não tem gatilho que avise**. **0 ⚡.** → §9 do [`plano-video-final.md`](plano-video-final.md) | Claude |
| 3 | ✅ **Os três itens de UI de 07/09 estão FECHADOS** — sobra **uma prova viva, pendente e OPORTUNISTA**: o selo **«bloqueada pelo filtro do Google»** nunca foi visto em tela, porque as **8** últimas gerações de imagem do banco estão todas `succeeded`. Fotografá-lo exigiria **provocar** uma recusa — 0 ⚡ se o filtro barrar, **75 ⚡ se passar**. **Decisão do dono, 07/09:** *a prova viva é obrigatória onde há dinheiro, e aqui o dinheiro seria para fotografar um rótulo* — então **a próxima recusa numa geração que ele faria de qualquer forma fecha esta prova, com 0 ⚡ extra**. Até lá vale a tabela-verdade (13/13) e os dois elos do dado conferidos no banco. | oportunidade |
| 4 | **Egress §4.5** — o egress na fatura, esperando o gráfico de Usage. | o relógio |
| 5 | **Perguntas com gatilho:** a **0.3** (a aba escondida trava o elo?) — *06/09 deu meia resposta; falta medir o **percurso completo** com a aba atrás*; **recusa × concorrência** (n ≥ 30); e **a trava de dono da linhagem, provada de um lado só** — o ramo *«peça de OUTRA pessoa existente»* **nunca foi exercitado**, porque a base tem **1 conta**. **O gatilho é a segunda conta.** | medição |
| 6 | **Backlog nomeado:** os `assets.width`/`height` em **`NULL`** nos clipes de vídeo em geral; arquivar/ocultar na galeria; filtros e busca; o glifo ⇥ com contraste fraco; três arestas órfãs; o «Reanimar» é tudo-ou-nada; **montar duas vezes o mesmo roteiro faz DOIS filmes idênticos** *(e já aconteceu: `959dc554…` e `8fa08846…`, os dois com 11.066.457 B e 3 peças. O segundo custa **0 ⚡**; o que custa é confusão na galeria)* — **conserto é de produto, não de banco**; **uma leitura de carteira que falha vira «você tem 0 ⚡»** (`walletResult.data?.balance_cents ?? 0` em `src/app/studio/page.tsx`) — falha fechada, mas **mente sobre dinheiro**; **re-semear o canvas quando o HMR cria um store vazio** — ferramenta de dev, não produto; **`edited_at` e `updated_at` usam relógios diferentes** (~2 s medidos) e o comentário do `actions.ts` descreve uma intenção que o código nunca teve; **`nanoid` < 3.3.18 — 1 alta do `npm audit`**, transitiva do Next 16.3.0 por `postcss` (GHSA-2v37-7h3g-55p8) — **decisão à parte**, `audit fix` em transitiva do Next não entra de carona numa fase. | plano |

**A ordem das frentes, decidida em 02/09/2026:**
**A · O vídeo final** ✅ → **B · Catálogo aberto** → **C · Modo Take** → **D · Voz e áudio**
→ **E · Passe de UI/UX** → **F · Publicação**.

As notas de C e D já estão em disco: [`notas-modo-take.md`](notas-modo-take.md) e
[`notas-voz.md`](notas-voz.md). **As duas impõem o mesmo requisito ao Catálogo:
capacidades como dado** — fala nativa e seus idiomas, referência de áudio, lipsync,
`voice_id`.

---

## O PRÓXIMO GESTO

# Novo trabalho — nada esperando o dono

A árvore está limpa e em produção. Os três itens de UI de 07/09 fecharam no mesmo dia em
que nasceram. **Dois candidatos, os dois 0 ⚡:**

1. **O produto diz o que é** (item 1) — o endereço deixado pela frente A′, com a causa já
   medida e dois caminhos escritos. **Nenhum dos dois toca o motor de geração.**
   ⚠️ *Provar a fidelidade de verdade custa uma imagem (75 ⚡) — ela só se vê gerando.*
2. **Apagar asset da galeria** (item 2) — o banco já é seguro; falta a tela e a auditoria
   do `graph`, que é a parte que ninguém escreveu.

📌 **E há uma dívida nomeada, pequena:** os outros `<dialog>` do produto — wizard,
save-version, sheet-editor, reference-picker, lightbox — têm **o mesmo buraco do
`nowheel`** que o diálogo de cena tinha. Não foram tocados de propósito: o pedido era o
diálogo de cena, e alargar escopo em etapa de acabamento é como se perde o fio.

**Antes de qualquer um deles: escrever o plano em `docs/plano-*.md`** (regra 9) — e ele
volta para o Jorge conferir antes do primeiro código.

> **Para subir o ambiente de vídeo:** o túnel vive **no comando**, nunca no arquivo —
> `FAL_WEBHOOK_URL="https://<tunel-de-hoje>.trycloudflare.com/api/webhooks/fal" npm run dev`.

> **A dependência já tem o ok:** `mediabunny` entra cravada em **`1.55.6`, sem caret** — o
> projeto lançou seis versões em dezessete dias, e o que a diligência mediu foi esta.

> **Projetos de prova no estúdio:** «Prova · C3 Fase 4», «Projeto novo teste maquina
> storyboard» (os 3 clipes, já copiados em `scratchpad\video-final-fase0\clipes\`) e
> «Projeto teste Foto da Blusa» (o percurso da frente A′). O **filme duplicado fica** no
> acervo até o item 2 existir — hoje não há como apagá-lo.
