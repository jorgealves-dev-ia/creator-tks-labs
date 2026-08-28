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

---

### 14/08/2026 — Fase 4 · a geração paga, e a arbitragem do preço contra a fatura

Um clipe, dirigido pelo Jorge na interface de produção: *"ela vira para a câmera, sorri e comemora levantando o controle de videogame"*, a partir de uma imagem da @luna no quarto gamer. 72 segundos entre o clique e o vídeo na tela.

**As duas coisas consertadas hoje foram exercitadas no caminho real, e as duas funcionaram:** o node saiu de "Gerando" e mostrou o vídeo **sozinho**, e a bolinha da aba pulsou amarela e voltou a verde **sozinha**. Nenhum F5.

**A auditoria, contra o marco zero gravado antes do clique:**

| | antes | depois |
|---|---|---|
| saldo | 7.165 ⚡ | **6.955** ⚡ |
| lançamentos | 42 | **43** — um só |
| gerações | 56 | **57** |
| assets | 53 | **54** |

O lançamento tem `created_at = 14:27:41.861333`, **idêntico** ao `completed_at` da geração: mesmo microssegundo, uma transação só. E o asset foi gravado às 14:27:41.406 — **antes** da cobrança. A ordem é a que importa: nada é cobrado por um vídeo que ainda não está no Storage.

**A ARBITRAGEM DO PREÇO, fechada contra a fatura.** A dúvida vinha da Fase 0: a caixa de pricing da fal dizia US$ 0,28 e o readme do modelo dizia US$ 0,25, e o catálogo foi escrito acreditando na caixa (`real_cost_cents = 154`). O painel de billing saiu de **US$ 0,28 (1 request)** para **US$ 0,56 (2 requests)** — este clipe custou **US$ 0,28**. **A caixa de pricing venceu o readme**, e o catálogo estava certo.

A conferência que fecha o argumento por outro lado: US$ 0,56 ao câmbio implícito do catálogo (~R$ 5,50/US$) dá **R$ 3,08** — exatamente o que os dois `real_cost_cents` de 154 previam. **Margem 1,3636× → 1,36×, confirmada contra fatura, não contra estimativa.**

**Deriva de rosto: não houve.** A @luna manteve o rosto do primeiro ao último quadro. O item *"@ contribui texto de identidade"* continua dormindo no backlog — o resultado não deu o gatilho que o acordaria.

---

### 14/08/2026 — Fase 4 · o saldo surdo, e a carteira que passou a se anunciar

**Defeito encontrado pelo dono, na tela, depois do sucesso:** o vídeo foi gerado e cobrado, e o saldo **não se moveu** — nem no cabeçalho, nem no rodapé do bloco. Só com F5. **Dinheiro na tela mentindo por 210 ⚡.**

A suspeita dele estava certa: mesma família do canal mudo. Dois leitores, duas surdezes, uma origem só:

- o **cabeçalho** lia a `prop` do servidor, que só muda quando o servidor renderiza de novo;
- o **rodapé do bloco** lia o store, semeado por aquela mesma prop e movido apenas pela subtração otimista da fila de **imagens**.

E a cobrança do vídeo não passa por nenhum dos dois: acontece no webhook da fal, servidor puro. Nenhuma resposta volta ao navegador, nenhuma subtração roda, nenhuma página re-renderiza. **O dinheiro se move num lugar onde a tela não tem ninguém escutando.**

**A decisão: escutar a carteira, não o fim da geração.** Dava para reagir ao término de uma geração — o canal de `generations` está aberto ali do lado. Seria consertar o sintoma que apareceu e deixar de pé todos os outros: estorno, recarga, correção administrativa, extração. `wallets.balance_cents` é **projeção do ledger mantida por gatilho** — o exemplo que a própria decisão da 3b usou para justificar a bolinha —, e projeção quem mantém, e quem anuncia, é o banco. **A carteira é o fato; a geração é só um dos motivos.**

Migration `20260814150000_realtime_wallets.sql` (aplicada pelo Jorge em 14/08/2026): `wallets` entra na publicação. Não muda dado, coluna nem política.

**O teste, sem gastar e sem mentir no banco.** Um valor falso plantado **apenas na memória do navegador** (1 centavo), e então um UPDATE **no-op** na carteira — `set balance_cents = balance_cents`, zero centavos movidos, zero linhas no ledger. O banco anuncia; a tela se corrige:

```
12:05:49    43.526 ms   6.955 / 6955   R$ 69,55   <- verdade
12:05:49    43.578 ms   1     / 1      R$ 0,01    <- mentira plantada
12:07:23   137.621 ms   6.955 / 6955   R$ 69,55   <- o BANCO corrigiu
```

Foi descartada a alternativa de escrever um saldo diferente e voltar: seria gravar número falso na tabela do dinheiro, e `balance_cents` só é recalculada quando entra lançamento novo — a mentira ficaria lá.

**Três coisas provadas de uma vez.** Que o canal entrega; que o **cabeçalho** obedece (antes do conserto ele lia a prop e teria ficado em 6.955 durante a mentira); e que o **rodapé** obedece — e junto com ele a **trava de saldo**, que travou o botão com "Sparks insuficientes para este vídeo" e o destravou na correção. A trava lia a mesma fonte surda, e sarou junto.

**Lacuna declarada, não consertada:** o cabeçalho do vestíbulo (`dashboard-header.tsx`) tem o mesmo defeito e continua com ele. É Server Component, e torná-lo vivo exige convertê-lo em client — decisão maior que este ciclo, porque o extrato ao lado dele também é renderizado no servidor, e um saldo vivo ao lado de um extrato parado seria uma inconsistência nova. Fica nomeado.

---

### 14/08/2026 — 📌 Backlog · Cache de imagens no canvas (F5 re-baixa tudo)

Nomeado pelo Jorge. **Registrar, não construir.**

**Sintoma:** carregamento lento depois de um F5 num canvas com muitos nodes de imagem. **Suspeita:** os links assinados do Storage trazem URL nova a cada visita, e URL nova é recurso novo para o navegador — o cache nunca é usado, e tudo é baixado outra vez.

**Escopo transversal:** vale para toda tela que mostra imagem — canvas, galeria, seletor de referências, coluna de imagens canônicas. Tem investigação e medição próprias (medir antes de mexer, como o achado da captura intermitente ensinou), e é **candidato a ciclo junto do Passe de UI/UX**.

---

### 14/08/2026 — Frente Vídeo · Ciclo 1 fechado, com o placar

O ciclo que fez a invariante 1 deixar de ser promessa. Fila → webhook → Realtime existe, roda em produção e foi exercitado com dinheiro real.

**O que este ciclo entregou:** o catálogo da fal e a cobrança de vídeo em duas partes; o motor assíncrono com assinatura ED25519 e caminho único de conclusão; o bloco na tela com o banco como estado vivo; a bolinha da aba como projeção por trigger; e — encontrado a caminho — o conserto dos canais mudos e do saldo surdo.

**O placar de custo, do ciclo inteiro:**

| | |
|---|---|
| vídeos gerados | **2** (Fase 2 e Fase 4) |
| da carteira | **420 ⚡** = R$ 4,20 |
| custo real pelo catálogo | 308 centavos = **R$ 3,08** |
| fatura da fal | **US$ 0,56** |
| margem | **1,36×**, confirmada contra fatura |

**O placar honesto do que ficou sem prova**, porque exige custo ou uma falha real: `pending` com trabalho vivo; o teto de 15 minutos com `giveUp`; `failed` vindo do provedor; a corrida `already`; `provider_account` (402/403 da fal, a **nossa** conta no provedor sem crédito — não a do usuário); e o webhook com assinatura **válida**, que só a fal consegue produzir. Do webhook, o que dá para provar sozinho é a recusa — e ela foi provada, com causa nomeada.

**O que foi exercitado de graça na reconciliação:** linha já terminal respondendo `succeeded` sem falar com o provedor e **sem cobrar de novo**; `not_found` provando a posse por RLS; `invalid` em duas formas; e `unauthenticated` sem sessão. Ledger, saldo, assets e gerações **idênticos** antes e depois das cinco chamadas.

**Três lições que sobrevivem ao ciclo:**

1. **Canal se audita no banco, não no console.** `SUBSCRIBED` é o tópico aceito, não a assinatura registrada.
2. **Instrumento que divide assinatura com o observado não é instrumento; é participante.** Metade de uma manhã foi gasta perseguindo um sintoma que o próprio diagnóstico causava.
3. **Cinto que não existe só se descobre na batida.** O canal era o cinto de segurança do reload na frente de imagem, e ninguém notou que ele estava desamarrado até o vídeo depender dele para tudo.

---

## Frente Storyboard — Ciclo 1: O Elo

> O ciclo que ensina o produto a contar histórias em capítulos. Dado um vídeo
> pronto, o último quadro dele vira o ponto de partida do próximo — à mão, um
> gesto de cada vez, antes de existir Roteiro ou Máquina. **A visão da frente
> inteira (roteiro, fichas de cena, folha montada, a Máquina) fica registrada na
> Fase 4;** este ciclo constrói só a primeira peça dela.

### 15/08/2026 — Fase 0 · a rota do quadro, decidida com o navegador na mão

A pergunta era cliente (um `<video>` + canvas) contra servidor (ffmpeg numa função). Foi respondida com medição, contra o vídeo real da @luna que já estava no Storage, e não com argumento.

**O CORS permite, e o controle é a metade que prova.** As URLs assinadas do nosso Storage devolvem `Access-Control-Allow-Origin: *` — no GET, no HEAD e no preflight, com `accept-ranges: bytes`. No navegador, na mesma página e no mesmo minuto:

| | resultado |
|---|---|
| `<video crossorigin="anonymous">` | canvas **limpo** — `getImageData` e `toBlob` funcionaram |
| o mesmo vídeo **sem** o atributo | `SecurityError: Tainted canvases may not be exported` |

O sucesso sozinho não provaria nada. **É o controle que mostra que o `crossorigin` é obrigatório e não decoração:** sem ele o navegador nem manda `Origin`, trata a resposta como opaca e contamina o canvas. Um detalhe que teria custado uma rodada inteira de diagnóstico na fase seguinte.

**A rota servidor perdeu por uma distância que não é discutível.** O último quadro de um H.264 não é keyframe, então não existe "pegar sem decodificar" em lugar nenhum — a diferença é onde mora o decodificador. No navegador ele já existe e custa zero; no servidor custaria **68 MB medidos** (`@ffmpeg-installer/linux-x64`) dos 250 MB de bundle da Vercel, uma dependência nova a aprovar, e o download de 4 MB para dentro da função a cada quadro. Para um trabalho de meio segundo.

**O último quadro do Kling é bom, e isso também foi medido em vez de suposto.** Duração 5,042 s, 960×960. A luminância anda entre 58,5 e 61,0 do primeiro ao último quadro — **não escurece**. A nitidez cai 13% (5,49 → 4,77), e olhando a imagem dá para ver por quê: o borrão está no controle de videogame, que está em movimento; o rosto está nítido. O quadro tem a @luna virada para a câmera, sorrindo — **um ponto de partida melhor que o original**, porque ela já está olhando para quem assiste.

E `currentTime = duration` basta: o quadro do fim exato e o de 40 ms antes são **byte a byte o mesmo arquivo** (SHA-256 idêntico). Nenhum epsilon mágico. *Medido no Chrome; o recuo de 50 ms ficou no código como rede para navegadores que recortem diferente.*

**O fallback de "N ms antes do fim" NÃO foi construído**, e a ausência é a decisão: não há necessidade medida, e uma amostra é uma amostra — mesma disciplina do registro da recusa em "@luna sorrindo". O `derived_from_ms` acumula o dado; se um quadro borrado aparecer no uso real, a investigação começa com caso concreto em vez de estatística fabricada.

**Achado de catálogo, registrado para ninguém tropeçar:** a resolução real é **960×960**, e o catálogo diz `720p`. O `720p` é o **nível do endpoint**, não a contagem de pixels — quem assumisse 1280×720 entregaria um quadro esticado. O canvas é criado com `videoWidth × videoHeight`, e é isso que cumpre "resolução fiel à origem".

---

### 15/08/2026 — Fase 0 · a aba escondida não decodifica vídeo 🔎 achado fora do roteiro

Não estava na lista de perguntas e mudou o desenho do produto. Um `<video>` numa aba com `visibilityState === "hidden"` emite `stalled` aos ~3 s e **nunca** chega a `loadedmetadata`. Reproduzido oito vezes — nos dois vídeos, com `preload="metadata"` e `"auto"`, com blob URL local (bytes já baixados) e até com `play()`. Enquanto isso, um `fetch()` dos mesmos bytes volta em **4 ms**. Não é rede: é a pilha de mídia do navegador.

O contraste que fecha a causa veio depois, com a janela na frente — **mesma página, mesmo arquivo, mesmo código**:

```
aba ESCONDIDA   stalled@3,2s · sem metadata em 20–25 s
aba VISÍVEL     loadedmetadata@31ms · TOTAL 543 ms · canvas limpo
```

**A consequência de produto: extrair é gesto de quem está olhando.** Não existe "extrai sozinho quando o vídeo termina" — seria uma funcionalidade que falha em silêncio exatamente quando ninguém está vendo. E a recusa dessa situação ganhou frase própria, com o conserto dentro dela, em vez de uma espera de quinze segundos terminando em "não deu".

**A consequência de método:** validação de tela que envolva vídeo exige a janela visível de verdade. Uma aba atrás valida um `stalled`.

---

### 15/08/2026 — Fase 1 · a linhagem: duas perguntas, duas colunas
**Migration:** `20260815195510_asset_lineage.sql` (aplicada pelo Jorge)

`assets` tinha treze colunas e nenhuma dizia de onde um arquivo veio. Bastava enquanto tudo era ou **enviado** (não veio de lugar nenhum) ou **gerado** (apontado por `generations.result_asset_id`). O quadro final de um vídeo é a primeira coisa deste produto que não é nem uma nem outra.

**Não é linha em `generations`, e isso é schema e não gosto.** `provider` e `model` são `NOT NULL`, e um quadro derivado não tem nenhum dos dois — não houve chamada, preço nem catálogo. E ainda que coubesse, quebraria a regra ratificada em 12/08: o cartão do projeto conta imagens geradas, e o quadro seria a mesma imagem contada duas vezes. **Quadro derivado é engenharia, não geração:** não passa por `generations`, não toca o ledger, não custa Spark.

