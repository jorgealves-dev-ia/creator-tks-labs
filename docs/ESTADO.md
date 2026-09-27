# ESTADO — onde o projeto está

> **Leia isto primeiro.** Uma página, reescrita **em toda pausa** (regra 9 do
> [`CLAUDE.md`](../CLAUDE.md)). Não é histórico: é o **checklist do projeto agora**.
> O *porquê* está em [`decisoes.md`](decisoes.md); o *o quê e em que ponto* de cada
> frente está no `plano-*.md` dela; o *como está hoje* está no código — e **o lugar de
> tudo isso no mapa inteiro está em [`ROADMAP.md`](ROADMAP.md).**

**Última reescrita:** 27/09/2026, ~19:10 — **o navegador está BLOQUEADO até o dono liberar** (a aba abriu
no perfil do Chrome de outro cliente). **O dev está de pé na 5599** (PID 10528), a pedido do dono. Nenhuma
chamada paga em curso.

## 1 · Feito em 27/09

| o quê | onde |
|---|---|
| **O contrato de leitura v2 entrou no plano, byte a byte** — copiado por script, md5 do prompt de sistema `99f41400…` igual em evidência, plano e harness | [`plano-produto-diz.md`](plano-produto-diz.md), F0 |
| **O lado a lado da F0 — medido.** Rodada 5: 3 leituras (a rodada 4 contou como a 1ª do Haiku: conteúdo idêntico, conferido no pedido e nos 2.051 tokens). **7 centavos reais, 0 Spark.** O Google cobra de novo (sem `402`) | plano, F0 · rodada 5 |
| **A regra 7 de Segurança passou a ser conferida:** o GitHub estava com secret scanning e push protection **desligados** num repositório público; o dono ligou os dois, e `npm run probe:keys` acusa ✗ se qualquer um desligar — vermelho às 15:04, verde às 18:56 | `scripts/probe-provider-keys.mts` |
| **Checagem de segredos, 0 ⚡:** nenhum `.env*` além do `.env.example` em nenhum dos 135 commits; nenhum formato de chave (8 tipos) no histórico nem na árvore; alertas de secret scanning: **0** na 1ª consulta | `scratchpad\evidencias\seguranca-regra7\` |
| **O script dos 6 registros** — só `assets.mime_type`, trava por exceção, idempotente; as partes de leitura validadas pelo MCP | `supabase/correcoes/20260927_tipo_dos_6_envios_webp.sql` |
| **A F1a, escrita e provada estruturalmente — 37 provas, 0 falhas** — e **não commitada** (ver 2) | a árvore de trabalho |

## 2 · Pela metade — e o que falta para retomar

**A F1a está na árvore de trabalho, NÃO commitada** — pedido do dono: sem commit até a prova ao vivo
fechar. `git status` mostra estes arquivos modificados ou novos, **e eles são a F1a, não sujeira**:
`src/lib/assets/{image-bytes,upload-label,upload-client,stored-head}.ts` (novos),
`src/components/canvas/use-image-gestures.ts` (novo), `src/lib/assets/actions.ts`,
`src/lib/generation/asset-payloads.ts`, `src/lib/canvas/store.ts`, `src/components/canvas/flow-canvas.tsx`,
`src/components/nodes/reference-picker.tsx`, `src/lib/i18n/pt-BR.ts`.

**A validação ao vivo não começou.** A aba de `localhost:5599` abriu no **perfil do Chrome de outro
cliente**, caiu na tela de login, e o dono a fechou — nada foi feito nela além de abrir a página e ler a
origem. **Para retomar:**

1. **o dono libera o navegador por mensagem**, dizendo **perfil e porta** (a regra do bastão, em escrita —
   ver 3);
2. antes de qualquer gesto: conferir que a aba é a do **grupo do Claude**, no **perfil do projeto**, e está
   **logada como o usuário do projeto** — tela de login ou outro usuário: parar e perguntar;
3. conferir que a 5599 serve o código novo (`netstat` + `/login` 200);
4. seguir a lista de 10 itens do fim da seção F1a do [plano](plano-produto-diz.md) — projeto de teste novo
   («Teste F1a — colar e soltar»; **o «Projeto teste Foto da Blusa» não se toca**), botão, soltar, colar
   com e sem nome, recusas, campo de texto, link, **o Ctrl+V de verdade** (o dono autorizou usar a área de
   transferência), recarregar, screenshots com nome;
5. prova fechada → commit da F1a, com a doc da F1a em `nodes-geracao.md` e `arquitetura.md`.

**O script dos 6 registros espera o dono rodar** no SQL Editor. **Depois, a prova (Claude, 0 ⚡):**
`npx tsx … harness/varredura-mime-populacao.ts --rodada depois-do-script` → os 104 de 26/09 têm de sair
**104 / 0 / 0** (a rodada "antes" deu 98 / 6 / 0).

**A F0 espera a escolha do dono**, com as quatro leituras ao lado da foto (plano, rodada 5): **(1)** o
padrão da lista de produto — Haiku ou 3.7 Flash; **(2)** a regra 2 do contrato falhou em 2 de 4
(*"infantil"* no Haiku, até no nome; *"feminina"* no Flash): aceitar com o campo editável, ou um aviso
mecânico no card? **Resumo das leituras:** gabarito 4/4 e 3/3 nas quatro; o elástico — Flash 2 de 2 no
punho, Haiku 1 de 2; o tecido como aparência — Flash 2 de 2, Haiku 0 de 2. **Depois da escolha, a F1**
(migration no padrão RAISE EXCEPTION, aplicada pelo dono).

**Em andamento nesta sessão, depois deste commit:** a regra «Navegador» no `CLAUDE.md` e a **trava de
navegador entre projetos** (um hook no nível do usuário), com prova de dois terminais; e a consulta
final dos alertas de secret scanning.

## 3 · O gasto real — 27/09

| o quê | custo real | da carteira |
|---|---|---|
| F0 rodada 5 — Flash 1, Flash 2, Haiku 2 (3 pedidos HTTP) | **7 centavos** (3 + 2 + 2) | 0 |
| limites do Flash, sonda de chaves, varreduras, provas da F1a | 0 | 0 |
| **total da F0 inteira** | **11 centavos de provedor** | **0 Spark — saldo 3.190 ⚡, conferido no banco: nenhum lançamento, geração ou extração desde 07/09** |

> 🔑 **Chaves e contas:** Anthropic, Google, fal e OpenAI aceitas pela sonda em 27/09; xAI sem chave. O
> Google voltou a gerar. **GitHub:** secret scanning e push protection **ligados** desde 27/09 — e
> conferidos pela sonda, não pela memória.

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

**Frente 1 · F0.** (a) O compilador de hoje reproduz o texto de 07/09 **byte a byte**. (b) **Cinco leituras
da foto da blusa**, a última rodada com o pedido gravado como o SDK o serializou: as quatro no contrato v2
passam o gabarito inteiro; **o contrato v2 está no plano, byte a byte**; **a regra 2 reduz a invenção de
público, mas não a elimina** (2 de 4).

**Dois fatos provados ao vivo, de graça:** **recusa de provedor não debita** (`a10f13c0`); e **o filtro que
barrou é do Google, verbatim** (`google.ts:258`).

**Dinheiro, depois do incidente de 29/08.** As quatro travas do motorista, cada uma com simulação
vermelha→verde reexecutável; a fechadura ED25519 do webhook; a trava de vida do endereço de retorno.

**Instrumentos.** `scratchpad\harness\medir-canvas.js` recusa número de canvas não pintado; o dev sobe
sempre na **5599**; **`npm run probe:keys`** confere as chaves sem gastar **e a regra 7 no GitHub**.

---

## O que está ABERTO

| # | o que falta | quem fecha |
|---|---|---|
| 1 | **🎯 Frente 1 — o produto diz o que é** — [`plano-produto-diz.md`](plano-produto-diz.md). **F0 medida, falta a escolha do dono** (e a pergunta da regra 2); **F1a escrita, não commitada** — a validação ao vivo espera o navegador; **o script dos 6** espera o dono rodar; **F1 e F2** depois da F0; **F3** — a prova viva, 75 ⚡ — depois delas. Pior caso: **99 ⚡ de preço, 79 ⚡ da carteira**. ⚠️ *A linha da frente 1 no ROADMAP §4 está velha — "um dia", "estrutural sem dinheiro" — e se corrige no fechamento.* | **dono** — a escolha, o script, a liberação do navegador; Claude — o resto |
| 2 | **Três achados sobre o tipo dos arquivos, fora da F1a:** a **extração de personagem** manda à Anthropic o tipo do navegador (WebP chamado `.jpg` → 400, antes de cobrar — caminho que cobra, decisão do dono); o **envio da imagem canônica** grava o tipo do navegador; os **metadados dos 6 objetos no Storage** dizem `image/jpeg` (ficam: o dono pediu só a coluna) | dono |
| 3 | **Apagar asset da galeria, com auditoria de referências** — o botão não existe. **0 ⚡.** → §9 do [`plano-video-final.md`](plano-video-final.md). *As imagens de teste da F1a vão ficar na galeria até ele existir.* | Claude |
| 4 | **O selo «bloqueada pelo filtro do Google» nunca foi visto em tela** — a F3 é a oportunidade, a 0 ⚡ extra. | oportunidade |
| 5 | **Egress §4.5** — o egress na fatura, esperando o gráfico de Usage. | o relógio |
| 6 | **Perguntas com gatilho:** a **0.3** (a aba escondida trava o elo?); **recusa × concorrência** (n ≥ 30); **a trava de dono da linhagem, provada de um lado só** — o gatilho é a segunda conta. | medição |
| 7 | **Duas perguntas para a frente 5 (Publicação), antes de ela abrir:** publicar **não gasta e não tem volta**; **tokens da Meta por conta não cabem em variável de ambiente**. → [`ROADMAP.md`](ROADMAP.md) §3 e §4 | dono, quando a frente abrir |
| 8 | **Backlog nomeado:** arquivar/ocultar na galeria; filtros e busca; o glifo ⇥ com contraste fraco; três arestas órfãs; o «Reanimar» é tudo-ou-nada; **montar duas vezes o mesmo roteiro faz DOIS filmes idênticos**; **uma leitura de carteira que falha vira «você tem 0 ⚡»** — **mente sobre dinheiro**; **os outros `<dialog>`** com o buraco do `nowheel`; re-semear o canvas quando o HMR cria um store vazio; `edited_at` × `updated_at` em relógios diferentes; **`nanoid` < 3.3.18** (1 alta do `npm audit`, transitiva do Next 16.3.0); **a sonda de chaves na TELA**; o cadastro com confirmação por e-mail no dev local precisaria da 5599 nos redirecionamentos do Supabase. | plano |

---

> **Projeto de prova da frente:** «Projeto teste Foto da Blusa» — o percurso da A′, com a foto
> `06778db7` (WebP, registrada como JPEG — um dos 6) e a geração `0cf3f069`. **O controle da F3 está
> intacto:** a ficha da cena 2 não foi tocada desde 07/09, a @luna ativa é a v4, o card tem nome e 1 foto.
> **Nenhum teste da F1a acontece nele.**

> **O dev sobe na 5599** (`npm run dev`). **Para o ambiente de vídeo** *(a Frente 1 não precisa)*: o túnel
> aponta para `http://localhost:5599` e vive **no comando** —
> `FAL_WEBHOOK_URL="https://<tunel-de-hoje>.trycloudflare.com/api/webhooks/fal" npm run dev`.
