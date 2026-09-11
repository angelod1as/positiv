export const adminInvitesCopy = {
  trigger: "Convidar participante",
  modal: {
    title: "Convidar participante",
    description:
      "Gere um link para uma pessoa específica entrar num evento com inscrições encerradas. O link só funciona para ela.",
    searchLabel: "Buscar pessoa",
    searchPlaceholder: "Nome, nome social, e-mail ou telefone",
    searchHelp:
      "Busque por nome, nome social, e-mail ou telefone. No telefone, só os números importam — pode digitar com ou sem parênteses e traço.",
    noResults: "Ninguém encontrado com esse termo.",
    invite: "Convidar",
    alreadyParticipant: "Já participante",
    alreadyInvited: "Convite gerado",
    copy: "Copiar link",
    revoke: "Revogar",
    invitesTitle: "Convites deste evento",
    noInvites: "Nenhum convite gerado ainda.",
    participantsTitle: "Já inscritas",
    noParticipants: "Ninguém inscrito ainda.",
    status: {
      created: "Gerado",
      used: "Usado",
      revoked: "Revogado",
    },
    inviteLine: (name: string, status: string) => `${name} — ${status}`,
    failed: "Não foi possível gerar o convite. Tente de novo.",
    revokeFailed: "Não foi possível revogar o convite. Tente de novo.",
  },
} as const
