# Produto — Creator TKS Labs

> **Quando consultar este arquivo:** antes de decidir o que construir, para quem, ou como uma funcionalidade deve se comportar do ponto de vista do usuário. Para *como* construir, ver [`arquitetura.md`](./arquitetura.md).

---

## 1. O que é o Creator TKS Labs

Creator TKS Labs é um **estúdio de criação de conteúdo com IA baseado em canvas infinito de nodes** (referências visuais: Weavy, Freepik Spaces, Higgsfield), para gerar imagens, vídeos e influencers de IA com consistência de personagem.

O usuário monta um fluxo visual: arrasta blocos de entrada (produto, cenário, roupa, pose…), conecta a um bloco de geração e recebe o resultado em outro bloco. O canvas é a interface — não há formulário longo nem painel de configurações escondido.

---

## 2. Público-alvo

**Fase atual:** uso interno pelo fundador, para produção de conteúdo dos seus próprios projetos de social commerce.

**Visão futura:** criadores de conteúdo e vendedores de social commerce (TikTok Shop, Shopee, Instagram, YouTube) que precisam de produção profissional de imagens, vídeos e influencers de IA sem conhecimento técnico — com monetização por uso quando o produto abrir a terceiros.

### Plataformas de destino

O conteúdo produzido é criativo para:

- **Instagram**
- **TikTok / TikTok Shop**
- **Shopee**
- **YouTube**
- **Anúncios** (criativos estáticos e UGC)

As proporções e resoluções de cada canal são dados de configuração, não código — ver Decisão 6 em [`arquitetura.md`](./arquitetura.md).

---

## 3. O princípio de UX inegociável

> **Poder de profissional, simplicidade de leigo.**

O usuário **nunca vê complexidade técnica**. Nada de sampler, VAE, latent, CFG scale, seed exposta como campo obrigatório, nome de checkpoint. Essas coisas ou têm um padrão bom escolhido pelo sistema, ou não existem na interface.

Isso não significa tirar poder do usuário — significa que o poder aparece em forma de intenção, não de parâmetro.

### A regra dos nomes de node

**Nodes têm nomes de intenção, nunca de implementação técnica.**

| ✅ Nome de intenção | ❌ Nome de implementação |
|---|---|
| Input de Produto | Image Loader |
| Motion Control | ControlNet / OpenPose |
| Gerar Imagem | SDXL Sampler |

A pergunta que decide o nome é: *"o que o usuário quer fazer aqui?"* — e não *"que tecnologia roda aqui dentro?"*. A mesma regra vale para rótulos de campo, mensagens de erro e textos de ajuda. Todos os textos de UI ficam centralizados em `lib/i18n/pt-BR.ts`.

### A tela é o manual

> **Toda funcionalidade nasce com tooltips, avisos e mensagens de erro explicativas. Se um recurso precisa de manual externo para ser usado, o defeito é do recurso.**

Princípio permanente, decidido em 08/08/2026, com o mesmo status do princípio de UX acima. Não é sobre encher a tela de texto: é sobre a explicação estar **onde a dúvida nasce**, no momento em que ela nasce, na linguagem de quem está usando.

Os exemplos fundadores vieram da tela do character sheet:

- **Os selos de estado.** Cada campo mostra se entra ou não na geração, com um tooltip que diz o porquê — "a extração deduziu sem certeza; não entra nas gerações até você confirmar". O usuário nunca precisa perguntar a ninguém o que o amarelo significa.
- **O botão que diz o motivo.** "Salvar como nova versão" desabilitado não fica mudo: a dica explica *"nada mudou desde a v1"*. Um controle desabilitado sem motivo visível é um enigma, não uma interface.
- **Os códigos `CT001`–`CT003`.** Até as recusas do banco têm mensagem própria por situação — rascunho igual à versão ativa, personagem arquivada, personagem inexistente — para a tela poder explicar cada caso em vez de dizer "erro".

Consequência prática para quem implementa: um controle novo sem tooltip, um estado novo sem explicação e um erro novo sem mensagem própria são trabalho **incompleto**, não trabalho a polir depois.

---

## 4. Funcionalidades-chave

