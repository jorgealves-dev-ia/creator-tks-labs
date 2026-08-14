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

### 10/08/2026 — Qualidade 1K/2K/4K, com preço vindo do catálogo

O node Gerar Imagem ganha um seletor de **Qualidade**. Até aqui a resolução era uma constante — `CANVAS_IMAGE_SIZE = "2K"` — com um comentário explicando que pedir menos seria pagar o mesmo por menos.

**O comentário estava certo e ficou errado.** Ele foi escrito quando o modelo padrão era o Nano Banana Pro, onde 1K e 2K custam os mesmos $0,134 de verdade. O padrão virou o Nano Banana 2 em 10/08, e lá 1K custa **um terço menos** que 2K. A frase continuou no arquivo dizendo uma coisa que tinha deixado de ser verdade — que é o modo mais silencioso de um comentário mentir.

**Da documentação oficial do Google, lida hoje:**

| | 0.5K | 1K | 2K | 4K |
|---|---|---|---|---|
| Nano Banana Pro | — | $0,134 | $0,134 | $0,24 |
| Nano Banana 2 | $0,045 | $0,067 | $0,101 | $0,151 |

Em Sparks, pela regra da casa (USD × 550 × 1,35, arredondado a 5): Pro **100 / 100 / 180**, Flash **50 / 75 / 110**. Os dois preços de 2K são exatamente os que já estavam em `image_sparks` — ninguém paga diferente amanhã pela mesma imagem que pediu ontem. O 0.5K existe na API e **não** é oferecido: meio milhar de pixels é miniatura, e oferecer seria pôr diante de todo mundo uma escolha que quase ninguém deveria fazer.

**Tabela nova, não colunas.** `ai_model_image_prices (model_id, image_size, sparks)`. `image_sparks_1k`/`image_sparks_4k` resolveria hoje e precisaria de migration no dia em que um modelo publicasse um tamanho que os outros não têm. E a tabela ganha um segundo papel, que é o mais importante: **é ela quem diz quais resoluções um modelo oferece.** Não existe oferecer um tamanho que não se sabe cobrar.

**Duas listas, dois trabalhos.** `IMAGE_SIZES` no código decide o que o seletor **mostra**; o catálogo decide o que é **selecionável**. Sem a lista de tudo, um modelo sem 4K só poderia omitir a opção — e uma opção ausente não ensina nada a ninguém. Presente, cinza e dizendo "indisponível neste modelo" é a tela sendo o manual.

**O preço nunca vem de quem chama, e isso não mudou.** `record_generation` ganhou `p_image_size`, que nomeia um *tamanho* — exatamente como `p_model_id` nomeia um modelo. Quanto custa continua sendo resposta do catálogo. Um tamanho sem linha de preço é recusado com **GN005**, nunca cobrado pelo preço-base: cair no preço-base seria entregar 4K cobrando 2K, que é precisamente o buraco que a tabela fecha.

**E a checagem acontece duas vezes, de propósito.** O servidor confere o tamanho contra o catálogo **antes** de chamar o provedor, porque a recusa do banco chega depois de a imagem existir — ou seja, depois de o Google ter sido pago por ela. O `GN005` continua lá como rede: o banco é a autoridade sobre preço, e uma autoridade cuja recusa não tem nome deste lado vira "erro inesperado" na tela. A ordem que não erra a favor de ninguém é descobrir antes.

**Um preço que sobrou, achado clicando** *(mesmo dia, na validação).* O seletor de modelo continuava mostrando o preço-base: com 4K escolhido, o campo dizia "Nano Banana 2 · 75 ⚡" e a linha do botão dizia "110 ⚡". Ninguém lê isso como um número desatualizado — lê como **dois números**, e a soma dos dois. O seletor passa a precificar cada modelo **na resolução selecionada**, campo fechado e lista aberta, e um modelo que não vende aquele tamanho mostra "indisponível" no lugar do preço. **Um seletor que exibe um número que a conta não vai bater é pior do que um seletor sem número nenhum.** O modelo continua selecionável nesse caso — escolhê-lo é justamente como se sai da combinação, e a recusa mora embaixo do botão, que é onde o dinheiro seria gasto.

### 10/08/2026 — Quantidade 1–4 🔁 revisão parcial da N5, e a geração vira rota

**A N5 dizia uma imagem por clique, síncrona, com quantidade adiada para quando o motor assíncrono chegasse.** A parte adiada chega antes — e chega sem violar nada, o que é o ponto.

**Quatro imagens são quatro requisições, não uma requisição de quatro.** Cada uma tem a sua linha em `generations`, o seu débito no ledger, o seu progresso e o seu jeito de falhar. Nenhuma delas segura mais de uma geração dentro de um request HTTP — que era a razão inteira da regra. É tecnicamente idêntico a apertar o botão quatro vezes, que é exatamente o que substitui. **O assíncrono continua reservado e obrigatório para vídeo**, onde uma única geração já não cabe no `maxDuration` de 60.

**Débito atômico por imagem.** Se duas saem e uma falha, cobram-se duas — o slot que falhou mostra a frase dele, e uma geração falha já era grátis por constraint. Retry é um clique novo, que é uma requisição nova.

**Um Resultado por imagem, não um Resultado com quatro.** O node Resultado tem um `assetId`, um handle de saída, um "Usar como referência" e um "Ver prompt". Um card com quatro imagens teria que escolher qual delas o handle exporta, qual o download baixa e qual o "Ver prompt" abre — quatro perguntas novas para um node que hoje responde uma. Quatro cards são quatro débitos e quatro linhas: o canvas fica isomórfico ao extrato. O ruído visual é exatamente o de quatro cliques, que é o que isto é.

---

**E a geração deixou de ser Server Action.**

Não por gosto: a documentação do Next é explícita ao dizer para **não usar `Promise.all` para paralelizar Server Actions no cliente**. Elas são despachadas pelo ciclo de renderização do React e saem em fila — quatro chamadas de trinta segundos virariam dois minutos, uma esperando a outra, para um trabalho que não tem dependência nenhuma entre si. É propriedade do despachante, não do trabalho, e a saída é parar de usar aquele despachante. `app/api/generations/canvas/route.ts` é um endpoint HTTP comum, e quatro `fetch` são quatro requisições.

**A postura de segurança não mudou, porque é a mesma.** Server Action também é endpoint público. A sessão é relida do cookie, o corpo é validado pelo mesmo schema Zod, RLS escopa toda leitura e o preço continua vindo do catálogo por `record_generation`. Sem segredo compartilhado, de propósito: é o usuário chamando o próprio estúdio com a própria sessão — os endpoints de `app/api/webhooks` é que não têm cookie de ninguém para conferir.

**Uma consequência que valeu uma linha no proxy.** Rota sob `/api/` sem sessão passa a receber **401 em JSON** em vez do redirect 307 para `/login`. Um redirect é a resposta certa para quem digitou um endereço e a errada para um `fetch`, que o segue e recebe o HTML da tela de login com status 200 — e aí `response.json()` estoura. Uma sessão que expirou numa aba aberta chegava ao canvas como "erro inesperado"; agora chega como "sua sessão expirou, recarregue a página". Nenhum endpoint nosso tinha sido chamado por XHR antes deste ciclo, então o buraco não existia até agora.

**E uma aritmética que só aparece no plural.** Cada geração responde com o saldo que **ela** viu, e quatro rodando juntas leem todas o mesmo número inicial — quatro respostas dizendo "1000 − 75 = 925" deixariam a tela em 925 depois de 300 Sparks gastos. O saldo na tela passa a **subtrair o que cada imagem cobrou** em vez de confiar na leitura de cada uma: a mesma conta que o ledger fez, na mesma ordem, chegando no mesmo número. É otimista e se autocorrige — a página recarrega ao fim do lote e o valor da carteira volta por cima.

### 10/08/2026 — Etapa B validada com gerações pagas 📌 validação manual

**Feita pelo Jorge, com dinheiro de verdade.** O que cada teste provou:

| Teste | Esperado | Resultado |
|---|---|---|
| 1 imagem em 1K | 50 ⚡, um débito | ok |
| 1 imagem em 4K | 110 ⚡, um débito | ok |
| Quantidade 2 em 1K | 2 × 50, **dois débitos separados** | ok |
| Recusa de política | sem cobrança e **sem linha no extrato** | ok |
| Margem | conferida linha a linha contra o custo real | ok |

**O número que interessa é 1,3 segundo.** É o intervalo entre os dois débitos da geração de quantidade 2. Se as requisições tivessem saído em fila — que é o que aconteceria por Server Action —, o intervalo seria o tempo inteiro de uma geração, algo entre vinte e quarenta segundos. Um segundo e três décimos é o tempo de duas coisas acontecendo juntas e terminando quase juntas. **A troca de Server Action por rota não foi teórica: é medível no extrato.**

**A recusa sem linha no extrato confirma a outra metade.** `record_generation` só insere no ledger quando `v_charged > 0`, e uma geração falha nunca cobra — por `case` na função e por constraint na tabela. Uma recusa de política agora tem prova de que é grátis, e não só a promessa de que era.

Com isto a **Etapa B fecha**: qualidade por resolução com preço do catálogo, quantidade 1–4 em paralelo de verdade, e o preço dizendo a mesma coisa em todos os lugares da tela.

### 10/08/2026 — A chave "Ativar Inputs de Referências" 🔁 reversão

**A decisão anterior foi contra esta chave**, e o argumento era bom: uma referência anexada que não está sendo usada é um estado a mais para o usuário manter na cabeça, e o jeito de não usar uma referência é não anexá-la.

**O motivo novo do Jorge desmonta isso com um caso de uso real: é mute de mesa de som.** Para ver como a personagem sai **sem** as quatro referências puxando a imagem — uma pergunta legítima e frequente —, o único caminho era desanexar as quatro, gerar, e anexar de novo. Isso perde os chips, perde as instruções escritas em cada uma e corta os fios do canvas, tudo para fazer **uma** pergunta. A chave responde em um clique e devolve tudo em outro. Ninguém desmonta a mesa para ouvir a bateria sozinha.

**O que ela faz e o que ela não faz:**

- Desligada, os inputs **permanecem conectados e visíveis** — miniaturas acinzentadas, não sumidas. Uma referência que você não vê é uma referência que você vai esquecer de religar.
- O `@` não é afetado. A folha de uma personagem mencionada é **âncora da menção**, não input de referência, e a chave não tem opinião sobre ela.
- O contador passa a dizer **o que vai viajar**: mudo com `@` mostra "1 de 6"; mudo sem menção mostra "0 de 6". Dizer zero com uma imagem a caminho seria a faixa mentindo exatamente onde ela existe para não mentir.
- O **teto**, ao contrário, continua contando tudo o que está anexado. Tem que contar: religar a chave nunca pode produzir um bloco acima do limite do modelo.
- Nada de mudo é traduzido, numerado, enviado ou pago como token de entrada. Mudo custa o que custaria sem referência nenhuma.

**E ela nasce desligada — conectar nunca a liga sozinha** *(decisão do Jorge, mesmo dia, substituindo o "acorda ligada quando há input conectado" da primeira versão).* O caso base deste bloco é gerar **sem referência nenhuma**: "uma imagem de um cachorro". Ligada por padrão trataria a exceção como regra, e — pior — poria imagens dentro de gerações pagas sem ninguém ter pedido. Quem quer que os inputs entrem, liga.

Isso troca um risco por outro, e a troca é deliberada: em vez de "entrou o que eu não pedi", o erro possível passa a ser "não entrou o que eu queria". O segundo é visível de graça — miniaturas cinzas, selo amarelo, contador em zero — e o primeiro só aparece na imagem, depois de paga. **Quando um dos dois erros custa dinheiro e o outro custa um clique, o default escolhe sozinho.**

Para quem acabou de conectar, um **shimmer** percorre o rótulo e a chave **três vezes e para**. Três e não infinito: uma animação que nunca termina vira mobília, e mobília é invisível. E shimmer e não vermelho porque isto não é erro — o selo amarelo ao lado já faz esse trabalho, e dois avisos para o mesmo fato viram nenhum.

*Consequência que vale dizer em voz alta:* blocos salvos antes desta chave reabrem com as referências **mudas**. Não é silencioso — as miniaturas ficam cinzas, o selo amarelo aparece e o contador zera —, e um clique devolve o comportamento antigo. Preferível a abrir ligado por adivinhação e gerar uma cobrança que ninguém pediu.

**E a auditoria trata mudo e ausente como coisas diferentes**, que é o ponto mais importante daqui. `prompt_compiled.structure` grava `referencias_mudas: { quantidade, asset_ids }` ao lado de `referencias: []`, e o "Ver prompt" lê isso de volta em uma frase. **A imagem que sai é a mesma nos dois casos; o motivo de ela ter saído assim não é** — e um registro que só diz "sem referências" não consegue explicar por que alguém anexou quatro fotos e recebeu um rosto sem nenhuma delas.

### 10/08/2026 — A prateleira de Inputs, e o primeiro tipo

**A seção "Inputs" do menu lateral oferece tipos, não coisas.** Ícone e nome, mais nada; clicar ou arrastar faz o node nascer no canvas e **toda** a configuração mora nele.

**O motivo do Jorge é sobre rotatividade.** Um estoque permanente de fotos no menu lateral obriga a **cadastrar antes de usar**: dar nome, subir fotos, escrever instrução — tudo isso *antes* de a primeira imagem existir, em troca de uma lista que continua lá depois que a campanha acabou. Produto é rotativo. O que o canvas precisa é de uma prateleira de **formas de entregar uma imagem**, e as imagens já têm onde morar: a galeria.

**Input de Imagem** é o primeiro tipo e o molde dos outros três: uma imagem, um propósito da lista fechada que a faixa já usa, uma instrução opcional. **Só saída** — um input é algo que você entrega a um bloco; nada é entregue a ele.

**Por que ele existe, se o bloco já sabe anexar imagem pelo "+".** Porque uma imagem anexada mora **dentro de um bloco**: uma foto que você quer testar contra três prompts diferentes precisava ser anexada três vezes. No canvas é um card com três fios — e, mais importante, é uma coisa que se **vê**. Uma referência enterrada numa faixa dentro de um bloco é uma decisão que você precisa lembrar; um card no canvas é uma que você pode olhar.

**O fio é vivo, e essa foi a decisão de engenharia do dia.** Editar um input atualiza todo bloco que já o recebeu. A alternativa — copiar no momento da conexão e nunca mais olhar — faria o card e a miniatura serem duas coisas diferentes, e a segunda venceria na hora de gerar. **Um canvas em que o que você vê não é o que vai acontecer não é um canvas, é um formulário com fio.** A sincronização mora no `updateNodeData` do store e não em cada card, pela razão de sempre: uma regra que cada card precisa lembrar é uma regra que um card vai esquecer.

E o grupo é substituído **na posição em que já estava**. Os números do prompt compilado são posições nessa lista — "the product shown in reference image 2" —, então uma edição que embaralhasse a ordem repontaria em silêncio toda instrução seguinte.

**E o "+" da faixa deixou de ser uma porta** *(ajuste da validação visual, mesmo dia).* Ele anexava uma imagem direto na lista do bloco — o que fazia a faixa ser **porta e espelho ao mesmo tempo**, e produzia referências que não existiam em lugar nenhum do canvas: dava para ver a miniatura e não ver a coisa. Agora o "+" **cria um Input de Imagem já conectado**, à esquerda do bloco, com o seletor aberto.

**Toda referência passa a ter node, sem exceção** — pelo fio de um input, pelo fio de um Resultado ou pelo fio de um Produto. **A faixa é espelho, nunca porta de entrada.** É o que faz o canvas ser a verdade sobre a geração em vez de um resumo dela.

O card nasce antes de ser preenchido, de propósito: o seletor pode ser cancelado, e um input vazio ao lado do bloco é um estado honesto — está conectado, ainda não tem o que dar, e no instante em que tiver o fio leva.

**Todo input carrega `groupId` = o id do próprio node**, mesmo entregando uma imagem só. Para uma imagem isso não muda nada no prompt; compra a única coisa que casar por id de asset não compra: cortar **este** fio desanexa **estas** imagens, mesmo quando a mesma foto chegou duas vezes por dois cards diferentes. E a moldura e o nome do grupo só aparecem a partir de duas imagens — elas dizem "estas várias são uma coisa só", e um grupo de um não é várias.

### 10/08/2026 — O teto vira pergunta, e a guarda de crescimento fica na origem

**A capacidade deixou de ser argumento e virou pergunta.** Quanta vaga um bloco tem depende de duas coisas que o grafo não contém — o catálogo (o teto pertence ao modelo) e o Arsenal (a folha de uma personagem mencionada ocupa uma vaga) —, então ela era **calculada na tela e passada** para o store no momento do fio. O canvas agora **registra um resolvedor** no store, e o store pergunta quando precisa.

O motivo é que o fio deixou de ser o único momento em que o teto importa: um input já conectado pode **crescer**, quando um produto vai de três fotos para cinco com o fio parado ali. Passar o número como argumento só funciona para o momento em que alguém lembrou de passar.

**E aí veio a correção de desenho.** O plano dizia que a guarda de crescimento moraria no `syncInputInto` — recusar a atualização quando o grupo novo não coubesse.

**Escrevendo, ficou claro que isso estaria errado.** Se o sync recusasse, o card no canvas mostraria cinco fotos e a faixa do bloco continuaria mostrando três. Seria exatamente o *"o card e a miniatura são duas coisas diferentes"* que a regra do fio vivo existe para eliminar — o teto consertado ao preço de quebrar o espelho. E entre um teto furado e um espelho mentiroso, o espelho é o que não dá para ter: um canvas em que o que se vê não é o que vai acontecer não é um canvas.

**Então a guarda mora na origem**, no "+" do input, desabilitado com o motivo visível quando nenhum bloco conectado tem vaga. É o padrão de toda a casa, o mesmo do teto dito antes do clique e do preço dito antes do botão: **dizer não antes, no lugar onde a ação acontece.** O `syncInputInto` continua espelho fiel, sem opinião.

`freeForInput` responde com a **menor** folga entre os blocos que o input alimenta, não a média: um card entregando cinco fotos para dois blocos precisa caber nos **dois**, e quem decide é o mais apertado.

*E o estado acima do teto continua representável por outros caminhos* — trocar o modelo para um que aceita menos, por exemplo. Isso não é buraco novo e já é dito em voz alta: o contador mostra "5 de 1" e o servidor recusa antes de gastar. O que a guarda impede é o caminho em que o próprio produto cresce; o que a honestidade cobre é o resto.

### 10/08/2026 — Input de Produto: o editor sai do diálogo e vai para o canvas

O editor de produto virou o **corpo de um node**, inteiro: mesmo nome, mesmas até cinco fotos, mesma instrução, mesmo teto. **Nada foi simplificado no caminho** — o que mudou é que ele deixou de ser um *cadastro*. Não há linha do Arsenal para criar antes de usar, nome para inventar para uma coisa que se usa uma vez, nem lista que sobrevive à campanha.

**Três consequências que valem estar escritas.**

**O teto de cinco saiu do banco.** Um produto era uma linha, e a linha tinha `enforce_product_image_limit` atrás dela. Agora é estado de node, então o teto é o campo no card mais o Zod da rota de geração — **ainda o servidor, não mais o banco**. Foi a perda declarada quando o modelo de dados foi escolhido, e é aqui que ela acontece. O número não mudou e significa o mesmo: cada foto ocupa uma vaga de referência do modelo, que é o que faz "4 de 6" ser verdade.

**A guarda de crescimento chegou na origem.** O "+" do card fica desabilitado, com o motivo visível, quando o bloco conectado não tem vaga — usando o `freeForInput`, que responde com a **menor** folga entre os blocos alimentados. Um produto entregando cinco fotos para dois blocos precisa caber nos dois.

**E o nome do grupo passou a viajar do navegador.** Um grupo era uma linha em `entities` cujo nome o servidor consultava; virou um card no canvas, e card não tem linha. Então o navegador manda o rótulo, e a regra fica explícita: **pode nomear, nunca pode alargar.** O nome é cosmético — vai para o registro e nunca para o texto que o modelo lê —, enquanto as duas coisas que precisam ser confiáveis continuam checadas no servidor: quantas vagas o grupo ocupa, contra o teto do modelo, e se as imagens são do usuário, que o RLS responde ao carregá-las do Storage. Onde ainda existe linha — um produto do Arsenal antigo — **a linha vence**: nome verificado ganha de nome fornecido, sempre.

O rótulo é gravado na própria referência em vez de consultado, e isso não o torna cópia velha: o `syncInputInto` já reescreve o grupo a cada edição do card, então renomear chega a todo bloco na mesma passada que carrega as fotos.

### 10/08/2026 — A seção Produtos sai do Arsenal

Saem do código: a seção do menu lateral, o diálogo de edição, o store, as queries, as actions, o schema e o card `product` — toda a pilha que existia para transformar um produto em **cadastro**. O que substitui é o Input de Produto do canvas, com os mesmos campos e o mesmo teto.

