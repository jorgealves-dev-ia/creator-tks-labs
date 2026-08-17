/**
 * Every user-facing string lives here. Identifiers stay in English, copy stays
 * in pt-BR — see the code conventions in CLAUDE.md.
 */
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
    // O vídeo chegou em 13/08/2026 e esta linha ficou logo abaixo dele dizendo
    // que ele não tinha chegado. Uma prateleira que desmente o que ela mesma
    // oferece ensina a não ler o rodapé.
    sidebarComingSoon: "Storyboard e voz chegam nas próximas fases.",
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
  storyboardNode: {
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