- **Abas de projetos independentes** no topo do canvas (header flutuante translúcido), cada uma com seu workflow salvo e um indicador de status pulsante (gerando / gerado / erro)
- **Sidebar lateral recolhível** (expande ao aproximar o mouse) com o arsenal de nodes
- **Nodes conectáveis**: inputs tipados (produto, cenário, roupa, acessório, pose, imagem/vídeo de referência) → nodes de geração → nodes de resultado
- **Entidades mencionáveis por `@`** (ex.: `@julia`): character sheets de influencers de IA, produtos, cenários. Digitou `@` num campo de prompt, abre um modal com as entidades do fluxo atual
- **Prompt duplo**: o usuário escreve em PT-BR; o sistema compila para JSON estruturado em inglês antes de gerar; o JSON final fica visível e editável no node de resultado — é a "receita" reproduzível daquela imagem
- **Carteira de créditos (Sparks ⚡)** com ledger de custo real vs. custo cobrado
- **Vídeo**: image-to-video, Motion Control (clonagem de movimento a partir de um vídeo de referência), lipsync/voz e continuação de narrativa a partir do último frame do vídeo anterior

---

## 5. Consistência de personagem

O diferencial do produto é o influencer de IA que **continua sendo a mesma pessoa** entre uma geração e outra. Isso não sai de "escrever um prompt bem escrito": sai de uma ficha estruturada com listas fechadas de opções, cada opção com uma tradução fixa em inglês, mais imagens canônicas que acompanham toda geração.

### A folha completa é a âncora universal da identidade

O texto descreve; a imagem prova. Por isso a personagem tem uma imagem acima de todas as outras: a **folha completa** — uma grade única com frente, ¾, perfil, costas, close de rosto e estudos de expressão, tudo na mesma imagem e portanto tudo obrigatoriamente da mesma pessoa.

Ela nasce **só do DNA compilado**, sem foto de referência: a folha errada é campo errado, visível e corrigível. E é a partir dela que tudo o mais se gera — cada vista separada é gerada **com a folha anexada como referência**. Âncora primeiro, o resto referencia a âncora.

Duas consequências práticas: o fluxo natural vira *gerar a folha → conferir → salvar como v1* (a folha congela junto com a versão), e uma personagem sem folha ainda não tem de onde tirar suas vistas — a interface diz isso em vez de oferecer um botão que só poderia falhar.

A especificação completa — estrutura JSON, listas fechadas campo a campo e as regras de compilação do prompt — está em [`character-sheet.md`](./character-sheet.md); a geração canônica, em [`geracao-canonica.md`](./geracao-canonica.md).

---

## 6. Sparks ⚡ — a carteira de créditos

**Spark é a unidade de crédito exibida ao usuário.** Ele vê "⚡ 1.250" no header, não "R$ 12,50".

Por dentro, toda a contabilidade é feita em **centavos inteiros de BRL** — Spark é apenas a etiqueta de exibição. A taxa atual é **1 Spark = 1 centavo de BRL** (`CENTS_PER_SPARK = 1`, em `lib/sparks/`). O preço de negócio — a margem sobre o custo real das APIs — será definido na fase de monetização, quando o produto abrir a terceiros.

Cada geração registra dois valores separados:

- **`cost_real_cents`** — o que o provedor de IA cobrou
- **`cost_charged_cents`** — o que foi debitado do usuário

Hoje são iguais. A diferença entre os dois é onde a margem vai morar no futuro, sem precisar mudar nada na estrutura.

O histórico financeiro é **append-only**: nada é apagado nem editado. Uma correção é sempre uma nova transação de estorno. Ver Decisão 5 em [`arquitetura.md`](./arquitetura.md).

---

## 7. Roadmap de fases

### Fase 0 — Fundação ✅ concluída

Autenticação, projetos/abas, canvas React Flow com salvar e carregar workflow, carteira e ledger de Sparks. O schema completo foi aplicado e verificado de ponta a ponta.

O que ficou entregue e verificado no navegador:

