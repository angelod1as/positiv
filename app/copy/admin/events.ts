export const adminEventsCopy = {
  eventNotFound: "Evento não encontrado",
  toasts: {
    errorTitle: "**Erro:**",
    updateParticipantFailed: "Ops, algo deu errado",
    updateParticipantSuccess: "Dados atualizados com sucesso",
    remindersQueued: "E-mails colocados na fila de envio com sucesso",
    statusUpdated: "Status atualizado com sucesso",
    demographicsUpdated: "Demografia atualizada com sucesso",
    listmonkSyncFailed: "Erro ao atualizar lista da newsletter",
    listmonkSyncSuccess: "Lista da newsletter atualizada com sucesso",
    noIntent:
      "A função foi executada mas não há um intent configurado para mostrar uma mensagem compatível",
  },
  viewEvent: {
    loadParticipantsFailed: "Falha ao carregar participantes",
    date: (date: string | undefined) => `Data: ${date ?? ""}`,
  },
  downloadData: {
    fetchParticipantsFailed: "Erro ao buscar participantes do evento",
    downloadAll: "Baixar tabela (Todos os dados)",
    downloadNames: "Baixar tabela (Nomes e RG)",
  },
  viewParticipant: {
    participantNotFound: "Participante não encontrade",
    profileNotFound: "Participante não encontrade.",
    notAppliedToEvent: "Participante não candidate neste evento.",
    updateSuccess: "Atualizado com sucesso",
  },
} as const