**`source` não muda, e a recusa do enum tem custo medido.** Acrescentar `'derived'` a `asset_source` parecia o mais honesto e é o mais caro: o filtro da galeria oferece `todas / geradas / enviadas`, e um terceiro valor cairia fora dos três — quem procurasse em "geradas" **não acharia** o quadro do vídeo que ele mesmo gerou. Então as perguntas se separam, porque sempre foram duas: `source` responde *quem pôs o arquivo aqui* (o sistema), `derived_from_asset_id` responde *de onde vieram os pixels*. **O que identifica um derivado é o dado, nunca o rótulo.** *(Conferido na validação da Fase 2: o quadro aparece sob "Geradas". Com o enum novo, não apareceria.)*

**`derived_from_ms` guarda o instante**, para o registro dizer um fato conferível — *o quadro em 5042 ms* — em vez de uma afirmação — *o último quadro*. E a checagem `assets_derived_ms_requires_origin` vale **numa direção só**, de propósito: um instante sem origem é impossível, uma origem sem instante não — porque nem toda derivação futura é no tempo (um recorte de imagem tem origem e não tem instante), e uma trava simétrica cobraria uma migration daquele dia por uma regra que só vale para vídeo.

FK `on delete set null` pelo precedente de `entities.cover_asset_id`: apagar o vídeo não pode apagar o quadro, que a essa altura já é cartão no canvas e possivelmente semente de uma geração paga. Perder a linhagem custa auditoria; perder o quadro custa trabalho.

**Uma prova de sintaxe que não é leitura.** Antes de a migration sair da minha mão, ela passou pelo **parser real do Postgres** (`libpg-query`, sem nenhum contato com o banco): 7 statements, os pretendidos. E o verificador foi sabotado com três SQLs inválidos — aspa não fechada, palavra-chave errada, parêntese aberto — porque um verificador que nunca reprova não verifica nada. A leitura do AST pegou um erro que a minha releitura não pegou: uma aspa fora do lugar num `comment on` que era **sintaticamente válida** e deixava a frase quebrada.

Conferido no banco depois de aplicada: as duas colunas, a FK com SET NULL, as três constraints com a definição real, o índice parcial, e as 54 linhas antigas nulas nas duas. O predicado da trava assimétrica foi avaliado nos cinco casos, e **os dois que devem reprovar reprovaram** — uma trava que só passa não prova nada.

**Junto foi a lista de migrations do `arquitetura.md`**, que estava nove entradas atrasada. Acrescentar só a nova faria a lista *parecer* atual sendo errada no meio — pior que desatualizada.

---

### 15/08/2026 — Fase 2 · o quadro vira imagem, e o elo existe

O botão **"Continuar deste vídeo"** entra sob a moldura do bloco Gerar Vídeo, e só quando há vídeo pronto nela. Cinco passos, nenhum pago: assinar o link de novo → ler o quadro → subir ao Storage → registrar com a linhagem → pôr o card no canvas e levar a tela até ele.

**O link é assinado de novo, e não reusado.** As URLs valem uma hora; um canvas aberto desde o almoço tem link morto, e a falha apareceria como *"não consegui ler o vídeo"* quando a causa é o relógio.

**O rótulo é montado no servidor, pelo id.** O navegador afirma onde subiu, de qual vídeo e em que instante; o servidor confere o que precisa ser verdade (o caminho é da pasta do chamador, o asset de origem é dele e é `kind = 'video'`) e **não aceita nome nenhum** — ele lê o `label` do vídeo e monta *"Último quadro · …"*. É a divisão de 10/08 — **pode nomear, nunca pode alargar** —, só que aqui nem nomear: registro de auditoria que acredita no rótulo que o cliente mandou não é registro de auditoria.

**PNG, e a escolha custa 1 MB.** Medido: PNG 1,18 MB contra JPEG q0,92 em 140 KB. O quadro vai ser o primeiro frame do próximo clipe, ou seja, entra numa geração paga como referência de identidade — e já carrega a compressão do H.264. Somar uma segunda geração de perda em cima de um rosto é exatamente o que este produto existe para recusar. Storage é custo nosso e é desprezível.

**Clicar duas vezes não cria dois quadros.** Caminho determinístico pelo id do vídeo, então a segunda subida sobrescreve os mesmos bytes e a escrituração devolve o asset que já existia. Mesma decisão do `video-complete.ts`: execução dupla sobrescreve, nunca duplica.

**O card nasce à direita**, ao contrário de todos os outros inputs — que nascem à esquerda porque é desse lado que o fio chega. Este nasce à direita porque é o que veio **depois**, e assim o canvas passa a ser lido na ordem em que a história é contada.

**E o botão diz que é grátis.** Ele fica a três centímetros de um que anuncia "Custará 210 ⚡". Uma ação sem custo encostada numa paga, sem dizer qual é qual, é a tela ensinando a hesitar — então o subtítulo diz *"o último quadro vira a partida do próximo · sem custo"*.

#### A validação, zero Spark

Seis itens, todos com print, em `scratchpad/evidencias/storyboard-c1-fase2/`:

| # | o que ficou provado |
|---|---|
| 1 | dois blocos de vídeo no mesmo quadro: **só o que tem resultado tem o botão** |
| 2 | o botão sob a moldura, com o **"sem custo"** ao lado de um "Custará 210 ⚡" |
| 3 | o clique → o quadro vira **Input de Imagem à direita**, selecionado, com a tela indo até ele |
| 4 | o quadro na galeria, e **sob o filtro "Geradas"** — a decisão da Fase 1 valendo na prática |
| 5 | o banco antes e depois: gerações 57→57, lançamentos 43→43, saldo 6.955→6.955 |
| 6 | clicar de novo → **não duplica**: destaca o card e diz por quê |

O item 5 é o que mais vale, e a prova não é a igualdade dos números: é a **data da última linha**. Depois de três cliques, a geração mais recente continua sendo `14/08 14:26` e o lançamento mais recente `14/08 14:27` — os do vídeo pago de ontem. **Nada foi escrito hoje em nenhuma das duas tabelas.** Zero Spark, e não "quase zero".

E o `derived_from_ms` gravado foi **5042** — o mesmo número que a investigação tinha medido de manhã no mesmo arquivo, por um caminho independente: uma página de teste solta contra o código de produção.

#### O que ficou sem prova, dito em vez de contado

A recusa `hidden_tab` — a frase que nasceu do achado mais útil da Fase 0 — **não foi vista na tela**, e a limitação é do instrumento e não do produto: a extensão que dirige o navegador **ativa a aba** para executar qualquer script, então "clicar com a aba escondida" é uma combinação que eu não consigo produzir. O mecanismo está medido oito vezes e o contraste com a aba visível está acima; o que falta é a frase aparecendo, não a condição existindo.

---

### 15/08/2026 — Fase 3 · o elo completo: o par nasce ligado

O gesto deixa de entregar um card e passa a entregar **o capítulo seguinte**: um Input de Imagem com o quadro e um Gerar Vídeo já ligado a ele, com o modelo herdado e o prompt vazio. É o `addChainedGenerator` aplicado ao vídeo, e a frase dele é o argumento inteiro — *o arrastar que qualquer um faria à mão, como um clique, que é o que transforma uma pilha de tentativas num fluxo.*

**Herda o modelo, não herda o prompt.** É a mesma história, então o modelo vem junto; o prompt era a direção daquela cena, e o próximo capítulo é outra. Doutrina do Duplicar — copia a pergunta, nunca a resposta — aplicada a uma continuação em vez de a uma cópia.

**A armadilha, nomeada no plano e confirmada escrevendo:** construir node e aresta pelo store **não passa pelo `onConnect`**, então nada preencheria o `sourceAssetId` do bloco novo sozinho — ele nasceria com a faixa dizendo "Conecte uma imagem" e o botão travado, ligado a um card que está bem ali. A escrita é explícita, pelo mesmo cuidado que faz o `addChainedGenerator` escrever as `references` na mão. **E o teste disso não é olhar o campo, é olhar o botão**: ele só destrava quando o still existe.

**"Garante o par" é mais forte que "não duplica", e a diferença tem um ramo próprio.** Se o card já existe mas o bloco adiante dele não — alguém apagou, ou o card veio por outro caminho —, o gesto cria **só o bloco que faltava**, ligado ao card que já estava lá. Foi o ramo que mais valeu provar: os cards de Input ficaram em 4 enquanto os nodes iam de 19 para 20.

#### O passo zero, que a fase pediu ao ser escrita

Cada clique re-extraía o quadro, inclusive quando ele já existia. Isso tornava a frase *"já está no fluxo"* cara de produzir — 4 MB baixados, uma decodificação e 1,2 MB subidos para concluir que não havia nada a fazer — e, pior, **fazia-a depender de aba visível**, porque a leitura passa pelo decodificador.

Agora o gesto pergunta primeiro (`findDerivedFrame`, uma consulta no índice parcial que a Fase 1 criou). **Uma frase que só informa não pode custar mais que a ação que ela informa não ter acontecido.**

#### O selo, e por que ele lê o dado

A galeria do seletor marca o quadro derivado com **"quadro de vídeo"**, lido de `derivedFromAssetId` — do **dado**, nunca do `source` nem do rótulo. Numa miniatura de 100px o quadro final de um clipe é indistinguível de uma foto, e a diferença importa antes do clique. Reusa o campo `badge` que a `ImageGrid` já tinha desde a Galeria geral: nenhum componente novo.

#### A validação, zero Spark

Prints e medições em `scratchpad/evidencias/storyboard-c1-fase3/`. O canvas foi limpo de volta ao estado pré-Fase 2 antes de começar.

| ramo | partida | nodes | Inputs | aviso |
|---|---|---|---|---|
| `both` | nada existia | 18 → **20** | 3 → 4 | nenhum |
| `none` | o par de pé | 20 → **20** | 4 → 4 | "já está no fluxo" |
| `video` | o card sim, o bloco não | 19 → **20** | 4 → **4** | nenhum |

E o grafo salvo prova que a corrente é do documento e não da tela: capítulo 1 com still `d2a8b572`, capítulo 2 com still **`e707ac2c`** — o quadro derivado — e dois fios chegando em blocos de vídeo. Banco intocado: 57 gerações, 43 lançamentos, saldo 6.955, **1** derivado (o mesmo da Fase 2).

#### Duas coisas que não são falsificáveis hoje, ditas em vez de contadas

**A herança do modelo não pôde ser provada, e a razão é o catálogo:** `ai_models` vende um modelo de vídeo só, então não existe combinação em que o herdado e o padrão discordem. No grafo salvo os dois blocos têm `modelId` nulo — o de origem nunca escolheu um explicitamente, e herdar nulo é o comportamento certo, porque cai no padrão do catálogo, que é o mesmo modelo. O teste nasce no dia em que houver um segundo.

**O caminho completo de extração não foi reexercitado**, porque o passo zero encontra o quadro que a Fase 2 criou e pula tudo — que é exatamente o que ele existe para fazer. Ele volta a rodar sozinho na Fase 4: o clipe do capítulo 2 nasce sem quadro extraído, então "Continuar deste vídeo" nele percorre os cinco passos inteiros.

---

### 15/08/2026 — Fase 4 · a prova do elo: o capítulo 2 da @luna

Um clipe dirigido pelo Jorge na interface de produção — *"ela abaixa o controle e volta a olhar para a TV"* —, partindo **do último quadro do capítulo 1**. Sessenta e seis segundos entre o clique e o vídeo na tela.

A imagem de partida gravada na geração é `e707ac2c`, que é o asset derivado cuja linhagem aponta para o vídeo do capítulo 1. **O elo não é uma frase sobre o produto: é uma coluna apontando para outra.**

**A auditoria, contra o marco zero gravado antes do clique:**

| | antes | depois |
|---|---|---|
| saldo | 6.955 ⚡ | **6.745** ⚡ |
| gerações | 57 | **58** |
| lançamentos | 43 | **44** — um só |
| assets | 55 | **56** |

O lançamento tem `created_at = 23:50:34.011124`, **idêntico** ao `completed_at` da geração: mesmo microssegundo, uma transação só. E o asset foi gravado às `23:50:33.774` — **237 ms antes** da cobrança. Nada é cobrado por um vídeo que ainda não está no Storage. Margem **1,36×**, a mesma confirmada contra fatura ontem.

#### O que sobreviveu à emenda

| quadro | luz | nitidez |
|---|---|---|
| cap1 primeiro *(a imagem original)* | 58,5 | 5,49 |
| **cap1 último** *(o quadro extraído)* | **59,5** | **4,77** |
| **cap2 primeiro** *(o mesmo instante)* | **60,7** | **4,89** |
| cap2 em 0,6 s | 62,6 | 5,34 |
| cap2 último | 51,8 | 5,72 |

As duas linhas do meio são a emenda vista dos dois lados: 1,2 de luminância e 0,12 de nitidez de diferença. **O capítulo 2 recomeça praticamente no quadro em que o capítulo 1 parou.**

- **Rosto: sobreviveu.** Em 0,6 s ela ainda encara a câmera, e é a mesma pessoa — mesmos olhos, mesmo sorriso, mesma mandíbula, mesmos brincos, e a **mesma tatuagem manuscrita no pulso esquerdo**.
- **Cenário: sobreviveu.** A TV de tubo com o Tekken 3 e "JIN KAZAMA", a parede laranja, as espumas acústicas, os painéis de luz e a mesa de borda laranja continuam lá — inclusive quando a câmera abre e mostra mais quarto do que o capítulo 1 jamais mostrou.
- **Traje: sobreviveu.** A regata bege, do primeiro quadro ao último.
- **A emenda é assistível.** O capítulo 2 abre onde o 1 fechou, a direção é obedecida, e a câmera abre junto — o que dá à costura um movimento próprio em vez de um corte seco.

#### A metade da prova que eu não podia ver

Tudo acima é banco e pixel: o que eu consigo medir sozinho. **A outra metade é de quem estava diante da tela**, e o Jorge a registrou:

