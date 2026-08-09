# Nodes de Geração no Canvas — Especificação v1

> **Creator TKS Labs** · Decisões N1–N5 aprovadas pelo Jorge.
> Destino: `docs/nodes-geracao.md`, referenciado pelo índice do `CLAUDE.md`.
> Complementa: `docs/geracao-canonica.md` (compilador, moldura, estilo), `docs/versionamento-entidades.md` (resolução do `@`), `docs/motor-extracao.md` (catálogo, seletor de modelo). Insumo: a inspeção do fluxo profissional do Magnific — cuja consistência é manual; a nossa é o `@`.

---

## 1. O que este documento define

O estúdio deixa de ser fábrica de personagens e vira **linha de produção de conteúdo**: o node **Gerar Imagem** no canvas (prompt em português com menções `@`, referências anexadas com instrução, formatos por canal), o node **Resultado** (imagens geradas viram peças conectáveis do fluxo) e a compilação de canvas — o momento em que o `@` é finalmente consumido.

## 2. As decisões

**N1 — Conectores no node, não node de referência.** Nada de peça separada para referências: o node de geração exibe **conectores visíveis na borda**; o clique já abre a ação certa (imagem → seletor com galeria/upload; a área de prompt vive dentro do node). Referências anexadas aparecem numa faixa de miniaturas com **"+"** para adicionar mais. *(Decisão do Jorge, inspirada na inspeção do Magnific e melhor que a proposta original de node separado.)*

**N2 — `@` só resolve personagem congelada.** Digitar `@` no prompt abre o seletor de personagens com versão salva; `@luna` = versão ativa, `@luna@v2` = específica; rascunho nunca (regra herdada do versionamento). Mencionar anexa automaticamente: DNA compilado + folha completa como referência de imagem + restrições. **Uma personagem por geração na v1** (multi-personagem = registrado para depois; consistência dupla é problema próprio).

**N3 — Formatos por canal.** Presets nomeados por intenção ("Stories · 9:16"), mapeados às proporções reais que a API do modelo aceita (conferidas na documentação na implementação; alvo sem suporte exato mapeia para a proporção suportada mais próxima, com o número real visível — nunca mentir a proporção).

**N4 — Produto anexado direto; descrição como reforço opcional futuro.** O modelo vê a foto real do produto (fidelidade máxima). O botão "extrair descrição do produto" fica como pendência registrada — constrói quando a consistência pedir.

**N5 — Uma imagem por clique, síncrono.** O padrão provado da canônica. Quantidade x3/x5, listas e lote chegam com o assíncrono (conversa Storyboard + Vídeos). Este ciclo também **quita a dívida do `prompt_compiled`**: o estilo entra na estrutura, não só no texto.

---

## 3. O node Gerar Imagem (anatomia)

**Corpo:** área de resultado (vazia até gerar; depois mostra a última imagem) · **campo de prompt em português** com suporte a `@` · faixa de referências (miniaturas + "+") · barra de configuração.

**Barra de configuração:** modelo (seletor reutilizável, capability `image_gen`, preço visível) · **formato/canal** (presets da seção 7) · **estilo de renderização** (herda o default da personagem mencionada; sobrescrevível aqui — a hierarquia da regra 11: o node escolhe *qual*, nunca *nenhum*; sem personagem mencionada, default fotorrealista) · resolução 2K fixa na v1 (mesmo preço que 1K no Nano Banana Pro — qualidade grátis) · custo e saldo · botão Gerar.

**Conectores na borda (sempre visíveis):**
- **Entradas de imagem** (lado esquerdo): aceitam conexão de um node Resultado (encadeamento) e, no clique, abrem o **seletor de referências**.
- **Saída** (lado direito): liga ao(s) node(s) Resultado gerados.

**Cada referência anexada carrega:**
- a imagem (do upload, da galeria ou de um Resultado conectado);
- **tipo opcional** (chip): produto · roupa · cenário · pose · outro — orienta a frase compilada ("the product shown in reference image 2, held in her hands");
- **instrução opcional** em português ("desta imagem, pegue apenas o cenário") — traduzida na geração e compilada como diretiva da referência. *(Pedido original do PDF do projeto, validado pela inspeção.)*

