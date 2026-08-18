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
