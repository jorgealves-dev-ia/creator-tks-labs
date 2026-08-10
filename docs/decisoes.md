# Diário de decisões — Creator TKS Labs

> **Quando consultar este arquivo:** quando quiser saber *por que* algo é do jeito que é, ou antes de reverter uma escolha que parece estranha — a razão costuma estar aqui. Para o estado atual da arquitetura, ver [`arquitetura.md`](./arquitetura.md); para o estado atual do produto, [`produto.md`](./produto.md).
>
> **Formato de cada entrada:** data · a decisão em uma frase · o porquê em duas ou três linhas.
>
> **Regra de manutenção:** toda mudança de arquitetura, de produto ou de especificação registra uma entrada datada aqui, na mesma sessão em que acontece. Entradas são acrescentadas ao final — este arquivo é append-only por convenção, como o ledger é por trigger.

---

## Nota sobre as datas

Toda a Fase 0 e o fechamento da especificação do character sheet aconteceram em **07/08/2026**. As entradas abaixo usam o horário do commit para preservar a ordem real dos acontecimentos. As decisões que não nasceram de um commit (as do character sheet e as desta sessão de documentação) não têm horário registrado e aparecem depois, na ordem em que foram tomadas.

---

## Fase 0 — Fundação

### 07/08/2026 · 11:26 — Next.js (App Router) com TypeScript strict como base do projeto
**Commit:** `dd49148`

Server Components por padrão e deploy direto na Vercel, que é a hospedagem escolhida. TypeScript em modo strict desde o primeiro arquivo — adotar strict depois de o código existir custa muito mais caro do que começar com ele.

---

### 07/08/2026 · 13:58 — Segurança e limites de autonomia escritos antes da primeira linha de código de produto
**Commit:** `09acfe8` — `.claude/settings.json`, `.mcp.json`, `.env.example` e o `CLAUDE.md` (+195 linhas)

Guardrails escritos antes do código valem para todo o código que vier depois; escritos depois, valem só para o que ainda não foi feito. Ficaram travados desde o início: leitura de `.env*` bloqueada para o Claude Code, MCP do Supabase em **read-only permanente**, e escrita no banco exclusivamente por migration versionada — nunca por MCP, nunca pelo painel.

---

### 07/08/2026 · 14:37 — Árvore de pastas criada vazia, antes de existir código para ocupá-la
**Commit:** `c18b0b3` — `.gitkeep` em `api/generations`, `api/webhooks`, `components/nodes`, `config`, `lib/prompt`, `lib/providers`

A estrutura-alvo já estava decidida no `CLAUDE.md`; materializá-la como pastas reais evita que o código nasça no lugar errado e depois precise ser mudado de casa. A árvore de pastas é a arquitetura em forma visível.

---

### 07/08/2026 · 14:41 — Sessão do Supabase pelo padrão `@supabase/ssr`, com um client por request
**Commit:** `4ac7abc`

Nesta versão do Next.js o `cookies()` é assíncrono e o middleware mudou de nome para **proxy** (`src/proxy.ts`) — reaproveitar padrões de versões anteriores quebraria. O `lib/env.ts` valida as variáveis públicas com Zod **na importação**: variável faltando derruba no boot, não no meio de um fluxo do usuário. O matcher do proxy exclui assets estáticos e `api/webhooks`, porque webhook não tem sessão para renovar.

---

### 07/08/2026 · 14:52 — Modelo de dados completo com RLS default-deny, em 7 migrations
**Commit:** `bb113c4`

As invariantes do produto ficam no **banco**, não no código do app: cadastro cria perfil e carteira por trigger, projeto cria seu workflow por trigger, ledger recusa UPDATE/DELETE por trigger, saldo é projeção do ledger. Regra garantida pelo banco não depende de alguém lembrar de cumpri-la. RLS habilitado em todas as tabelas sem nenhuma política permissiva por padrão, e privilégios revogados de `anon` — nada neste produto é público.

---

### 07/08/2026 · 15:04 — Autenticação com Supabase Auth e todos os textos de UI centralizados
**Commit:** `75ca51b`

Textos de interface em um único arquivo (`lib/i18n/pt-BR.ts`) desde o começo, incluindo a tradução das mensagens de erro do Supabase para pt-BR — o usuário nunca vê erro em inglês. O callback de confirmação aceita os dois formatos de template do Supabase (`code` e `token_hash`) e **recusa redirect para fora do site**, que é a porta clássica de ataque de redirecionamento aberto.

---

### 07/08/2026 · 15:15 — Canvas salva por "sujeira" do grafo, não por timer cego
**Commit:** `6cc1b02`

Só mudanças que realmente alteram o grafo marcam o projeto como sujo — assim, **abrir** um projeto não dispara salvamento. O autosave roda 1,2s depois de parar de editar, com flush ao trocar de aba, e o UPDATE usa concorrência otimista por `version`. O grafo é validado com Zod nas duas direções (browser → server action e `jsonb` → app), porque o banco guarda `jsonb` e só o Zod garante que aquilo tem o formato que o React Flow espera.

---

### 07/08/2026 · 16:06 — `database.types.ts` passa a ser gerado do banco real, nunca escrito à mão
**Commit:** `aa597b1`

O arquivo escrito à mão batia coluna a coluna com o banco, mas **não trazia as chaves estrangeiras** — ou seja, estava certo e incompleto ao mesmo tempo, que é o pior tipo de erro para confiar. Regra que ficou: depois de aplicar migration, regerar. No mesmo commit, uma migration revoga `EXECUTE` das funções de gatilho para `public`/`anon`/`authenticated`: o Supabase as publicava como endpoints `/rest/v1/rpc`, sinalizado pelos advisors. O Postgres só checa `EXECUTE` na criação do gatilho, então os gatilhos continuam disparando normalmente.

---

### 07/08/2026 · 16:25 — O viewport faz parte do grafo salvo; Fase 0 declarada concluída
**Commit:** `03f2304`

O `CLAUDE.md` define o grafo como *nodes + edges + viewport*. Como a Fase 0 ainda não tem blocos, mover o canvas era a única forma de sujar o grafo — sem isso, o salvamento nunca era exercitado de verdade. Mudança programática (o `fitView` ao carregar) não conta como sujeira: o React Flow passa event nulo nesses casos. No mesmo commit, controles e minimapa passaram a seguir a paleta escura, e uma migration criou índices de cobertura nas 5 chaves estrangeiras que não tinham — sem eles, apagar um asset ou um workflow forçava varredura sequencial na tabela filha.

---

## Especificação do character sheet

> As três decisões abaixo fecharam a especificação v1 do character sheet, registradas na seção 8 de [`character-sheet.md`](./character-sheet.md). Não têm horário de commit porque nasceram de conversa, não de código.

### 07/08/2026 — Quarto estado `confirmado` para os campos do DNA visual ✅ aprovado
**Especificação:** [`character-sheet.md`](./character-sheet.md) §3

Originalmente eram três estados (`observado`, `inferido`, `vazio`). O quarto resolve uma ambiguidade real: quando o Jorge confirma um campo `inferido`, ele não pode virar `observado` — ninguém observou, o Jorge decidiu. E o que é digitado à mão também merece estado próprio. A regra que sai disso: **só `observado` e `confirmado` entram no prompt**; `inferido` e `vazio` são omitidos por completo, porque omissão honesta é melhor que chute.

---

### 07/08/2026 — Traje canônico: biquíni/sunga, com moldura de reference sheet e fallback automático ✅ decidido
**Especificação:** [`character-sheet.md`](./character-sheet.md) §5.22 e regra de compilação nº 10

O traje canônico padrão é biquíni (feminino) ou sunga (masculino), sempre descalço, porque a geração canônica precisa mostrar silhueta e proporção do corpo. Para não esbarrar em política de conteúdo, o prompt **nunca fala do corpo pela nudez**: abre com a linguagem técnica padrão da indústria — *professional full-body character reference sheet, neutral studio background* — que os modelos reconhecem como finalidade legítima. Se ainda assim o modelo recusar ou degradar o resultado, o sistema refaz **uma única vez** com compressão esportiva opaca, registra o fallback no histórico e mostra na interface. Sem surpresa silenciosa: o usuário sempre sabe qual traje foi usado.

---

### 07/08/2026 — Proporções corporais (busto/cintura/quadril) mantidas como bloco opcional ✅ mantidas
**Especificação:** [`character-sheet.md`](./character-sheet.md) §5.17

Ficam dentro de `corpo`, com listas fechadas próprias. Vazias, são simplesmente omitidas do prompt — o modelo decide livremente. Preenchidas, travam a silhueta entre gerações, que é justamente o problema que o character sheet existe para resolver. Opcional resolve os dois casos sem forçar ninguém a preencher.

---

## Documentação e operação

### 07/08/2026 — Taxa atual: 1 Spark = 1 centavo de BRL (`CENTS_PER_SPARK = 1`)

O preço de negócio — margem sobre o custo real das APIs — será definido na fase de monetização, quando o produto abrir a terceiros. Invariante inalterada: a contabilidade em centavos inteiros é a fonte da verdade; Sparks é apenas exibição.

---

### 07/08/2026 — A coluna do character sheet é `entities.sheet`, não `payload`

A especificação do character sheet dizia `payload`; a migration aplicada criou `sheet`. Vale o banco: **o documento se ajusta à realidade do schema, não o contrário**. A seção 2 do `character-sheet.md` foi corrigida. Nenhuma mudança de schema — mudar o nome da coluna para acompanhar o documento seria migration sem benefício algum.

---

### 07/08/2026 — Versionamento de entidades permanece como especificação, sem implementação no banco

O modelo está definido (snapshots completos, coluna de versão ativa, acesso por `@handle@vN`, reaproveitamento dos IDs de imagens não alteradas), mas a implementação fica para a fase do character sheet (Fase 2). Isso é escopo previsto de propósito — a seção 9 de [`character-sheet.md`](./character-sheet.md) já colocava a mecânica de versionamento fora do escopo daquele documento. O schema atual tem apenas `entities.version integer`.

---

### 07/08/2026 — A branch de trabalho e de deploy é `master`

O `CLAUDE.md` dizia `main`, mas a branch que existe — local e no remoto — é `master`. Toda a documentação passa a dizer `master`, pelo mesmo princípio da entrada sobre `entities.sheet`: o documento acompanha a realidade.

> **Pendência levantada e resolvida no mesmo dia.** A dúvida era se a *Production Branch* da Vercel apontava para `main` ou `master`. ✅ **Verificado: já estava em `master`** — o deploy do commit `b8ac866` saiu como `target: production` a partir de `githubCommitRef: master`, com estado `READY`. Nada a ajustar no painel.

---

### 07/08/2026 — Documentação estruturada em `docs/`; `CLAUDE.md` vira índice + invariantes

O `CLAUDE.md` acumulava produto, arquitetura, modelo de dados, roadmap e operação no mesmo arquivo — e ele é lido inteiro em toda sessão do Claude Code. Separando: cada assunto ganha um arquivo que pode crescer sem inflar o contexto de todas as sessões, e o `CLAUDE.md` guarda só o que precisa estar diante do Claude Code sempre — invariantes, glossário, convenções e o índice de para onde ir. Nada foi descartado na separação: o conteúdo foi movido, não deletado.

---

### 07/08/2026 — Critério de acesso a modelos de IA: direto na fonte por padrão, agregador quando há fricção real
**Detalhe:** [`arquitetura.md`](./arquitetura.md) §3, Decisão 2

**API direta** quando o desenvolvedor do modelo oferece conta de desenvolvedor viável (Google, OpenAI, Anthropic, ElevenLabs, xAI). **Agregador de infraestrutura (fal.ai)** quando o acesso direto tem fricção real — caso de Kling e Seedance, que exigiriam contas de desenvolvedor chinesas e pacotes de créditos.

Agregadores são aceitáveis porque chamam os mesmos modelos oficiais. O princípio "pegar direto na fonte" veta **revendedores de camada de produto** (ex.: Higgsfield), que empacotam modelos com margem e limitações próprias — nunca vetou infraestrutura.

---

## Versionamento de entidades

> Especificação completa: [`versionamento-entidades.md`](./versionamento-entidades.md). As três primeiras entradas são as decisões D1, D2 e D3 da seção 2 daquele documento.

### 07/08/2026 — Especificação do versionamento de entidades fechada (v1)
**Documento:** [`versionamento-entidades.md`](./versionamento-entidades.md)

O `character-sheet.md` fechou **o quê** se guarda numa personagem; faltava fechar **como esse conteúdo evolui no tempo**. A especificação separa identidade, retratos congelados e rascunho vivo, e define a tabela `entity_versions`, o ponteiro de versão ativa, as quatro travas de banco e as regras de resolução do `@`. Fecha uma pendência que estava aberta desde a estruturação da documentação, quando o versionamento constava como "definido na especificação, implementação pendente".

---

### 07/08/2026 — D1: versão nasce de intenção, não de clique

Só o botão explícito "Salvar como nova versão" cria versão. Sem versionamento automático a cada edição: o histórico é o diário de evolução da personagem, não um log de teclas. Versionar cada tecla encheria o histórico de ruído e tornaria inútil justamente a pergunta que ele existe para responder — "o que mudou da v1 para a v2?".

---

### 07/08/2026 — D2: o rascunho pode gerar imagem, com honestidade

Gerações a partir do rascunho são permitidas — essencial para testar a personagem antes de existir uma v1 —, mas ficam marcadas no histórico como `origem: rascunho — não reproduzível` (`generations.sheet_source = 'draft'`). Menções `@` em outros nodes resolvem **sempre** para versão congelada, nunca para o rascunho, porque o rascunho muda debaixo dos pés e destruiria a reprodutibilidade. Entidade sem nenhuma versão salva não pode ser mencionada — a interface orienta: "salve a v1 primeiro".

---

### 07/08/2026 — D3: versões têm cadeado no banco

Nenhuma versão pode ser editada ou apagada — trava por trigger no Postgres, no mesmo espírito do ledger financeiro ("trava no banco, não no código"). O máximo permitido é arquivar a entidade inteira. Regra garantida por trigger não depende de o código lembrar de cumpri-la, e vale inclusive para a service role.