> o node saiu de "Gerando" e mostrou o vídeo **sozinho**, sem F5; o saldo caiu de 6.955 para 6.745 **sozinho**; a bolinha pulsou e voltou. E, assistindo os dois clipes: *"os dois capítulos emendam — parece uma história contínua, a @luna atravessa o corte."*

As três primeiras são os consertos de 14/08 — os canais mudos e o saldo surdo — valendo de novo, agora num caminho que nasceu depois deles. A quarta é a única coisa deste ciclo que **nenhuma consulta responde**: se a emenda convence. Números dizem que os quadros colam; só olhar diz que a história continua.

#### Uma nota de método, contra mim mesmo

A direção foi sugerida por mim para manter a personagem no mesmo cômodo, de modo que qualquer desvio de cenário fosse atribuível à emenda e não ao roteiro. Ela conseguiu isso e **cobrou um preço que eu não previ**: a partir de ~1,5 s a personagem está de costas, então o último quadro do capítulo 2 não permite avaliar rosto nenhum.

A medição do rosto só existe porque voltei e amostrei o **início** do clipe. Com os três quadros do roteiro original — primeiro, meio, último — o placar teria dito "rosto não avaliável", **por causa da minha sugestão e não do produto**.

Fica a regra para as próximas medições de emenda: **a direção do capítulo seguinte precisa manter o rosto na câmera no primeiro segundo, ou a amostragem precisa ser no começo.** Medir identidade num quadro em que ninguém está olhando é não medir.

> **E ela é herança direta do Ciclo 2** *(decidido pelo Jorge no fechamento)*. A regra nasceu como cuidado de medição e vale como **regra de receita de cena**: uma cena que abre num capítulo emendado precisa dar o rosto à câmera no primeiro segundo — não para o medidor, para o espectador. É o quadro em que ele reconhece que continua sendo a mesma pessoa, e é por isso que a continuidade se sente antes de se conferir. Vai para o brief das receitas de cena do node de Roteiro, ao lado da linguagem de atuação com tempo.

#### E o gatilho da Fase 3 ficou armado

A Fase 3 registrou que o caminho completo de extração não fora reexercitado, porque o passo zero encontrava o quadro que a Fase 2 já criara. **O clipe do capítulo 2 nasceu sem quadro extraído** — clicar "Continuar deste vídeo" nele percorre os cinco passos inteiros. O gatilho está no canvas, esperando o capítulo 3.

---

### 15/08/2026 — A visão da Frente Storyboard 📌 registro, não construção

Alinhada com o Jorge na abertura do Ciclo 1. **Nada aqui é para construir agora**; está escrito para que os ciclos 2 e 3 não redescubram por acidente.

A frente entrega em três ciclos: **(1) o elo** de continuação entre vídeos — este; **(2) o node de Roteiro** — ideia → fichas de cena estruturadas e editáveis, com biblioteca de CTAs por canal e o modo colar-roteiro-pronto-e-estruturar; **(3) a Máquina de Storyboard** — o node maestro que rege os motores existentes em lote, com trilho de cenas (teto 10 na v1), portões de custo entre etapas, custo total visível antes do primeiro clique e template pré-montado no sidebar.

**a. A CENA é dado estruturado, não texto.** Uma ficha com ordem, ação, `@personagem`, produto, cenário, enquadramento, movimento, fala/narração (dormente até a voz), slot de CTA, duração, status e **transição** (corte × continuação-do-último-frame). Uma ficha, **três consumidores**: o compilador de imagem, o prompt de vídeo e a voz futura. É o que impede o roteiro de virar um parágrafo que cada motor reinterpreta do seu jeito.

**b. A folha de storyboard é VISÃO MONTADA**, feita por nós a partir das imagens individuais (exportável em PDF um dia) — **nunca uma imagem única gerada por IA**. A espinha é uma imagem por cena. Uma folha gerada por modelo seria uma imagem bonita que ninguém pode editar cena a cena.

**c. A Máquina é MAESTRO, não motor.** Ela rege o compilador, o motor de imagem e o motor de vídeo **já auditados**. Nenhuma economia paralela: nenhum caminho de dinheiro novo, nenhum segundo lugar onde o preço é decidido.

**d. Nenhum modelo entra pelo nome**, todos pelo catálogo. O Seedance, quando vier, é uma linha na `ai_models` sob a fal — como a invariante 2 manda.

**e. Roteiro v1 é GERADOR, não chat:** geração barata + edição manual + regenerar com instrução + colar-e-estruturar. Um chat seria um segundo produto dentro deste.

**f. Templates de história por nicho = receitas de catálogo**, mesma filosofia dos modos de formato: dado, não código.

**g. Conexões ENTRE projetos: backlog nomeado, não construir.** O `GN006` é muralha proposital — `@` só resolve personagem vinculada ao projeto da geração. Furá-la para o storyboard seria desfazer a Etapa D2 pela porta dos fundos.

**h. A Máquina NASCE com a arte como corpo do node** — imagem em fundo transparente, conectores reais alinhados aos soquetes, efeito flutuante discreto — já no ciclo 3. A interface funcional (trilho, custo, estados) é **DOM real ancorado na arte**. O Passe de UI/UX fica com o refinamento fino (brilhos por estado, microinterações). Arte fornecida pelo Jorge.

**i. Máquina de Influencers e Máquina de Storyboard compartilham o mesmo motor de orquestração futuro.** Duas telas, um maestro — decidido agora para que a segunda não nasça como cópia da primeira.

---

### 15/08/2026 — Absorções da análise dos vídeos de referência 📌 registro, não construção

Analisadas com o Jorge. Nenhuma é para construir neste ciclo.

**1. Backlog · Exportar folha da personagem.** Vistas rotuladas + recortes de detalhe ampliado (tatuagem, pele, olho) + paleta com hex + régua de altura. **Visão montada sobre dados que já existem** — mesma filosofia da folha de storyboard do item (b): nós montamos, o modelo não desenha a folha.

**2. Para o brief do Ciclo 2 (Roteiro).** Campos de **HISTÓRIA** — título, formato, estilo, gênero (o rodapé da folha deles). Ficha confirmada **campo a campo**, com emoção/clima e iluminação como opcionais. **Heurística de ritmo:** ~4 cenas por bloco de 15 s, com o aviso **antes** de gastar. E **linguagem de atuação com tempo** — *"ri de forma escandalosa por meio segundo"* — como padrão do campo ação: é a diferença entre dirigir e descrever. Junto delas vai a **regra do rosto no primeiro segundo**, que nasceu como cuidado de medição na Fase 4 e vale como regra de receita: cena que abre num capítulo emendado dá o rosto à câmera logo, porque é ali que o espectador reconhece que continua sendo a mesma pessoa.

**3. Para o brief do Ciclo 3 (Máquina/folha).** Gabarito da folha montada: selo numerado por painel, metadados da ficha sob cada quadro, rodapé com identidade do projeto em **toda** página, e **numeração contínua** nas sub-folhas por capítulo. Rota futura *"folha composta como entrada multi-shot"*, com gatilho nomeado: **quando um modelo multi-referência entrar no catálogo da fal**. E o **cenário como âncora de color grade** — candidato a entidade `@` futura.

**4. O `720p` do catálogo é nível de endpoint, não contagem de pixels.** Medido no clipe real: a saída é **960×960**. Quem assumisse 1280×720 entregaria quadro esticado. O canvas de extração é criado com `videoWidth × videoHeight`, e é isso que cumpre "resolução fiel à origem".

**5. Extração é gesto de quem está olhando, sem trabalho de fundo.** O navegador não decodifica vídeo em aba escondida (medido oito vezes). Consequência de produto: nada de extrair sozinho quando o vídeo termina. Consequência de método: **validação de tela que envolva vídeo exige a janela visível de verdade** — uma aba atrás valida um `stalled`.

---

### 15/08/2026 — Frente Storyboard · Ciclo 1 fechado, com o placar

O ciclo que ensinou o produto a contar histórias em capítulos.

| fase | o que entrou | como foi provado |
|---|---|---|
| **0** | a rota do quadro, decidida com o navegador na mão | CORS com **controle** (`SecurityError` sem `crossorigin`); ffmpeg medido em 68 MB e descartado; o último quadro do Kling avaliado em luz e nitidez |
| **1** | `derived_from_asset_id` + `derived_from_ms` | sintaxe pelo parser real do Postgres, o verificador sabotado, e o predicado da trava assimétrica avaliado nos 5 casos |
| **2** | o quadro vira imagem: extração, escrituração, galeria | 6/6 com print, zero Spark — e a prova não é a igualdade dos números, é a **data da última linha** |
| **3** | o elo completo: o par nasce ligado, o selo, o passo zero | os três ramos por contagem de nodes, e o grafo salvo com a corrente no documento |
| **4** | a prova do elo, com dinheiro real | 66 s do clique ao vídeo; rosto, cenário e traje atravessando a emenda |

**O placar de custo:**

| | |
|---|---|
| vídeos gerados | **1** (o capítulo 2) |
| da carteira | **210 ⚡** = R$ 2,10 |
| custo real pelo catálogo | 154 centavos = R$ 1,54 |
| fatura estimada na fal | **US$ 0,28** |
| margem | **1,36×** |
| migrations | 1 |
| commits | 4 |

**O placar honesto do que ficou sem prova**, com gatilho nomeado para cada um:

- **A recusa `hidden_tab` na tela** — a condição está medida oito vezes, a frase não foi vista. Limitação do instrumento: a extensão que dirige o navegador ativa a aba para executar qualquer script.
- **A herança do modelo pelo bloco novo** — o catálogo vende um modelo de vídeo só, então não existe combinação em que o herdado e o padrão discordem. Gatilho: o segundo modelo.
- **O fallback de "N ms antes do fim"** — não construído por não haver necessidade medida. Gatilho: um quadro borrado no uso real, que `derived_from_ms` deixa investigável com caso concreto em vez de estatística fabricada.

**Três lições que sobrevivem ao ciclo:**

1. **O que prova o caminho feliz são os caminhos tristes ao lado.** O CORS só virou veredito quando o mesmo vídeo, sem `crossorigin`, estourou com `SecurityError` — e a trava do banco só virou trava quando os dois casos que deviam reprovar reprovaram.
2. **Uma frase que só informa não pode custar mais que a ação que ela informa não ter acontecido.** Foi o que trouxe o passo zero: dizer "já está no fluxo" custava 4 MB, uma decodificação e uma subida.
3. **Medir identidade num quadro em que ninguém está olhando é não medir.** A direção que protege o cenário pode esconder o rosto, e o placar teria dito "não avaliável" por causa da amostragem, não do produto. A regra virou herança do Ciclo 2: cena emendada dá o rosto à câmera no primeiro segundo — para o espectador antes que para o medidor.

E uma quarta, que é sobre quem prova o quê: **há metades que nenhuma consulta responde.** O banco disse que os quadros colam; que a história continua, só olhar disse. Foi o dono quem assinou essa linha — como foi ele quem viu o node andar e o saldo cair sozinhos.

---

## Frente Storyboard — Ciclo 2: O Roteiro

O ciclo que ensina o produto a **escrever** a história antes de desenhá-la. O Ciclo 1 provou que dois capítulos emendam; este produz as fichas que dirigem os dois.

A decisão que atravessa o ciclo inteiro, e que decide quase todas as outras: **uma ficha é dado estruturado, não texto.** Um roteiro em prosa obrigaria três motores — o compilador de imagem, o prompt de vídeo, a voz futura — a reinterpretar o mesmo parágrafo cada um do seu jeito. Uma ficha com `acao`, `cenario`, `enquadramento` e `transicao` é lida igual pelos três.

### 16/08/2026 — Fase 0 · o modelo, escolhido por medição e não por memória

47 chamadas reais, dois candidatos, três versões de receita, R$ 1,34 do nosso bolso e **zero Spark** — o probe roda fora do produto, com chave nossa.

O que decidiu não foi preço nem velocidade:

| | continuações corretas | custo | velocidade |
|---|---|---|---|
| `gemini-3.1-flash-lite` | 17/21 (81%) | 5× mais barato | 1,6× mais rápido |
| **`gemini-3.7-flash`** | **24/24 (100%)** | — | — |

**O lite é 5× mais barato e perdeu assim mesmo.** O argumento que fecha: *o roteiro é a coisa mais barata do pipeline e dirige a mais cara.* Uma emenda quebrada custa uma regeração de vídeo de 210 ⚡; escolher o modelo que erra uma em cinco para economizar dez centavos é otimizar o número errado.

**As três durezas da receita v3 nasceram de defeitos medidos, não de intuição:**

1. **Rosto em câmera no primeiro segundo de toda continuação.** Herança direta do Ciclo 1 — *medir identidade num quadro em que ninguém está olhando é não medir*. Mais o parágrafo do "VARIE a forma", que existe porque a rodada 2 produziu seis cenas abrindo com as mesmas cinco palavras: o modelo obedecia à regra ao pé da letra, que é como uma instrução certa produz um resultado ruim.
2. **Toda ação carrega marca de tempo explícita.** A rodada 1 produziu "ela está feliz com o produto" — que descreve um estado e não dirige nada. O motor de vídeo precisa saber quanto dura cada beat dentro dos 5 segundos.
3. **Cenário próprio de cada cena.** Cada cena vira uma imagem gerada separadamente; um cenário repetido palavra por palavra em três cenas produz três imagens iguais, e um roteiro de seis cenas vira um vídeo de duas.

**E um defeito que virou coluna, não regra.** O modelo declarou *"Condensado de 6 para 6 cenas"* sobre um roteiro que não foi condensado. A correção não é confiar melhor na prosa — é **parar de confiar nela**: nasceu `storyboards.cenas_no_original`, e quem decide se houve condensação passou a ser a conta (`cenas_no_original > total`), com `ajuste` virando ilustração de um fato já estabelecido. Mesma doutrina do quadro derivado de 15/08: **o que identifica é o dado, nunca o rótulo.**

### 16/08/2026 — Fase 1 · as fichas ganham casa, e o preço ganha trabalho

Quatro migrations. O commit de fechamento é `f1e41d6`.

