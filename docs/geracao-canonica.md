# Compilador de Prompt & Geração das Imagens Canônicas — Especificação v1

> **Creator TKS Labs** · Decisões G1–G4 aprovadas pelo Jorge.
> Destino no repositório: `docs/geracao-canonica.md`, referenciado pelo índice do `CLAUDE.md`.
> Complementa: `docs/character-sheet.md` (§6 regras de compilação, §5.22 traje canônico), `docs/motor-extracao.md` (catálogo de provedores), `docs/versionamento-entidades.md`.
> Insumo de contexto: a inspeção do fluxo profissional do Magnific validou o padrão âncora ("semente → âncora → tudo referencia a âncora") e provou que a consistência lá é manual — a nossa é automática via `@`.

---

## 1. O que este documento define

Duas peças que nascem juntas porque uma alimenta a outra:

1. **O compilador** — a função que transforma o character sheet em prompt de identidade em inglês, determinístico, com prévia visível ao vivo no editor. É a materialização das regras que o `character-sheet.md` §6 escreveu no primeiro dia.
2. **A geração das imagens canônicas** — a folha completa (a âncora universal da identidade) e as seis vistas sob demanda. É o momento em que a personagem deixa de ser texto e ganha rosto — a estreia da capability `image_gen` no catálogo de provedores.

## 2. As decisões que regem esta fase

**G1 — A folha nasce do DNA compilado, texto puro.** Nenhuma foto de referência na v1 da geração canônica. Motivos: é o padrão do fluxo profissional inspecionado (texto → rosto-base → tudo referencia); prova que o DNA funciona (folha errada = campo errado, visível e corrigível); e evita clonagem de rosto de pessoa real — a mesma ética que fez a extração recusar identificação. Foto-referência opcional fica registrada para estudo futuro, com cuidados próprios.

**G2 — Modelo padrão: Google Nano Banana Pro.** *(Superada em 10/08/2026: o padrão passou a ser o Nano Banana 2, com a evidência das nossas próprias gerações no lugar da inspeção alheia. A decisão fica registrada como foi tomada — ver `decisoes.md`.)* Evidência da inspeção: é o modelo escolhido em todos os geradores de um fluxo profissional de consistência, inclusive na grade de variações. GPT Image (OpenAI) e Grok Imagine (xAI) entram no catálogo como alternativas desde já (apagadas até chave + adaptador). Slugs, preços e configurações reais: da documentação oficial no momento da implementação, nunca de memória.

**G3 — Folha única vertical como padrão; vistas sob demanda.** A folha completa (grade com frente, ¾, perfil, costas, close de rosto e expressões numa imagem só, formato vertical; horizontal como opção) ganha slot próprio e vira a referência universal de identidade. As seis vistas separadas continuam existindo, geradas **sob demanda usando a folha como referência de imagem** — âncora primeiro, resto referencia a âncora.

**G4 — Síncrono agora, assíncrono quando precisar.** Geração canônica é uma imagem por clique — cabe no tempo de função como a extração. O padrão assíncrono (fila → webhook → Realtime) estreia na conversa dos nodes de geração e vídeo, onde é inevitável.

**Registrado no roadmap (pedido do Jorge):** conversa dedicada a **Storyboard + Vídeos** — depois dos nodes de geração; chega junto com o padrão assíncrono.

---

## 3. O compilador

### 3.1 O que ele é

Função **pura e determinística**: recebe um sheet (rascunho ou versão congelada) e devolve o **bloco de identidade** em inglês. Sem chamadas de rede no caminho principal, sem variação entre execuções — o mesmo sheet produz o mesmo prompt hoje e daqui a um ano.

Saída em dois formatos, do mesmo objeto:
- **Estrutura** (JSON com blocos nomeados): `identidade` (gênero, idade, rosto, pele, cabelo, corpo, marcas), `traje_canonico`, `cena_padrao` (fundo, luz, enquadramento — Camada 2), `restricoes`.
- **Texto final** (render da estrutura na ordem fixa do §6 regra 1) — o que vai para a API de imagem.

### 3.2 As regras (herdadas do character-sheet.md §6 — inegociáveis)

