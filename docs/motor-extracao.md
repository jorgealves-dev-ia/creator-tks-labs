# Motor de Extração por Foto & Infraestrutura de Provedores de IA — Especificação v1

> **Creator TKS Labs** · Decisões aprovadas pelo Jorge (E1–E5 abaixo).
> Destino no repositório: `docs/motor-extracao.md`, referenciado pelo índice do `CLAUDE.md`.
> Complementa: `docs/character-sheet.md` (estados e dicionário), `docs/tela-character-sheet.md` (a UX do passo 2 do wizard, já pronta), `docs/versionamento-entidades.md`.

---

## 1. O que este documento define

Duas coisas que nascem juntas, de propósito:

1. **A infraestrutura de provedores de IA** — o catálogo de fornecedores e modelos que servirá o produto inteiro (extração agora; geração de imagem e vídeo depois). Construída uma vez, sem retrabalho.
2. **O motor de extração** — o primeiro consumidor dessa infraestrutura: foto de referência → DNA visual preenchido com a honestidade dos estados (`observado` / `inferido` / `vazio`).

É também a estreia de duas coisas: a **primeira integração de IA** do produto e a **primeira cobrança real no ledger** (Sparks saindo de verdade).

---

## 2. As decisões que regem o motor

**E1 — Multi-fornecedor desde o berço, Anthropic primeiro.** Catálogo de fornecedores (Anthropic, OpenAI, Google, xAI) e seus modelos vive no banco. Só a Anthropic nasce configurada; as demais ficam visíveis porém "apagadas" no seletor até terem chave. Dentro de cada fornecedor, escolhe-se o modelo (simples/avançado). A camada adaptadora garante: fornecedor novo = adaptador novo, zero mudança no código do produto.

**E2 — Extração debita Sparks e registra o custo real.** Preço fixo em Sparks por extração (calibrável por modelo no catálogo), debitado no ledger no sucesso. Cada extração registra tokens consumidos e custo real calculado — a matéria-prima da calibração de preço e do futuro dashboard.

**E3 — Amarelo com motivo.** Todo campo `inferido` carrega uma frase curta do porquê da dúvida ("luz amarelada, cor dos olhos incerta"), exibida no tooltip da revisão.

**E4 — Duas portas, uma regra.** Extração disponível no passo 2 do wizard e no botão "Preencher a partir de foto" da aba DNA do editor. Regra inegociável: **extração só preenche campos vazios — nunca sobrescreve** `observado`, `confirmado` ou o gênero definido no passo 1 (que ela nem tenta preencher).

**E5 — Chave em variável de ambiente; catálogo no banco.** O banco guarda o catálogo (fornecedores, modelos, preços, status) — tudo que o futuro painel super admin vai gerenciar. A chave secreta fica **fora do banco**, em variável de ambiente (`.env.local` no dev, painel da Vercel em produção). "Configurado" (aceso) = a variável existe no servidor, checado sem nunca expor a chave. Quando usuários trouxerem as próprias chaves (futuro), entra armazenamento criptografado — a estrutura já recebe.

**E6 — Duas fontes, um motor.** A extração aceita **foto OU texto colado** (JSON/descrição de personagem vinda de outra plataforma ou outra IA). O pipeline é idêntico nas duas fontes: mapear a entrada para as chaves das listas fechadas, marcar estados com motivo, validar contra o dicionário, preencher só vazios. Importar um character sheet do Magnific ou de qualquer outra ferramenta é colar o texto — e ele vira personagem estruturada, com estados e versões. Preço igual nas duas fontes na v1 (calibração futura pode diferenciá-las).

**Registrado no roadmap (não é desta fase):** painel super admin — gerenciamento de APIs, usuários ativos, métricas SaaS (MRR etc.). Exigência de projeto desde já: toda tabela desta especificação nasce sendo fonte de leitura desse dashboard.

---

## 3. O catálogo de provedores (modelo de dados)

### 3.1 `ai_providers`

| Coluna | Papel |
|---|---|
| `id` uuid PK | — |
| `slug` text UNIQUE | `anthropic`, `openai`, `google`, `xai` |
| `display_name` text | "Anthropic", "OpenAI"… |
| `env_var_name` text | qual variável de ambiente guarda a chave (`ANTHROPIC_API_KEY`…) |
| `enabled` boolean | liga/desliga o fornecedor no produto (governança, não configuração) |
| `created_at` | — |