**O princípio que decide a forma das tabelas: o node guarda a PERGUNTA; o banco guarda a RESPOSTA.** A ideia, o canal, o `@` e o modelo moram no `data` do node — o autosave já cuida deles, e duplicar o node copia a pergunta sem copiar as fichas, que é exatamente o comportamento certo e sai de graça. As fichas moram no banco porque três consumidores futuros vão lê-las.

**O node não guarda id nenhum**, e isso é o padrão do bloco de vídeo: `unique (project_id, node_id)` faz o bloco se reencontrar depois de um reload, sem uma segunda cópia para discordar do banco no instante em que mais custa.

**A menção guarda o HANDLE, nunca a versão congelada**, e é a decisão mais importante de `storyboard_scenes`. Uma ficha é um **plano**, não uma geração: congelar a versão aqui faria um roteiro escrito hoje gerar com a v4 amanhã, quando a personagem já estivesse na v6. A ficha aponta para a pessoa; a geração aponta para o retrato.

**O `media_kind = 'text'` num arquivo só de uma linha**, porque a documentação do PostgreSQL é explícita: um rótulo de enum acrescentado dentro de uma transação não pode ser usado antes do commit. Um arquivo a mais custa um arquivo; um `db push` que estoura na mão do Jorge custa uma rodada.

**Preço por TRABALHO, não por tamanho.** `ai_model_text_prices` tem `job_kind` como dimensão — escrever dez fichas do zero, estruturar um roteiro colado e reescrever uma ficha são três consumos de token medidos, e cobrar o mesmo pelos três seria o mesmo erro que cair no preço-base de 2K para entregar 4K. `estruturar` foi precificado sobre o **pior caso medido** (condensar 14 cenas em 10), nunca sobre o típico: calibrar contra a média é como um estruturar longo vira prejuízo silencioso.

#### Regra nova da casa: abaixo de ~20 ⚡, arredonda-se para CIMA

A régua sempre disse "arredondado ao múltiplo de 5 mais próximo", e isso funciona quando o preço tem dois ou três dígitos — o 4K foi de 112,1 para 110, um desconto de 2%. **No chão da régua ela se anula:** 5c × 1,35 = 6,75, que "ao mais próximo" vira 5 ⚡ e margem 1,0×. Abaixo de ~20 ⚡, sempre para cima.

#### A verificação: prova estrutural E prova ao vivo, as duas

Regra que o Jorge firmou aqui, e que vale além deste ciclo: **trava que nunca reprovou de verdade ainda não é trava.**

A verificação read-only leu do catálogo do Postgres — não das migrations, que dizem o que se pediu e não o que existe — as 25 constraints, as 10 políticas, os grants, os índices e os gatilhos. O teto de 10 foi avaliado nos casos que **reprovam**, incluindo o teto **contado**, que é coisa diferente do CHECK de `ordem`: aquele impede a cena de número 11, este impede a décima primeira **linha**.

E o ramo de imagem do `record_generation` foi provado inalterado por md5 do corpo no banco contra o da migration (idênticos — o que também prova que ninguém editou à mão no painel) mais um diff das linhas executáveis: 22 antes, 22 agora, zero divergências.

Depois vieram as travas **executadas**, dentro de `BEGIN … ROLLBACK`: 14 casos, 14 OK. O que mais valeu: **a 11ª linha barrou pelo trigger, com a mensagem dele** (`at most 10 scenes`), e não pelo CHECK de ordem — a trava certa recusando, provado por usar `ordem = 10`, que é número legal.

#### A faxina, com as tabelas em zero linhas

Dois achados da verificação, corrigidos no dia mais barato possível:

1. **Índice redundante.** `storyboard_scenes_storyboard_id_idx` tinha as mesmas colunas, na mesma ordem, que o índice do unique de ordem. Não foi erro de digitação: um foi escrito pensando na **leitura** e o outro na **trava**, em momentos diferentes do mesmo arquivo. Só lado a lado no catálogo ficou visível que são o mesmo objeto com dois nomes.
2. **`anon` com GRANT** em `ai_model_image_prices` e `ai_model_video_prices` — as irmãs antigas não levaram o `revoke` que as novas levaram. Sem vazamento (RLS default-deny fazia o visitante ler zero linhas), mas é a segunda camada que faltava.

### 16/08/2026 — Fase 2 · o motor, e a ordem que decide para que lado se erra

**A ordem de segurança é a única coisa não negociável do motor:**

> sessão → `@` resolvido **no escopo do projeto** → modelo e preço do catálogo → saldo → *daqui para baixo pode custar* → chamada → Zod → persistência → `record_generation`

Os quatro primeiros são antes de qualquer centavo, e a razão é aritmética: uma recusa no passo 2 não escreve linha, não toca o ledger e não chama ninguém — **zero Spark, e não "quase zero"**. O banco tem os mesmos cadeados um degrau abaixo (GN002, GN006, GN007); estes são os que disparam, aqueles são os que não deveriam precisar disparar nunca.

**A persistência vem antes da cobrança, e a escolha decide para que lado se erra.** Não há transação que abrace as duas — são duas chamadas, e uma delas é a função que cobra. Gravando primeiro, uma falha na cobrança deixa o usuário com um roteiro que não pagou; cobrando primeiro, deixaria alguém que pagou sem o roteiro. **Erra-se a favor de quem paga**, que é a mesma escolha do gerador de imagem ao ingerir o asset antes de chamar `record_generation`. O prejuízo tem teto conhecido: 15 ⚡.

#### A tarifa com vigência, e por que ela diverge do Claude Sonnet

`lib/ai/pricing.ts` registra o Sonnet pela tarifa de **lista** — errar para cima, não ter de lembrar do dia da virada. Aqui a escolha é a oposta, e é deliberada.

A promoção do `gemini-3.7-flash` vale **quatro meses e meio**, e é neste período que a Frente Storyboard faz sua conciliação extrato-contra-fatura. Um custo registrado com o dobro do valor real durante justamente a janela em que se está calibrando não é conservador: é ruído em cima do único número que a calibração existe para medir. E o seguro do Sonnet aqui é desnecessário, porque a vigência **está no código** em vez de na memória de alguém — em 01/01/2027 a segunda faixa passa a valer sozinha, sem deploy.

O preço em ⚡ não se move: foi semeado já calculado sobre a tarifa cheia, exatamente para que a virada não obrigue a mexer em preço.

#### Duas correções que o harness arrancou

Não são hipóteses — são coisas que passavam e não deviam:

1. **`parseCena` aceitava uma cena 1 marcada como continuação.** O roteiro inteiro tinha o `refine`, a cena avulsa não. O banco recusaria, mas no passo 7 — **depois** de o provedor ter sido pago, com "não foi possível" na tela e nada a fazer.
2. **Uma cena voltando com a ordem trocada seria gravada em silêncio.** A receita manda "não mude ordem", e instrução em prompt não é garantia. Sem a conferência, a substituição não casaria com ficha nenhuma, o roteiro seria regravado **idêntico**, a cobrança aconteceria e a tela diria que deu certo. **Um caminho que cobra e não muda nada é pior que um que falha: o segundo avisa.**

#### A prova

| o que | como |
|---|---|
| o contrato | 21 sabotagens recusadas + controle positivo (1, 2, 5 e 10 cenas, e os 8 enquadramentos do dicionário) |
| a receita | as três durezas conferidas no texto gerado, e determinismo (mesma entrada, mesma saída) |
| a tarifa | as duas faixas exercitadas sem esperar janeiro — 5/5/2¢ hoje, 10/9/3¢ em 2027 |
| as recusas | 9 casos ao vivo, duas rodadas, **banco idêntico antes e depois até o microssegundo** |
| a geração paga | 1 roteiro, 6 cenas, 15 ⚡, extrato conferido linha a linha |

**O placar de dinheiro:** 22 chamadas à rota, 21 recusas, 1 geração, **15 centavos**.

**As três durezas sobreviveram ao resultado real:** 6/6 ações com marca de tempo, 6/6 cenários distintos, 3/3 continuações abrindo com o rosto em câmera — e as três com frases diferentes, que é a regra do "VARIE" funcionando.

**E o extrato disse a frase certa:** `"Roteiro com @luna"`. Sem o ramo de texto que a migration acrescentou ao `case`, esta linha diria "Imagem no canvas com @luna" — e um extrato que nomeia errado o que foi comprado é pior que um que não nomeia nada.

**Custo real 4c contra 15 ⚡ cobrados**, na tarifa promocional: a conta bate com a fatura, que é o ponto inteiro de a vigência existir.

#### Uma nota de método, contra mim mesmo

Meu primeiro medidor das continuações marcou a cena 6 como "sem rosto em câmera". A ação era *"mantém o foco do olhar na câmera por um segundo"* — o rosto estava lá; a régua é que procurava um conjunto fechado de verbos e não previa aquela formulação. **O resultado estava certo e o medidor estava errado.**

Registrado porque o inverso — uma régua frouxa aprovando o que devia reprovar — é o mesmo erro com o sinal trocado, e é o mais perigoso dos dois. A única defesa contra ambos é ler o que foi medido, e não só o placar.

### 17/08/2026 — o plano vai para o disco antes da primeira fase (regra 9 do CLAUDE.md)

Achado do Jorge na retomada da Fase 3, e ele o chamou de raiz: **o plano do Ciclo 2 nunca existiu em disco.** As fases 0, 1 e 2 fecharam com commit, com evidência e com entrada aqui — e mesmo assim, ao retomar, a Fase 3 teve de ser reconstruída a partir de um enunciado escrito à mão por ele.

**O que faltava não era registro, era o tipo certo de registro.** O commit e este diário guardam o **porquê** de cada decisão, e guardam bem: nenhuma das três fases fechadas está mal documentada. O que nenhum dos dois responde é a pergunta com que uma sessão *começa* — **onde paramos e o que falta** —, porque um diário é cronológico por natureza e um commit fala do passado por definição. A pergunta do plano é sobre o futuro.

**E a sessão não serve de cofre.** O Jorge fecha tudo entre sessões, e isso é o modo normal de operar aqui, não exceção. Um plano que só vive no contexto da conversa morre no fechamento — e a sessão seguinte recomeça adivinhando o que já tinha sido aprovado, que é como uma decisão fechada volta a ser discutida. O custo não é o tempo da reconstrução: é a chance de a reconstrução sair **diferente** do que foi aprovado, e ninguém reparar.

A regra: todo plano de ciclo ou de frente vira `docs/plano-<frente>.md` **antes** do primeiro commit de código daquele plano, com as fases, o que cada uma entrega, a prova de cada uma, o status e o detalhe da fase aberta. Cada fase que fecha atualiza o status no mesmo arquivo, na mesma sessão.

Nasceu `docs/plano-storyboard-c2.md`, retroativo nas fases 0–2 (que ele descreve a partir do que foi executado) e prospectivo nas 3 e 4. **As duas metades estão marcadas como tais dentro do arquivo**, e a distinção não é preciosismo: uma delas é história e a outra é intenção, e um documento que as apresenta com a mesma cara ensina a ler intenção como fato — o mesmo defeito que fez `cenas_no_original` nascer na Fase 0.

#### E a primeira coisa que o arquivo pagou, no mesmo dia

O plano voltou para o Jorge conferir contra o original — que é a segunda metade da regra — e a conferência achou **três divergências** que teriam virado código errado:

1. **O ▸ não é expansor: é a ponte, e ela é da Fase 4.** Eu tinha lido o glifo como "expandir a linha no trilho". Ele é "criar o bloco de imagem a partir desta ficha", e nasce junto com a função. Daí a regra da casa que fica: **botão sem função não entra na tela.** Um glifo que aparece antes de fazer alguma coisa é uma promessa que a tela não pode cumprir, e quem o clica aprende que os botões daqui às vezes não fazem nada — o que estraga a confiança em todos os outros. E ver a ficha completa continua tendo **caminho único**, o overlay: dois caminhos para a mesma informação são duas telas para manter e duas para divergir.
2. **O checklist tinha perdido três itens na reconstrução** — o Roteiro na prateleira com glifo próprio, a `@` não vinculada com o banco intocado, e a edição à mão com `edited_at` gravado e o ledger idêntico. Os três voltaram; os que a reconstrução tinha acrescentado (os controles negativos do ritmo e da condensação, o print do colar-e-estruturar) ficaram. 12 itens, 15 arquivos.
3. **A ficha semeada foi autorizada com quatro condições** — `node_id` prefixado `seed-validacao-`, contagem de `generations` e do ledger idêntica antes e depois do seed **e** da limpeza, apagamento provado por contagem, e o registro explícito de que **o seed prova a tela e nada mais**: o caminho real é provado pela geração paga do dono, no fim, sem exceção.

**As três só apareceram porque o plano estava escrito.** Um plano na cabeça de alguém não se confere contra nada — e as três teriam sido descobertas com a tela pronta, que é quando corrigir custa a tela.

### 17/08/2026 — Fase 3 · a tela, e três coisas que só a validação produziu

O node de Roteiro inteiro: cabeçalho, configuração, campo de ideia, botão com **custo e saldo antes do clique**, e o trilho de fichas à direita. Mais o overlay `<dialog>` com a ficha completa, o colar-e-estruturar, o dropdown de CTA por canal, a fala dormente, o aviso de ritmo e o de condensação.

**O node guarda a pergunta; o banco guarda a resposta** — o princípio da Fase 1 aplicado à tela. O componente não guarda ficha nenhuma: lê `(project_id, node_id)` na montagem e relê quando o Realtime avisa. Dois presentes que isso dá de graça: **duplicar copia a receita e não o resultado** (o clone tem outro `node_id`, então nasce com o trilho vazio) e **recarregar no meio de nada perde nada**, porque não havia o que perder.

#### Botão sem função não entra na tela

O ▸ da linha compacta — a ponte para o bloco de imagem — quase entrou na Fase 3 porque **eu li o glifo como "expandir a linha"**, e o Jorge corrigiu conferindo o plano escrito contra o original. Ele é a ponte, e a ponte é a Fase 4.

A regra que fica vale além dele: **um glifo que aparece antes de fazer alguma coisa é uma promessa que a tela não pode cumprir**, e quem o clica aprende que os botões daqui às vezes não fazem nada — o que estraga a confiança em todos os outros. Pelo mesmo motivo o bloco nasceu **sem conector**: o fio nasce na Fase 4, com o que o usa.