Só `observado` e `confirmado` entram; frases fixas do dicionário copiadas literalmente; DNA insobrescrevível; Camada 2 com hierarquia node > default; restrições sempre ao final; Narrativa nunca; ordem fixa.

### 3.3 Campos livres: tradução com cache

Os campos livres (`detalhes`, `descricao` de marcas, `restricoes`) são escritos em português e precisam chegar em inglês. Regra: **tradução no salvamento, com cache** — quando um campo livre muda e o autosave grava, uma chamada barata (Haiku) traduz e guarda `detalhes_en` no próprio envelope, invalidado a cada edição. O compilador lê só o cache — segue puro e determinístico. Custo interno (fração de centavo por edição), não cobrado em Sparks — entra na margem das gerações. Campo livre ainda sem cache (corrida rara): a prévia sinaliza "traduzindo…" e a geração aguarda o cache.

### 3.4 A prévia no editor ("Prompt compilado")

Seção recolhível no editor, ao vivo: mostra o **texto final** em inglês (alternável para a estrutura JSON), atualizando conforme os campos mudam. Junto, o placar de honestidade: "não entram: 3 inferidos aguardando confirmação, 9 em branco". Disponível também no modo somente-leitura das versões (compila a versão vista). **Visível sempre, editável nunca** — edição de prompt acontece nos nodes de geração; aqui, mudar o prompt é mudar os campos. Botão copiar.

### 3.5 `prompt_compiled` por geração

Toda geração grava o texto final usado (invariante desde a Fase 0) — auditoria eterna de "quem era a Julia quando esta imagem nasceu".

---

## 4. A geração canônica

### 4.1 Catálogo (migration)

- Capability nova `image_gen`; coluna de preço `image_sparks` em `ai_models` (mesma lógica do `extraction_sparks`; CHECK preço-exige-capability).
- Seeds: **Google Nano Banana Pro**, **Nano Banana 2**, GPT Image (OpenAI), Grok Imagine (xAI) — slugs e preços oficiais conferidos na documentação na implementação; preço inicial em Sparks = chute educado com margem sobre o custo oficial, calibrável com dados reais (o padrão da casa). **O `is_default` do image_gen era o Pro e passou a ser o Nano Banana 2 em 10/08/2026**, por migration e com a evidência das nossas próprias gerações — ver [`decisoes.md`](./decisoes.md).
- Adaptador implementado nesta fase: **só o do Google** (imagem). OpenAI/xAI ficam `no_adapter` → "(em breve)" no seletor — o estado honesto que já existe.
- Registro e cobrança: a tabela `generations` (Fase 0) é adaptada para o padrão provado em `extractions` — `model_id`, `status`, tokens/unidades, `real_cost_cents`, `sparks_charged`, `error_message`, `summary` — e nasce a função `record_generation` no banco, gêmea da `record_extraction`: preço do catálogo (nunca de parâmetro), débito atômico só no sucesso, EXxxx amigáveis. O Code mapeia contra o schema real da `generations` e propõe a migration.

### 4.2 O prompt da folha

Montado pelo compilador + moldura, nesta ordem: **moldura de reference sheet** (§5.22: `professional full-body character reference sheet…`) → **instrução de composição da grade** (células: frente corpo inteiro, ¾, perfil, costas, close de rosto, expressões; vertical por padrão) → **bloco de identidade** → **traje canônico** (biquíni/sunga, descalço) → **fundo/luz/enquadramento padrão** → **restrições**. Fallback do traje: regra de compilação nº 10 já escrita — recusa/degradação → uma retentativa com compressão esportiva, registrada e visível.

### 4.3 As vistas sob demanda

Cada slot vazio de vista ganha botão "Gerar": prompt = moldura + instrução da vista específica + bloco de identidade + traje + restrições, **com a folha completa anexada como referência de imagem**. Sem folha ainda, botão desabilitado com o motivo: "gere a folha primeiro — ela é a âncora". Regenerar = novo asset no slot; o antigo obedece às regras de proteção que já existem (citado por versão = imortal).

### 4.4 Fluxo e armazenamento

