import { sharedCopy } from "~/copy/shared"

export const authLayoutCopy = {
  logoAlt: "Positiv Logo",
} as const

export const loginCopy = {
  title: "Entrar",
  description: "Entre na sua conta com seu e-mail",
  signupPrompt: (registerPath: string) =>
    `**Não tem uma conta? [Criar conta](${registerPath})**`,
  forgotPassword: "Esqueci minha senha",
  labels: { password: "Senha", email: "E-mail" },
  placeholders: { email: "email@exemplo.com", password: "senha123" },
  pendingButtonLabel: "Entrando...",
  buttonLabel: "Entrar",
  welcomeToast: {
    message: "Bem vinde!",
    description:
      "Nosso sistema ainda está em desenvolvimento. Nos ajude reportando bugs! Link no pé da página",
  },
} as const

export const logoutCopy = {
  successToast: "Você deslogou com sucesso",
} as const

export const registerCopy = {
  title: "Criar conta",
  description:
    "Depois de se cadastrar, uma mensagem de confirmação vai chegar em seu email.",
  loginPrompt: (loginPath: string) =>
    `Já tem uma conta? [Entre aqui](${loginPath})`,
  labels: {
    password: "Senha",
    email: "E-mail",
    confirmPassword: "Confirme a senha",
    over18: "Sou maior de 18 anos",
  },
  placeholders: { email: "email@exemplo.com", password: "senha123" },
  pendingButtonLabel: "Entrando...",
  validation: {
    over18: "Você só pode se inscrever se for maior de 18 anos",
    captcha: sharedCopy.validation.captcha,
    passwordMismatch: "As senhas não são iguais",
  },
} as const

export const forgotPasswordCopy = {
  title: "Resetar senha",
  description: "Nada melhor que uma senha nova, certo?",
  loginPrompt: (loginPath: string) =>
    `Já tem uma conta? [Entre aqui](${loginPath})`,
  labels: { email: "E-mail" },
  placeholders: { email: "email@exemplo.com" },
  pendingButtonLabel: "Entrando...",
  buttonLabel: "Entrar",
  successToast:
    "Se você tiver uma conta com essas credenciais, veja seu email; um link estará lá te esperando!",
} as const

export const confirmEmailMessageCopy = {
  title: "Confirme sua conta",
  instruction:
    "Clique no link na mensagem enviada para seu email para confirmar sua conta.",
  spamNotice:
    "Não esqueça de checar a caixa de Spam ou as caixas de Promoções do Gmail.",
  retry: (forgotPasswordPath: string) =>
    `Se a mensagem demorar mais que 5 minutos para chegar, tente novamente. Se mesmo assim não der certo, tente o processo de ["esqueci minha senha"](${forgotPasswordPath})`,
} as const

export const registrationErrorCopy = {
  title: "Erro ao criar conta",
  body: "Houve um erro ao criar sua conta. Entre em contato com o nosso WhatsApp e informe o erro **ERR-001**.",
  whatsappMessage: "Olá! Tive o erro ERR-001 ao criar minha conta",
  whatsappCta: "Falar pelo WhatsApp",
} as const

export const authConfirmCopy = {
  passwordReset: "Senha redefinida com sucesso!",
  emailConfirmed: "E-mail confirmado com sucesso!",
  linkExpired:
    "Link já utilizado ou expirado. Tente fazer login ou solicite um novo link.",
  confirmFailed: (reason: string) => `Erro ao confirmar: ${reason}`,
  invalidLinkReason: "link inválido",
  invalidLink: "Link inválido. Por favor, verifique o link no seu e-mail.",
} as const
