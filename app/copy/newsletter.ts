export const unsubscribeCopy = {
  invalidLink: "Link de descadastro inválido",
  notFound: "Não foi possível encontrar sua inscrição na newsletter",
  invalidData: "Dados de descadastro inválidos",
  failed:
    "Erro ao cancelar inscrição. Por favor, tente novamente ou entre em contato.",
  successToast: "Você foi descadastrado da newsletter com sucesso.",
  already: {
    title: "Você já está descadastrado",
    body: (name: string, email: string) =>
      `**${name}** (${email}) já está descadastrado da nossa newsletter.`,
    resubscribe:
      "Se quiser voltar a receber nossos emails, você pode se inscrever novamente nas configurações da sua conta.",
  },
  title: "Deseja cancelar sua inscrição na newsletter?",
  description:
    "Você não receberá mais emails de novidades e eventos da Positiv",
  confirm: "Sim, cancelar inscrição",
} as const

export const newsletterModalCopy = {
  title: "Cadastre-se na nossa newsletter!",
  body: `Receba atualizações sobre os próximos eventos, novidades e conteúdos exclusivos da Positiv diretamente no seu email.

Você pode cancelar sua inscrição a qualquer momento, e suas informações nunca serão compartilhadas com terceiros.`,
  dismiss: "Talvez mais tarde",
  subscribe: "Inscrever-me",
} as const

export const newsletterSubscribeCopy = {
  loginRequired: "Você precisa estar logado para se inscrever",
  failed: "Não foi possível concluir a inscrição. Tente novamente.",
  successWithSyncFailure:
    "Inscrição realizada! Houve um problema temporário com o sistema de emails, mas entraremos em contato em breve.",
  success: "Inscrição realizada com sucesso!",
} as const
