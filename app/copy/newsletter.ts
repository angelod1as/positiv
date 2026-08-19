export const unsubscribeCopy = {
  invalidLink: "Link de cancelamento inválido",
  notFound: "Não foi possível encontrar sua assinatura da newsletter",
  invalidData: "Dados de cancelamento inválidos",
  failed:
    "Erro ao cancelar assinatura. Por favor, tente novamente ou entre em contato.",
  successToast: "Sua assinatura da newsletter foi cancelada com sucesso.",
  already: {
    title: "Sua assinatura já está cancelada",
    body: (email: string) => `(${email}) não assina mais a nossa newsletter.`,
    resubscribe:
      "Se quiser voltar a receber nossos emails, você pode assinar novamente nas configurações da sua conta.",
  },
  title: "Deseja cancelar sua assinatura da newsletter?",
  description:
    "Você não receberá mais emails de novidades e eventos da Positiv",
  confirm: "Sim, cancelar assinatura",
} as const

export const newsletterModalCopy = {
  title: "Assine nossa newsletter!",
  body: `Receba atualizações sobre os próximos eventos, novidades e conteúdos exclusivos da Positiv diretamente no seu email.

Você pode cancelar sua assinatura a qualquer momento, e suas informações nunca serão compartilhadas com terceiros.`,
  dismiss: "Talvez mais tarde",
  subscribe: "Assinar",
} as const

export const newsletterSubscribeCopy = {
  loginRequired: "Você precisa estar logado para assinar",
  failed: "Não foi possível concluir a assinatura. Tente novamente.",
  successWithSyncFailure:
    "Assinatura realizada! Houve um problema temporário com o sistema de emails, mas entraremos em contato em breve.",
  success: "Assinatura realizada com sucesso!",
} as const
