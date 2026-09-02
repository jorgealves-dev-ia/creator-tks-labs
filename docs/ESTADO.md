# ESTADO — onde o projeto está

> **Leia isto primeiro.** Uma página, reescrita **em toda pausa** (regra 9 do
> [`CLAUDE.md`](../CLAUDE.md)). Não é histórico: é o **checklist do projeto agora**.
> O *porquê* está em [`decisoes.md`](decisoes.md); o *o quê e em que ponto* de cada
> frente está no `plano-*.md` dela; o *como está hoje* está no código.

**Última reescrita:** 02/09/2026, com a Fase 4 do Ciclo 3 fechada e em produção.

---

## O que está PROVADO

**A fundação.** Canvas de nodes, projetos, character sheet com versões congeladas,
motor de extração, compilador determinístico, geração de imagem canônica, ledger
append-only com as travas no banco. As 15 tabelas com RLS default-deny.

**Frente Storyboard · Ciclo 1 — o elo.** Dois capítulos de vídeo emendam: o último
quadro de um clipe vira o primeiro do seguinte, por asset derivado
(`derived_from_asset_id`). ⚠️ *O **veredito humano** do elo — "os clipes emendam a
ponto de parecer um filme só?" — está **NÃO MEDIDO com gatilho**, não aprovado.*

**Frente Storyboard · Ciclo 2 — o Roteiro.** O node de Roteiro escreve o storyboard
por IA, com cenas estruturadas no banco. Fechado.

**Frente Storyboard · Ciclo 3 — a Máquina. Fases 0 a 4 fechadas.** A cena entra na
linha da geração (`generations.scene_id`), a Máquina nasce, o trilho espelha, o lote
de imagens aprova/repete por cena, **o lote de vídeo com portão está provado em campo**
(31/08) — e o **template «Fluxo de Storyboard»** põe Roteiro + Máquina conectados e
enquadrados num clique (02/09), com as sete provas em número. As sete decisões (D1–D7)
tomadas.

**Documentação para qualquer agente** (02/09). `AGENTS.md` como **ponteiro** para o
`CLAUDE.md`, com frase de precedência e quatro regras duplicadas de propósito;
`README.md` como mapa do projeto; `.gitattributes` fixando o EOL do `AGENTS.md`. Provado
que o `next dev` só reescreve o bloco dele: **o nosso conteúdo sobreviveu 8/8** ao teste
de apagar o bloco e subir o servidor.

**Mini-ciclo Egress.** Miniaturas, URL assinada estável e cache imutável — Fases 0 a 5
fechadas, em produção.

**Dinheiro, depois do incidente de 29/08.** As quatro travas do motorista — R2.1 a
R2.4 —, cada uma com simulação vermelha→verde reexecutável. Mais a **fechadura** do
webhook (ED25519 sobre o corpo bruto) e a **trava de vida** do endereço de retorno, uma
ida à rede por clique.

**Os números do dia 31/08:** dois cliques pagos, **630 ⚡**, **3 clipes**, **0
submissões acidentais** — contra 4.200 ⚡ e 626 submissões dois dias antes. **E o painel
da fal fechou a conta por id: 3 requisições, nenhuma além das nossas.**

**O dia 02/09 custou 0 ⚡ e 0 submissões**, do primeiro ao último gesto: `generations`
709, `ledger_transactions` 101, `assets` 94 e saldo **4.150 ⚡** idênticos no começo e no
fim, com os dois carimbos de tempo iguais ao microssegundo.

---

## O que está ABERTO

| # | o que falta | quem fecha |
|---|---|---|
| 1 | **Ciclo 3 · Fechamento** — a régua percorrida do zero pelo dono (9 gestos previstos) e o veredito *"o fluxo ficou curto?"*. Mais a anatomia da Máquina entrando na §3 normativa de [`nodes-geracao.md`](nodes-geracao.md) e o roadmap em [`produto.md`](produto.md). | Jorge |
| 2 | **`docs/plano-catalogo-c4.md`** — rascunho do Ciclo 4, **só o plano, nada executa**, depois que o Ciclo 3 fechar. | Claude |
| 3 | **Egress §4.5** — o egress na fatura, esperando o gráfico de Usage ter dias suficientes. | o relógio |
| 4 | **Perguntas com gatilho:** a **0.3** (a aba escondida trava o elo? — os cliques de 31/08 foram com a aba à frente, de propósito) e **recusa × concorrência** (decide em n ≥ 30). | medição |
| 5 | **Backlog nomeado:** 🆕 **o canvas às vezes não desenha as arestas** (dado intacto, reprodução escrita); arquivar/ocultar na galeria; filtros e busca; o glifo ⇥ com contraste fraco; três arestas órfãs no grafo salvo; o «Reanimar» é tudo-ou-nada. | — |

**A ordem dos próximos ciclos, decidida em 31/08/2026:**
**4 Catálogo aberto** → **5 Modo Take** → **6 Voz e áudio** → **Passe de UI/UX** →
**Publicação**.

---

## O PRÓXIMO GESTO

**O Fechamento do Ciclo 3, e ele é do Jorge:** percorrer o caminho do zero num projeto
novo, com a régua ao lado, contando os gestos de verdade contra os **9** previstos — e
dar o veredito que nenhuma consulta dá: *o fluxo ficou curto?* Se ainda parecer longo, o
desenho volta à mesa; está registrado desde 17/08 e vale como está escrito.

O caminho agora começa em **um clique**: «Fluxo de Storyboard», no trilho lateral.

Depois disso, e só depois, o rascunho do `docs/plano-catalogo-c4.md` — **só o plano,
nada executa**.

> **O projeto «Prova · C3 Fase 4»** ficou no estúdio com o par do template dentro: é o
> artefato vivo da prova, e o Jorge o apaga depois do Fechamento.

> **Para subir o ambiente de vídeo:** o túnel vive **no comando**, nunca no arquivo —
> `FAL_WEBHOOK_URL="https://<tunel-de-hoje>.trycloudflare.com/api/webhooks/fal" npm run dev`.
> O porquê, com as **quatro** vezes que custaram, está no [`CLAUDE.md`](../CLAUDE.md).