E ver a ficha completa continua com **caminho único**, o overlay. Dois caminhos para a mesma informação seriam duas telas para manter, duas para divergir, e nenhuma das duas sendo *a* resposta para "onde eu vejo esta cena inteira?".

#### "Regerar esta cena · 5 ⚡" mora no overlay, nunca na lista

É o único gesto pago do trilho. Numa lista de dez linhas, dez botões de gastar a um clique de distância transformam a rolagem num campo minado — e o gesto que custa dinheiro fica **mais fácil** que o gesto que só olha. Dentro do overlay ele custa um passo a mais, e esse passo é a deliberação.

O par de frases ao redor dele existe pela mesma razão: **editar não é gerar**, e os dois gestos moram no mesmo overlay a poucos centímetros um do outro. O de baixo diz o número; o de cima diz "salvar não custa Spark nenhum". Um botão silencioso ao lado de um que gasta é lido como sendo do mesmo tipo.

#### A prateleira mentiu sobre si mesma pela segunda vez

O rodapé do trilho lateral dizia *"Storyboard e voz chegam nas próximas fases"* com o bloco de Roteiro desenhado três centímetros acima dela. O comentário no código já dizia que isso tinha acontecido com o vídeo em 13/08 — *"uma prateleira que desmente o que ela mesma oferece ensina a não ler o rodapé"* — e aconteceu de novo, no primeiro print da validação.

Duas vezes o mesmo defeito é sinal de que a frase estava larga demais: um rodapé que promete uma lista de coisas fica errado a cada entrega. Ele encolheu para o que ainda não existe **de verdade**, que hoje é só a voz.

#### A prova: 12 itens, e três com controle negativo

Zero Spark do primeiro ao último print — `generations` em 59, `ledger_transactions` em 45 e o saldo em 6.730 ⚡ do começo ao fim. Três itens não se contentaram com o caminho feliz, porque **um aviso que só acende nunca provou que sabe ficar apagado**:

| | acende | não acende |
|---|---|---|
| ritmo | 10 cenas = 50 s | **9 cenas = 45 s** — a fronteira exata que um `>=` no lugar do `>` teria errado |
| condensação | `cenas_no_original` 12 > 8 | **8 = 8, com `ajuste` dizendo "Condensado de 8 para 8 cenas"** — a frase mente, e a conta ganha |
| `@` não vinculada | aviso + botão morto | banco idêntico antes e depois: 59 / 45 / 6.730 |

O segundo é o defeito medido na Fase 0 reencenado na tela e barrado por ela.

E o item da `@` foi provado **pelo caminho real**, não simulado: a personagem foi desvinculada do projeto pela interface, o bloco passou a recusar guardando o handle, e ela foi revinculada. É a Etapa D2 acontecendo — *"uma aba aberta desde antes de um desvincular manda o mesmo corpo que um clique legítimo"*.

#### A ficha semeada, e o que ela não prova

Cinco itens precisavam de fichas na tela, e a única porta de ficha no produto é uma geração paga. O Jorge autorizou semear à mão com quatro condições, e a primeira mudou de forma durante a discussão: nasceu como "`node_id` prefixado" e virou **"`storyboards.ideia` prefixada"**, porque prefixar o `node_id` exigiria um script escrevendo à mão o `workflows.graph` — um roteiro automático editando o documento que **é** a verdade do canvas —, e a alternativa de marcar pelo **título** seria identificar por rótulo, contra a doutrina que fez `cenas_no_original` existir. Os dois nodes nasceram pela interface, com uuid do próprio app.

O que o seed prova é a **tela**. Que o motor produz fichas foi provado na Fase 2 e volta a ser provado no fechamento, pela geração paga do dono. A limpeza devolveu tudo: `storyboards` de 3 para 1, `storyboard_scenes` de 22 para 6, e o grafo com os mesmos 20 nodes e 19 arestas do retrato tirado antes — **zero divergência de ids**.

#### Uma nota de método, de novo contra mim mesmo

O seletor de personagem apareceu vazio no meio da validação, e por alguns minutos isso parecia defeito do bloco. Não era: **Fast Refresh recria um store de escopo de módulo sem re-rodar o efeito que o semeia**, e eu tinha acabado de editar um arquivo com a página aberta. Um reload devolveu tudo.

Registrado porque a conclusão errada estava a um passo — "meu filtro de vinculadas está errado" — e teria produzido um conserto para um problema que não existe. **Durante validação, editar código exige recarregar a página antes de acreditar no que se vê.**

#### O fechamento pago, pela interface — e o que o extrato disse

Duas gerações do Jorge, pelo bloco, com o extrato conferido linha a linha:

| quando | trabalho | descrição no extrato | ⚡ | custo real | tokens |
|---|---|---|---|---|---|
| 00:10:56 | `roteiro` | **"Roteiro com @luna"** | 15 | 4c | 1.357 / 1.203 |
| 00:13:02 | `estruturar` | **"Roteiro estruturado com @luna"** | 15 | 2c | 1.535 / 300 |

Saldo 6.730 → **6.700**; `generations` 59 → 61; `ledger_transactions` 45 → 47.

**As duas descrições são diferentes, e isso é o `case` do `record_generation` fazendo o trabalho dele.** A Fase 2 exercitou só o `roteiro`; foi aqui que o `estruturar` se nomeou pela primeira vez — e um extrato que chamasse os dois de "Roteiro" apagaria a única diferença que importa para quem confere a fatura: **o que foi comprado**.

**A margem se confirmou nos dois, e por baixo.** 4c e 2c de custo real contra 15 ⚡ cobrados, ambos **abaixo do pior caso medido** que fixou o preço — que é o comportamento certo de uma régua calibrada sobre o pior caso e não sobre a média.

**E as durezas da receita sobreviveram ao uso real:** o roteiro de 6 cenas saiu com **6 cenários distintos** e 2 continuações. O `estruturar` recebeu um texto de uma cena e devolveu uma, com `cenas_no_original = 1` — a conta dizendo corretamente que não houve condensação, sem frase nenhuma.

**O veredito que nenhuma consulta dá:** *"as fichas dirigem"*. Foi o dono quem assinou essa linha, como assinou a do Ciclo 1 — há metades que só olhar responde.

### 17/08/2026 — sinal do fundador: o fluxo está longo, e isso vira o critério do Ciclo 3

Registrado como **ressalva de produto**, não da Fase 3 — a tela entregou o que o plano pedia. É um sinal sobre o **fluxo inteiro**, dado por quem o percorreu de ponta a ponta pela primeira vez:

> *o fluxo de criação está me parecendo prolongado; concorrentes entregam vídeo satisfatório com uma folha e uma orientação básica.*

Isso deixa de ser impressão e passa a ser **o critério de sucesso do Ciclo 3**. A Máquina — template pré-montado no sidebar mais lote com portões de custo — não existe para acrescentar capacidade: existe para **comprimir este fluxo a "uma ideia e alguns cliques"**. E o teste dela é o mesmo julgamento humano de hoje: **se depois da Máquina o fluxo ainda parecer longo, o problema é de produto e o desenho volta à mesa** — não se resolve com mais um bloco.

Duas consequências práticas, decididas junto:

1. **Fase 4 enxuta.** A ponte manual entrega a ponte e nada além: o ▸, o fio vivo e o "corte para assumir". **Sem expansão de escopo** — cada coisa a mais nela é um passo a mais no fluxo que acabou de ser apontado como longo.
2. **O Ciclo 3 vira prioridade absoluta** na sequência, à frente de qualquer capacidade nova.

**Por que isto está no diário e não numa lista de tarefas:** é a primeira vez que a régua de sucesso do produto deixa de ser "a peça funciona" e passa a ser "quantos passos custa chegar ao vídeo". Uma frente que não souber disso vai otimizar a coisa certa da maneira errada — acrescentando poder onde o que falta é **caminho curto**.

### 18/08/2026 — Fase 4: a ponte manual, e a régua que ela move

**A entrega em uma linha:** o ▸ na linha da ficha põe um bloco Gerar Imagem no canvas, pré-preenchido e ligado à cena por um fio vivo — e cortar o fio é **assumir** o prompt.

#### A régua veio antes do desenho, e é o que justifica a fase

Desde o sinal de 17/08 a pergunta do produto deixou de ser "a peça funciona" e passou a ser "quantos passos até o vídeo". Então a fase foi planejada contando os passos que ela **remove**, e não os que ela acrescenta.

Da ficha pronta até a imagem, o caminho de ontem tinha **treze gestos**: abrir a ficha, selecionar a ação, copiar, fechar, clicar na prateleira, arrastar o bloco, digitar `@`, colar a ação, reabrir a ficha para ler o cenário, digitar o cenário, digitar o movimento, abrir "Ajustes de cena", traduzir `close_rosto` para "Close no rosto" de cabeça. Hoje são **dois**: ▸ e Gerar.

E a diferença não está só no número: **cinco dos treze eram cópia entre duas telas**, que é onde o erro entra — um cenário lembrado errado é uma imagem paga errada. A ponte não deixa a informação passar por mão nenhuma.

**E ela não acrescenta passo a quem não usa Roteiro.** O ▸ só existe na linha de uma ficha; um bloco que não é regido por ficha continua exatamente como era.

#### A corrente mora na aresta, e é isso que faz o corte existir

`storyboard --(sourceHandle: "cena-3")--> generator`, e **nenhuma cópia no `data` do bloco**.

O bloco de vídeo guarda `sourceNodeId` porque precisa dizer *de qual card* veio o still quando a mesma foto chega por dois caminhos. Aqui essa ambiguidade não existe — a aresta já carrega as duas pontas e o número da cena, no campo que o grafo salvo **já persistia**. Uma segunda cópia só existiria para poder discordar da primeira.

O dividendo é o gesto que dá nome à fase: **cortar o fio não precisa limpar nada.** O texto continua onde estava, e passa a ser de quem cortou. Nenhuma linha de código precisou combinar essas duas coisas — zero migration, zero campo novo.

#### O campo travado, e por que não "editável com aviso"

Enquanto a ficha rege, o prompt é somente-leitura, com *Assumir o prompt* ao lado. A alternativa — deixar editar e avisar — daria ao produto as duas coisas ao mesmo tempo: um gesto de assumir **e** um jeito de perder o que se escreveu sem nunca ter usado, porque a próxima edição da ficha passaria por cima. Um campo travado com o destravador ao lado ensina o gesto na primeira vez que alguém tenta digitar.

Consequência que o `readOnly` obrigou a fechar: **a lista de sugestões de `@` também cala**. Ela existe para *escrever* uma menção, e aceitar uma sugestão num campo travado seria a única porta pela qual ele ainda podia ser alterado.

#### A emenda do Jorge: religar confirma quando há texto a perder

Aprovada com emenda no mesmo dia. Três casos, e só um pergunta:

| o prompt do bloco | o que acontece |
|---|---|
| vazio | substitui **em silêncio** — não há nada a perder |
| igual ao que a ficha compila | substitui **em silêncio** — não muda um caractere |
| não-vazio e diferente | **pergunta**, nomeando a cena: *"O prompt escrito à mão será substituído pelo da Cena 1."* |

**A pergunta acontece antes de a aresta existir**, e é isso que a mantém honesta: *Cancelar* devolve o canvas exatamente como estava, porque o documento ainda não tinha mudado. É a mesma doutrina de "gerar por cima" do bloco de Roteiro — substituir com confirmação, **contando a perda**.

E a confirmação é do **religar**, nunca do fio vivo. Enquanto o fio existe o campo está travado, então a única divergência possível é a ficha ter mudado — que é precisamente o trabalho do fio vivo. Um sync que perguntasse transformaria a regência no questionário que o "corte para assumir" existe para não ser.

#### O enquadramento provou uma decisão de três dias antes

`storyboard_scenes.enquadramento` reusa `ENQUADRAMENTO_KEYS`, que é a §5.27 do character sheet copiada verbatim — decisão de 15/08, tomada por "onde já existe vocabulário fechado não se inventa vocabulário paralelo". A cobrança chegou aqui: a passagem da ficha para o bloco é **`data.anguloKey = cena.enquadramento`**, atribuição direta. Uma segunda lista teria virado uma função de conversão com oito casos e um `default` — e o `default` de uma tabela de tradução é sempre por onde ela erra.

#### A prova, e a parte dela que não é print

Os três ramos do ▸ são afirmações sobre **números**, e um print de um canvas com um bloco não distingue "não criou o segundo" de "criou o segundo fora da tela". Por isso a fase tem duas metades de prova:

**Estrutural** — o store de verdade rodando fora do React, 49 verificações, todas passando: a fórmula do prompt (com movimento vazio, personagem nulo, handle impossível e enquadramento desconhecido), os três ramos por contagem, o fio vivo, a guarda do "só escreve se mudou", o corte, o religar nos dois sentidos, o Cancelar e o Substituir, e o fio apontando para uma cena que não existe mais.

**Ao vivo** — 13 arquivos de evidência, **zero Spark**: `generations` 61, `ledger_transactions` 47 e saldo 6.700 ⚡ idênticos do primeiro ao último print. Com dois controles negativos: religar sobre prompt idêntico **não** pergunta nada, e Cancelar não muda um caractere.

E o retrato do grafo fechou: 22 nodes e 19 arestas antes, 22 e 19 depois, com zero arestas de cena restantes.

#### Uma nota de método, e ela custou uma hora

O bloco criado pelo ▸ apareceu **invisível**, e o canvas inteiro parou de desenhar arestas. Passei a investigar como defeito da ponte — li o bundle do React Flow, instrumentei renders, contei requisições no servidor.

Não era defeito nenhum. **A aba do Chrome estava em background**, e sem layout o `ResizeObserver` não dispara: o React Flow não mede os nodes, os mantém em `visibility: hidden` e **não desenha aresta nenhuma** enquanto houver node não medido. Rodar JS na aba (que a ativa) fez os 23 nodes e as 17 arestas aparecerem de uma vez.

Registrado porque a conclusão errada estava a um passo — eu ia "consertar" o `publishScenes` — e porque isso amplia uma limitação que já estava no diário desde 15/08 em versão mais estreita: *o navegador não decodifica vídeo em aba escondida*. A versão larga é **nenhuma validação de canvas vale em aba escondida**, e o instrumento que resolve é o `browser_batch`: JS e screenshot na mesma chamada mantêm a aba ativa entre os dois.