- Cadastro cria perfil e carteira automaticamente (por trigger no banco)
- Criar projeto cria seu workflow automaticamente (1 projeto = 1 workflow, por trigger)
- Canvas salva sozinho 1,2s depois de parar de editar, com flush ao trocar de aba
- Cada aba guarda seu próprio viewport (posição e zoom do canvas)
- Renomear, excluir (com cascata) e sair funcionam
- Sem sessão, as 9 tabelas respondem `42501 permission denied`

O débito de Sparks está construído mas ainda não é exercitado — ele só entra em uso quando existir geração (Fase 1).

### Fase 1 — Geração de imagem 🔨 atual

Nodes de input tipados, node de geração (Nano Banana + 1 modelo via fal), sistema de `@`, ingestão de assets, débito de Sparks e prompt duplo PT → EN/JSON.

### Fase 2 — Entidades 🔨 começou antes da hora, de propósito

A tela do character sheet foi construída em 08/08/2026, **antes** da geração de imagem. O motivo: consistência de personagem é o diferencial do produto, e o sheet é a fundação dela — construir a geração primeiro significaria construí-la duas vezes, uma sem entidades e outra com.

Entregue e verificado no navegador:

- Cartão da personagem no canvas, com selo da versão ativa e indicador de rascunho com alterações não salvas
- Editor em overlay com as três camadas em abas, autosave do rascunho e selos de estado por campo
- Revisão dos campos inferidos um a um, com contador e navegação de um clique
- Versões: salvar (atômico no banco), ver versão congelada em somente-leitura, ativar versão antiga e carregar uma versão no rascunho
- Wizard de criação pelo caminho manual
- Imagens canônicas por upload manual
- **Motor de extração** (08/08/2026): foto de referência **ou** texto colado de outra plataforma preenchem o DNA visual, com selo verde no que foi visto e amarelo no que foi deduzido — este último com o motivo da dúvida. É a primeira integração de IA do produto e a primeira cobrança real de Sparks. A extração só preenche campos em branco: nada que o usuário decidiu é desfeito por uma máquina.

- **Compilador de prompt e geração canônica** (09/08/2026): o sheet vira prompt de identidade em inglês por uma função pura e determinística, com prévia ao vivo no editor e o placar do que ficou de fora. E a personagem ganha rosto: folha completa gerada só do DNA, vistas geradas com a folha como referência, com moldura de reference sheet e fallback automático de traje. Estreia da capability `image_gen` no catálogo e do adaptador do Google.

O que falta desta fase: o **consumo do `@`** pelos nodes de geração, que depende da Fase 1.

Especificações: [`character-sheet.md`](./character-sheet.md), [`versionamento-entidades.md`](./versionamento-entidades.md), [`tela-character-sheet.md`](./tela-character-sheet.md), [`motor-extracao.md`](./motor-extracao.md) e [`geracao-canonica.md`](./geracao-canonica.md).

**Pendências de refinamento registradas** (a avaliar com mais gerações reais): **âncora de estilo visual** — o prompt canônico não fixa foto vs. ilustração, e uma folha ilustrada com vistas fotográficas não é a mesma personagem; fidelidade da posição de tatuagens no prompt; variedade das células de expressão da folha; e o fatiamento automático da grade da folha em slots individuais.

### Fase 2.5 — Storyboard + Vídeos 📌 conversa dedicada

Registrada a pedido do Jorge, **depois dos nodes de geração**: storyboard cena a cena e geração de vídeo, que chegam junto com a estreia do **padrão assíncrono** (fila → webhook → Realtime). A geração canônica pôde ser síncrona porque uma imagem 2K leva de 20 a 40 segundos e cabe no tempo de função; vídeo não cabe, e é ali que o assíncrono deixa de ser opcional.

### Fase 3 — Vídeo e voz

Image-to-video, Motion Control (Kling), lipsync, continuação a partir do último frame (extração via ffmpeg), voz com ElevenLabs e storyboard cena a cena.

### Fase 4 — Canais e monetização

Presets por canal, criativos de anúncio (estáticos e UGC) e preparação multiusuário: margem sobre custo e cobrança.

---

## 8. Fora de escopo, por decisão

- **Face swap de pessoas reais.** Os personagens são 100% sintéticos. Ver Decisão 7 em [`arquitetura.md`](./arquitetura.md).
