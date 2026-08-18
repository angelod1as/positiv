export const errorsCopy = {
  system: "Houve um erro no sistema, tente novamente mais tarde",
  boundary: {
    title: "Oops!",
    notFoundTitle: "404",
    genericTitle: "Error",
    notFound: "Página não encontrada.",
    details: (email: string) => `Um erro ocorreu. Isso é frustrante, nós sabemos.

Avise-nos pelo [email](mailto:${email}) com as informações:

- Navegador (Chrome, Firefox, Safari, etc)
- Sistema operacional (iOS, Android, macOS, Windows)
- Um breve relato do que você tentou fazer (qual página, qual botão, etc)`,
  },
  auth: {
    loginRequired: "Você precisa estar logade para continuar",
    adminRequired: "Você não tem permissão para acessar esta página",
    sessionFailed:
      "Houve um erro com sua autenticação, tente novamente mais tarde",
    invalidCredentials: "Credenciais inválidas",
    emailNotConfirmed:
      "Você precisa confirmar suas credenciais. Confira seu e-mail!",
    authFailed: (code: string | undefined, message: string) =>
      `Erro de autenticação — Código: "${code}" — Mensagem: "${message}"`,
    missingResetCode:
      "O link não continha o código necessário para mudar sua senha",
    resetRequestFailed:
      "Algo deu errado com sua requisição, contate o administrador",
    logoutFailed: (code: string | undefined, message: string) =>
      `Erro de logout — Código: "${code}" — Mensagem: "${message}"`,
    samePassword: "Será que essa não era a sua senha? Tente outra.",
    passwordChangeFailed:
      "Não conseguimos resetar sua senha. Entre em contato com o administrador",
    signupBlocked:
      'Houve um erro no cadastro da sua conta. Se você já tem uma conta, tente acessar o "esqueci minha senha". Se não, entre em contato pelo WhatsApp (em nossa homepage) e indique qual email você utilizou.',
  },
} as const
