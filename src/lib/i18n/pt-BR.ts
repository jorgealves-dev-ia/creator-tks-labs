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
    sidebarComingSoon: "Os blocos chegam na próxima fase.",
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
      failed: "Falha ao salvar",
      retry: "Tentar de novo",
    },
    sparksLabel: "Sparks",
    sparksTooltip: "Seus créditos para gerar",
  },
} as const;
