# Versionamento de Entidades — Especificação v1

> **Creator TKS Labs** · Aprovado pelo Jorge em 07/08/2026 (3 decisões da seção 2).
> Destino no repositório: `docs/versionamento-entidades.md`, referenciado pelo índice do `CLAUDE.md`.
> Complementa o `docs/character-sheet.md` (seção 2), que descreve o conteúdo do sheet; este documento descreve como esse conteúdo evolui no tempo.

---

## 1. Conceito

Separamos duas coisas que não podem morar juntas:

- **A identidade** — o "RG" da personagem: o handle (`julia`), o nome de exibição, quem é a dona. Vive na tabela `entities`, que já existe.
- **Os retratos congelados** — snapshots completos do sheet ao longo do tempo: v1, v2, v3… Vivem na nova tabela `entity_versions`. Uma vez criados, nunca mudam.
- **O caderno de rascunho** — a coluna `entities.sheet`, que já existe, passa a ser oficialmente o rascunho vivo: é nela que o Jorge edita à vontade. "Salvar como nova versão" é o ato de fotografar o caderno e emoldurar o quadro na parede. O quadro ninguém mais altera; o caderno segue aberto.

`@julia` aponta sempre para a **versão ativa** (um ponteiro na `entities`). `@julia@v2` busca o quadro específico. Voltar atrás é mover o ponteiro — nada se apaga, nada se reescreve.

---

## 2. As três decisões que regem o sistema (07/08/2026)

**D1 — Versão nasce de intenção, não de clique.** Só o botão explícito "Salvar como nova versão" cria versão. Sem versionamento automático a cada edição: o histórico é o diário de evolução da personagem, não um log de teclas.

**D2 — O rascunho pode gerar imagem, com honestidade.** Gerações a partir do rascunho são permitidas (essencial para testar a personagem antes da v1), mas ficam marcadas no histórico como `origem: rascunho — não reproduzível`. Menções `@` em outros nodes resolvem **sempre** para versão congelada, nunca para o rascunho. Entidade sem nenhuma versão salva não pode ser mencionada — a interface orienta: "salve a v1 primeiro".

**D3 — Versões têm cadeado no banco.** Nenhuma versão pode ser editada ou apagada, jamais — trava por trigger no Postgres, no mesmo espírito do ledger financeiro ("trava no banco, não no código"). O máximo permitido é arquivar a entidade inteira.

---

## 3. Modelo de dados

### 3.1 Nova tabela: `entity_versions`

| Coluna | Tipo | Papel |
|---|---|---|
| `id` | uuid, PK | identificador do quadro |
| `entity_id` | uuid, FK → `entities` | de quem é o quadro |
| `user_id` | uuid, FK → `auth.users` | o dono, desnormalizado — mesmo padrão da `entity_images`. Serve ao RLS e, principalmente, ao trigger de 4.1: quando a cascata de exclusão de conta chega aqui, a linha da `entities` já sumiu e o dono precisa estar na própria linha |
| `version_number` | integer | 1, 2, 3… sequencial **por entidade** |
| `sheet` | jsonb | o snapshot completo do character sheet (cópia integral do rascunho no momento do salvamento — nunca um diff) |
| `label` | text, opcional | etiqueta humana: "v2 — cabelo mais curto" |
| `created_at` | timestamptz | quando o quadro foi emoldurado |

Restrições: `UNIQUE (entity_id, version_number)`; e `UNIQUE (id, entity_id)` — esta segunda existe para viabilizar a garantia de integridade do ponteiro (3.2).

### 3.2 Mudanças na tabela `entities`

- Nova coluna `active_version_id` (uuid, nullable) — o ponteiro da versão ativa. Nula enquanto a entidade só tem rascunho (recém-criada).
- **Garantia de integridade do ponteiro:** a FK do ponteiro é composta — `(active_version_id, id)` referencia `entity_versions (id, entity_id)`. Tradução: é o próprio banco que impede o `@julia` de apontar, por bug, para uma versão da `@carla`.
- Nova coluna `archived_at` (timestamptz, nullable), caso ainda não exista — entidade se arquiva, nunca se deleta.
- A coluna `sheet` existente não muda de forma; muda de papel: é o rascunho vivo.

### 3.3 Mudanças na tabela `generations`

- Nova coluna `entity_version_id` (uuid, nullable, FK → `entity_versions`) — qual quadro foi usado na geração.
- Nova coluna `sheet_source` (text, nullable, CHECK em `('version','draft')`) — preenchida sempre que uma entidade participou da geração. `draft` marca as gerações de rascunho (D2).
- Junto do `prompt_compiled` que já é salvo, isso fecha a auditoria: qualquer imagem antiga responde para sempre "quem era a Julia quando você nasceu?".

