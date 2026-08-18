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
} as const
