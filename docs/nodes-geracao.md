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

> **N5 revisada em parte, 10/08/2026.** A **quantidade 1–4 chega antes do assíncrono**, porque não precisava dele: quatro imagens são **quatro requisições independentes**, cada uma com a sua linha, o seu débito e o seu jeito de falhar — tecnicamente idênticas a quatro cliques. Nenhuma delas segura mais de uma geração dentro de um request, que era a razão inteira da regra. **O assíncrono continua reservado e obrigatório para vídeo**, onde uma única geração já não cabe no `maxDuration`. O que mudou junto foi o transporte: rota HTTP em vez de Server Action, porque Server Actions são serializadas pelo cliente do React — ver [`arquitetura.md`](./arquitetura.md#do-bloco-ao-resultado) e a entrada datada em [`decisoes.md`](./decisoes.md).

---

## 3. O node Gerar Imagem (anatomia)

> **Reordenada em 10/08/2026 (Canvas 4).** A anatomia abaixo é normativa: ela é a estrutura do bloco, não uma sugestão de layout. A anterior — resultado em cima, prompt no meio, configuração embaixo, custo no canto do cabeçalho — abria o card pela **resposta** e deixava a pergunta por baixo dela, e punha o preço a três centímetros do botão que o gasta. A referência é o padrão do Studio Oikos: configuração no topo, chave de inputs, prompt grande, botão, resultado.

**Cabeçalho** (linha inteira) — o padrão universal de todos os nodes: ícone + nome + Duplicar + **lixeira**, esta **sempre com confirmação** (ver as notas de 10/08 em [`decisoes.md`](./decisoes.md)).

**Corpo em duas colunas.** A pergunta à esquerda, a resposta à direita.

**Coluna esquerda**, de cima para baixo:

1. **Configuração**, lado a lado onde couber: **modelo** (linha inteira — seletor reutilizável, capability `image_gen`, preço visível) · **formato/canal** (presets da seção 7) + **estilo de renderização** (herda o default da personagem mencionada; sobrescrevível aqui — a hierarquia da regra 11: o node escolhe *qual*, nunca *nenhum*; sem personagem mencionada, default fotorrealista) · **qualidade** + **quantidade** · **ajustes de cena** em pares.
2. **Chave "Ativar Inputs de Referências"** + as miniaturas espelhadas dos inputs conectados.
3. **Prompt principal** — rótulo "Prompt principal", placeholder "Insira aqui sua instrução…", caixa de seis linhas com contador de caracteres, suporte a `@`. A menção é **opcional**: sem ela, gera livre com o default fotorrealista.
4. **Botão "Gerar Conteúdo".**
5. **Custo e saldo**, logo abaixo do botão e no futuro do indicativo — "Custará 3 × 75 = 225 ⚡ · Saldo: X ⚡". O custo fala a verdade **multiplicada** antes do clique.

**Coluna direita — o painel de resultado.** Moldura **quadrada de tamanho fixo**, independente da proporção gerada: a imagem se ajusta dentro (`contain`), vertical, horizontal ou quadrada. O progresso acontece **dentro** da moldura; vazia, ela diz "A imagem aparecerá aqui"; o clique abre o lightbox. O painel é dividido para até **4 slots** — um preenche o quadrado, dois o partem ao meio, três ou quatro caem na grade 2×2 —, cada um com o seu próprio estado, porque cada imagem é a sua própria requisição, a sua própria cobrança e o seu próprio jeito de falhar. O node Resultado continua nascendo no primeiro Gerar.

**Conectores na borda (sempre visíveis):**
- **Entradas de imagem** (lado esquerdo): aceitam conexão de um node Resultado (encadeamento) e de um node de Input, e no clique abrem o **seletor de referências**.
- **Saída** (lado direito): liga ao(s) node(s) Resultado gerados.

**Ajustes de cena · opcional** *(acrescentado em 10/08/2026):* seção recolhida dentro da configuração, com três seletores — **ângulo de câmera** (§5.27 do character sheet), **iluminação** (§5.24) e **expressão** (§5.20). Todos começam em **Auto**, que é o comportamento de sempre: quem decide são o prompt e a personagem. Escolher qualquer coisa diferente de Auto é exercer a hierarquia da regra 4 (node > sheet) — ver as regras da seção 6. A seção abre sozinha quando o bloco já tem ajuste salvo e, recolhida, mostra quantos estão em uso: um controle que muda o resultado não pode ficar escondido depois de escolhido.

**A chave Input "Referências"** *(10/08/2026 — reversão registrada em [`decisoes.md`](./decisoes.md)).* Fica **sempre visível** na faixa, com um **?** ao lado que explica em uma frase de onde vêm os inputs e como usá-los.

- **Ligada:** as referências entram na compilação.
- **Desligada:** os inputs **permanecem conectados e visíveis**, as miniaturas ficam acinzentadas, e a geração **não envia nenhuma referência** — só prompt, `@` e configuração. É mute de mesa de som, não desconectar o cabo.

**Ela nasce desligada, e conectar nunca a liga sozinha.** O caso base deste bloco é gerar sem referência nenhuma — "uma imagem de um cachorro" —, e ligada por padrão trataria a exceção como regra. Quem quer que os inputs entrem, liga. Para quem acabou de conectar um input com a chave desligada, um **shimmer percorre o rótulo e a chave três vezes e para**: chama o olho sem virar aviso permanente, que é o trabalho do selo amarelo ao lado.

Três detalhes que a chave não pode errar:

1. **O contador diz o que vai viajar.** Desligada, as referências anexadas contam zero — mas a folha de uma personagem mencionada continua contando uma, porque ela não é input de referência: é a âncora do `@`, e a chave não tem opinião sobre o `@`. Dizer "0 de 6" com uma imagem a caminho seria a faixa mentindo no único lugar onde ela existe para dizer a verdade.
2. **O teto continua contando tudo o que está anexado**, mudo ou não. Tem que contar: religar a chave nunca pode produzir um bloco com mais imagens do que o modelo aceita.
3. **`prompt_compiled` grava o estado.** `referencias_mudas: { quantidade, asset_ids }` fica ao lado de `referencias: []`. Referência muda **≠** ausência de referência: a imagem que sai é a mesma nos dois casos, o motivo de ela ter saído assim não é, e só um desses dois registros consegue explicar por que alguém anexou quatro fotos e recebeu um rosto sem nenhuma delas.

**Cada referência anexada carrega:**
- a imagem (do upload, da galeria ou de um Resultado conectado);
- **tipo opcional** (chip): produto · roupa · cenário · pose · **estilo visual** · outro — orienta a frase compilada ("the product shown in reference image 2, held in her hands"). *Estilo visual (10/08/2026) é o primeiro tipo sobre o **como** e não sobre o **quê**: a cláusula manda casar estilo, clima, color grading e luz da referência e **proíbe copiar o sujeito ou o conteúdo** — sem a proibição, "use o estilo" degenera em "copie a imagem";*
- **instrução opcional** em português ("desta imagem, pegue apenas o cenário") — traduzida na geração e compilada como diretiva da referência. *(Pedido original do PDF do projeto, validado pela inspeção.)*

Limite de referências por geração: o máximo que a documentação oficial do modelo permitir (conferido na implementação), com a folha do `@` contando no total e a UI dizendo o limite.

## 3.1 Os nodes de Input *(10/08/2026)*

**A seção "Inputs" do menu lateral é uma prateleira de tipos, não de coisas.** Cada item é só ícone + nome; clicar ou arrastar faz o node nascer no canvas, e **toda** a configuração — imagem, propósito, instrução — acontece no node. O motivo está em [`decisoes.md`](./decisoes.md): produto é rotativo, e um estoque permanente de fotos no menu obrigava a cadastrar antes de usar, em troca de uma lista que ninguém queria.

**Input de Imagem** (o primeiro tipo): uma imagem, um propósito da lista fechada de tipos de referência, e uma instrução opcional em português. Cabeçalho padrão, e **só saída** — um input é algo que você entrega a um bloco; nada é entregue a ele, e por isso não há conector na esquerda.

Três regras que valem para todo tipo de input:

1. **O fio é vivo, não uma fotocópia.** Editar o input — trocar a imagem, mudar o chip, reescrever a instrução — atualiza **todo bloco que já o recebeu**. Sem isso, o card no canvas e a miniatura na faixa seriam duas coisas diferentes, e o canvas estaria mentindo sobre o que vai fazer. O grupo é substituído **na posição em que já estava**, porque os números do prompt compilado são posições nessa lista e uma edição que embaralhasse a ordem repontaria em silêncio toda instrução seguinte.
2. **Cada input carrega um `groupId` igual ao id do próprio node**, mesmo entregando uma imagem só. Para uma imagem isso não muda nada no prompt — um grupo de um lê igual a uma imagem solta —, e compra a única coisa que casar por id de asset não compra: cortar **este** fio desanexa **estas** imagens, mesmo quando a mesma foto chegou duas vezes por dois cards diferentes.
3. **A moldura e o nome do grupo só aparecem quando há mais de uma imagem.** São eles que dizem "estas várias são uma coisa só"; um grupo de um não é várias, e um input entregando uma foto deve parecer uma foto.

**O "+" da faixa cria um Input de Imagem conectado**, à esquerda do bloco e com o seletor aberto — não anexa imagem direto. **Toda referência tem node, sem exceção**, e por isso a **faixa é espelho e nunca porta de entrada**: o que ela mostra existe no canvas, sempre.

## 4. O seletor de referências (a Galeria)

Modal com duas fontes:
- **Enviar** — upload direto (mesma escrituração de sempre: Storage → assets).
- **Minhas imagens** — todo o histórico do usuário na tabela `assets` (geradas + enviadas), mais recentes primeiro, com filtro simples (todas · geradas · enviadas) e busca leve. É a versão v1 da galeria do Magnific — as categorias de biblioteca (Stock, Style, Camera, Effects…) ficam registradas para depois.

Uma imagem usada uma vez fica na galeria para sempre — subir o produto uma vez, usar em cem gerações.

## 5. O node Resultado e o encadeamento

Cada geração bem-sucedida cria um **node Resultado** conectado à saída do gerador: título curto, a imagem, e ações (baixar · usar como referência · ver prompt usado). A saída do Resultado conecta na entrada de imagem de outro gerador — o encadeamento que faz do canvas um fluxo, não uma pilha de tentativas. O Resultado é um `asset` como outro qualquer: aparece na galeria, obedece às regras de proteção existentes.

## 5.1 O node Produto *(10/08/2026)*

A decisão N4 dizia "produto anexado direto, foto real, fidelidade máxima". Ela continua valendo — o que mudou é **de onde a foto vem**. Antes, o produto era imagem solta: subia pela galeria uma por vez, com o chip "produto" escolhido de novo a cada geração. Um produto com frente, verso e etiqueta era três decisões repetidas toda vez.

Agora o produto é **entidade do Arsenal**, ao lado das personagens.

**Criar:** nome + até **5 fotos** (frente, verso, detalhe, etiqueta…) + **instrução padrão opcional** ("a modelo veste esta peça exatamente como mostrada"). As fotos entram pelo mesmo seletor do bloco de geração — enviar do disco ou pegar da galeria —, e são `assets` normais: aparecem na galeria como qualquer outra imagem, e tirar uma foto do produto tira o **vínculo**, nunca o arquivo.

**No canvas:** card com miniatura da primeira foto, nome, cabeçalho padrão e **conector de saída**. Sob o nome, a única linha que importa de verdade: **"3 fotos · ocupa 3 referências"**.

**O fio:** ligado à entrada de um Gerar Imagem, anexa **todas as fotos de uma vez, como unidade** — mesmo tipo (`produto`, fixo), mesma instrução, um `✕` só na faixa. Cortar o fio leva todas embora; tirar qualquer uma tira o grupo inteiro e o fio junto.

**Contagem honesta no teto.** Um produto de 3 fotos ocupa **3 das 6** vagas (a folha do `@` conta uma, como sempre) — a faixa mostra "4 de 6". E um produto que **não cabe inteiro tem a conexão recusada**, com a frase no próprio bloco, antes de qualquer clique em Gerar: meio produto é uma frente sem etiqueta, e quem descobrisse isso descobriria na imagem, depois de pagar. *Teto descoberto como erro depois do clique não é teto, é surpresa.*

**Modelo de dados:** um produto é uma linha de `entities` com `kind = 'product'`; suas fotos são linhas de `entity_images`. Nenhuma tabela nova — o porquê está em [`arquitetura.md`](./arquitetura.md#4-modelo-de-dados) e em [`decisoes.md`](./decisoes.md). Um produto é **arquivado, nunca apagado**, para as gerações que o usaram continuarem apontando para algo que existe.

**Fora do escopo deste ciclo, registrado:** versão de produto; extração de dados do produto a partir das fotos (a pendência da N4 continua pendente); `@produto` no prompt (o fio resolve a v1, e o `handle` já nasce único no mesmo namespace das personagens para o dia em que chegar); reordenar as fotos (a ordem é a de inclusão); desarquivar um produto.

## 6. Compilação de canvas (o contrato)

Ordem do prompt final: **estilo** (do node; herdado da personagem quando não sobrescrito) → **bloco de identidade** da versão mencionada (o compilador de sempre) → **cena do usuário** (o prompt em PT, traduzido na geração) → **ajustes de cena** (quando houver) → **diretivas das referências** (tipo + instrução, traduzidas) → **restrições** (sempre, ao final).

Regras:
1. **O prompt do node dirige a cena:** quando há texto no prompt, os padrões de cena do sheet (`cena_padrao`, expressão, pose) **não** entram — o usuário é o diretor. Prompt vazio com `@` mencionado: gera a personagem nos padrões dela (comportamento previsível, sem mágica).
2. **Tradução na geração:** o PT do usuário e das instruções é traduzido no momento de gerar (mesmo mecanismo barato da casa); o **original em PT e o compilado em EN são gravados juntos** no registro da geração — auditoria bilíngue.
3. **`prompt_compiled` completo (quitação da dívida):** a estrutura gravada passa a incluir o estilo e as diretivas de referência — "com que estilo e com quais referências esta imagem nasceu?" respondível por campo, não por leitura de texto.
4. Cobrança e registro: `record_generation`, preço do catálogo, débito atômico só no sucesso, `sheet_source`/`entity_version_id` quando houver `@` — tudo já provado, nada novo a inventar.
5. **Ajustes de cena sobrescrevem por campo** *(10/08/2026, regra 4 da §6 do character sheet finalmente exercida com valor).* Em modo "padrões da personagem", o campo que o node respondeu **sai** do sheet e a frase do node entra no lugar — iluminação por iluminação, expressão por expressão, e **ângulo no lugar de pose e enquadramento** (§5.27: é o mesmo eixo da câmera). Em cena dirigida os padrões já não entravam, então os ajustes apenas **somam**, logo depois da cena do usuário. Ordem fixa: **ângulo → iluminação → expressão**. Um ajuste **não** torna a cena dirigida: a regra 1 continua decidindo isso pelo texto do prompt, e só por ele. Chave desconhecida lê como Auto **inteiro** — nunca meio-aplica, porque silenciar o padrão do sheet sem pôr nada no lugar seria a única saída realmente errada. Tudo gravado por campo em `prompt_compiled.structure.ajustes_cena` e mostrado em português no "Ver prompt".
6. **Um produto é um objeto, quantas fotos tiver** *(10/08/2026).* As fotos de um mesmo produto viram **uma instrução só**, não N. A primeira fala pelo grupo, nomeando todas as posições que ele ocupa, e diz antes de qualquer outra coisa que elas são o mesmo objeto:

   > *Reference images 2, 3 and 4 are the same single object photographed from different angles — show it once, not several times.*
   > *Use the product shown in reference images 2, 3 and 4, `<instrução traduzida>`.*
   > *Reproduce the exact product shown in reference images 2, 3 and 4 — same colors, pattern, materials and details, without alteration.*

   **A cláusula de unificação vem antes da de fidelidade, e é ela que faz a segunda significar alguma coisa.** Sem ela, três "reproduce the exact product shown in reference image N" independentes dizem ao modelo que existem três produtos — e ele coloca três, ou mistura os três num quarto. Na estrutura gravada continua havendo **uma diretiva por imagem** (auditoria por imagem), com `grupo` e `unidade_en` novos; as fotos que não falam guardam `diretiva_en` vazia. Produto de **uma** foto degenera exatamente no comportamento de sempre — verificado no harness, byte a byte. A tradução da instrução acontece **uma vez por grupo**, não uma por foto.

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

Quantidade >1, listas e lote (chegam com o assíncrono em Storyboard + Vídeos); nodes de texto reutilizável / list / assistant / router (o mini-modal do Magnific — conversa própria); categorias de biblioteca na galeria (Stock, Style, Camera, Effects); `@` para objetos, cenários e roupas (hoje só a personagem é mencionável; o produto entra pelo fio, e o `handle` dele já nasce no mesmo namespace para o dia em que a expansão chegar); multi-personagem numa geração; extração de descrição de produto (botão opcional futuro — N4); edição pós-geração (upscale, remover fundo — arsenal futuro); vídeo e Motion Control (conversa dedicada já registrada).

**Decididos contra, com motivo** *(10/08/2026)*:
- **Toggle "Ativar inputs" no bloco.** O estado da faixa de referências já comunica: se há miniaturas, há entrada; se não há, o "+" está ali dizendo como criar uma. Um interruptor a mais seria um estado a mais para o usuário manter na cabeça, sem nada novo em troca.
- **Node Resultado pré-vinculado no nascimento do gerador.** Caixa vazia esperando é ruído no canvas — e ruído que ocupa espaço permanente. O Resultado nasce no primeiro Gerar, que é quando ele tem algo a mostrar.
- **Input de pose/ângulo como node separado.** A lista de **ângulo de câmera** dos Ajustes de cena (§5.27) e o chip **pose** nas referências já cobrem os dois caminhos que existem: o vocabulário fechado e a imagem de exemplo.

**Adiado com data** *(10/08/2026)*: quantidade **x2–x4** por geração chega junto com o motor assíncrono da frente de vídeo. A N5 fica mantida pela razão de sempre — quatro imagens síncronas seriam quatro esperas em sequência dentro de um request HTTP, que é exatamente o que a invariante 1 proíbe.
## 9. Notas da implementação (09/08/2026)

Números e achados que só existiam como "conferir na implementação" quando esta especificação foi escrita. Registrados aqui porque a spec é o lugar onde se procura por eles depois.

**Proporções — todas exatas.** O Nano Banana Pro aceita `1:1 · 2:3 · 3:2 · 3:4 · 4:3 · 4:5 · 5:4 · 9:16 · 16:9 · 21:9`. Os seis presets da §7 mapeiam **sem aproximação**, inclusive o 4:5 do Instagram Feed que a §7 previa que talvez precisasse. O mecanismo de "cai na mais próxima, mostra o número real" existe e não tem uso hoje — é a garantia para o primeiro modelo que chegar com lista menor.

**Referências — teto de 6 por geração, com a folha contando dentro.** A documentação do Google dá dois tetos por categoria e não um total: Pro aceita até 6 imagens de objetos e até 5 de personagens; o Nano Banana 2, até 10 de objetos e até 4 de personagens. Seis é o número que satisfaz os dois tetos sob qualquer mistura que este produto consegue produzir (no máximo uma personagem, pela N2), e é um número que a tela pode dizer sem precisar ensinar as categorias do Google a ninguém. Vive numa tabela por modelo no código, ao lado dos preços.

**Resolução: 2K fixo.** No Nano Banana Pro, 1K e 2K custam o mesmo — pedir o menor seria pagar o preço cheio por menos. **Atualizado em 10/08/2026, quando o padrão virou o Nano Banana 2:** ali os tamanhos *não* custam o mesmo para nós (US$ 0,067 em 1K contra US$ 0,101 em 2K), mas o preço que o usuário paga é **por imagem, não por tamanho** — então a conclusão sobrevive à troca por outro caminho: gerar em 1K entregaria menos pelos mesmos 75 ⚡. A margem em 2K continua na régua da casa (≈56 centavos de custo real para 75 ⚡ cobrados, os mesmos ~1,35× do Pro). Um seletor de qualidade só passa a fazer sentido no dia em que o tamanho mudar o **preço em Sparks**; enquanto não mudar, ele seria um controle que só sabe piorar.

**Cláusulas de fidelidade, acrescentadas depois do primeiro teste real.** Um biquíni anexado como produto voltou com uma alça de cada cor: o modelo tratou a referência como inspiração. Cada tipo passou a carregar uma frase fixa em inglês que nomeia o que não pode mudar, e o `@` com folha carrega a de identidade. **Elevam a taxa de acerto; não garantem 100%** — nenhum prompt torna um modelo de imagem determinístico, e isso está escrito no código para ninguém redescobrir.

**Filtro de conteúdo é probabilístico, e varia por modelo.** A mesma configuração recusada pelo Nano Banana 2 passou de primeira no Pro, e passou no próprio NB2 na segunda tentativa com a frase reformulada. Consequências de produto: reformular é caminho legítimo (a mensagem de recusa diz isso), trocar de modelo também é (o seletor está ao lado do botão), e **recusa nunca cobra** — garantido por constraint, não por código.

**A âncora precisa ser boa.** Uma personagem cuja versão congelada guarda uma folha ruim gera imagens consistentemente ruins, com fidelidade perfeita ao que foi pedido — o pior tipo de erro de diagnosticar, porque nada está quebrado. Folha fotorrealista congelada é pré-requisito de consistência, não passo opcional. Registrado para o onboarding.

## 10. Notas da implementação (10/08/2026)

**O modelo padrão é o Nano Banana 2.** A decisão G2 escolheu o Pro a partir da inspeção de um fluxo profissional alheio, antes de este produto ter gerado a primeira imagem. Depois de dezenas de gerações próprias, a evidência é nossa: 75 ⚡ contra 100 ⚡, com fidelidade igual ou melhor na nossa amostra. O Pro continua a um clique no mesmo seletor — mudou qual vem pré-selecionado, não quais existem. Registrado em [`decisoes.md`](./decisoes.md); o `is_default` vive no catálogo e mudou por migration, como manda a invariante 11.

**`ajustes_cena` na estrutura, com leitura tolerante.** Gerações anteriores a este ciclo leem o campo como lista vazia — a mesma técnica que já cobria `foto_unica` e `fidelidade_en`, e pela mesma razão: um prompt guardado é o registro de algo que já aconteceu e não pode ser reescrito, então quem lê é que se adapta. O `campo` é string solta no leitor de propósito: um ajuste renomeado no futuro tem que continuar legível no histórico de hoje.

**As três listas cobertas no harness, não só na tela.** O compilador de canvas ganhou nove verificações novas fora do Next (`scratchpad/canvas-compile-harness.ts`): que tudo em Auto produz **exatamente** o texto de antes, que o ângulo derruba pose e enquadramento, que uma cena dirigida só soma, que chave desconhecida vira Auto inteiro, e que a referência de estilo visual sai com a cláusula certa. As 84 verificações passam — as antigas continuam sendo a prova de que nada regrediu.

## 11. Notas da implementação — Produtos (10/08/2026)

**O `{n}` deixou de ser um número e passou a ser a frase inteira.** As cláusulas fixas diziam `"reference image {n}"`; agora dizem `"reference {n}"`, e o substituto é `"image 2"`, `"images 2 and 3"` ou `"images 2, 3 and 4"`. Para uma imagem só, o texto de saída é **byte a byte** o de antes — o harness verifica isso explicitamente, porque é a única forma de trocar a mecânica de todas as diretivas sem mudar nenhuma geração de uma foto.

**O harness achou o bug na primeira execução.** A cláusula de fidelidade do tipo *estilo visual* estava partida em dois literais de string (`"…of reference " + "image {n} — …"`), então a reescrita passou por cima dela e o texto saía como `"reference image image 1"`. Nenhum typecheck pega isso; a verificação de 09/08 que compara a frase inteira pegou de primeira. **É o argumento inteiro a favor de verificações que comparam texto literal em vez de estrutura.**

**A conta do teto virou uma função só** (`lib/generation/capacity.ts`). Antes vivia em três lugares — a faixa mostrando "4 de 6", o seletor decidindo quantas imagens ainda aceita, e agora o fio decidindo se um produto cabe. Três cópias de um número que o usuário está prestes a ouvir são três chances de a tela prometer uma coisa e o servidor cobrar outra.

**A recusa do fio não mora no grafo.** Quando um produto não cabe, o motivo vai para uma fatia efêmera do store do canvas (`notice`), fora de `nodes` e `edges`. Se morasse nos dados do node, uma reclamação passageira marcaria o projeto como sujo e seria **salva no workflow** — e o usuário abriria o projeto amanhã com o aviso de ontem.

**O diálogo do produto é um overlay comum, não um `<dialog>`.** Um `showModal()` renderiza na *top layer* do navegador, acima de qualquer `position: fixed` — o seletor de fotos apareceria **atrás** do diálogo que o abriu. É o mesmo tipo de armadilha do modal dentro de um `transform` do React Flow, por outro caminho.

**O nome do produto é resolvido no servidor.** O navegador manda o `id`; a Server Action busca o `display_name` no banco antes de gravar no `prompt_compiled`. Registro de auditoria que acredita no rótulo que o navegador mandou não é registro de auditoria — a mesma doutrina que faz o `@` ser resolvido lá e não aqui.