**A lápide.** O tipo `product` de node continua registrado, vazio: um grafo salvo ontem pode conter um, e o React Flow diante de um tipo desconhecido **não desenha nada** — o card sumiria, o fio ficaria pendurado e a única pista seria um aviso num console que ninguém tem aberto. Então o tipo fica, dizendo o que aconteceu, apontando onde mora o substituto e oferecendo a única ação que faz sentido. Ele não lê store, nem query, nem foto: a máquina por trás dele é justamente o que este commit apaga. No dia em que nenhum grafo salvo tiver um, o arquivo sai junto com a entrada em `nodeTypes`.

**Arquivar, não apagar** — e a razão aqui foi medida, não estimada. `generations.entity_id` aponta para `entities` com **ON DELETE CASCADE**: apagar um produto apagaria toda geração feita com ele. E `ledger_transactions.generation_id` é **ON DELETE SET NULL**, então o dinheiro ficaria no extrato apontando para o nada — débitos órfãos num livro append-only. Arquivar preserva tudo e só tira das listas, que já filtram por `archived_at is null` desde a Fase 0.

**O que fica de pé.** O valor `product` no enum e o trigger do teto de cinco continuam instalados. Não custam nada em repouso, remover valor de enum no Postgres é caro e irreversível, e a porta continua aberta caso produto volte a ser cidadão do Arsenal com a extração de atributos da N4.

---

**E uma aresta órfã que só ficou visível agora.** Remover um node pelo cabeçalho chamava `applyNodeChanges`, que tira o node e **deixa os fios**. Arestas apontando para o nada não são desenhadas, então isso era invisível e vinha se acumulando no grafo salvo desde sempre.

Deixou de ser invisível quando inputs viraram cards que as pessoas apagam: remover um Input de Produto enquanto as fotos dele continuavam dentro do bloco deixaria **referências que nenhum card do canvas explica** — exatamente o estado que a regra "toda referência tem node" existe para tornar impossível. Agora um card que sai leva os fios dele, e com os fios o que eles tinham anexado.

### 10/08/2026 — Excluir personagem é arquivar, e a tela diz as duas metades

A ação existe no editor de ficha, ao lado do fechar e longe do "salvar versão" — os dois controles de aparência destrutiva do cabeçalho não podem ficar ombro a ombro com o que se aperta o dia inteiro.

**Ela arquiva (`archived_at`), e isso não é preferência arquitetural: é o que as chaves estrangeiras determinam.** Medido no banco antes de escrever a linha:

| De | Para | Ao deletar |
|---|---|---|
| `generations.entity_id` | `entities` | **CASCADE** |
| `entity_versions.entity_id` | `entities` | **CASCADE** |
| `entity_images.entity_id` | `entities` | **CASCADE** |
| `ledger_transactions.generation_id` | `generations` | **SET NULL** |

Um `delete` de verdade apagaria **toda geração que ela já protagonizou**, todas as versões congeladas e todos os vínculos de imagem — e o dinheiro ficaria no extrato apontando para o nada. **Débitos órfãos num livro append-only** é a única coisa que um registro financeiro não pode conter. Sem migration: `archived_at` existe desde a Fase 0 e as listas já filtram por ele.

**A confirmação tem dois painéis em vez de um botão**, e a razão é o que ela está testando. Um "tem certeza?" testa coragem; dizer **o que se perde e o que fica** testa entendimento, que é a única coisa que vale testar antes de uma ação que a interface não desfaz.

- **A metade que se subestima é a menção.** `@luna` para de resolver em gerações novas no instante em que isso roda — `resolveCharacter` filtra `archived_at is null`. Essa frase precisa ser lida **antes** do clique, e não descoberta um mês depois, quando um prompt reusado parar de nomear alguém.
- **A metade que se superestima é a perda.** A palavra "excluir" faz qualquer pessoa supor que as imagens vão junto. Não vão: galeria, gerações, extrato e versões continuam inteiros — o arquivamento existe exatamente para que o histórico continue apontando para algo que ainda existe.

O card dela no canvas já sabia o que fazer: ele reaproveita o estado "Personagem não encontrada — tire este cartão do canvas", que existe desde o Canvas 1.

### 10/08/2026 — Input de Pose/Ângulo 🧪 EXPERIMENTO, com critério de saída

**A objeção que o barrou no ciclo passado continua de pé, e está aqui em cima da mesa:** a lista de ângulo de câmera (§5.27) e o chip `pose` já cobrem os dois jeitos de dizer onde a câmera está, e um terceiro seria uma terceira chance de contradizer os outros dois.

**A aposta que justifica tentar** é a única coisa que nenhum dos dois carrega. O chip diz "case a posição do corpo"; o seletor nomeia uma *categoria* de ponto de vista. Uma fotografia carrega o ponto de vista **exato** — altura da câmera, distância, inclinação — como fato e não como palavra. A cláusula gasta-se nisso e na proibição que a torna usável: ponto de vista **apenas**, nunca o sujeito, a roupa ou o fundo.

**O conflito foi resolvido de propósito, e não deixado para o modelo.** Input de Pose e seletor de Ângulo são o mesmo eixo, então só um fala: **a imagem vence e o seletor entra em pausa** — desabilitado, dizendo por quê, com a opção escolhida gravada em `prompt_compiled.angulo_em_pausa`. "Perfil" mais uma foto de frente não é um meio-termo que o modelo consiga fazer: ele escolhe um, em silêncio, e a interface não faz ideia de qual. Que era exatamente o que a objeção previa.

**Critério de saída — falsificável, e é para valer:**

1. **Sai se não agregar.** Comparando (a) chip `pose` numa imagem + ângulo no seletor contra (b) o Input de Pose com a mesma imagem, em gerações reais: se o ponto de vista não sair mensuravelmente mais próximo da referência em (b), o card sai e a lista de ângulo fica sozinha.
2. **Sai imediatamente se contradisser.** Se o "em pausa" incomodar na prática — alguém querendo a foto para a pose *e* o ângulo pela lista —, isso é sinal de que o card está fazendo dois trabalhos, e a resposta é tirá-lo, não somar uma terceira regra.
3. **Fica se for usado.** Uso repetido sobre imagens diferentes, sem o seletor sendo procurado de volta, é o que prova que ele responde uma pergunta que os outros dois não respondiam.

Enquanto o experimento corre, **o custo dele é uma linha por geração no registro** — `papel`, `papel_en` e `angulo_em_pausa` —, o que quer dizer que a decisão de manter ou tirar vai ser tomada com dado e não com impressão.

### 10/08/2026 — Input de Character Sheet: soma, nunca substitui

Recebe uma folha — canônica ou gerada — e acrescenta um reforço de identidade que **soma com o `@`** do prompt.

A menção já anexa a folha da versão congelada como imagem 1, com as cláusulas de âncora. Este card é para a **segunda** folha: uma gerada depois, uma de outra versão, uma que mostra um ângulo que a grade canônica não tem.

**A cláusula é escrita para ser verdade nos dois mundos** — sozinha, ela é a identidade da chamada; ao lado de uma menção, é uma entre várias referências de identidade. E a segunda frase é o truque inteiro: *"where more than one identity reference is given, they are the same person"*. Ela afirma um **fato**, não uma condição. É isso que permite a um modelo **combinar** duas folhas em vez de tirar a média de dois estranhos — que é o que ele faz quando recebe dois rostos sem ninguém dizer que são o mesmo.

O chip é fixo nos dois cards novos, como no de produto: o papel do card já responde o que a imagem é, e deixar a pergunta aberta permitiria uma folha etiquetada "cenário".

---

### 10/08/2026 — Canvas 4 fecha, e três frases do CLAUDE.md que tinham virado mentira

O ciclo entregou, em quatro etapas: a anatomia nova do gerador em duas colunas; qualidade por resolução com preço do catálogo e quantidade 1–4 em paralelo de verdade; a prateleira de Inputs com quatro tipos, a chave que silencia e a saída dos Produtos do Arsenal; e a exclusão de personagem por arquivamento.

**Ao fechar a documentação, três instruções do `CLAUDE.md` estavam desatualizadas — e uma delas era do tipo perigoso.**

- **`config/models.json` não existe, e nunca vai existir.** Três lugares mandavam escrever nele: a invariante 2 ("modelo novo = entrada em config/models.json"), a invariante 6 e a regra 3 do rodapé. O catálogo nasceu no **banco** pela decisão E1, em 08/08 — porque é o que o painel super admin vai gerenciar, e painel não edita arquivo de repositório. As três frases sobreviveram àquela decisão por dois meses de ciclos. **Uma instrução errada no arquivo que é lido em toda sessão não é documentação velha: é uma armadilha**, e essa em particular mandava criar um arquivo em vez de uma migration.
- **A invariante 1 dizia "geração é sempre assíncrona" e o produto gera imagem de forma síncrona desde a Fase 1.** A exceção estava registrada em `arquitetura.md` e na decisão N5, mas a invariante — que é a versão curta, a que se lê primeiro — afirmava o contrário sem ressalva. Agora ela carrega a exceção **e o motivo dela**: uma imagem cabe no `maxDuration` de 60, quatro imagens são quatro requisições e não quatro gerações num request, e para vídeo o assíncrono continua obrigatório.

Fica o hábito registrado: **quando um ciclo revisa uma decisão, a versão curta tem que ser revisada junto com a longa.** A versão longa é consultada por quem já desconfia; a curta é obedecida por quem não.

---

### 11/08/2026 — Doze commits do Canvas 4 ficaram um dia só no local, e a produção serviu `bebb65d` o ciclo inteiro

O ciclo Canvas 4 foi desenvolvido, documentado e fechado, e **nada disso chegou à Vercel**. Os doze commits — de `7ee9f8e` (o gerador em duas colunas) até `b2ec11a` (o fechamento da documentação) — existiam apenas no `master` local. O `origin/master` parou em `bebb65d`, do ciclo anterior, e foi isso que a produção serviu durante todo o desenvolvimento do Canvas 4.

Descoberto porque a produção não refletia o ciclo. `git status` respondeu em uma linha: *ahead of 'origin/master' by 12 commits*. Working tree limpo, zero commits atrás, fast-forward sem conflito — não havia nada de errado com o código nem com o repositório. **Faltava um comando.**

As duas migrations do ciclo (`image_price_by_resolution` e `archive_arsenal_products`) já estavam aplicadas — o banco é um só para local e produção, e o Jorge as aplicou manualmente durante o desenvolvimento. Ou seja: **o banco estava à frente do código em produção**, que é a direção mais silenciosa de ficar dessincronizado. Nenhuma tela quebrou, porque nenhuma tela nova tinha subido para quebrar.

A causa não é esquecimento pontual, é ambiguidade no ritual. A regra 8 do `CLAUDE.md` dizia "só então fazer commit e push" — uma frase que trata os dois como uma etapa só na leitura, mas que na prática permite parar no commit e considerar a etapa fechada. **Um fechamento que termina no commit parece idêntico a um que termina no push**, e é justamente essa semelhança que fez o erro durar quatro etapas.

A correção tem duas metades, e a segunda é a que importa:

- **Commit de fechamento e `git push` viram a mesma ação.** Não existe estado intermediário legítimo: ou as duas rodaram, ou o fechamento não aconteceu.
- **O resumo da etapa passa a carregar a prova.** A saída de `git log origin/master -1` vai colada no resumo, com hash e mensagem. A primeira metade depende de lembrar; a segunda **não deixa o erro passar despercebido**, porque a ausência da linha é visível e um hash antigo denuncia o push que falhou.

Fica o princípio, que vale além deste caso: **quando o sucesso e a falha de uma etapa têm a mesma aparência, o ritual precisa produzir uma evidência que só existe no sucesso.** "Está em produção" era uma suposição confortável porque nada no fechamento a contradizia. Agora é uma linha de log — ou não é nada.

---

### 11/08/2026 — Canvas 4 encerrado: os cinco blocos passaram, e os dois últimos passaram por terem sido testados

**Bloco 1 — anatomia do node: PASSOU.** Ordem correta (cabeçalho → configuração → chave de inputs → prompt → botão → custo e saldo → resultado), a chave "Input Referências" nascendo desligada, custo e saldo sob o botão, saldo semeado antes da primeira geração.

**Bloco 2 — os quatro Inputs: PASSOU.** Na tela: shimmer ao conectar, teto honesto ("4 de 6 — a folha conta uma"), "+" com guarda e fio vivo. No registro, cada um dos quatro tipos com sua diretiva gravada:

| Tipo | Onde está gravado | O que a diretiva diz |
|---|---|---|
| Imagem | `1dc18775` | `"Use reference image 2, faithfully"` — sem papel, que é o ponto: imagem crua |
| Produto | `853838e2` | duas fotos num grupo só, com `"…are the same single object photographed from different angles — show it once, not several times"` |
| Pose | `f8aaf969`, `1dc18775` | `"…for viewpoint only: do not copy its subject, clothing, background or lighting"` |
| Character Sheet | `853838e2` | `"Where more than one identity reference is given, they are the same person"`, convivendo com as duas frases de âncora da menção |

**E o conflito de eixo entre o Input de Pose e o seletor de ângulo se resolveu como a decisão previa, com o registro para provar.** Em `1dc18775`, `angulo_em_pausa` guarda `corpo_inteiro` — e `ajustes_cena` carrega **apenas** a expressão. Ou seja: o ângulo foi escolhido, a imagem venceu, o seletor entrou em pausa e a opção preterida ficou gravada em vez de virar frase no prompt. É exatamente a peça que torna o experimento usável, e ela não está mais no campo da confiança.

**Bloco 3 — paralelismo: PASSOU, medido.** `82dc45df` em `16:43:01.008322` e `853838e2` em `16:43:01.355658` — **347 ms de distância**, prova de que são requisições independentes e não um laço dentro de uma. Cada uma com seu débito, no mesmo timestamp da geração: débito e registro numa transação só, por imagem. Dois Resultados no canvas.

**Bloco 4 — auditoria: PASSOU.** Cinco débitos de 50 ⚡ no dia, 250 centavos no total. Custo real 38 contra 50 cobrados: margem **1,32×**. E a cobrança fechou **1:1 com o sucesso**, medido no banco:

| Estado da geração | Gerações | Lançamentos no ledger |
|---|---|---|
| `succeeded` | 5 | 5 |
| `failed` | 3 | **0** |

Nenhuma falha cobrou, e por isso nenhuma precisou de estorno. Num livro append-only, a cobrança que não acontece vale mais que a cobrança estornada: são duas linhas a menos para alguém interpretar daqui a seis meses.

**Bloco 5 — fidelidade: PASSOU.** Produto fiel, pose obedecida e identidade da `@luna` consistente nos dois slots paralelos. A pose obedecida é o **dado nº 1 do experimento do Input de Pose** (critério de saída nº 3, "fica se for usado"), e o "em pausa" gravado do Bloco 2 é o **dado nº 1 do critério nº 2**, o do conflito — que era o critério sem nenhuma medição até hoje.

**Pendência conhecida, e é a única:** a legibilidade do "Ver Prompt" na interface segue no passe de legibilidade da Etapa D.

Fica o registro de como este placar ficou limpo, porque a primeira versão dele não estava. Dois itens do Bloco 2 — "os quatro inputs funcionaram" e "o ângulo entrou em pausa" — foram escritos **antes** da consulta, e a consulta os derrubou: Input de Imagem em zero de quarenta gerações, `angulo_em_pausa` nulo nas quarenta. Nenhum dos dois era falso por má-fé; os dois eram plausíveis, coerentes com o que tinha sido construído, e assináveis de memória por qualquer um que tivesse feito o ciclo.

**A resposta certa a um item que não passou não é suavizar a redação, é rodar o teste que falta.** Os dois foram exercitados, e vinte minutos depois o placar era verdade — não porque alguém reescreveu o placar, mas porque o produto passou a fazer o que ele dizia. É a diferença entre um diário que descreve a realidade e um que a maquia, e ela se decide exatamente neste ponto: **quando a consulta contradiz o que se ia escrever, o que cede é o texto ou o mundo?** Aqui cedeu o mundo, que é o único jeito de encerrar um ciclo sem dívida.


## Etapa D1 — polimento pós-Canvas 4

> Ciclo curto de 11/08/2026, sem migration por decisão: só interface e compilador. As arestas encontradas na validação do Canvas 4, mais as duas funcionalidades já aprovadas em conceito (Recentes e Galeria). Fatiado em quatro fases, cada uma validada no navegador pelo Jorge antes do commit.

### 11/08/2026 — Fase 1 · o vão do trilho, o retrato certo e o número que se repetia

Três correções pequenas, e duas delas tinham diagnóstico diferente do que a observação sugeria. Fica registrado porque o padrão é o que interessa: **o sintoma apontava para um lugar e a causa estava em outro, nos dois casos.**

**O buraco no trilho recolhido não era filtro.** A hipótese natural — personagem arquivada sobrando numa segunda lista — não se sustentou: a lista tem uma fonte só (`order`, filtrada por `archived_at is null` no servidor, e `forget()` tira dela na hora). A causa era o helper `revealed()`, que esconde por **opacidade**: um título invisível continua sendo um título de altura cheia, e três deles somavam uma coluna de nada entre os retratos e os ícones de input. Como a Natany era a última da lista, o vão que sobrou depois dela ficou exatamente onde ela estava — daí a leitura de que a linha tinha ficado.

**A correção é mais que "esconder direito": o título vira faixa.** Fechado, cada seção é um fio de 1px; aberto, é o nome da seção. Mesma altura nos dois estados, então nada abaixo se move quando o trilho abre. Um vão sem ícone não lê como "texto que você ainda não vê" — lê como item faltando, que é a conclusão de quem acabou de arquivar alguém.

**O retrato lia o rascunho enquanto a âncora do `@` lia a versão.** Essa é a que valia mais do que aparentava. `sheetAnchorSlots` sempre tirou a folha de `activeVersion`; o hook do retrato tirava de `entities.sheet`. A Luna estava exatamente nesse estado no dia: `2c88aadb…` no rascunho, `3027e537…` na v3 que a menção resolve. **A tela mostrava uma folha e o modelo recebia outra.** Agora as duas leem a versão congelada — e o retrato passa a significar uma coisa checável: existe folha pronta para gerar. Inicial significa que não existe, seja por não haver versão, seja por a versão não ter folha ainda; as duas metades são honestamente "ainda não dá para chamar por `@` e ter imagem".

**E o nome do projeto contava em vez de numerar.** `createProject` nomeava por *contagem* + 1: apague a aba do meio de três e a próxima nasce "2" de novo. O banco tinha um único projeto chamado "Projeto sem título 2" — a mesma aritmética pela outra face. Agora o nome é o maior número já usado + 1, lido de **todos** os projetos, inclusive os renomeados. Número não se reaproveita: reusar o nome de um projeto apagado hoje de manhã é como duas coisas diferentes acabam com um nome só numa anotação ou numa lembrança.

### 11/08/2026 — Fase 1 revalidada: o buraco era carregamento, e o avatar era o Next.js

A validação do Jorge derrubou o item 1b com dois sintomas, e **os dois diagnósticos iniciais — o dele e o meu — estavam errados**. Fica registrado inteiro, porque o valor está no método e não no conserto.

**Sintoma 1 · "a Luna vira um slot vazio no trilho fechado, sem foto e sem inicial".** A hipótese natural era deslocamento de índice: a Natany arquivada empurrando os retratos. Não era — o mapa de retratos é por `character.id` e a Luna aparecia na posição certa, entre Aria e Soraia. **O que faltava era o conteúdo, não o lugar.** O `Portrait` trocava as iniciais pelo `<img>` no instante em que a *URL* chegava, não quando a *imagem* chegava, e um `<img alt="">` ainda baixando desenha uma caixa vazia. A folha da v3 tem 2,4 MB e era um arquivo **novo** para o navegador (a de antes vinha do rascunho e já estava em cache), então a janela de nada durou segundos. Fechado ele fotografou durante o download; aberto, um segundo depois, já tinha chegado.

**A correção é pintar as iniciais por baixo, sempre.** Três estados — sem imagem, imagem a caminho, imagem quebrada — passam a ter a mesma resposta, sem nenhuma flag para manter sincronizada. E o terceiro estado não é hipotético: as URLs são assinadas por uma hora, então um canvas aberto no almoço volta com todos os links mortos. Nesse caso o Chrome ainda desenhava o ícone de imagem rasgada por cima das iniciais, então o `<img>` que falha sai da página — guardando **qual link** falhou, não um booleano, para que um link novo seja uma tentativa nova sem precisar de efeito para limpar estado.