O que salvou foi a regra de sempre: **medir com JS antes de consertar**. O print dizia "quebrado"; a medição disse `visibilityState: "hidden"`.

#### O ciclo fecha aqui

Cinco fases, 4 migrations, 6 commits. **30 ⚡ gastos em roteiro** no total (as duas gerações do fechamento da Fase 3), com custo real de 6 centavos — margem confirmada por baixo nas duas. O Ciclo 3 (A Máquina) é a próxima prioridade, e o teste dele é o mesmo julgamento humano: se depois dele o fluxo ainda parecer longo, o desenho volta à mesa.

### 26/08/2026 — Fase 4 · o fechamento do dono: a ficha virou imagem paga, e a recusa custou zero

**A prova que faltava, e que nenhum print de interface dá:** o ▸ da Cena 1 pôs o bloco no canvas, o bloco gerou, e saiu uma imagem paga de **75 ⚡** sobre custo real de **56 centavos** — margem confirmada por baixo, como nas outras. Veredito do dono: *a imagem é a cena*.

**A corrente sobreviveu até a geração.** O grafo salvo tem a aresta `69f58d35 --(sourceHandle: "cena-1")--> 039bf703`, e `039bf703` é exatamente o `node_id` gravado na geração. A imagem não saiu de um bloco que *um dia* veio de uma ficha: saiu de um bloco **ainda regido por ela**, com o campo travado.

**E o prompt é a ficha, campo por campo:**

| a ficha (Cena 1) | o que chegou ao prompt |
|---|---|
| `acao` | "aponta para o liquidificador sobre a bancada por um segundo e fala empolgada olhando para a lente durante três segundos" |
| `cenario` | "cozinha moderna com bancada de granito claro" |
| `movimento` | "câmera estática no tripé" |
| `enquadramento: plano_americano` | `ajustes_cena → angulo_camera` → *"medium-full shot, framed from mid-thigh up"* |
| `personagem_handle: luna` | `@luna`, sujeito da frase |

O `enquadramento` é o dividendo da decisão de 15/08 cobrado em dinheiro: a ficha usa `ENQUADRAMENTO_KEYS`, o bloco usa `ENQUADRAMENTO_KEYS`, e a passagem entre os dois é **atribuição** — não existe tabela de conversão para errar no `default`.

**O compilado fecha a invariante 13 inteira**, e é o que o "Ver prompt" mostrou:

| campo do `prompt_compiled` | valor | o que prova |
|---|---|---|
| `personagem.versao` | `4`, com `entity_version_id` | a menção resolveu **versão congelada**, no servidor |
| `sheet_source` | `version` | reproduzível — não é rascunho |
| `mencao_sujeito` | `{handle: "luna", sujeito: "ela"}` | a menção virou **sujeito**, não foi apagada |
| `regra_diretor` | `prompt_dirige` | a cena é dirigida pelo prompt… |
| `traje_canonico` · `cena_padrao` | `null` · `[]` | …então o traje de banho e os padrões do sheet **não entraram** |
| `cena_usuario` | `pt` **e** `en` | a auditoria bilíngue, em toda geração |

**A recusa que custou zero, e que é meia prova sozinha.** Vinte e sete segundos antes da imagem paga, o **mesmo prompt** foi recusado pelo provedor: `400 Image generation blocked due to safety violations`. O extrato do dia:

| | fim da Fase 4 (18/08) | agora |
|---|---|---|
| `generations` | 61 | **63** |
| `ledger_transactions` | 47 | **48** |
| saldo | 6.700 ⚡ | **6.625 ⚡** |

**Duas gerações, um lançamento só.** A recusa virou linha em `generations` com `failed` e `0/0`, e **nenhuma linha no livro**. É a invariante 7 e a 5 se encontrando na prática: recusa de política é erro **esperado**, e o que não executou não lança. O saldo caiu exatamente os 75 da imagem que existe.

**E o achado que fica para o Ciclo 3:** o mesmo texto foi recusado e aceito com 27 segundos de diferença. Uma amostra não mede taxa, mas basta para afirmar o essencial — **o filtro do provedor não é função determinística do prompt**. "Tentar de novo" é resposta legítima, e uma recusa não é veredito sobre o que a pessoa escreveu. A Máquina rege dez fichas de uma vez: um lote de dez vai encontrar isso, e precisa tratar a recusa de uma cena como **uma cena para repetir** — nunca como lote perdido, nunca como prompt a reescrever.

### 26/08/2026 — Registro de ritual: evidência fecha, commit sela — e é a terceira vez

**O que aconteceu.** O commit da Fase 4 (`7e10ff0`, 18/08) saiu com os docs já dizendo *"o ciclo fecha aqui"* — e a metade da prova que é do dono, a geração paga, só aconteceu **oito dias depois**. O código estava provado: 49 verificações estruturais e 13 arquivos de evidência ao vivo. Mas **provado não é selado**.

**Por que é erro mesmo quando o código está certo.** O commit é o que diz *isto está pronto*. Commitar antes da metade do dono faz uma etapa que está **esperando** ter a mesma aparência de uma etapa **fechada** — e essa é, palavra por palavra, a forma de falha que já está neste diário no caso do commit-sem-push (09/08): *quando o sucesso e a pendência têm a mesma aparência, o ritual precisa produzir uma evidência que só existe no sucesso.* Lá a evidência virou a linha do `git log origin/master`. Aqui ela é a geração paga.

**O diagnóstico da terceira repetição, que é o que interessa.** A regra 8 já mandava esperar o ok — mas ela não dizia **de qual prova** o ok é quando a prova tem duas metades. Esta fase tinha duas: a minha (13 prints, zero Spark) e a do dono (uma imagem paga). O commit ancorou na metade que estava na minha mão, que é a que fica pronta primeiro — e **ficar pronta primeiro não é ser a última**.

**A regra, em uma linha: evidência fecha, commit sela.** O commit espera a **última** metade da prova, não a primeira. Se parte dela é do Jorge — qualquer item de geração ou de dado financeiro —, a etapa continua aberta e **não commitada** até essa metade chegar.

**O que custou desta vez:** oito dias em que o `produto.md` dizia "✅ concluído" sobre um ciclo cuja única prova de *geração* ainda não existia. Nada quebrou e o veredito veio positivo — mas o documento andou na frente do fato, que é precisamente o que este diário existe para impedir. Entrou na **regra 8 do `CLAUDE.md`**, porque duas passagens só pelo diário não seguraram a terceira.

---

## Mini-ciclo — Faxina de Egress

### 27/08/2026 — O plano, e a correção de diagnóstico que a investigação impôs

**O sintoma.** Egress a **170% da cota free por dois ciclos** seguidos, galeria levando ~5 s por imagem, e *cached egress* em 5% — quase nada aproveitando cache.

**O diagnóstico preliminar dizia: assets gigantes.** 2K/4K, 8-15 MB, servidos em cards pequenos. **A medição disse outra coisa**, e a diferença muda o desenho do conserto.

| | o palpite | o fato, lido do banco |
|---|---|---|
| tamanho da imagem gerada | 8-15 MB | **1,84 MB de média** (maior: 7,57 MB) |
| quantas | — | **40**, somando 72 MB |
| como aparecem | cards pequenos | **24 por vez**, num grid de **175 px de lado** |

A conta fecha sozinha: `24 × 1,84 MB ≈ 44 MB por visita`. A 170% de 5 GB são ~8,5 GB — **~193 visitas de galeria**. Com Fast Refresh recarregando a página a cada edição, isso explica o consumo inteiro sem precisar de segunda causa.

**A frase que fica:** o desperdício era de **proporção, não de tamanho**. Uma imagem de 1,84 MB num quadro de 175 px é **~40× mais bytes do que a tela pode mostrar**, e nenhuma delas é grande o bastante para chamar atenção sozinha. Foi por isso que passou dois ciclos despercebido: não havia um arquivo culpado para achar. Procurar o arquivo gigante teria consumido a investigação inteira e não teria encontrado nada — **o defeito estava na razão entre dois números, e razão não aparece numa lista ordenada por tamanho.**

### 27/08/2026 — URL estável e `cacheControl` são uma fase só, porque separados o header é peso morto

O briefing pedia as duas coisas como itens independentes. **Não são.** Cache — o do navegador e o do Cloudflare na frente do Storage — indexa pela **URL inteira, query incluída**. A URL assinada do Supabase carrega um JWT com o relógio do servidor dentro, então cada assinatura produz uma URL diferente: chave de cache nova, e o `max-age` nunca chega a ser consultado.

Consequência prática: **`cacheControl: immutable` sozinho não faz absolutamente nada.** Entregue sem a URL estável, seria um header correto, bem-intencionado e completamente inerte — e, pior, teria a aparência de trabalho feito. Viraram uma fase única.

É também o que explica o *cached egress* em 5%: não é o cache falhando, é o cache **nunca sendo consultado**.

### 27/08/2026 — O bucket público de miniaturas: visto, e recusado pelo motivo certo

Havia um caminho de longe mais simples que todos os outros. Miniatura em **bucket público**: URL eterna, sem assinatura nenhuma, sem viagem de servidor, CDN perfeito, e a Fase 3 inteira deixaria de existir.

**Recusado.** Bucket público significa que qualquer pessoa com a URL vê a imagem, e o caminho ser um UUID não muda isso: **"ninguém adivinha o UUID" não é política de segurança para o rosto de uma influencer que é da pessoa.** URL não adivinhável é obscuridade, não controle de acesso — e este produto existe justamente para gerar o rosto que é de alguém.

Fica registrado porque **a opção existe, foi vista, e foi recusada** — não esquecida. Quem reencontrar essa ideia daqui a seis meses e achar que ninguém pensou nela vai encontrar aqui a resposta e o porquê.

**Escolhido no lugar:** cache das URLs assinadas num `Map` em módulo do servidor, com TTL de 7 dias. Zero migration, e — o que decidiu — **quando erra, entrega uma URL nova, que é exatamente o comportamento de hoje**. Um cache cujo pior caso é o presente não pode piorar nada. Se o acerto medido em produção decepcionar, a tabela entra depois.

**Com uma advertência dita antes de medir:** em `localhost` o Node é um processo só e sempre quente, então o acerto será 100% e **a medição vai mentir a favor**. A prova da Fase 3 tem que ser lida com isso na mão.

### 27/08/2026 — Log que expira em 24 h não serve de baseline retroativo

O plano pedia confirmar no Logs Explorer quais objetos dominavam o egress real — *confirmar o diagnóstico no fato, não no palpite*. **Não foi possível:** a janela de consulta do Supabase é de **24 horas**, e nelas o app esteve parado. Os 6 registros de `edge_logs` do período são `auth/token` e o websocket do Realtime; **nenhuma requisição de Storage**.

Não é uma desculpa, é uma propriedade do instrumento, e ela tem consequência de método: **o baseline de um problema que já aconteceu precisa ser reproduzido, não recuperado.** A confirmação virou trabalho da Fase 0 — produzir a visita e ler o log dela no mesmo dia.

### 27/08/2026 — As três decisões de desenho que o plano fixou

**A miniatura é caminho, não coluna.** `thumbPath(p) = p + ".thumb.webp"` — função pura, total, sem parsing e sem migration. **Acrescenta** a extensão em vez de substituir, porque trocar `.jpg` por `.webp` colidiria se dois assets diferissem só na extensão. E o `createSignedUrls` do Supabase já devolve erro **por caminho**, com `signedUrl: null` para o que não existe: dá para perguntar *"existe miniatura?"* na mesma viagem que já assina — sem requisição extra e sem 404 no navegador. O fallback do requisito 3 mora na **forma da resposta**, não num `try`.

**Dois produtores, porque é o desenho que gasta menos.** A miniatura é feita **onde os bytes já estão**: no servidor com `sharp` para a imagem gerada (o servidor já tem os bytes para subir o original), e no navegador com canvas para a enviada (o arquivo vai do navegador direto ao bucket, sem passar pelo servidor). Um produtor só custaria um download em um dos dois casos. Não é repetição — é a única divisão que não paga egress para economizar egress.

**`sharp` declarado.** Já estava em `node_modules` como `optionalDependency` do `next@16.3.0`, então declarar **não baixa um byte novo**. Mas depender de um pacote que só existe por ser opcional de outro é frágil: um `npm i --no-optional` derrubaria a geração de miniaturas sem aviso. Declarar é formalizar o que já está no disco.

### 27/08/2026 — Fase 0 · a medição achou uma segunda doença, e corrigiu duas coisas que eu tinha afirmado

**A pergunta 0.1, respondida por dentro do token.** 24 caminhos comparados entre duas visitas à galeria: **24 tokens diferentes, nenhum igual**. O payload decodificado é `{url, scope, iat, exp}`, com `exp − iat = 3600`. O `iat` é o relógio do servidor no instante da assinatura — **é ele que torna a URL irrepetível**, e portanto o cache inconsultável. A Fase 3 fica de pé como escrita.

**As duas doenças são diferentes, e essa é a descoberta da fase.**

| | galeria | canvas |
|---|---|---|
| sintoma | 22 MB por visita | 16,5 s até a última imagem |
| causa | **banda** — 20 de 20 requisições sobrepostas | **fila** — 66 Server Actions serializadas |
| prova | mediana de 1.164 ms por imagem, em paralelo | soma 13,03 s ÷ janela 13,17 s = **razão 1,01** |
| conserto | a miniatura | assinar em lote |

Razão 1,01 é fila perfeita: se as 66 chamadas fossem paralelas, a janela seria ≈ a maior delas (~300 ms); sendo a **soma**, cada card espera todos os anteriores. E cada chamada é rápida — 111 ms de TTFB mediano. **O gargalo não são os bytes, é a contagem de idas ao servidor**, e nenhuma miniatura toca nisso.

Virou **fase proposta 5**, não emenda da Fase 2. O plano tinha escrito, antes de medir, que se essa hipótese aparecesse ela voltaria para o Jorge — e voltou. Misturá-la na Fase 2 faria a prova medir duas coisas ao mesmo tempo sem poder atribuir o ganho a nenhuma.

