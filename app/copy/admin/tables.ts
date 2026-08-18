export const adminTablesCopy = {
  base: {
    emptyMessage: "Nenhum registro encontrado",
    searchPlaceholder: "Buscar...",
    searchAriaLabel: "Buscar",
  },
  saveStatus: {
    idle: "Carregado",
    saving: "Salvando...",
    success: "Salvo",
    error: "Erro ao salvar",
  },
  toolbar: {
    clearFilters: "Limpar filtros",
    clearFiltersTitle: "Limpar todos os filtros",
    resetTable: "Resetar tabela",
    resetTableDescription:
      "Limpa todos os dados salvos da organização da tabela, como filtros, posições de colunas e paginação",
    minimize: "Minimizar",
    minimizeTitle: "Minimizar",
    fullscreen: "Tela cheia",
    fullscreenTitle: "Expandir para tela cheia",
  },
  filter: {
    searchPlaceholder: "Buscar...",
    searchAriaLabel: "Buscar opções de filtro",
    selectAll: "Selecionar Todos",
    clear: "Limpar",
    noResults: "Nenhum resultado",
    selectedCount: (selected: number, total: number) =>
      `${selected} de ${total} selecionados`,
  },
  autoSave: {
    saveFailed: "Erro ao salvar alteração",
  },
  textModal: {
    editAriaLabel: "Edit text",
    editTitle: "Edit Text",
    viewAriaLabel: "View full text",
    viewTitle: "View Text",
    cancel: "Cancel",
    save: "Save",
    discardChanges: "Você tem alterações não salvas. Deseja descartá-las?",
    saveFailed: "Erro ao salvar alteração",
    unknownError: "Erro desconhecido",
  },
  renderers: {
    viewParticipant: "Ver participante",
    viewProfile: "Ver perfil",
    whatsapp: "WhatsApp",
    booleanYes: "Sim",
  },
  columns: {
    veteran: {
      headerName: "Vet ou Nov?",
      headerTooltip: "Veterane ou Novate",
      veteran: "Veterane",
      rookie: "Novate",
    },
  },
  events: {
    title: "Todos os eventos",
    create: "Criar evento",
    searchPlaceholder: "Buscar...",
    searchAriaLabel: "Buscar eventos",
    emptyMessage: "Nenhum evento encontrado",
  },
  recentProfiles: {
    emptyMessage: "Nenhum perfil recente",
    columns: {
      socialName: "Nome Social",
      fullName: "Nome Completo",
      createdAt: "Registro",
      createdAtTooltip: "Data de cadastro",
      veteran: "Veterane",
    },
  },
  allParticipants: {
    searchAriaLabel: "Buscar perfis",
    emptyMessage: "Nenhum perfil encontrado",
    profileCount: (count: number) => `**${count}** perfis`,
    filteredProfileCount: (shown: number, total: number) =>
      `**${shown}** de ${total} perfis`,
    columns: {
      socialName: "Nome Social",
      fullName: "Nome Completo",
      createdAt: "Registro",
      createdAtTooltip: "Data de cadastro",
      flagTooltip: "Flag de atenção",
      whereLives: "Cidade",
      attendedEventsCount: "Total de eventos",
      attendedEventsCountTooltip:
        "Total de presenças desde o início do histórico",
      lastAttendedEventsCount: "Últimos eventos (6 últimos)",
      lastAttendedEventsCountTooltip:
        "Presenças nos últimos 6 eventos realizados. Zera quando a pessoa é rodiziada, e recomeça a partir daí",
      lastAttendedEventTitle: "Último Evento",
    },
  },
  eventParticipants: {
    title: "Candidaturas",
    searchAriaLabel: "Buscar participantes",
    emptyMessage: "Nenhum participante encontrado",
    separator: "|",
    header: {
      applications: (total: number) => `**${total}** candidates`,
      acceptedInProcess: (total: number) => `**${total}** aceites no processo`,
      rookies: (count: number) => `**${count}** N`,
      veterans: (count: number) => `**${count}** V`,
      generalLabel: "Geral",
      acceptedInProcessLabel: "Aceites no processo",
    },
    tooltips: {
      general:
        "Total de todas as candidaturas registradas para este evento, independente de status.",
      acceptedInProcessIntro:
        "Pessoas que atendem simultaneamente aos seguintes critérios:",
      applicationStatusSection: "Status de Processo (application_status)",
      attendanceStatusSection: "Status de Presença (attendance_status)",
      approvedToAttendSection: "Status de Aprovação (approved_to_attend)",
    },
    columns: {
      socialName: "Nome",
      attendedEventsCount: "Total de eventos",
      attendedEventsCountTooltip:
        "Total de presenças desde o início do histórico",
      lastAttendedEventsCount: "Últimos eventos (6 últimos)",
      lastAttendedEventsCountTooltip:
        "Presenças nos últimos 6 eventos realizados. Zera quando a pessoa é rodiziada, e recomeça a partir daí",
      lastAttendedEventTitle: "Último Evento",
      flagTooltip: "Flag de atenção",
      applicationStatusTooltip:
        "Etapa do processo de candidatura para este evento (conversas, envio de dados, finalização)",
      attendanceStatusTooltip:
        "Se a pessoa compareceu ou não ao evento (confirmado após o evento acontecer)",
      wasSelectedForRotation: "Escolhide p/ rodízio?",
      wasSelectedForRotationTooltip: "Escolhide para rodízio neste evento",
      approvedToAttendTooltip:
        "Status de aprovação geral do perfil para participar dos eventos (independente de evento específico)",
      hasPaid: "Pago?",
      hasPaidTooltip: "Pagamento realizado",
      wasAdminSkippedLastEvent: "Foi rodízio na última festa?",
    },
  },
  feedbacks: {
    emptyMessage: "Nenhum feedback encontrado",
    searchPlaceholder: "Buscar feedbacks...",
    searchAriaLabel: "Buscar feedbacks",
    participation: {
      never: "Nunca",
      once: "Uma vez",
      moreThanOnce: "Mais de uma vez",
    },
    columns: {
      createdAt: "Data",
      status: "Status",
      statusTooltip: "Clique duas vezes para mudar o status do feedback",
      participation: "Participação",
      feedback: "Feedback",
      socialName: "Nome Social",
      socialNameTooltip: "Nome social do perfil cadastrado (quando verificado)",
      fullName: "Nome",
      fullNameTooltip: "Nome completo do perfil cadastrado (quando verificado)",
      profile: "Perfil",
      profileTooltip: "Link para o perfil cadastrado",
      whatsapp: "WhatsApp",
      email: "E-mail",
      canContact: "Contato?",
      canContactTooltip: "Podemos entrar em contato?",
    },
  },
  recentFeedbacks: {
    emptyMessage: "Nenhum feedback recente",
    anonymous: "Anônimo",
    columns: {
      createdAt: "Data",
      name: "Nome",
      feedback: "Feedback",
      status: "Status",
    },
  },
} as const