**Sintoma 2 · "o ícone do Input de Character Sheet virou um avatar com N".** Minha primeira hipótese foi bundle corrompido — eu tinha rodado `npm run build` com o `npm run dev` do Jorge no ar, e os dois escrevem no mesmo `.next/`. Errado também, e só dava para saber olhando: com dev limpo e build novo, o "N" continuou lá. **Era o indicador de devtools do Next.js**, um círculo fixo no canto inferior esquerdo da janela — que é exatamente onde fica o último item do trilho. A prova foi abrir o trilho: o "N" ficou parado enquanto a barra crescia de 56px para 264px, e passou a cobrir o ícone do *Input de Pose/Ângulo*. O que mudou na Fase 1 foi o ritmo vertical do trilho, então o badge passou a cobrir outro ícone.

Duas evidências mataram a leitura de "avatar" antes mesmo do teste: as iniciais de uma personagem de nome único são **duas** letras (`initialsOf("Natany")` → "NA", como JU, MA, AR, SO, TA), e o badge tinha uma só; e a Natany não está em store nenhum desde que foi arquivada. O badge foi desligado (`devIndicators: false`): uma marca que só existe no ambiente onde a tela é validada é uma marca que só pode atrapalhar a validação.

**O princípio, que vale para além destes dois:** um sintoma visual descreve *onde dói*, nunca *o que quebrou*. As duas hipóteses aqui eram plausíveis, coerentes com o que tinha acabado de mudar, e ambas custariam uma correção inútil se tivessem sido implementadas direto. O que separou uma da outra foi abrir o navegador — que é justamente o que a emenda do ritual abaixo institui.

### 11/08/2026 — Emenda ao ritual: quem valida o que não gera 🔁 mudança de método

Até aqui, todo teste de navegador era do Jorge. A emenda separa por **risco**, não por tipo de tarefa:

- **Tarefa sem geração** — zero Sparks, sem tocar em ledger, compilador ou escrita no banco: **o Claude valida no navegador**, em `localhost:3000`.
- **Evidência é obrigatória**: um screenshot por item do roteiro de teste, colado no resumo. *"Conferi e passou" sem print não vale* — é exatamente a frase que o placar do Canvas 4 já tinha pegado escrevendo cheque sem fundo.
- **O commit continua esperando o ok do Jorge**, dado sobre os prints.
- **Qualquer item que envolva geração ou dado financeiro volta para o Jorge**, como sempre.

O motivo é o custo do ciclo, medido neste mesmo dia: o item 1b voltou com dois sintomas, e nenhum dos dois era o que parecia. Um ciclo de correção às cegas — Claude conserta o que imagina, Jorge revalida, e descobre-se que o alvo era outro — gasta duas rodadas para produzir zero informação. Abrir o navegador custou cinco minutos e matou as duas hipóteses erradas de uma vez.

**A regra de evidência é o que impede a emenda de virar autoindulgência.** Delegar o teste para quem escreveu o código só funciona se o teste produzir algo que outra pessoa possa conferir sem repetir o trabalho. O print é isso: ele não prova que o Claude testou, prova que a tela está do jeito que a frase diz.

### 11/08/2026 — Item 1d: o editor abre no que a `@` resolve 🔁 reversão da §5

A tela da personagem abria no **rascunho** — "o caderno, nunca um quadro na parede". A reversão troca o padrão: abre na **versão ativa, em somente leitura**.

**A regra antiga otimizava para o ato de editar; a nova otimiza para a pergunta com que as pessoas chegam**, que é "quem ela é agora?". E "agora" tem exatamente uma resposta: a versão que o `@luna` resolve. Abrir no rascunho respondia outra coisa — quem ela *pode vir a ser* — e respondia calada, então um rascunho que ninguém lembrava de ter deixado aberto passava por ser a personagem.

Três peças, e a terceira é a que faz a reversão não incomodar:

1. **Abre na versão ativa.** Sem fetch: o snapshot ativo já viaja com a personagem desde `loadCharacters`, o que faz disto uma mudança de uma linha em vez de um estado de carregamento. Personagem sem versão abre no rascunho, como tudo abria antes.
2. **Clicar em qualquer campo leva ao rascunho, com uma linha dizendo onde você está.** Campo desabilitado não emite evento — sem uma camada por cima, o gesto honesto (ir no campo que se quer mudar) seria respondido por nada acontecer, e nada acontecendo ensina que o editor está quebrado. A camada é um `<button>` de verdade, então o caminho do teclado é o mesmo caminho.
3. **Selo quando existe rascunho não congelado**, com atalho. Este é o contrapeso: o risco inteiro de mostrar o congelado primeiro é alguém concluir que o trabalho não salvo sumiu. O selo diz que não sumiu, e leva até ele em um clique.

E "Editar" **não copia nada** — mostra o rascunho como ele já está. É por isso que é seguro dispará-lo com um clique perdido: o pior caso é a pessoa olhar o próprio trabalho não salvo, que é justamente o que o item existe para não deixar ninguém perder de vista. Quem copia é o "Carregar no rascunho", que continua sendo o único dos três botões capaz de destruir trabalho — e continua perguntando antes.

### 11/08/2026 — D2 · foto de perfil escolhível por personagem 📌 escopo registrado, exige migration

Aprovado em conceito, **fora da D1** por exigir migration. O padrão continua sendo a folha da versão ativa (a regra que a Fase 1 acabou de instalar); o que a D2 acrescenta é um **override opcional gravado na entidade**: qualquer geração daquela personagem, ou um upload.

**O avatar é da personagem, não da versão** — e é essa frase que decide onde a coluna mora. A folha muda a cada versão porque ela *é* a identidade congelada; o avatar é como a pessoa quer ver a personagem na lista, e trocar de versão não é motivo para o rosto na barra lateral mudar sozinho. Por isso a coluna vai em `entities`, nunca em `entity_versions`.

### 11/08/2026 — Emenda da emenda: evidência com endereço e nome

A regra do print, um dia depois de existir, ganhou a parte que faltava: **onde ele fica e como se chama**. Os prints da Fase 1 foram parar numa pasta de temp com timestamp no nome — serviram para a conversa daquela hora e são inencontráveis na semana seguinte.

A partir da Fase 2: `scratchpad/evidencias/<etapa>-<fase>/`, um arquivo por item do roteiro, com **nome descritivo do que ele prova** (`trilho-fechado-luna-foto.png`, não `screenshot-1786476894571-11.png`), e a lista de caminhos no resumo. Fora do repositório, como todo artefato de validação, então nunca entra em commit por acidente.

**O nome do arquivo é metade da evidência.** Um print chamado `screenshot-11` obriga quem for conferir a abrir os onze para achar o que interessa — e um print que ninguém abre é indistinguível de um print que não existe, que é exatamente o buraco que a regra do "sem print não vale" veio tapar.

### 11/08/2026 — Fase 2: um vocabulário só para a faixa e o histórico

O sintoma era um tooltip errado; a causa era mais larga. **Todo card de input carimba o id do seu node como id de grupo** — foi assim que "cortar este fio tira estas imagens" ficou confiável, mesmo quando a mesma foto chega por dois cards. Só que a faixa lia `grupo ⇒ produto`, e um grupo de um continua sendo um grupo. Resultado: a folha de um Input de Character Sheet aparecia como **"Produto:" com nome vazio**, a moldura tracejada de "estas várias são uma coisa só" cercava fotos sozinhas, o `✕` oferecia "remover o produto inteiro" para uma imagem só, e o painel anunciava "Tipo fixo: Produto" para qualquer card.

**A correção é uma tabela, não uma cadeia de `if`.** `referenceSourceLabel` responde "de onde isto veio" em duas formas — curta para uma lista que já disse "Imagem 2 ·", longa para um tooltip que aparece sem contexto nenhum — e as duas telas leem dela. Duas tabelas seriam duas chances de a faixa e o histórico chamarem o mesmo card por nomes diferentes, que é exatamente o defeito que a fase veio consertar.

**No canvas a resposta é exata; no histórico ela é reconstruída — e isso é de propósito.** A referência viva carrega `inputType`, o tipo do node que a entregou, reescrito a cada edição pelo mesmo `syncInputInto` que já mantém o rótulo do grupo. Uma geração da semana passada não tem esse campo: ela gravou o que o compilador precisava (`papel`, `tipo`, `grupo`), não o que a interface ia querer dizer depois. Então a mesma tabela lê os quatro tipos das marcas que existem — `papel` nomeia folha e pose, `tipo: "produto"` nomeia o produto, e o que sobra é imagem. **Nada é inventado e nada é reescrito**: uma linha antiga continua dizendo exatamente o que dizia.

**A folha da menção virou imagem 1 nos dois lugares.** Na faixa, uma miniatura tracejada sem `✕` e sem chip; no "Ver prompt", uma linha própria antes das outras. Ela nunca esteve em `referencias` — mora em `personagem.folha_asset_id`, porque não é input de referência —, e o efeito colateral era uma lista que começava em "Imagem 2" sem nada explicando o 1. O contador já dizia "a folha conta uma"; agora dá para ver a imagem que ele conta. **Um número correto que ninguém consegue conferir é um número em que se acredita, não um que se sabe.**

E o par PT→EN dos ajustes de cena ganhou uma seta. `Sorriso aberto` e `warm open smile` estavam em linhas coladas a 10px, e a leitura — ou o copiar e colar — produzia `Sorriso abertowarm open smile`. Uma seta custa um caractere e diz o que o layout só insinuava: **isto virou aquilo**. Junto veio o passe de legibilidade: corpo de 12–14px no lugar de 10–11px e o diálogo mais largo, porque as cláusulas em inglês são frases longas e a coluna estreita transformava cada uma em quatro linhas irregulares. Um registro que existe para ser conferido tem que ser legível — senão ele é um arquivo, não uma prova.

### 11/08/2026 — Fase 3 · a menção vira sujeito antes de traduzir

A menção era **apagada** da cena antes da tradução, e a justificativa era boa: quem ela é já foi dito, longamente, pelo bloco de identidade; o que sobra é o que ela está fazendo. O que ninguém tinha medido é que sobrava uma frase **sem sujeito** — e um tradutor que recebe frase sem sujeito não devolve frase sem sujeito, ele inventa um.

Três gerações reais, colhidas do banco antes de escrever uma linha de código:

| escrito | o que era traduzido | o que voltou |
|---|---|---|
| `@luna está no seu quarto gamer` | "está no seu quarto gamer" | *"is in **their** gamer room"* — e *"in **his**"* noutra rodada |
| `Duas imagens da @luna mostra ela…` | "Duas imagens **da mostra** ela…" | *"two images from **the exhibition**"* |
| `a @luna no seu quarto gamer` | "**a** no seu quarto gamer" | *"**at** in her gamer room"* |

O segundo é o mais claro: "da @luna" virou "da mostra", e *mostra* em português também é substantivo. Nada quebrou — o tradutor recebeu uma frase quebrada e fez o melhor que dava.

**A correção separa duas perguntas que estavam sendo respondidas pela mesma frase.** Quem decide se a cena está vazia continua sendo o texto **sem** a menção — é isso que faz `@luna` sozinha significar "me mostra ela", com traje canônico e padrões, e essa metade não podia virar. Quem vai para o tradutor passa a ser o texto **com** o sujeito no lugar da menção. Duas funções, duas perguntas, e nenhuma delas conseguia responder as duas.

**Três formas por gênero, porque o português solda as preposições.** `de + ela = dela`, `em + ela = nela`, e um artigo antes da menção já faz o trabalho que o pronome vai fazer. Pôr o pronome cru depois da contração ("Duas imagens da ela") trocaria uma frase quebrada por uma agramatical, e o tradutor chutaria de novo. O gênero vem da **versão congelada**, como tudo que a menção resolve; sem gênero decidido, o sujeito é `a pessoa` — substantivo e não pronome, porque não há pronome neutro assentado em português e inventar um poria no meio da cena uma palavra que o modelo nunca viu.

**O compilador continua função pura.** Tudo aqui é tabela fechada e consulta: sem rede, sem relógio, sem aleatoriedade. E vale dizer o que isto **não** faz: a tradução continua sendo chamada de modelo e continua não sendo determinística — a prova disso está na primeira linha da tabela acima, a mesma frase virando "their" e "his". O que a substituição remove é a **ambiguidade que obrigava o modelo a chutar**, não o chute.

**Provado antes de gastar Spark.** Dois harnesses `npx tsx` em `scratchpad/evidencias/d1-fase3/`: um exercita a função pura contra as três frases reais mais as contrações (16 casos), outro roda o `buildCanvasPrompt` inteiro e verifica o que mais importava — que `@luna` sozinha **continua** trazendo o traje canônico e os padrões, que a cena dirigida continua sem eles, e que duas compilações da mesma entrada são idênticas. Só depois disso é que uma geração paga foi pedida.

E o registro ganhou `mencao_sujeito: { handle, sujeito }`. A cena compilada não contém mais a menção, então **sem essa linha nada no registro consegue dizer quais palavras da cena eram a personagem** — e um registro que não sabe responder isso é um registro que envelhece em falso. Gerações anteriores leem `null`, que é a verdade sobre elas: naquela época não havia sujeito nenhum para gravar.

**Validado com geração paga, e a medição entregou um achado.** Três gerações do Jorge (150 ⚡, mais uma recusa de política cobrada 0 ⚡) mostram os três estragos mortos: `Ela está…` → *"she is in her gamer room"*, `Duas imagens dela…` → *"two images of her are in her gamer room"*, `Ela no seu quarto gamer` → *"she in her gamer room"*. Nas quatro linhas, `mencao_sujeito` gravado.

**E uma delas mostra o que a Fase 3 não conserta.** Mesma frase, mesmo sujeito substituído, um minuto de diferença: numa rodada saiu *"in **her** gamer room"*, na outra *"in **his** gamer bedroom"*. O sujeito estava certo nas duas (*"two images of her"*) — o que sobrou é o **possessivo "seu"**, que em português é ambíguo (dele / dela / seu de você) e continua sendo chutado pelo tradutor.

O placar honesto, então: **o vazamento de gênero morreu no sujeito e continua vivo, menor, no possessivo.** Não é regressão — é a mesma classe de problema num lugar que esta fase não tocou, e fica escrito aqui ao lado da promessa que ela cumpriu, porque uma medição que contradiz metade do que se ia dizer vale mais do que a metade que confirma.

### 11/08/2026 — Fase 3b · o possessivo, e uma regra que é quase toda recusa

Adendo aprovado à D1, saído da medição da Fase 3: com o sujeito já certo, `Ela está no seu quarto` voltou *"in **her** gamer room"* numa rodada e *"in **his** gamer bedroom"* na seguinte. `Seu` é ambíguo por construção — dele, dela ou seu de você — e **um tradutor diante de ambiguidade não devolve ambiguidade: ele escolhe.** Trocar por `dela`/`dele` tira a escolha da mesa.

**O custo dos dois erros não é simétrico, e é isso que define a regra.** Deixar ambíguo é barato: o modelo às vezes acerta, e quando erra, erra do jeito que já errava. Reescrever errado é caro: o modelo **obedece**. "No quarto do seu namorado" reescrito com o dono trocado não fica estranho — fica bem-formado, convincente e sobre outra pessoa. Por isso a instrução do Jorge era "na dúvida, não reescrever", e por isso a maior parte do arquivo é a definição de dúvida.

Cinco condições, todas obrigatórias, e cada uma existe por um caso concreto:

| condição | o caso que ela impede |
|---|---|
| uma pessoa só na frase | `no quarto do seu namorado` — dois donos possíveis |
| artigo antes do possessivo | `ajeita seu cabelo` → `ajeita cabelo dela`, substantivo pelado; inserir o artigo certo exigiria saber o gênero do substantivo |
| sintagma que termina onde dá para ver | `no seu quarto grande cheio de luzes` — sem saber onde acaba, o `dela` cai no meio |
| nada de `de/do/da` logo depois | `na sua casa da praia` — a preposição continua o sintagma |
| nada de `você` na frase | aí `seu` é de você, e é |

**A lista de substantivos de pessoa é fechada e incompleta, e isso é seguro porque ela só recusa.** Uma palavra que falta nela não vira reescrita errada por isso: ainda precisa passar pelas outras quatro condições. Uma lista incompleta que *permitisse* seria outra história.

**Cobertura medida antes de gastar Spark, contra os prompts reais.** Dos 25 prompts distintos que existem em `generations`, **11 usam possessivo** (44% — não é caso de borda). A regra reescreve **8 dos 11 (73%)**, e as três recusas são o mesmo caso: `vestindo seu biquíni novo`, sem artigo antes. É vocabulário central deste produto — roupa —, então o buraco é conhecido e não é pequeno; fica ambíguo de propósito, porque a alternativa seria adivinhar o gênero de cada substantivo do português.

Três harnesses `npx tsx` em `scratchpad/evidencias/d1-fase3b/`, e **metade dos casos do principal são casos que a função tem que recusar** — um harness que só testa o que a função faz não testa a parte que decide se ela é segura.

**Validado com geração paga, e a prova é estrutural — não estatística.** `@luna está no seu quarto gamer, com cores rosa e azul` gravou `cena_pt = "Ela está no quarto gamer dela, com cores rosa e azul"`, `possessivos: 1`, e voltou *"she is in **her** gamer room"* nas duas rodadas (uma delas recusada pelo provedor, cobrada 0 ⚡ — e o registro é gravado mesmo assim, que é como se lê o inglês dela).

**O que isso prova é que não sobrou escolha para o tradutor fazer**: `no quarto gamer dela` não vira "his" sem o modelo se contradizer dentro da própria frase, enquanto `no seu quarto` admitia "his" legitimamente. A ambiguidade não foi combatida — foi removida da entrada.

**O que isso não prova é queda de taxa de erro.** Foram duas rodadas, e a frase testada já tinha saído "her" na única vez que rodou antes; a frase que de fato virou ("Duas imagens…", que deu *"in **his** gamer bedroom"*) não foi regerada. Duas rodadas não são amostra, e chamar isso de "erro reproduzido e corrigido" seria inventar um dado. O teste extra foi dispensado com motivo: uma rodada a mais também não seria amostra, e **`mencao_sujeito.possessivos` acumula o dado real no uso normal** — se um "his" aparecer numa frase reescrita, a investigação começa com caso concreto em vez de com estatística fabricada.

### 11/08/2026 — Backlog · possessivo N2: dicionário de gênero do domínio 📌 registrado, com critério de saída

As três recusas medidas na 3b são todas o mesmo padrão: **possessivo sem artigo antes** — `vestindo seu biquíni novo`, `de sua casa simples`. A reescrita exigiria inserir o artigo (`vestindo o biquíni novo dela`), e o artigo certo exige o **gênero do substantivo**, que hoje seria adivinhação.

A saída conhecida é um **dicionário fechado e curado dos substantivos deste domínio** — biquíni (m), vestido (m), saia (f), blusa (f), colar (m), bolsa (f), maquiagem (f) — pequeno, específico e verificável, no espírito de todas as outras listas fechadas da casa. Um dicionário curado não é adivinhação; é a mesma decisão que o `SUBJECT_BY_GENERO` já toma, um nível abaixo.

**Critério de saída, para não construir sobre suposição:** vale a pena quando recusas desse padrão estiverem **acumulando nos prompts reais**. Hoje são 3 em 11 — o suficiente para registrar, não o suficiente para gastar um ciclo. O contador está no lugar certo: cada geração grava `mencao_sujeito.possessivos`, e as recusas são a diferença entre prompts com possessivo e possessivos reescritos.

### 11/08/2026 — Fase 4 · Recentes e Galeria: o histórico que já existia, com onde olhar

Última fatia da D1, e nenhuma das duas telas guarda dado novo: as gerações estão em `generations` desde a Fase 0, com `project_id` e `node_id` preenchidos desde o Canvas 4. O que faltava era **onde olhar** — e é por isso que o ciclo inteiro fechou sem uma migration.

**A faixa "Recentes" lê do banco, não do grafo.** O bloco guarda apenas a última leva; tudo antes dela existia só como cartão Resultado no canvas. Quem arruma o canvas apagando cartões perdia o rastro **de vista** — nunca de fato. Quatro miniaturas por `project_id + node_id`, e a dependência do carregamento é a própria lista de ids salvos: ela muda exatamente quando este bloco produziu algo, sem um contador à parte que alguém teria de lembrar de incrementar.

**Promover é ver, não gravar** (decisão do Jorge). Clicar numa miniatura põe a imagem na moldura e escreve nada: o projeto continua guardando a última leva, a próxima geração devolve a moldura sozinha, e uma linha na faixa diz em que estado a pessoa está. **Uma tela que reescrevesse o documento a cada olhada obrigaria a pensar antes de olhar** — o contrário do que uma faixa de recentes existe para fazer.

**A Galeria é um modo do seletor, não uma segunda tela.** Mesma grade, mesma rolagem, mesma paginação; muda de onde vem a lista, o que o clique faz e o rodapé. Duas telas iguais menos um botão são duas telas que divergem na primeira vez que alguém mexer numa delas — e este ciclo inteiro nasceu de divergências assim (a faixa chamando tudo de "Produto:", o "Ver prompt" não rotulando nada).

