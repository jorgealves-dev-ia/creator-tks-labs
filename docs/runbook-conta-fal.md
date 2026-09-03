# Runbook — Como fechar a conta da fal **por id**

> **O que este arquivo é.** O procedimento, passo a passo, para conferir que o painel da
> fal e o nosso banco contam a mesma história depois de um dia com vídeo. É a metade da
> prova que **só o dono fecha** — o Claude lê o nosso lado; o lado de lá exige a conta
> logada.
>
> **Quando rodar:** ao fim de toda sessão que submeteu vídeo a provedor pago. Custo:
> **0 ⚡** — é só leitura, dos dois lados.

---

## 1. Por que ele existe

Em **29/08/2026**, um clique de 210 ⚡ submeteu **626 gerações** em três minutos. Quem
parou o estrago não fomos nós: foi o saldo pré-pago da fal ficando negativo. O nosso lado
sabia de **20 cobranças**; o lado deles tinha **626 requisições**. A distância entre os
dois números é o buraco, e ninguém a viu porque ninguém olhou o painel.

Daí a regra, escrita naquele dia e confirmada nas duas conferências desde então:

> ### **Quando existe um painel, o painel é a fonte.**
> Nunca a conta de cabeça do lado de cá.

---

## 2. A regra do procedimento: **por id, nunca por total**

**Contar requisições não prova nada.** Três de um lado e três do outro pode ser
coincidência de dois erros que se cancelam — uma submissão nossa perdida e uma
submissão órfã do lado de lá dão o mesmo total e escondem duas falhas.

**Três identificadores que casam um a um não podem.** Cada `provider_job_id` do nosso
banco é o mesmo identificador que a fal mostra no painel dela; a conferência é um
casamento de listas, não uma soma.

**E ela fecha nos dois sentidos — os dois importam, e são falhas diferentes:**

| sentido | o que prova | a falha que ele pega |
|---|---|---|
| **painel ⊆ banco** — nenhuma requisição lá sem linha em `generations` | que nada saiu daqui sem ser cobrado e registrado | **o incidente de 29/08**: 626 lá, 20 aqui |
| **banco ⊆ painel** — nenhum `provider_job_id` nosso ausente lá | que nada que cobramos se perdeu no caminho | cobrança sem submissão |

---

## 3. O procedimento

### Passo 1 · tirar os ids do nosso lado (SQL Editor do Supabase)

```sql
-- Todas as submissões de vídeo do dia, com o id que a fal também conhece.
select
  g.created_at,
  g.completed_at,
  g.status,
  g.model,
  g.scene_id,
  g.sparks_charged,
  g.provider_job_id
from generations g
where g.media_kind = 'video'
  and g.provider   = 'fal'
  and g.created_at >= date '2026-09-02'          -- ← o dia a conferir
  and g.created_at <  date '2026-09-03'
order by g.created_at;
```

Duas conferências de sanidade **antes** de abrir o painel, porque elas pegam defeito
nosso sem precisar de ninguém:

```sql
-- (a) nenhuma geração de vídeo sem job, e nenhum job repetido
select
  count(*)                             as linhas,
  count(provider_job_id)               as com_job,
  count(distinct provider_job_id)      as jobs_distintos
from generations
where media_kind = 'video' and provider = 'fal'
  and created_at >= date '2026-09-02' and created_at < date '2026-09-03';
-- os três números têm de ser iguais
```

```sql
-- (b) o extrato bate com a carteira (ledger append-only é a fonte)
-- No SQL Editor não há sessão, então auth.uid() é nulo: agrupa por carteira.
select
  w.user_id,
  w.balance_cents                    as saldo,
  coalesce(sum(t.amount_cents), 0)   as soma_ledger
from wallets w
left join ledger_transactions t on t.user_id = w.user_id
group by w.user_id, w.balance_cents;
-- saldo e soma_ledger têm de ser iguais em toda linha
```

### Passo 2 · conferir cada id no painel da fal

Com a lista de ids na mão, abrir o painel da fal logado e **procurar por identificador**.

> ### ⚠️ A armadilha: **a *Recent History* não tem filtro de data.**
> Foi ela que **escondeu o dia** em 02/09. A lista é *recente*, não *do dia*: não existe
> seletor de período para pedir "02/09". Quem chega procurando o dia não acha o dia, e a
> conclusão errada — *"não há nada lá"* — está a um passo.
>
> **A saída é não procurar pelo dia: procurar pelos ids.** A lista do Passo 1 é a
> pergunta; o painel só responde sim ou não para cada linha dela. É mais uma razão para
> o procedimento ser por id — aqui ele não é só mais forte, é **o único que funciona**.

Para cada id da lista, marcar:

- [ ] o id aparece no painel
- [ ] a duração/o modelo batem com o que pedimos
- [ ] o horário bate com o `created_at` do banco

E então a metade que só o painel responde:

- [ ] **nenhuma requisição no painel que não esteja na lista** ← *esta é a metade que o incidente destruiu*

### Passo 3 · registrar

Uma linha em [`decisoes.md`](decisoes.md) com a data, a contagem e o veredito
*"nenhuma além das nossas"* — ou, se não fechou, o que sobrou de cada lado.

---

## 4. Quando **não** fecha

| o que apareceu | o que significa | o que fazer |
|---|---|---|
| **requisição no painel sem linha no banco** | submissão que escapou do nosso registro — **a forma do incidente de 29/08** | parar tudo. Não é conferência, é vazamento: achar o caminho que submete sem gravar antes de qualquer clique novo |
| **`provider_job_id` nosso ausente no painel** | cobramos por algo que não chegou lá | estorno, pela **R4** do [`CLAUDE.md`](../CLAUDE.md) — um lançamento por geração, autorizado pelo Jorge |
| **`provider_job_id` repetido no banco** | duas cobranças para uma submissão | estorno de uma delas, e caçar a dupla escrita |
| **geração de vídeo com `provider_job_id` nulo** | ou a submissão falhou antes de sair, ou o retorno não gravou o id | conferir o `status`; se `succeeded` sem id, o defeito é nosso e é de registro |

---

## 5. As conferências já feitas

| data | requisições | veredito |
|---|---:|---|
| **31/08/2026** | 3 | `01a0586b…` (cena 1), `01a058f0-771d…` (cena 5), `01a058f0-7dbb…` (cena 2) — **nenhuma além das nossas**. Primeira vez que a conferência log × painel fechou, aberta desde 29/08 |
| **02/09/2026** | 3 | `01a0643e-d1ff…` (cena 1), `01a0643e-d326…` (cena 3), `01a0643e-d464…` (cena 2) — **nenhuma além das nossas**. Submissões numa janela de 643 ms, retornos em 69 s, 74 s e 64 s, zero reconciliação à mão. **É a conferência em que a *Recent History* escondeu o dia** |

---

## 6. O que este runbook **não** substitui

- **R3 do [`CLAUDE.md`](../CLAUDE.md):** o saldo pré-pago da fal é o teto de estrago.
  Recarga automática, nunca. Conferir depois não impede nada — **o saldo pequeno impede.**
- **A trava de vida do webhook e os tetos do motorista.** Este procedimento é auditoria
  *post-mortem*; as travas são o que faz não haver o que auditar.