Server action síncrona (maxDuration 60, padrão da extração). Resultado: Storage (`<user_id>/entities/<entity_id>/canonical-<slot>-<uuid>.png`) → `assets` (source `generation`) → `entity_images` (role do slot) → ID no bloco `imagens_canonicas` do rascunho. O bloco ganha as chaves novas `folha_completa` e `folha_completa_horizontal` (schema Zod compatível: ausente = vazio), e a coluna de imagens do editor ganha o slot da Folha **em destaque no topo** — ela é a âncora, merece o trono. Confirmação de custo antes ("Esta geração custa X ⚡"), seletor de modelo reutilizável (o mesmo da extração), estados de progresso, resumo ao final. Fluxo recomendado exibido na UI: gerar folha → conferir → salvar v1 (a folha congela junto na versão).

### 4.5 Rascunho e versão

Gerar canônicas a partir do rascunho é permitido e esperado (é parte de construir a personagem) — `sheet_source` registra `draft`/`version` como sempre. A auditoria fecha: cada imagem canônica sabe de qual sheet nasceu e com qual prompt.

---

## 5. Preparo manual do Jorge

1. Criar a chave de API do Google (Google AI Studio) — o Code orienta o nome exato da variável (alinhado ao `env_var_name` do catálogo) e onde ela entra (`.env.local` + Vercel com Sensitive, o ritual conhecido).
2. Habilitar billing na conta Google se a geração de imagem exigir (o Code confirma na documentação e te diz).

---

## 6. Pendências de refinamento (observadas na validação real de 09/08/2026)

Duas coisas vistas nas primeiras gerações reais contra a API do Google — folha completa + vista de perfil, modelo Nano Banana Pro. Nenhuma é bug do compilador nem da moldura: o prompt saiu correto nas duas. São limites de fidelidade do modelo, a avaliar com mais gerações reais durante a Etapa C.

1. **Posição de tatuagem.** O prompt disse `a small fine-line tattoo of a minimalist flower branch on the inner left wrist` e o modelo desenhou a tatuagem no quadril. Efeito colateral favorável: como as vistas usam a folha como referência, o deslocamento fica **consistente** entre imagens em vez de aleatório. Caminho candidato: reforço no prompt (repetir a posição no bloco de restrições, ou dar à posição uma frase própria em vez de uma oração subordinada). Só mexer com evidência de mais de um caso.

2. **Variedade das células de expressão da folha.** A grade da folha pede "estudos de expressão" sem enumerá-las, e as células saíram quase idênticas. Quem enumera expressões é o slot `folha_expressoes`, que tem instrução própria — então isto é sobreposição de papéis, não erro. Caminho candidato: enumerar 3–4 expressões na instrução da grade, ou aceitar que a folha ancora identidade e a variedade é assunto do slot dedicado.

3. ~~**O estilo visual está solto — a folha pode sair ilustrada.**~~ ✅ **RESOLVIDO em 09/08/2026.** A primeira folha da personagem principal do Jorge saiu com aspecto de desenho, e a causa era nossa: o prompt não ancorava **meio** em lugar nenhum, enquanto a própria moldura dizia `character reference sheet` — vocabulário que boa parte dos modelos lê como *character design* ilustrado.

   Virou lista fechada na Camada 2 (§5.26 do [`character-sheet.md`](./character-sheet.md)) e **regra de compilação nº 11**: nenhuma geração fica sem âncora de estilo, campo ausente lê como `fotorrealista`, e a canônica declara o estilo **antes da moldura**, com o reforço espelhado da opção escolhida. Sem migration e sem tocar versão congelada.

**Também confirmado nessa validação:** a moldura do §5.22 passou de primeira com o traje de banho, sem recusa — o fallback existe e não precisou disparar. Uma imagem 2K levou 23–27s, dentro do `maxDuration` de 60 que sustenta o "síncrono agora" do G4; é este número que dirá quando o assíncrono virar necessidade.

---

## 7. Fora do escopo (de propósito)

Nodes de geração no canvas (próxima conversa — o relatório da inspeção do Magnific é o insumo dela); **Storyboard + Vídeos** (conversa dedicada, registrada no roadmap, junto com a estreia do assíncrono); fatiamento automático da grade em slots individuais (refinamento futuro — o "Split images" do Magnific mostrou o caminho); foto de pessoa real como referência de identidade (estudo futuro com cuidados éticos próprios); adaptadores de imagem OpenAI/xAI (entram quando a demanda chamar — o catálogo já os espera).