### 3.4 Imagens canônicas compartilhadas por referência

Nada muda na estrutura da `entity_images`. O compartilhamento já acontece pelo formato do sheet: o bloco `imagens_canonicas` guarda IDs, e ao salvar a v2 o snapshot simplesmente carrega os mesmos IDs da v1, trocando só o que mudou. O que se adiciona é a **proteção**: ver 4.3.

> **Clarificação (07/08/2026):** os IDs guardados em `imagens_canonicas` são **`asset_id`** — ou seja, a coluna `entity_images.asset_id`, que aponta para `assets.id`. Não existe outra leitura possível: a `entity_images` tem chave primária composta `(entity_id, asset_id)` e nenhuma coluna `id` própria. É esse o ID que o trigger de 4.3 procura.

---

## 4. Travas no banco (invariantes — mesmo status das demais)

**4.1 — Versões são append-only.** Triggers `BEFORE UPDATE` e `BEFORE DELETE` em `entity_versions` levantam exceção. Nem o service role edita um quadro.

A única exceção é a **cascata de exclusão de conta**: quando a linha correspondente em `auth.users` já não existe, o delete passa. Esse é justamente o sinal de que se trata de apagamento legítimo de conta, e não de alguém reescrevendo história. É o mesmo precedente da `reject_ledger_delete` (migration `20260807140400_ledger.sql`): o cadeado protege o passado, não impede o usuário de exercer o direito de apagar a própria conta. Para viabilizar essa distinção, a `entity_versions` carrega a coluna `user_id` (ver 3.1) — quando a cascata chega nela, a linha da `entities` já foi removida e não pode mais ser consultada.

Consequência desejada: apagar fisicamente uma entidade que tenha versões também falha, porque a cascata esbarra neste trigger. É a regra 5.5 sendo garantida pelo banco, não só pela aplicação.

**4.2 — Numeração sequencial à prova de corrida.** O `version_number` é atribuído pelo banco no momento do INSERT (próximo número da entidade, calculado com bloqueio da linha da entidade na mesma transação). A `UNIQUE (entity_id, version_number)` é a rede de segurança: dois salvamentos simultâneos jamais produzem dois "v3".

**4.3 — Imagem referenciada por versão é imortal.** Trigger `BEFORE DELETE` em `entity_images`: se o `asset_id` da imagem aparece no bloco `imagens_canonicas` de **qualquer** linha de `entity_versions`, o delete é bloqueado com mensagem explicativa. Imagem referenciada só pelo rascunho continua deletável.

Vale aqui a mesma exceção de 4.1: se a linha em `auth.users` já não existe, o delete passa, porque é cascata de exclusão de conta. Mesmo precedente do ledger.

**4.4 — RLS default-deny na `entity_versions`**, com políticas espelhando as da `entities` (dona enxerga, resto não), no mesmo padrão das outras 9 tabelas. E revogação de EXECUTE nas funções novas, seguindo a convenção da Fase 0.

---

## 5. Regras de comportamento (contrato para a aplicação)

**5.1 — Salvar como nova versão:** copia o rascunho inteiro para uma nova linha de `entity_versions`, recebe o próximo número e **torna-se a versão ativa automaticamente**. O rascunho permanece igual ao snapshot recém-salvo — você continua editando dali. Se o rascunho estiver idêntico à versão ativa, o botão fica desabilitado ("nada mudou desde a v3").

**5.2 — Resolução do `@`:** `@julia` → versão ativa; `@julia@v2` → versão 2, exista ativa ou não; `@julia` sem nenhuma versão salva → erro amigável orientando salvar a v1. Menção nunca resolve para rascunho (D2).

**5.3 — Rollback:** ativar uma versão antiga é só mover o ponteiro `active_version_id`. Opcionalmente, a interface oferece "carregar esta versão no rascunho" para evoluir a partir dela — o que, salvo, vira uma versão **nova** (v4 a partir da v2), nunca uma reescrita.

**5.4 — Indicador de rascunho sujo:** quando `entities.sheet` difere do sheet da versão ativa, a interface mostra "rascunho com alterações não salvas". Comparação direta dos dois jsonb.

**5.5 — Arquivamento:** arquivar a entidade (preencher `archived_at`) a esconde das listas e bloqueia novas gerações e menções, mas preserva tudo — versões, imagens, histórico. Desarquivar é limpar o campo. Delete físico de entidade com versões: proibido.

---

## 6. Fora do escopo desta especificação (de propósito)

A interface do formulário do sheet e do seletor de versões (próxima conversa), a geração das imagens canônicas (a seguinte), e o diff visual entre versões ("o que mudou da v1 para a v2?") — este último fica anotado como melhoria futura natural, já que os snapshots completos o tornam trivial de calcular.