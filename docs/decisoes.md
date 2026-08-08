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