**A correção que a medição fez em mim.** O plano afirmava que a maior imagem era 960×960, lendo `assets.width/height`. Medidas no navegador, são **1856×2304** e **2752×1536** — classe 2K. O erro tem nome: **51 das 52 linhas têm esses campos nulos**, e um `max()` sobre quase-tudo-nulo não é medição, é um artefato com aparência de fato. É exatamente o mesmo defeito que este plano acusa no diagnóstico preliminar — afirmar sobre um campo que ninguém preencheu —, cometido por mim três parágrafos depois de acusá-lo.

O saldo do diagnóstico fica assim: o palpite do Jorge estava **certo sobre as dimensões** e superestimava só o peso (1,84 MB de média, não 8-15 MB). O que a investigação de fato acrescentou não foi "as imagens são menores" — foi **a proporção**: caixa de 173 px, DPR 1, **56× de desperdício em área na média** e 143× no pior caso.

### 27/08/2026 — Duas armadilhas de instrumento, registradas porque quase viraram achado

**`transferSize` mente por omissão.** A primeira leitura pela Resource Timing API devolveu `transferSize: 0` nos 34 recursos. A conclusão natural — *"34 de 34 servidos do cache"* — seria **o oposto exato da verdade**, num plano cujo tema inteiro é cache. O que denunciou foi a inconsistência interna: `total_ms: 1535` ao lado de `baixando_ms: 7465`, e um download não dura mais que a requisição que o contém.

Causa: recurso **cross-origin sem `Timing-Allow-Origin`** tem `transferSize`, `encodedBodySize` e `responseStart` zerados pelo navegador. Sobrevivem `startTime`, `duration` e `responseEnd` — e é só com esses três que toda a Fase 0 foi medida.

A consequência é permanente e vale para a Fase 3: **do lado do navegador não existe instrumento que confirme o "cached egress"**. Quem tem esse número é o painel do Supabase. A prova de que o cache passou a funcionar terá que ser feita com o que é legível — a **URL idêntica** entre duas visitas, e a requisição que não acontece.

**O 503 que não era erro.** O log de rede mostrou 16 requisições com **503** para 3 vídeos, com cara de servidor recusando sob carga. Conferido antes de virar achado: `fetch` direto nos mesmos URLs devolveu **206 em todos**, concorrente e sequencial. É como o log marca requisição de mídia **abortada** — `preload="metadata"` pede, recebe o `moov` e cancela.

**A lição comum às duas:** *o instrumento faz parte do achado.* Um número que vem de uma API não é um fato até alguém conferir se aquela API podia responder aquela pergunta naquele contexto. As duas seriam entradas neste diário como descobertas — uma delas invertendo o diagnóstico do mini-ciclo inteiro — se a conferência não tivesse vindo antes.

De quebra: o `moov` destes MP4 está no início e pesa ~5,6 kB, então `preload="metadata"` puxa muito pouco. **O pôster de vídeo move ainda menos o ponteiro do que o plano estimava** — a ressalva de "menor metade" sai mais forte, não mais fraca.

### 27/08/2026 — Três registros de método que saíram da Fase 0

**A prova da Fase 3 muda de instrumento.** Como a Resource Timing zera `transferSize` em recurso cross-origin sem `Timing-Allow-Origin`, **o navegador não consegue confirmar cache** dos nossos assets. O "cached egress" é um número do painel do Supabase, e nenhuma medição de página o reproduz. Então a prova de que o cache passou a funcionar não é um byte contado: é **a URL idêntica entre duas visitas, e a requisição que não acontece**. Ausência conferida vale prova quando a presença é ilegível.

**"Os bytes são a invariante, a banda não é" — e isso vira método.** A galeria mediu 1,74 s hoje e ~5 s por imagem na experiência do Jorge; as duas leituras são do mesmo defeito, separadas só pela velocidade do link do dia. Segundos medem a conexão de quem mediu; **bytes medem o produto**. Daqui em diante, toda medição de desempenho de rede deste projeto reporta **bytes primeiro** — o tempo entra como ilustração, nunca como a régua. Uma otimização julgada por segundos passa numa fibra e reprova num 4G, e nós não saberíamos qual das duas era verdade.

**A autocorreção fica escrita.** O `max()` sobre `assets.width/height` com 51 de 52 linhas nulas produziu "960×960" — um artefato com aparência de fato, no mesmo documento em que eu acusava o diagnóstico preliminar de afirmar sobre campo não preenchido. Fica no diário na forma em que aconteceu, e não resumido: **o rigor apontado para fora só vale se for apontado para dentro com a mesma força.** O antídoto é uma pergunta de uma linha — *quantas linhas desta coluna estão preenchidas?* — que eu não fiz antes de agregar.

### 27/08/2026 — A Fase 5 entra: o portão pré-registrado se pagou

A assinatura em lote no canvas entrou no mini-ciclo. O veredito do dono, com os três motivos:

**(a) O portão estava pré-registrado.** O plano dizia, *antes* de medir, que se a hipótese da fila aparecesse ela voltaria como fase proposta. Apareceu, e voltou. **Isto é o plano se honrando, não escopo crescendo** — e a diferença entre as duas coisas é justamente ter escrito o portão antes de saber a resposta. Um escopo que cresce é um que ninguém previu; este estava previsto, com a condição de disparo por escrito.

**(b) É o território do sinal do fundador.** 13,17 s de fila e 16,5 s até a última imagem, **por abertura de canvas** — e o Ciclo 3 (a Máquina) vai abrir e povoar canvas o tempo todo. **Construir a Máquina sobre fila serializada é multiplicar a espera que já foi reclamada.** Consertar depois seria consertar em cima de dez vezes mais nodes.

**(c) O conserto usa máquina que já existe.** O `MAX_IDS = 60` do `signAssetUrls` foi escrito para assinar em lote; a galeria já assina assim. Não é capacidade nova — é usar a que está lá.

**E uma decisão de escopo dentro da Fase 1:** o `sharp` vai decodificar cada imagem de qualquer maneira para produzir a miniatura, e nesse ponto as dimensões estão na mão. **Se gravar `assets.width/height` custar uma linha, grava** — é o buraco que produziu o "960×960". Se custar mais que uma linha, vira backlog. A regra que decide não é "seria bom ter": é **fase enxuta continua valendo**, e um derivado oportunista não pode virar sub-projeto.

### 27/08/2026 — Fase 1 · a miniatura nasce, e duas coisas só apareceram porque foram conferidas

**O corte:** 55 miniaturas de **20 kB de média** ao lado de originais de 1.530 kB — 1.069 kB contra 85 MB. O plano projetava ~50 kB por miniatura; o alvo caiu com folga. O backfill fez **54 de 54 com zero falhas**, baixando **73,5 MB uma vez** (a previsão era ~73 MB), e a quarta execução pulou todas e baixou **zero byte em 0,2 s** — a idempotência que faz dela também a ferramenta de reparo.

**O requisito 1, provado por timestamp e não por promessa:** dos 57 originais, **nenhum** foi modificado durante o backfill; o mais recente era do dia anterior. Uma garantia que se lê no banco vale mais do que uma que se lê no código.

#### O bug que a tela nunca denunciaria

O `metadata()` do sharp **ignora a orientação EXIF, mesmo com `autoOrient: true` no construtor**. Num JPEG de 2000×1200 com `orientation: 6`, ele responde 2000×1200 enquanto a imagem é vista 1200×2000. O campo certo é `metadata().autoOrient`.

O que faz disso um registro de diário não é o erro — é **por que ele teria sobrevivido**. A miniatura já saía correta: a rotação é aplicada no pipeline. Então nenhuma tela, nenhum print, nenhuma revisão visual mostraria qualquer coisa errada. **Só a coluna `width` ficaria com largura e altura trocadas, em silêncio, para sempre** — toda foto de celular em pé gravada como paisagem.

Foi achado porque a afirmação "o `autoOrient` resolve" foi **medida em vez de lida**, com uma imagem construída de propósito para falhar. É a mesma doutrina que pegou o `transferSize` na Fase 0, e a regra que sai das duas é a mesma: **quando o caminho feliz e o caminho errado produzem a mesma tela, só um teste que sabe a resposta separa os dois.**

#### `assets` é imutável para o usuário, e isso decidiu o oportunista

A regra do dono era *uma linha entra, mais que isso vira backlog*. A resposta veio partida, por uma propriedade do banco que ninguém tinha escrito: **`assets` não tem política de UPDATE** — só SELECT, INSERT e DELETE. Com RLS default-deny, o `update` que eu havia posto no backfill afetou **zero linhas e não reclamou**: o PostgREST responde sucesso, e a coluna continua vazia.

Só apareceu porque a coluna foi conferida **depois** de rodar. Eu havia marcado a escrita como "best-effort" no comentário, e best-effort é exatamente o rótulo que faz alguém não conferir se funcionou.

| | custo | veredito |
|---|---|---|
| imagens novas, no `INSERT` | uma linha, sem política nenhuma | **entrou** — provado por upload real |
| as 52 linhas antigas, por `UPDATE` | migration criando política | **backlog** |

E o backlog não é só aritmética de linhas: **uma linha de `assets` é o registro de um arquivo que existe, e é escrita uma vez.** Criar a política trocaria uma imutabilidade deliberada por um dado cosmético. O `update` morto foi removido do código — **código que silenciosamente não faz nada é pior que código ausente**, porque o próximo leitor vai acreditar nele.

#### Dois produtores, e a razão que não é simetria

A miniatura nasce **onde os bytes já estão**: no servidor com `sharp` para a imagem gerada, no navegador com canvas para a enviada. Não é duplicação por descuido — é a única divisão que não paga egress para economizar egress. Um produtor só obrigaria a baixar 1,8 MB que o servidor já tinha, ou a baixar do bucket o que o navegador acabou de ler do disco.

Os dois lados precisam concordar sobre o que é largura, e isso foi conferido nos dois: `meta.autoOrient` no servidor, `createImageBitmap(..., { imageOrientation: "from-image" })` no navegador, este último provado por um upload real de imagem girada — 2400×1600 no arquivo, **1600×2400** gravados em `assets`.

#### E o backfill não virou botão

O lugar óbvio seria a Conta, e ela **recusa por escrito**: *"só leitura, e a ausência é o conteúdo"*. Pôr manutenção ali contradiria o desenho declarado da página. E não faria falta a ninguém: uma miniatura ausente é **invisível** — a tela cai para o original e mostra a mesma imagem. Não é defeito de produto, é ineficiência de custo, e **um botão para consertar o que o usuário não pode ver é superfície de produto sem leitor**. Ficou como rota POST de manutenção, com o modo de rodar escrito no topo do arquivo.

### 27/08/2026 — Três regras de método que a Fase 1 deixou

**"Escrita sem política de RLS não falha — ela não acontece."** É a armadilha silenciosa do default-deny, e agora ela tem nome. Um `UPDATE` numa tabela sem política de UPDATE não estoura, não avisa e não volta erro: o PostgREST responde **sucesso com zero linhas afetadas**. O código parece funcionar, o log fica limpo, e a coluna continua vazia para sempre. Sempre que uma escrita nova tocar uma tabela, a pergunta é **"existe política para este verbo?"** — e a conferência é olhar o dado depois, não o retorno da chamada.

**"Best-effort é o rótulo que faz alguém não conferir."** Eu havia marcado a escrita das dimensões como best-effort no comentário, e foi exatamente isso que a protegeu de ser verificada: um código declaradamente opcional convida quem lê — inclusive quem escreveu — a não perguntar se funcionou. O rótulo é legítimo, mas **best-effort descreve o que fazer quando falha, não licença para não saber se falhou.** Toda vez que algo for marcado assim, o par obrigatório é uma conferência do resultado.

**O teste que já sabe a resposta — segunda aparição, promovido a método da casa.** Duas vezes no mesmo dia um defeito sobreviveria a qualquer inspeção visual:

| | o que mentia | por que a tela não denunciava |
|---|---|---|
| Fase 0 | `transferSize: 0` em recurso cross-origin | "34 de 34 do cache" é uma frase plausível — e era o oposto da verdade |
| Fase 1 | `metadata()` ignorando o EXIF | a miniatura **saía correta**; só a coluna `width` ficava trocada |

A regra: **quando o caminho certo e o caminho errado produzem a mesma tela, só um teste que já sabe a resposta separa os dois.** Na prática é construir a entrada de propósito para falhar — uma imagem com `orientation: 6` cuja resposta correta se conhece antes de rodar — em vez de observar o comportamento e concluir que está bom. Observação confirma o que já se acredita; **entrada construída é o que discorda.**

### 27/08/2026 — O pôster de vídeo, cortado pela medição e não por escopo

O item era do briefing do dono, e **a Fase 0 o desautorizou**: o `moov` destes MP4 está no início do arquivo e pesa ~5,6 kB, então o `preload="metadata"` que a grade já usa puxa quase nada. O pôster custaria um caminho de upload oportunista, com tratamento de aba escondida (a limitação já documentada em 15/08), para economizar quilobytes.

Fica registrado com esta forma porque a forma importa: **não foi cortado por escopo, foi cortado por número.** Ninguém decidiu que era muito trabalho — a medição mostrou que o ganho não existia. **O briefing propõe, a medição dispõe**, e um item que sobrevive a essa ordem vale mais do que um que nunca foi testado contra ela.

### 27/08/2026 — Fase 2 · a tela lê a miniatura: 97,92% a menos, e visualmente a mesma tela

**O número, nos mesmos 21 arquivos que a Fase 0 mediu:** 23.101.806 bytes viraram 479.392. **22,03 MB → 468 kB, corte de 97,92%** — 48× menos. O plano prometia ~97%.

**O que a tela de fato pediu**, que é a prova de que a troca é completa e não parcial: galeria **21 miniaturas e zero `.jpg` original**; canvas **24 miniaturas e zero `.jpg` original**; **zero imagens quebradas** nas duas. As não-miniaturas são todas `.mp4`.

**Requisito 1, as duas metades numa tela só:** com o Lightbox aberto sobre a grade, o zoom pede **o original em 2752×1536** e a grade atrás pede miniatura em 412×512. A mesma tela prova o corte e a inviolabilidade.

