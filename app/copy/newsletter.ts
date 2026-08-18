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
