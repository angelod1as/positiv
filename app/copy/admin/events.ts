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
  buttons: {
    download: "Baixar dados",
  },
  generalData: {
    title: "Dados gerais",
    field: (label: string | undefined, value: string | number) =>
      `${label ?? ""}: ${value}`,
    ticketPrice: (label: string | undefined, value: number) =>
      `${label ?? ""}: R$ ${value}`,
  },
  datesAndTimes: {
    title: "Datas e horários",
    start: "Início",
    end: "Fim",
    applications: "Candidaturas",
    payment: "Pagamento",
    group: "Grupo",
    event: "Evento",
  },
  form: {
    labels: {
      title: "Nome da festa",
      emoji: "Emoji",
      description: "Descrição",
      location: "Local",
      ticket_price: "Valor",
      total_spots: "Lotação",
      auto_publish: "Publicar automaticamente",
      time_event_start: "Início do evento",
      time_event_end: "Fim do evento",
      time_application_start: "Abertura das candidaturas",
      time_group_start: "Início",
      time_group_end: "Encerramento",
      time_payment_start: "Início",
      time_payment_end: "Encerramento",
    },
    descriptions: {
      description: "Use uma frase divertida!",
      auto_publish:
        "Quando marcado, o evento será publicado automaticamente na data de abertura das candidaturas",
    },
    placeholders: {
      title: "Rapa do Tacho",
      description: "Para quem sobreviveu ao carnaval oficial",
      location: "Motel Harmony",
      ticket_price: "200",
      total_spots: "60",
    },
    sections: {
      generalData: "Dados gerais",
      dates: "Datas",
      applications: "Candidaturas",
      group: "Grupo",
      payments: "Pagamentos",
    },
    descriptionHint: "Use uma frase breve",
    ticketPricePrefix: "R$",
    totalSpotsSuffix: "pessoas",
    startDateRequired: "Você deve preencher a data de início",
    calculateDates: "Calcular datas automaticamente",
    submit: "Salvar",
  },
  statusForm: {
    label: "Status do evento",
    scheduledTitle: "📅 Publicação Automática Agendada",
    scheduledFor: (date: string | undefined) =>
      `Este evento será publicado automaticamente em ${date ?? ""}`,
    awaitingTitle: "⏳ Aguardando Publicação Automática",
    awaiting:
      "Este evento está pronto para ser publicado automaticamente (será atualizado em até 5 minutos)",
    manualTitle: "✋ Publicação Manual",
    manual: `Este evento requer publicação manual. Altere o status para "Candidaturas abertas" quando desejar publicar.`,
  },
  demographics: {
    title: "Demographics",
    updating: "Atualizando...",
    update: "Atualizar Demografia",
    empty:
      "Não há dados demográficos. Clique em 'Atualizar Demografia' para calcular.",
    othersSeparator: " - ",
    suffixes: {
      participants: " participantes",
      percentage: "%",
      years: " anos",
    },
    general: {
      title: "Geral",
      total: "Total",
      veterans: "Veteranes",
      rookies: "Novates",
    },
    gender: {
      title: "Gênero",
      cis: "Cis",
      trans: "Trans",
      others: "Outros",
    },
    orientation: {
      title: "Orientação",
      straight: "Héteres",
      biPan: "Bi/Pan",
      homo: "Homo",
      aceDemi: "Ace/Demi",
      others: "Outros",
    },
    raceColor: {
      title: "Raça ou cor",
      yellow: "Amarela",
      white: "Branca",
      indigenous: "Indígena",
      brown: "Parda",
      black: "Preta",
      others: "Outros",
    },
    age: {
      title: "Idades",
      min: "Menor",
      average: "Média",
      max: "Maior",
    },
  },
  rejectedParticipants: {
    noName: "(sem nome)",
    summary: (count: number) =>
      count === 1
        ? "1 participante rejeitade se candidatou neste evento"
        : `${count} participantes rejeitades se inscreveram neste evento`,
  },
  listmonk: {
    createList: "Criar lista da newsletter",
    updateList: "Atualizar lista da newsletter",
    creating: "Criando...",
    updating: "Atualizando...",
    filtersDescription:
      "Selecione os filtros para sincronizar participantes com a newsletter.",
    approvalStatus: "Status de Aprovação",
    applicationStatus: "Status de Processo",
    attendanceStatus: "Status de Presença",
    approvalStatusOption: (name: string | undefined) =>
      `Status de Aprovação: ${name ?? ""}`,
    applicationStatusOption: (name: string | undefined) =>
      `Status de Processo: ${name ?? ""}`,
    attendanceStatusOption: (name: string | undefined) =>
      `Status de Presença: ${name ?? ""}`,
    syncing: "Sincronizando...",
    sync: "Sincronizar",
  },
} as const
