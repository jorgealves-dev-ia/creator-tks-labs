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
    sidebarComingSoon: "Vídeo e storyboard chegam nas próximas fases.",
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
    },

    sidebar: {
      title: "Personagens",
      newCharacter: "Nova personagem",
      creating: "Criando…",
      addToCanvas: "Adicionar ao canvas",
      onCanvas: "No canvas",
      empty: "Nenhuma personagem ainda. Crie a primeira.",
      openProjectFirst: "Abra um projeto para criar uma personagem.",
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
      backToDraft: "Voltar ao rascunho",
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
  },

  /** Products in the Arsenal — the peça a campanha inteira gira em volta. */
  products: {
    sidebar: {
      title: "Produtos",
      newProduct: "Novo produto",
      addToCanvas: "Adicionar ao canvas",
      onCanvas: "No canvas",
      empty: "Nenhum produto ainda. Crie o primeiro.",
    },

    card: {
      editHint: "Clique duas vezes para editar",
      edit: "Editar",
      remove: "Recolher para o Arsenal (o produto continua lá)",
      outputHandle: "Ligar este produto a um bloco de geração",
      noPhotos: "Sem fotos ainda",
      /** "3 fotos · ocupa 3 referências" — dito antes do clique, nunca depois. */
      occupies: "ocupa",
      photoSingular: "foto",
      photoPlural: "fotos",
      referenceSingular: "referência",
      referencePlural: "referências",
      missing: "Produto não encontrado",
      missingHint: "Ele pode ter sido removido. Tire este cartão do canvas.",
    },

    dialog: {
      newTitle: "Novo produto",
      newSubtitle: "Nome primeiro; as fotos e a instrução vêm na tela seguinte.",
      nameLabel: "Nome",
      namePlaceholder: "Biquíni cortininha verde",
      create: "Criar produto",
      creating: "Criando…",
      createFailed: "Não foi possível criar o produto.",
      cancel: "Cancelar",
      close: "Fechar",
      done: "Concluir",

      photosLabel: "Fotos",
      photosOf: "de",
      photosHint: "Frente, verso, detalhe, etiqueta — cada foto entra na geração.",
      addPhoto: "Adicionar foto",
      removePhoto: "Remover foto",
      full: "Um produto guarda até 5 fotos.",
      photoFailed: "Não foi possível anexar a foto.",
      removePhotoHint: "A foto sai do produto e continua na galeria.",

      instructionLabel: "Instrução padrão",
      instructionPlaceholder: "a modelo veste esta peça exatamente como mostrada",
      instructionHint:
        "Opcional, e editável em cada geração. Traduzida na hora de gerar.",

      archive: "Remover do Arsenal",
      archiveConfirm: "Remover este produto?",
      archiveHint: "As fotos continuam na galeria e as imagens já geradas não mudam.",
      archiveFailed: "Não foi possível remover o produto.",
      yes: "Remover",
      no: "Cancelar",
    },
  },

  /** The generation blocks on the canvas — docs/nodes-geracao.md. */
  generation: {
    node: {
      title: "Gerar Imagem",
      sidebarHint: "Escreva a cena e gere a imagem",
      promptLabel: "A cena, em português",
      promptPlaceholder: "@luna tomando café numa varanda ao amanhecer",
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
      sceneAdjustmentsHint:
        "Auto segue o padrão; o que você escolher aqui sobrescreve só aquele campo.",
      generate: "Gerar",
      generating: "Gerando…",
      generatingHint: "Uma imagem 2K leva de 20 a 40 segundos.",
      costPrefix: "Custa",
      balancePrefix: "saldo",
      resultAlt: "Última imagem gerada neste bloco",
      emptyResult: "A imagem aparece aqui depois de gerar.",
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
    references: {
      title: "Referências",
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
      /** A product's photos are one thing in the strip, as they are in the prompt. */
      productPrefix: "Produto:",
      productUnknown: "Produto",
      removeProduct: "Remover o produto inteiro",
      productFixedKind: "Tipo fixo:",
      productInstructionHint: "Vale para todas as fotos deste produto, só nesta geração.",
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
      close: "Fechar",
      loading: "Carregando…",
      hint: "Clique na imagem para ampliar · Esc para fechar",
      zoomedHint: "Clique na imagem para reduzir · arraste para percorrer · Esc para fechar",
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
      references: "Referências",
      imagePrefix: "Imagem",
      /** A product occupied several slots and gave one instruction: "Imagens 2, 3 e 4". */
      imagesPrefix: "Imagens",
      and: "e",
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
      noVersionPrefix: "A personagem",
      noVersionSuffix: "ainda não tem versão salva. Salve a v1 para poder chamá-la.",
      unknownVersionPrefix: "A personagem",
      unknownVersionSuffix: "não tem essa versão.",
      multipleCharacters: "Uma personagem por geração nesta versão. Deixe só uma menção @.",
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