---

### 07/08/2026 — As travas de versões e imagens seguem o padrão do ledger

O cadeado protege contra reescrita de história, **não contra o direito de apagar a própria conta (LGPD)**. Os triggers de DELETE em `entity_versions` e `entity_images` liberam a operação quando a linha correspondente em `auth.users` já não existe — sinal inequívoco de cascata legítima de exclusão de conta. Mesmo precedente da `reject_ledger_delete` (migration `20260807140400_ledger.sql`).

Sem essa exceção, apagar uma conta se tornaria impossível: a cascata `auth.users → entities → entity_versions` e `auth.users → assets → entity_images` abortaria a transação inteira. A especificação dizia "incondicionalmente" e foi corrigida (seções 4.1 e 4.3) para descrever a regra real.

Consequência técnica: a `entity_versions` carrega a coluna `user_id`, desnormalizada como já acontece na `entity_images`. Sem ela o trigger não distingue os dois casos — quando a cascata chega na versão, a linha da `entities` já foi removida e não pode mais ser consultada.

---

### 07/08/2026 — Migration de versionamento aplicada e verificada (7/7)
**Migration:** `20260807170000_entity_versions.sql`

Aplicada pelo Jorge e verificada com um roteiro de teste que exercita cada trava: numeração sequencial pelo banco, UPDATE e DELETE de versão bloqueados, imagem citada por versão protegida, imagem só do rascunho ainda deletável, e a FK composta recusando um ponteiro cruzado entre entidades. Sete de sete.

**Duas descobertas de ambiente que valem mais que a migration em si**, porque vão se repetir em toda migration futura:

1. **O `db push` só funciona com a connection string do *Session pooler* (IPv4).** A *Direct connection* do painel é IPv6 e falha nesta rede. Registrado na seção de comandos do `CLAUDE.md` e na nota de ambiente do [`arquitetura.md`](./arquitetura.md).
2. **O SQL Editor do painel não mantém transação nem tabela temporária entre statements** (erro `42P01`). Roteiros de verificação passam a ser escritos como **bloco `DO` único que termina em `raise exception` proposital** — a exceção é o relatório e é também o que desfaz os dados de teste. Esse formato roda igual no painel e no psql.

| Pendência | Responsável | Origem |
|---|---|---|
| Remover a coluna obsoleta `entities.version` numa migration futura — hoje só tem `COMMENT` de deprecação, e nenhum código a lê | próxima sessão de banco | entrada de 07/08/2026 (versionamento) |
| Definir a margem sobre o custo real (preço de negócio dos Sparks) | Jorge, na fase de monetização | Fase 4 do roadmap |

---

## Tela do character sheet

> As quatro decisões de UX abaixo estão registradas na seção 1 de [`tela-character-sheet.md`](./tela-character-sheet.md). Foram tomadas em 07/08/2026 e implementadas em 08/08/2026.

### 07/08/2026 — U1: cartão no canvas, editor em overlay ✅ aprovado

O node da personagem mostra só um cartão compacto — retrato, nome, `@handle`, selo da versão ativa e o pontinho de rascunho sujo. A edição acontece num overlay de quase tela cheia. Vinte e cinco campos dentro de um retângulo de node seriam ilegíveis no canvas e transformariam cada personagem num obstáculo visual ao fluxo, que é justamente o que o canvas existe para mostrar.

---

### 07/08/2026 — U2: criação guiada, edição livre ✅ aprovado

A primeira vez é um fluxo em passos; depois de criada, a personagem abre direto no editor com abas. Quem cria a primeira personagem não sabe ainda o que é DNA visual, padrão variável ou narrativa — o wizard ensina a estrutura enquanto preenche. Quem já criou cinco não quer ser guiado de novo.

**Como ficou na implementação:** a personagem é criada de verdade ao fim do passo 1, e os passos seguintes editam o rascunho pelo mesmo store e mesmo autosave do editor. Isso faz o wizard reaproveitar as abas do editor em vez de criar um segundo conjunto de formulários que poderia divergir delas — e significa que fechar o wizard no meio não perde nada: sobra uma personagem em rascunho, que é um estado legítimo previsto na seção 7 da spec.

---

### 07/08/2026 — U3: amarelos confirmados um a um ✅ aprovado

Sem botão "confirmar todos". Contador visível no cabeçalho e navegação de um clique entre os campos pendentes. Um botão de confirmar tudo transformaria a honestidade do sistema em burocracia a ser dispensada com um clique — e o estado `confirmado` passaria a significar "o Jorge clicou em algo", não "o Jorge olhou". Revisar oito campos leva segundos; o que importa é que cada um passou pelos olhos de alguém.

---

### 07/08/2026 — U4: seletores simples na v1, com uma exceção visual ✅ aprovado

Listas fechadas como seletores bem escritos; tom de pele como amostras de cor clicáveis desde já. Cor é a única coisa da ficha que texto descreve mal — "morena-clara" não significa a mesma coisa para duas pessoas, e uma amostra significa. Pickers ilustrados de rosto, cabelo e corpo ficam para evolução futura e **não mudam nada na estrutura de dados**: o valor gravado é sempre a chave da opção, nunca o hex.

---

### 08/08/2026 — Personagem é global do usuário, não do projeto (`project_id` nulo)

**Decisão de produto.** Um influencer de IA é um **ativo reusável**; um projeto é uma **bancada de trabalho**. A mesma Julia pode aparecer no canvas de qualquer projeto, e o handle já é único por usuário — o que confirma essa leitura no próprio schema. Prender a personagem a um projeto obrigaria a duplicá-la para usá-la em outro, e duplicata é exatamente o que destrói consistência de personagem.

Consequência na interface: o Arsenal lista as personagens do usuário, e tirar o cartão do canvas **não apaga a personagem** — ela continua no Arsenal, pronta para voltar.

---

### 08/08/2026 — Salvar versão é função no Postgres, não rota de API

**Detalhe:** migration `20260807190000_save_entity_version.sql`

Salvar uma versão são duas escritas que precisam ser uma: o INSERT do retrato congelado e o UPDATE do ponteiro de versão ativa. O cliente do Supabase não abre transação, então uma rota de API faria duas idas ao servidor — e uma falha entre elas deixaria ou uma versão órfã, ou (pior) o `@julia` apontando para o retrato errado. Transação de verdade em Node exigiria conexão Postgres direta, com connection string no servidor: mais superfície de risco do que a tela merece.

A função é `security invoker`, então o RLS continua mandando, e tira o retrato do próprio `entities.sheet` — versão é a fotografia do rascunho, então o rascunho é a única coisa que ela pode fotografar. Mesmo espírito das demais travas: **no banco, não no app**.

Três recusas com código próprio, para a tela poder explicar cada caso em vez de dizer "erro": `CT001` rascunho idêntico à versão ativa, `CT002` personagem arquivada, `CT003` personagem inexistente para quem chamou.

---

### 08/08/2026 — "A tela é o manual" vira princípio permanente de produto
**Detalhe:** [`produto.md`](./produto.md) §3

Toda funcionalidade nasce com tooltips, avisos e mensagens de erro explicativas. **Se um recurso precisa de manual externo para ser usado, o defeito é do recurso.** O princípio nasceu observando o que já tinha sido construído: os selos de estado com tooltip próprio, o botão desabilitado que diz *"nada mudou desde a v1"* em vez de ficar mudo, e os códigos `CT001`–`CT003` que dão mensagem por situação. Esses três são os exemplos fundadores.

Consequência para quem implementa: controle novo sem tooltip, estado novo sem explicação e erro novo sem mensagem própria são trabalho **incompleto**, não trabalho a polir depois.

---

### 08/08/2026 — Chaves das opções do dicionário são imutáveis

O `dictionary.ts` carrega um aviso permanente no topo. A chave gravada no sheet (`morena_clara`, `arqueadas_suaves`…) é citada por toda versão congelada que a usar, e versão não pode ser reescrita — nem pela service role. Renomear uma chave quebraria esses retratos para sempre: a versão antiga passaria a apontar para uma opção que não existe mais.

Para mudar o texto que o usuário lê, muda-se **só o rótulo PT**. Acrescentar opção é sempre seguro; remover, não. Chaves vieram do exemplo da seção 7 do [`character-sheet.md`](./character-sheet.md), e as demais foram derivadas do rótulo PT em snake_case.

---

### 08/08/2026 — Silhueta para gênero andrógino: as duas listas, agrupadas

A seção 5.16 do [`character-sheet.md`](./character-sheet.md) define lista feminina e masculina, e não diz nada sobre andrógino. Em vez de escolher uma pelo usuário, a tela mostra as duas sob subtítulos próprios. As frases fixas em inglês são genuinamente diferentes (`slim, slender build` não é `lean build`), então nenhuma lista contém a outra — e escolher uma seria chute embutido no código.

---

### 08/08/2026 — Pendências registradas da tela do character sheet

| Pendência | Quando | Origem |
|---|---|---|
| **Tour de primeira vez** — apresentação guiada do estúdio para quem entra pela primeira vez, no espírito de "a tela é o manual" | Fase 1 madura, quando o fluxo completo existir e houver o que apresentar | decidido em 08/08/2026 |
| **Testes automatizados de navegador (Playwright)** — hoje toda verificação é manual, com roteiro escrito a cada etapa | quando a base crescer o bastante para o teste manual ficar caro ou pouco confiável | decidido em 08/08/2026 |
| Motor de extração por foto — a UX já está especificada e o passo 2 do wizard já existe marcado "em breve" | próxima sessão | seção 7 de [`tela-character-sheet.md`](./tela-character-sheet.md) |
| Geração assistida das imagens canônicas (turnaround e folha de expressões) | sessão seguinte | seção 9 de [`tela-character-sheet.md`](./tela-character-sheet.md) |
| Diff visual entre versões ("o que mudou da v1 para a v2?") — trivial de calcular, já que os snapshots são completos | melhoria futura | seção 6 de [`versionamento-entidades.md`](./versionamento-entidades.md) |

---

### 08/08/2026 — Estado da pausa: tela do character sheet concluída

**Commits:** `bb179d7` (dicionário, cartão, editor) · `c538fb7` (selos, amarelos, versões) · `7d70a42` (wizard, imagens canônicas, docs)

Ponto de parada com a tela inteira entregue, em três etapas, cada uma verificada no navegador pelo Jorge antes do commit — não só compilada.

**Entregue e provado em uso real:**

- Dicionário das listas fechadas como fonte única para a tela (PT) e para o futuro compilador (EN), com as chaves declaradas imutáveis
- Cartão no canvas com selo da versão ativa e indicador de rascunho sujo; Arsenal listando as personagens
- Editor em overlay com as três camadas em abas e autosave do rascunho
- Selos de estado por campo e revisão dos inferidos um a um, com contador e navegação de um clique
- Versões: salvar (atômico, `save_entity_version`), ver congelada em somente-leitura, ativar antiga e carregar no rascunho
- Wizard de criação de ponta a ponta pelo caminho manual
- Imagens canônicas por upload, com a diferença provada entre remover imagem citada por versão (preservada, com aviso) e imagem só do rascunho (deletada de vez)

**Próximo passo combinado:** o **motor de extração por foto** — o passo 2 do wizard, hoje marcado "em breve". A UX já está especificada na seção 7 de [`tela-character-sheet.md`](./tela-character-sheet.md) e o lugar dele no fluxo já existe, então o motor encaixa sem retrabalho de tela. Ele é o que finalmente produz campos `inferido` de verdade: até aqui o fluxo dos amarelos só pôde ser exercitado marcando um campo à mão no banco.

**Estado do repositório na pausa:** árvore limpa, `master` sincronizada com o remoto, 12 migrations aplicadas e verificadas, `database.types.ts` regerado do banco.

---

## Motor de extração e infraestrutura de IA

> As seis decisões abaixo estão registradas na seção 2 de [`motor-extracao.md`](./motor-extracao.md). Foram tomadas e implementadas em 08/08/2026.

### 08/08/2026 — E1: multi-fornecedor desde o berço, Anthropic primeiro ✅ aprovado

Catálogo de fornecedores (Anthropic, OpenAI, Google, xAI) e seus modelos **no banco**, em `ai_providers` e `ai_models`. Só a Anthropic nasce configurada; as demais ficam visíveis porém apagadas no seletor até terem chave — o usuário vê o caminho adiante em vez de uma lista curta e inexplicada.

**Por quê no banco e não em `config/models.json`, como dizia a Decisão 6 da arquitetura.** Porque este catálogo é exatamente o que o futuro painel super admin vai gerenciar, e painel administrativo não edita arquivo do repositório. Preço de modelo passa a mudar por SQL, sem deploy. O princípio "data-driven, nunca hardcoded" continua o mesmo; só o lugar do dado mudou, e mudou para onde ele pode ser editado sem release. A Decisão 6 foi corrigida no documento.

A coluna `capabilities text[]` é o que faz uma tabela só servir o produto inteiro: `{extraction}` hoje, `{image_gen}` e `{video_gen}` quando a geração chegar.

---

### 08/08/2026 — E2: extração debita Sparks e registra o custo real ✅ aprovado

Preço fixo em Sparks por extração, lido do catálogo, debitado no ledger **apenas no sucesso**. Cada extração grava tokens consumidos e custo real calculado — a matéria-prima da calibração de preço e do futuro dashboard.

Preço inicial semeado: **Sonnet 10 ⚡** (o chute educado da spec, mantido de propósito), Opus 30 ⚡, Haiku 4 ⚡. A conta grossa diz que 10 ⚡ está na fronteira do custo real de uma foto no Sonnet — e é exatamente por isso que a tabela `extractions` existe: para o preço deixar de ser chute em uma dúzia de extrações.

**Dois juízes da escolha de `effort: "medium"` no adaptador** (em vez do `high` que é o padrão da API): `real_cost_cents` diz se ficou barato, e a **taxa de inferidos** diz se ficou bom. Um `effort` baixo demais aparece como excesso de amarelos antes de aparecer na conta.

---

### 08/08/2026 — E3: amarelo com motivo ✅ aprovado

