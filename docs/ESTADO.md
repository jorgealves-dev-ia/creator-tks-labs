# ESTADO — onde o projeto está

> **Leia isto primeiro.** Uma página, reescrita **em toda pausa** (regra 9 do
> [`CLAUDE.md`](../CLAUDE.md)). Não é histórico: é o **checklist do projeto agora**.
> O *porquê* está em [`decisoes.md`](decisoes.md); o *o quê e em que ponto* de cada
> frente está no `plano-*.md` dela; o *como está hoje* está no código.

**Última reescrita:** 02/09/2026, com o **Ciclo 3 encerrado** e o veredito do dono dado.

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
A cena entra na linha da geração, a Máquina rege o lote, o trilho espelha o banco, os
dois portões falam a verdade multiplicada antes do clique, e o template «Fluxo de
Storyboard» põe Roteiro + Máquina conectados num clique.

**O percurso de 02/09, por id:** exatamente **3 cobranças de vídeo**, cada uma com o seu
`provider_job_id`, submetidas numa janela de **643 ms** e voltando em 69 s, 74 s e 64 s —
**zero reconciliação à mão**. A conta fecha: 15 + 225 + 630 = **870 ⚡**, saldo 4.150 →
3.280.

**Documentação para qualquer agente.** `AGENTS.md` como ponteiro para o `CLAUDE.md`,
`README.md` como mapa, `.gitattributes` fixando o EOL. Provado que o `next dev` só
reescreve o bloco dele.

**Mini-ciclo Egress.** Fases 0 a 5 fechadas, em produção.

**Dinheiro, depois do incidente de 29/08.** As quatro travas do motorista, cada uma com
simulação vermelha→verde reexecutável; a fechadura ED25519 do webhook; a trava de vida do
endereço de retorno.

---

## O VEREDITO do dono — 02/09/2026

> **O fluxo ficou curto, mas para antes do fim — três "vídeo pronto" e nenhum vídeo.**
> A Máquina precisa terminar em **UM vídeo**, montado no canvas, **sem Spark**.
> **Não é reabrir o desenho; é o rabo dele.**

E a segunda metade: **o trilho não levou o dono ao «Fluxo de Storyboard» na primeira
vez** — ele clicou nos blocos avulsos. **A Máquina vazia deve apontar para o Fluxo.**

---

## O que está ABERTO

| # | o que falta | quem fecha |
|---|---|---|
| 1 | **Aprovar [`plano-video-final.md`](plano-video-final.md)** — o rascunho está em disco, com 6 fases (0 a 5), 8 provas pré-registradas, riscos e **4 perguntas** que esperam resposta. **Nada executa até ele aprovar.** | Jorge |
| 2 | **Três achados da auditoria**, todos com causa nomeada e nenhum consertado: **(b)** o *"falhou neste lote"* que pisca sem falha existir — ternário de dois braços em `machine-video.ts:415`; **(c)** o `produto` da ficha **não entra no prompt** (`scene-prompt.ts:45`) — foi o que deixou a cena 3 sem a blusa; **(d)** aprovar a ficha carimba `edited_at`, e a tela acusa de "editada à mão" quem só aprovou. | plano |
| 3 | **Egress §4.5** — o egress na fatura, esperando o gráfico de Usage. | o relógio |
| 4 | **Perguntas com gatilho:** a **0.3** (a aba escondida trava o elo?) e **recusa × concorrência** (n ≥ 30). | medição |
| 5 | **Backlog nomeado:** o canvas às vezes não desenha as arestas (dado intacto); arquivar/ocultar na galeria; filtros e busca; o glifo ⇥ com contraste fraco; três arestas órfãs; o «Reanimar» é tudo-ou-nada. | — |

**A ordem daqui em diante, decidida em 02/09/2026:**
**A · O vídeo final** → **B · Catálogo aberto** → **C · Modo Take** → **D · Voz e áudio**
→ **E · Passe de UI/UX** → **F · Publicação**.

As notas de C e D já estão em disco: [`notas-modo-take.md`](notas-modo-take.md) e
[`notas-voz.md`](notas-voz.md). **As duas impõem o mesmo requisito ao Catálogo:
capacidades como dado** — fala nativa e seus idiomas, referência de áudio, lipsync,
`voice_id`.

---

## O PRÓXIMO GESTO

**O Jorge lê [`plano-video-final.md`](plano-video-final.md) e responde as quatro
perguntas** — a ordem das fases (a Fase 5 sobe?), se o vídeo montado nasce como node no
canvas, se o botão monta parcial ou fica desabilitado, e se o defeito do `produto`
entra ali ou vai para o Catálogo.

Aprovado o plano, a execução é toda **0 ⚡** — então, pela regra 8 recalibrada, ela sela
com prova estrutural + validação de tela e vai para produção no mesmo dia. **A metade do
dono só volta a ser obrigatória se alguma fase encostar em provedor pago** — e, se
encostar, é sinal de que ela saiu do escopo.

> **Dois projetos de prova ficaram no estúdio:** «Prova · C3 Fase 4» (o par do template)
> e «Projeto novo teste maquina storyboard» (o percurso do dono, com os 3 clipes). O
> segundo é a matéria-prima da Fase 0 do vídeo final — **não apagar antes dela**.

> **Para subir o ambiente de vídeo:** o túnel vive **no comando**, nunca no arquivo —
> `FAL_WEBHOOK_URL="https://<tunel-de-hoje>.trycloudflare.com/api/webhooks/fal" npm run dev`.
