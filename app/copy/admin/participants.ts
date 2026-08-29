export const adminParticipantsCopy = {
  list: {
    title: "Perfis",
    loadFailed: "Erro ao carregar perfis. Tente novamente.",
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
    selectPlaceholder: "Selecione...",
    paid: "Pago",
    rotation: "Selecionado para Rodízio",
    adminNotes: "Notas Gerais do Evento",
    adminNotesPlaceholder: "Notas administrativas para este evento...",
    answers: "Respostas",
    participantNotes: (label: string | undefined) => `${label ?? ""} (Participante)`,
    noAnswer: "não respondeu",
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
    surplus: "Diferença",
    empty: "Nenhuma candidatura anterior encontrada",
  },
  financialSummary: {
    title: "Resumo Financeiro",
    totalInvested: "Total pago",
    totalFees: "Taxas",
    totalNet: "Líquido",
    paidEvents: "Eventos pagos",
    averagePerEvent: "Média por evento",
    totalSurplus: "Diferença total",
    payments: "Pagamentos",
  },
} as const
