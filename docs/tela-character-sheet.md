# Tela do Character Sheet — Especificação v1

> **Creator TKS Labs** · Decisões de UX aprovadas pelo Jorge em 07/08/2026.
> Destino no repositório: `docs/tela-character-sheet.md`, referenciado pelo índice do `CLAUDE.md`.
> Complementa: `docs/character-sheet.md` (o conteúdo do sheet) e `docs/versionamento-entidades.md` (como ele evolui). Este documento define **como o Jorge interage** com tudo isso.
> Nota de vida real: esta é a especificação mais sujeita a ajuste por uso — a estrutura de dados embaixo não muda; a tela pode e deve evoluir conforme a prática.

---

## 1. As quatro decisões que regem a tela (07/08/2026)

**U1 — Cartão no canvas, editor em overlay.** O node da personagem mostra só um cartão compacto; a edição acontece num overlay de quase tela cheia. Nunca editar 25 campos dentro de um retângulo de node.

**U2 — Criação guiada, edição livre.** A primeira vez é um fluxo em passos; depois de criada, a personagem abre direto no editor livre com abas.

**U3 — Amarelos confirmados um a um.** Sem botão "confirmar todos". Contador visível + navegação de um clique entre os campos pendentes.

**U4 — Seletores simples na v1, com uma exceção visual.** Listas fechadas como seletores bem escritos; tom de pele como amostras de cor clicáveis desde já. Pickers ilustrados (estilo character creator) ficam para evolução futura e não mudam nada na estrutura de dados.

---

## 2. O cartão no canvas (o node da personagem)

Compacto, no estilo visual do canvas existente. Mostra:

- **Retrato** — miniatura do turnaround de frente; sem imagem, um placeholder elegante com as iniciais.
- **Nome e handle** — "Julia" em destaque, `@julia` discreto abaixo.
- **Badge da versão ativa** — `v3`; sem nenhuma versão salva, badge `rascunho` em tom de alerta suave.
- **Indicador de rascunho sujo** — pontinho pulsante + tooltip "alterações não salvas em versão" quando `entities.sheet` difere da versão ativa.
- **Botão/duplo-clique "Editar"** — abre o overlay.
- **Conector de saída** — para plugar a personagem em nodes de geração (o consumo do `@` pelos nodes de geração é assunto da fase de geração, não desta tela).

Nomenclatura por intenção, sempre: o usuário vê "Personagem" e "Influencer" — nunca "entity", "payload" ou "jsonb".

---

## 3. O editor (overlay de quase tela cheia)

### 3.1 Estrutura

- **Cabeçalho:** retrato pequeno + nome editável + `@handle` · seletor de versões (seção 5) · contador de amarelos ("3 campos aguardando confirmação", clicável — seção 4.2) · botão **"Salvar como nova versão"** (seção 3.3) · indicador de autosave ("rascunho salvo às 14:32") · botão fechar.
- **Corpo em três abas**, uma por camada: **DNA visual · Padrões · Narrativa**. Cada aba com os campos agrupados como no `character-sheet.md` (Rosto, Pele, Cabelo, Corpo, Marcas / Expressão, Traje, Cenário… / Identidade, Personalidade, Voz).
- **Coluna fixa à direita: Imagens canônicas** — sempre visível nas três abas (seção 6).

### 3.2 Autosave do rascunho

Toda edição grava no rascunho (`entities.sheet`) automaticamente, com debounce (~1s). Sem botão "salvar rascunho" — o rascunho é o caderno sempre aberto. O que exige intenção é **versão**, nunca rascunho. Falha de rede: indicador vira alerta ("não foi possível salvar — tentando de novo") e a tela nunca descarta silenciosamente o que o usuário digitou.

### 3.3 Salvar como nova versão

- Habilitado só quando o rascunho difere da versão ativa (ou quando ainda não existe versão). Desabilitado com tooltip "nada mudou desde a v3".
- Clique abre mini-modal: número da nova versão (informativo, quem numera é o banco), campo **label opcional** ("v2 — cabelo mais curto"), aviso fixo: *"Uma versão salva é permanente: não pode ser editada nem apagada."*
- Se houver campos amarelos, o modal avisa: *"3 campos inferidos não entram nas gerações enquanto não forem confirmados. Salvar mesmo assim?"* — pode salvar; a honestidade continua valendo dentro da versão.
- Confirmação: insere em `entity_versions` e move o ponteiro ativo — as duas coisas atomicamente (tudo ou nada). Badge do cartão atualiza na hora.

---

## 4. Anatomia de um campo do DNA

### 4.1 O campo

Cada campo do DNA mostra, nessa ordem: **rótulo em PT** → **seletor da lista fechada** → **campo "detalhes" opcional** (texto livre, recolhido atrás de um "+ detalhes" para não poluir) → **selo de estado**. A frase fixa em inglês nunca aparece na tela — é assunto do compilador.

Selos de estado (cor + ícone + tooltip explicando):

| Estado | Visual | Tooltip |
|---|---|---|
| `observado` | verde, ícone de olho | "A extração viu isto com clareza na foto. Entra nas gerações." |
| `inferido` | amarelo, ícone de interrogação | "A extração deduziu sem certeza. Não entra nas gerações até você confirmar." |
| `confirmado` | verde, ícone de check | "Validado por você. Entra nas gerações." |
| `vazio` | neutro, sem ícone | "Em branco. Simplesmente não entra nas gerações." |

Regra viva: **editar qualquer campo manualmente muda seu estado para `confirmado`** na hora, sem pergunta.

