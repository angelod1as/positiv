export const participantCopy = {
  basicData: {
    profileUpdateFailed: (code: string, message: string) =>
      `Erro atualizando o perfil — Código: "${code}" — Mensagem: "${message}"`,
    profileNotFound: "Erro ao buscar usuário",
    invalidExtraData: "Algo deu errado com seu formulário, tente de novo.",
    incompleteBasicData:
      "Parece que há algo faltando neste formulário, tente novamente.",
    saved: "Dados salvos com sucesso",
  },
  terms: {
    profileLinkFailed: "Problema ao vincular perfil",
    profileCreateFailed: "Problema ao criar perfil",
    newsletterFailed:
      "Não foi possível concluir sua assinatura da newsletter. Entre em contato com os administradores em partypositiv@gmail.com",
  },
  application: {
    failed: "Oops, algo deu errado na sua candidatura. Tente mais tarde.",
    eventNotFound: "Evento não encontrado.",
    registrationClosed:
      "Candidaturas encerradas! Este evento atingiu o limite de participantes.",
    upsertFailed: "Sua candidatura teve um erro, tente novamente. Erro: upsert",
  },
  calendar: {
    icsDescription:
      "Você ainda não foi aprovade, hein! Mas já guarde na sua agenda esse delicioso evento Positiv para não esquecer!",
    googleDetails: "Mais um delicioso evento Positiv para você!",
  },
} as const
