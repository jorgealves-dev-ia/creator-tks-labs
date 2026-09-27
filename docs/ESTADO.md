# ESTADO — onde o projeto está

> **Leia isto primeiro.** Uma página, reescrita **em toda pausa** (regra 9 do
> [`CLAUDE.md`](../CLAUDE.md)). Não é histórico: é o **checklist do projeto agora**.
> O *porquê* está em [`decisoes.md`](decisoes.md); o *o quê e em que ponto* de cada
> frente está no `plano-*.md` dela; o *como está hoje* está no código — e **o lugar de
> tudo isso no mapa inteiro está em [`ROADMAP.md`](ROADMAP.md).**

**Última reescrita:** 27/09/2026, ~20:45 — **a seguir, a validação ao vivo da F1a.** O dono deixou o
navegador pronto no **perfil do projeto («Jorge Alves - DevIA»), porta 5599**, com as janelas dos outros
perfis fechadas e o hook carregado no outro terminal; **antes da primeira chamada, a pergunta «pronto para o
navegador?»**. O dev está de pé na 5599 (PID 10528). Nenhuma chamada paga em curso.

## 1 · Feito em 27/09

| o quê | onde |
|---|---|
| **F0 ✅ FECHADA — o padrão da lista de produto é o Gemini 3.7 Flash** (o Haiku fica no seletor). E o **aviso de público** no card entra na F1 (a regra 2 do contrato reduz, não elimina: 2 falhas em 4), junto da **invariante do rótulo** | [`plano-produto-diz.md`](plano-produto-diz.md), F0 e F1 itens 9–10 |
| **Os 6 registros corrigidos** — script rodado pelo dono; **a varredura dos mesmos 104 de 26/09: 104 / 0 / 0**; e, por fora, as 26 gerações e as 98 outras linhas idênticas | `scratchpad\evidencias\produto-diz-f1a\` |
| **O lado a lado da F0** — rodada 5, 3 leituras, **7 centavos reais, 0 Spark** | plano, F0 · rodada 5 |
| **O contrato de leitura v2 no plano, byte a byte** — md5 do prompt de sistema `99f41400…` em evidência, plano e harness | plano, F0 |
| **A regra 7 de Segurança conferida pela sonda** — o GitHub estava com as duas proteções desligadas; o dono as ligou; `npm run probe:keys` acusa ✗ se desligarem. **0 alertas** de secret scanning | `scripts/probe-provider-keys.mts` |
| **Checagem de segredos, 0 ⚡** — nenhum `.env*` além do `.env.example` nos 135 commits; nenhum formato de chave no histórico | `scratchpad\evidencias\seguranca-regra7\` |
| **A regra «Navegador»** no `CLAUDE.md` — o perfil do projeto, parar na tela de login, painéis só para consulta, só a aba do grupo do Claude, e **o bastão** | [`CLAUDE.md`](../CLAUDE.md) |
| **A trava de navegador entre projetos** — hook de usuário (`~/.claude/hooks/trava-navegador.mjs`, md5 `20da8901…`), **com o perfil do projeto declarado** (lido do `.claude/settings.local.json`, fora do git). **18 cenários, 0 falhas; dois terminais reais** — o 2º bloqueado com a frase certa, o 1º liberando ao terminar | `~/.claude/` · `scratchpad\evidencias\trava-navegador\` |
| **A F1a, escrita e provada estruturalmente — 37 provas** — e **não commitada** (ver 2) | a árvore de trabalho |

## 2 · Pela metade — a validação ao vivo da F1a, agora

**A F1a está na árvore de trabalho, NÃO commitada** — sem commit até a prova ao vivo fechar (pedido do dono).
`git status` mostra estes arquivos, **e eles são a F1a, não sujeira**:
`src/lib/assets/{image-bytes,upload-label,upload-client,stored-head}.ts` (novos),
`src/components/canvas/use-image-gestures.ts` (novo), `src/lib/assets/actions.ts`,
`src/lib/generation/asset-payloads.ts`, `src/lib/canvas/store.ts`, `src/components/canvas/flow-canvas.tsx`,
`src/components/nodes/reference-picker.tsx`, `src/lib/i18n/pt-BR.ts`.

**A ordem, combinada com o dono:**

1. **perguntar «pronto para o navegador?»** e esperar a resposta — o dono tira as mãos do teclado;
2. **na primeira chamada: confirmar na aba que está logada como o usuário do projeto, antes de qualquer
   gesto.** Tela de login, outro usuário ou CAPTCHA: parar e perguntar;
3. **a primeira chamada é também a prova real da trava** — `node ~/.claude/hooks/trava-navegador.mjs status`
   tem de mostrar a trava **deste** projeto, com o perfil «Jorge Alves - DevIA». **Se ela bloquear: parar e
   mostrar a mensagem ao dono**;
4. a lista de 10 itens do fim da seção F1a do [plano](plano-produto-diz.md): projeto de teste novo («Teste
   F1a — colar e soltar»; **o «Projeto teste Foto da Blusa» não se toca**), botão, soltar, colar com e sem
   nome, recusas, campo de texto, link, **o Ctrl+V de verdade**, recarregar, screenshots com nome;
5. prova fechada → **commit da F1a**, com a doc dela em `nodes-geracao.md` e `arquitetura.md`, e
   **"navegador devolvido"**.

**Depois da F1a: a F1** — a migration (padrão da lista de produto = `gemini-3.7-flash`, no padrão RAISE
EXCEPTION, aplicada pelo dono), o card com a leitura, **o aviso de público** e **a invariante do rótulo**; a
metade do dono é **uma** leitura pelo botão, **4 ⚡**.

## 3 · O gasto real — 27/09

| o quê | custo real | da carteira |
|---|---|---|
| F0 rodada 5 — Flash 1, Flash 2, Haiku 2 (3 pedidos HTTP) | **7 centavos** (3 + 2 + 2) | 0 |
| limites do Flash, sonda, varreduras, provas da F1a e da trava | 0 | 0 |
| 5 sessões `claude -p` de teste da trava de navegador, em Haiku | US$ 0,13 de uso de Claude | 0 |
| **total da F0 inteira** | **11 centavos de provedor** | **0 Spark — saldo 3.190 ⚡, conferido no banco depois do script** |

> 🔑 **Chaves e contas:** Anthropic, Google, fal e OpenAI aceitas pela sonda em 27/09; xAI sem chave. O
> Google voltou a gerar. **GitHub:** secret scanning e push protection **ligados** — conferidos pela sonda.

---

## O que está PROVADO

**A fundação.** Canvas de nodes, projetos, character sheet com versões congeladas, motor
de extração, compilador determinístico, geração de imagem canônica, ledger append-only
com as travas no banco. RLS em todas as **21** tabelas.

**Frente Storyboard · Ciclos 1 a 3 e o vídeo final.** O elo (⚠️ *veredito humano NÃO MEDIDO, com
gatilho*); o Roteiro; **a Máquina, encerrada** — 3 cenas, 870 ⚡, zero reconciliação à mão; **um filme**
montado em JavaScript puro, sem `ffmpeg`, a 0 ⚡.

**Frente A′ — ✅ FECHADA em 07/09. A FOTO CHEGA AO PROVEDOR.** A fidelidade não estava provada — saiu um
vestido onde a foto é uma blusa, porque a palavra «blusa» nunca chegou ao modelo: **é a Frente 1.**

**Frente 1 · F0 — ✅ FECHADA em 27/09.** O compilador de hoje reproduz o texto de 07/09 **byte a byte**;
cinco leituras da foto da blusa; **o contrato v2 no plano, byte a byte**; **o padrão é o 3.7 Flash**; e **a
regra no contrato reduz a invenção de público, mas não a elimina** (2 de 4) — daí o aviso no card.

**O acervo diz a verdade sobre os tipos:** os 104 arquivos de 26/09 batem com os bytes — **104 / 0 / 0**.

**Dois fatos provados ao vivo, de graça:** **recusa de provedor não debita** (`a10f13c0`); e **o filtro que
barrou é do Google, verbatim** (`google.ts:258`).

**Dinheiro, depois do incidente de 29/08.** As quatro travas do motorista, cada uma com simulação
vermelha→verde reexecutável; a fechadura ED25519 do webhook; a trava de vida do endereço de retorno.

**Instrumentos.** `scratchpad\harness\medir-canvas.js` recusa número de canvas não pintado; o dev sobe
sempre na **5599**; **`npm run probe:keys`** confere as chaves sem gastar **e a regra 7 no GitHub**; **a trava
de navegador entre projetos** bloqueia o Chrome de um projeto enquanto outro o segura — provada com dois
terminais reais (o matcher literal ganha a prova real na primeira chamada ao Chrome).

---

## O que está ABERTO

| # | o que falta | quem fecha |
|---|---|---|
| 1 | **🎯 Frente 1 — o produto diz o que é** — [`plano-produto-diz.md`](plano-produto-diz.md). **F0 ✅**; **F1a**: a validação ao vivo, agora; **F1** (com a migration, o aviso de público e a invariante do rótulo) → **F2** → **F3**, a prova viva, 75 ⚡. Pior caso: **99 ⚡ de preço, 79 ⚡ da carteira**. ⚠️ *A linha da frente 1 no ROADMAP §4 está velha — "um dia", "estrutural sem dinheiro" — e se corrige no fechamento.* | Claude — a F1a; **dono** — a migration e as metades pagas |
| 2 | **Três achados sobre o tipo dos arquivos, fora da F1a:** a **extração de personagem** manda à Anthropic o tipo do navegador (WebP chamado `.jpg` → 400, antes de cobrar — caminho que cobra, decisão do dono); o **envio da imagem canônica** grava o tipo do navegador; os **metadados dos 6 objetos no Storage** dizem `image/jpeg` (ficam: o dono pediu só a coluna) | dono |
| 3 | **Apagar asset da galeria, com auditoria de referências** — o botão não existe. **0 ⚡.** → §9 do [`plano-video-final.md`](plano-video-final.md). *As imagens de teste da F1a vão ficar na galeria até ele existir.* | Claude |
| 4 | **O selo «bloqueada pelo filtro do Google» nunca foi visto em tela** — a F3 é a oportunidade, a 0 ⚡ extra. | oportunidade |
| 5 | **Egress §4.5** — o egress na fatura, esperando o gráfico de Usage. | o relógio |
| 6 | **Perguntas com gatilho:** a **0.3** (a aba escondida trava o elo?); **recusa × concorrência** (n ≥ 30); **a trava de dono da linhagem, provada de um lado só** — o gatilho é a segunda conta. | medição |
| 7 | **Duas perguntas para a frente 5 (Publicação), antes de ela abrir:** publicar **não gasta e não tem volta**; **tokens da Meta por conta não cabem em variável de ambiente**. → [`ROADMAP.md`](ROADMAP.md) §3 e §4 | dono, quando a frente abrir |
| 8 | **Backlog nomeado:** arquivar/ocultar na galeria; filtros e busca; o glifo ⇥ com contraste fraco; três arestas órfãs; o «Reanimar» é tudo-ou-nada; **montar duas vezes o mesmo roteiro faz DOIS filmes idênticos**; **uma leitura de carteira que falha vira «você tem 0 ⚡»** — **mente sobre dinheiro**; **os outros `<dialog>`** com o buraco do `nowheel`; re-semear o canvas quando o HMR cria um store vazio; `edited_at` × `updated_at` em relógios diferentes; **`nanoid` < 3.3.18** (1 alta do `npm audit`, transitiva do Next 16.3.0); **a sonda de chaves na TELA**; o cadastro com confirmação por e-mail no dev local precisaria da 5599 nos redirecionamentos do Supabase. | plano |

---

> **Projeto de prova da frente:** «Projeto teste Foto da Blusa» — o percurso da A′, com a foto
> `06778db7` (WebP — agora registrada como WebP) e a geração `0cf3f069`. **O controle da F3 estava
> intacto na última conferência (26/09):** a ficha da cena 2 não foi tocada desde 07/09, a @luna ativa é a
> v4, o card tem nome e 1 foto — a F3 confere de novo antes do clique.
> **Nenhum teste da F1a acontece nele.**

> **O dev sobe na 5599** (`npm run dev`). **Para o ambiente de vídeo** *(a Frente 1 não precisa)*: o túnel
> aponta para `http://localhost:5599` e vive **no comando** —
> `FAL_WEBHOOK_URL="https://<tunel-de-hoje>.trycloudflare.com/api/webhooks/fal" npm run dev`.