### 3.2 `ai_models`

| Coluna | Papel |
|---|---|
| `id` uuid PK | — |
| `provider_id` FK | — |
| `slug` text | o identificador oficial do modelo na API do fornecedor |
| `display_name` text | "Claude Sonnet", "Claude Opus"… |
| `capabilities` text[] | `{extraction}` agora; `{image_gen}`, `{video_gen}` depois — o mesmo catálogo serve tudo |
| `extraction_sparks` integer nullable | preço em Sparks por extração (só para modelos com a capability) |
| `is_default` boolean | pré-selecionado no seletor |
| `enabled` boolean | — |

**Seed inicial:** Anthropic com Sonnet (padrão, melhor custo-benefício), Opus (mais caro/minucioso) e Haiku (econômico) — *strings oficiais dos modelos conferidas na documentação da Anthropic no momento da implementação*. OpenAI, Google e xAI entram como fornecedores com 1–2 modelos de visão cada, `enabled` porém sem chave (apagados no seletor). Preço inicial do Sonnet: **10 ⚡ por extração** — chute educado, calibrável com os dados reais do registro (seção 5).

### 3.3 Segurança do catálogo

RLS default-deny; `SELECT` para `authenticated` (o seletor precisa ler); **nenhuma política de escrita** — nesta fase o catálogo é gerenciado por SQL direto (por você), depois pelo painel admin. A chave nunca transita: o status "configurado" é calculado no servidor pela existência da variável de ambiente e entregue como booleano.

### 3.4 A camada adaptadora (código)

Interface `ExtractionProvider` com um método (`extract(foto, dicionário) → resultado bruto`). Uma implementação agora: `AnthropicExtractionProvider`. O produto conversa só com a interface; o seletor decide qual adaptador instanciar. OpenAI/Google/xAI no futuro = arquivo novo, zero mudança no resto.

---

## 4. O motor de extração (fluxo)

### 4.1 Entrada e chamada

1. Usuário escolhe a fonte: **enviar 1 foto** (JPG/PNG/WebP) **ou colar texto** (JSON/descrição de outra plataforma), e confirma o custo ("Esta análise custa 10 ⚡").
2. Foto: sobe para o Storage (`<user_id>/entities/<entity_id>/extraction-<uuid>.<ext>`) — referência auditável. Texto: gravado no registro da extração (coluna `source_text`).
3. Rota de servidor chama o adaptador com a entrada + o prompt de extração. Chamada síncrona (cabe no tempo de função da Vercel; configurar `maxDuration` adequado). Se os limites do plano apertarem na prática, o plano B já é conhecido da casa: padrão assíncrono com Realtime — mas não construir isso antes de precisar.

### 4.2 O prompt de extração (contrato com o modelo)

- Recebe a entrada (foto ou texto colado) e a lista exata de campos com suas opções fechadas (chaves do dicionário).
- Deve devolver **JSON estrito**: para cada campo, `{ "valor": <chave da lista ou null>, "confianca": "alta" | "baixa", "motivo": <frase curta quando baixa> }`.
- Instruções inegociáveis no prompt: descrever **atributos físicos apenas** — nunca tentar identificar, nomear ou reconhecer a pessoa (na foto ou citada no texto); na dúvida entre duas opções, escolher a mais provável com `confianca: baixa` e motivo; o que não dá para avaliar (ex.: altura numa foto de rosto; atributo ausente no texto colado), devolver `null` — **não chutar o inavaliável**. Na fonte texto: vocabulário estrangeiro é mapeado para a chave mais próxima da nossa lista ("long wavy blonde hair" → cor `loiro`, textura `ondulado`, comprimento `inferido` com motivo se o texto não ancorar no corpo).
- Campos que o motor **nunca** preenche: `genero_apresentacao` (o passo 1 manda), toda a Narrativa, todos os Padrões variáveis.

### 4.3 Validação e aplicação (o lado do servidor manda)