### 4.2 A revisão dos amarelos (U3)

- Campo amarelo ganha dois botões inline: **✓ Confirmar** (vira `confirmado`, valor mantido) e **editar** (troca o valor → `confirmado` também).
- O **contador no cabeçalho** mostra o total de amarelos das três abas; clicar nele rola/salta para o próximo amarelo, mudando de aba se preciso. Confirmou → salta sozinho para o seguinte. Revisar 8 campos leva segundos, mas cada um passou pelos seus olhos.
- Zero amarelos: o contador some.

### 4.3 Tom de pele (U4)

Único campo visual da v1: as 9 opções como **amostras de cor clicáveis** em linha, com o nome PT abaixo da selecionada. Subtom continua seletor de texto. Cores de partida (ajustáveis a olho depois, sem impacto em dados — o valor gravado é a opção, não o hex):

`muito_clara #F7E9DE · clara #F5DCC3 · clara_dourada #EFD0A9 · morena_clara #DDB088 · morena #C89066 · morena_oliva #B08050 · morena_escura #92603C · negra #63402A · negra_retinta #3B2418`

---

## 5. Seletor de versões

Dropdown no cabeçalho listando **Rascunho** + todas as versões (`v3 — label · data`, ativa marcada com ●).

- Selecionar o **Rascunho**: modo de edição normal (o padrão ao abrir).
- Selecionar uma **versão**: abre em **somente leitura**, com banner: *"Você está vendo a v1 (congelada). Para evoluir a partir dela, carregue-a no rascunho."* Duas ações no banner: **"Ativar esta versão"** (move o ponteiro — o `@julia` passa a ser ela) e **"Carregar no rascunho"** (copia o snapshot para o rascunho; se o rascunho tiver alterações não salvas em versão, confirma antes: "isto substitui o rascunho atual").
- Nada de editar ou apagar versão — a interface nem oferece; o banco não deixaria.

---

## 6. Coluna de imagens canônicas

Seis slots nomeados (frente · ¾ · perfil · costas · expressões · paleta), cada um com miniatura ou vazio pontilhado.

- **Nesta fase: upload manual** (a geração assistida das canônicas é a próxima conversa). Upload → Supabase Storage → `assets` → vínculo em `entity_images` → ID no bloco `imagens_canonicas` do rascunho.
- **Trocar** imagem de um slot: substitui a referência no rascunho; a imagem antiga continua existindo se alguma versão a cita (o banco protege sozinho — trava 4.3).
- Tentativa de **excluir** imagem citada por versão: a interface antecipa com aviso amigável ("esta imagem faz parte da v1 e não pode ser excluída") em vez de deixar o erro do banco estourar cru.

---

## 7. Wizard de criação (U2 — primeira vez)

Passos, com progresso visível e possibilidade de voltar:

1. **Identidade** — nome de exibição, `@handle` (minúsculas, sem espaço, único — validado na hora), gênero de apresentação.
2. **Foto de referência** *(opcional)* — enviar 1 foto → extração preenche o DNA com selos verdes/amarelos. Botão alternativo: **"Preencher manualmente"** pula direto ao passo 3.
3. **Revisão do DNA** — os campos com seus selos; os amarelos com o fluxo do 4.2; o que a extração não viu fica honestamente vazio para preencher à vontade.
4. **Padrões** — expressão, traje canônico (padrão biquíni/sunga já selecionado), fundo, luz, enquadramento — tudo com defaults sensatos pré-marcados; este passo é um "confira e siga".
5. **Narrativa** *(opcional, pode pular)* — nome completo, idade, ocupação, personalidade, voz.
6. **Resumo e salvar** — mini-retrato do que foi definido + botão **"Salvar como v1"**. Alternativa: **"Deixar como rascunho"** (sai sem versão; o cartão fica com badge `rascunho` e a personagem ainda não pode ser mencionada por `@`).

**Nota de sequência de implementação:** o motor de extração (passo 2) é a próxima sessão. Nesta sessão o wizard nasce completo **pelo caminho manual**, com o passo 2 presente porém marcado "em breve" e levando ao caminho manual. A UX da extração já está especificada aqui para o motor encaixar sem retrabalho de tela.

---

## 8. Contratos com o banco (resumo para implementação)

- Rascunho: leitura/escrita em `entities.sheet` (autosave debounced).
- Salvar versão: INSERT em `entity_versions` (banco numera) + UPDATE do `active_version_id` — atomicamente (função RPC no Postgres ou rota de API transacional; escolha do implementador, atomicidade obrigatória).
- Ativar versão antiga: UPDATE do ponteiro apenas.
- Dirty check: comparação do jsonb do rascunho com o da versão ativa.
- Upload canônico: Storage → `assets` → `entity_images` → ID no rascunho. Se o bucket/políticas de Storage ainda não existirem, isso precisa ser configurado antes (pode exigir migration de Storage).
- O dicionário PT↔EN das listas fechadas vira um arquivo de constantes tipadas, único para tela e compilador — a tela usa o PT; o compilador (fase de geração) usará o EN. Fonte: seção 5 do `character-sheet.md`.

---

## 9. Fora do escopo desta tela (de propósito)

O motor de extração por foto (próxima sessão — a UX já está pronta aqui); a geração assistida das imagens canônicas (sessão seguinte); os pickers ilustrados de rosto/cabelo/corpo (evolução futura); o diff visual entre versões; e o consumo do `@` pelos nodes de geração (fase de geração de imagens).