**E ela nasce filtrada por projeto**, que era o pedido do Jorge com um motivo de arquitetura atrás: é o alicerce do escopo por projeto da D2 e do painel futuro. Filtro acrescentado depois é filtro que precisa ser adicionado em toda tela que já existia. Medido na validação: **29 gerações deste projeto na galeria, 3 fora dele** — as folhas canônicas, que nascem no editor da personagem e não têm `project_id`. É o recorte certo: folha é identidade, não trabalho deste projeto, e continua alcançável pelo seletor de referências, que lista `assets` e não gerações.

**Dois bytes NUL no meio de um template literal.** Achados de raspão nesta fase: `reference-picker.tsx` tinha `\0` onde deviam estar espaços, em `` `${filter}\0${query}` ``. Nunca quebrou nada — como separador, um NUL funciona igual — mas é o tipo de coisa que transforma um arquivo em binário para o `git diff` e faz uma busca por texto falhar sem explicar por quê. Varredura no `src/` inteiro: eram os dois únicos.

### 11/08/2026 — Etapa D1 encerrada: quatro fases, dois adendos, nenhuma migration

O ciclo entregou o que abriu para entregar, e o placar cabe numa tabela:

| fase | o que entrou | como foi provado |
|---|---|---|
| **1** | vão do trilho, retrato da versão congelada, nome de projeto que não se repete | navegador (Jorge, depois Code) |
| **1d** 📌 adendo | editor abre na versão ativa, em leitura; clique em campo leva ao rascunho com aviso; selo de rascunho pendente | navegador, três prints |
| **2** | tooltip por tipo, âncora como imagem 1, "Ver prompt" legível e espelhado | navegador, quatro prints + dump do DOM |
| **3** | a menção vira sujeito antes de traduzir | 2 harnesses (16/16 e 6/6) + 3 gerações pagas |
| **3b** 📌 adendo | possessivo determinístico, quase todo recusa | 3 harnesses (25/25, 73% de cobertura real) + 1 geração paga |
| **4** | faixa "Recentes" e Galeria filtrada por projeto | navegador, seis prints + conferência no banco (29 · 3) |

**Zero migrations, como o ciclo pedia** — e isso não foi sorte: `generations` já tinha `project_id` e `node_id` desde o Canvas 4, e a Fase 4 inteira é dar **onde olhar** para um histórico que já estava gravado. As três colunas novas de comportamento (`inputType` na referência, `mencao_sujeito`, `possessivos`) moram em jsonb que já existia, e linhas antigas leem `null` — que é a verdade sobre elas.

**Custo de validação paga: 200 ⚡ em 4 imagens**, mais 2 recusas de política do provedor cobradas 0 ⚡. Tudo nas fases 3 e 3b, as únicas que tocaram o compilador.

**Duas emendas de ritual nasceram aqui, e as duas nasceram de um erro concreto.**

A primeira: **tarefa sem geração é validada no navegador pelo Code**, com um print por item, em `scratchpad/evidencias/<etapa>-<fase>/`, com nome que diz o que o print prova. Ela nasceu do item 1b, que voltou da validação com dois sintomas — e nenhum dos dois diagnósticos iniciais estava certo, nem o do Jorge nem o meu. Um ciclo de correção às cegas gasta duas rodadas para produzir zero informação; abrir o navegador custou cinco minutos e matou as duas hipóteses erradas de uma vez. A parte do **nome do arquivo** veio uma emenda depois, quando os prints da Fase 1 se provaram inencontráveis na semana seguinte: um print que ninguém acha é indistinguível de um print que não existe.

A segunda: **nunca rodar `npm run build` com o `npm run dev` no ar** — os dois escrevem no mesmo `.next/`. Essa nasceu de eu ter feito exatamente isso e passado a investigação seguinte perseguindo a hipótese errada (bundle corrompido) para um sintoma que era o **badge de devtools do Next.js** parado em cima do último ícone do trilho.

**O que o ciclo ensinou, e vale além dele:** um sintoma visual descreve *onde dói*, nunca *o que quebrou*. Três vezes neste dia a causa estava a um passo de onde a queixa apontava — o vão do trilho era altura invisível e não filtro; o "avatar" era um badge de ferramenta; o "Produto:" em tudo era todo card carimbando id de grupo. E as três só foram encontradas porque alguém abriu a tela em vez de deduzir dela.

### 11/08/2026 — Etapa D2 · Fase 0: a personagem é do usuário, o vínculo é do projeto

A D1 fechou com a Galeria já filtrada por `project_id`. A D2 estende o escopo por projeto às personagens — e o princípio que rege a etapa inteira é o que decidiu a forma da tabela: **a personagem é entidade do usuário, única. Nunca do projeto.** Uma `@luna`, uma folha, um histórico de versões, um rastro financeiro. O que nasce agora é o **vínculo**.

Isso não é preferência de modelagem; é o que o schema já afirmava. `entities_handle_unique_per_user` faz do handle um nome do **usuário**, não do projeto: não existem duas `@luna`. Logo "esta personagem trabalha neste projeto" só pode ser uma tabela de ligação.

E a consequência de produto é o coração da etapa: **desvincular não é arquivar.** Desvincular é leve e reversível — ela segue viva na galeria e nos outros projetos; arquivar continua sendo o ato global, com a confirmação em dois painéis que já existe. Duas ações, dois pesos, duas UIs.

**A investigação encontrou a coluna que parecia ser a resposta, e era a armadilha.** `entities.project_id` existia desde a Fase 0, com o comentário oficial "nulo = vale em todos os projetos; preenchido = escopo daquele projeto". Nunca foi usada: todas as linhas nulas, e `createCharacter` escrevia `null` de propósito. Implementar a D2 com ela era o caminho de menor esforço aparente — e o FK dela é `on delete cascade`, enquanto `deleteProject` apaga de verdade. A cascata medida:

| passo | o que some |
|---|---|
| `delete from projects` | a personagem, pela coluna `project_id` |
| cascata em `entity_versions` | os retratos congelados, v1…vN |
| cascata em `generations.entity_id` | **todas as imagens em que ela apareceu** |
| `ledger_transactions.generation_id` é `set null` | o dinheiro fica no livro apontando para o nada |

**Débitos órfãos num livro append-only** — a única coisa que um registro financeiro nunca pode ter, e exatamente o cenário que o comentário de `archiveCharacter` já descrevia como impensável. A coluna foi derrubada, sem DEPRECATED: duas maneiras de dizer a mesma coisa, uma delas com esse buraco, a um `git grep` de distância de quem for escrever a próxima tela.

**A posse é garantida por chave composta, não por trigger.** `project_entities` tem `user_id` desnormalizado e duas FKs que o compartilham — `(project_id, user_id) → projects (id, user_id)` e `(entity_id, user_id) → entities (id, user_id)`. É o Postgres que recusa vincular o projeto de um ao personagem de outro. É o precedente exato do `entities.active_version_id`, que usa a mesma técnica pelo mesmo motivo.

**Sem política de UPDATE**, de propósito: não há o que atualizar numa linha que *é* o vínculo. Revincular é inserir de novo — e a diferença importa, porque um UPDATE deixaria aberta a única operação que esta tabela não deve saber fazer, que é mover um vínculo de projeto.

**Backfill all↔all, incluindo a arquivada.** **Sete** personagens × um projeto = **sete linhas** — as seis ativas mais a arquivada `@natany`; o produto legado `@pijama` ficou de fora, como manda o `where kind = 'character'`. (O plano dizia "seis", contando só as ativas e dizendo "incluindo a arquivada" na mesma frase: a migration estava certa, a aritmética do resumo é que não somou. Conferido no banco depois de aplicada.) É exatamente o comportamento de hoje, então nada some de nenhuma tela e nenhum canvas existente quebra. A alternativa considerada — inferir o vínculo pelas gerações reais — deixaria `@aria` e `@soraia` de fora, porque nunca geraram nada, sumindo-as do único projeto que existe. **O erro barato vence o caro:** um vínculo a mais é um clique; uma personagem desaparecendo de um canvas que a usa é uma investigação.

**E `cover_asset_id` ganhou o dono que faltava.** A coluna existia desde a Fase 0 e nunca teve leitor. Vira o **avatar** da Fase 3 — em `entities` e não em `entity_versions`, porque avatar é apresentação e congelar uma versão nova não deve mudar a cara dela. O `on delete set null` que ela já tinha entrega de graça a regra "remover o avatar volta ao padrão".

#### A ordem de aplicação, e por que ela é a metade que importa

Duas travas desta etapa moram no banco, e **as duas só são seguras se subirem depois do código que as torna inalcançáveis.** É a mesma regra, aplicada duas vezes.

**1. O `drop column` exigiu commit preparatório.** `createCharacter` escrevia `project_id: null`; escrever em coluna que não existe é erro do PostgREST, ou seja, criar personagem pararia de funcionar. A janela foi fechada pela ordem — código sobe, Vercel publica, migration é aplicada — e o que a torna segura é que a mudança é **correta nos dois esquemas**: a coluna era nullable e sem default, então omiti-la grava o mesmo null. Não existe estado em que o código novo esteja errado; existe uma única combinação proibida, *banco novo com código velho no ar*, e a ordem a elimina.

**2. O backstop `GN006` foi adiado para a Fase 2 — e o adiamento é a decisão, não o atraso.** Ele estava aprovado para esta migration ("cinto e suspensório") e foi retirado dela ao ser escrito. `supabase db push` aplica todos os arquivos pendentes de uma vez, então um `GN006` escrito agora sobe agora — quando a checagem da aplicação ainda não existe. Nessa janela, um projeto novo (que nasce sem vínculos, e é o que a etapa quer) faria qualquer `@` bater no `GN006`. Só que `GN006` mora no `record_generation`, chamado no **passo 11** do `runCanvasGeneration`: **depois de o provedor ter gerado e sido pago.** O código destrói o asset e o arquivo, então o usuário não é cobrado — mas a imagem foi paga e foi para o lixo.

É a mesma armadilha que o comentário do `GN005` já documentava: *"a recusa chega depois de a imagem existir, ou seja, depois de o Google ter sido pago por ela."* **Um suspensório que sobe antes do cinto não é suspensório — é o cinto, no pior lugar possível.**

**A janela sem enforcement fica registrada aqui, porque ela existe de verdade:** entre esta migration e o deploy da Fase 2, o `@` continua resolvendo qualquer personagem do usuário, vinculada ou não. Nada quebra e nada é cobrado errado — é o comportamento de hoje, que ninguém prometeu ter mudado ainda. O que muda em Fase 2 é a recusa, e ela nasce onde é de graça (passo 2, antes do saldo, antes da tradução, antes do provedor). O `GN006` entra como **item 2.5**, arquivo de migration próprio, aplicado **depois** do deploy da Fase 2.

**A invariante do `CLAUDE.md` também espera a Fase 2.** O texto que promete "`@` só resolve personagem vinculada ao projeto da geração" só pode ser escrito quando for verdade — uma invariante que descreve código que não existe é a pior linha que um documento pode ter.

### 11/08/2026 — Etapa D2 · Fase 1: o trilho passa a ser deste projeto

Cinco itens, e o primeiro era um pré-requisito que a investigação achou antes de a fase começar: **a lista de personagens não acompanhava a troca de aba.**

`Studio` não tem `key` e `useSeedArsenal` semeava com `useRef` + `useEffect(…, [])`. Trocar de aba é um `<Link href="/?p=…">`: o Server Component roda de novo e manda `props` novas, mas o `Studio` **não desmonta** — então o efeito nunca mais rodaria. Sem isso, a Fase 1 entregaria uma barra lateral mostrando as personagens do projeto anterior, e o defeito só apareceria na validação, disfarçado de "filtro que não funciona".

**A correção não foi re-semear a lista.** Re-semear resolveria a lista e quebraria outra coisa: `characters` carrega `draftStatus`, `revision` e `lastSavedAt`, e o editor é um overlay que sobrevive à troca de aba. Quem estivesse escrevendo perderia o rascunho no meio da frase.

Então são **duas semeaduras com dois tempos de vida**, e isso é o vocabulário da etapa virando código: a **lista é do usuário** e é semeada uma vez; o **conjunto de vínculos é do projeto** e é semeado a cada troca. O conjunto não carrega estado de ninguém — ele é só a resposta a "quem trabalha aqui" —, então re-semear sai de graça.

**E essa separação paga um segundo dividendo, que é o cartão do canvas.** Com uma lista só, "não está aqui" seria indistinguível de "não existe". Com as duas, o cartão de uma personagem desvinculada sabe dizer que ela tem conserto de um clique, em vez de dizer que sumiu. É a Fase 2 que escreve essa tela — mas ela só é escrevível por causa desta escolha.

**Dois vazios, porque são dois problemas.** Sem personagem nenhuma, o conserto é criar. Com seis e um projeto novo, o conserto é **trazer** — e dizer "crie a primeira" para quem tem seis é a tela contradizendo o que a pessoa sabe que tem.

**Criar dentro de um projeto vincula** (1.3), porque é o único momento em que a intenção é evidente sem perguntar nada. São duas escritas e não uma transação, de propósito: o precedente do `save_entity_version` existe porque um meio-caminho lá deixaria `@handle` apontando para o retrato errado — risco de correção. Aqui o meio-caminho deixa uma personagem que se traz de volta com um clique, e a resposta devolve `linked: false` em vez de fingir que deu certo.

**"Adicionar existente" (1.4) não lê nada do servidor**, e é o mesmo princípio de novo: a lista do usuário já está no navegador, porque a personagem não é do projeto. Buscar de novo criaria uma segunda cópia da mesma pessoa para as duas telas discordarem sobre qual está certa. A grade mostra **todas**, com as já vinculadas marcadas e sem ação — quem abre esse modal está perguntando "quem está neste projeto?" tanto quanto "quem falta?", e esconder metade da resposta obrigaria a fechar o modal para conferir o trilho.

**Validado no navegador, zero Spark, nove prints em `scratchpad/evidencias/d2-fase1/`.** O caso que mais importava foi o do rascunho, e ele tem um sinal que não admite dúvida: `lastSavedAt` ("rascunho salvo às 21:42") é estado **só do cliente** e o `seed()` o zeraria. Ele sobreviveu à troca de aba enquanto a lista ia de 1 para 6 — ou seja, os vínculos foram re-semeados e a lista não. As duas metades da tese numa observação só.

Conferido no banco ao fim: `@luna` vinculada aos **dois** projetos, `@teste-vinculo-d2` só onde nasceu. Uma personagem, dois vínculos — que é a etapa inteira em uma linha de SQL.

### 11/08/2026 — Etapa D2 · Fase 2: o `@` no escopo do projeto, e a recusa que não custa nada

Cinco itens, e o segundo é o que a etapa inteira vinha construindo.

**A lista de sugestões do `@` filtra, e isso não é suficiente.** A interface **não é fronteira de segurança**: uma menção digitada à mão, um prompt copiado de outro projeto ou uma aba aberta desde antes de um desvincular chegam ao servidor exatamente iguais a uma escolhida na lista. Então a recusa mora no servidor, e a lista existe para dizer "ela não está aqui" **antes** de a pessoa escrever a cena — não depois de clicar em Gerar.

**A recusa fica no passo 2 do `runCanvasGeneration`, e o lugar é aritmético.** Ali é antes da leitura do saldo, antes da tradução (que custa fração de centavo) e antes do provedor. Uma menção recusada não escreve linha em `generations`, não toca no ledger e não chama ninguém — **zero Spark, e não "quase zero"**. É o mesmo raciocínio que fez o preço por resolução ser conferido na aplicação em vez de deixado para o `GN005`: descobrir depois é descobrir com a imagem já paga.

**Medido, não suposto.** O teste rodou com exposição mínima (1K, quantidade 1, 50 ⚡ em risco) e os números de antes e depois são idênticos:

| | antes | depois |
|---|---|---|
| `generations` | 49 | **49** |
| `ledger_transactions` | 35 | **35** |
| `wallets.balance_cents` | 7750 | **7750** |
| `max(created_at)` das duas tabelas | 22:56:56 | **22:56:56** |

A frase que apareceu na tela ensina o conserto em vez de só dizer não: *"A personagem @luna não está vinculada a este projeto. Traga-a por 'Adicionar existente', no menu lateral — ela continua nos outros projetos."* As três coisas que alguém precisa saber, na ordem em que precisa: o que houve, o que fazer, e que não perdeu nada.

**Desvincular e arquivar são duas UIs porque são dois pesos.** Arquivar é global e não se desfaz pela tela: mora no editor, em vermelho, com dois painéis. Desvincular é local e se desfaz com um clique: mora na linha do trilho, sem vermelho, e o texto diz que é reversível. Apresentar as duas com a mesma cara faria a leve parecer a pesada — e o custo disso não é estético: quem hesita em desvincular por achar que vai perder a personagem simplesmente não usa o escopo por projeto, e a etapa vira uma tabela que ninguém preenche.

**O diálogo conta, e só conta o que existe.** A varredura é local e usa o `findMentions` que o servidor usa — o número na tela e a menção que o servidor recusa são uma leitura só da mesma frase. Na validação ele disse "1 cartão(ões) dela, 2 bloco(s) com @luna no prompt", e antes de a personagem ter cartão dizia só os blocos. "0 cartões e 0 blocos" seria ruído com cara de aviso: ensinaria a ignorar a frase justamente nas vezes em que ela traz um número que importa.

**E o cartão do canvas ganhou o terceiro estado que a Fase 1 tornou possível.** "Não encontrada" é o que uma personagem **arquivada** produz, e não tem volta pela tela. "Não vinculada" tem volta, e é um botão no próprio cartão. O cartão **fica** onde estava, com nome, retrato e fio: sumir com ele seria a segunda coisa que desvincular não faz — o desenho do fluxo é do usuário, e mexer nele por causa de um vínculo seria o produto reorganizando a mesa de trabalho de alguém sem pedir.

#### O `GN006` e a ordem de aplicação

O backstop no `record_generation` é o item 2.5, em **arquivo de migration próprio**, e sobe **depois** do deploy desta fase. A regra é a mesma da Fase 0, virada: *o código que torna a regra do banco inalcançável sobe primeiro.*

O motivo é que o `GN006` recusa no passo 11 — depois de o provedor ter gerado e sido pago. Com a checagem da aplicação no ar, ele nunca dispara. Sem ela, ele passa a ser a única checagem que existe, e vira exatamente o defeito que foi escrito para cobrir. **Um suspensório que sobe antes do cinto não é suspensório — é o cinto, no pior lugar possível.**

Detalhe que barateia a migration: a assinatura da função **não muda**, então é `create or replace` puro e as concessões sobrevivem — diferente de `20260809180000` e `20260810180000`, que acrescentaram parâmetros e tiveram de derrubar e reconceder.

**Validado nas duas metades, que é o que dá sentido a cada uma.**

O **caminho triste** foi no navegador pelo Code, zero Spark, sete prints em `scratchpad/evidencias/d2-fase2/`. Ele terminou com o banco onde começou: 7 vínculos, os mesmos 7 handles, 49 gerações, 35 lançamentos, saldo 7750.

O **caminho feliz** foi do Jorge, com Spark de verdade: `@luna` vinculada, 1K, uma imagem — `succeeded`, `sparks_charged: 50`, `@luna v4`, e **exatamente um** lançamento no ledger de 50 centavos. Saldo 7750 → 7700, gerações 49 → 50, lançamentos 35 → 36.

**As duas metades juntas são a prova; separadas, nenhuma das duas seria.** A recusa sozinha provaria que nada é cobrado — o que um botão quebrado também faria. A geração sozinha provaria que o caminho funciona — sem dizer nada sobre o que acontece quando ele não deve funcionar. Uma linha nova em cada tabela no caminho feliz, zero linhas novas em ambas no triste: é o par que mostra que a recusa é uma decisão e não uma falha.

### 11/08/2026 — Etapa D2 · Fase 3: o avatar, e um seletor que abria por baixo

O retrato passa a ser **avatar > folha congelada > iniciais**, e a palavra que rege a fase é *sobreposição*: o avatar não substitui a folha, passa na frente dela. Remover não deixa a personagem sem cara — devolve a folha, sem uma linha de código para lembrar disso, porque quem decide o retrato continua sendo `useCharacterPortraits` e não uma cópia guardada em algum lugar.

**Coluna nenhuma foi criada.** `entities.cover_asset_id` existia desde a Fase 0 e nunca teve leitor; a Fase 0 desta etapa só lhe deu um comentário. E o `on delete set null` que ela já tinha entrega de graça a regra "remover volta ao padrão" para o caso em que a imagem some do acervo.

**Fica em `entities` e não em `entity_versions`, de propósito: avatar é apresentação, não identidade.** Congelar uma v5 muda a folha que a menção ancora e não muda a cara que a pessoa escolheu para reconhecê-la numa lista de seis. As duas coisas mudam por motivos diferentes, então mudam em lugares diferentes.