1. Resposta validada com Zod **contra o dicionário**: valor que não é chave da lista fechada do campo → descartado, campo fica `vazio`. O modelo não inventa vocabulário — nunca.
2. Mapeamento: `confianca alta` → `observado` · `baixa` → `inferido` (com `motivo` gravado no envelope do campo — campo novo e opcional `motivo` no envelope, só usado por `inferido`) · `null`/inválido → `vazio`.
3. Aplicação no rascunho: **só em campos vazios** (E4). Campos com valor prévio são pulados e contados no resumo como "preservados".
4. Resumo devolvido à tela: "12 observados · 4 inferidos (revise os amarelos) · 9 em branco · 3 preservados".

### 4.4 Cobrança e registro

Tabela **`extractions`** — o diário de bordo do motor (e fonte do futuro dashboard):

| Coluna | Papel |
|---|---|
| `id`, `user_id`, `entity_id`, `model_id` | quem, para quem, com o quê |
| `source` | `photo` / `text` |
| `status` | `succeeded` / `failed` |
| `input_tokens`, `output_tokens` | consumo real reportado pela API |
| `real_cost_cents` | custo real calculado (centavos de BRL, câmbio aproximado registrado) |
| `sparks_charged` | o que foi cobrado |
| `reference_asset_id` FK nullable | a foto usada (fonte photo) |
| `source_text` text nullable | o texto colado (fonte text) |
| `summary` jsonb | o placar (observados/inferidos/vazios/preservados) |
| `created_at` | — |

Regras: débito no ledger **apenas no sucesso** (falha da API = ninguém paga); saldo insuficiente = bloqueio amigável antes da chamada ("você precisa de 10 ⚡ para esta análise"); RLS default-deny com leitura do próprio usuário.

**Crédito de desenvolvimento:** o ledger nasceu vazio — o Code entrega um snippet SQL para você se creditar Sparks manualmente ("crédito manual de desenvolvimento", ex.: R$ 20 = 2.000 ⚡), usando o caminho legítimo do ledger. A compra de Sparks de verdade é assunto da fase de monetização.

### 4.5 A tela

- **Wizard, passo 2:** o "em breve" morre. Duas opções lado a lado: **"Enviar foto"** e **"Colar de outra plataforma"** (área de texto para JSON/descrição) → seletor de modelo (fornecedores/modelos: configurado = aceso; sem chave = apagado com tooltip "configure a chave de API para habilitar") → confirmação de custo → estado "analisando…" → aterrissa no passo 3 com os selos vivos e o contador de amarelos.
- **Editor, aba DNA:** botão "Preencher a partir de foto ou texto" — mesmo fluxo, mesma regra de só-vazios, com o resumo ao final.
- O seletor de modelo nasce como **componente reutilizável**: é o mesmo que os nodes de geração usarão.

---

## 5. Preparo manual do Jorge (independe do código)

1. Criar conta em `console.anthropic.com` (separada da assinatura do chat; cobrança própria por uso).
2. Adicionar crédito inicial pequeno (US$ 5 rendem centenas de extrações).
3. Gerar uma chave de API e guardá-la em local seguro — o Code orienta exatamente onde colocá-la (`.env.local` e painel da Vercel), e ela nunca entra no git nem em chat.

---

## 6. Fora do escopo (de propósito) e registros para as próximas conversas

Painel super admin (roadmap; as tabelas daqui já nascem prontas para ele); chaves trazidas pelo usuário com armazenamento criptografado; extração de múltiplas fotos combinadas (refinamento futuro — v1 é 1 foto); compra de Sparks (fase de monetização).

**Registrados para a conversa da geração canônica (a próxima):**
- **Folha única vs. vistas separadas** — oferecer as duas formas de gerar as canônicas: por vista (um slot de cada vez, trocável individualmente) e folha única em grade (estilo character sheet do Magnific, uma geração só). Não são excludentes; o desenho fino é assunto de lá.
- **Prévia do prompt compilado** — o compilador (character-sheet.md §6) nasce naquela conversa, e com ele o painel "Prompt compilado (prévia)" no editor: o JSON em inglês visível ao vivo. Visível sempre, editável nunca como texto no nível do DNA — edição de prompt acontece nos nodes de geração, preservando as listas fechadas.