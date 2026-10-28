export const adminParticipantsCopy = {
  list: {
    title: "Perfis",
    loadFailed: "Erro ao carregar perfis. Tente novamente.",
  },
  veteransSync: {
    button: "Sincronizar lista de veteranos",
    syncing: "Sincronizando...",
    result: (added: number, removed: number, total: number) =>
      `Lista de veteranos sincronizada: ${added} adicionades, ${removed} removides, ${total} na lista`,
    forbidden: "Você não tem permissão para sincronizar a lista de veteranos",
    failed: "Erro ao sincronizar a lista de veteranos. Tente novamente.",
  },
  viewProfile: {
    profileNotFound: "Perfil não encontrado",
    profileMissing: "Perfil não encontrado ou não existe.",
  },
  detail: {
    nameAndAge: (name: string | null, age: number | string) => `${name ?? ""}, ${age}`,
    inEvent: (emoji: string | null, title: string | null) => {
      const event = [emoji, title].filter(Boolean).join(" ")
      return event ? `No evento **${event}**` : "No evento"
    },
  },
  basicData: {
    title: "Dados básicos",
    rotationWarning: "Essa pessoa **participou do rodízio** no último evento",
  },
  vsEvent: {
    title: "Neste evento",
    administration: "Administração",
    attendanceStatus: "Status de Presença",
    applicationStatus: "Status da candidatura",
    spotType: "Tipo de Vaga",
    payment: "Pagamento",
    noPayment: "—",
    paymentSeparator: " · ",
    selectPlaceholder: "Selecione...",
    paid: "Pago",
    rotation: "Selecionado para Rodízio",
    adminNotes: "Notas Gerais do Evento",
    adminNotesPlaceholder: "Notas administrativas para este evento...",
    answers: "Respostas",
    participantNotes: (label: string | undefined) => `${label ?? ""} (Participante)`,
    noAnswer: "não respondeu",
    cancelled: (date: string | undefined) =>
      `Candidatura cancelada em ${date ?? ""}`,
  },
  adminNotes: {
    title: "Em toda a Positiv",
    saved: "Dados salvos com sucesso",
    saveFailed: "Erro ao salvar",
    flagNotesRequired:
      "Notas da Flag são obrigatórias quando uma flag é selecionada",
    flagNotesEmpty:
      "Notas da Flag não podem estar vazias enquanto uma flag está selecionada",
    flag: "Flag",
    flagPlaceholder: "Selecione uma flag",
    flagNotes: "Notas da Flag",
    flagNotesPlaceholder: "Notas sobre a flag...",
    generalNotes: "Notas Gerais",
    generalNotesPlaceholder: "Notas gerais sobre o perfil...",
    veteran: "Veterano",
  },
  eventHistory: {
    title: "Histórico de candidaturas",
    payment: "Pagamento",
    surplus: "Diferença",
    empty: "Nenhuma candidatura anterior encontrada",
  },
  financialSummary: {
    title: "Resumo Financeiro",
    totalInvested: "Total pago",
    paidEvents: "Eventos pagos",
    averagePerEvent: "Média por evento",
    totalSurplus: "Diferença total",
    payments: "Pagamentos",
  },
} as const
