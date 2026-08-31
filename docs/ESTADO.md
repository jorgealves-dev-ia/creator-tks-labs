# ESTADO — onde o projeto está

> **Leia isto primeiro.** Uma página, reescrita **em toda pausa** (regra 9 do
> [`CLAUDE.md`](../CLAUDE.md)). Não é histórico: é o **checklist do projeto agora**.
> O *porquê* está em [`decisoes.md`](decisoes.md); o *o quê e em que ponto* de cada
> frente está no `plano-*.md` dela; o *como está hoje* está no código.

**Última reescrita:** 31/08/2026, com a Fase 3 do Ciclo 3 fechada e commitada.

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

**Frente Storyboard · Ciclo 3 — a Máquina. Fases 0, 1, 2 e 3 fechadas.** A cena entra
na linha da geração (`generations.scene_id`), a Máquina nasce, o trilho espelha, o
lote de imagens aprova/repete por cena, e **o lote de vídeo com portão está provado em
campo** (31/08): teto, mira, caminho de volta e cadeia. As sete decisões (D1–D7)
tomadas.

**Mini-ciclo Egress.** Miniaturas, URL assinada estável e cache imutável — Fases 0 a 5
fechadas, em produção.

**Dinheiro, depois do incidente de 29/08.** As quatro travas do motorista — R2.1 (uma
submissão por cena por clique), R2.2 (limite do lote = tamanho do lote), R2.3 (nunca
resubmissão automática) e **R2.4 (o lote é uma lista fechada: só anima o que o clique
autorizou)** —, cada uma com simulação vermelha→verde reexecutável. Mais a
**fechadura** do webhook (ED25519 sobre o corpo bruto) e a **trava de vida** do
endereço de retorno, uma ida à rede por clique.

**Os números do dia 31/08:** dois cliques pagos, **630 ⚡**, **3 clipes**, **0
submissões acidentais** — contra 4.200 ⚡ e 626 submissões dois dias antes. **E o
painel da fal fechou a conta por id: 3 requisições, nenhuma além das nossas** — a
conferência *log × painel*, aberta desde o incidente, fecha nos dois sentidos.

---

## O que está ABERTO

| # | o que falta | quem fecha |
|---|---|---|
| 1 | **Ciclo 3 · Fase 4** — o template no sidebar (Roteiro + Máquina em um clique, −3 gestos) **e a documentação para qualquer agente**: `AGENTS.md`, `README.md` e o hábito de reescrever este arquivo. | Claude |
| 2 | **Ciclo 3 · Fechamento** — a régua percorrida do zero pelo dono (9 gestos previstos) e o veredito *"o fluxo ficou curto?"*. Mais a anatomia da Máquina entrando na §3 normativa de [`nodes-geracao.md`](nodes-geracao.md) e o roadmap em [`produto.md`](produto.md). | Jorge |
| 3 | **`docs/plano-catalogo-c4.md`** — rascunho do Ciclo 4, **só o plano, nada executa**, depois que o Ciclo 3 fechar. | Claude |
| 4 | **Egress §4.5** — o egress na fatura, esperando o gráfico de Usage ter dias suficientes. | o relógio |
| 5 | **Perguntas com gatilho:** a **0.3** (a aba escondida trava o elo? — os cliques de 31/08 foram com a aba à frente, de propósito) e **recusa × concorrência** (decide em n ≥ 30). | medição |
| 6 | **Backlog nomeado:** arquivar/ocultar na galeria; filtros e busca; o glifo ⇥ com contraste fraco; três arestas órfãs no grafo salvo; o «Reanimar» é tudo-ou-nada. | — |

**A ordem dos próximos ciclos, decidida em 31/08/2026:**
**4 Catálogo aberto** → **5 Modo Take** → **6 Voz e áudio** → **Passe de UI/UX** → **Publicação**.

---

## O PRÓXIMO GESTO

**A Fase 4 do Ciclo 3**, e ela não precisa de dinheiro nem do dono para começar: o
item «Máquina de Storyboard» no trilho lateral, que põe Roteiro + Máquina conectados
e enquadrados num clique, e os três arquivos de documentação. Pela regra 8
recalibrada (31/08), **isso sela com prova estrutural + validação de tela e vai para
produção no mesmo dia** — não espera clique de ninguém, porque nada ali gasta.

Depois: o Fechamento do ciclo (que é do Jorge, com a régua na mão) e o rascunho do
plano do Catálogo.

> **Para subir o ambiente de vídeo:** o túnel vive **no comando**, nunca no arquivo —
> `FAL_WEBHOOK_URL="https://<tunel-de-hoje>.trycloudflare.com/api/webhooks/fal" npm run dev`.
> O porquê, com as **quatro** vezes que custaram, está no [`CLAUDE.md`](../CLAUDE.md).
