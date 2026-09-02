# Creator TKS Labs

Estúdio de criação de conteúdo com IA baseado em **canvas infinito de nodes**, para
gerar imagens, vídeos e influencers de IA com consistência de personagem — criativos
para Instagram, TikTok/TikTok Shop, Shopee, YouTube e anúncios.

O princípio que decide as dúvidas de desenho: **poder de profissional, simplicidade de
leigo.** Os nodes têm nomes de intenção — *Input de Produto*, *Gerar Imagem*, *Máquina
de Storyboard* —, nunca de implementação.

---

## Como subir

```bash
npm install
npm run dev            # http://localhost:3000
```

Precisa de um `.env.local` com as chaves do Supabase e dos provedores de IA. O
`.env.example` traz a lista com placeholders — **os valores são manuais, por design.**

**Para gerar vídeo, o endereço de retorno do webhook vive NO COMANDO:**

```bash
FAL_WEBHOOK_URL="https://<tunel-de-hoje>.trycloudflare.com/api/webhooks/fal" npm run dev
```

Ele **não mora no `.env.local`**. Não é segredo — é um endereço com validade de
algumas horas, e um valor perecível guardado num arquivo permanente é uma armadilha
que arma sozinha. Já custou quatro vezes; as quatro estão contadas no
[`CLAUDE.md`](CLAUDE.md).

```bash
npm run lint           # eslint
npm run typecheck      # next typegen && tsc --noEmit
npm run build          # NUNCA com o dev no ar: os dois escrevem no mesmo .next/
```

Migrations são criadas com `supabase migration new <nome>` e **aplicadas à mão pelo
dono** — ver [`CLAUDE.md`](CLAUDE.md).

---

## Onde ficam as coisas

```
src/app/                    rotas, Route Handlers e webhooks
src/components/
  canvas/                   o canvas, o trilho lateral, o autosave
  nodes/                    um componente por tipo de node
src/lib/
  canvas/                   store (zustand), grafo salvo, ações
  providers/                os adaptadores de IA — nada chama modelo direto
  generation/               fila, capacidade, cobrança
  storyboard/               roteiro e a Máquina
  sparks/                   dinheiro, em centavos inteiros
  i18n/pt-BR.ts             TODO texto de UI, num lugar só
supabase/
  migrations/               toda mudança de schema
  travas/                   provas reexecutáveis das travas de banco
docs/                       a documentação (abaixo)
```

---

## Para onde ir a seguir

| # | leia | para saber |
|---|---|---|
| 1 | [`docs/ESTADO.md`](docs/ESTADO.md) | **em que pé o projeto está agora.** Uma página, reescrita a cada pausa |
| 2 | [`docs/produto.md`](docs/produto.md) | o que é, para quem, e o roadmap |
| 3 | [`docs/arquitetura.md`](docs/arquitetura.md) | as decisões estruturais **com o porquê de cada uma**, o modelo de dados e a stack |
| 4 | `docs/plano-*.md` | o que falta em cada frente, e o que prova cada fase |
| 5 | [`docs/decisoes.md`](docs/decisoes.md) | **por que** as coisas são como são — diário cronológico |

As especificações fechadas vivem ao lado: character sheet, versionamento de entidades,
motor de extração, geração canônica e a anatomia dos nodes. O índice completo está no
[`CLAUDE.md`](CLAUDE.md).

**Se você é um agente de IA**, comece por [`AGENTS.md`](AGENTS.md) e
[`CLAUDE.md`](CLAUDE.md): eles trazem as invariantes que o código não pode violar e os
limites do que dá para fazer sem perguntar.

---

## Stack

Next.js (App Router) · TypeScript strict · React Flow (`@xyflow/react`) ·
Tailwind · Supabase (Postgres + Auth + Storage + Realtime, com RLS default-deny) ·
Vercel.

---

## Status

Em desenvolvimento ativo.

**Código proprietário, todos os direitos reservados. Repositório público durante o
desenvolvimento.**
