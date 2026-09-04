/**
 * Every user-facing string lives here. Identifiers stay in English, copy stays
 * in pt-BR — see the code conventions in CLAUDE.md.
 */
/**
 * Um número de Sparks como quem lê escreve: 1.260, e não 1260.
 *
 * Vive aqui e não em `lib/sparks` porque é decisão de **texto**, não de dinheiro
 * — o valor continua sendo inteiro em toda conta. E vive numa função só porque
 * dois portões a centímetros um do outro mostrando "6250" e "6.250" seriam a
 * mesma carteira com duas caras na mesma tela.
 */
function sparks(n: number): string {
  return n.toLocaleString("pt-BR");
}

export const t = {
  app: {
    name: "Creator TKS Labs",
    tagline: "Estúdio de criação com IA",
  },

  auth: {
    signInTitle: "Entrar no estúdio",
    signInSubtitle: "Use seu e-mail e senha para continuar.",
    signUpTitle: "Criar sua conta",
    signUpSubtitle: "Leva menos de um minuto.",
    displayNameLabel: "Como quer ser chamado",
    displayNamePlaceholder: "Seu nome",
    emailLabel: "E-mail",
    emailPlaceholder: "voce@exemplo.com",
    passwordLabel: "Senha",
    passwordPlaceholder: "Mínimo de 8 caracteres",
    signInAction: "Entrar",
    signUpAction: "Criar conta",
    submitting: "Aguarde…",
    toSignUp: "Ainda não tem conta? Criar uma",
    toSignIn: "Já tem conta? Entrar",
    signOut: "Sair",
    checkEmailTitle: "Confirme seu e-mail",
    checkEmailBody:
      "Enviamos um link de confirmação. Abra seu e-mail e clique no link para ativar a conta.",
    errors: {
      invalidEmail: "Digite um e-mail válido.",
      passwordTooShort: "A senha precisa ter pelo menos 8 caracteres.",
      displayNameTooShort: "Digite pelo menos 2 caracteres.",
      invalidCredentials: "E-mail ou senha incorretos.",
      emailNotConfirmed:
        "Sua conta ainda não foi confirmada. Verifique seu e-mail.",
      emailAlreadyRegistered: "Este e-mail já tem conta. Tente entrar.",
      rateLimited: "Muitas tentativas. Espere um instante e tente de novo.",
      confirmationFailed:
        "Não foi possível confirmar o link. Ele pode ter expirado — tente entrar de novo.",
      unexpected: "Algo deu errado. Tente novamente.",
    },
  },

  /**
   * O vestíbulo — a tela que recebe depois do login (Ciclo Dashboard).
   *
   * O vazio e o nome do botão "Novo projeto" **não** moram aqui: são os mesmos
   * de `studio`, porque são a mesma situação e a mesma ação vistas de outra
   * tela. Repetir a frase seria criar duas que vão divergir.
   */
  dashboard: {
    title: "Seus projetos",
    subtitle: "Abra um projeto para trabalhar no canvas, ou comece um novo.",
    openHint: "Abrir no canvas",
    /** A chama do canvas, que agora é o caminho de volta. */
    backHint: "Voltar para os seus projetos",

    nav: {
      label: "Seções do estúdio",
      projects: "Projetos",
      gallery: "Galeria",
      account: "Conta",
    },

    /**
     * A Conta — saldo e extrato, só leitura.
     *
     * Não há recarga nem pagamento aqui, e a ausência é a verdade do produto:
     * não existe billing ainda. Uma tela que mostra o saldo e oferece "comprar
     * mais" sem ter para onde levar o clique é pior do que uma que só informa.
     */
    account: {
      title: "Sua conta",
      subtitle: "Seu saldo e tudo que já foi cobrado.",
      balanceLabel: "Saldo disponível",
      /** O mesmo número em reais, para o Spark não virar moeda de brinquedo. */
      balanceInBRL: "equivalente a",
      statementTitle: "Extrato",
      statementSubtitle: "Mais recente primeiro. O registro é definitivo — nada aqui é editado.",
      colDate: "Data",
      colDescription: "Descrição",
      colAmount: "Valor",
      noDescription: "Sem descrição",
      loadMore: "Carregar mais",
      loading: "Carregando…",
      emptyTitle: "Nenhuma movimentação ainda",
      emptyBody: "Quando você gerar a primeira imagem, a cobrança aparece aqui.",

      /** O que cada tipo de linha é, em português. */
      kinds: {
        deposit: "Crédito",
        debit: "Cobrança",
        refund: "Estorno",
        adjustment: "Ajuste",
      },
    },

    /**
     * A Galeria geral — tudo que o usuário já gerou, de todos os projetos.
     *
     * Diferente de `generation.gallery`, que é a Galeria **do projeto** aberto
     * no canvas. As duas mostram miniaturas e param aí: uma responde "o que este
     * projeto produziu", a outra "o que eu já fiz". O selo de origem só existe
     * nesta, porque só aqui a pergunta faz sentido.
     */
    gallery: {
      title: "Sua galeria",
      subtitle: "Tudo que você já gerou, de todos os projetos.",
      openHint: "Ampliar",
      untitled: "Sem título",
      loadMore: "Carregar mais",
      loading: "Carregando…",
      emptyTitle: "Nada gerado ainda",
      emptyBody:
        "Abra um projeto e gere a primeira imagem: tudo o que sair fica aqui para sempre.",
      countSuffix: "imagens",
      countOne: "imagem",

      /**
       * O selo do canto, nos dois casos que não são um projeto.
       *
       * "folha canônica" é a identidade de uma personagem, gerada no editor dela
       * e sem projeto desde sempre. "projeto excluído" é trabalho de canvas que
       * perdeu a casa — o `ON DELETE SET NULL` deixa a imagem viva e o vínculo
       * nulo, que é exatamente o que a confirmação de exclusão promete.
       */
      origin: {
        canonical: "folha canônica",
        orphan: "projeto excluído",
      },
    },

    /**
     * O cartão de projeto.
     *
     * "Ainda sem imagens" e não "sem imagens": o advérbio é a diferença entre
     * relatar um vazio e prometer que ele passa. Um projeto recém-criado está
     * certo de estar vazio, e a tela não deveria fazer isso parecer defeito.
     */
    card: {
      noCover: "Ainda sem imagens",
      characterOne: "personagem",
      characterMany: "personagens",
      imageOne: "imagem",
      imageMany: "imagens",
      lastActivity: "Última atividade",
      rename: "Renomear projeto",
      renameHint: "Enter salva, Esc cancela",

      /**
       * A exclusão, com as duas metades — o mesmo formato do diálogo da
       * personagem (`characterSheet.archive`), e pelo mesmo motivo: "excluir"
       * faz qualquer pessoa supor que as imagens vão junto, e elas não vão.
       *
       * O que se perde é o fluxo: `workflows` cai por cascata, e com ele os
       * blocos, as ligações e a posição de cada um. Os vínculos com as
       * personagens também caem — o **vínculo**, nunca a personagem.
       *
       * O que fica é o que o banco garante: as gerações passam a ter
       * `project_id` nulo em vez de sumirem (`ON DELETE SET NULL`), o extrato
       * nem é tocado, e as personagens vivem em `entities`, que a exclusão de
       * projeto não alcança.
       */
      remove: {
        action: "Excluir projeto",
        title: "Excluir este projeto?",
        lostTitle: "O que você perde",
        lost: "O fluxo montado no canvas — os blocos, as ligações e onde cada um estava.",
        keptTitle: "O que continua existindo",
        kept: "As imagens já geradas e o extrato de Sparks. As personagens são suas e continuam disponíveis para os outros projetos.",
        irreversible: "Não dá para desfazer pela interface.",
        confirm: "Excluir",
        working: "Excluindo…",
        cancel: "Cancelar",
      },
    },
  },

  studio: {
    newProject: "Novo projeto",
    untitledProject: "Projeto sem título",
    renameProject: "Renomear projeto",
    deleteProject: "Excluir projeto",
    deleteProjectConfirm:
      "Excluir este projeto e todo o fluxo dele? Não dá para desfazer.",
    emptyStateTitle: "Comece pelo arsenal",
    emptyStateBody:
      "Abra a barra lateral e arraste um bloco para o canvas para montar seu fluxo.",
    noProjectsTitle: "Nenhum projeto ainda",
    noProjectsBody: "Crie seu primeiro projeto para abrir o canvas.",
    sidebarTitle: "Arsenal",
    sidebarBlocks: "Blocos",
    /**
     * A seção que vem ANTES de «Blocos», e a ordem é a mensagem: primeiro o
     * fluxo montado, depois as peças soltas. É a frase do esboço do Jorge —
     * *"aqui está o fluxo"* em vez de *"aqui estão as peças"*.
     */
    sidebarFlows: "Fluxos",
    templateStoryboard: {
      /**
       * Não se chama "Máquina de Storyboard": esse nome já é de um item de
       * «Blocos», três centímetros abaixo. Dois itens com o mesmo nome no mesmo
       * trilho seria a terceira vez que a prateleira se contradiz — depois do
       * vídeo em 13/08 e do storyboard em 17/08.
       */
      title: "Fluxo de Storyboard",
      hint: "Roteiro + Máquina, já conectados e enquadrados",
    },
    // O vídeo chegou em 13/08/2026 e esta linha ficou logo abaixo dele dizendo
    // que ele não tinha chegado. Uma prateleira que desmente o que ela mesma
    // oferece ensina a não ler o rodapé.
    //
    // E aconteceu de novo em 17/08/2026, com o Roteiro: a linha continuava
    // prometendo "storyboard" com o bloco de Roteiro desenhado três centímetros
    // acima dela. Duas vezes o mesmo defeito é sinal de que o rodapé precisa
    // encolher para o que ainda não existe **de verdade** — e hoje isso é a voz.
    sidebarComingSoon: "A voz chega numa fase futura.",
    status: {
      idle: "Pronto",
      generating: "Gerando",
      generated: "Gerado",
      error: "Erro",
    },
    save: {
      saved: "Salvo",
      saving: "Salvando…",
      unsaved: "Alterações não salvas",
      /**
       * Names what actually failed, and says what did not. A generated image is
       * in Storage and its debit is in the ledger long before the canvas is
       * saved, so whoever reads this needs both facts in the same sentence.
       */
      failed: "Falha ao salvar o projeto — suas imagens e créditos estão seguros",
      conflict:
        "Este projeto foi alterado em outra aba. Recarregue a página para continuar — suas imagens e créditos estão seguros",
      retry: "Tentar de novo",
    },
    sparksLabel: "Sparks",
    sparksTooltip: "Seus créditos para gerar",
  },

  /** The header every block on the canvas wears — the same two actions, everywhere. */
  canvasNode: {
    duplicate: "Duplicar",
    removeConfirm: "Remover?",
    yes: "Sim",
    no: "Não",
  },

  characterSheet: {
    /** The compact card on the canvas (U1). */
    card: {
      edit: "Editar",
      editHint: "Clique duas vezes para editar",
      /** Says where it goes, not that it is destroyed — because it is not. */
      collapse: "Recolher para o Arsenal (a personagem continua lá)",
      draftBadge: "rascunho",
      versionPrefix: "v",
      dirtyTooltip: "alterações não salvas em versão",
      outputHandle: "Conectar esta personagem a um bloco de geração",
      missing: "Personagem não encontrada",
      missingHint: "Ela pode ter sido removida. Tire este cartão do canvas.",
      // Estado diferente do de cima, e a diferença é o conserto: "não
      // encontrada" não tem volta pela tela; "não vinculada" tem, e é um botão.
      unlinked: "Não vinculada a este projeto",
      unlinkedHint:
        "Ela continua no seu arsenal e nos outros projetos. Traga-a de volta para usá-la aqui.",
      relink: "Vincular a este projeto",
      relinking: "Vinculando…",
      relinkFailed: "Não deu para vincular. Tente de novo.",
    },

    /** A foto de perfil da personagem — sobreposição opcional ao retrato padrão. */
    avatar: {
      choose: "Escolher foto de perfil",
      change: "Trocar foto de perfil",
      remove: "Remover foto de perfil",
      /** Diz para onde o retrato volta, em vez de só dizer que sai. */
      removeHint: "Volta para a folha da versão ativa.",
      saving: "Salvando…",
      failed: "Não deu para salvar a foto de perfil.",
    },

    sidebar: {
      title: "Personagens",
      newCharacter: "Nova personagem",
      creating: "Criando…",
      addToCanvas: "Adicionar ao canvas",
      onCanvas: "No canvas",
      empty: "Nenhuma personagem ainda. Crie a primeira.",
      // Dois vazios diferentes, porque são dois problemas diferentes. Quem não
      // tem personagem nenhuma precisa criar; quem tem seis e abriu um projeto
      // novo precisa **trazer** — e dizer "crie a primeira" para essa pessoa é
      // a tela contradizendo o que ela sabe que tem.
      emptyInProject: "Nenhuma personagem neste projeto.",
      emptyInProjectHint: "Crie uma, ou traga uma que você já tem.",
      openProjectFirst: "Abra um projeto para criar uma personagem.",
      addExisting: "Adicionar existente",
      addExistingHint: "Trazer uma personagem sua para este projeto",
      unlink: "Tirar deste projeto",
    },

    /**
     * O diálogo de desvincular. Testa entendimento, não coragem — como o de
     * arquivar —, mas num tom mais leve, porque a ação é mais leve: aqui o
     * texto conta o que muda e diz, em voz alta, que se desfaz com um clique.
     */
    unlink: {
      title: "Tirar do projeto?",
      changesTitle: "O QUE MUDA AQUI",
      changes: "@{handle} sai desta lista, e a menção @{handle} para de funcionar neste projeto.",
      keptTitle: "O QUE NÃO MUDA",
      kept: "Ela continua no seu arsenal, nos outros projetos, e tudo que já foi gerado com ela segue igual.",
      /** Só aparece quando há o que contar — um número inventado ensina errado. */
      inUsePrefix: "Neste canvas:",
      inUseCards: "cartão(ões) dela",
      inUseMentions: "bloco(s) com @{handle} no prompt",
      inUseSuffix: "Os cartões ficam, com estado claro e um botão para trazê-la de volta.",
      reversible: "Dá para desfazer com um clique, por “Adicionar existente”.",
      cancel: "Cancelar",
      confirm: "Tirar do projeto",
      working: "Tirando…",
      failed: "Não deu para tirar. Tente de novo.",
    },

    /** A galeria de personagens do usuário — de onde se traz uma para o projeto. */
    picker: {
      title: "Suas personagens",
      subtitle: "Escolha quem trabalha neste projeto. Um clique vincula.",
      loading: "Carregando…",
      empty: "Você ainda não tem personagens.",
      emptyHint: "Crie a primeira pelo item acima, no menu lateral.",
      allLinked: "Todas as suas personagens já estão neste projeto.",
      allLinkedHint: "Nada a trazer — o que existe já está aqui.",
      linked: "Neste projeto",
      add: "Adicionar",
      adding: "Adicionando…",
      failed: "Não deu para vincular. Tente de novo.",
      close: "Fechar",
    },

    newCharacter: {
      title: "Nova personagem",
      subtitle: "Só o essencial agora — o resto você preenche no editor.",
      nameLabel: "Nome",
      namePlaceholder: "Julia",
      handleLabel: "Como chamá-la no prompt",
      handleHint: "É isto que você digita depois do @.",
      generoLabel: "Gênero de apresentação",
      create: "Criar personagem",
      creating: "Criando…",
      cancel: "Cancelar",
      handleChecking: "verificando…",
      handleAvailable: "livre",
      handleTaken: "já está em uso",
      handleInvalid: "só minúsculas, números, hífen e sublinhado",
    },

    /** U2 — the first time is a guided flow; after that, the free editor. */
    wizard: {
      stepLabel: "Passo",
      of: "de",
      back: "Voltar",
      next: "Continuar",
      skip: "Pular",
      close: "Fechar",
      steps: {
        identidade: "Identidade",
        foto: "Foto de referência",
        dna: "DNA visual",
        padroes: "Padrões",
        narrativa: "Narrativa",
        resumo: "Resumo",
      },
      foto: {
        body:
          "Envie uma foto ou cole a descrição de outra plataforma, e o DNA se preenche: verde no que foi visto com clareza, amarelo no que foi só deduzido, para você confirmar. Ou pule e preencha à mão.",
        manual: "Preencher manualmente",
      },
      dnaHint:
        "Preencha o que já souber. O que ficar em branco simplesmente não entra nas gerações — nada de chute.",
      padroesHint: "Já vêm marcados com escolhas sensatas. Confira e siga.",
      narrativaHint:
        "Opcional, e pode pular. Alimenta roteiro e voz; nunca entra em prompt de imagem.",
      resumo: {
        title: "Tudo pronto",
        dnaFilledSuffix: " campos do DNA preenchidos",
        dnaEmpty: "Nenhum campo do DNA preenchido ainda",
        narrativeFilled: "Narrativa começada",
        narrativeEmpty: "Narrativa em branco",
        imagesEmpty: "Nenhuma imagem canônica ainda",
        saveV1: "Salvar como v1",
        saving: "Salvando…",
        keepDraft: "Deixar como rascunho",
        keepDraftHint:
          "Sem nenhuma versão salva, a personagem ainda não pode ser mencionada por @.",
        saveFailed: "Não foi possível salvar a v1.",
      },
    },

    editor: {
      title: "Personagem",
      close: "Fechar",
      nameLabel: "Nome da personagem",
      namePlaceholder: "Nome",
      tabs: {
        dna: "DNA visual",
        padroes: "Padrões",
        narrativa: "Narrativa",
      },
      tabHints: {
        dna: "O que nunca muda entre as gerações desta personagem.",
        padroes: "Os padrões que valem quando o bloco de geração não disser outra coisa.",
        narrativa: "Alimenta roteiro e voz. Nunca entra em prompt de imagem.",
      },
      extract: {
        open: "Preencher a partir de foto ou texto",
        close: "Fechar a análise",
      },
      autosave: {
        savedAt: "rascunho salvo às",
        saving: "salvando rascunho…",
        failed: "não foi possível salvar — tentando de novo",
        pending: "alterações por salvar",
      },
      details: {
        show: "+ detalhes",
        hide: "− detalhes",
        label: "Detalhes",
        placeholder: "algo que a lista não cobre",
      },
      emptyOption: "Não definido",
      images: {
        title: "Imagens canônicas",
        subtitle: "A âncora real da identidade.",
        emptySlot: "vazio",
        upload: "Enviar",
        replace: "Trocar",
        remove: "Remover",
        uploading: "Enviando…",
        removing: "Removendo…",
        readOnly: "Versão congelada — as imagens dela não mudam.",
        keptByVersion:
          "Esta imagem faz parte de uma versão salva e continua guardada. O slot ficou vazio.",
        tooLarge: "Imagem muito grande. O limite é 10 MB.",
        notAnImage: "Envie um arquivo de imagem.",
        uploadFailed: "Não foi possível enviar a imagem.",
        removeFailed: "Não foi possível remover a imagem.",

        /** Canonical generation, docs/geracao-canonica.md §4.4. */
        anchorTitle: "A âncora",
        viewsTitle: "Vistas",
        anchorHint:
          "A folha completa é a referência de todas as outras imagens. Gere ela primeiro.",
        flow:
          "Fluxo recomendado: gerar a folha → conferir → salvar como v1. A folha congela junto com a versão.",
        generate: "Gerar",
        regenerate: "Gerar de novo",
        generating: "Gerando…",
        generatingHint: "Leva de 20 a 40 segundos. Não feche esta janela.",
        modelLabel: "Modelo",
        costPrefix: "Cada imagem custa",
        balancePrefix: "saldo:",
        needsSheet: "Gere a folha primeiro — ela é a âncora.",
        /** Compilation rule 10: a fallback is never a silent surprise. */
        fallbackUsed:
          "O modelo recusou o traje canônico. Refeito uma vez com compressão esportiva opaca — registrado no histórico.",
        generateErrors: {
          noModel: "Nenhum modelo de imagem disponível. Configure a chave do fornecedor.",
          notConfigured: "Este fornecedor está sem chave de API no servidor.",
          insufficientPrefix: "Você precisa de",
          insufficientMiddle: "para esta imagem e tem",
          needsSheet: "Gere a folha completa antes das vistas — elas usam a folha como referência.",
          translating:
            "Os campos livres ainda estão sendo traduzidos. Aguarde um instante e tente de novo.",
          emptySheet:
            "O DNA está vazio. Preencha ao menos alguns campos antes de gerar — senão não há personagem para desenhar.",
          refused:
            "O provedor recusou esta geração por política de conteúdo, inclusive com o traje alternativo. Nada foi cobrado.",
          failed: "A geração não deu certo, e nada foi cobrado. Tente de novo.",
          invalid: "Não foi possível iniciar a geração. Recarregue a página e tente de novo.",
        },
      },
    },

    /**
     * The compiled-prompt preview, docs/geracao-canonica.md §3.4. Visible always,
     * editable never: changing the prompt here means changing the fields.
     */
    compiled: {
      title: "Prompt compilado",
      subtitle:
        "É isto que vai para o modelo de imagem. Para mudar o prompt, mude os campos — aqui nada se edita.",
      show: "Mostrar",
      hide: "Ocultar",
      viewText: "Texto",
      viewStructure: "Estrutura",
      copy: "Copiar",
      copied: "Copiado",
      empty: "Nada a compilar ainda. Preencha o DNA e o prompt aparece aqui.",
      translating: "traduzindo…",
      translatingTooltip:
        "Os campos que você escreveu à mão estão sendo traduzidos para o inglês. Leva um instante e não custa Sparks.",
      versionNotice: "Compilado a partir da versão congelada que você está vendo.",
      excluded: {
        prefix: "Não entram:",
        inferidosOne: "1 inferido aguardando confirmação",
        inferidosSuffix: " inferidos aguardando confirmação",
        vaziosOne: "1 em branco",
        vaziosSuffix: " em branco",
        traducaoOne: "1 campo livre aguardando tradução",
        traducaoSuffix: " campos livres aguardando tradução",
        /** Decision D6 — said out loud so the omission is never a surprise. */
        notas: "notas gerais (anotações internas, nunca entram no prompt)",
        none: "Tudo o que está preenchido entrou no prompt.",
      },
      blocks: {
        identidade: "Identidade",
        traje: "Traje canônico",
        cena: "Cena padrão",
        restricoes: "Restrições",
      },
    },

    /**
     * The extraction engine, docs/motor-extracao.md §4.5. The same panel serves
     * step 2 of the wizard and the button on the editor's DNA tab, so its words
     * live in one place.
     */
    extraction: {
      title: "Preencher a partir de uma referência",
      subtitle:
        "A análise lê apenas atributos físicos e nunca tenta identificar ninguém. Ela preenche só os campos em branco — nada que você já definiu é alterado.",
      sourcePhoto: "Enviar foto",
      sourceText: "Colar de outra plataforma",
      photoHint: "JPG, PNG ou WebP, até 5 MB. Uma foto de frente e com boa luz rende mais.",
      photoChoose: "Escolher foto",
      photoChange: "Trocar foto",
      textHint:
        "Cole o JSON ou a descrição da personagem vinda de outra ferramenta ou de outra IA. O idioma não importa.",
      textPlaceholder: '{"hair": "long wavy blonde", "eyes": "green"} — ou texto corrido',
      modelLabel: "Modelo",
      modelPlaceholder: "Escolha um modelo",
      missingKeySuffix: "(sem chave)",
      missingKeyTooltip: "Configure a chave de API para habilitar",
      /**
       * Distinct from the one above on purpose: this provider has a key and
       * still cannot run, because the adapter does not exist yet. Telling the
       * user to configure a key they already configured would be a lie.
       */
      noAdapterSuffix: "(em breve)",
      noAdapterTooltip: "Integração com este fornecedor ainda não está pronta",
      costPrefix: "Esta análise custa",
      balancePrefix: "seu saldo:",
      run: "Analisar",
      uploading: "Enviando a foto…",
      analyzing: "Analisando…",
      analyzingHint: "Leva alguns segundos. Não feche esta janela.",
      again: "Analisar outra referência",
      chargedPrefix: "Cobrado:",
      summary: {
        observados: "observados",
        inferidos: "inferidos",
        review: "revise os amarelos",
        vazios: "em branco",
        preservados: "preservados",
        marcas: "marcas encontradas",
      },
      errors: {
        noModel: "Escolha um modelo para analisar.",
        noPhoto: "Escolha uma foto primeiro.",
        noText: "Cole o texto da personagem primeiro — pelo menos algumas palavras.",
        notAnImage: "Formato não aceito. Use JPG, PNG ou WebP.",
        tooLarge: "Esta foto passa de 5 MB. Use uma menor.",
        uploadFailed: "Não foi possível enviar a foto. Tente de novo.",
        insufficientPrefix: "Você precisa de",
        insufficientMiddle: "para esta análise e tem",
        notConfigured: "Este fornecedor está sem chave de API no servidor.",
        refused:
          "O modelo recusou analisar esta referência. Isso acontece; tente outra foto ou outro modelo — nada foi cobrado.",
        unreadable: "Não foi possível ler a foto enviada.",
        failed: "A análise não deu certo, e nada foi cobrado. Tente de novo.",
        invalid: "Não foi possível iniciar a análise. Recarregue a página e tente de novo.",
        draftFailed: "Não foi possível salvar o rascunho antes de analisar. Tente de novo.",
      },
    },

    /** Spec §4.1 — the badges are the heart of the system's honesty. */
    estados: {
      observado: {
        label: "Observado",
        tooltip: "A extração viu isto com clareza na foto. Entra nas gerações.",
      },
      inferido: {
        label: "Inferido",
        tooltip:
          "A extração deduziu sem certeza. Não entra nas gerações até você confirmar.",
        /** Prefix for the reason the engine recorded — decision E3. */
        motivoPrefix: "Motivo:",
      },
      confirmado: {
        label: "Confirmado",
        tooltip: "Validado por você. Entra nas gerações.",
      },
      vazio: {
        label: "Em branco",
        tooltip: "Em branco. Simplesmente não entra nas gerações.",
      },
      confirm: "Confirmar",
      edit: "Editar",
    },

    pending: {
      one: "1 campo aguardando confirmação",
      manyPrefix: "",
      manySuffix: " campos aguardando confirmação",
      jump: "Ir para o próximo",
    },

    versions: {
      selectorLabel: "Versão",
      draft: "Rascunho",
      activeMark: "●",
      readOnlyBannerPrefix: "Você está vendo a ",
      readOnlyBannerSuffix: " (congelada). Para evoluir a partir dela, carregue-a no rascunho.",
      activate: "Ativar esta versão",
      loadIntoDraft: "Carregar no rascunho",
      loadConfirm:
        "Isto substitui o rascunho atual, que tem alterações não salvas em versão. Continuar?",
      activating: "Ativando…",
      loading: "Carregando…",

      /**
       * O item 1d: o editor abre na versão ativa, em leitura.
       *
       * "Editar" e "Abrir rascunho" são a mesma ação — o que muda é o que
       * precisa ser dito antes dela. Sem rascunho pendente, editar é só
       * continuar; com rascunho pendente, a pessoa precisa saber que vai
       * encontrar alterações que ela mesma deixou lá e esqueceu.
       */
      edit: "Editar",
      editHint: "Editar abre o rascunho — esta versão continua congelada.",
      draftPendingBadge: "Há um rascunho com alterações não salvas",
      openDraft: "Abrir rascunho",
      nowEditingDraftPrefix: "Agora você está editando o rascunho — a ",
      nowEditingDraftSuffix: " continua congelada até você salvar uma nova versão.",
      nowEditingDraftNoVersion:
        "Agora você está editando o rascunho. Salve uma versão para poder chamá-la por @.",
      dismissNotice: "Fechar aviso",
      save: "Salvar como nova versão",
      saveDisabledPrefix: "Nada mudou desde a ",
      saveDisabledNoChange: "Nada mudou desde a versão ativa",
      saveModal: {
        title: "Salvar como nova versão",
        numberPrefix: "Esta será a ",
        numberSuffix: " — quem numera é o banco.",
        labelField: "Etiqueta (opcional)",
        labelPlaceholder: "cabelo mais curto",
        permanent: "Uma versão salva é permanente: não pode ser editada nem apagada.",
        pendingWarningPrefix: "",
        pendingWarningSuffix:
          " inferidos não entram nas gerações enquanto não forem confirmados. Salvar mesmo assim?",
        confirm: "Salvar versão",
        saving: "Salvando…",
        cancel: "Cancelar",
      },
      errors: {
        unchanged: "Nada mudou desde a versão ativa.",
        archived: "Esta personagem está arquivada.",
        notFound: "Personagem não encontrada.",
        failed: "Não foi possível salvar a versão.",
        activateFailed: "Não foi possível ativar esta versão.",
        loadFailed: "Não foi possível carregar esta versão.",
      },
    },

    groups: {
      identidadeVisual: "Identidade visual",
      rosto: "Rosto",
      pele: "Pele",
      cabelo: "Cabelo",
      corpo: "Corpo",
      proporcoes: "Proporções (opcional)",
      marcas: "Marcas",
      notas: "Notas gerais",
      padroes: "Padrões da personagem",
      restricoes: "Restrições",
      narrativaIdentidade: "Identidade",
      narrativaPersonalidade: "Personalidade",
      narrativaVoz: "Voz e fala",
    },

    fields: {
      generoApresentacao: "Gênero de apresentação",
      idadeAparente: "Idade aparente",
      formatoRosto: "Formato do rosto",
      olhosCor: "Cor dos olhos",
      olhosFormato: "Formato dos olhos",
      olhosEspacamento: "Espaçamento dos olhos",
      sobrancelhasFormato: "Formato das sobrancelhas",
      sobrancelhasEspessura: "Espessura das sobrancelhas",
      nariz: "Nariz",
      labios: "Lábios",
      peleTom: "Tom de pele",
      peleSubtom: "Subtom",
      peleSardas: "Sardas",
      cabeloCor: "Cor do cabelo",
      cabeloTextura: "Textura",
      cabeloComprimento: "Comprimento",
      cabeloReparticao: "Repartição",
      cabeloFranja: "Franja",
      cabeloAcabamento: "Acabamento",
      corpoAltura: "Altura",
      corpoSilhueta: "Silhueta",
      proporcoesBusto: "Busto",
      proporcoesCintura: "Cintura",
      proporcoesQuadril: "Quadril",
      notasGerais: "O que não coube em nenhum campo",
      estiloRenderizacao: "Estilo de renderização",
      expressao: "Expressão",
      pose: "Pose",
      trajeCanonico: "Traje canônico",
      fundoCanonico: "Fundo",
      iluminacao: "Iluminação",
      enquadramento: "Enquadramento",
      alturaSuffix: "cm",
      alturaPlaceholder: "168",
      notasPlaceholder: "Observações livres sobre a aparência.",
      /** Decision D6: general notes are a notebook, not a prompt. Say it plainly. */
      notasHint:
        "Anotações suas, para consulta. Não entram em nenhuma geração — quem vai para o prompt são os campos acima.",
    },

    marcas: {
      tatuagensTitle: "Tatuagens",
      tatuagemAdd: "Adicionar tatuagem",
      tatuagemPosicao: "Posição",
      tatuagemTamanho: "Tamanho",
      tatuagemEstilo: "Estilo",
      tatuagemDescricao: "O desenho",
      tatuagemDescricaoPlaceholder: "ramo de flores minimalista",
      piercingsTitle: "Piercings",
      piercingAdd: "Adicionar piercing",
      piercingLocal: "Local",
      piercingJoia: "Joia",
      piercingDetalhes: "Detalhes",
      piercingDetalhesPlaceholder: "um em cada orelha",
      outrasTitle: "Pintas, cicatrizes e manchas",
      outraAdd: "Adicionar marca",
      outraTipo: "Tipo",
      outraPosicao: "Onde",
      outraPosicaoPlaceholder: "acima do lábio, lado esquerdo",
      outraDescricao: "Como é",
      outraDescricaoPlaceholder: "pequena e discreta",
      remove: "Remover",
      empty: "Nenhuma registrada.",
    },

    restricoes: {
      hint: "Valem sempre, em toda geração desta personagem.",
      add: "Adicionar restrição",
      tipo: "Tipo",
      regra: "Regra",
      regraPlaceholder: "usar óculos",
      remove: "Remover",
      empty: "Nenhuma restrição.",
    },

    narrativa: {
      nomeCompleto: "Nome completo",
      nomeCompletoPlaceholder: "Julia Andrade",
      apelidos: "Apelidos",
      apelidosPlaceholder: "Ju, Juju",
      idade: "Idade",
      dataNascimento: "Data de nascimento",
      ocupacao: "Ocupação",
      ocupacaoPlaceholder: "criadora de conteúdo de moda e lifestyle",
      qualidades: "Qualidades",
      qualidadesPlaceholder: "espontânea, carismática",
      defeitos: "Defeitos",
      defeitosPlaceholder: "ansiosa, impaciente",
      tracosMarcantes: "Traços marcantes",
      tracosMarcantesPlaceholder: "fala com as mãos, ri alto",
      objetivos: "Objetivos",
      objetivosPlaceholder: "viver de conteúdo",
      medos: "Medos",
      medosPlaceholder: "irrelevância",
      relacoes: "Relações",
      relacoesPlaceholder: "irmã mais velha, melhor amiga",
      estiloDeFala: "Estilo de fala",
      estiloDeFalaPlaceholder: "informal, jovem, com gírias leves de internet",
      vozIdioma: "Idioma",
      vozDescricao: "Como é a voz",
      vozDescricaoPlaceholder: "voz jovem, tom leve e animado",
      listHint: "Separe por vírgula.",
    },

    errors: {
      createFailed: "Não foi possível criar a personagem.",
      saveFailed: "Não foi possível salvar o rascunho.",
      handleTaken: "Já existe uma personagem com esse @.",
      handleInvalid: "Use só letras minúsculas, números, hífen e sublinhado.",
      nameRequired: "Dê um nome à personagem.",
      notFound: "Personagem não encontrada.",
    },

    /**
     * A exclusão, que é arquivamento — e a tela diz as duas metades.
     *
     * O que se perde é real e precisa estar escrito antes do clique: ela sai do
     * Arsenal e o `@` para de resolver. O que fica também precisa, porque a
     * palavra "excluir" faz qualquer pessoa supor que as imagens vão junto — e
     * elas não vão.
     */
    archive: {
      action: "Excluir personagem",
      title: "Excluir esta personagem?",
      lostTitle: "O que você perde",
      lost: "Ela sai do Arsenal, e @{handle} para de funcionar em gerações novas.",
      keptTitle: "O que continua existindo",
      kept: "As imagens na galeria, as gerações já feitas, o extrato e as versões salvas.",
      irreversible: "Não dá para desfazer pela interface.",
      confirm: "Excluir",
      working: "Excluindo…",
      cancel: "Cancelar",
      failed: "Não foi possível excluir a personagem.",
    },
  },

  /** The Inputs shelf and its nodes — §7 do briefing do Canvas 4. */
  inputs: {
    /** O título da seção no menu lateral. */
    sidebarTitle: "Inputs",
    sidebarHint: "Arraste para o canvas e conecte no bloco de geração",
    image: {
      title: "Input de Imagem",
      choose: "Escolher imagem",
      replace: "Trocar a imagem",
      loading: "Carregando…",
      instructionPlaceholder: "o que fazer com esta imagem (opcional)",
      hint: "Conecte na borda esquerda do bloco de geração.",
      emptyHint: "Escolha uma imagem para poder conectar este input.",
      outputHandle: "Liga a um bloco de geração",
      remove: "Tirar este input do canvas (a imagem fica na galeria)",
    },
    product: {
      title: "Input de Produto",
      nameLabel: "Nome",
      namePlaceholder: "Biquíni cortininha verde",
      photosLabel: "Fotos",
      photosOf: "de",
      photosHint: "Frente, verso, detalhe, etiqueta — cada foto entra na geração.",
      addPhoto: "Adicionar foto",
      removePhoto: "Remover foto",
      removePhotoHint: "A foto sai do produto e continua na galeria.",
      full: "Um produto guarda até 5 fotos.",
      /** A guarda na origem: o bloco conectado é quem não tem mais vaga. */
      blockFull: "O bloco conectado não tem vaga para mais uma foto.",
      instructionLabel: "Instrução",
      instructionPlaceholder: "a modelo veste esta peça exatamente como mostrada",
      /** "ocupa 3 referências" — o custo do fio, dito antes de ele existir. */
      occupies: "Ocupa",
      referenceSingular: "referência no bloco",
      referencePlural: "referências no bloco",
      emptyHint: "Adicione as fotos para poder conectar este produto.",
      outputHandle: "Liga a um bloco de geração",
      remove: "Tirar este produto do canvas (as fotos ficam na galeria)",
    },
    pose: {
      title: "Input de Pose/Ângulo",
      choose: "Escolher imagem de pose",
      replace: "Trocar a imagem",
      loading: "Carregando…",
      instructionPlaceholder: "o que aproveitar desta pose (opcional)",
      hint: "Enquanto conectado, o seletor de Ângulo do bloco fica em pausa.",
      emptyHint: "Escolha uma imagem para poder conectar este input.",
      outputHandle: "Liga a um bloco de geração",
      remove: "Tirar este input do canvas (a imagem fica na galeria)",
    },
    sheet: {
      title: "Input de Character Sheet",
      choose: "Escolher folha",
      replace: "Trocar a folha",
      loading: "Carregando…",
      instructionPlaceholder: "o que reforçar desta folha (opcional)",
      hint: "Soma com a personagem mencionada por @, não substitui.",
      emptyHint: "Escolha uma folha para poder conectar este input.",
      outputHandle: "Liga a um bloco de geração",
      remove: "Tirar este input do canvas (a folha fica na galeria)",
    },
    /** A lápide do card antigo de Produto, que saiu do Arsenal em 10/08/2026. */
    legacyProduct: {
      title: "Produto (card antigo)",
      body:
        "Este tipo de card saiu. Use Input de Produto na seção Inputs — as fotos " +
        "continuam na galeria. Pode remover este card.",
      remove: "Remover este card antigo",
    },
  },

  /** The generation blocks on the canvas — docs/nodes-geracao.md. */
  /**
   * O bloco Gerar Vídeo — a frente de vídeo, ciclo 1.
   *
   * Separado de `generation` de propósito: as duas telas se parecem e **não são
   * a mesma**. Vídeo não tem quantidade, não tem formato, não tem qualidade, não
   * tem ajustes de cena e não aceita `@` — e uma seção compartilhada com cinco
   * campos ignorados de um lado é como as duas começam a divergir por dentro
   * enquanto parecem iguais por fora.
   */
  videoNode: {
    title: "Gerar Vídeo",
    configTitle: "Configuração",
    modelLabel: "Modelo",
    durationLabel: "Duração",
    /** Uma opção só, e ela vem do catálogo — ver a migration da Fase 1. */
    durationFixedHint:
      "Nesta versão o clipe é de 5 segundos. Outras durações chegam pelo catálogo, sem atualização da tela.",
    stillTitle: "Imagem de partida",
    stillEmpty: "Conecte uma imagem",
    stillEmptyHint:
      "Arraste um fio de um Input de Imagem ou de um Resultado até a borda esquerda deste bloco. O vídeo começa nessa imagem.",
    stillFromPrefix: "de",
    stillAlt: "Imagem que será animada",
    /** O Kling recebe uma imagem; um card com várias entrega a primeira. */
    stillFirstOfMany: "Este card tem mais de uma foto — a primeira é a que será animada.",
    promptLabel: "Movimento · opcional",
    promptPlaceholder: "O que acontece no clipe? Deixe vazio para um movimento sutil.",
    /**
     * A recusa da menção, dita **antes** do clique. O Kling recebe uma imagem, e
     * ela já é a personagem — uma menção anexaria uma segunda folha que não tem
     * para onde ir. Aceitar e ignorar em silêncio seria cobrar por uma geração
     * que não fez o que a frase pedia.
     */
    mentionRefused:
      "Neste bloco a personagem entra pela imagem, não pelo @. Tire a menção do texto — o vídeo já começa no rosto que você conectou.",
    generate: "Gerar Vídeo",
    generatingHint: "Um clipe de 5 segundos leva de 1 a 3 minutos. Pode fechar a aba: o resultado fica salvo.",
    costWillPrefix: "Custará",
    balanceLabel: "Saldo",
    resultTitle: "Resultado",
    emptyResult: "O vídeo aparecerá aqui",
    /**
     * O ELO — Frente Storyboard, Ciclo 1.
     *
     * Nome de **intenção**, nunca de implementação: "Extrair último frame"
     * descreve a máquina para quem só tem uma vontade, que é continuar a
     * história. E o rótulo diz que é **grátis** porque este botão fica a três
     * centímetros de um que anuncia "Custará 210 ⚡" — uma ação sem custo ao
     * lado de uma paga, sem dizer qual é qual, é a tela ensinando a hesitar.
     */
    continueTitle: "Continuar deste vídeo",
    continueSubtitle: "o último quadro vira a partida do próximo · sem custo",
    continueHint:
      "Lê o último quadro deste vídeo e o põe no canvas como imagem de partida do próximo bloco. Não chama nenhum modelo e não gasta Sparks.",
    continueWorking: "Lendo o último quadro…",
    /**
     * Nada é criado quando o par já está de pé — então a frase é a única coisa
     * que muda, e ela precisa dizer o que foi destacado e por quê.
     */
    continueExisting:
      "Este capítulo já está no fluxo — o card do quadro e o bloco dele foram destacados.",
    /**
     * As recusas da leitura, cada uma com o conserto na própria frase.
     *
     * `hidden_tab` é a que mais importa, e ela é medida: numa aba que não está
     * visível o navegador simplesmente não decodifica vídeo. Sem esta frase, o
     * sintoma seria uma espera de quinze segundos terminando em "não deu".
     */
    continueErrors: {
      /** A cláusula da 0.3 — o navegador só decodifica vídeo com a aba à frente. */
      aba_escondida:
        "Volte para esta aba para ler o último quadro: o navegador só decodifica vídeo com a " +
        "aba à frente. Nada foi perdido.",
      hidden_tab:
        "O navegador não lê vídeo com a aba escondida. Deixe esta janela na frente e clique de novo.",
      expired_link:
        "O link deste vídeo expirou — eles valem uma hora. Recarregue a página e tente de novo.",
      undecodable: "Não consegui ler este vídeo no navegador. Tente de novo em instantes.",
      tainted:
        "O navegador bloqueou a leitura deste quadro. Recarregue a página e tente de novo.",
      upload: "O quadro foi lido, mas não consegui guardá-lo. Tente de novo.",
      not_a_video: "Este resultado não é um vídeo.",
      error: "Não foi possível pegar o último quadro. Tente de novo.",
    },
    /** Diz o que sai e o que fica — os vídeos já gerados continuam na galeria. */
    remove: "Tirar este bloco do canvas (os vídeos já gerados ficam)",
    /** Os três estados de um trabalho, na caixinha e na moldura. */
    statusQueued: "Na fila",
    statusRunning: "Gerando",
    statusFailed: "Não deu",
    /** O botão que impede um node de ficar Gerando para sempre. */
    checkNow: "Verificar agora",
    checkNowHint:
      "Pergunta ao provedor o que houve com este trabalho. Útil quando o retorno demora mais do que o normal.",
    checking: "Verificando…",
    stillPending: "Ainda gerando do lado do provedor.",
    /** As recusas, cada uma com o conserto na própria frase. */
    errors: {
      invalid: "Não foi possível enviar este pedido. Recarregue a página e tente de novo.",
      unauthenticated: "Sua sessão expirou. Recarregue a página para continuar.",
      not_configured:
        "O fornecedor de vídeo não está configurado neste ambiente. Avise o administrador.",
      webhook_not_configured:
        "O endereço de retorno do provedor não está configurado, então o vídeo sairia sem ter como voltar. Nada foi enviado e nada foi cobrado.",
      insufficient_balance: "Sparks insuficientes para este vídeo.",
      no_source_image: "Conecte uma imagem de partida antes de gerar.",
      missing_reference: "A imagem conectada não foi encontrada. Reconecte o card.",
      mention_not_supported:
        "Neste bloco a personagem entra pela imagem, não pelo @. Tire a menção do texto.",
      unsupported_duration: "Este modelo não vende esta duração.",
      /** A ficha apontada sumiu do roteiro entre o clique e o pedido. */
      unknown_scene: "Essa cena não está mais no roteiro. Recarregue a página.",
      /**
       * Presente e errada custa o mesmo que ausente — com a diferença de que
       * não avisa. Medido em 28/08/2026: quatro clipes pagos, zero entregas.
       */
      webhook_url_invalid:
        "O endereço de retorno configurado não aponta para /api/webhooks/fal. " +
        "Sem ele o vídeo seria gerado, cobrado e nunca voltaria.",
      translation_failed:
        "Não foi possível traduzir a descrição do movimento. Tente de novo em instantes.",
      refused:
        "O provedor recusou animar esta imagem. Ajuste a descrição do movimento e tente de novo.",
      provider_account:
        "A conta do fornecedor de vídeo está sem saldo e recusou o pedido. Avise o administrador — nada foi cobrado de você.",
      error: "Não foi possível gerar o vídeo. Tente de novo.",
      /** O que a linha guarda quando o trabalho morre depois de enviado. */
      lost: "Perdemos o retorno deste trabalho.",
    },
  },
  /**
   * O bloco de Roteiro — FRENTE STORYBOARD · CICLO 2.
   *
   * Separado de `generation` e de `videoNode` pela mesma razão que aqueles dois
   * são separados entre si: as telas se parecem e não são a mesma coisa. Um
   * roteiro não tem resolução, não tem quantidade e não produz arquivo — e a
   * primeira frase que fosse reaproveitada de lá seria a que fala de imagem.
   */
  /**
   * A Máquina de Storyboard — FRENTE STORYBOARD · CICLO 3 · Fase 1.
   *
   * O trilho é espelho: cada frase aqui descreve um estado LIDO do banco, nunca
   * um rótulo gravado. E a Fase 1 não tem nenhum botão que gaste — botão sem
   * função não entra na tela.
   */
  machineNode: {
    title: "Máquina de Storyboard",
    sidebarHint: "Rege o roteiro inteiro: uma imagem por cena, e o vídeo depois",
    remove: "Tirar a Máquina do canvas. As imagens e os vídeos continuam no banco.",

    // ── As entradas, no topo ───────────────────────────────────────────────
    entradaRoteiro: "Roteiro",
    entradaRoteiroHint: "Ligue um bloco de Roteiro aqui. A Máquina rege as fichas dele.",
    entradaReferencias: "Referências",
    entradaReferenciasHint:
      "Cards de Input que entram em TODAS as cenas — o mesmo produto em dez imagens.",

    // ── Sem roteiro ligado ─────────────────────────────────────────────────
    semRoteiro: "Nenhum roteiro ligado",
    /**
     * O caminho pronto, ao lado da instrução de arrastar — e nesta ordem.
     *
     * O dono não achou o «Fluxo de Storyboard» na primeira vez e montou à mão o
     * que um clique fazia. O botão fica aqui porque **aqui é onde a pessoa está
     * olhando** no instante em que ele serve; a instrução de arrastar continua
     * embaixo porque quem já tem um Roteiro no canvas não quer um segundo.
     */
    semRoteiroAcao: "Criar o Roteiro ligado a esta Máquina",
    semRoteiroHint: "Ou arraste um fio de um bloco de Roteiro que já exista até a entrada «Roteiro», aqui em cima.",
    semFichas: "Este roteiro ainda não tem fichas.",
    semFichasHint: "Gere o roteiro no bloco de Roteiro e as cenas aparecem aqui.",
    carregando: "Lendo o roteiro…",

    // ── A recusa do segundo fio ────────────────────────────────────────────
    /** Um roteiro e uma Máquina são um para um — ver CanvasNotice.board_taken. */
    roteiroJaRegido:
      "Este roteiro já é regido por outra Máquina. Um roteiro tem uma Máquina só — " +
      "duas disputariam o estado das mesmas fichas.",
    maquinaJaOcupada:
      "Esta Máquina já rege outro roteiro. Corte o fio atual antes de ligar outro.",

    // ── A configuração ─────────────────────────────────────────────────────
    configTitle: "Configuração",
    modelLabel: "Modelo",
    qualidadeLabel: "Qualidade",
    formatoDoCanal: (canal: string) => `Formato: ${canal}`,
    formatoHint: "O formato vem do canal do roteiro — não é escolha da Máquina.",
    inputsSwitch: "Input Referências",
    /** Nasce desligada, invariante 12. Sem exceção para a Máquina. */
    inputsOff: "Desligada: as referências ficam conectadas e visíveis, e não entram na geração.",
    inputsOn: "Ligada: as referências entram em todas as cenas.",

    // ── O trilho ───────────────────────────────────────────────────────────
    trilhoTitle: "Cenas",
    cenaLabel: (ordem: number) => `Cena ${ordem}`,
    /** ✂ corte · ⇥ continuação — os mesmos glifos do trilho do Roteiro. */
    transicaoCorte: "Corte — plano novo",
    transicaoContinuacao: "Continuação — emenda no último quadro da anterior",
    estados: {
      rascunho: "sem imagem",
      emenda: "emenda",
      pronta: "pronta",
      aprovada: "aprovada",
      falhou: "recusada",
    } as Record<string, string>,
    /**
     * Por que a cena não saiu — **uma frase e um gesto por classe**.
     *
     * "Recusada" cobria filtro, cota e timeout no mesmo balde, e o preço disso
     * foi medido em 28/08/2026: num lote de 4, seis falhas mandaram o dono
     * reescrever prompt à toa. O mesmo texto, **md5 idêntico**, foi recusado e
     * aceito minutos depois nas quatro cenas — não havia o que reescrever.
     *
     * Por isso cada classe diz **o que aconteceu** e **o que fazer**, e a do
     * filtro diz explicitamente para NÃO mexer no texto.
     */
    falhas: {
      filtro: {
        selo: "bloqueada pelo filtro",
        frase:
          "O provedor gerou e bloqueou a saída. O filtro dele não é determinístico: " +
          "a mesma cena costuma passar na tentativa seguinte.",
        gesto: "Repita — e não mexa no texto.",
      },
      cota: {
        selo: "provedor no limite",
        frase: "O provedor está limitando o ritmo de pedidos. Não é o seu texto.",
        gesto: "Espere alguns instantes e repita.",
      },
      saldo: {
        selo: "sem saldo",
        frase: "O saldo acabou antes desta cena. Nada foi cobrado por ela.",
        gesto: "Recarregue e repita.",
      },
      infra: {
        selo: "sem resposta",
        frase: "A chamada não completou — rede ou provedor fora do ar.",
        gesto: "Repita.",
      },
      desconhecida: {
        selo: "falhou",
        frase: "Não consegui classificar esta falha. O texto do provedor está no detalhe.",
        gesto: "Repita.",
      },
    } as Record<string, { selo: string; frase: string; gesto: string }>,
    /**
     * O gesto, e ele **escala com a contagem** — só no filtro.
     *
     * Uma recusa é ruído: o mesmo texto costuma passar depois, e mandar
     * reescrever ali faria a pessoa desfazer o que ia funcionar. Três do mesmo
     * texto deixam de ser ruído, e a tela para de dizer "repita" para sempre.
     */
    gestos: {
      repetir: "Repita — e não mexa no texto.",
      reescrever: "Reescreva a cena no Roteiro.",
      esperar: "Espere alguns instantes e repita.",
      recarregar: "Recarregue o saldo e repita.",
    } as Record<string, string>,
    recusouTresVezes: "Recusou três vezes o mesmo texto — reescreva a cena no Roteiro.",
    /** O texto cru do provedor, para quem for investigar. Nunca é a frase principal. */
    erroCru: (texto: string) => `Provedor: ${texto}`,

    /** Anotação, não estado: uma cena aprovada e desatualizada continua aprovada. */
    desatualizada: "a ficha mudou",
    desatualizadaHint:
      "A ficha desta cena mudou depois de esta imagem ter sido aprovada. A imagem continua "
      + "valendo — quem decide se a mudança importa é você.",
    /**
     * A frase da cena de continuação, e ela existe para a coluna não prometer um
     * primeiro quadro que não vai acontecer (D4).
     */
    emendaDe: (ordem: number) => `Continua da cena ${ordem}`,
    emendaHint:
      "Cenas de continuação não ganham imagem própria: o primeiro quadro delas é o " +
      "último quadro do clipe anterior, e ele sai de graça.",
    videoPronto: "vídeo pronto",
    videoGerando: "vídeo gerando",
    videoFalhou: "vídeo falhou",
    tentativas: (n: number) => (n === 1 ? "1 tentativa" : `${n} tentativas`),
    semImagem: "A imagem aparecerá aqui",

    // ── O portão de imagens — Fase 2 ───────────────────────────────────────
    /**
     * Com zero, o botão fala do estado — o mesmo conserto do "Aprovar as 0".
     *
     * Achado na re-verificação da própria correção do outro botão: eu tinha
     * consertado um dos dois e o irmão ficou. **Um defeito de contagem em texto
     * quase nunca é único**, porque quem escreveu o primeiro escreveu o segundo
     * do mesmo jeito, na mesma tarde.
     */
    portaoGerar: (n: number) =>
      n === 0 ? "Nada para gerar" : n === 1 ? "Gerar 1 imagem" : `Gerar as ${n} imagens`,
    /**
     * O custo fala a verdade MULTIPLICADA antes do clique (invariante 12) — e a
     * conta aparece inteira, não só o total: quem confere um número que não
     * entende, confere de novo.
     */
    portaoCusto: (n: number, preco: number, total: number, saldo: number) =>
      `Custará ${n} × ${preco} = ${sparks(total)} ⚡ · Saldo: ${sparks(saldo)} ⚡`,
    portaoSemCenas: "Todas as cenas de corte já têm imagem.",
    portaoSemCenasVazio: "Este roteiro não tem cena de corte para gerar.",
    portaoSemPreco: "Este modelo não vende essa qualidade. Escolha outra.",
    /** A recusa diz QUANTO falta: um "sem saldo" sem número faz a pessoa subtrair. */
    portaoSemSaldo: (faltam: number) => `Faltam ${sparks(faltam)} ⚡ para este lote.`,
    portaoSemSaldoHint:
      "O lote é recusado inteiro, e nada foi gerado. Gerar metade seria a tela decidindo por você.",
    portaoLoteCheio:
      "Ainda há imagens em andamento neste bloco. Espere a leva atual terminar.",
    portaoGerando: (feitas: number, total: number) => `Gerando ${feitas} de ${total}…`,

    /** Só as cenas de corte contam — a emenda não tem imagem própria (D4). */
    contaSoCortes: "As cenas de continuação não entram: elas não geram imagem.",

    /**
     * Com zero, o botão fala do estado e não de uma contagem.
     *
     * "Aprovar as 0 imagens" é português que ninguém escreve — e ele aparece
     * justamente no estado mais comum, o do trilho recém-carregado. Um botão
     * desabilitado ainda é lido.
     */
    aprovarTodas: (n: number) =>
      n === 0 ? "Nada para aprovar" : n === 1 ? "Aprovar a imagem" : `Aprovar as ${n} imagens`,
    aprovarCena: "Aprovar esta imagem",
    /** Aprovar não gasta, e a tela diz isso ao lado de um botão que gasta. */
    aprovarSemCusto: "Aprovar não custa Spark nenhum.",
    repetir: "Gerar esta cena de novo",
    repetirInstrucaoLabel: "Instrução para esta tentativa (opcional)",
    repetirInstrucaoPlaceholder: "mais fechado no rosto…",
    /**
     * A instrução é EFÊMERA — dirige esta tentativa e não volta para a ficha.
     * É o que mantém uma porta só para editar (Q1).
     */
    repetirInstrucaoHint:
      "Dirige só esta tentativa. A ficha não muda — para reescrevê-la, abra o Roteiro.",
    repetirConfirmar: "Gerar de novo",
    repetirCancelar: "Cancelar",

    erroCena: (frase: string) => `Cena recusada: ${frase}`,
    erroDesconhecido: "Não foi possível gerar esta cena. Tente de novo.",
    erroCenaSumiu: "Essa cena não está mais no roteiro. Recarregue a página.",
    erroSemSaldoNaVez:
      "O saldo acabou antes desta cena. Nada foi cobrado por ela.",

    // ── O portão de vídeo — Fase 3 ─────────────────────────────────────────
    //
    // A frase "o portão de vídeo chega na próxima fase" morreu aqui, e morrer é
    // o certo: ela existia para não mentir sobre o que não havia, e mantê-la
    // depois de o portão existir seria a mesma mentira ao contrário.
    videoTitle: "Vídeo",
    /**
     * O botão diz o QUE, a linha de baixo diz a CONTA — a ordem normativa da
     * invariante 12, a mesma do portão de imagem. Lidos juntos, dão a frase que
     * o dono fixou antes de autorizar o gasto:
     *
     *   «Animar as 6 · 4 aprovadas + 2 emendas · 6 × 210 = 1.260 ⚡ · Saldo 6.250»
     */
    animarBotao: (n: number) =>
      n === 0 ? "Nada para animar" : n === 1 ? "Animar 1 cena" : `Animar as ${n}`,
    animarComposicao: (aprovadas: number, emendas: number) =>
      [
        aprovadas === 0 ? null : `${aprovadas} ${aprovadas === 1 ? "aprovada" : "aprovadas"}`,
        emendas === 0 ? null : `${emendas} ${emendas === 1 ? "emenda" : "emendas"}`,
      ]
        .filter(Boolean)
        .join(" + "),
    animarCusto: (n: number, preco: number, total: number, saldo: number) =>
      `${n} × ${preco} = ${sparks(total)} ⚡ · Saldo: ${sparks(saldo)} ⚡`,
    /**
     * Quando as cenas do lote não custam o mesmo, a tela mostra a SOMA e não um
     * produto. Um "6 × 210" que não bate com o que vai ser cobrado é pior que
     * número nenhum — e o dia em que o catálogo vender duas durações chega sem
     * avisar.
     */
    animarCustoSoma: (total: number, saldo: number) =>
      `Total ${sparks(total)} ⚡ · Saldo: ${sparks(saldo)} ⚡`,
    animarGerando: (feitos: number, total: number) => `Animando ${feitos} de ${total}…`,
    /**
     * O tempo, ao lado do dinheiro — conserto de 28/08/2026.
     *
     * "Animar as 2" com uma cena dizendo "espera o clipe da 5" são duas frases
     * verdadeiras que, juntas e caladas, parecem uma contradição. O botão conta
     * o que vai ser cobrado; esta linha conta o que começa agora.
     */
    animarComEspera: (agora: number, depois: number) =>
      `${agora} ${agora === 1 ? "parte" : "partem"} agora, ` +
      `${depois} ${depois === 1 ? "entra" : "entram"} quando o clipe anterior ficar pronto`,
    animarSemCenas: "Nenhuma cena aprovada esperando vídeo.",
    animarSemCenasVazio: "Aprove a imagem de uma cena para poder animá-la.",
    animarSemPreco: "O catálogo de vídeo ainda não respondeu.",
    animarSemSaldo: (faltam: number) => `Faltam ${sparks(faltam)} ⚡ para este lote.`,
    animarSemSaldoHint:
      "O lote é recusado inteiro. Animar metade deixaria o filme cortado no meio.",
    /** Vídeo só de cena aprovada — sem exceção, e a tela diz isso onde se clica. */
    animarSoAprovadas:
      "Vídeo só de cena aprovada. As emendas herdam a aprovação da cena que emendam.",
    animarLoteCheio: "Ainda há vídeos em andamento neste bloco. Espere a leva atual terminar.",

    // ── «Montar o vídeo» — o terceiro portão, e o único sem preço ──────────
    /**
     * O portão que faz a Máquina terminar em UM arquivo.
     *
     * **Ele não mostra custo porque não tem.** Montar não chama modelo, não cria
     * linha em `generations` e não toca o ledger — juntar arquivos que já foram
     * pagos é engenharia, não geração. A ausência do número é a mensagem: os
     * outros dois portões dizem quanto vai custar, e este não diz nada, que é
     * como se lê "de graça" numa banda onde todo o resto tem preço.
     */
    montarTitulo: "Filme",
    montarBotao: "Montar o vídeo",
    montarMontando: "Montando…",
    /**
     * Desabilitado com a CONTA do que falta — nunca escondido.
     *
     * Um botão que some ensina que ele não existe; um botão apagado que diz
     * *"faltam 2 clipes"* ensina o que fazer para acendê-lo. É a decisão 3 do
     * dono, de 03/09/2026, e é a mesma forma do portão de imagem.
     */
    montarFaltam: (faltam: number, total: number) =>
      faltam === 1
        ? `Falta o clipe de 1 cena, de ${total}.`
        : `Faltam os clipes de ${faltam} cenas, de ${total}.`,
    montarPronto: (cenas: number) =>
      cenas === 1
        ? "1 cena, na ordem do roteiro. Sem custo."
        : `${cenas} cenas, na ordem do roteiro. Sem custo.`,
    montarFeito: (segundos: number, mb: string) =>
      `Filme montado: ${segundos.toFixed(1)}s, ${mb} MB. Está na galeria e no canvas.`,
    /**
     * As recusas da montagem, cada uma dizendo o que consertar.
     *
     * `destoante` nomeia o clipe **e** o que difere, porque *"não deu para
     * montar"* mandaria a pessoa adivinhar qual dos dez — e a Fase 0 mediu que
     * nenhuma biblioteca recusa isso sozinha: o `ffmpeg -c copy` entrega arquivo
     * silenciosamente errado, e o puro JS erra a resolução declarada.
     */
    montarDestoante: (rotulo: string, diferencas: string) =>
      `A ${rotulo} não combina com as outras: ${diferencas}. Refaça o clipe dela com a mesma configuração.`,
    montarPesado: (mb: string, teto: string) =>
      `O filme daria ${mb} MB e o limite é ${teto} MB. Tire cenas ou encurte as que já existem.`,
    montarIlegivel: (rotulo: string) =>
      `Não consegui ler o clipe da ${rotulo}. Refaça esse clipe e tente de novo.`,
    montarFalhou: "Não deu para montar agora. Tente de novo em um instante.",

    // ── D7 · reanimar ──────────────────────────────────────────────────────
    reanimarBotao: (n: number) => (n === 1 ? "Reanimar 1 cena" : `Reanimar ${n} cenas`),
    reanimarCusto: (total: number) => `por ${sparks(total)} ⚡`,
    /**
     * O ↻ do vídeo — a segunda metade da D7, 29/08/2026.
     *
     * Ele **marca**, não gasta. O dinheiro continua saindo num lugar só: o
     * portão, que soma as marcadas com as desatualizadas e diz o total antes do
     * clique. Um botão de 9 px que dispara 210 ⚡ seria a invariante 12 furada
     * pelo lugar mais fácil de furar.
     */
    refazerClipe: "↻ refazer o clipe",
    refazerClipeMarcada: "✓ vai ser refeito",
    refazerClipeHint:
      "Marca esta cena para ganhar um clipe novo. Nada é gasto agora: o custo aparece no " +
      "portão, somado, e é lá que você autoriza. O clipe atual não é apagado.",
    refazerClipeMarcadaHint: "Clique de novo para desmarcar. O custo está no portão, abaixo.",
    reanimarHint:
      "Estas cenas têm vídeo feito a partir de uma imagem que já não é a aprovada. Nada foi " +
      "apagado e nada se refaz sozinho — quem clica é você.",

    /** Anotação, como a da ficha: informa, nunca bloqueia. */
    videoDesatualizado: "vídeo desatualizado",
    videoDesatualizadoHint:
      "Este clipe partiu de uma imagem que já não é a aprovada — ou de um quadro de um clipe " +
      "que foi refeito. O vídeo continua valendo; quem decide se a mudança importa é você.",

    /**
     * Por que esta cena não está no lote — **uma frase por motivo**.
     *
     * Cada uma aponta um gesto diferente, e é a lição da Fase 2 aplicada ao
     * vídeo: "não anima" num balde só mandaria a pessoa procurar o conserto no
     * lugar errado. "aprove" se conserta aqui; "ajuste no Roteiro" se conserta
     * lá; "a cena N não tem clipe" não se conserta nesta coluna nenhuma.
     */
    videoMotivos: {
      gerando: "gerando o vídeo…",
      ja_tem_video: "vídeo pronto",
      nao_aprovada: "aprove para animar",
      falhou_no_lote: "falhou neste lote",
      fora_do_lote: "fica para o próximo",
      sem_catalogo: "",
    } as Record<string, string>,
    /**
     * R2.4 — a cena é candidata, mas **não é deste lote**. 31/08/2026.
     *
     * A frase existe porque a tela lê o mesmo `situacao` que o motorista obedece.
     * No clique de campo de 31/08, a cena 1 dizia "entra no lote" durante um lote
     * de reanimação que não era dela — e o motorista concordou com a tela e a
     * animou. Agora as duas dizem a mesma coisa, e a coisa é a verdade.
     */
    videoForaDoLoteHint:
      "Este lote é o das cenas que você mandou refazer. Esta cena continua candidata — " +
      "ela entra quando você clicar em Animar, e não antes.",
    /**
     * O contador do cabeçalho — o conserto A de 29/08/2026.
     *
     * O defeito que ele fecha foi medido no DOM: quando um clipe chegava, o
     * único pixel do node que mudava era a linha de 9 px da coluna daquela cena
     * — **1.192 px² de 245.670, 0,49% do node**. O caminho estava íntegro (~250 ms
     * do webhook ao pixel); o que faltava era alguém **poder ver**.
     *
     * Aqui em cima porque é onde o olho já está, e porque é o único lugar do node
     * que fala do lote inteiro. Some quando não há vídeo nenhum: um "0 de 0"
     * ensinaria a ignorar o contador justamente antes de ele importar.
     */
    videoContador: (prontos: number, total: number) => `▶ ${prontos} de ${total}`,
    videoContadorHint: (prontos: number, total: number) =>
      `${prontos} de ${total} ${total === 1 ? "cena tem clipe" : "cenas já têm clipe"}. ` +
      "O número sobe sozinho quando cada vídeo fica pronto — não é preciso sair e voltar.",
    /** O quadro de partida de uma emenda — a segunda linha da D4. */
    quadroDePartida: "quadro de partida",
    quadroDePartidaHint: (ordem: number) =>
      `O último quadro do clipe da cena ${ordem}, que é o primeiro quadro de verdade desta. ` +
      "Não foi gerado nem cobrado: saiu do clipe anterior.",
    /**
     * A trava de vida do endereço de retorno — 29/08/2026.
     *
     * Três modos de falhar, três frases, porque o conserto de cada um é
     * diferente e "não deu" mandaria procurar no lugar errado. O terceiro é o que
     * nasceu de um túnel morto com forma perfeita.
     */
    videoRetornoConferindo: "conferindo o endereço de retorno…",
    videoRetornoMorto: {
      nao_configurado:
        "O endereço de retorno não está configurado. Sem ele o vídeo seria gerado e cobrado " +
        "sem nunca voltar — por isso nada foi enviado.",
      forma_invalida:
        "O endereço de retorno existe mas não aponta para o webhook desta casa. Nada foi " +
        "enviado: um trabalho com retorno errado é um trabalho pago que não volta.",
      sem_resposta:
        "O endereço de retorno não responde. Ele tem a forma certa, mas ninguém atende do " +
        "outro lado — um túnel que caiu, por exemplo. Nada foi enviado e nada foi cobrado.",
      unauthenticated: "Sua sessão expirou. Entre de novo antes de animar.",
    } as Record<string, string>,
    videoNoLote: "entra no lote",
    videoNoLoteHint: "Esta cena vai virar clipe assim que houver vaga na leva.",
    videoEsperaDe: (ordem: number) => `espera o clipe da cena ${ordem}`,
    videoEsperaDeHint: (ordem: number) =>
      `O primeiro quadro desta cena é o último do clipe da cena ${ordem}. Ela parte assim que ` +
      "aquele clipe ficar pronto — sozinha, sem mais nenhum clique.",
    videoCadeiaParadaHint: (ordem: number) =>
      `A cena ${ordem} não produziu clipe neste lote, e o primeiro quadro desta vem de lá. ` +
      "Resolva a cena de cima e anime de novo — esta espera não termina sozinha.",
    videoCadeiaSemAprovacaoHint: (ordem: number) =>
      `Esta cena não tem imagem própria: ela emenda no clipe da cena ${ordem}. Aprove a imagem ` +
      "daquela cena e as duas entram no lote juntas.",
    videoCadeiaParada: (ordem: number) => `a cena ${ordem} não tem clipe`,
    videoCadeiaSemAprovacao: (ordem: number) => `aprove a cena ${ordem}`,
    videoDuracaoFora: (segundos: number) => `${segundos}s fora do catálogo`,
    videoDuracaoForaHint: (segundos: number) =>
      `A duração desta cena (${segundos}s) não está no catálogo do modelo. Ajuste-a no Roteiro ` +
      "para uma duração que o modelo vende.",

    // ── A cláusula da 0.3 — a pausa com a causa nomeada ───────────────────
    pausaDaAba: "Aguardando a aba voltar",
    pausaDaAbaHint:
      "Para emendar um clipe no anterior é preciso ler o último quadro dele, e o navegador só " +
      "decodifica vídeo com a aba à frente. A cadeia retoma sozinha quando você voltar — nada " +
      "foi perdido, e nada foi cobrado por esta espera.",

    /** Um webhook que não chega travaria não um node, mas as cenas de baixo. */
    /** O clipe pronto abre no mesmo visualizador da /galeria. */
    videoAbrir: "Abrir o clipe",
    videoVerificar: "Verificar agora",
    videoVerificarHint:
      "Este clipe está demorando mais do que o normal. Perguntar ao provedor não custa Spark " +
      "nenhum — e enquanto ele não responde, as cenas que emendam nele ficam paradas.",
  },

  storyboardNode: {
    title: "Roteiro",
    remove: "Tirar este bloco do canvas. O roteiro gravado continua no banco.",
    sidebarHint: "Uma ideia vira fichas de cena, prontas para virar imagem",
    /**
     * A saída do roteiro INTEIRO — Ciclo 3 · Fase 1.
     *
     * Fica embaixo, e as das cenas ficam à direita, porque são gestos opostos: a
     * da direita leva UMA ficha a um bloco de imagem (a ponte da Fase 4), esta
     * entrega o roteiro TODO a quem vai reger as dez.
     */
    roteiroHandle: "Ligar este roteiro a uma Máquina de Storyboard",

    // ── A pergunta ─────────────────────────────────────────────────────────
    configTitle: "Configuração",
    modelLabel: "Modelo",
    canalLabel: "Canal",
    /** Os cinco do CHECK de `cta_library.canal`. Canal novo é decisão de produto. */
    canais: {
      tiktok: "TikTok",
      tiktok_shop: "TikTok Shop",
      reels: "Reels",
      shorts: "Shorts",
      shopee: "Shopee",
    } as Record<string, string>,
    cenasLabel: "Cenas",
    /** O teto dito na tela, antes de ser recusado no servidor. */
    cenasTetoHint: "Dez é o teto de um roteiro. Cada cena vira um clipe de 5 segundos.",
    personagemLabel: "Personagem",
    personagemNenhuma: "Sem personagem (roteiro de produto)",
    personagemVazia: "Nenhuma personagem trabalha neste projeto ainda.",
    produtoLabel: "Produto",
    produtoPlaceholder: "Ex.: biquíni Aurora terracota",
    /** A ficha guarda texto; foto é assunto do Input de Produto, e a tela diz. */
    produtoHint: "Só o nome. Fotos entram pelo card Input de Produto, no bloco de imagem.",

    modoIdeia: "Escrever de uma ideia",
    modoColar: "Colar um roteiro pronto",
    ideiaLabel: "Ideia da história",
    ideiaPlaceholder:
      "Ex.: ela recebe o biquíni, experimenta em casa e mostra o caimento na luz da janela",
    textoLabel: "Roteiro para estruturar",
    textoPlaceholder: "Cole aqui o roteiro que você já escreveu, do jeito que ele está.",
    /** Por que o nº de cenas some ao colar: quem conta as cenas do texto é o modelo. */
    colarHint: "Quantas cenas o texto tem é o modelo que conta. Acima de 10, ele condensa.",

    generate: "Escrever roteiro",
    generateEstruturar: "Estruturar roteiro",
    working: "Escrevendo…",
    /** Sob o botão, no futuro do indicativo — a anatomia da §3. */
    costWillPrefix: "Custará",
    balanceLabel: "Saldo",
    /** Substituir avisa antes, porque um roteiro gerado por cima apaga as fichas. */
    replaceWarning: "Gerar de novo substitui as fichas que já estão no trilho.",
    replaceWarningEdited: (quantas: number) =>
      quantas === 1
        ? "1 ficha foi editada à mão e será substituída."
        : `${quantas} fichas foram editadas à mão e serão substituídas.`,

    /**
     * O aviso de ritmo, dito ANTES de gastar — que é a única hora em que ele
     * vale. Heurística de ~4 cenas por bloco de 15 s, do registro de 15/08/2026.
     */
    ritmoAviso: (segundos: number) =>
      `${segundos}s de vídeo. Acima de ~45s o ritmo cai — considere menos cenas.`,
    duracaoTotal: (segundos: number) => `${segundos}s no total`,

    // ── A resposta ─────────────────────────────────────────────────────────
    trilhoTitle: "Fichas de cena",
    trilhoEmpty: "As fichas aparecem aqui depois que o roteiro for escrito.",
    trilhoLoading: "Lendo o roteiro…",
    statusRascunho: "rascunho",
    statusAprovada: "aprovada",
    transicaoCorte: "Corte seco: começa num plano novo.",
    transicaoContinuacao:
      "Continuação: começa exatamente no último quadro da cena anterior — é o que emenda os dois clipes.",
    editarFicha: "Abrir a ficha",
    editadaAMao: "Editada à mão",

    // ── A ponte (Fase 4) ───────────────────────────────────────────────────
    /**
     * O ▸, e a frase diz o que ele faz **antes** de ele fazer — inclusive que
     * não custa nada. É o único gesto grátis ao lado de um trilho onde o gesto
     * vizinho (regerar) custa 5 ⚡.
     */
    ponte: "Criar um bloco Gerar Imagem com esta cena. Não custa Sparks.",
    ponteHandle: "Arraste para reger um bloco Gerar Imagem com esta cena.",
    /** O rótulo de leitor de tela: qual das dez linhas é este ▸. */
    ponteAria: (ordem: number) => `Criar um bloco Gerar Imagem com a cena ${ordem}`,
    /** Um clique que destaca em vez de criar precisa dizer o que fez. */
    ponteExistente: (ordem: number) =>
      `A Cena ${ordem} já dirige um bloco. Ele está destacado no canvas.`,

    // ── O overlay ──────────────────────────────────────────────────────────
    ficha: {
      titulo: (ordem: number, total: number) => `Cena ${ordem} de ${total}`,
      close: "Fechar",
      acaoLabel: "Ação",
      /** A dureza 2 da receita, repetida para quem vai reescrever à mão. */
      acaoHint:
        'A ação dirige e carrega tempo: "ri por meio segundo, depois encara a câmera por dois".',
      cenarioLabel: "Cenário",
      cenarioHint: "Curto e próprio desta cena — cada cena vira uma imagem separada.",
      enquadramentoLabel: "Enquadramento",
      movimentoLabel: "Movimento",
      movimentoPlaceholder: "Ex.: câmera se aproxima devagar",
      personagemLabel: "Personagem",
      /** Read-only, e a frase diz por quê — um handle digitado à mão só falha depois. */
      personagemFixo: "Quem está em cena vem da configuração do bloco.",
      personagemNenhuma: "Ninguém em cena",
      produtoLabel: "Produto",
      falaLabel: "Fala",
      falaPlaceholder: "O que ela diz, curto e falado.",
      ctaLabel: "Chamada para ação",
      ctaNenhum: "Sem CTA nesta cena",
      ctaProprio: "Escrever um próprio",
      ctaTextoLabel: "Texto do CTA",
      ctaVazia: "Este canal ainda não tem biblioteca de CTA. Escreva um próprio.",
      duracaoLabel: "Duração",
      transicaoLabel: "Transição",
      transicaoCorte: "Corte",
      transicaoContinuacao: "Continuação",
      /** A trava do banco, dita na tela antes de ser recusada por CHECK. */
      transicaoPrimeira: "A cena 1 não pode ser continuação: não existe quadro anterior.",
      statusLabel: "Estado",
      save: "Salvar ficha",
      saving: "Salvando…",
      saved: "Ficha salva.",
      saveError: "Não foi possível salvar a ficha. Tente de novo.",
      /** Editar não é gerar, e os dois gestos moram a três centímetros um do outro. */
      saveFree: "Salvar não custa Spark nenhum.",
      /**
       * O único gesto pago do trilho, e ele mora AQUI — nunca na lista. Dez
       * botões de gastar numa lista de dez linhas fazem da rolagem um campo
       * minado, e o gesto que custa dinheiro fica mais fácil que o que só olha.
       */
      regenerateTitle: "Regerar esta cena",
      regenerateInstrucaoLabel: "O que mudar",
      regenerateInstrucaoPlaceholder: "Ex.: deixa ela mais animada e troca o cenário para a cozinha",
      regenerateHint: "As cenas vizinhas vão junto, para a emenda continuar fazendo sentido.",
      regenerateWorking: "Reescrevendo…",
      regenerateNeedsInstrucao: "Escreva o que mudar antes de regerar.",
      /**
       * O que a ponte leva para a imagem, e o que ela não leva — dito na ficha,
       * que é onde a pergunta nasce.
       *
       * Um campo preenchido que não aparece na imagem parece defeito da ponte. É
       * o mesmo remédio do `falaDormente`, aplicado aos quatro campos que são de
       * vídeo e de voz: o silêncio sobre eles seria lido como esquecimento.
       */
      pontePega: "Para a imagem vão a ação, o cenário, o movimento e o enquadramento.",
      ponteNaoPega:
        "Fala, CTA, duração e transição ficam de fora: são do vídeo — e a fala, da voz que ainda não existe.",
      /** A ponte não anexa foto: produto é card de canvas desde 10/08/2026. */
      ponteProduto:
        "O produto entra como texto no prompt. Para a foto dele entrar, conecte um Input de Produto ao bloco.",
    },

    /** As recusas, cada uma com o conserto dentro da própria frase. */
    errors: {
      invalid: "Não foi possível enviar este pedido. Recarregue a página e tente de novo.",
      unauthenticated: "Sua sessão expirou. Recarregue a página para continuar.",
      not_configured:
        "O fornecedor de roteiro não está configurado neste ambiente. Avise o administrador.",
      insufficient_balance: "Sparks insuficientes para este roteiro.",
      empty_request: "Escreva a ideia da história antes de gerar.",
      unknown_handle: "Não encontrei essa personagem no seu Arsenal.",
      /**
       * A recusa da Etapa D2, e a frase ensina o conserto em vez de só dizer
       * não — a tela é o manual. Nada foi cobrado: esta recusa acontece antes de
       * o provedor ser chamado.
       */
      not_linked:
        "Essa personagem ainda não trabalha neste projeto. Vincule-a no painel do projeto e tente de novo.",
      no_version:
        "Essa personagem ainda não tem versão salva. Abra a ficha dela e salve uma versão antes de escrever o roteiro.",
      /** O catálogo não vende este trabalho neste modelo — e ninguém pagou por descobrir. */
      unsupported_job: "Este modelo não escreve esse tipo de roteiro.",
      storyboard_not_found: "Este bloco ainda não tem roteiro. Gere um antes de reescrever a cena.",
      scene_not_found: "Essa cena não está mais no roteiro. Recarregue a página.",
      /**
       * O modelo respondeu e o que veio não pode ser gravado. Dito assim, sem
       * culpar quem clicou: o erro foi do modelo, e a única ação útil é tentar
       * de novo. Nada foi cobrado.
       */
      invalid_answer:
        "O roteiro voltou fora do formato esperado e nada foi gravado. Tente de novo — você não foi cobrado.",
      refused:
        "O provedor recusou escrever este roteiro. Ajuste a ideia e tente de novo — você não foi cobrado.",
      error: "Não foi possível escrever o roteiro. Tente de novo.",
    },
    /**
     * O aviso de condensação, montado a partir da CONTA e não da frase do
     * modelo. `historia.ajuste` entra como explicação depois deste número — e só
     * quando ele de fato mudou.
     */
    condensou: (de: number, para: number) => `Condensei de ${de} para ${para} cenas.`,
    /** O que a coluna `fala` é hoje, dito em voz alta em vez de descoberto. */
    falaDormente:
      "Este campo ainda não é usado por nada: a voz chega numa fase futura. Escreva se quiser adiantar o texto.",
  },
  generation: {
    node: {
      title: "Gerar Imagem",
      sidebarHint: "Escreva a cena e gere a imagem",
      promptLabel: "Prompt principal",
      promptPlaceholder: "Insira aqui sua instrução…",
      promptHint: "Digite @ para chamar uma personagem.",
      /**
       * The one warning that keeps 100 ⚡ from becoming a surprise: an empty
       * prompt is a legitimate, useful command — "show me her as she is" — and
       * it brings the canonical swimwear with it, because that is what her
       * defaults say. Better read before the click than discovered after.
       */
      emptyPromptWithCharacter:
        "Prompt vazio gera a personagem nos padrões dela (traje canônico).",
      emptyPromptAlone: "Escreva a cena ou chame uma personagem com @.",

      // ── A ponte do Roteiro (Ciclo 2 · Fase 4) ────────────────────────────
      /**
       * A frase que explica um campo que muda sozinho.
       *
       * Sem ela, o fio vivo seria indistinguível de um defeito: o texto que a
       * pessoa está lendo se reescreve porque alguém corrigiu uma ficha do outro
       * lado do canvas. Com ela, o campo tem dono declarado — e o botão ao lado
       * diz como tomá-lo.
       */
      sceneBound: (ordem: number) => `Este prompt vem da Cena ${ordem}.`,
      /** O fio existe e a cena não: gerar o roteiro por cima com menos cenas. */
      sceneGone: (ordem: number) =>
        `A Cena ${ordem} não está mais no roteiro. Este prompt ficou como estava.`,
      sceneRelease: "Assumir o prompt",
      sceneReleaseHint:
        "Corta o fio da ficha. O texto continua aqui e passa a ser seu — a ficha para de reescrevê-lo.",
      /**
       * A limitação declarada desde a migration, dita onde ela atrapalha.
       *
       * `storyboard_scenes.produto` é texto livre porque produto virou card de
       * canvas em 10/08/2026 — não existe linha para uma FK apontar, e a ponte
       * não tem foto para anexar. Mandar conectar é a única coisa honesta a
       * fazer; fingir que resolveu seria pior que o silêncio.
       */
      sceneProduct: (nome: string) =>
        `Esta cena tem um produto: ${nome}. Conecte um Input de Produto para a foto dele entrar.`,
      /**
       * A emenda de 18/08/2026: substituir com confirmação, **contando a perda**.
       *
       * Aparece só quando há texto a perder — prompt vazio ou idêntico ao da
       * ficha passa em silêncio. Um aviso que aparece à toa é um aviso que se
       * aprende a fechar sem ler.
       */
      sceneOverwrite: (ordem: number) =>
        `O prompt escrito à mão será substituído pelo da Cena ${ordem}.`,
      sceneOverwriteConfirm: "Substituir",
      sceneOverwriteCancel: "Cancelar",
      modelLabel: "Modelo",
      formatLabel: "Formato",
      styleLabel: "Estilo",
      qualityLabel: "Qualidade",
      /**
       * Said inside the option itself, not in a tooltip.
       *
       * A resolution the chosen model does not sell stays on the list, greyed —
       * an option that is simply missing teaches nobody anything, while one that
       * is present and explains itself is the screen doing its job as the manual.
       */
      qualityUnavailable: "indisponível neste modelo",
      /**
       * O mesmo fato dito do outro lado da frase.
       *
       * No seletor de qualidade o sujeito é a resolução, e "indisponível neste
       * modelo" está certo. No seletor de modelo o sujeito já é o modelo, e
       * "Nano Banana Pro · indisponível neste modelo" seria o modelo falando de
       * si na terceira pessoa.
       */
      modelSizeUnavailable: "indisponível",
      quantityLabel: "Quantidade",
      quantityMore: "Mais uma imagem",
      quantityFewer: "Uma imagem a menos",
      /** Where the style came from — a property of the field, not of the value. */
      styleFromCharacter: "da personagem",
      styleFromDefault: "padrão",
      styleFromNode: "neste bloco",
      /** The collapsed creative controls — §6 rule 4, exercised with a value. */
      sceneAdjustments: "Ajustes de cena",
      sceneAdjustmentsOptional: "opcional",
      /** Suffix after the count while collapsed: "· 2 em uso". */
      sceneAdjustmentsCountSuffix: "em uso",
      cameraAngleLabel: "Ângulo de câmera",
      lightingLabel: "Iluminação",
      expressionLabel: "Expressão",
      adjustmentAuto: "Auto",
      /** O seletor cala quando um Input de Pose responde pelo mesmo eixo. */
      anglePaused: "em pausa",
      anglePausedHint:
        "Um Input de Pose está conectado, e a imagem dele decide o ponto de vista. Desconecte-o para voltar a escolher aqui.",
      sceneAdjustmentsHint:
        "Auto segue o padrão; o que você escolher aqui sobrescreve só aquele campo.",
      generate: "Gerar Conteúdo",
      /**
       * O botão não diz mais "Gerando…", e não fica mais desabilitado enquanto
       * a fila anda: gerar deixou de ser uma espera. Quem mostra o progresso são
       * as caixinhas, que sabem mostrar quatro de uma vez.
       */
      /** A fila cheia, dita **antes** do clique — teto descoberto depois não é teto. */
      queueFull:
        "A fila está cheia: 16 imagens esperando ou gerando. Assim que uma terminar, dá para enfileirar outra.",
      /** Cabe alguma coisa, mas não este clique inteiro — a fila é tudo ou nada. */
      queueNoRoomPrefix: "Ainda cabe",
      queueNoRoomSingular: "imagem na fila, e este clique pede",
      queueNoRoomPlural: "imagens na fila, e este clique pede",
      queueNoRoomSuffix: "Diminua a quantidade ou espere uma terminar.",
      /** O que a fila já compromete, quando o saldo pode não alcançar. */
      queueCommittedPrefix: "A fila já compromete",
      queueCommittedSuffix:
        "— as últimas podem ser recusadas por saldo, sem cobrança e sem derrubar as outras.",
      // Sem citar resolução desde que existem três: dizer "2K" era exato quando
      // 2K era a única, e viraria errado nas outras duas.
      generatingHint: "Uma imagem leva de 20 a 40 segundos — em 4K, um pouco mais.",
      /**
       * The cost, under the button and in the future tense — "custará", not
       * "custa". It moved out of the header for that reason: a number in the
       * corner of a card is a label, and a number under the button you are about
       * to press is a price.
       */
      costWillPrefix: "Custará",
      balanceLabel: "Saldo",
      /** The section above the prompt, where model, format and style live. */
      configTitle: "Configuração",
      /**
       * A inversão do cartão (13/08/2026).
       *
       * A geração deixou de nascer como cartão no canvas e passou a nascer na
       * moldura; o cartão virou ato deliberado, e este é o botão. O nome diz o
       * que a ação **serve para**, não o que ela cria: quem clica quer que a
       * imagem alimente o próximo bloco, e "criar cartão Resultado" descreveria
       * o mecanismo para alguém que só tem uma intenção.
       */
      useInFlow: "Usar no fluxo",
      useInFlowHint:
        "Põe esta imagem no canvas como um cartão conectado a este bloco, pronto para alimentar o próximo.",
      /** Já existe cartão desta imagem: ele é destacado, nunca duplicado. */
      useInFlowExisting: "Esta imagem já está no fluxo — o cartão dela foi destacado.",
      resultAlt: "Última imagem gerada neste bloco",
      /** The heading of the right-hand column, matching "Configuração". */
      resultTitle: "Resultado",
      emptyResult: "A imagem aparecerá aqui",
      outputHandle: "Liga ao resultado",
      inputHandle: "Referências — clique para escolher imagens",
      /** Says what leaves and what stays — the results already on the canvas do. */
      remove: "Tirar este bloco do canvas (os resultados ficam)",
      approximatedPrefix: "O modelo não tem",
      approximatedMiddle: "exato; saiu em",
      noSheetImagePrefix: "A",
      noSheetImageSuffix:
        "não tem folha completa — a identidade entrou só por texto. Gere a folha para ancorar o rosto.",
    },
    mention: {
      /** The autocomplete that opens on `@`. */
      title: "Personagens",
      empty: "Nenhuma personagem com versão salva.",
      emptyHint: "Salve a v1 de uma personagem para poder chamá-la com @.",
      versionPrefix: "v",
      noVersionSuffix: "sem versão",
      noVersionTooltip: "Salve a v1 desta personagem para poder chamá-la com @.",
    },
    /** The strip of attached images inside the block (N1). */
    /**
     * De onde uma referência veio, nas duas formas que as duas telas pedem.
     *
     * A **curta** entra numa lista que já disse "Imagem 2 ·", onde repetir a
     * palavra "Input" a cada linha só ocupa espaço. A **longa** entra num
     * tooltip, que aparece sozinho e sem contexto nenhum — ali "Character
     * Sheet" poderia ser o tipo da imagem, e "Input de Character Sheet" é o
     * card que está no canvas, com esse nome, a um fio de distância.
     *
     * As duas saem da mesma tabela porque são a mesma coisa dita para dois
     * públicos. Duas tabelas seriam duas chances de a faixa e o histórico
     * chamarem o mesmo card por nomes diferentes.
     */
    /**
     * §4 da D1 — a grade de resultados do bloco e a Galeria do projeto.
     *
     * Nasceu como "faixa de recentes" e virou a grade de dezesseis caixinhas de
     * 13/08/2026, onde a mesma caixinha mostra o trabalho gerando e a imagem
     * pronta. O título na tela continua "Recentes" porque continua sendo isso
     * que a pessoa vê ali: o que este bloco produziu, do mais novo ao mais
     * velho — a fila apenas ocupa o topo da lista antes de virar imagem.
     */
    recent: {
      title: "Recentes",
      seeAll: "Ver todas",
      seeAllHint: "Abrir a galeria deste projeto",
      promoteHint: "Ver esta imagem na moldura",
      /** O que a caixinha com a barra está dizendo, para quem passa o mouse. */
      runningHint: "Gerando esta imagem…",
      /**
       * A caixinha reservada.
       *
       * "Ainda não começou" é a metade que interessa a quem olha; a outra metade
       * — que por isso ainda não custou nada — é a regra da casa dita em cinco
       * palavras, no único lugar onde ela é visível.
       */
      queuedHint: "Na fila — ainda não começou, e ainda não custou nada.",
      /** O estado promovido é de leitura: o que o projeto guarda não muda. */
      promoted: "vendo uma imagem anterior",
      back: "Voltar ao último resultado",
    },

    gallery: {
      title: "Galeria do projeto",
      subtitle: "Tudo que este projeto gerou, mais recente primeiro.",
      sidebar: "Galeria",
      sidebarHint: "Ver tudo que este projeto gerou",
      empty: "Este projeto ainda não gerou nenhuma imagem.",
      emptyHint:
        "As folhas das personagens não entram aqui: elas nascem no editor, não no canvas.",
      loading: "Carregando…",
      loadMore: "Carregar mais",
      openHint: "Clique para ampliar",
      untitled: "Sem legenda",
      close: "Fechar",
      countSuffix: "imagens",
      countOne: "imagem",
    },

    referenceSources: {
      sheet: "Character Sheet",
      sheetLong: "Input de Character Sheet",
      product: "Produto",
      productLong: "Input de Produto",
      image: "Imagem",
      imageLong: "Input de Imagem",
      pose: "Pose/Ângulo",
      poseLong: "Input de Pose/Ângulo",
      /** Um Resultado do canvas ligado por fio: não é card de input, mas tem node. */
      result: "Resultado",
      resultLong: "Resultado conectado",
      /** A folha que a menção traz. Não é input de ninguém — é a âncora do @. */
      anchorPrefix: "Folha da @",
      anchorSuffix: "âncora",

      /**
       * As vagas que uma referência ocupa: "Imagem 2", "Imagens 3 e 4".
       *
       * Aqui e não em cada tela porque o número é a única coisa que o prompt
       * compilado e a miniatura têm em comum — "the product shown in reference
       * image 2" só é conferível se a tela disser 2 nos dois lugares.
       */
      imageOne: "Imagem",
      imageMany: "Imagens",
      and: "e",
    },

    references: {
      /**
       * As aspas são de propósito: o rótulo nomeia a chave, e a chave se chama
       * "Referências". Sem elas, "Input Referências" lê como duas palavras
       * soltas em vez do nome de uma coisa.
       */
      title: 'Input "Referências"',
      /** O selo ao lado do título quando há referências e a chave está desligada. */
      muted: "mudo",
      switchLabel: 'Ativar Input "Referências"',
      switchHint:
        "Desligado, as referências continuam conectadas e não entram nesta geração.",
      helpLabel: "Como funcionam os inputs",
      helpBody:
        "Os inputs — produto, imagem, pose, ficha — ficam na seção Inputs do menu " +
        "lateral. Arraste um para o canvas, conecte na borda esquerda deste bloco e " +
        "ligue a chave para ele entrar na geração.",
      ofPrefix: "de",
      sheetCounts: "a folha conta uma",
      add: "Adicionar referência",
      imagePrefix: "Imagem",
      hasDirective: "Tem tipo ou instrução",
      fullPrefix: "Este modelo aceita até",
      fullSuffix: "imagens por geração.",
      remove: "Remover",
      instructionPlaceholder: "desta imagem, pegue apenas o cenário",
      instructionHint: "Opcional. Traduzido na hora de gerar.",
      /** Várias fotos de uma coisa só são uma coisa só na faixa, como no prompt. */
      groupUnknown: "Sem nome",
      removeGroup: "Remover o card inteiro",
      /**
       * O que veio por um card é decidido **no card** — inclusive o chip. Esta
       * linha dizia "Tipo fixo: Produto" para tudo, porque todo input carimba o
       * id do node como id de grupo; agora ela nomeia o card de origem.
       */
      fixedByCard: "Definido no card:",
      groupInstructionHint: "Vale para todas as fotos deste card, só nesta geração.",
    },

    /** The gallery modal (§4) — used by a generating block and by the product editor. */
    picker: {
      /**
       * The half of the copy that depends on who opened it. Everything else is
       * the same sentence for both, which is the point of there being one modal.
       */
      scopes: {
        geracao: {
          title: "Escolher referências",
          remainingSuffix: "nesta geração — o limite deste modelo é",
          limitPrefix: "Este modelo aceita até",
          limitSuffix: "imagens por geração.",
        },
        produto: {
          title: "Escolher fotos do produto",
          remainingSuffix: "neste produto — o limite é",
          limitPrefix: "Um produto guarda até",
          limitSuffix: "fotos.",
        },
        input: {
          title: "Escolher a imagem do input",
          remainingSuffix: "neste input — o limite é",
          limitPrefix: "Um input de imagem guarda",
          limitSuffix: "imagem.",
        },
        avatar: {
          title: "Escolher a foto de perfil",
          remainingSuffix: "como foto de perfil — o limite é",
          limitPrefix: "A foto de perfil é",
          limitSuffix: "imagem.",
        },
      },
      close: "Fechar",
      remainingPrefix: "Você pode acrescentar",
      filters: {
        todas: "Todas",
        geradas: "Geradas",
        enviadas: "Enviadas",
      },
      searchPlaceholder: "Buscar por nome…",
      upload: "Enviar imagem",
      uploading: "Enviando…",
      loading: "Carregando…",
      empty: "Nenhuma imagem aqui ainda.",
      emptyHint:
        "Envie uma imagem ou gere a primeira: tudo o que você gera fica nesta galeria para sempre.",
      untitled: "Sem nome",
      /**
       * O selo do quadro derivado, lido de `derivedFromAssetId` — do dado, e
       * nunca do rótulo ou do `source`.
       *
       * Numa miniatura de 100px o quadro final de um vídeo é indistinguível de
       * uma foto qualquer, e a diferença importa antes do clique: quem escolhe
       * uma referência precisa saber que aquilo veio de um clipe.
       */
      derivedBadge: "quadro de vídeo",
      loadMore: "Carregar mais",
      selected: "selecionadas",
      notAnImage: "Esse arquivo não é uma imagem.",
      tooLarge: "Imagem grande demais (máximo 10 MB).",
      uploadFailed: "Não foi possível enviar a imagem.",
      cancel: "Cancelar",
      confirm: "Adicionar",
    },

    result: {
      title: "Resultado",
      loading: "Carregando imagem…",
      missing: "Imagem indisponível.",
      missingHint: "O arquivo pode ter sido removido da galeria.",
      alt: "Imagem gerada",
      inputHandle: "Vem do bloco que gerou",
      outputHandle: "Ligue a um bloco para usar como referência",
      download: "Baixar",
      downloading: "Preparando…",
      useAsReference: "Usar como referência",
      useAsReferenceHint: "Cria um novo bloco Gerar Imagem já usando esta imagem",
      seePrompt: "Ver prompt",
      noGeneration: "Esta imagem não guarda o registro da geração.",
      remove: "Tirar do canvas (a imagem continua na galeria)",
      /**
       * The one card where duplicating would create nothing. Said as a reason
       * rather than hidden, so the header is the same header everywhere.
       */
      noDuplicate: "A imagem já está na galeria — duplicar o cartão não cria nada novo.",
    },

    lightbox: {
      title: "Imagem ampliada",
      videoTitle: "Vídeo",
      close: "Fechar",
      loading: "Carregando…",
      hint: "Clique na imagem para ampliar · Esc para fechar",
      zoomedHint: "Clique na imagem para reduzir · arraste para percorrer · Esc para fechar",
      // Vídeo não amplia — então a dica não pode prometer ampliar. Ela fala do
      // que existe ali: os controles do player e a saída.
      /**
     * A fila de clipes — Fase 2 do «vídeo final».
     *
     * O rótulo e a posição existem porque uma fila que avança sozinha precisa
     * dizer onde chegou; sem isso, o vídeo troca de conteúdo no meio e quem
     * assiste não sabe se aquilo é a cena seguinte ou um defeito desta.
     */
    filaPosicao: (n: number, total: number) => `· ${n} de ${total}`,
    filaHint: "As cenas tocam em sequência. ← → para voltar e pular, Esc para fechar.",
    filaAnterior: "Cena anterior",
    filaProximo: "Próxima cena",
    videoHint: "Use os controles para assistir · Esc para fechar",
      openHint: "Ver ampliada",
    },

    /** "Ver prompt usado" — the stored recipe, read back (§6 regra 3). */
    inspector: {
      title: "Prompt usado nesta imagem",
      close: "Fechar",
      loading: "Carregando…",
      missing: "Não foi possível carregar o registro desta geração.",
      written: "O que você escreveu",
      nothingWritten: "Nada — a personagem foi gerada nos padrões dela.",
      style: "Estilo",
      styleOrigin: {
        node: "escolhido neste bloco",
        personagem: "herdado da personagem",
        padrao: "padrão do sistema",
      },
      character: "Personagem",
      noCharacter: "Nenhuma personagem foi mencionada.",
      anchoredBySheet: "ancorada na folha completa",
      textOnly: "só por texto, sem folha",
      /**
       * O item 3d, lido de volta. A cena compilada não contém mais a menção —
       * ela virou sujeito antes de traduzir —, então sem esta linha nada no
       * registro consegue dizer quais palavras da cena eram a personagem.
       */
      mentionSubjectPrefix: "Na cena,",
      mentionSubjectMiddle: "virou",
      mentionSubjectSuffix: "antes da tradução.",
      /** O item 3b: quantos "seu/sua" viraram "dela/dele" na mesma passada. */
      mentionPossessiveOne: "possessivo também virou",
      mentionPossessiveMany: "possessivos também viraram",
      director: "Regra do diretor",
      directed: "Você dirigiu a cena — os padrões da personagem não entraram.",
      defaults: "Prompt vazio — entraram os padrões da personagem, inclusive o traje canônico.",
      sceneAdjustments: "Ajustes de cena",
      /** The Portuguese name of each adjustable field, keyed by `campo`. */
      adjustmentField: {
        angulo_camera: "Ângulo de câmera",
        iluminacao: "Iluminação",
        expressao: "Expressão",
      },
      /**
       * A folha da menção, lida de volta como a imagem 1 que ela é.
       *
       * Ela nunca esteve nesta lista — só em `personagem.folha_asset_id` —, e
       * por isso a lista começava em "Imagem 2" sem nada explicando o 1.
       */
      anchorHint: "Entra como imagem 1 e ancora a identidade. Não é input: vem com a menção.",
      pausedAngle: "Ângulo em pausa",
      pausedAngleWhy: "o Input de Pose respondeu por ele",
      mutedReferences: "Referências mudas",
      mutedSingular: "imagem estava conectada e não entrou nesta geração.",
      mutedPlural: "imagens estavam conectadas e não entraram nesta geração.",
      restrictions: "Restrições",
      sent: "O que foi para o modelo",
      noText: "Sem texto registrado.",
      noStructure:
        "Esta geração é anterior ao registro estruturado — só o texto final foi guardado.",
      fromVersion: "versão congelada",
      copy: "Copiar prompt",
      copied: "Copiado",
    },
    errors: {
      noModel: "Nenhum modelo de imagem disponível. Configure a chave do fornecedor.",
      notConfigured: "A chave deste fornecedor não está configurada no servidor.",
      invalid: "Não foi possível gerar com esses dados.",
      emptyRequest: "Escreva a cena ou chame uma personagem com @.",
      emptyCharacter:
        "Esta versão não tem folha completa nem campos confirmados — não há o que ancorar. Confirme campos ou gere a folha antes.",
      unknownHandlePrefix: "Não existe personagem",
      unknownHandleSuffix: "no seu arsenal.",
      // Diz as duas coisas que a pessoa precisa: ela não sumiu, e onde fica o
      // conserto. Uma recusa que só diz não obriga a adivinhar.
      notLinkedPrefix: "A personagem",
      notLinkedSuffix:
        "não está vinculada a este projeto. Traga-a por “Adicionar existente”, no menu lateral — ela continua nos outros projetos.",
      noVersionPrefix: "A personagem",
      noVersionSuffix: "ainda não tem versão salva. Salve a v1 para poder chamá-la.",
      unknownVersionPrefix: "A personagem",
      unknownVersionSuffix: "não tem essa versão.",
      multipleCharacters: "Uma personagem por geração nesta versão. Deixe só uma menção @.",
      unsupportedSize:
        "Este modelo não gera nessa resolução. Escolha outra qualidade ou outro modelo.",
      unauthenticated: "Sua sessão expirou. Recarregue a página e entre de novo.",
      tooManyReferencesPrefix: "Este modelo aceita até",
      tooManyReferencesSuffix: "imagens de referência por geração.",
      /** The wire a product could not fit through, said before it is drawn. */
      productOverLimitPrefix: "Este produto ocupa",
      productOverLimitMiddle: "referências e só resta espaço para",
      productOverLimitSuffix:
        "Tire uma referência do bloco ou escolha um modelo com teto maior.",
      missingReference: "Uma das imagens de referência não está mais disponível.",
      translationFailed:
        "Não consegui traduzir seu texto agora — nada foi gerado nem cobrado. Tente de novo.",
      insufficientPrefix: "Saldo insuficiente: precisa de",
      insufficientMiddle: "e você tem",
      /**
       * A refusal is an expected error (architecture decision 7), not a defect —
       * and the sentence has to carry the one thing that fixes it. The filter is
       * probabilistic and rephrasing genuinely works: the same configuration
       * refused by Nano Banana 2 passed on the second attempt with different
       * wording, and passed first time on the Pro.
       */
      refused:
        "O provedor recusou esta geração por política de conteúdo. Ajuste a descrição da cena e tente de novo — nada foi cobrado.",
      failed: "Não foi possível gerar a imagem.",
    },
  },
} as const;