Todo campo `inferido` carrega uma frase curta do porquê da dúvida ("luz amarelada, cor dos olhos incerta"), no tooltip do selo durante a revisão. Campo novo e opcional `motivo` no envelope, compatível com todo sheet gravado antes dele.

O motivo é **apagado quando o campo é confirmado**: ele descrevia uma hesitação que deixou de existir, e um campo confirmado explicando por que já foi incerto é ruído.

Consequência de tela que não estava prevista: durante a revisão, o selo amarelo era **substituído** pelos botões Confirmar/Editar — ou seja, o tooltip com o motivo não apareceria justo no momento em que ele importa. O selo passou a conviver com as ações, em vez de dar lugar a elas.

---

### 08/08/2026 — E4: duas portas, uma regra ✅ aprovado

Extração disponível no passo 2 do wizard e no botão da aba DNA do editor, servidos pelo **mesmo componente**: duas cópias dessa tela divergiriam, e a segunda a divergir seria a que esquece de dizer o custo.

A regra inegociável: extração preenche **apenas campos `vazio`**. `observado`, `inferido`, `confirmado` e o gênero são preservados e contados no resumo. É isso que torna seguro rodar o motor duas vezes, e seguro apertar o botão numa personagem já meio preenchida — nada que você decidiu é desfeito por uma máquina.

Para as marcas (tatuagens, piercings, pintas), "só o que está vazio" só pode significar uma coisa: **lista que já tem item fica intocada**. Não existe vaga por item para estar vazia, e mesclar numa lista que o usuário curou seria exatamente a sobrescrita que a regra proíbe.

---

### 08/08/2026 — E5: chave em variável de ambiente, catálogo no banco ✅ aprovado

O banco guarda o catálogo, inclusive **o nome da variável** que contém a chave (`ai_providers.env_var_name`). A chave secreta vive fora do banco, e "configurado" é calculado no servidor pela existência da variável, viajando para o navegador como **booleano**.

A trava não é disciplina, é compilação: `lib/providers/keys.ts` — único lugar do código que lê uma chave — importa `server-only`. **Provado nesta sessão:** um componente de tela importando esse arquivo derruba o build com `'server-only' cannot be imported from a Client Component module`.

Efeito colateral bom: como o débito no ledger virou função no banco (abaixo), esta feature inteira **não precisa da service role**.

---

### 08/08/2026 — E6: duas fontes, um motor ✅ aprovado

A extração aceita foto **ou** texto colado (JSON ou descrição vinda de outra plataforma ou de outra IA). O pipeline é idêntico: mapear para as chaves das listas fechadas, marcar estados com motivo, validar contra o dicionário, preencher só vazios. Importar um character sheet de outra ferramenta é colar o texto. Preço igual nas duas fontes na v1.

---

### 08/08/2026 — Registrar e cobrar uma extração é função no Postgres

**Detalhe:** migration `20260808184059_ai_catalog_and_extractions.sql`

Mesmo precedente do `save_entity_version`: gravar a linha em `extractions` e inserir o débito no ledger são duas escritas que precisam ser uma. Se o débito passa e o registro falha, cobramos sem prova do que foi pago.

Duas propriedades que a função ganha por ser `security definer` e por ler o catálogo:

1. **O preço não é parâmetro.** A função recebe o id do modelo e busca `ai_models.extraction_sparks` — quem pudesse dizer o preço poderia dizer zero.
2. **Não precisamos da service role.** A função valida a posse da personagem contra `auth.uid()` e é a única coisa que escreve no ledger, então nenhuma chave de administrador precisa existir no código desta feature.

Três recusas com código próprio: `EX001` saldo insuficiente, `EX002` personagem não é do chamador, `EX003` modelo não habilitado para extração.

Adicionada também `ledger_transactions.extraction_id`, espelhando o `generation_id` que já existia: sem ela, um débito e sua extração nunca poderiam ser reconciliados, e o dashboard futuro não responderia "o que cobramos por esta análise?".

---

### 08/08/2026 — A ordem das operações do motor é a especificação de segurança dele

Cada passo existe para impedir um jeito específico de estar errado, e a ordem é a parte que importa:

1. **saldo antes da chamada** — ninguém ouve "saldo insuficiente" depois de já termos gasto dinheiro em nome dele
2. **foto registrada antes da chamada** — uma extração que falhou ainda responde "o que ela tentou ler?"
3. **validação antes de tocar o sheet** — vocabulário inventado nunca chega ao rascunho
4. **cobrança e registro na mesma transação** — extração paga é sempre extração registrada
5. **sheet devolvido de qualquer jeito** — o autosave do rascunho é a rede de segurança, então uma extração paga nunca se perde num write que falhou

O rascunho é lido do banco, não enviado pelo navegador — mesmo motivo pelo qual uma versão é fotografada do rascunho gravado. Por isso a tela dá flush no autosave antes de chamar o motor.

---

### 08/08/2026 — Verificação por sabotagem virou o método de teste do motor

Antes de qualquer chamada real, o pipeline foi exercitado com uma resposta de modelo deliberadamente inválida: chave inexistente no dicionário, altura fora da faixa, confiança baixa com motivo, confiança alta, marca sem conteúdo e marca válida. Cada regra respondeu como devia — inventado e fora de faixa viraram campo vazio, baixa virou `inferido` com motivo, alta virou `observado`, marca vazia foi descartada.

O que isso comprou: as regras de honestidade do sistema foram provadas **antes** de existir tela e antes de gastar um centavo de API. Testar o caminho feliz prova que funciona; testar o caminho sabotado prova que **as travas** funcionam — e são as travas que fazem este produto valer algo.

---

### 08/08/2026 — Pendências e roadmap registrados do motor de extração

| Pendência | Quando | Origem |
|---|---|---|
| **Painel super admin** — gerenciamento de fornecedores e chaves de IA, usuários ativos, métricas SaaS (MRR etc.). Exigência já cumprida: `ai_providers`, `ai_models` e `extractions` nasceram sendo fonte de leitura dele | fase de monetização / operação | seção 2 de [`motor-extracao.md`](./motor-extracao.md) |
| ~~Calibrar o preço em Sparks do Sonnet~~ — ✅ **decidido em 08/08/2026: 20 ⚡**, com os dados reais. Ver a entrada de calibração abaixo | feito | decisão E2 |
| **Reavaliar o preço do Haiku** — custa 4 ¢ e cobra 4 ⚡, margem zero, com acerto comparável ao do Opus na mesma entrada | quando houver volume | calibração de 08/08/2026 |
| **Faxina de fotos de extrações falhas** — a referência de uma extração que falhou é guardada de propósito (é a prova do que o motor leu), mas nada as remove depois | quando o volume justificar | sessão de 08/08/2026 |
| **Chaves trazidas pelo usuário**, com armazenamento criptografado — a estrutura já recebe | quando houver terceiros | decisão E5 |
| **Extração de múltiplas fotos combinadas** — a v1 é uma foto | refinamento futuro | seção 6 de [`motor-extracao.md`](./motor-extracao.md) |
| **Adaptadores de OpenAI, Google e xAI** — e, junto de cada um, conferir o identificador do modelo na documentação oficial: os semeados para esses três estão marcados no SQL como **não verificados** | quando houver chave | decisão E1 |
| **Compra de Sparks de verdade** | fase de monetização | seção 6 de [`motor-extracao.md`](./motor-extracao.md) |

---

### 08/08/2026 — O contrato com o modelo é o prompt, não um JSON Schema estrito

**Medido contra a API real, não suposto.** A primeira versão do adaptador travava a resposta com o *structured outputs* da Anthropic. A API recusou com 400, e a recusa foi estreitada hipótese por hipótese:

| O que foi tentado | Resposta da API |
|---|---|
| `anyOf: [{enum}, {null}]` por campo | *"too many parameters with union types (29 … limit: 16)"* |
| `enum` contendo `null`, sem nenhuma união | *"the compiled grammar is too large"* |
| strings puras, sem enum nenhum | ainda *"too large"* |
| busca binária no número de campos | 15 campos passam, 20 falham |

Vinte e seis campos não cabem nesse recurso, em forma nenhuma. Então a rigidez ficou onde a spec sempre disse que a regra mora (§4.3): a validação Zod contra o dicionário. Isso não é perda — o schema só tornava a violação *rara*; o Zod é o que a torna **impossível de gravar**. O adaptador passou a extrair o JSON entre a primeira `{` e a última `}`, para uma cerca de código ou uma frase de preâmbulo não custarem a análise inteira.

**Efeito colateral que quase passou batido:** sem schema, o modelo leu os pontos das nossas chaves (`olhos.cor`) como caminho e devolveu `{"olhos": {"cor": …}}` — prestativo e errado. As chaves do fio viraram `olhos_cor`; o ponto não sobrevive à fronteira, o id do campo continua com ele.

Registro para quem for escrever o próximo adaptador: a interface entrega **o contrato em prosa**, e cada fornecedor traduz para o que suportar. A validação que de fato garante o vocabulário está acima da camada de adaptadores, então nenhum fornecedor precisa ser confiável para o sistema ser honesto.

---

### 08/08/2026 — Erro de provedor sem o corpo da resposta é bug, não simplificação

O adaptador transformava toda falha da API em `"the provider returned 400"` e **descartava o corpo** — que era a única coisa que dizia *por quê*. Custou uma rodada inteira de diagnóstico às cegas.

Regra que fica: erro de provedor carrega a frase que o provedor escreveu, verbatim. `ProviderError` ganhou o campo `detail`; em desenvolvimento ele vai para o terminal, e sempre vai para `extractions.error_message`. Nunca contém credencial — é o corpo da **resposta**, nunca o do pedido.

Uma mensagem que nós mesmos escrevemos só consegue repetir o que já supúnhamos.

---

### 08/08/2026 — Retentativa não sobe a foto de novo

Durante a falha acima, cada tentativa subiu uma cópia nova da mesma foto ao Storage. O painel passou a lembrar o caminho do upload enquanto o arquivo escolhido não muda: retentar custa uma chamada de API e mais nada.

A foto de uma extração **falha** continua guardada de propósito — ela é a prova do que o motor tentou ler. Limpeza de referências antigas é faxina periódica, não trabalho do caminho de erro.

---

### 08/08/2026 — Primeira medição de custo real: 10 ⚡ está abaixo do custo

Caminho feliz verificado contra a API real, nas duas fontes, com o código de produção:

| Fonte | Placar | Tokens (in/out) | Custo real |
|---|---|---|---|
| Texto colado (JSON de outra plataforma) | 13 observados · 1 inferido · 9 vazios · 3 marcas | 2.764 / 1.689 | **19 centavos** |
| Foto (gradiente sintético, sem rosto) | 0 · 0 · 23 vazios | 2.572 / 824 | **12 centavos** |

Duas coisas que esses números provam além do custo. O comprimento do cabelo voltou **inferido** com o motivo *"o termo 'long' não ancora o comprimento exato no corpo"* — a decisão E3 funcionando exatamente como escrita. E a foto sem rosto devolveu **tudo vazio**: o motor não inventou nada onde não havia o que ver, que é a regra 4 do prompt valendo na prática.

O custo, porém, contradiz o chute: cobramos 10 ⚡ = 10 centavos e gastamos 19. O gasto é dominado pela **saída** (1.689 tokens ≈ 14 dos 19 centavos), porque a resposta tem 26 chaves e o `effort: medium` ainda pensa antes. Decisão de preço é do Jorge; os caminhos são subir o preço do Sonnet, baixar o `effort` e medir de novo, ou aceitar o prejuízo enquanto é só desenvolvimento.

> Nota de leitura: `real_cost_cents` usa o preço de tabela do Sonnet (US$ 3/15). Até 31/08/2026 vale o promocional (US$ 2/10), então a fatura real é ~2/3 do registrado — o registro erra para cima de propósito.

---

### 08/08/2026 — Preço calibrado: Sonnet a 20 ⚡, `effort` medium mantido ✅ decidido
**Migration:** `20260809005226_calibrate_extraction_price.sql`

Decisão do Jorge com os dados na mão, substituindo o chute educado de 10 ⚡ da especificação. Os custos reais medidos:

| Modelo | Tokens (in/out) | Custo real | Preço |
|---|---|---|---|
| Sonnet, texto colado | 2.764 / 1.689 | 19 ¢ | **20 ⚡** |
| Sonnet, foto | 2.572 / 824 | 12 ¢ | **20 ⚡** |
| Opus, texto colado | 2.724 / 1.130 | 24 ¢ | 30 ⚡ |
| Haiku, texto colado | 2.097 / 1.021 | 4 ¢ | 4 ⚡ |

Vinte deixa margem no preço de tabela da Anthropic e margem folgada no promocional que vale até 31/08/2026 — ou seja, a virada de preço não obriga a mexer de novo.

**`effort` fica em medium**, e não cai para low, porque a **taxa de inferidos é qualidade do produto**, não linha de custo. Uma análise mais barata que hesita mais só transfere o trabalho para quem revisa os amarelos.

**Tratamento do seed.** O valor vivo é 20; o seed de `20260808184059` continua dizendo 10, porque é história do que foi aplicado. A calibração virou **migration própria** para que um reset futuro reproduza a decisão em vez de regredir ao chute. Regra que fica: preço de modelo muda por migration, não por UPDATE avulso no painel.

**Dado registrado para a próxima calibração:** o Haiku custa 4 ¢ e é cobrado 4 ⚡ — margem zero. E na mesma entrada ele acertou tanto quanto o Opus (7 observados contra 6). Vale reavaliar preço e posição dele quando houver volume.

---

### 08/08/2026 — Dois bugs achados pelo Jorge no teste de navegador

**O parser lia só o primeiro bloco de texto da resposta.** Extração com Opus falhava, e a evidência foi o `error_message` recém-instrumentado: gravou *"Desculpe — aqui está a ficha:"*. O modelo tinha respondido — em **dois blocos de texto**, um de preâmbulo e outro com o JSON. O `.find()` pegava o primeiro, não achava chave nenhuma e reportava o pedido de desculpas do modelo como se fosse o erro.