Limite de referências por geração: o máximo que a documentação oficial do modelo permitir (conferido na implementação), com a folha do `@` contando no total e a UI dizendo o limite.

## 4. O seletor de referências (a Galeria)

Modal com duas fontes:
- **Enviar** — upload direto (mesma escrituração de sempre: Storage → assets).
- **Minhas imagens** — todo o histórico do usuário na tabela `assets` (geradas + enviadas), mais recentes primeiro, com filtro simples (todas · geradas · enviadas) e busca leve. É a versão v1 da galeria do Magnific — as categorias de biblioteca (Stock, Style, Camera, Effects…) ficam registradas para depois.

Uma imagem usada uma vez fica na galeria para sempre — subir o produto uma vez, usar em cem gerações.

## 5. O node Resultado e o encadeamento

Cada geração bem-sucedida cria um **node Resultado** conectado à saída do gerador: título curto, a imagem, e ações (baixar · usar como referência · ver prompt usado). A saída do Resultado conecta na entrada de imagem de outro gerador — o encadeamento que faz do canvas um fluxo, não uma pilha de tentativas. O Resultado é um `asset` como outro qualquer: aparece na galeria, obedece às regras de proteção existentes.

## 6. Compilação de canvas (o contrato)

Ordem do prompt final: **estilo** (do node; herdado da personagem quando não sobrescrito) → **bloco de identidade** da versão mencionada (o compilador de sempre) → **cena do usuário** (o prompt em PT, traduzido na geração) → **diretivas das referências** (tipo + instrução, traduzidas) → **restrições** (sempre, ao final).

Regras:
1. **O prompt do node dirige a cena:** quando há texto no prompt, os padrões de cena do sheet (`cena_padrao`, expressão, pose) **não** entram — o usuário é o diretor. Prompt vazio com `@` mencionado: gera a personagem nos padrões dela (comportamento previsível, sem mágica).
2. **Tradução na geração:** o PT do usuário e das instruções é traduzido no momento de gerar (mesmo mecanismo barato da casa); o **original em PT e o compilado em EN são gravados juntos** no registro da geração — auditoria bilíngue.
3. **`prompt_compiled` completo (quitação da dívida):** a estrutura gravada passa a incluir o estilo e as diretivas de referência — "com que estilo e com quais referências esta imagem nasceu?" respondível por campo, não por leitura de texto.
4. Cobrança e registro: `record_generation`, preço do catálogo, débito atômico só no sucesso, `sheet_source`/`entity_version_id` quando houver `@` — tudo já provado, nada novo a inventar.

## 7. Formatos por canal (presets v1)

Do catálogo do esboço original do projeto, os essenciais primeiro:

| Preset (intenção) | Alvo | Observação |
|---|---|---|
| Instagram Feed · Retrato | 4:5 | mapeia à proporção suportada mais próxima se a API não tiver 4:5 exato |
| Quadrado (IG/FB) | 1:1 | — |
| Stories / Reels / TikTok | 9:16 | — |
| YouTube / Thumbnail | 16:9 | — |
| Paisagem clássica | 4:3 | — |
| Retrato clássico | 3:4 | — |

O rótulo mostra intenção + proporção real ("Stories · 9:16"). O catálogo completo do PDF (banners, display, mastheads) entra por demanda, no mesmo mecanismo.

## 8. Fora do escopo (de propósito) e registros

Quantidade >1, listas e lote (chegam com o assíncrono em Storyboard + Vídeos); nodes de texto reutilizável / list / assistant / router (o mini-modal do Magnific — conversa própria); categorias de biblioteca na galeria (Stock, Style, Camera, Effects); `@` para objetos, cenários e roupas (hoje `@` = personagens; expansão registrada); multi-personagem numa geração; extração de descrição de produto (botão opcional futuro — N4); edição pós-geração (upscale, remover fundo — arsenal futuro); vídeo e Motion Control (conversa dedicada já registrada).