**A escolha reusa o seletor de referências**, com escopo novo `avatar` e teto 1. Não é economia de código: o que a foto de perfil precisa é literalmente o que aquele modal faz — "envie um arquivo, ou pegue algo que você já tem" —, e um segundo seletor seria um segundo lugar para "10 MB" e "precisa ser imagem" divergirem. É o mesmo motivo pelo qual o editor de produto passou a usá-lo em vez de ganhar o seu.

#### O defeito que só a tela mostrou

Ao clicar em "Escolher foto de perfil" pela primeira vez, **não acontecia nada**. O seletor estava montado, no DOM, funcionando — e sendo pintado por baixo.

A causa: o editor da personagem é um `<dialog>.showModal()`, e um dialog modal vive na **top layer** do navegador, acima de qualquer `z-index` da página. O seletor era um `div` com `fixed inset-0 z-50`, o que bastava enquanto quem o abria era um node do canvas. O primeiro chamador vindo de dentro de um dialog encontrou o teto.

A correção é a receita que o próprio `SheetEditor` já usava: o seletor virou `<dialog>` nativo. A top layer empilha por ordem de abertura, então quem abre depois fica acima. De brinde vieram duas coisas que se faziam à mão — Escape fechando (agora por `onClose`, que cobre qualquer caminho de fechamento) e o foco preso dentro do modal.

**É a terceira vez nesta etapa que um sintoma apontou para o lugar errado**, e a terceira vez que abrir a tela custou minutos onde deduzir custaria rodadas. "O botão não faz nada" descrevia um componente que estava fazendo exatamente o que devia.

#### Validação

Zero Spark, doze prints em `scratchpad/evidencias/d2-fase3/`. A ordem foi provada com uma personagem de cada caso **no mesmo print** — `@julia` com avatar, `@luna` só com folha, `@aria` só com inicial —, nos cinco lugares que mostram retrato: trilho aberto, trilho fechado, cartão do canvas, lista do `@` e galeria de personagens.

Dois deles merecem nota. O **`@luna` é o caso decisivo**: ela tem folha, então dar-lhe um avatar prova que ele vence, e removê-lo prova que o retrato volta para a folha — as duas metades da regra numa personagem só. E a **lista do `@` não estava mostrando retrato nenhum** antes desta fase: chamava `Portrait` sem `src`, então todo mundo aparecia como duas letras, inclusive quem tinha folha. Reconhecer alguém por duas letras é pior justamente onde a escolha é rápida.

Os dois caminhos de escolha foram exercitados: galeria (`@julia`) e upload (`@marina`). Os avatares de teste foram removidos ao final e o banco terminou com `cover_asset_id` nulo nas seis, como começou.

### 11/08/2026 — Etapa D2 encerrada: uma personagem, muitos projetos

O ciclo entregou o escopo por projeto para as personagens sem que nenhuma delas deixasse de ser do usuário. O placar cabe numa tabela:

| fase | o que entrou | como foi provado |
|---|---|---|
| **0** | `project_entities` com posse por FK composta; `entities.project_id` derrubada; `cover_asset_id` vira avatar | conferido no banco depois de aplicada: 7 vínculos, coluna inexistente, uniques e índices criados, RLS sem UPDATE, `anon` sem grant |
| **1** | trilho por projeto, dois vazios, criar vincula, "Adicionar existente" | navegador, **nove prints** — e o rascunho sobrevivendo à troca de aba, provado por um campo que só existe no cliente |
| **2** | `@` no escopo, recusa no servidor, cartão "não vinculada", desvincular com diálogo que conta | **o par**: recusa com zero linhas novas em `generations` e `ledger_transactions`, geração com exatamente uma em cada. `GN006` aplicado **depois** do deploy, na ordem escrita |
| **3** | avatar > folha > iniciais, escolha por galeria e upload, retrato em cinco lugares | navegador, **doze prints**, zero Spark — mais a correção da top layer |

**Uma migration de schema e uma de função, nas ordens que a etapa descobriu que importavam.** As duas ordens são a mesma regra vista de dois lados: *o código que torna a regra do banco inalcançável sobe primeiro*. Na Fase 0 isso obrigou um commit preparatório antes do `drop column`; na Fase 2, adiou o `GN006` para depois do deploy. Em nenhum dos dois casos a ordem foi conveniência — nos dois, a ordem errada tinha um custo nomeável (criar personagem quebrada; imagem paga e jogada fora).

**Custo de validação paga: 50 ⚡, uma imagem.** Todo o resto foi navegador e consulta ao banco. O caminho triste da Fase 2 foi rodado com exposição mínima justamente porque o modo de falha dele *era* uma geração paga — e não foi.

#### 📌 Backlog · excluir asset da galeria

**Não existe caminho no produto para apagar uma imagem do acervo** — nem UI, nem ação de servidor. Uma imagem enviada por engano fica.

E não é um botão: **a exclusão precisa medir as referências antes de existir.** Um `asset` pode estar sendo apontado por uma geração (`generations.result_asset_id`), por um avatar (`entities.cover_asset_id`), por uma imagem canônica (`entity_images`, onde há trigger que torna imortal a citada por versão congelada) e pelos nodes de um canvas, que guardam `assetId` dentro do `graph` em jsonb — este último invisível para qualquer FK. Apagar sem medir produz exatamente o tipo de buraco que a coluna `project_id` produziria: molduras vazias em canvas antigos, retratos que somem sem explicação.

O desenho provável é o das personagens e dos produtos: **arquivar em vez de apagar**, com exclusão real só onde nada aponta. Fica registrado, não construído.

**Primeiro cliente:** o `avatar-de-teste-upload` que a validação da Fase 3 deixou. Um resto conhecido, com nome que se identifica, é melhor do que uma exclusão apressada — mas é um resto, e está anotado como tal.

#### A lição que a etapa repetiu, agora com três casos

**Um sintoma visual descreve onde dói, nunca o que quebrou.** A D1 já tinha escrito isso; a D2 acrescentou o terceiro caso e o padrão agora atravessa dois ciclos:

| a queixa | onde estava a causa |
|---|---|
| "o trilho tem um vão" | altura invisível de parágrafos com `opacity: 0` — não filtro |
| "apareceu um avatar estranho" | o badge de devtools do Next.js parado sobre o último ícone |
| "o botão não faz nada" | o seletor abria certo, e o `<dialog>` do editor o cobria pela **top layer** |

Os três têm a mesma forma: o componente acusado estava fazendo exatamente o que devia. E os três só foram encontrados porque alguém abriu a tela em vez de deduzir dela — o que é, palavra por palavra, o motivo pelo qual a emenda de ritual da D1 existe.

---

## Ciclo Dashboard — a tela inicial do sistema

### 12/08/2026 — Fase 1a · a rota decidida: `/` é o vestíbulo, o canvas muda para `/studio`

Até hoje, entrar no produto era cair num canvas infinito. Para quem já sabe o que
está fazendo, isso é o atalho ideal; para quem chega, é uma tela sem nada para
ler cuja primeira pergunta é "arraste um bloco". O ciclo abre a porta da frente:
`/` passa a ser o dashboard, e o canvas vai para `/studio?p=<id>`.

**A alternativa foi medida antes de ser descartada.** A opção conservadora —
dashboard numa rota nova, canvas intocado em `/` — parecia mais barata e não é:
para o dashboard receber quem entra, os quatro pontos de autenticação
(`signIn`, `signUp`, o proxy e o callback de e-mail) mudam de destino de
qualquer jeito. Ela pouparia três pontos e deixaria `/` sendo o canvas, ou seja,
pagaria quase o preço inteiro sem entregar o benefício: quem digita o endereço
puro continuaria caindo no plano infinito. **Dez pontos de toque, seis arquivos**,
foi o custo real da opção limpa.

O `?p=` continua sendo query param em vez de virar `/p/[id]`: assim a troca de
aba é uma string trocada, e a regra "`?p=` desconhecido cai na primeira aba"
segue onde sempre esteve.

**A armadilha, que era a única cara de verdade.** O `export const maxDuration = 60`
não era do canvas — é **configuração de rota**, e o comentário no próprio arquivo
registra que ele governa o tempo de toda Server Action usada naquela página. É
dali que vem o orçamento do motor de extração. Deixá-lo para trás teria devolvido
a extração ao padrão de dez segundos, e o estrago só apareceria numa extração
real, que custa Sparks, morrendo no meio sem explicação. A linha viajou junto com
o canvas, e o porquê ficou escrito ao lado dela.

**Um `revalidatePath` virou dois.** A lista de projetos agora aparece em dois
lugares — os cartões de `/` e as abas de `/studio`. Criar, renomear ou excluir
muda as duas, e invalidar só a rota do `redirect()` deixaria a outra servindo
cache: criar um projeto e voltar pela chama mostraria um dashboard sem ele.

**A chama ⚡ virou navegação.** Era enfeite (`aria-hidden`) enquanto o canvas era
a única tela. Passou a existir um lugar para onde voltar, então ela é o caminho.

#### O que a investigação achou e ainda não foi construído

Três achados que mudam as fases seguintes, registrados agora para não serem
redescobertos:

- **`projects.updated_at` mente.** Medido no banco: a última geração é de
  `12/08 01:28` e o `updated_at` do projeto é de `11/08 19:03`. Gerar não toca a
  linha do projeto. A "data da última atividade" do cartão (Fase 1b) sai do
  `created_at` da geração mais recente, com o do projeto como reserva.
- **O selo de origem da galeria erraria depois da exclusão.** A regra óbvia
  ("sem projeto = folha canônica") quebra assim que a exclusão existir, porque o
  `SET NULL` produz gerações sem projeto que são trabalho de canvas. A diferença
  é limpa no banco: as 3 folhas canônicas têm `project_id` **e** `node_id` nulos;
  as 30 do canvas têm os dois preenchidos. São três casos, não dois.
- **Zero migrations, confirmado item a item.** Capa, contagens, galeria geral,
  selo, saldo e extrato saem todos de tabela, coluna, FK e índice que já existem.

#### 📌 O `SET NULL` da exclusão: provado pela definição no catálogo

A trava que preserva as gerações de um projeto excluído está verificada em
`pg_constraint`: `generations_project_id_fkey … ON DELETE SET NULL`. **É essa a
prova, e é só essa.** Registrado com o placar honesto: as exclusões da D1 e da D2
foram todas de projetos vazios, e o `SET NULL` **nunca disparou ao vivo** — não
há gerações órfãs no banco porque nenhum projeto com gerações foi jamais
excluído. Disparar de verdade custaria apagar o único projeto com trabalho real
dentro, o que não se faz para produzir um print.

Placar honesto vale para prova também: a definição no catálogo é uma garantia do
banco, não um teste que passou.

#### A validação: 12/12, e o único ponto que precisou de outra pessoa

Os dez pontos de toque mais dois extras (`/?p=` digitado à mão e a chama),
todos com print. Zero Spark — o ledger tinha 36 transações antes e 36 depois, e o
projeto descartável que a validação criou e excluiu não deixou geração órfã.

**Um ponto não podia ser meu.** O login exige digitar uma senha, e o Claude não
digita senhas — a regra não tem exceção por conveniência de teste. O "Sair" do
ponto 8 deslogou o navegador, e o Jorge fechou o ponto 6 ao vivo no login
seguinte. Vale como método: quando a prova exige uma credencial, ela é da pessoa,
e o roteiro se organiza para que isso caia no fim em vez de travar o meio.

### 12/08/2026 — 📌 Backlog · Passe de UI/UX 🎨 ciclo próprio, ao final

**Efeitos, microinterações e uma identidade visual mais tecnológica ficam para um
ciclo dedicado, depois que o desenvolvimento funcional terminar.** Decisão do
fundador, e o porquê é o que a torna útil: polir tela a tela, enquanto as telas
ainda estão nascendo, é pagar duas vezes — a primeira num acabamento que o
próximo ciclo vai mexer, a segunda na hesitação de quem para para escolher uma
animação no meio de uma decisão de produto.

Vale também como leitura das telas que este ciclo entrega: o dashboard é
deliberadamente sóbrio. **Não é o estado final, é o estado honesto** — a forma
certa, esperando o acabamento que virá de uma vez, com o produto inteiro à vista
e um vocabulário visual só.

### 12/08/2026 — Fase 1b · o cartão, e duas mentiras de data evitadas

O cartão responde as três perguntas que alguém faz olhando um projeto: **o que
saiu daqui** (a capa, que é a geração bem-sucedida mais recente), **quem trabalha
aqui** e **quando mexi nisto pela última vez**. Nome sozinho não reconhece nada —
"Projeto sem título 3" com a foto da Luna dentro é reconhecível, e sem ela não é.

**A primeira mentira era a coluna.** O achado da investigação se confirmou e
ficou pior do que o registrado: `projects.updated_at` marcava 19:03 do dia 11,
enquanto a última geração era 01:28 do dia 12 **e o último salvamento do canvas
era 02:04**. Ou seja, o sinal mais recente de todos não era gerar — era arrumar
os blocos. A data do cartão é o **maior de três**: salvar o canvas
(`workflows.updated_at`), gerar (`generations.created_at`) e nascer
(`projects.created_at`, o piso, que responde por projeto criado e nunca aberto).

**A segunda mentira era o fuso, e essa apareceu na validação.** A atividade mais
recente é `2026-08-12 02:04 UTC`, que em São Paulo é `11/08 23:04`. O servidor da
Vercel roda em UTC: formatar com o relógio dele faria o cartão dizer **12/08**
sobre um trabalho de terça à noite — um dia que a pessoa ainda não tinha vivido
quando fez aquilo. Por isso `lib/format/date.ts` nasceu com o fuso **explícito** e
num arquivo só: é lá que isso vira preferência de perfil no dia em que houver
usuário fora do Brasil, em vez de num `toLocaleDateString` solto por componente.
O print da validação mostra `11/08/2026` ao lado de um banco que diz `12/08` —
é a prova de que o formatador está fazendo o trabalho dele.

**A contagem conta imagens, não tentativas.** O cartão diz "30 imagens" onde o
projeto tem 47 gerações, e a diferença é deliberada: 30 é exatamente o que a
Galeria daquele projeto mostra. Contar tentativas faria o cartão e a galeria
discordarem em dezessete, e falha ou recusa não é acervo — não é coisa que se
exiba como patrimônio de um projeto.

**Quatro consultas e uma assinatura, independente de quantos projetos existam.**
A alternativa natural — contar e buscar capa por cartão — cresce com a lista e
transforma a tela inicial em dez viagens ao banco. O preço dessa escolha está
escrito em `loadProjectCards`: `generations` é lida inteira, com quatro colunas
pequenas, para ser agrupada em memória. Barato em dezenas ou milhares de linhas,
caro em centenas de milhares — e nesse dia a resposta é uma view que agrupe no
banco, não mais uma consulta na página. Fica registrado para não ser
redescoberto sob pressão.