Agora todos os blocos de texto são concatenados antes da varredura de chaves: custa nada e não tem como estar errado, seja qual for a forma que chegar. Verificado contra a API real — Opus devolve `thinking` + `text`, Haiku embrulha em cerca ```json, e os dois passam. O prompt também ficou mais literal ("o primeiro caractere é `{` e o último é `}`").

**Mensagem de erro passou a dizer a causa técnica.** Em vez do início da prosa do modelo, o `error_message` agora traz `stop_reason`, quantidade de blocos de texto e tamanho — com um trecho curto ao final como evidência, não como diagnóstico. A pergunta "por que falhou?" tem que ser respondida pela linha do banco, sozinha.

**Elegibilidade de fornecedor tem duas condições e duas explicações.** Com a `OPENAI_API_KEY` no ambiente, a OpenAI acenderia no seletor sem existir adaptador. A regra já exigia chave **e** adaptador, mas o rótulo mentiria: diria "configure a chave" para quem acabou de configurá-la. Agora o status é `ready` / `missing_key` / `no_adapter`, e um fornecedor sem adaptador aparece como **"(em breve)"**. A derivação mora em `lib/providers/registry.ts`, junto do registro que responde metade da pergunta — e onde pode ser exercitada sem precisar de sessão.

Princípio que sai daqui: **modelo no catálogo ou funciona, ou não fica selecionável.** Opus e Haiku foram validados com chamada real antes deste commit.

---

### 08/08/2026 — Registrados para a conversa da geração canônica (a próxima)

**Folha única vs. vistas separadas.** Oferecer as duas formas de gerar as imagens canônicas: por vista (um slot de cada vez, trocável individualmente) e folha única em grade, no estilo do character sheet do Magnific, numa geração só. Não são excludentes — o desenho fino é assunto daquela conversa. A coluna de imagens canônicas já existe com os seis slots e o upload manual, então as duas formas encaixam sem retrabalho de tela.

**Prévia do prompt compilado.** O compilador das 10 regras da seção 6 de [`character-sheet.md`](./character-sheet.md) nasce naquela conversa, e com ele o painel "Prompt compilado (prévia)" no editor: o JSON em inglês visível ao vivo. Visível sempre, editável nunca como texto no nível do DNA — edição de prompt acontece nos nodes de geração, preservando as listas fechadas. O dicionário PT↔EN já está pronto e é a fonte única dessa tradução; o motor de extração acabou de provar que ele serve as duas pontas sem divergir.

---

### 09/08/2026 — Compilador de prompt e geração das imagens canônicas (G1–G4)

**G1 — A folha nasce do DNA compilado, texto puro. ✅ APROVADO.** Nenhuma foto de referência na v1 da geração canônica. Três motivos: é o padrão do fluxo profissional inspecionado (texto → rosto-base → tudo referencia); prova que o DNA funciona, porque folha errada é campo errado, visível e corrigível; e evita clonagem de rosto de pessoa real — a mesma ética que fez a extração recusar identificação. Foto-referência opcional fica registrada para estudo futuro, com cuidados próprios.

**G2 — Modelo padrão: Google Nano Banana Pro. ✅ APROVADO.** Evidência da inspeção: é o modelo escolhido em todos os geradores de um fluxo profissional de consistência. Slugs e preços conferidos na documentação oficial no dia da implementação, não de memória — e a documentação tinha mudado em três pontos relevantes: o slug é `gemini-3-pro-image` (sem `-preview`), a API virou `POST /v1beta/interactions` (não mais `generateContent` com `responseModalities`), e **nenhum modelo de imagem tem free tier**, o que torna billing obrigatório.

**G3 — Folha única vertical como padrão; vistas sob demanda. ✅ APROVADO.** A folha ganha slot próprio, em destaque no topo da coluna, e vira a referência universal. As seis vistas continuam existindo, geradas sob demanda **com a folha anexada como referência de imagem**. Sem folha, o botão da vista fica desabilitado com o motivo — a regra é enforçada também no servidor, não só na tela.

**G4 — Síncrono agora, assíncrono quando precisar. ✅ APROVADO.** Uma imagem 2K levou 23–27s na validação real, dentro do `maxDuration` de 60. É esse número que dirá quando o assíncrono virar necessidade; ele estreia na conversa de Storyboard + Vídeos, onde é inevitável.

---

**O compilador é função pura, e isso obrigou uma decisão sobre os campos livres.** `lib/prompt/compile.ts` não faz rede, não lê relógio, não sorteia: o mesmo sheet produz o mesmo prompt hoje e daqui a um ano. Mas os campos livres estão em português e precisam chegar em inglês, e uma função pura não pode ir buscar tradução.

Solução: **tradução no salvamento, com cache no próprio envelope** (`detalhes_en`, `descricao_en`, `regra_en`). O autosave grava, uma chamada barata ao Haiku traduz o que falta, e o compilador só lê. Custo interno de fração de centavo por edição, **não cobrado em Sparks** — entra na margem das gerações.

A regra que sustenta o cache cabe numa frase: **mudou o português, morre a tradução.** Ela mora em `syncTranslationCache()`, chamada pelo `updateSheet` da store — por onde toda edição passa. A alternativa seria espalhar a invalidação por cinco editores diferentes, e o quinto esqueceria.

**A ação de tradução não escreve no banco, de propósito.** O rascunho tem um escritor só (`saveCharacterDraft`, movido pelo autosave). Um segundo escritor disputaria com a digitação do usuário o direito à última palavra. Ela devolve o que traduziu, a store aplica, o autosave seguinte persiste — e o ciclo fecha sozinho, porque cache cheio não tem nada pendente.

**A prévia "Prompt compilado" carrega o placar do que ficou de fora.** Não é decoração: um prompt que não se pode auditar é um prompt em que se precisa confiar, e o sistema de estados existe justamente para isso não ser necessário. O placar conta inferidos, vazios, campos livres aguardando tradução — e avisa quando há conteúdo em notas gerais, que nunca entra em prompt de imagem.

**Notas gerais ficam fora do prompt (D6).** A regra 7 do §6 e a §3.3 listam os campos livres como `detalhes`, `descricao` de marcas e `restricoes`; notas gerais não aparecem em nenhuma das duas. É caderno de anotações — e o campo diz isso antes de ser escrito, não depois.

**`record_generation` é gêmea da `record_extraction`.** Preço lido de `ai_models.image_sparks` e nunca do parâmetro, carteira travada com `for update`, débito atômico só no sucesso, `GN001`–`GN003` para a tela dizer cada caso em português. O que já existia e significava a mesma coisa **não foi duplicado**: `cost_real_cents` ficou, e `error` virou `error_message` em vez de ganhar um irmão — duas colunas para uma ideia é como uma consulta acaba perdendo metade das falhas.

**A ordem das escritas erra a favor do usuário.** Storage → asset → vínculo → cobrança → rascunho. Um processo morto entre o vínculo e a cobrança deixa uma imagem de graça, não uma ausência paga. E cobrança que falha derruba a imagem junto: ninguém fica com algo que acabou de ser informado que não podia ter.

**Preço calibrado contra a realidade, não contra a tabela.** Regra da casa: custo real em centavos × 1,35, arredondado para múltiplo de 5. A validação real mediu **74 centavos** por imagem 2K — Nano Banana Pro ficou em 100 ⚡. O cálculo de `real_cost_cents` deixou de somar os tokens de saída por cima do preço por imagem (inflava ~12%): o número gravado agora é conferível linha a linha com a fatura do Google, que é o que o torna útil para calibrar. Tokens de pensamento (~1 centavo em 20) ficam de fora, e isso está escrito no código.

**Dependência nova aprovada: `@google/genai`.** O SDK oficial cobre a Interactions API desde a 2.3.0, então valeu o padrão da casa — SDK, não `fetch` cru, mesma razão do `@anthropic-ai/sdk`. Bônus: os tipos do pacote são a documentação mais confiável dos formatos.

**Validado com geração real antes da entrega** — folha completa e vista de perfil usando a folha como referência. Sem recusa: a moldura de reference sheet do §5.22 passou de primeira com o traje de banho, e o fallback não precisou disparar. E a honestidade dos estados apareceu na imagem: os olhos saíram **castanhos**, não verdes, porque `verde` estava `inferido` e não entrou no prompt. A regra 2 visível a olho nu.

**Pendências de refinamento registradas** (a avaliar com mais gerações reais): a tatuagem foi desenhada no quadril em vez do pulso esquerdo — infidelidade do modelo, com o efeito colateral favorável de ficar *consistente* entre imagens por causa da âncora; e as células de expressão da folha saíram quase idênticas, porque quem enumera expressões é o slot dedicado. Detalhes na seção 6 de [`geracao-canonica.md`](./geracao-canonica.md).

---
### 09/08/2026 — Achado do teste de navegador: estilo visual está solto

A Etapa C passou nos oito itens do roteiro, e a folha da personagem principal do Jorge trouxe o achado mais útil do dia: **saiu com aspecto de desenho, não de foto.**

A causa é nossa e é identificável: **o prompt canônico não ancora estilo em lugar nenhum.** A moldura do §5.22 abre com `professional full-body character reference sheet`, e "character reference sheet" é vocabulário que boa parte dos modelos associa a *character design* ilustrado. A interpretação do modelo é legítima — só não é a que queremos. Na validação contra a API a folha saiu fotográfica, o que prova que hoje isso é **sorte do modelo, não decisão do sistema**.

Por que isso é maior do que um ajuste de prompt: **estilo é a terceira coisa que precisa ser tão determinística quanto identidade e traje.** O produto inteiro existe para que a personagem continue sendo a mesma pessoa entre gerações; uma folha ilustrada com vistas fotográficas quebra isso tão completamente quanto trocar a cor dos olhos. E o mecanismo que resolve já existe e está provado — lista fechada com frase fixa em inglês, exatamente como os outros 25 campos.

Fica para a tarefa seguinte decidir **onde** o estilo mora: campo da Camada 2 (default do sheet, sobrescrevível por node, que é a hipótese natural) ou constante da geração canônica. As duas opções têm consequência sobre o que uma versão congelada guarda, então a decisão vale uma conversa curta em vez de um commit apressado.

Registrado na seção 6 de [`geracao-canonica.md`](./geracao-canonica.md), junto das outras duas pendências de refinamento.

---
### 09/08/2026 — Estilo de renderização como lista fechada (regra de compilação 11)

**Âncora que varia de estilo é âncora ruim.** Achado do Jorge na primeira geração real da personagem principal: a folha completa saiu com aspecto de desenho.

A causa era nossa e era uma **ausência**. O prompt canônico ancorava identidade e traje e não dizia nada sobre **meio**. Pior: a própria moldura do §5.22 abre com `character reference sheet`, vocabulário que boa parte dos modelos lê como *character design* ilustrado. A leitura do modelo era legítima — ela só não era nossa para deixar por conta dele. Na validação contra a API a folha tinha saído fotográfica, o que só provava que aquilo era **sorte do modelo, não decisão do sistema**.

**Camada 2, não constante da geração canônica. ✅ DECIDIDO.** O argumento do Jorge, e ele fecha: estilo é identidade, então pertence ao sheet e congela nas versões como tudo mais. Uma constante da canônica consertaria só a folha e deixaria toda geração futura do canvas na sorte do modelo. A exceção pontual é sobrescrita de node — a hierarquia que a Camada 2 já tem, e que a regra 11 delimita: o node escolhe **qual** estilo, nunca deixa a geração **sem** estilo.

**Sete opções**, cada uma com frase fixa em inglês, como os outros 25 campos. `editorial_moda` entrou porque o produto é moda e lifestyle para Instagram/TikTok/Shopee, e editorial é registro real, distinto do fotorrealista puro. Lista completa na §5.26 de [`character-sheet.md`](./character-sheet.md).

**Reforço espelhado, e é o detalhe que vale.** Cada opção carrega a sua própria frase de fechamento — não só as fotográficas. Uma folha anime que sai fotográfica é exatamente o mesmo bug, espelhado; reforçar um lado só consertaria metade do problema.

**Sem migration.** Campo ausente lê como `fotorrealista`, por default de leitura no schema (`prefault`). Nenhuma versão congelada é tocada — elas apenas **leem** assim, que é o que já eram na prática em toda geração que saiu certa. Três camadas com papéis distintos e sem sobreposição: o Zod cobre a chave ausente, o compilador cobre valor nulo ou chave desconhecida, e a interface não oferece "não definido" neste campo.

**Posição no prompt.** Primeiro item do bloco de cena no caso geral. Na geração canônica, **antes da moldura** — nomear o meio *antes* das palavras que sugerem um é o que transforma o meio de suposição do modelo em decisão nossa. Verificado nos quatro casos: sheet antigo sem a chave, prompt canônico da folha, estilo anime numa vista, e valor nulo por corrupção.

---

### 09/08/2026 — Convenção: artefatos de validação ficam no D:

Imagens de teste, scripts descartáveis e harnesses vão para `D:\Z - Meus Projetos DevIA\Creator TKS Labs\scratchpad\` — fora do repositório, então nunca entram em commit por acidente. **Nunca no `%TEMP%` do C:**, que é pequeno e é limpo sem aviso.

A convenção nasceu com prova: as duas imagens da validação da API do Google — a folha e a vista de perfil que fundamentaram três decisões deste ciclo — já não existiam no temp poucas horas depois. Registrada nas convenções de código do `CLAUDE.md`.

---

### 09/08/2026 — Refinamentos de UX do canvas registrados (ciclo curto após a Etapa C)

Pedido do Jorge ao aprovar a Etapa A dos nodes de geração. São refinamentos de **uso**, não de mecânica: nenhum deles muda contrato, schema ou regra de compilação, e por isso cabem num ciclo curto de polimento depois que a linha de produção estiver completa — em vez de disputarem espaço com as referências e o encadeamento.

| Refinamento | O que resolve |
|---|---|
| **Personagens recolhíveis** — tirar o cartão do canvas para o Arsenal e trazer de volta, com transição | Hoje remover o cartão é um delete que parece perda, ainda que a personagem continue no Arsenal. Recolher e re-adicionar diz a verdade que a decisão de 08/08/2026 já tomou: a personagem é ativo do usuário, o canvas é bancada |
| **Seletor de estilo: "da personagem" é rótulo, não valor** | O seletor mostra `Da personagem · Fotorrealista` **dentro da opção**, misturando de onde vem com o que é. A origem pertence ao rótulo do campo; o valor exibido deve ser só o estilo |
| **Lightbox no node Resultado** — duplo clique ou ícone abre a imagem ampliada, com zoom | Uma imagem 2K dentro de um node de 256px não pode ser conferida. Hoje a única saída é baixar o arquivo para olhar |
| **Retrato da personagem no Arsenal** — miniatura da folha completa como avatar, no lugar das iniciais | As iniciais são um marcador de posição desde a Fase 2; a folha existe e é literalmente o rosto da personagem |

> O registro completo do ciclo dos nodes de geração — decisões N1–N5, a quitação da dívida do `prompt_compiled` e os registros de futuro — entra ao final da Etapa C, junto das demais atualizações de documentação, conforme o plano aprovado.

---

### 09/08/2026 — Filtro de conteúdo é probabilístico por modelo, e reformular é caminho legítimo

**Achado do Jorge nos testes exploratórios da Etapa B**, com validação dos dois lados: a **mesma** configuração recusada pelo Nano Banana 2 passou **de primeira** no Nano Banana Pro; e o próprio NB2 passou na segunda tentativa com a frase reformulada (*"vestindo seu biquíni novo"*).

Três coisas ficam registradas:

1. **O filtro não é uma regra, é uma probabilidade — e ela varia por modelo.** O NB2 tem filtro mais rígido que o Pro. Isso não é bug de nenhum dos dois, e não é algo que o nosso prompt possa "consertar": é política do provedor aplicada a cada chamada. Consequência de produto: **trocar de modelo é uma resposta válida a uma recusa**, e o seletor já está do lado do botão.
2. **Reformular a cena é caminho legítimo, não gambiarra.** A mesma intenção dita com outras palavras passou. Por isso a mensagem de recusa agora diz exatamente isso — *"Ajuste a descrição da cena e tente de novo"* — em vez de deixar o usuário achando que bateu num muro.
3. **Recusa nunca cobra.** Provado nos dados, não no código: as duas linhas de `generations` com `status = 'failed'` daquela rodada têm `sparks_charged = 0`. É a constraint `generations_failed_is_free` valendo na prática.

**Junto disso, o Nano Banana 2 foi validado contra a API real** — o segundo modelo de imagem do catálogo a rodar de verdade. Vale o princípio da casa: modelo no catálogo ou funciona, ou não fica selecionável.

---

### 09/08/2026 — Recusa de política estava chegando à tela disfarçada de falha de rede

**Bug, com recibo.** A linha gravada dizia:

```
the provider could not be reached: 400 Image generation blocked
due to safety violations. Please modify your input and retry.
```

A frase do Google está perfeita; **o prefixo é nosso e está errado**. `"could not be reached"` é o ramo de fallback do adaptador, o que significa que `error instanceof ApiError` deu falso — o SDK nem sempre embrulha na classe que esperávamos. Como a checagem de recusa morava **dentro** daquele ramo, uma recusa de conteúdo virou "erro do provedor", e a tela mandou o usuário olhar a conexão quando o conserto era trocar uma palavra da cena.

A correção é ler **o que o provedor escreveu**, não a classe em que veio embrulhado. A Decisão 7 da arquitetura chama recusa de erro **esperado**; erro esperado precisa ser reconhecível.

Regra que fica, gêmea da de 08/08/2026 sobre descartar o corpo da resposta: **classificação de erro se faz pela mensagem do provedor, nunca só pelo tipo do objeto.**

---

### 09/08/2026 — O autosave do canvas podia correr contra si mesmo

**Bug achado pelo Jorge:** "Falha ao salvar / Tentar de novo" logo depois de uma geração bem-sucedida. Nada tinha se perdido — o grafo no banco estava completo, e "Tentar de novo" sempre funcionava —, mas a tela dizia algo alarmante e falso sobre um projeto que estava inteiro.

A causa é uma corrida que a concorrência otimista não cobria. O `version` protege contra **outra aba**; não protegia contra **um segundo salvamento da mesma aba**:

1. o salvamento A parte com a versão 41 e demora (banco remoto, logo depois de uma geração que acabou de usar a conexão)
2. uma edição chega, o canvas fica sujo de novo
3. 1,2s depois o salvamento B parte — e lê **41**, porque A ainda não voltou para atualizar
4. A volta, a linha vira 42
5. B volta e não casa com nada → conflito → "Falha ao salvar"

**Correção: salvamentos são serializados.** Se um já está em voo, o próximo é enfileirado e roda depois, com a versão que o primeiro produziu. A trava é de módulo e não de `ref` porque `useSaveWorkflow` é chamado em dois componentes — o autosave e o botão de tentar de novo —, e um guarda por instância não é guarda nenhum.

Efeito colateral bom: **conflito volta a significar o que sempre devia** — outra aba editando de verdade —, e por isso ganhou mensagem própria, que manda recarregar em vez de tentar de novo.

**E a mensagem deixou de ser genérica.** *"Falha ao salvar o projeto — suas imagens e créditos estão seguros."* A imagem já está no Storage e o débito já está no ledger muito antes de o canvas ser salvo; quem lê o aviso precisa das duas informações na mesma frase.

---

### 09/08/2026 — Cláusulas fixas de fidelidade nas referências (e a expectativa honesta)

**Achado do Jorge:** um biquíni anexado como produto voltou com **uma alça vermelha e outra azul**. O modelo não ignorou a referência — tratou-a como *inspiração*. Nomear a imagem não é insistir nela.

Cada tipo de referência passa a carregar uma **cláusula fixa em inglês**, no mesmo espírito das frases fixas do dicionário: produto exige *same colors, pattern, materials and details, without alteration*; roupa exige ser vestida exatamente como mostrada; cenário e pose têm as suas. **`Outro` não tem cláusula** — sobre uma imagem que ninguém rotulou não há propriedade que se possa honestamente exigir.

E a mesma lógica vale para a referência que mais importa: sempre que há `@` com folha, entra a cláusula de identidade — *"keep the exact same face and features as the character reference sheet"*. Um modelo que recebe um rosto produz de bom grado um rosto **parecido**, e "parecido" é exatamente o que este produto existe para recusar.

> **Expectativa honesta, escrita no código para ninguém ter que redescobrir:** reforço **eleva a taxa de acerto, não garante 100%**. Nenhum prompt torna um modelo de imagem determinístico. O que a cláusula compra é que o erro fique mais raro — e que, quando acontecer, a instrução violada esteja visível no `prompt_compiled` guardado.

**Observação de amostra única, registrada como dado e não como conclusão:** neste caso o **NB2 saiu mais fiel à referência que o Pro**. É uma geração de cada, sem controle de variáveis — não sustenta nenhuma recomendação de modelo. Fica anotado para a calibração futura, junto do que `real_cost_cents` já vem acumulando.

---

### 09/08/2026 — Pendência de produto: gerações saindo como grade ou par de fotos

Observado nos testes da Etapa B: alguns resultados vêm como **duas fotos numa imagem só**, ou como uma pequena grade, em vez de uma única foto.

**A investigar antes de decidir qualquer coisa:** se vem do nosso prompt compilado ou do modelo. Hipótese inicial, anotada como ponto de partida e não como diagnóstico — as receitas da geração canônica dizem explicitamente *"A single full-body view"*, e **o prompt de canvas não diz nada equivalente**: nada nele pede uma foto só. Um modelo preenchendo um quadro 9:16 com uma colagem é comportamento plausível diante desse silêncio.

Se a causa for nossa, a pergunta seguinte é de produto, não de correção: **oferecemos o controle** ("1 foto" vs "ensaio")? Um par de fotos pode ser exatamente o que um criativo de social commerce quer. Fica para avaliar depois da Etapa C.

---

### 09/08/2026 — Consistência de personagem depende da qualidade da âncora, não só do DNA

**Achado do Jorge no fechamento da Etapa B**, investigando um desvio de cabelo que parecia bug e não era. A `@luna` estava na v3, e a folha completa congelada naquela versão ainda era **a folha com aspecto de desenho** — a que nasceu antes da regra 11. Toda geração de canvas ancorava naquela imagem.

O sistema estava funcionando exatamente como escrito: a folha é a âncora universal, cada vista referencia a âncora, e uma âncora ilustrada puxa o resultado para o lado dela. **Âncora ruim produz consistência ruim com fidelidade perfeita ao que foi pedido** — que é o pior tipo de erro para diagnosticar, porque nada está quebrado.

Higiene feita pelo Jorge: folha fotorrealista gerada, sheet limpo, **v4 salva**, regeneração conferida.

**O que isso vira em produto, e é a parte que importa:**

> **A folha fotorrealista congelada é pré-requisito de consistência, não um passo opcional do fluxo.**

Hoje a interface já sugere o caminho (*gerar folha → conferir → salvar v1*), mas sugerir não basta: uma personagem pode ser mencionada com uma folha antiga, ou com folha nenhuma, e nos dois casos o resultado decepciona sem explicar por quê. **O onboarding futuro deve conduzir a isso** — e a interface deve saber dizer, na hora da menção, quando a âncora que vai ser usada é velha ou ausente. O aviso de "esta versão não tem folha completa" já existe; falta o caso mais traiçoeiro, que é a folha existir e ser ruim.

Registrado para o ciclo de refinamentos de UX do canvas, junto dos quatro itens já anotados.

---

### 09/08/2026 — Todo texto no sheet é prompt, inclusive o que você escreveu para testar

O desvio de cabelo tinha uma segunda causa, e ela é mais geral que a primeira: sobraram **detalhes de teste** no sheet — *"reflexos dourados"*, escrito um dia para exercitar o campo livre. O compilador fez o que existe para fazer: obedeceu literalmente, gerou a personagem com reflexos dourados, e ninguém tinha pedido aquilo naquele dia.

**Não é bug de nada.** É a consequência exata do desenho: campo `observado` ou `confirmado` **entra**, sempre, em toda geração, para sempre — e congela na versão. A honestidade do sistema corta para os dois lados.

Duas coisas ficam registradas:

1. **Sheet não é rascunho de experimentos.** Texto de teste em campo livre não é inerte: ele é prompt, e vai continuar sendo prompt em todas as gerações e em todas as versões que o copiarem. A prévia "Prompt compilado" existe justamente para isso ser visível antes de virar imagem — e neste caso ela mostrava, bastava olhar.
2. **Modificador de cor é amplificado.** O texto dizia que os reflexos eram *"bem sutis"*; a imagem trouxe reflexos evidentes. É vício conhecido de modelos de imagem com modificadores de cor: o adjetivo de intensidade é a primeira coisa que se perde, o substantivo de cor é a última. Consequência prática para quem escreve campo livre: **descrever pouco tem mais chance de sair certo do que descrever com ressalvas** — "sutil" não é um freio que o modelo respeite.

---

## Nodes de geração no canvas

> As cinco decisões abaixo estão registradas na seção 2 de [`nodes-geracao.md`](./nodes-geracao.md). Foram tomadas e implementadas em 09/08/2026, em três etapas, cada uma verificada no navegador pelo Jorge antes do commit.

### 09/08/2026 — N1: conectores no node, não node de referência ✅ aprovado

**Decisão do Jorge, e melhor que a proposta original.** A proposta que estava na mesa era um *node de referência* separado, ligado ao gerador por um fio. O Jorge desenhou outra coisa a partir da inspeção do fluxo profissional do Magnific: **conectores visíveis na borda do próprio bloco**, e o clique já abre a ação certa — nada de peça intermediária.

Por que é melhor: uma referência não é um passo do fluxo, é uma **propriedade da geração**. Como node separado, cada imagem anexada custaria um retângulo e um fio no canvas, e três referências transformariam um bloco em uma teia — justamente o ruído que o canvas existe para evitar. Como faixa de miniaturas dentro do bloco, o que ele está olhando fica onde ele está.

O fio continua existindo para o caso em que ele significa alguma coisa: **Resultado → bloco de geração**, que é encadeamento de verdade (a saída de um é a entrada do outro), e não mera posse.

---

### 09/08/2026 — N2: `@` só resolve personagem congelada ✅ aprovado

Digitar `@` abre o seletor das personagens **com versão salva**; `@luna` é a versão ativa, `@luna@v2` é a específica, rascunho nunca — regra herdada do versionamento (D2). Mencionar anexa automaticamente o DNA compilado, a folha completa como referência de imagem e as restrições.

**A resolução acontece no servidor, e isso não é detalhe de implementação.** O navegador manda a frase que o usuário escreveu; qual retrato congelado aquela frase nomeia é decisão que só o servidor toma. Um cliente que pudesse escolher a versão poderia escolher uma não congelada — e aí a reprodutibilidade, que é o produto inteiro, viraria uma promessa que depende do navegador se comportar.

**Uma personagem por geração na v1.** Consistência dupla é problema próprio; meio resolvido pareceria funcionalidade até o dia em que não parecesse. Duas menções distintas são recusadas com mensagem clara.

---

### 09/08/2026 — N3: formatos por canal ✅ aprovado

Presets nomeados por intenção — "Stories · 9:16" —, mapeados às proporções que a API realmente aceita, **com o número real sempre visível**. Alvo sem suporte exato cai na proporção suportada mais próxima, comparada por forma e não por texto (comparar "4:5" com "5:4" como string acharia um vizinho a um quarto de volta de distância).

Conferido na documentação oficial no dia da implementação: **os seis presets mapeiam exato no Nano Banana Pro**, inclusive o 4:5 que a especificação previa que talvez precisasse de aproximação. O mecanismo de aproximação nasceu construído e sem uso — que é a ordem certa: ele é a garantia para o primeiro modelo que chegar com lista menor.

Os presets vivem em `config/format-presets.json` — a Decisão 6 da arquitetura finalmente materializada, no momento em que teve o primeiro consumidor.

---

### 09/08/2026 — N4: produto anexado direto ✅ aprovado

O modelo vê a foto real do produto; nada de descrever o produto em texto na v1. Fidelidade máxima pelo caminho mais curto. O botão "extrair descrição do produto" fica registrado como reforço opcional futuro, para quando a consistência pedir.

---

### 09/08/2026 — N5: uma imagem por clique, síncrono ✅ aprovado

O padrão provado na geração canônica. Quantidade x3/x5, listas e lote chegam com o assíncrono, na conversa de Storyboard + Vídeos. Uma imagem 2K leva de 20 a 40 segundos e cabe no `maxDuration` de 60 — é esse número que dirá quando o assíncrono virar necessidade.

---

### 09/08/2026 — A dívida do `prompt_compiled` está quitada

Estava registrada desde a geração canônica: o texto compilado era gravado, mas o **estilo** não estava na estrutura, e não havia estrutura nenhuma para referências. A pergunta "com que estilo e com quais referências esta imagem nasceu?" só se respondia lendo um parágrafo em inglês e adivinhando.

Agora `prompt_compiled.structure` guarda, por campo: `estilo` (chave, frase, reforço e **de onde veio** — node, personagem ou padrão), `personagem` (handle, versão, id da versão congelada, id da folha), `identidade`, `ancora`, `traje_canonico`, `cena_padrao`, `cena_usuario` (**pt e en lado a lado**), `referencias` (ordem, tipo, origem, instrução pt e en, diretiva e cláusula de fidelidade), `restricoes` e `regra_diretor`.

E a quitação não é o campo existir — é **alguém ler**. O botão "Ver prompt" no node Resultado mostra tudo isso em português, a partir da linha guardada. Nada é recompilado: recompilar responderia quem a personagem é *hoje*, que é exatamente a pergunta que guardar o prompt existe para evitar.

**Junto disso, `record_generation` passou a receber a origem no canvas** — `prompt_user_pt`, `project_id` e `node_id`. As colunas existiam desde a Fase 0, desenhadas para este momento, e estavam nulas porque a única função que escreve na tabela não tinha como recebê-las. O `workflow_id` é **derivado do projeto** dentro da função, e não aceito: um projeto tem exatamente um workflow, então quem pudesse nomear os dois só poderia introduzir a chance de eles discordarem.

---

### 09/08/2026 — Registros de futuro dos nodes de geração

| Registro | Por que fica para depois |
|---|---|
| **Nodes de texto reutilizável, list, assistant e router** (o mini-modal do Magnific) | Conversa própria: são blocos de *composição*, não de geração, e mudam o desenho do canvas |
| **Categorias de biblioteca na galeria** (Stock, Style, Camera, Effects) | A v1 da galeria é o histórico do usuário com filtro e busca. Categorias curadas são catálogo, e catálogo é produto próprio |
| **`@` para objetos, cenários e roupas** | Hoje `@` é personagem. A tabela `entities` já tem `kind` para os outros; falta a ficha de cada um — um produto não se descreve com formato de rosto |
| **Multi-personagem numa geração** | Consistência dupla é problema próprio (ver N2) |
| **Extração de descrição de produto** | Reforço opcional do N4, quando a consistência pedir |
| **Quantidade > 1, listas e lote** | Chegam com o assíncrono, em Storyboard + Vídeos |
| **Edição pós-geração** (upscale, remover fundo) | Arsenal futuro |


### 09/08/2026 — Dois bugs achados rodando o roteiro da Etapa C

Nenhum dos dois aparece em lint, typecheck, build ou no harness. Os dois aparecem em quinze segundos de uso.

**1. O leitor de história tinha que ser tolerante, e eu escrevi que tinha e não fiz.** O painel "Ver prompt" abria dizendo *"Sem texto registrado"* — com novecentos caracteres de prompt na coluna. Duas causas somadas:

- o `text` e a `structure` eram validados como **um objeto só**, então uma estrutura irreconhecível derrubava o texto junto. A metade frágil não pode ficar com a metade sólida de refém;
- a estrutura era validada **estritamente**, e o campo `ancora` tinha mudado de frase para lista horas antes. Três gerações reais foram descartadas inteiras por causa de um campo — sendo que estilo, personagem, referências e cena estavam lá, legíveis.

A regra que fica: **um prompt guardado é o registro de uma geração que já aconteceu, e não pode ser reescrito — então quem lê é que se adapta ao que foi escrito.** O schema de leitura aceita as duas formas de `ancora`, tem default para todo campo que possa faltar, e nunca deixa a estrutura custar o texto.

**2. "Usar como referência" fazia tudo certo e parecia não fazer nada.** O bloco novo nascia num deslocamento fixo a partir do Resultado; quando já havia algo ali, nascia **embaixo** do que já estava. Os dados provavam que funcionou — bloco criado, aresta criada, referência anexada, tudo salvo — e a tela não mostrava nada. É o pior tipo de defeito, porque a reação natural do usuário é clicar de novo.

Agora a posição é procurada: desce até achar lugar livre. Vale para o node Resultado também, que tinha o mesmo risco com o seu escalonamento por irmãos.


## Roadmap — visões registradas

### 09/08/2026 — Editor básico de vídeo dentro do fluxo 📌 registrado

**Visão do Jorge.** Entra na conversa **Storyboard + Vídeos** (Fase 2.5), não em conversa própria: quem gera cena a cena precisa emendar, cortar e ordenar no mesmo lugar onde gerou — mandar o usuário para fora do estúdio para juntar cinco clipes quebra o fluxo que o canvas existe para manter.

Escopo a definir naquela conversa. O mínimo que a visão implica: ordenar clipes, cortar pontas, emendar, e provavelmente áudio por cima. O que **não** implica é virar editor de vídeo — a régua é a mesma do resto do produto, poder de profissional com simplicidade de leigo.

---

### 09/08/2026 — Creator TKS Labs como servidor MCP 📌 registrado

**Visão do Jorge, e é uma virada de categoria, não uma funcionalidade.** Expor as ações do sistema como **ferramentas MCP** para que agentes — Claude, Codex, o que vier — comandem a criação de personagens, gerações, roteiros e storyboards. O estúdio deixa de ser só uma tela onde uma pessoa clica e passa a ser também uma **API com intenção**, operável por quem não tem mãos.

Por que encaixa neste produto em particular: as ações já são o que teriam que ser expostas. `save_entity_version`, `record_extraction`, `record_generation` são funções com contrato, preço no catálogo e recusa nomeada; o compilador é puro; o `@` resolve no servidor. Um agente chamando essas ferramentas percorre exatamente os mesmos caminhos que a tela percorre, com as mesmas travas.

**Conversa futura, com especificação própria.** O que ela vai ter que decidir, anotado agora para não se perder:

- **Autenticação** — hoje tudo depende de `auth.uid()` e RLS. Agente não tem sessão de navegador; precisa de token com dono, e o dono precisa ser um usuário de verdade
- **Escopos** — ler catálogo, criar personagem, gerar imagem e gastar dinheiro são permissões diferentes, e um agente deveria poder ter as três primeiras sem a última
- **Limites** — e aqui o produto já tem a resposta pronta: **Sparks é o guarda-costas natural do gasto de agente.** Um agente com carteira limitada não pode fazer estrago ilimitado, e o ledger append-only já registra cada centavo com o que o produziu. A trava de gasto não precisa ser inventada; ela precisa ser apontada para o agente
- **O que não expor** — nem toda ação de tela deveria virar ferramenta; algumas existem porque um humano está olhando


## Polimento do canvas

### 09/08/2026 — Ciclo curto de polimento dos nodes de geração

Seis itens de **uso**, nenhum deles mudando contrato, schema ou regra de compilação — exceto o quinto, que é regra de prompt e por isso ganhou cobertura no harness.

**1. Recolher a personagem para o Arsenal.** Tirar o cartão do canvas nunca apagou nada — a personagem é ativo do usuário e o canvas é bancada (decisão de 08/08/2026). Mas a única forma de fazer isso era a tecla Delete, que **lê como destruição**. Agora há um "×" no cartão que diz para onde a personagem vai, e ela encolhe em vez de sumir. O "+" no Arsenal traz de volta.

**2. A origem do estilo é rótulo, não valor.** O seletor dizia `Da personagem · Fotorrealista` **dentro da opção**, pedindo a um controle só que respondesse duas perguntas — e fazendo o valor herdado parecer um estilo diferente do explícito de mesmo nome. Agora o rótulo diz `Estilo · da personagem` (ou `· neste bloco`, ou `· padrão`) e a opção diz `Fotorrealista`.

**3. Lightbox no Resultado.** Uma imagem 2K dentro de um node de 256px não pode ser julgada, e julgar é para o que ela foi gerada. Até aqui, olhar de verdade exigia baixar o arquivo e abrir fora — tirar o usuário do estúdio para fazer a única coisa que o estúdio existe para fazer. Duplo clique **e** um botão, porque duplo clique ninguém descobre sozinho.

**4. O retrato da personagem é a folha dela.** As iniciais eram marcador de posição desde a Fase 2. Quem tem folha aparece com ela, enquadrada pelo topo; quem não tem continua com iniciais — que não é placeholder de funcionalidade faltando, é a verdade: uma personagem sem folha não tem rosto para mostrar.

**5. Uma foto, uma pessoa.** Evidência acumulada do Jorge: a mesma configuração produziu **par de fotos** na piscina e **foto única** na praia. Nada no nosso prompt pedia uma imagem só — e uma folha de referência entre as entradas é convite ativo à grade, porque a folha **é** uma grade da mesma pessoa. Entra a cláusula quando há `@`, com o pronome que a própria ficha resolve, dita **antes do bloco de identidade**: que tipo de imagem é isto tem que estar decidido antes de o modelo decidir quantas pessoas cabem nela.

**6. Sair da referência tinha que ser tão óbvio quanto entrar.** Achado do Jorge no roteiro da Etapa C: não dava para cortar o fio. Duas causas, e as duas viraram correção.

   - **Remover só existia atrás do painel do editor** — era preciso abrir a miniatura para encontrar. Uma imagem que se anexa com um clique e só se remove depois de um desvio é uma imagem que fica anexada por acidente. Agora há "×" na própria miniatura.
   - **A aresta não dava feedback de seleção perceptível.** As cores já estavam certas; o que faltava era **peso**. Um traço de um pixel mudando de tom, no zoom em que se trabalha de verdade, não é feedback — selecionar um fio parecia selecionar nada, e por isso cortá-lo era indescobrível. Agora a aresta engrossa ao passar o mouse e engrossa mais quando selecionada, com cursor de clique na faixa de interação.

   E as duas metades ficaram simétricas: cortar o fio já removia a referência; remover a referência agora remove o fio. Sem isso o canvas desenharia uma conexão que não significa mais nada.


### 09/08/2026 — A maior amostra de recusas até agora, e o que ela desmente

Fechando o polimento, a validação do Jorge produziu nove gerações seguidas com a mesma personagem — a melhor amostra de filtro de conteúdo que este projeto já teve. Vale registrar porque **uma das hipóteses levantadas na hora não sobreviveu aos dados**.

| Cena | Referências anexadas | Resultado |
|---|---|---|
| piscina, entardecer | 1 | recusada |
| praia, anoitecendo | 1 | ✅ gerou |
| praia, anoitecendo **+ xícara de café** | 1 | recusada **6 vezes**, nos dois modelos |
| pijama, quarto, UGC | **2** | ✅ gerou |

**A hipótese era que referências de traje empilhadas na cadeia elevavam a recusa. Os dados dizem que não.** A contagem de referências é **constante** entre os sucessos e as recusas da praia, e a única geração com **duas** referências foi justamente uma das que passaram. O que a cadeia acumula não foi o que pesou.

O que os dados sustentam é mais simples e já era a decisão registrada: **o filtro é clima, não regra.** Duas cenas quase idênticas — piscina ao entardecer e praia ao anoitecer, ambas com uma referência — deram resultados opostos com minutos de diferença. E a vizinhança "praia + fim de tarde + traje de banho" se mostrou uma região de alta recusa para os **dois** modelos, o que reforça que trocar de modelo ajuda menos ali do que reformular.

**Três coisas confirmadas em uso real, e essas sim são nossas:**

1. **A classificação de recusa está certa.** Todas as seis linhas gravaram `the provider declined to draw this`, não mais `could not be reached` — a correção de 09/08/2026 valendo em dado de produção.
2. **A mensagem nova apareceu na tela** e disse o que fazer, em vez de mandar o usuário olhar a conexão.
3. **Recusa não cobrou, seis vezes seguidas.** `sparks_charged = 0` em todas.

**Método que fica:** quando uma hipótese sobre o filtro aparecer, ela é testável contra a própria tabela `generations` — cena, referências, modelo e resultado estão todos lá. Registrar a hipótese sem conferir seria transformar uma coincidência em regra do projeto.


### 09/08/2026 — Fechado: a recusa da praia era política do provedor, e só

O discriminador fechou a questão em uso real. Uma geração **através de um bloco encadeado**, com as referências vindas da cadeia, gerou normalmente e com o pijama fiel à referência — mesmo caminho de código, mesma personagem, mesmas mecânicas de referência. A cláusula de foto única também apareceu funcionando nas gerações novas.

Ou seja: **as seis recusas da praia não tinham nada de nosso.** Não eram o encadeamento, não eram as referências acumuladas, não era a cláusula nova. Era política de conteúdo do provedor, aplicada a uma vizinhança específica de cena.

Isso encerra a investigação e confirma, com a maior amostra que o projeto já teve, o que estava registrado desde a Etapa B: **o filtro é clima, não regra** — e o produto responde a ele com mensagem honesta, reformulação e troca de modelo, nunca com um erro genérico e nunca com cobrança.

---

### 09/08/2026 — Roadmap: conteúdo de moda praia e corpo vira requisito de plataforma no SaaS 📌 registrado

**Decisão do Jorge sobre onde esta questão pertence.** Hoje a recusa ocasional é um incômodo do fundador testando o próprio produto: ele reformula, troca de modelo, segue. Quando o Creator TKS Labs abrir a terceiros, isso deixa de ser incidente e vira **requisito de plataforma** — porque o público-alvo é social commerce de moda e lifestyle, e moda praia é categoria central de TikTok Shop e Shopee, não caso extremo.

Um vendedor de biquíni que recebe "recusado" três vezes não reformula: ele conclui que a ferramenta não serve para o produto dele. E terá razão, se a ferramenta não tiver nada a dizer além de "tente de novo".

Três direções, todas do Jorge, para a conversa daquele cenário:

- **Orientação na tela** — o produto sabe quais vizinhanças de cena recusam mais; deveria ajudar a escrever antes da recusa, não só explicar depois. É "a tela é o manual" aplicado a um comportamento que não é nosso mas é nosso problema
- **Escolha de provedor por tolerância de filtro** — o catálogo já é multi-fornecedor por capability, e a tolerância varia de modelo para modelo de forma mensurável. Falta a tolerância ser um **dado do catálogo**, calibrado como o preço foi, em vez de folclore
- **Retentativa assistida** — reformular funciona e está provado; hoje o usuário precisa saber disso e inventar a reformulação sozinho

**O que já está pronto para esse cenário, e não é pouco:** recusa não cobra (constraint), recusa tem classificação própria (`refused`) e mensagem própria, cada tentativa fica gravada em `generations` com cena, modelo e resultado — que é exatamente a matéria-prima para calibrar tolerância por modelo do mesmo jeito que `real_cost_cents` calibrou preço.

**Decisão fica para lá.** Construir orientação e retentativa assistida agora seria otimizar para um usuário que não existe, com base num volume que não temos — e o registro aqui existe para que, quando ele existir, ninguém precise redescobrir nem o problema nem as evidências.


## Refinamentos do canvas 2

> Ciclo curto de 10/08/2026, em cinco fatias verificadas uma a uma pelo Jorge no navegador antes de cada commit.

### 10/08/2026 — Controles criativos no node: a Camada 2 pedindo passagem

A regra 4 da seção 6 do character sheet existe desde o primeiro dia — *"Camada 2 obedece à hierarquia: input do node > default do sheet"* — e até hoje **nenhum node a exercia com um valor**. O estilo era a única sobrescrita real; todo o resto da Camada 2 só sabia ser suprimido, quando o usuário escrevia uma cena. Ou seja: a hierarquia estava escrita, implementada pela metade e invisível.

Agora o bloco Gerar Imagem tem **"Ajustes de cena · opcional"**, recolhido, com três seletores: **ângulo de câmera**, **iluminação** e **expressão**. Todos em **Auto** por padrão, e Auto significa literalmente o comportamento de antes — mesma compilação, mesmo texto, byte a byte.

**O que foi decidido, e por quê:**

- **Ângulo é lista nova (§5.27); iluminação e expressão são as listas do próprio sheet, reusadas.** Onde já havia vocabulário fechado, não se inventa vocabulário paralelo — duas listas de iluminação seriam duas verdades sobre a mesma coisa.
- **A lista de ângulo não é campo da ficha.** Uma personagem não tem ângulo canônico; um plano tem. Ela mora no dicionário pelas mesmas razões de todas as outras (frase fixa, chave imutável, cópia literal), e está documentada na §5 porque é lá que se procura lista fechada.
- **Ângulo derruba pose *e* enquadramento.** Os três são o mesmo eixo — onde a câmera está e quanto do corpo ela vê. A pose padrão carrega `standing, facing the camera`; sem essa regra, pedir "perfil" mandaria ao modelo duas ordens contrárias na mesma frase.
- **Ajuste não torna a cena dirigida.** Quem decide isso continua sendo o texto do prompt, e só ele. Prompt vazio + `@` + ângulo escolhido ainda é "padrões da personagem" — com um campo trocado, não com a regra invertida.
- **Chave desconhecida vira Auto inteiro.** Meio-aplicar seria a única saída de fato errada: silenciaria o padrão do sheet sem pôr nada no lugar.
- **"Auto" é palavra seca, e isso é diferente do seletor de estilo.** O estilo mostra o valor herdado porque estilo **sempre** entra (regra 11). Iluminação e expressão herdadas só entram em modo padrões — um rótulo dizendo "Auto (Golden hour)" mentiria toda vez que houvesse texto no prompt.
- **A regra 11 não foi tocada.** Estilo segue com seletor próprio e nunca fica ausente.

Tudo gravado por campo em `prompt_compiled.structure.ajustes_cena` e legível em português no "Ver prompt" — porque campo que ninguém lê é campo em que ninguém confia. Nove verificações novas no harness, incluindo a que mais importa: **tudo em Auto produz exatamente o texto de antes.**

---

### 10/08/2026 — Guias de alinhamento: grid é regra, guia é ajuda

Arrastar um bloco para perto de outro agora mostra linhas violetas nas bordas e centros que se alinham, com um ímã suave. É o padrão *helper-lines* do React Flow, adaptado à casa.

**Guia em vez de grid, deliberadamente.** Um grid decide por você onde tudo pode ficar; uma guia aparece quando você já estava quase acertando e some quando você não quer. A diferença aparece no canvas que já existe: os blocos têm alturas diferentes e crescem com o conteúdo, então uma grade fixa brigaria com o layout o tempo todo.

**Duas decisões de implementação que valem registro:**

- **O alcance do ímã é constante em pixels de tela, não em coordenadas do fluxo.** Um limiar fixo em unidades do canvas seria uma agulha impossível de acertar no zoom mínimo e uma armadilha da qual não se escapa no máximo. Dividir pelo zoom mantém a sensação idêntica em qualquer lugar — e foi conferido nos dois extremos.
- **O estado das guias não entra no store do canvas.** Guia é estado de vista de um arraste em curso, não parte do documento salvo. Fica no componente, onde também mora o zoom — e onde não há risco nenhum de tocar no gatilho de "não salvo". *(O arraste já marcava o projeto como sujo a cada quadro antes disso; nada mudou na persistência.)*

Node sem medida ainda não gera guia: melhor nenhuma linha do que uma linha desenhada a partir de um centro chutado. Multi-seleção também não — não há "um" bloco para alinhar.

---

### 10/08/2026 — Referência de estilo visual: a primeira sobre o *como*

Os cinco tipos de referência existentes respondiam à pergunta "**o quê**": este produto, esta roupa, este cenário, esta pose. O tipo novo responde "**como**" — pegue o clima desta imagem, não o conteúdo dela.

A cláusula fixa nomeia o que casar e proíbe o que copiar: *"Match the visual style, mood, color grading and lighting of reference image N — do not copy its subject or content"*. **A proibição é a metade que faz a coisa funcionar:** "use o estilo" sem ela degenera em "copie a imagem", que é exatamente o vício que as cláusulas de fidelidade de 09/08 nasceram para conter, agora aplicado ao caso inverso.

Validado com geração real: praia ao pôr do sol transferiu clima, grading e luz com pose e traje diferentes dos da referência — que é precisamente o comportamento pedido.

A expectativa honesta é a mesma das outras cláusulas, e continua escrita no código: **eleva a taxa de acerto, não garante.** Nenhum prompt torna um modelo de imagem determinístico.

---

### 10/08/2026 — Qualidade segue 2K fixo, e a razão mudou de dono

Estava registrado que 2K é fixo porque *"no modelo padrão, 1K e 2K custam o mesmo"*. Isso era verdade do Nano Banana Pro. Com a troca do padrão (abaixo), **deixou de ser**: no Nano Banana 2, 1K custa US$ 0,067 e 2K custa US$ 0,101.

A conclusão sobrevive, mas por outro caminho, e o caminho importa: **o preço que o usuário paga é por imagem, não por tamanho.** Gerar em 1K entregaria menos pelos mesmos 75 ⚡. A margem em 2K continua na régua da casa (≈56 centavos de custo real para 75 cobrados — os mesmos ~1,35× do Pro).

**Um seletor de qualidade só faz sentido no dia em que o tamanho mexer no preço em Sparks.** Enquanto não mexer, ele seria um controle que só sabe piorar. Fica registrado assim para ninguém reabrir a discussão com o argumento antigo, que agora está errado por um motivo que não é óbvio.

---

### 10/08/2026 — Modelo padrão passa a ser o Nano Banana 2

**Decisão do Jorge, e uma correção de fonte de evidência.** A decisão G2 escolheu o Nano Banana Pro a partir da **inspeção de um fluxo profissional alheio** — a melhor evidência disponível naquele dia, porque este produto ainda não tinha gerado uma única imagem. Depois de dezenas de gerações próprias, a evidência passou a ser nossa:

| Modelo | Preço | Custo real (2K) | Fidelidade na nossa amostra |
|---|---|---|---|
| Nano Banana Pro | 100 ⚡ | ~74c | referência |
| **Nano Banana 2** | **75 ⚡** | ~56c | igual ou melhor |

Um quarto mais barato por clique, com o Pro a **um clique de distância** no mesmo seletor para a geração que pedir. Nada foi aposentado: mudou qual vem pré-selecionado, não quais existem.

**Por migration, não pelo painel.** `is_default` é catálogo, e catálogo é o único lugar autorizado a decidir o que uma geração custa (invariante 11). Um padrão trocado à mão no dashboard seria uma decisão de produto morando em lugar nenhum — e um reset do banco restauraria o seed antigo em silêncio, com o preço voltando a subir sem ninguém perceber. As duas linhas mudam num comando só, para não existir instante com dois padrões nem com nenhum.

---

### 10/08/2026 — Uma recusa em "@luna sorrindo" 📌 dado, não tarefa

Durante a validação deste ciclo, o prompt mais inofensivo possível — **`@luna sorrindo`** — foi recusado por política do provedor. A retentativa, sem mudar nada, passou.

Não há nada a consertar, e é justamente por isso que fica registrado: é a **confirmação mais limpa** que este projeto já teve da doutrina de 09/08, *o filtro é clima, não regra*. Até aqui as recusas tinham vizinhança plausível (praia, fim de tarde, traje de banho) e sempre sobrava a dúvida de estarmos na fronteira de alguma política. Uma personagem sorrindo não tem fronteira nenhuma — o que restou foi o ruído do classificador, visível a olho nu.

**Consequências práticas, todas já construídas:** a recusa não cobrou, foi classificada como `refused` e a mensagem na tela disse o que fazer. **A monitorar:** se recorrer em prompts benignos, deixa de ser ruído e vira dado sobre o modelo — e o lugar de conferir é a própria tabela `generations`, que guarda cena, modelo e resultado de cada tentativa. Nenhuma ação agora: uma ocorrência é uma ocorrência.


---

### 10/08/2026 — Cabeçalho padronizado: as duas ações que a mão procura

Cada card do canvas tinha inventado a própria borda de cima. A personagem tinha um `✕` flutuante que significava "guardar"; o Gerar Imagem tinha título e custo e **nenhuma ação**; o Resultado tinha uma legenda. Três gramáticas para a mesma coisa, e nenhuma delas oferecia duplicar.

Agora todos usam o mesmo cabeçalho: **ícone do tipo + nome + Duplicar + Remover**. Três decisões dentro dele valem registro:

- **Duplicar copia a pergunta, nunca a resposta.** Num gerador vêm prompt, modelo, formato, ajustes de cena e referências — e **não** vêm os Resultados nem os ids que apontam para eles. Um clone que herdasse `lastGenerationId` teria um "Ver prompt" que abre uma geração que ele nunca rodou.
- **As arestas de *entrada* vêm junto.** Se uma referência chegou por fio, o clone precisa do fio; senão ficaria com uma referência sem conexão — exatamente a assimetria que `attachReference`/`detachReference` existem para impedir.
- **Remover só pergunta quando há perda de verdade.** Gerador com prompt escrito, referência anexada ou ajuste escolhido: confirma. Personagem, Produto e Resultado: sai no primeiro clique, porque nada se perde (a personagem volta pelo Arsenal, a imagem continua na galeria). **Perguntar sobre o que não se perde ensina a clicar "Sim" sem ler** — e aí a confirmação que importa também é clicada sem ler.

No Resultado, Duplicar fica **desabilitado com o motivo no título** em vez de escondido: o ponto da mudança é o cabeçalho ser o mesmo em todo lugar, e a frase ("a imagem já está na galeria") ensina mais do que um botão ausente.

---

### 10/08/2026 — Produtos como cidadãos do Arsenal

**Síntese entre a ideia do Jorge de um "input de produto" e a decisão N1.** A N1 já tinha recusado o node de referência solto: o que um bloco está olhando pertence ao bloco. Mas o produto — a peça em volta da qual a campanha inteira gira — continuava sendo imagem solta: subia pela galeria uma foto por vez, com o chip "produto" escolhido de novo a cada geração. Um produto com frente, verso e etiqueta era três decisões repetidas toda vez.

A síntese: **o produto não vira node de input, vira entidade.** Nome, até 5 fotos e uma instrução padrão, criado uma vez no Arsenal ao lado das personagens, posto no canvas como card. O fio para um Gerar Imagem não cria um node de referência — ele **traduz o produto em referências integradas**, que é o que a N1 sempre disse que referências deveriam ser.

Três consequências que só aparecem quando se olha de perto:

- **A unidade é o produto, não a foto.** Uma instrução, um tipo (fixo em "produto"), um `✕`. Cortar o fio leva as três fotos; tirar uma tira o grupo. Deixar o tipo aberto por foto permitiria que uma foto do biquíni fosse marcada "cenário" enquanto as outras duas seguiam "produto" — e o prompt compilado descreveria duas coisas diferentes.
- **A contagem é honesta, e é dita antes.** Três fotos ocupam três das seis vagas; com a folha do `@`, a faixa diz "4 de 6". E um produto que não cabe inteiro tem a **conexão recusada**, com a frase no bloco, antes do clique em Gerar. Meio produto é uma frente sem etiqueta: o usuário descobriria na imagem, depois de pagar.
- **A recusa não entra no grafo.** Ela vive numa fatia efêmera do store, fora de `nodes` e `edges`. Se morasse nos dados do node, marcaria o projeto como sujo e seria **salva no workflow** — e o usuário abriria o projeto amanhã com o aviso de ontem.

---

### 10/08/2026 — Reusar `entities` em vez de criar `products`

A pergunta era criar `products` + `product_images`, ou usar o que já existe. **Usar o que já existe**, e a folga não é pequena:

| Critério | Reuso (`entities` + `entity_images`) | Tabelas novas |
|---|---|---|
| RLS default-deny do padrão da casa | já existe e já foi verificado | duas tabelas × quatro políticas para escrever e revisar |
| Fotos são assets normais (galeria) | `entity_images` → `assets`, como as canônicas | idem, com uma segunda tabela de vínculo fazendo o mesmo trabalho |
| Painel admin futuro | uma tabela, filtro por `kind` | dois lugares para olhar |
| `@produto` no futuro | `handle` já existe e já é único por usuário | nasceria num namespace separado — o que **não** queremos |
| Versão de produto no futuro | `entity_versions` já é chaveada por `entity_id` | reconstruir |

O enum `entity_kind` **já tinha `'product'` desde a Fase 0**: a fundação foi construída prevendo exatamente isto.

**O custo, dito na cara:** o produto divide o namespace de handles com as personagens, então um produto "Biquíni" e uma `@biquini` colidem (a criação resolve com sufixo numérico). Isso é **correto, não um efeito colateral** — no dia em que `@produto` existir, o namespace tem que ser um só de qualquer jeito, e fundir dois namespaces depois de dois mil produtos é uma migração que ninguém quer escrever.

Uma coisa só pediu migration: **o teto de 5 fotos, por trigger.** Não é preferência de tela — é o número que a faixa de referências diz em voz alta. Um produto que crescesse em silêncio para oito fotos transformaria "4 de 6" numa recusa da API depois de o dinheiro estar em risco. Mesma doutrina das travas do ledger: regra que precisa ser lembrada é regra que uma hora será esquecida.

---

### 10/08/2026 — Três fotos, um produto (e a cláusula que faz a fidelidade funcionar)

O achado que mudou a implementação. As cláusulas de fidelidade de 09/08 dizem, por imagem: *"Reproduce the exact product shown in reference image N"*. Emitir isso três vezes, uma por foto, **diz ao modelo que existem três produtos** — e ele coloca três na cena, ou funde os três num quarto que não existe.

A correção não é remover a fidelidade; é **unificar antes de insistir**:

> *Reference images 2, 3 and 4 are the same single object photographed from different angles — show it once, not several times.*
> *Use the product shown in reference images 2, 3 and 4, `<instrução>`.*
> *Reproduce the exact product shown in reference images 2, 3 and 4 — …*

**A ordem é a decisão.** "São o mesmo objeto" precisa estar resolvido antes de "reproduza exatamente", senão a segunda frase reforça o erro da primeira leitura.

Três notas de implementação com consequência:

- **O `{n}` deixou de ser um número e passou a ser a frase.** As cláusulas diziam `"reference image {n}"`; agora dizem `"reference {n}"`, e o substituto é `"image 2"` ou `"images 2, 3 and 4"`. Para uma imagem só, a saída é **byte a byte** a de antes — verificado no harness, que é a única forma de trocar a mecânica de todas as diretivas sem mudar nenhuma geração existente.
- **O harness achou um bug na primeira execução.** A cláusula de *estilo visual* estava partida em dois literais (`"…of reference " + "image {n} — …"`), escapou da reescrita e saía como `"reference image image 1"`. Nenhum typecheck pega isso. **É o argumento inteiro a favor de verificações que comparam texto literal em vez de estrutura.**
- **A estrutura gravada continua com uma diretiva por imagem.** O grupo fala uma vez, mas a auditoria ainda responde "o que era a imagem 3?" — que a frase do grupo sozinha não responderia. As fotos que não falam guardam `diretiva_en` vazia e o `grupo` com todas as posições.

E o nome do produto é resolvido **no servidor**, pelo id. Registro de auditoria que acredita no rótulo que o navegador mandou não é registro de auditoria — a mesma doutrina que faz o `@` ser resolvido lá e não aqui.

---

### 10/08/2026 — Decididos contra, com motivo 📌 registro

Três coisas que apareceram na conversa deste ciclo e **não** foram construídas. Registradas porque "não construímos" sem motivo vira "esquecemos" em dois meses:

- **Toggle "Ativar inputs" no bloco de geração.** O estado da faixa de referências já comunica: se há miniaturas, há entrada; se não há, o "+" está ali dizendo como criar uma. Um interruptor seria mais um estado para o usuário manter na cabeça, sem nada novo em troca.
- **Node Resultado pré-vinculado no nascimento do gerador.** Caixa vazia esperando é ruído no canvas — e ruído que ocupa espaço permanente. O Resultado nasce no primeiro Gerar, que é quando ele tem algo a mostrar.
- **Input de pose/ângulo como node separado.** A lista de **ângulo de câmera** dos Ajustes de cena (§5.27) e o chip **pose** nas referências já cobrem os dois caminhos que existem: o vocabulário fechado e a imagem de exemplo. Um terceiro seria uma terceira forma de dizer a mesma coisa, com uma terceira chance de contradizer as outras duas.

**Adiado com data:** quantidade **x2–x4** por geração chega junto com o motor assíncrono da frente de vídeo. A **N5 fica mantida** pela razão de sempre — quatro imagens síncronas seriam quatro esperas em sequência dentro de um request HTTP, que é exatamente o que a invariante 1 proíbe.

---

### 10/08/2026 — Roteiro do Canvas 3: 6/6 no navegador 📌 validação manual

**Validado manualmente pelo Jorge**, com a migration `20260810160000_product_images_limit.sql` já aplicada. Os seis passos do roteiro, e o que cada um provou:

| # | Passo | Veredito |
|---|---|---|
| 1 | Cabeçalho nos quatro tipos de node | ok |
| 2 | Duplicar gerador — config e referências vêm, Resultados não | ok |
| 3 | Remover com confirmação onde há perda | ok |
| 4 | Produto criado com 3 fotos | ok |
| 5 | Fio anexando como unidade, faixa dizendo **"4 de 6"**; teto recusando com a frase no bloco | ok |
| 6 | Geração real com o produto conectado — fidelidade na imagem, cláusula única no "Ver prompt" | ok |

**O que o passo 6 prova e o harness não podia provar.** As 96 verificações fora do Next são sobre uma função pura: garantem que o texto compilado sai com **uma** cláusula de fidelidade nomeando todas as posições, e que um produto de uma foto produz byte a byte o texto de antes. Nada disso diz o que o modelo faz com esse texto. Um pijama que voltou fiel, com o "Ver prompt" mostrando o grupo como um bloco só, é a outra metade — e é a metade que só uma geração paga responde.

**A expectativa honesta continua a mesma, e continua escrita no código.** As cláusulas de fidelidade elevam a taxa de acerto; não garantem. Nenhum prompt torna um modelo de imagem determinístico, e a cláusula de unificação não é exceção — ela reduz a chance de três fotos virarem três produtos, não a zera. **Uma geração fiel é uma geração fiel**, pela mesma disciplina do registro da recusa em "@luna sorrindo": o que vira dado sobre o modelo é a repetição, não a primeira ocorrência.

**O que fica em observação para os próximos ciclos de uso real**, sem ação agora: se um produto de 4 ou 5 fotos se comporta como um de 3 (mais fotos é mais chance de o modelo tratar alguma como cena separada); e se a instrução padrão editada por geração — o caso que a faixa permite e o roteiro não exercitou — sobrevive à tradução com o mesmo acerto da instrução salva no produto.

Com isto o **Canvas 3 fecha**: cabeçalho padronizado, Produtos como cidadãos do Arsenal, o fio como unidade e o teto dito antes do clique.

---

### 10/08/2026 — Canvas 4 · a anatomia do gerador, reordenada 🔁 reversão de layout

**O bloco Gerar Imagem passa a ter ordem normativa**, escrita em [`nodes-geracao.md §3`](./nodes-geracao.md): cabeçalho → configuração → chave de inputs → prompt principal → botão → **custo e saldo** → imagem gerada. A referência é o padrão do sistema Studio Oikos do Jorge.

**O que estava errado não era feio, era invertido.** A ordem antiga abria o card com a moldura vazia onde a imagem *ia* aparecer — a **resposta** era a primeira coisa do bloco e a pergunta vinha por baixo dela. E o preço morava no canto do cabeçalho, a três centímetros do botão que o gasta. Um número no canto de um card é um rótulo; o mesmo número embaixo do botão é um **preço**. Por isso ele desceu, e por isso mudou de tempo verbal: "Custa 75 ⚡" virou **"Custará 75 ⚡ · Saldo: X ⚡"**.

**O saldo passou a ser conhecido antes do primeiro clique.** Enquanto o custo era rótulo, dava para o saldo só aparecer depois da primeira geração. Embaixo do botão isso vira a meia-promessa que este projeto vive recusando: o motivo inteiro de pôr o número antes do clique é ele **estar lá** antes do clique. O valor é semeado pela página, que é quem lê a carteira, e atualizado pelo número que a própria cobrança devolve — o que o ledger acabou de projetar, não uma segunda opinião sobre isso.

Também mudou de lugar o aviso do teto de referências: ele agora aparece **ao lado da faixa que recusou o fio**, não no pé do card.

**Duas colunas, e não uma** *(ajuste da validação visual, mesmo dia).* Empilhar tudo verticalmente deixou o card **mais alto que a tela**: para ler os controles era preciso rolar, e para ver o card inteiro era preciso afastar o zoom até não dar mais para lê-los. Rolagem e zoom brigando é o oposto do que um canvas serve para ser. Então a pergunta ficou à esquerda — configuração → referências → prompt → botão → custo — e a **resposta à direita**, num painel próprio. Um bloco tem que caber num olhar; senão, é um formulário com fio.

**A moldura do resultado tem tamanho fixo e é quadrada.** Ela não acompanha a proporção escolhida, de propósito: uma moldura que muda de forma faz o node inteiro crescer e encolher quando alguém troca de Stories para Feed, e os controles da esquerda pulam debaixo do ponteiro por um motivo que não tem nada a ver com eles. O quadrado custa um pouco de espaço vazio ao lado de um 9:16; a moldura elástica custa a estabilidade do layout, que vale mais. A imagem se ajusta dentro com `contain`, então nada é cortado.

**E o painel já nasceu com quatro lugares.** O stepper de quantidade chega na etapa seguinte, e um painel que só soubesse desenhar uma imagem teria que ser redesenhado para aprender as outras: uma preenche o quadrado, duas o partem ao meio, três ou quatro caem na grade 2×2 — **com o quadrado externo igual nos quatro casos**, para que o node nunca mude de altura por causa de quantas imagens foram pedidas. Cada célula carrega o seu próprio estado, porque cada imagem vai ser a sua própria requisição, a sua própria cobrança e o seu próprio jeito de falhar.

### 10/08/2026 — A lixeira, no lugar do ✕

O botão de excluir de todos os nodes passa a usar um ícone de **lixeira**. O ✕ é o glifo que todo overlay deste produto usa para **fechar** — o seletor de referências, o lightbox, o editor de ficha —, então usá-lo aqui fazia "remover do canvas" parecer "dispensar esta janela". Duas ações opostas com o mesmo desenho, a poucos pixels de distância. A confirmação continua exatamente como está.

### 10/08/2026 — A lixeirinha pergunta sempre 🔁 reversão

**Todo node confirma antes de excluir.** A regra anterior era mais esperta: perguntar só quando havia perda real (um prompt escrito, referências anexadas), porque uma pergunta inútil treina a pessoa a clicar "sim" sem ler.

**O que a teoria não viu é que quem clica não enxerga a classificação.** Um node de input cujas fotos levaram dez minutos para escolher é visualmente idêntico a um que levou zero. Um canvas de oito blocos onde dois perguntam e seis não é um canvas em que ninguém sabe o que o ✕ vai fazer. **Uma regra só, dita uma vez, ganha de uma regra mais esperta que ninguém consegue prever.** O `confirmRemove` saiu do `NodeHeader` — não é mais configurável, para não voltar por descuido.

### 10/08/2026 — Estilo "Ultra realista" na lista fechada

Nova opção em `ESTILO_RENDERIZACAO` (§5.26 do [character sheet](./character-sheet.md)), logo depois de `fotorrealista`. Ela puxa acima dele em fidelidade de pele, textura e luz: poro visível, penugem, *subsurface scattering*, assimetria e micro-imperfeições, catchlight nos olhos, queda de luz fisicamente correta, 85mm em f/2.

**O reforço é próprio, e é aí que está o raciocínio.** O jeito de "hiper-realista" falhar não é sair desenhado — é sair de cera. Modelos respondem "pele extremamente detalhada" com aerógrafo com frequência suficiente para a proibição precisar dizer o nome: *"not digitally smoothed or airbrushed skin"*.

**A palavra "ultra-realistic" já aparecia na frase do `fotorrealista`, e ela fica lá.** Editar uma frase do dicionário mudaria o que **toda versão congelada já salva** compila hoje. Acrescentar uma entrada é seguro; editar uma existente é uma decisão de outra natureza, e não é esta. Verruga registrada em vez de consertada.

### 10/08/2026 — Canvas 4 · Etapa D: histórico à mão 📌 aprovada em conceito, a executar depois de B e C

Duas peças aprovadas hoje e **deliberadamente adiadas**, com a data e o motivo escritos para não virarem lembrança de conversa:

- **Faixa "Recentes" no painel de resultado.** Três ou quatro miniaturas das últimas gerações **deste gerador**, sob a moldura principal. Clique promove a miniatura à moldura; um botão **"Ver todas"** abre o resto. Hoje, a única memória visível de um bloco é a última imagem que ele fez — tentar de novo apaga da tela o que veio antes, e comparar duas tentativas exige caçar os nodes Resultado espalhados pelo canvas.
- **Entrada "Galeria" no sidebar**, reaproveitando o modal do seletor de referências em **modo navegação**: sem seleção, sem confirmar, com as ações que fazem sentido quando ninguém está escolhendo nada — baixar e ver o prompt. O modal já sabe listar, filtrar, buscar e paginar as imagens do usuário; o que falta é um modo em que ele não esteja a serviço de outra decisão.

**Por que esperar em vez de fazer agora.** A Etapa B redesenha a ocupação do painel de resultado — a grade 2×2 da quantidade. Desenhar a faixa de recentes contra o estado provisório significaria desenhá-la duas vezes, e a segunda com a primeira ainda no caminho. **Desenha-se contra o estado final, não contra o provisório** — é a mesma razão pela qual o painel já nasceu com quatro lugares em vez de um.
