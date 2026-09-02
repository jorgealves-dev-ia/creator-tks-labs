<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
---

# Creator TKS Labs — para qualquer agente

Estúdio de criação de conteúdo com IA em **canvas infinito de nodes**: imagens,
vídeos e influencers de IA com consistência de personagem, para Instagram,
TikTok/TikTok Shop, Shopee, YouTube e anúncios.

> **Este arquivo é um ponteiro, não uma cópia.** As regras de verdade estão no
> [`CLAUDE.md`](CLAUDE.md). **Se isto e o `CLAUDE.md` divergirem, vale o
> `CLAUDE.md`** — e a divergência é um defeito deste arquivo, para consertar
> aqui, nunca lá.
>
> Ele existe porque a convenção que outros agentes procuram tem outro nome, e
> um repositório com regras invisíveis é um repositório sem regras. Ele **não**
> repete o `CLAUDE.md` porque uma cópia de 37 KB que muda toda sessão diverge em
> silêncio, e um agente obedecendo à metade velha com confiança total é pior que
> um agente que precisou abrir mais um arquivo. *(Este projeto já pagou por
> isso: uma instrução morta sobreviveu dois meses em três lugares — está em
> `docs/decisoes.md`.)*

## Leia nesta ordem, antes de escrever qualquer linha

| # | arquivo | o que ele responde |
|---|---|---|
| 1 | [`docs/ESTADO.md`](docs/ESTADO.md) | **em que pé está o projeto agora** — o que está provado, o que está aberto, o próximo gesto. Uma página, reescrita a cada pausa |
| 2 | [`CLAUDE.md`](CLAUDE.md) | as **invariantes**, a segurança, os limites de autonomia e o ritual de fechamento. Leitura obrigatória |
| 3 | `docs/plano-*.md` | **o que falta** na frente em que você vai mexer, e o que prova cada fase |
| 4 | [`docs/decisoes.md`](docs/decisoes.md) | **por que** as coisas são como são, em ordem cronológica |

O [`README.md`](README.md) é o mapa para uma pessoa; este arquivo e o
`CLAUDE.md` são as regras para quem escreve código.

## Quatro regras que valem mesmo se você não abrir mais nada

Estão duplicadas aqui **de propósito**, contra a regra de fonte única acima:
são curtas, são estáveis, e o custo de não saber cada uma é dinheiro real ou um
segredo vazado. Todas as outras estão no `CLAUDE.md`.

1. **Segredo nenhum sai do `.env.local`.** Não leia `.env*`, não ecoe variável
   de ambiente em terminal, log, commit, resposta de API ou arquivo. O que
   viaja para a tela é o booleano *"configurado"*, calculado no servidor. A
   `SUPABASE_SERVICE_ROLE_KEY` ignora RLS e é exclusiva de código de servidor.
2. **Migration: você escreve o arquivo, o Jorge aplica.** Toda mudança de
   schema é um arquivo novo em `supabase/migrations/`. **Nenhum agente roda
   `db push`.** Depois de aplicada, `src/lib/supabase/database.types.ts` é
   **gerado do banco**, nunca escrito à mão.
3. **Provedor de IA só do servidor.** Nenhuma chave de modelo chega ao browser,
   e nenhum código de produto chama API de modelo direto: tudo pela interface
   `GenerationProvider` em `src/lib/providers/`. Modelo novo = linha no
   catálogo (`ai_models`, por migration) + adaptador.
4. **Antes de todo clique que pode gastar, o pior caso por escrito.** *"Se tudo
   der errado, custa no máximo X"* — e **se X ≠ o número que o portão mostra, o
   clique não acontece** (R1). O motorista de lote tem quatro tetos, cada um
   com simulação vermelha→verde reexecutável: uma submissão por cena por
   clique, limite do lote = tamanho do lote, nunca resubmissão automática, e o
   lote é uma lista fechada (R2). *Um clique de 210 ⚡ já virou 626 submissões
   nesta base — o post-mortem está no `decisoes.md`, em 29/08/2026.*

## Convenções, em uma linha cada

Identificadores e comentários em **inglês**; texto de UI em **pt-BR**,
centralizado em `src/lib/i18n/pt-BR.ts`. TypeScript strict, `any` proibido.
Server Components por padrão. Zod em toda fronteira. Conventional Commits.
`npm run lint` e `npm run typecheck` antes de qualquer commit.