**O tempo entrou como ilustração, não como régua** — pelo método registrado hoje: janela de download 1,74 s → 0,76 s, mediana por imagem 1.164 ms → 170 ms. São números da conexão desta hora; os bytes são do produto.

#### A forma da resposta é o que torna o requisito 3 estrutural

`signWithThumbnails` devolve `{ full, thumb }` e **`thumb` nunca é nulo**: sem miniatura, vem o endereço do original. O requisito *"miniatura que falha não bloqueia nada"* deixou de ser um `if` que cinco telas precisariam lembrar de escrever e virou **propriedade da forma da resposta**. A tela pinta a mesma imagem; só o peso muda.

E custa **zero requisição a mais**: `createSignedUrls` responde por caminho, então original e miniatura saem na mesma viagem. Foi isso que dispensou a coluna `has_thumbnail` — **o Storage é a autoridade sobre o que está no Storage**, e um booleano no banco só poderia discordar dele. É a mesma família de decisão do `derived_from_asset_id`: *o dado identifica, nunca o rótulo*.

#### A varredura que era o risco real da fase

O perigo desta fase nunca foi a tela ficar feia — era **uma URL de exibição vazar para um caminho que alimenta geração paga**, e degradar silenciosamente a qualidade do que o usuário compra. Conferido um a um:

| caminho | lê | |
|---|---|---|
| referências que vão ao provedor (`asset-payloads.ts`) | `download(storage_path)`, no servidor | intocado — nunca passou por `signAssetUrls` |
| download do usuário (`signAssetDownload`) | `createSignedUrl(storage_path)` | intocado |
| extração do último quadro | `.full`, explícito no código | matéria-prima, não miniatura |
| grade, faixa, cards, capas, retratos | `.thumb` | miniatura |

A distinção que vale dinheiro está comentada no ponto exato onde alguém poderia trocá-la: *"estes pixels viram o primeiro quadro do próximo clipe, numa geração paga. Miniatura é para olhar; isto é matéria-prima."*

**E a Fase 2 não consertou o canvas, como já se sabia:** ele continua em 15,24 s com as **66 Server Actions em fila**. Miniatura corta bytes; o gargalo de lá é contagem de idas ao servidor. É a Fase 5 — e o fato de a Fase 2 **não** tê-lo melhorado é a confirmação independente do diagnóstico da Fase 0.3.

### 27/08/2026 — Três registros que a Fase 2 promoveu a método

**Exibição e matéria-prima são dois mundos, e não pode haver ponte acidental.** Vira invariante nomeada:

> **O que vai ao provedor lê `storage_path` no servidor. O que vai à tela lê a assinatura de exibição.**

Os dois caminhos nunca se cruzam, e a varredura da Fase 2 é o **retrato de nascimento** dessa regra — a lista de qual caminho lê o quê, feita no dia em que a distinção passou a existir. O risco que ela fecha é o mais caro que este produto tem: uma miniatura de 20 kB entrando como referência de identidade numa geração paga degradaria o rosto que o usuário comprou, **sem erro, sem log e sem tela quebrada**. A regra existe para que ninguém precise reconstruir esse raciocínio no dia em que acrescentar a sexta tela.

**Quando cinco telas precisariam lembrar de um `if`, mova o `if` para a forma do dado.** `thumb` nunca é nulo: sem miniatura, vem o original. O requisito *"miniatura que falha não bloqueia nada"* deixou de depender de disciplina distribuída e virou **propriedade da resposta** — não há como uma tela esquecer de tratar um caso que não existe no tipo. É a mesma família do `mudo ≠ ausente` e do `o dado identifica, nunca o rótulo`: **a forma carrega a regra, o chamador não precisa saber dela.**

**O canvas inalterado é prova, não pendência.** A Fase 2 cortou 97,92% dos bytes e o canvas continuou em 15,24 s. Isso não é uma falha da Fase 2 — é a **confirmação independente** do diagnóstico da Fase 0.3: se o gargalo de lá fosse peso, ele teria caído junto; como é **contagem de idas ao servidor**, não caiu. Duas medições separadas, tomadas por motivos diferentes, concordando sobre a causa. Fica registrado como evidência a favor do diagnóstico, e não como item novo de dívida.

### 27/08/2026 — Fase 3 · a URL estável e o cache imutável: da segunda visita em diante, zero

**O instrumento foi escolhido antes de medir**, e essa é a parte que vale registrar tanto quanto o resultado. A Fase 0 já tinha estabelecido que `transferSize` não serve, então a prova combinada era **a URL idêntica entre visitas e a requisição que não acontece**.

Duas leituras foram **descartadas por não decidirem nada**, e as duas pareciam decidir:

| leitura | por que não serve |
|---|---|
| entrada de Resource Timing | **existe mesmo quando o cache acerta** — "21 requisições" não significa 21 downloads |
| log de rede da extensão | **registra a requisição que o cache serve** — mesma armadilha, roupa diferente |

Quem respondeu foi o **`edge_logs` do Supabase**. A pergunta do mini-ciclo inteiro é *"os bytes saíram do servidor?"*, e a lição de método é essa: **quando a pergunta é sobre o servidor, o instrumento é o servidor.** Três instrumentos do lado do cliente falharam em responder o que um `group by` do lado de lá respondeu em uma linha.

**O resultado:**

| | |
|---|---|
| URLs comparadas entre duas visitas | 24 |
| idênticas caractere a caractere | **24** (na Fase 0: **0**) |
| miniaturas que chegaram ao Supabase, 1ª visita | **21** |
| miniaturas que chegaram ao Supabase, 2ª e 3ª | **0** |

E a galeria pinta completa nas três. **Da segunda visita em diante, navegar até a galeria custa zero byte de egress.** O navegador concorda por outro caminho: `duration: 0 ms` nas 21, contra 170 ms de mediana na primeira — uma busca de rede não leva zero milissegundo.

#### Só o acerto é guardado, nunca a ausência

O cache de URLs guarda apenas assinaturas que deram certo. Uma miniatura que ainda não existe **não vira entrada negativa** — se virasse, um arquivo consertado pelo backfill continuaria "sem miniatura" por dias, e o reparo não repararia nada visível.

E não guardar a ausência **não custa**: o caminho que falta entra na chamada que já vai acontecer de qualquer forma, e enquanto ele falta o `thumb` aponta para o `full`, que está no cache e portanto é estável. A imagem acerta o cache do navegador de qualquer jeito. **Um cache que erra para o lado de perguntar de novo é sempre preferível a um que erra para o lado de lembrar errado.**

O par disso é `forgetSignedUrls` nos pontos que removem do Storage: sem esquecer, um arquivo apagado produziria link por dias e a tela mostraria moldura quebrada em vez de cair no estado vazio — que era o comportamento honesto que a assinatura sem cache dava de graça, ao simplesmente não assinar o que não existe. **Cache que não sabe esquecer troca uma tela honesta por uma quebrada.**

#### Um buraco que só apareceu porque a pergunta foi feita

A URL devolvida **logo após gerar** era a do original — e ela **é exibida**: a coluna de imagens canônicas a desenha assim que chega. Eram ~2,5 MB na **primeira** visualização de cada geração, que é justamente a que sempre acontece. A Fase 2 trocou todos os consumidores de exibição e mesmo assim deixou este passar, porque ele não vem de `signAssetUrls`: vem de dentro do caminho de geração. Fechado aqui.

#### A limitação que fica, medida e dita

Os 57 originais existentes continuam com `max-age=3600`: o header é gravado no upload, e mudá-lo exigiria reenviar 85 MB. **Não vale** — grade, faixa e cards leem miniatura, e o original só é buscado pelo zoom e pelo download, cuja URL já é estável. Arquivo novo já nasce com o ano.

**E a advertência do plano continua de pé:** `localhost` é um processo Node só, sempre quente, então o acerto medido aqui é 100% por construção. **A medição de desenvolvimento mente a favor.** Quem confirma é a produção.

#### A conferência de data: dado contra rótulo, aplicado ao calendário

Esta entrada nasceu datada de **28/08**, e estava errada. A reconstrução da sessão seguinte conferiu o rótulo contra o dado e achou a diferença:

| fonte | diz |
|---|---|
| o rótulo escrito à mão | 28/08/2026 |
| `mtime` dos arquivos de evidência | **27/08, 21:03** |
| `git log` do commit anterior | **27/08, 20:54 −0300** |
| `edge_logs` das três visitas | 23:59 · 00:00 · 00:02 — **em UTC** |

O erro tem uma causa exata, e ela é instrutiva: **o log do Supabase marca em UTC, e a máquina vive em BRT.** As visitas às 23:59 / 00:00 / 00:02 UTC são 20:59 / 21:00 / 21:02 de 27/08 no relógio de quem mediu. A virada de dia foi **do fuso do instrumento, não do calendário** — e o rótulo copiou o instrumento sem converter.

É o mesmo princípio que a Fase 2 registrou como **o dado identifica, nunca o rótulo**, agora aplicado ao calendário: quando o rótulo e o dado discordam, ganha o dado. E há três dados independentes aqui — mtime, git e o fuso do log —, todos concordando entre si e discordando do que estava escrito.

A lição de método é a mesma da Metade 2 desta fase, virada do avesso. Lá, **o instrumento certo foi o servidor** porque a pergunta era sobre o servidor. Aqui, o servidor foi o instrumento **errado** porque a pergunta — *"em que dia isto aconteceu para nós?"* — é sobre o nosso relógio, não sobre o dele. **Instrumento certo para uma pergunta não é instrumento certo para todas**, e um timestamp lido sem o fuso é um número sem unidade.

Corrigido em três lugares — a tabela de status, o cabeçalho da §3.3 e o título desta entrada — mais o arquivo de números da evidência.

#### E dois status para a mesma coisa, no mesmo arquivo

A mesma conferência achou o plano dizendo duas coisas sobre a Fase 5. O título e a tabela de status diziam **✅ aprovada em 27/08/2026**; um resíduo do texto anterior à aprovação ainda dizia *"🟡 aguarda decisão do Jorge: entra neste mini-ciclo, ou vira backlog?"*, e um terceiro trecho falava em *"a detalhar **se** o Jorge aprovar"*.

**Plano com dois status para a mesma coisa é plano mentindo por descuido** — e mente pior que um plano desatualizado, porque quem lê acha que leu a versão certa. Os três resíduos foram removidos na mesma passada.

Fica a regra de manutenção: **aprovar uma fase é editar todo lugar que falava dela no condicional**, não só carimbar o ✅ no topo. O status vive em mais de um lugar do arquivo, e é por isso que ele consegue divergir de si mesmo.

#### A metade do dono, e um alarme falso que ensinou a ler

A prova do caminho de geração é do Jorge por regra — é dinheiro e é geração. Ela chegou, e chegou com **um alarme falso pelo meio**, que vale mais registrado que escondido.

O primeiro olhar acusou "a URL é o original — não fechou". Era **a URL do Lightbox**, e o Lightbox abre o original **por desenho**: o requisito 1 manda o zoom carregar o `.jpg`. O alarme apontava para a tela certa e para o **elemento errado**.

A prova real precisou de três leituras juntas:

| leitura | resultado |
|---|---|
| `src` do `<img>` do card | **`.thumb.webp`** |
| `src` do zoom / Lightbox | **`.jpg`** original |
| `iat` dos dois tokens | **o mesmo — 1787876661** |

A terceira linha é a que fecha, e ela não era óbvia antes de existir. Os dois endereços foram assinados **no mesmo instante, na mesma chamada** — é a forma `{full, thumb}` do `signing.ts` **aparecendo de fora**, e não dois `createSignedUrl` que por acaso deram certo. **Quando o desenho tem uma assinatura observável, procure a assinatura, não só o resultado:** o resultado certo pode vir do caminho errado, o `iat` compartilhado não pode.

E a lição do alarme: **numa tela que serve dois endereços de propósito, "achei o original" não é achado — é metade de uma pergunta.** A pergunta inteira é *qual elemento* o serviu.

#### O ledger contra a memória, e o ledger ganhou duas vezes

Antes de commitar, o dono pediu uma leitura de banco em vez de confiar na lembrança: *"memória não decide, ledger decide."* Decidiu — **contra a memória, nos dois números que ela arriscou**:

| | a memória dizia | o banco diz |
|---|---|---|
| horário | ~20:44 BRT | **21:24:20 BRT** |
| valor cobrado | −15 Sparks | **−75 Sparks** |

E o que o banco diz está **certo**: a geração pediu `image_size = "2K"`, e o catálogo cobra 50 no 1K, **75 no 2K**, 110 no 4K. O preço veio do catálogo, não de quem chamou — invariantes 6 e 11 cumpridas no fato.

O resto fechou sem ressalva: **uma** geração na janela (`succeeded`, `sheet_source = version`), **uma** linha de ledger apontando para ela, `wallets.balance_cents` = `sum(ledger)` = 6.550, **diferença zero**. E os dois carimbos de tempo **idênticos ao microssegundo** (`21:24:20.998878`) — que não é coincidência, é `record_generation` gravando e cobrando na mesma transação, a invariante 5 visível de fora.

**O ponto de método:** nenhum dos dois erros era defeito do produto, e é justamente por isso que a conferência valeu. Um número lembrado errado sobre um sistema correto produz exatamente a mesma sensação de que algo está errado — e teria custado uma investigação inteira se tivesse sido tratado como sintoma. **A memória do dono é uma hipótese, não um dado**, e tratá-la assim protege o dono do próprio palpite.

#### E o Storage confirma o buraco fechado por um terceiro caminho

`storage.objects` da mesma janela, que ninguém tinha pedido e que decide sozinho:

| arquivo | bytes | `cacheControl` |
|---|---|---|
| o original recém-gerado | **2.788.806** | **`max-age=31536000`** |
| a miniatura dele | **15.700** | `max-age=31536000` |

**177,6× menor** — é esse o buraco que a Fase 3 fechou na primeira visualização de cada geração. E o original **nasceu com o ano**, não com a hora: o `IMMUTABLE_CACHE_CONTROL` roda no caminho de geração, e a limitação dos 57 originais antigos vale só para os antigos, como o plano prometeu.

Três instrumentos independentes — o navegador do dono, o ledger e o Storage — concordando sobre a mesma imagem. **É assim que uma etapa fecha.**