**Validação:** capa conferida como a **mais recente** por rótulo (a última
geração é "cores orange e black", e é essa que está no cartão, não a "rosa e
azul" anterior); contagens conferidas contra SQL (30 e 7); cartão vazio com
"Ainda sem imagens" num projeto recém-criado. Zero Spark, e o banco de volta a 1
projeto, 50 gerações, 36 transações.

#### ✅ Ratificado pelo fundador (12/08/2026)

Três escolhas da 1b deixaram de ser julgamento do implementador e viraram regra
do projeto:

1. **A contagem conta imagens, não tentativas.**
2. **A data da última atividade é o maior de três sinais** — salvar o canvas,
   gerar, nascer —, nunca `projects.updated_at`.
3. **`lib/format/date.ts` é o caminho único para formatar data ao usuário.**
   Nenhum `toLocaleDateString` novo espalhado por componente: quem precisa
   mostrar data importa daqui. O fuso é uma decisão de produto, e decisão de
   produto mora num lugar só — o extrato da Fase 2b já nasce usando este módulo.

### 12/08/2026 — Fase 1c · as duas ações do cartão, e um número que contava um fantasma

Renomear e excluir saem do hover do cartão, pequenos, no canto — o mesmo gesto
que a aba do canvas já ensinou. Renomear abre o nome no lugar, com Enter e Esc
significando nas duas telas exatamente a mesma coisa.

**Os botões são irmãos do link, não filhos dele.** Um `<button>` dentro de um
`<a>` é HTML inválido e cada navegador resolve o conflito do jeito dele — em
alguns, clicar no botão navega junto. Os controles ficam ao lado do link,
posicionados por cima: o cartão inteiro continua clicável e os dois gestos nunca
disputam o mesmo clique.

**O redirecionamento é necessidade do canvas, não da exclusão.** Quem exclui a
aba aberta está olhando para um projeto que deixou de existir, e a tela precisa
mudar debaixo dele. Quem exclui um cartão está olhando para uma lista: o cartão
some, a lista continua, e mandar essa pessoa para o canvas de outro projeto seria
abrir um lugar que ela não pediu. O `from` no formulário escolhe entre **dois
destinos fixos escritos na action** — o cliente diz de onde veio, jamais para
onde ir, que é a diferença entre uma escolha de origem e um open redirect.

**A confirmação diz as duas metades**, no mesmo formato do diálogo da personagem:
o que se perde é o fluxo (o `workflows` cai por cascata, e com ele os blocos e as
ligações); o que fica são as imagens, o extrato e as personagens. Confirmação que
só pergunta "tem certeza?" testa coragem; esta testa entendimento.

#### O número que contava um fantasma 🐛 achado na validação

O cartão dizia **7 personagens** onde o trilho do projeto mostra **6**. A causa
não estava no cartão: `project_entities` guarda o vínculo, e o vínculo continua
existindo depois que a personagem é arquivada — de propósito, porque ele não
deixa de ser verdadeiro só porque ela saiu do Arsenal. "Natany" está arquivada
neste banco, e era ela.

A correção é o filtro de `loadCharacters`, aplicado à contagem. E a regra que
sai daqui é a mesma que decidiu "imagens e não tentativas" uma fase antes, agora
com dois casos: **o número no cartão conta o que a tela mostra.** Um número que
discorda da tela ao lado não é um detalhe de precisão — é a tela chamando o
usuário de desatento.

#### 📌 Backlog · o número de "Projeto sem título" volta a ser reusado

`nextUntitledName` promete no próprio comentário que "os números só sobem", para
que ninguém reencontre o nome de um projeto apagado de manhã. A promessa vale
enquanto os projetos existem: a exclusão é `DELETE` de verdade, então o nome sai
da tabela e o número volta a ficar livre. Observado três vezes na validação deste
ciclo — criei e excluí "Projeto sem título 1" três vezes, e as três nasceram com
o mesmo nome.

Consequência real e pequena, e por isso fica registrado em vez de corrigido às
pressas: sem `archived_at` em projeto, a única saída honesta é arquivar em vez de
apagar (como já se faz com personagem e produto), e isso é decisão de produto —
não conserto de contador.

### 12/08/2026 — Fase 1 encerrada: o produto ganhou porta da frente

Três fatias, três commits, **nenhuma migration** — como a investigação previu, e
pelo motivo que ela mediu: o dashboard só apresenta o que já existia.

| fatia | o que entrou | como foi provado |
|---|---|---|
| **1a** | `/` vira o vestíbulo, canvas para `/studio?p=`, dez pontos de toque | navegador, **12/12 pontos com print**, zero Spark |
| **1b** | capa, contagens, data da última atividade, estado vazio | prints + conferência cruzada em SQL (capa é a mais recente, por rótulo) |
| **1c** | renomear e excluir no cartão, confirmação que diz o que fica | prints, mais o `DELETE` conferido no banco linha a linha |

**Custo de validação paga: zero.** O ciclo inteiro é apresentação — nenhuma
geração, nenhum débito, e o ledger fechou em 36 transações do primeiro print ao
último.

#### A regra que a fase produziu, com dois casos

**O número na tela conta o que a tela mostra.** Ela nasceu de duas contagens que
teriam mentido de jeitos diferentes:

| o número | contaria | mostraria | por quê é a mesma regra |
|---|---|---|---|
| imagens do projeto | 47 tentativas | 30 miniaturas na Galeria | falha e recusa não são acervo |
| personagens do projeto | 7 vínculos | 6 no trilho do canvas | vínculo sobrevive ao arquivamento, e deve |

Nos dois casos o dado do banco estava certo e a pergunta é que era outra. Um
número que discorda da tela ao lado não é imprecisão — é a interface dizendo à
pessoa que ela contou errado.

#### 📌 Backlog · arquivar projeto em vez de apagar

Hoje excluir projeto é `DELETE`. Trocar por arquivamento resolve três coisas de
uma vez:

1. **O contador dos "sem título"**, que volta a reusar números assim que a linha
   sai da tabela — a promessa de `nextUntitledName` sobrevive se nada sair.
2. **Espelha o desenho que o produto já tem** para personagem e para produto,
   onde arquivar esconde e nunca apaga.
3. **É requisito provável do SaaS**: cliente que apaga projeto por engano é
   suporte, e "restaurar" só existe se houver o que restaurar.

**Nota honesta sobre o achado:** o caso de borda do contador **contradiz a
promessa escrita na D1-Fase 1**. Não é regressão — nada que funcionava parou de
funcionar. É fronteira descoberta depois: a promessa foi escrita pensando em
projetos que continuam existindo, e a exclusão de verdade é o caso que ninguém
tinha exercitado três vezes seguidas até esta validação.

### 12/08/2026 — Fase 2a · a Galeria geral, e uma promessa antiga sendo paga

A Galeria do dashboard é a Galeria do projeto **sem o recorte**. O que entra por
causa disso são as folhas canônicas: geradas no editor da personagem, elas nunca
tiveram `project_id` e por isso não apareciam em galeria de projeto nenhuma.
`listProjectGallery` sempre registrou que ficavam de fora de propósito — "são
identidade, não trabalho deste projeto" — e prometia que continuavam alcançáveis.
**Esta tela é onde a promessa é paga**: 33 imagens aqui contra 30 lá, e a
diferença são exatamente as três.

**O selo tem três casos, e o terceiro nasceu da Fase 1.** Antes dela, "sem
projeto" só podia significar folha canônica, porque nenhum projeto com gerações
jamais fora excluído. A exclusão agora existe, e o `SET NULL` produz gerações sem
projeto que são **trabalho de canvas** — a regra ingênua chamaria de "folha
canônica" uma cena que a pessoa dirigiu. O que separa os dois é o `node_id`: a
folha nasce no editor e nunca teve node; a cena nasce num bloco e carrega o id
dele.

| `project_id` | `node_id` | selo |
|---|---|---|
| preenchido | qualquer | nome do projeto |
| nulo | **nulo** | folha canônica |
| nulo | preenchido | projeto excluído |

**A grade virou um componente só.** Ela morava dentro do seletor de referências;
saiu quando a Galeria geral passou a precisar do mesmo. O argumento é o que o
próprio seletor já tinha escrito sobre fazer a Galeria do projeto um *modo* em
vez de uma segunda tela: *"duas telas iguais menos um botão são duas telas que
vão divergir na primeira vez que alguém mexer em uma delas."* Valia para o modo,
vale igual para a grade.

Ela é **genérica no item** de propósito: quem chama recebe de volta o seu próprio
objeto, com os campos que só ele conhece — a `source` que o seletor grava como
origem, a `origin` que a galeria usa no selo. Uma versão podada obrigaria quem
chamou a reencontrar o item na lista para recuperar o que a grade descartou.

**O layout do grupo nasceu agora, não na 1a.** Um layout com uma página só é
indireção sem ninguém para dividir; ele passa a existir no momento em que existe
a segunda tela — que é também o momento em que repetir o cabeçalho começaria a
criar duas versões dele. O canvas fica fora do grupo e mantém o header próprio: o
dele flutua sobre um plano infinito, e isso é diferença de fundo, não de estilo.

#### O que a validação provou, e o caso que ela não pôde provar

Provado na tela: as 33 imagens com o selo do projeto; as **três folhas canônicas
com o selo "folha canônica"**, que a galeria por projeto esconde; o lightbox
abrindo; e — a regressão que o refactor exigia — o seletor do canvas **nos dois
modos**, navegação e seleção, com a marca de selecionado e o contador intactos.

**Não provado, e por quê:** o selo "projeto excluído" tem **zero linhas** para
exibir. Ele só aparece quando um projeto **com gerações** é excluído, que é
exatamente o caminho que este ciclo decidiu não exercitar ao vivo para não apagar
o único projeto com trabalho real dentro. É o mesmo gatilho do `SET NULL`, e por
isso herda a mesma nota: a regra está numa função só (`originOf`), revisável, e
**a primeira vez que esse selo aparecer será em produção.** Fica dito, em vez de
contado como 3/3.

#### ✅ Ratificado: refactor de componente compartilhado prova os clientes antigos

Os prints 04 e 05 da 2a — o seletor do canvas em **navegação** e em **seleção**,
depois de a grade sair de dentro dele — viram padrão de ritual:

**Ao extrair um componente para compartilhar, a evidência inclui os clientes que
já existiam, não só o novo.** O código novo é o que se está olhando, e por isso é
o que menos precisa de prova; quem quebra num refactor é sempre a tela que
ninguém abriu porque "só mudou de lugar". Um print por cliente e por modo.

### 12/08/2026 — Fase 2b · a Conta, e o extrato que fecha com a carteira

Saldo em destaque e o extrato do ledger, **só leitura** — e a ausência é o
conteúdo: não há recarga nem pagamento porque não existe billing no produto. Uma
tela que oferecesse "comprar mais" sem ter para onde levar o clique seria pior do
que uma que informa e cala.

**O saldo e o extrato vêm de lugares diferentes de propósito.** O número grande é
`wallets.balance_cents`; as linhas são `ledger_transactions`. A carteira é
**projeção** do ledger, mantida por trigger — mostrar os dois lados na mesma tela
é o que permite alguém notar, um dia, que discordam. Se isso acontecer, o errado
é o saldo, e a verdade é a lista embaixo dele.

**Cursor, não `offset`.** O ledger cresce pela frente, então paginar por posição
faria uma transação nova empurrar tudo para baixo no meio da leitura e a mesma
linha apareceria duas vezes. Num extrato, linha duplicada não é incômodo visual —
é alguém achando que pagou duas vezes. O cursor tem a fraqueza simétrica (duas
linhas no mesmo instante ficam na fronteira), e ela foi medida antes de ser
aceita: 36 transações, 36 instantes distintos, zero repetição, porque cada débito
nasce de uma requisição própria. Se um dia houver gravação em lote, a saída é
ordenar por `(created_at, id)` — não voltar para offset.

**O sinal é explícito nos dois lados.** "50" sozinho não diz se entrou ou saiu, e
a cor não pode ser a única a dizer.

#### A validação que a própria tela fez

A prova mais forte não veio de comparar com SQL, e sim de somar o que estava na
tela: carregadas as **36 linhas**, elas somam **7.700 Sparks** — exatamente o
número grande em cima e exatamente `wallets.balance_cents`. Projeção e verdade
concordando, verificado pela interface.

Conferido também o fuso, de novo e agora com dinheiro: a transação mais recente é
`12/08 01:28 UTC` e a tela diz **11/08, 22:28**. Um extrato que datasse a
cobrança no dia seguinte seria a pior versão possível do erro que a 1b evitou.

### 12/08/2026 — Ciclo Dashboard encerrado: o produto tem porta da frente

| fase | o que entrou | como foi provado |
|---|---|---|
| **1a** | `/` vira o vestíbulo, canvas para `/studio?p=` | 12/12 pontos de navegação com print |
| **1b** | capa, contagens, data da última atividade | prints + conferência cruzada em SQL |
| **1c** | renomear e excluir no cartão | prints, mais o `DELETE` conferido linha a linha |
| **2a** | galeria geral, selo em três casos, grade compartilhada | prints, **incluindo a regressão dos clientes antigos** |
| **2b** | saldo e extrato | as 36 linhas da tela somando o saldo da tela |

**Cinco fatias, cinco commits, nenhuma migration, zero Spark.** A previsão da
investigação se manteve do primeiro ao último dia: o dashboard só apresenta o que
já existia, e apresentar não precisou de nenhum conceito novo no banco.

#### As quatro regras que o ciclo deixa

1. **O número na tela conta o que a tela mostra** — imagens e não tentativas,
   personagens visíveis e não vínculos.
2. **Formatar data ao usuário passa por `lib/format/date.ts`**, com fuso
   explícito. Duas mentiras de data foram evitadas por isso, e uma delas era
   sobre dinheiro.
3. **Refactor de componente compartilhado prova os clientes antigos.** O código
   novo é o que menos precisa de prova; quem quebra é a tela que ninguém abriu
   porque "só mudou de lugar".
4. **Reconciliação da Conta: saldo e extrato vêm de fontes distintas de
   propósito — e se discordarem, o errado é o saldo.**

   O número grande é `wallets.balance_cents`; as linhas são
   `ledger_transactions`. Seria mais simples somar o ledger e mostrar um número
   só, ou confiar na carteira e nunca listar nada — e as duas simplificações
   custariam a mesma coisa: **ninguém jamais notaria uma divergência.** A
   carteira é projeção mantida por trigger, o ledger é append-only e é o
   registro primário; mostrar os dois na mesma tela é o que transforma um bug de
   saldo em algo que se enxerga em vez de algo que se descobre por reclamação.

   A direção da regra importa tanto quanto ela: **não se conserta o extrato para
   bater com o saldo.** Corrigir dinheiro é transação nova de estorno
   (invariante 5), nunca reescrever o que já foi registrado.

   Provado nesta fase pela própria interface: as 36 linhas da tela somam 7.700
   Sparks, que é o número grande em cima delas.

#### O que fica sem prova, dito em vez de contado

Dois caminhos deste ciclo **nunca rodaram ao vivo**, e os dois têm o mesmo
gatilho — excluir um projeto que tenha gerações:

- o `ON DELETE SET NULL` de `generations.project_id`, provado pela definição em
  `pg_constraint`;
- o selo **"projeto excluído"** da galeria, que tem zero linhas para exibir.

A primeira vez que qualquer um dos dois aparecer será em produção, com dado real.
Está escrito aqui para que, quando acontecer, ninguém precise descobrir de novo
que era esperado.

---

### 13/08/2026 — Ciclo Fila de Gerações: a orquestração fica no cliente, e o cartão se inverte

**A decisão: fila no cliente (opção A), sem migration.** O node dispara as requisições ao Route Handler que já existe, controla os estados localmente e respeita o teto. A alternativa investigada era uma tabela de jobs no banco, com trabalhador — "o padrão completo que o vídeo usaria".

**Por que A, com os custos na mão.** As duas regras mais delicadas da fila **já eram verdade do lado do servidor**, e por isso a A não escreve uma linha nova no caminho do dinheiro: `record_generation` é chamado no passo 11 de `runCanvasGeneration`, **depois** de a imagem existir, e a conferência de saldo roda no passo 5 de **toda** requisição. Se a fila só dispara o `fetch` quando o slot entra em execução, "débito por imagem no início da execução" e "saldo conferido de novo quando o trabalho sai da fila" saem de graça. A fila fica sendo o que ela é: **intenção**. O fato continua onde já estava.

A B custaria, em ordem: migration e refatoração do caminho do dinheiro (`generations` é somente-leitura para o usuário, e a cobrança deixaria de ser um `INSERT` atômico para virar `UPDATE` + ledger); um trabalhador que não existe (Vercel não tem daemon — sobrariam cron de granularidade de um minuto, pg_cron + pg_net com segredo novo, ou serviço externo); trava de concorrência; coletor de jobs travados. E o retorno para a v1 seria **um item**: a fila sobreviver à aba fechada — que vale menos do que parece, porque a pessoa fechou a aba e não está olhando.

**A correção do briefing, registrada como o fundador pediu.** O ciclo foi proposto como "o esqueleto assíncrono que o vídeo vai herdar". **A parte que o vídeo herda não é uma fila-com-worker.** A invariante 1 já descreve o caminho do vídeo, e nele **o trabalhador é o provedor**: rota cria `queued` → job no provedor **com webhook de retorno** → webhook atualiza e ingere → Realtime propaga. Ninguém varre tabela; o provedor telefona de volta. Construir a fila-com-worker agora seria construir um **segundo** mecanismo assíncrono, paralelo ao que o vídeo vai usar — mais frente de vídeo, não menos.

O que o vídeo de fato herda deste ciclo é a **maquinaria da tela**, e ela é **agnóstica de transporte**: caixinhas com estado próprio, escalonador com teto, botão que não trava, recuperação do estado real lendo do banco. No dia do vídeo troca-se `fetch → resposta` por `fetch → linha queued → webhook → Realtime`, e a tela não muda uma linha.

**As três decisões do fundador sobre a fila:**

1. **Profundidade 16 = a grade**, contando trabalhos **vivos** (esperando + executando). Histórico não consome vaga: entra depois e transborda para o "Ver todas". Tudo-ou-nada por clique — uma quantidade 3 que virasse 2 em silêncio seria a mesma mentira do meio-produto.
2. **Barra indeterminada**, com o texto de 20–40s dizendo a verdade que temos. O provedor não emite progresso, e uma barra parada em 90% é uma frase falsa desenhada.
3. **Legenda do "Usar no fluxo" sob demanda**, no clique. Dezesseis miniaturas por bloco pagariam duas consultas cada para responder uma pergunta que quase nenhuma delas recebe.

**Duas mudanças de spec, decididas pelo fundador** (aplicadas em `nodes-geracao.md`):

- **A moldura de 4 slots se aposenta.** O estado por imagem não sumiu — mudou de lugar, para a grade. A moldura ficou com o que só ela faz bem: uma imagem grande o bastante para se julgar.
- **O Resultado deixa de nascer sozinho.** O canvas é o desenho do fluxo, não o arquivo das tentativas; o cartão virou ato deliberado ("Usar no fluxo"), idempotente por asset.

**E um efeito colateral que vale mais do que parece: gerar deixou de alterar o documento.** Com a coluna de resultados lendo do banco, o bloco não grava mais no grafo o que produziu — uma imagem nova não marca o canvas como sujo nem dispara autosave. O canvas só muda quando alguém mexe nele.

#### 📌 Backlog · remover o campo legado `lastAssetIds` do node gerador

**Hoje:** declarado em `GeneratorNodeData`, **não escrito** por ninguém, e ainda apagado por `duplicateNode` para o clone não herdar o resultado do original. O mesmo vale para `lastGenerationIds`, `lastAssetId` e `lastGenerationId`.

**Por que continua lá:** grafos salvos carregam os quatro campos, e a limpeza no clone é o único código que ainda precisa saber que eles existem. Apagar a declaração hoje custaria mais do que compra — o campo não é lido para desenhar nada, então não há como ele mentir na tela.

**Critério de saída** *(reescrito em 13/08/2026, na Fase 3 da Frente Vídeo)*: o primeiro ciclo que **editar `GeneratorNodeData`**. Aí a remoção é uma linha a mais num trabalho que já estava aberto, em vez de uma migração de dados só para si mesma. Enquanto isso, o comentário no tipo diz que são legado e por quê.

*Por que a redação mudou:* o critério dizia "tocar o schema do node", e a Fase 3 do vídeo **tocou o schema do node** — criando `VideoGeneratorNodeData`, um tipo novo, sem encostar em `GeneratorNodeData`. Pela letra, a limpeza venceria; pela economia que o critério descreve ("uma linha a mais num trabalho já aberto"), não venceria nada: fazê-la ali seria abrir um trabalho no gerador de imagem **só** para isso, que é exatamente a migração avulsa que o critério existe para evitar. **O critério estava certo e a redação estava larga** — "o schema do node" abrange nodes que o campo legado nem conhece.

#### 📌 Backlog · o seletor de formato não cabe na meia-coluna (medido)

Descoberto na harmonização do bloco, 13/08/2026, e **anterior a ela**.

A opção mais longa do seletor de **formato** — "Instagram Feed · Retrato · 4:5" — mede **161px**. O campo oferecia **135px** de texto antes da harmonização e passou a oferecer **131**. Faltavam 26; faltam 30. Devolver ao bloco a largura inteira levaria a falta para 21, que continua sendo falta: **o campo é curto demais nas três configurações**, então os 16px foram para onde mudam o que se vê (a moldura e as miniaturas).

Não é urgente porque a opção selecionada trunca com reticências e o menu aberto mostra o texto inteiro — ninguém fica sem a informação, fica sem ela *de relance*.

**O conserto é dar a linha inteira ao formato**, como o modelo já tem. Isso reorganiza a grade de configuração (formato sozinho, estilo e qualidade lado a lado, quantidade sobrando) e muda a altura do bloco — **é trabalho do Passe de UI/UX**, não de uma harmonização que se propôs a mexer só em larguras.

#### A fila, validada — e um item provado por estrutura *(13/08/2026)*

**Grátis, por mim:** o teto contando imagens entre trabalhos (4 barras + 2 pontinhos depois de três disparos reconfigurando entre eles), a fila cheia comunicando antes do clique (16 vivas, botão cinza, frase), seis recusas sem nenhuma derrubar as outras, e **a não-contaminação de forma estrita** — gravador de corpos zerado *antes* da troca do prompt, com dois slots ainda na fila: só saiu o texto congelado. **59 chamadas à rota, 0 `record_generation`, saldo intacto.**

**Pago, pelo Jorge:** retrato congelado com três configurações distintas conferidas no "Ver Prompt", débito por imagem **executada** no extrato, recusa no meio da fila sem derrubá-la, e a inversão do cartão.

**Um item ficou provado por estrutura, e o motivo importa mais que o item.** "Saldo estourando no meio da fila" é impraticável ao vivo com 7.600 ⚡ — seriam mais de cem imagens pagas para chegar ao zero. **A saída óbvia seria ajustar a carteira à mão, e ela foi recusada:** `wallets.balance_cents` é projeção mantida por trigger sobre um ledger append-only, e mexer no número quebraria exatamente a reconciliação que a tela de Conta acabou de estabelecer (as 36 linhas somando o saldo). *Trocar uma prova por um dado inventado no lugar onde o produto guarda dinheiro é um mau negócio, mesmo quando o dado é temporário.*

O que sustenta o item no lugar da prova ao vivo: a conferência de saldo é o **passo 5 de `runCanvasGeneration`**, roda em **toda** requisição e não foi tocada por este ciclo — e o caminho de "slot recusado sem lançamento, fila segue" foi exercitado **seis vezes** no teste grátis, por outro motivo de recusa. O que não foi exercitado é o código de recusa; é a **causa** dela.

---

### 13/08/2026 — Ciclo Fila de Gerações encerrado: o botão parou de travar

| fase | o que entrou | como foi provado |
|---|---|---|
| **1** | moldura única + grade de 16, a caixinha como visual da fila, inversão do cartão | 6 evidências minhas, zero Spark |
| **2** | harmonização — bloco 42rem, coluna de resultados 291px, divisor vertical | 2 evidências + medições por JS |
| **3** | a fila: store efêmero, retrato congelado, escalonador, teto e profundidade | 3 evidências minhas (59 chamadas, 0 cobranças) + roteiro pago do Jorge |
| **4** | Realtime: o banco avisa a tela, e o reload no meio se recupera | canal `SUBSCRIBED` por mim; entrega provada pelo Jorge |

**Quatro fases, quatro commits, nenhuma migration.** A previsão da investigação se manteve do primeiro ao último dia.

#### As cinco regras que o ciclo deixa

1. **Fila é intenção; ledger é fato.** Já é emenda da invariante 5. O débito acontece quando a imagem entra em execução, e o saldo é conferido de novo na vez de cada trabalho — as duas coisas já eram verdade do lado do servidor, e o trabalho foi **não atrapalhá-las**, não inventá-las.
2. **O canvas é o desenho do fluxo, não o arquivo das tentativas.** Por isso a geração deixou de nascer como cartão. E o efeito colateral vale a regra inteira: **gerar deixou de alterar o documento.**
3. **Estado transitório não mora no documento nem no componente.** No documento vira arquivo de ontem (autosave); no componente morre na troca de aba, com trabalho em voo ainda cobrando — cobrado e invisível é o pior estado possível.
4. **Quando a animação é a informação, removê-la remove a informação.** A regra global de `prefers-reduced-motion` apagava a barra de "gerando" para fora da caixa. Sem movimento, mas presente.
5. **O que falha em silêncio ganha uma linha de log.** Vale para o canal Realtime e para qualquer peça cujo mau funcionamento seja indistinguível de não existir.

#### Três coisas ditas em vez de contadas

- **"Saldo estourando no meio da fila"** ficou provado por estrutura, e a recusa de ajustar a carteira à mão está registrada acima, com o motivo.
- **O caso "cabe, mas não este clique inteiro"** — a outra frase do tudo-ou-nada — nunca apareceu ao vivo: os slots terminam em grupos de quatro e não consegui segurar a fila em 13–15 vivas de propósito. É a mesma função do "fila cheia", com outro número.
- **O seletor de formato trunca desde antes deste ciclo**, e a harmonização o piorou em 4px de propósito, com os números medidos. Conserto no Passe de UI/UX.

#### Emenda de ritual: conferir de quem é a porta 3000

Nasceu de um achado da Fase 4. Um `next dev` **sobrevivente** de uma etapa anterior continuava ouvindo a 3000; o `npm run dev` novo viu a porta ocupada, subiu na 3001 e **morreu** avisando — e o navegador, apontado para a 3000, teria validado o código antigo com toda a aparência de estar validando o novo.

**Um servidor velho valida o que não vai ser commitado** — e falha do jeito mais caro possível, porque a validação *passa*. Entrou na Regra 8 do `CLAUDE.md`: antes de toda validação no navegador, conferir quem está na 3000 e matar o sobrevivente.

---

## Frente Vídeo — Ciclo 1: o motor assíncrono

> O ciclo que faz a invariante 1 deixar de ser promessa. Imagem é a exceção medida
> (cabe no `maxDuration`); vídeo não cabe, e é aqui que fila → webhook → Realtime
> deixa de ser desenho e vira código. Um modelo só: Kling image-to-video, 5
> segundos, na configuração mais barata. **Erro barato primeiro.**

### 13/08/2026 — Fase 0 · a chave provada sem gastar um centavo

O probe é o endpoint de status da fila perguntando por um `request_id` que não
existe. Nada é gerado, então nada custa — e a resposta é lida por
**triangulação**, que é a diferença entre "recebi um 404" e "a chave foi aceita":

| chamada | resposta |
|---|---|
| sem chave | `401 {"detail":"Authentication is required"}` |
| chave falsa | `401 {"detail":"invalid key credentials"}` |
| **nossa chave** | **`404 {"status":"NOT_FOUND"}`** |

Um 404 sozinho poderia ser rota errada. Um 404 onde as outras duas dão 401 é a
fal dizendo *"eu sei quem é você, mas esse trabalho não existe"*. É o método de
sabotagem de 08/08 aplicado à conectividade: **o que prova o caminho feliz são os
caminhos tristes ao lado.**

**Quatro achados que valem mais que o placar:**

1. **O path de `requests/` usa o app base id, não o endpoint versionado.** Medido:
   `queue.fal.run/fal-ai/kling-video/requests/<id>/status` responde 401 (shape
   certo), e `…/kling-video/v2.1/standard/image-to-video/requests/…` responde
   **405**. Ou seja, a URL óbvia é a errada. Daí a regra que virou código:
   **guardar `status_url`/`response_url` como a fal devolve, nunca construir.**
   Montá-las a partir do slug funcionaria em todo lugar menos onde importa, e a
   reconciliação quebraria em silêncio — sintoma de node parado para sempre,
   causa de uma string.
2. **Nenhuma dependência nova.** O Node 22 importou as duas chaves Ed25519 reais
   do JWKS com `crypto.createPublicKey({format:'jwk'})` e o `crypto.verify(null,…)`
   aceitou assinatura boa e recusou adulterada. Nada de libsodium.
3. **A fal publica o `x` do JWKS em base64 padrão (com `=`), e o import de JWK
   exige base64url.** Sem normalizar, `createPublicKey` falha. É o tipo de detalhe
   que só aparece com a chave real na mão, e teria custado uma hora na Fase 2.
4. **15 faixas de IP** capturadas de `api.fal.ai/v1/meta`. Registradas, não usadas:
   a lista muda e a fechadura é a assinatura.

**O que a Fase 0 não provou, dito em vez de contado.** O caminho do **403 — conta
travada por saldo mínimo da fal**, que é o erro nomeado do briefing — está mapeado
e tem veredito próprio no probe, mas **nenhum 403 apareceu**. Isso prova que a
conta está destravada hoje, não que sabemos tratá-lo. Exercitá-lo exigiria drenar
o saldo da fal, o que não se faz para produzir uma linha de log. Mesmo precedente
do `ON DELETE SET NULL` do Ciclo Dashboard: **caso conhecido, não exercitado.**

Evidências em `scratchpad/evidencias/video-fase0/`. Custo: **zero**.

---

### 13/08/2026 — Fase 1 · os 5 segundos são fato de catálogo, não constante de tela

**A decisão.** `ai_model_video_prices` não tem linha de 10 segundos — e a ausência
*é* a funcionalidade. Sem preço, a duração não é oferecível nem cobrável.

Ela herda o segundo papel que a tabela de imagem já tinha e que é o mais
importante: **é o catálogo que diz o que um modelo oferece, porque não se oferece
o que não se sabe cobrar.** A alternativa seria um `DURATION = 5` no componente,
com o banco aceitando 10 caso alguém mandasse — a trava moraria no lugar onde ela
é uma lembrança, em vez de no lugar onde é uma regra. Destravar 10s depois é uma
linha de SQL, não um deploy.

---

### 13/08/2026 — Fase 1 · a tabela de vídeo guarda `real_cost_cents` e a de imagem não

**Não é inconsistência, é a natureza do que cada provedor cobra.** O Google cobra
por imagem **e** por token, então lá o custo real é uma conta feita em
`lib/ai/pricing.ts` a partir do que a resposta reportou. A fal cobra **por segundo
de vídeo**, de forma determinística: o custo é um fato tão fixo quanto o preço.

Guardá-lo na linha de preço é o que faz a margem ser conferível **linha a linha
contra a fatura**, sem depender de contagem nenhuma — que é exatamente para o que
`cost_real_cents` existe desde a Fase 0, e o que permitiu calibrar o Sonnet de 10
para 20 ⚡ com dados em vez de chute.

**Preço semeado: 210 ⚡**, pela régua da casa (US$ 0,28 × 550 × 1,35, arredondado
a 5 → 207,9 → 210), com `real_cost_cents = 154`.

> ⚠️ **Divergência registrada, a ser arbitrada pela fatura.** A página do modelo
> diz, na caixa de pricing, *"For 5s video your request will cost $0.28"*; o readme
> da **mesma página** diz *"5-second video: $0.25"*. O seed segue a caixa de
> pricing. **A Fase 4 arbitra contra a fatura real e o veredito é registrado aqui** —
> se disser 0,25, o preço muda por migration, como o do Sonnet mudou.

---

### 13/08/2026 — Fase 1 · saldo que acaba durante a geração marca `failed` sem cobrar e sem entregar

**O caso.** O saldo é conferido na submissão, mas o Kling leva de um a três
minutos. Se o usuário gastar tudo nesse intervalo, a cobrança não cabe quando o
vídeo fica pronto.

**A decisão, e ela é sobre a forma de falhar, não sobre o valor.** Este caso
**não levanta exceção**. Levantar desfaria a transação inteira, a linha ficaria
`running`, o webhook responderia 500 — e a fal reentregaria **31 vezes** para
receber o mesmo erro. O resultado seria um node preso para sempre e trinta e uma
tentativas para não chegar a lugar nenhum.

Então a função marca a linha como `failed` com o motivo escrito, não cobra, e
retorna normalmente — o webhook responde 2xx e a fal para. **O vídeo existe do
lado da fal e foi pago por nós; o usuário não recebe nem paga.** É a doutrina de
09/08 aplicada ao assíncrono: *"cobrança que falha derruba a imagem junto — ninguém
fica com algo que acabou de ser informado que não podia ter"*, agora com a nota de
que quem come o custo somos nós.

É raro **por construção**: é justamente para isso que o saldo é conferido na
submissão. E é honesto quando acontece, que é mais do que um 500 silencioso seria.

---

### 13/08/2026 — Fase 1 · o que o banco ganhou, e o que ele já tinha

**Quase tudo já estava aqui, e não foi sorte.** A Fase 0 escreveu `generations`
para o vídeo antes de existir imagem — o comentário da tabela diz, desde 07/08,
palavra por palavra: *"a server route creates the row as queued, the provider
webhook updates it, and Realtime pushes the status to the canvas."*

| Já existia | Nasceu agora |
|---|---|
| `provider_job_id` e seu índice | o índice virou **único** (idempotência) |
| `generation_status` com `queued`/`running` | `media_kind` (image/video) |
| `assets.kind = 'video'`, `assets.duration_ms` | `ai_model_video_prices` |
| `ledger_transactions.generation_id` | provedor `fal` + modelo Kling 2.1 |
| Realtime já publicando `generations` | as três funções `VD001`–`VD007` |

**A cobrança se parte em duas funções porque o vídeo é assíncrono.**
`submit_video_generation` cria a linha `queued` **antes** de a fal ser chamada e
não cobra nada — a doutrina do motor de extração (*"foto registrada antes da
chamada"*) e a invariante 5 do Ciclo Fila (*fila é intenção, ledger é fato*) dizem
a mesma coisa aqui. `complete_video_generation` é quem cobra, e só quando existe
vídeo.

**A idempotência é `for update`, não convenção** — e o detalhe importa: a trava
serializa entregas **simultâneas**, não só repetidas. Sem ela, duas entregas
concorrentes leriam `running` ao mesmo tempo e escreveriam **dois débitos pelo
mesmo vídeo**, num livro append-only onde a correção é um estorno e não um DELETE.

**E é o primeiro uso da service role neste produto.** O webhook chega sem sessão
nenhuma, então `auth.uid()` é nulo e o `user_id` vem da própria linha. Conceder
essa função a `anon` deixaria qualquer um marcar uma geração como concluída, então
o `EXECUTE` é revogado de todos e devolvido só à `service_role`. É o uso que a
invariante de segurança 2 sempre previu: exclusivamente em código de servidor.

**Ordem de aplicação: segura antes do código, e isso foi medido.** Tudo é aditivo,
a coluna tem default, e nada que já roda alcança o que nasceu. **Não há aqui a
armadilha do `GN006`** — na Etapa D2 um backstop de banco teria subido antes da
checagem da aplicação e virado a única checagem, no pior lugar possível. Aqui não
existe trava que possa disparar sobre caminho existente.

**Conferido no banco depois de aplicada:** catálogo e seed corretos, `media_kind`
com default e **55/55 linhas antigas como `image`**, o índice antigo **removido**
(há exatamente um índice sobre `(provider, provider_job_id)`, e ele é `UNIQUE`),
RLS ligada com política só de `SELECT`, trigger de capability instalado, as três
funções `security definer` com `search_path` vazio — e os perfis certos:
`submit`/`attach` para `authenticated`, **`complete` só para `service_role`**.
As duas peças novas batem **byte a byte em forma** com as irmãs de imagem já
auditadas, o que confirma que o `service_role` que aparece nas concessões é o
default do Supabase e não algo introduzido aqui.

---

### 13/08/2026 — Não existe `FAL_WEBHOOK_SECRET` 🔁 correção de documentação

A variável estava em `arquitetura.md` §6 e era citada **nominalmente na regra 5 de
segurança do `CLAUDE.md`**, descrita como *"segredo gerado por nós"*. Ela foi
escrita antes de alguém ler a mecânica da fal.

**A fal não oferece segredo compartilhado: ela assina.** Cada entrega traz
`X-Fal-Webhook-Signature` (ED25519) sobre `requestId \n userId \n timestamp \n
hex(sha256(corpo bruto))`, verificável contra o JWKS público deles. A regra 5 pede
"assinatura **ou** segredo compartilhado", então nada na postura muda — só a frase
que descrevia como.

Corrigida nos dois arquivos pelo precedente do `config/models.json`: **uma
instrução errada no arquivo lido em toda sessão não é documentação velha, é uma
armadilha** — e essa em particular mandava conferir uma variável que ninguém
poderia criar.

No lugar dela nasce **`FAL_WEBHOOK_URL`**, e ela é variável em vez de derivada do
request por um motivo: derivá-la do `x-forwarded-host`, como o `siteOrigin()` da
autenticação faz, produziria `http://localhost:3000` em desenvolvimento — uma URL
que a fal nunca alcança, e que falharia **em silêncio**, com o trabalho enfileirado
e nenhum retorno. Sendo variável, a ausência é detectável e a submissão é recusada
antes de gastar.

---

### 13/08/2026 — O bypass da Vercel é ponte, não solução 📌 registrado

**Medido pelo MCP da Vercel, e é maior do que "webhook não alcança localhost":** o
projeto está com *Vercel Authentication* em `all_except_custom_domains` e **não
tem domínio customizado** — os três domínios são `*.vercel.app`. Ou seja, **a
produção também não alcança**: a POST da fal receberia a tela de login da Vercel, e
o Route Handler nunca rodaria. E como a fal trata `3xx` como **falha permanente sem
retry**, nem as 31 tentativas salvariam.

A ponte é o **Protection Bypass for Automation** — o método que a documentação da
Vercel indica literalmente para *"webhook URL verification for third-party
services"* —, com o segredo como query param da `FAL_WEBHOOK_URL`. Ele **não é a
fechadura**: passa só pela borda da Vercel, e o endpoint continua exigindo a
assinatura ED25519. É por isso que esse segredo pode viver numa URL guardada no
sistema de outra empresa, e é por isso que ele não poderia ser a única defesa.

> **Quando `creatortkslabs.com.br` for plugado na Vercel, o bypass deixa de ser
> necessário por natureza** — a proteção é `all_except_custom_domains`, e um
> domínio customizado simplesmente não passa por ela. Fica registrado para que
> ninguém, naquele dia, herde um parâmetro de URL sem saber por que ele existia.

Em desenvolvimento a resposta é outra e é um túnel (`cloudflared tunnel --url
http://localhost:3000`), porque nenhum bypass faz a internet alcançar uma porta
local.

---

### 13/08/2026 — `@` recusado no node de vídeo, com gancho de volta 📌 decidido

O Kling image-to-video recebe **uma** imagem, e ela já é a personagem. Uma menção
anexaria uma segunda folha que não tem para onde ir, então o node recusa `@` com
mensagem clara em vez de aceitar e ignorar — silenciar uma menção seria cobrar por
uma geração que não fez o que a frase pedia.

**O gancho, escrito agora para não depender de lembrança:** se a Fase 4 mostrar
**deriva de rosto** no vídeo em relação à imagem de entrada, *"a menção contribui
só o texto de identidade"* volta como candidato de ciclo próprio. O critério é
falsificável e o dado aparece na primeira geração real.

---

### 13/08/2026 — 📌 Backlog · Imagem via fal — comparativo de rotas

Gerar **imagem** pela fal (ex.: Nano Banana pela fal) para comparar qualidade,
latência e custo contra a API direta do Google. Hoje a Decisão 2 manda pegar direto
na fonte quando há conta de desenvolvedor viável, e o Google tem; o comparativo
existe para que essa escolha continue sendo uma decisão medida em vez de uma
herança.

**A estrutura já responde, e isso foi conferido em vez de suposto.** A "rota
discreta do provedor" que o adendo do ciclo pedia **já existe**: `ai_providers.slug`
(`google`, `fal`) é a rota, e `findImageProvider(providerRow.slug)` já resolve o
adaptador por ela. O mesmo modelo por duas rotas seriam **duas linhas em
`ai_models` sob providers diferentes** — o que funciona hoje, sem coluna nova.
Nenhuma migration foi feita para isso, de propósito.

**O que faltará naquele dia é só a tela:** dois modelos com o mesmo `display_name`
e providers diferentes ficariam indistinguíveis no seletor. É problema de
`display_name`, não de schema, e fica anotado aqui para não ser redescoberto como
se fosse de banco.

---

### 13/08/2026 — Fase 2 · o laço fechou, e uma cobrança para três entregas

**A validação em uma linha:** uma geração de 5s, entregue três vezes (a real mais
duas reentregas em paralelo), produziu **um lançamento, um asset e um arquivo**.

| | |
|---|---|
| enfileirada em | 5,17s · saldo **intocado** em 7.375 |
| linha logo após | `running` · `sparks_charged 0` · `lançamentos 0` |
| webhook | ~60s · assinatura válida · Next respondeu **200** |
| geração no provedor | 1m31s |
| resultado | `video/mp4` · 4,30 MB · `ftypisom`/`isomiso2avc1mp41` (H.264 real) |
| cobrança | 210 ⚡ · custo real 154 ¢ · **margem 1,36×** |
| saldo | 7375 → 7165, exatamente −210 · lançamentos 41 → 42, exatamente +1 |

**O achado da Fase 0 confirmado pelo provedor real, e é o que mais valeu.** A
`status_url` que a fal devolveu — e que nós guardamos em vez de construir — é:

```
https://queue.fal.run/fal-ai/kling-video/requests/019ffcab…/status
                      ^^^^^^^^^^^^^^^^^ app base id, não o endpoint versionado
```

Construí-la a partir do slug do modelo é o caminho óbvio, é o que qualquer um
escreveria, e responde **405**. A reconciliação existiria e nunca funcionaria; o
sintoma seria um node parado para sempre e a causa, uma string.

---

### 13/08/2026 — Fase 2 · a idempotência tem dois casos, e só um é fácil

Provada duas vezes, de propósito, porque **são dois mecanismos vistos de ângulos
diferentes** e nenhum dos dois cobre o outro.

**Reentrega em linha terminal** — o caso das 31 tentativas da fal depois de um
trabalho concluído. Reenviei o webhook capturado **duas vezes em paralelo**, com
a assinatura genuína, 55s depois da entrega real: as duas voltaram
`{"ok":true,"outcome":"already"}`, e o banco terminou com um lançamento e um
asset. Fácil, porque a linha já acabou e a saída antecipada é uma leitura.

**Disputa em linha viva** — o caso difícil, e o que de fato custa dinheiro. Duas
conexões reais, A segurando a trava sem commitar e B chegando com o trabalho
ainda `running`:

```
b_esperou_na_trava ...... 15,54s  ✓
a_primeira_ganhou ....... sim ✓   (a mensagem gravada é a da entrega A)
lancamentos_no_ledger ... 0
saldo ................... 7165 -> 7165
```

**Os 15,54s são a evidência, não o placar.** Se B tivesse voltado em
milissegundos, as duas transações teriam rodado juntas e os números finais
poderiam estar certos por sorte. Sem o `for update`, as duas leriam `running` ao
mesmo tempo, as duas decidiriam cobrar, e o mesmo vídeo geraria **dois débitos**
num livro append-only onde a correção é um estorno e não um DELETE.

**O teste roda no caminho de falha de propósito.** Falha não escreve no ledger,
então ele não mexe em dinheiro e não deixa lançamento para estornar — e o portão
é o mesmo nos dois caminhos, conferido no banco por
`position('for update') < position('insert into ledger_transactions')`. Testar o
caminho pago exigiria sujar permanentemente o lugar onde o produto guarda
dinheiro para provar algo que a ordem das linhas já garante.

E a linha sintética **é apagada** ao final, não arquivada. Personagem e produto se
arquivam porque outras linhas apontam para elas; aqui não aponta nada (falha não
tem asset nem lançamento), então apagar é completo. O motivo positivo é a regra do
Ciclo Dashboard: **o número na tela conta o que a tela mostra** — uma tentativa de
vídeo inventada ficaria para sempre no histórico do projeto e no cartão.

---

### 13/08/2026 — Fase 2 · o bug que a sabotagem achou: "b-locked"

A bateria de 34 verificações rodou antes de qualquer geração paga, com chave
Ed25519 própria e o `fetch` interceptado servindo um JWKS — **código de produção
inteiro no caminho**, inclusive a normalização de base64, exercitada de propósito
publicando o `x` em base64 padrão com `=`, como a fal faz.

Ela derrubou uma verificação na primeira execução, e o defeito era real:
**`"blocked by safety policy"` era classificado como conta travada**, porque o
marcador `"locked"` casa dentro de **b-locked**. A tela mandaria avisar o
administrador quando o conserto era reformular a cena.

Corrigido com fronteira de palavra (`/\blocked\b/`) e travado com três asserções
que têm de valer **juntas**: `blocked` → recusa, `account locked` → conta,
`top up` → conta. Uma fronteira que consertasse o falso positivo às custas do
verdadeiro seria a mesma classe de erro pelo outro lado.

É a terceira ocorrência do mesmo padrão neste projeto, depois do
`"reference image image 1"` de 10/08 e dos dois bytes NUL de 11/08:
**nenhum typecheck pega, e é o argumento inteiro a favor de verificações que
comparam texto de verdade em vez de estrutura.**

No mesmo passe, as **duas** listas de recusa que eu tinha escrito — uma no motor,
outra no adaptador — viraram uma só, exportada. Duas seriam duas chances de a
mesma recusa ser lida de dois jeitos conforme a porta por onde chegou.

---

### 13/08/2026 — Fase 2 · a fechadura provada pela internet, de graça

Antes de existir dinheiro no jogo, três POSTs forjados de fora contra o endpoint
público, pelo túnel:

| tentativa | resposta | motivo no log |
|---|---|---|
| sem cabeçalho de assinatura | **401** | `missing_headers` |
| assinatura forjada | **401** | `bad_signature` |
| timestamp de 2001 | **401** | `stale_timestamp` |

Nenhum tocou o banco, cada um nomeou a própria causa, e a rota respondeu em
15–29ms. Fecha a cadeia inteira — internet → Cloudflare → Next → rota → fechadura
— sem gastar um Spark.

**O motivo vai para o log e nunca para a resposta.** Quem está sondando não
precisa saber se errou o relógio ou a chave; quem está investigando uma entrega
legítima recusada precisa saber exatamente isso.

---

### 13/08/2026 — Fase 2 · o captador, e por que a rota não foi instrumentada

O replay exige a assinatura **genuína** da fal, e só a fal produz uma. Como a
assinatura cobre `sha256(corpo bruto)`, guardar o JSON parseado e reserializar
daria um hash diferente — provado na bateria: `JSON.parse` + `JSON.stringify`
derruba a verificação. Ou seja: **ou se captura na hora, ou não se reenvia.**

A saída foi um proxy no scratchpad que grava cabeçalhos e corpo em base64 e
repassa. A alternativa era um log dentro da rota — e aí a evidência provaria um
código que **não é o que está commitado**, além de deixar instrumentação para
alguém lembrar de tirar depois.

Custo declarado: o túnel mudou de endereço e o `FAL_WEBHOOK_URL` teve de ser
colado duas vezes. Vale registrar como preço conhecido de qualquer replay futuro.

---

### 13/08/2026 — Fase 2 · três coisas que o motor decidiu, e o porquê de cada uma

**`maxDuration = 60` nas três rotas.** Sem a linha, a do webhook herdaria dez
segundos — e ela baixa um vídeo e o sobe ao Storage. Morreria no meio, em
silêncio, e as 31 reentregas da fal esconderiam o sintoma por horas antes de
alguém desconfiar. É o irmão gêmeo do achado da Fase 1a do Dashboard, quando o
`maxDuration` do canvas quase ficou para trás numa mudança de rota.

**O caminho no Storage é determinístico pelo id da geração.** Com um
`randomUUID()`, como faz a geração de imagem, duas entregas escreveriam dois
arquivos e criariam dois assets — o segundo passaria pelo unique de
`(bucket, path)` sem esbarrar em nada, porque os caminhos seriam diferentes. O
vídeo apareceria duas vezes na galeria e um arquivo ficaria órfão para sempre.
Determinístico, a segunda sobrescreve os mesmos bytes e o `upsert` devolve o
asset que já existia. Na imagem isso nunca foi necessário porque cada clique é uma
geração nova; aqui **a mesma geração pode chegar trinta e uma vezes**.

**Um caminho de conclusão, três gatilhos:** webhook, reconciliação e submissão que
falhou. Duas cópias divergiriam, e a segunda a divergir seria a que ninguém testa
— o mesmo argumento que fez a Galeria ser um *modo* do seletor de referências em
vez de uma segunda tela.

---

### 13/08/2026 — Fase 2 · o que **não** ficou provado

- **Realtime → tela.** O canal existe e escuta `INSERT`; o vídeo termina por
  **UPDATE**, e o node que escutaria não existe. É trabalho da Fase 3, e sem ele
  o laço provado aqui termina no banco, não na tela.
- **A reconciliação nunca disparou.** O webhook chegou de primeira, então os três
  caminhos (abrir projeto · botão · teto de 15 min) estão escritos e não
  exercitados. Provocar uma perda de webhook de propósito é trabalho da Fase 4.
- **O 403 de conta travada** segue mapeado e não visto — a classificação foi
  testada contra uma mensagem que eu escrevi, não contra a fal.
- **A galeria desenha o vídeo como `<img>`** hoje, o que confirmei na tela. É
  esperado e é da Fase 3.

---

### 13/08/2026 — Fase 3 · o desvio do `runSlot`, aprovado: o trabalho vivo mora no banco

**O plano da fase dizia "`runSlot` generalizado, o transporte trocando". Não foi
feito. O desvio foi levado ao Jorge com o código na mesa e aprovado por ele** —
com o argumento que fecha a discussão: *o banco é a única cópia do estado, e a
resiliência a reload e aba fechada é ganho de produto.*

**Os dois casos são opostos, e não o mesmo caso com transportes diferentes.**

| | quem sabe o que foi pedido |
|---|---|
| **imagem** | só o navegador, até cada requisição sair. `record_generation` grava a linha **depois** de a imagem existir — antes disso, quem lembra que havia intenção de gerar quatro é a fila do cliente |
| **vídeo** | o banco, desde o primeiro milissegundo. `submit_video_generation` grava `queued` **antes** de a fal ser chamada |

Generalizar `runSlot` daria ao vídeo uma **segunda cópia** de um estado que o
banco já guarda melhor. Pior: uma cópia que morre na troca de aba (o estúdio
monta o canvas com `key={activeProjectId}`), não sobrevive a um reload e
discorda do banco no instante exato em que o webhook chega com a aba fechada —
que é o instante que mais custa dinheiro, porque a geração foi cobrada e a tela
não sabe.

Então o bloco de vídeo **não guarda trabalho nenhum**: lê `listNodeVideos` e o
Realtime lhe diz quando reler. Fechar a aba no meio e voltar depois mostra o
vídeo pronto sem nada de especial acontecer — **não há o que recuperar porque
não havia o que perder.**

**A condição do Jorge, cumprida neste mesmo passe:** o comentário do `queue.ts`
ainda prometia *"no dia do vídeo ele vira `fetch → linha queued → webhook →
Realtime`"*. O dia do vídeo chegou e a promessa foi revogada — deixá-la escrita
seria a armadilha do `config/models.json` de novo: **um comentário que descreve
uma decisão revogada é pior que nenhum comentário**, porque quem o lê acha que
está lendo o desenho vigente. O parágrafo foi substituído pelo contraste acima,
com o nome da decisão e a data.

---

### 13/08/2026 — Fase 3 · o roteiro de tela, e os dois defeitos que só o print pegou

Sete itens, sete prints, em `scratchpad/evidencias/video-fase3/`. Zero Spark:
nada aqui gera, cobra ou escreve no ledger.

| # | o que o print prova |
|---|---|
| 1 | **Gerar Vídeo** na prateleira, em BLOCOS, com o glifo novo |
| 2 | o bloco nasce vazio, botão travado (`disabled === true`, conferido por JS) |
| 3 | fio de um Input de Imagem → o still aparece como espelho, botão libera (`disabled === false`) |
| 4 | modelo, duração e preço **do catálogo** — a tela diz `Kling 2.1 · 5s · 720p · 210 ⚡`, e a consulta ao banco devolve exatamente `5 / 720p / 210` |
| 5 | `@luna` no prompt → aviso e botão travado **antes** do clique |
| 6 | fio cortado → still some, botão trava de novo, com a frase que explica |
| 7 | a galeria desenha o vídeo da Fase 2 com primeiro quadro e ▶ |

**O item 7 falhou na primeira tentativa, e o defeito era real.** A galeria geral
desenhava o vídeo como `<img>` — a imagem quebrada que a Fase 2 registrou como
pendência — **mesmo com o conserto escrito e no lugar**. A consulta já devolvia
`isVideo`, a grade já sabia desenhar `<video>` com ▶, e o dado morria no meio:
`toGridItem`, em `gallery-browser.tsx`, monta o item **campo a campo** e não
copiava o campo novo.

É a quarta ocorrência da mesma classe neste projeto, depois do
`"reference image image 1"`, dos dois bytes NUL e do `b-locked`:
**nenhum typecheck pega** — o campo é opcional na origem e no destino, então
esquecê-lo é sintaticamente perfeito. O que pega é olhar a tela. *Se o roteiro
tivesse sido "conferi e passou", esta fase teria sido commitada com o único
defeito que ela se propôs a consertar ainda de pé.*

**Segundo defeito, no mesmo print.** O rodapé da prateleira dizia *"Vídeo e
storyboard chegam nas próximas fases"* — logo abaixo do bloco de vídeo que
acabara de chegar. Uma prateleira que desmente o que ela mesma oferece ensina a
não ler o rodapé. Agora diz "Storyboard e voz".

**E uma terceira coisa, que não era do roteiro mas era do mesmo defeito.** A
miniatura da galeria só faz uma coisa: abrir o Lightbox. Consertar a grade sem
o overlay teria movido a imagem quebrada **um clique para dentro**. O Lightbox
agora recebe `open(assetId, { isVideo })` — parâmetro opcional, `false` por
omissão, então os quatro chamadores de imagem não mudaram uma linha. Perguntar
ao servidor custaria uma viagem por um booleano que **quem chamou já sabe**,
porque acabou de desenhar a miniatura.

**Vídeo ampliado não tem zoom, e a ausência é a decisão.** Ampliar existe para
olhar de perto o que a miniatura não mostra; num clipe, o que a miniatura não
mostra é o **movimento**, e quem responde por isso é o play. Um clique que às
vezes amplia e às vezes pausa seria o mesmo gesto com dois significados.

**Anotado para o Passe de UI/UX:** o ▶ da miniatura é `bg-canvas/70` sobre o
primeiro quadro, e num quadro claro ele fica discreto demais — está lá, lê-se
quando se procura. Não é defeito de lógica, é contraste, e contraste é assunto
daquele passe.

---

### 13/08/2026 — Fase 3b · a bolinha da aba é projeção, e projeção mora em trigger

Aprovada com o mesmo argumento da carteira, e entregue como **migration à
parte** (`20260813230000_project_status_projection.sql`) porque migration quem
aplica é o Jorge, e porque enfiar escrita de banco na validação de uma fase de
tela mistura dois riscos diferentes.

`projects.status` existe desde 07/08/2026 com o comentário que diz o que ela é
— *"Aggregated status shown as the pulsing dot on the project tab"* — e **nunca
teve escritor**: toda aba nasceu `idle` e morreu `idle`.

**Por que trigger e não código de aplicação.** O vídeo trouxe um escritor que
não passa por rota nenhuma nossa: o webhook da fal chega com service role e
chama `complete_video_generation`. Atualização de status escrita na aplicação
simplesmente não existiria no caminho que mais importa — o de um vídeo
terminando com a aba fechada.

**A regra, em uma frase: "gerando" ganha de tudo; sem nada em voo, a bolinha
conta o último desfecho.** E `canceled` **não move a bolinha** — cancelar é
alguém parando de propósito, e vermelho para um pedido atendido seria a tela
chamando de falha o que o usuário mandou fazer. Hoje ninguém escreve `canceled`;
por isso a decisão é barata agora e cara depois.

Três detalhes que a migration registra por escrito:

- **A regra mora numa função só** (`project_status_now`), usada pelo gatilho
  **e** pelo backfill. Duas cópias divergiriam, e a segunda a divergir seria a
  que ninguém testa.
- **DELETE também dispara.** Gerações são apagadas à mão de vez em quando — a
  validação da Fase 2 apagou a linha sintética da disputa na trava —, e sem
  isso o projeto ficaria "gerando" para sempre por um trabalho que não existe.
- **A trava que não foi posta.** `revoke update (status) … from authenticated`
  parece proteger a coluna e **não faz nada**: o Postgres ignora revogação de
  coluna quando o papel tem o privilégio na tabela inteira, que é como o
  Supabase concede. Para valer seria preciso revogar UPDATE da tabela e
  reconceder coluna a coluna — deixando toda coluna futura invisível ao produto
  até alguém lembrar deste arquivo. Fica sem trava, de propósito: o gatilho
  sobrescreve na geração seguinte e o estrago máximo é alguém mentir para si
  mesmo sobre a própria bolinha.

**Aplicada pelo Jorge em 13/08/2026, e conferida no banco e na tela.** As duas
funções e os dois gatilhos existem; o backfill fez o que prometeu:

```
Primeiros Testes ... idle -> generated   (53 gerações, 0 vivas, último desfecho succeeded)
bolinha na aba ..... bg-positive, rgb(55, 201, 139)   [evidência: video-fase3b/]
```

**E a revogação foi provada por recusa, não por leitura de tabela.** A conexão
read-only do MCP tentou chamar `project_status_now` e levou
`ERROR: 42501: permission denied for function` — que é exatamente o que a linha
do `revoke` existe para produzir. `anon` e `authenticated` respondem `false` a
`has_function_privilege`; só `service_role`, que nunca sai do servidor, executa.

**O que a 3b NÃO entrega, dito antes de alguém se surpreender na Fase 4:** a
bolinha conta a verdade **no carregamento da página**, e não se mexe sozinha.
`projects` está na publicação do Realtime desde a Fase 0, mas **nenhum cliente
assina essa tabela** — o único canal que existe escuta `generations`, e é o que
move o bloco de vídeo. Ou seja, na geração paga da Fase 4 o **node** vai andar ao
vivo e a **bolinha** só vai mudar depois de um F5. Fechar essa distância é uma
assinatura de `projects` na tela do estúdio; fica para a Fase 4, junto com a
geração que a exercita — porque é exatamente ali que ela se prova.

---

### 13/08/2026 — Frente Vídeo · a visão alinhada — registro, não construção

Alinhado com o Jorge na autorização da Fase 3. **Nada aqui é para construir
agora**; está escrito para que a Fase 4 e os ciclos seguintes não redescubram
por acidente.

1. **Mapa de vídeo: três nodes** — Gerar Vídeo (básico) · Motion Control ·
   Máquina de Influencers. **A fronteira entre eles é a topologia de entradas**,
   não o tamanho da funcionalidade.
2. **Modos são receitas de prompt, como dado de catálogo — não código.** Dois
   eixos: **formato** (POV, Selfie, Review, Comercial, Demonstração, Provador,
   React, Rotina/GRWM) × **estilo**, sendo UGC um estilo **transversal** e não
   um formato.
3. **📌 Backlog · Máquina de Influencers**, chegando em camadas: muda
   (composição + animação, dependências já existem) → falada (depende de
   Voz/Lipsync) → multi-cena (depende de Roteiro/Storyboard).
4. **📌 Backlog · Biblioteca de CTAs por canal** — camada do Roteiro, estrutura
   gancho/corpo/CTA; CTA falado depende de voz; TikTok Shop ("carrinho laranja")
   é o primeiro cliente.
5. **📌 Backlog · continuar vídeo a partir do último frame (capítulos)** —
   conversa do Storyboard, item do esboço original.
6. **A voz pertence à PERSONAGEM, não ao vídeo.** Configura-se uma vez no
   character sheet e persiste entre gerações. É princípio, e decide sozinho
   onde a Fase de voz vai morar.
7. **📌 Backlog · Arsenal do sidebar: organização e nomenclatura (tema Labs)** —
   decidir no Passe de UI/UX.
8. **Nota de mercado:** concorrente em pré-lançamento com formatos equivalentes.
   Vale como validação da direção; os diferenciais nossos continuam sendo
   identidade persistente, canvas componível, custo auditável e arquitetura de
   lote já nascida.

---

### 14/08/2026 — Fase 4 · as duas fechaduras, e a descoberta que salvou o webhook

Abertura da Fase 4. Deploy de produção conferido antes de tudo: o
`dpl_Cdwgd6qiiWHQt76pqaAeGwQwcijk` está `READY`, com `aliasError: null`, no
commit `69bc103` — o mesmo do local e do `origin/master` —, e o alias
`creator-tks-labs.vercel.app` aponta para ele.

**As provas de graça, e o método de sempre: o que prova o caminho feliz são os
caminhos tristes ao lado.** Um POST forjado em dois endereços diferentes, e a
resposta lida por contraste:

| requisição | status | corpo | quem recusou |
|---|---|---|---|
| POST forjado no **alias de produção** | 401 | `{"ok":false}` — 12 bytes | **a nossa assinatura** |
| POST forjado na **URL gerada** do deployment | 401 | `{"protection":…"Protected deployment"}` — 436 bytes | **a borda da Vercel** |
| GET no alias | 405 | vazio, com `x-matched-path` na rota | a rota, viva, dizendo que só aceita POST |

A causa nomeada apareceu onde o desenho manda — no log da plataforma, nunca na
resposta: `[fal-webhook] recusado: missing_headers`. **E a lista de logs prova
uma segunda coisa pela ausência:** o POST na URL gerada não deixou linha nenhuma,
porque nunca chegou à função. Dois 401 com o mesmo número e autores diferentes,
e a única maneira de distingui-los é essa.

**A descoberta que valia a fase inteira.** O projeto está com *Standard
Protection* ligada (`ssoProtection: all_except_custom_domains`), e a leitura
ingênua disso é "produção está atrás de SSO" — o que significaria que **a fal não
consegue entregar o retorno**, e que a geração paga ficaria pendurada para
sempre. A medição diz o contrário: a proteção cobre as **URLs geradas**, não o
domínio de produção. O webhook está alcançável. Foi um risco silencioso fechado
por três `curl` e zero Spark.

---

### 14/08/2026 — Fase 4 · o canal que dizia `SUBSCRIBED` e não escutava nada

A tarefa era pequena e declarada desde a 3b: fechar a distância da bolinha com
uma assinatura de `projects` na tela do estúdio. O código saiu em meia hora. O
que veio depois tomou a manhã, e **encontrou um defeito que estava no produto
desde o Ciclo Fila.**

**O sintoma.** Escrita a assinatura, a bolinha não se mexia. O canal respondia
`SUBSCRIBED`, aparecia em `getChannels()` como `joined`, carregava id de binding
— e três flips de `projects.status` rodados no SQL editor não chegaram à tela.

**Sete hipóteses morreram, todas medidas, nenhuma assumida.** `REPLICA IDENTITY
DEFAULT` (a doc do Supabase só fala em *receber* o registro antigo, e foi lida
antes de concluir); a publicação (publica UPDATE); o filtro (`user_id` do projeto
idêntico ao do tópico, e sondas com o mesmo filtro recebiam); o nome do tópico
colidindo com o formato legado `realtime:<schema>:<tabela>` (quatro tópicos
testados, todos receberam); RLS por socket anônimo (uma sonda **sem filtro**
recebeu no mesmo socket, e o RLS a barraria igual); a corrida do StrictMode
(reproduzida exatamente — o segundo canal recebia); e "é coisa de
desenvolvimento", reproduzida com `next build` + `next start`, o mesmo bundle que
a Vercel serve.

**Uma contaminação, registrada porque quase virou conclusão.** As primeiras
medições usaram canais de diagnóstico com configuração **idêntica** à do canal da
aplicação — mesma assinatura no servidor. Eles podiam estar roubando os eventos
que eu estava investigando, o que faria do meu instrumento a causa do sintoma.
Tudo foi refeito com sonda de configuração diferente. *Instrumento que divide
assinatura com o observado não é instrumento; é participante.*

**A causa raiz.** Um canal assinado durante a **hidratação** entra no ar e não
escuta nada. Duas medidas fecharam o caso:

```
mesmo evento, mesma página, mesmo cliente, mesma configuração
  canal nascido na hidratação ......... 0 eventos
  canal nascido 2.500 ms depois ....... 1 evento

realtime.subscription, no servidor
  com os DOIS canais do produto joined ....... 0 linhas
  com um canal qualquer nascido mais tarde ... 1 linha (claims_role = authenticated)
```

A coluna `claims_role` é a peça que faltava. O `access_token` do usuário chega ao
Realtime de forma assíncrona — o `@supabase/ssr` lê a sessão dos cookies e só
então avisa o socket. Quem assina antes disso manda um `join` sem identidade: o
tópico é aceito, mas a assinatura de `postgres_changes`, que precisa das claims
para casar com o RLS, não é criada. **A porta abre; ninguém entra.**

**`SUBSCRIBED` é o tópico aceito, não a assinatura registrada.** O log de
desenvolvimento que a Fase 0 criou justamente porque "um canal é a única peça
cujo mau funcionamento é indistinguível de não existir" dizia a verdade e mentia
do mesmo jeito. Quem contou a história foi `realtime.subscription`, do lado do
servidor. Fica a regra: **canal se audita no banco, não no console.**

**O alcance, que é o que importa.** O canal de `generations` tinha o mesmo
defeito — e é ele que move o node quando o webhook do vídeo termina. Na frente de
imagem nada apareceu porque o bloco relê o banco por conta própria quando a fila
esvazia: o canal era o cinto de segurança do reload, e **cinto que não existe só
se descobre na batida**. No vídeo não há segunda leitura. Uma geração paga feita
antes deste conserto teria deixado o node parado em "Gerando" até um F5, com o
vídeo pago, gravado e cobrado do outro lado.

**O conserto: `lib/supabase/realtime.ts` · `openChannelWhenAuthed()`.** Espera a
sessão, entrega o token ao Realtime e só então assina. **Não é um `setTimeout`**:
um número mágico só acerta enquanto a máquina, a rede e o navegador se
comportarem como no dia em que ele foi escolhido — e quando erra, erra de volta
para o silêncio de antes. Esperar o token é esperar a coisa certa.

Verificado nos dois sentidos, e no bundle de produção:

```
realtime.subscription com a página aberta
  antes do conserto ..... 0 linhas
  depois do conserto .... 2 linhas   (generations + projects, authenticated)

a bolinha na tela, por MutationObserver, sem canal de diagnóstico nenhum
  10:57:45    8.985 ms   Gerado    rgb(55, 201, 139)
  11:01:48  252.759 ms   Gerando   rgb(242, 181, 68)  + halo pulsante
  11:02:07  271.144 ms   Gerado    rgb(55, 201, 139)
```

O cronômetro é a prova de que não houve F5: `performance.now()` voltaria a zero
num reload, e ele sobe monotonicamente atravessando as duas transições.

**A decisão de escopo, dita em voz alta.** Consertar `generation-feed.ts` estava
fora da tarefa declarada. Foi feito assim mesmo, porque é o mesmo defeito, num
arquivo que a geração paga da própria Fase 4 ia exercitar — e entregar a bolinha
funcionando ao lado de um node de vídeo mudo seria entregar a metade que não
importa.
