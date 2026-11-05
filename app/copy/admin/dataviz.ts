export const adminDatavizCopy = {
  title: "Números",
  noData: "Nenhum dado disponível",
  kpiScores: {
    withNote: (label: string, note: string) => `${label} · ${note}`,
    community: {
      title: "Comunidade",
      totalProfiles: "Total de perfis",
      veterans: "Veteranos",
      approved: "Aprovados",
    },
    engagement: {
      title: "Engajamento",
      uniqueAttendees: "Participantes únicos",
      averageAttendance: "Média de presença",
      averageAttendanceDescription: "Por evento",
      attendedThreePlus: "Compareceram 3+ vezes",
      attendedFivePlus: "Compareceram 5+ vezes",
    },
    revenue: {
      title: "Receita",
      total: "Receita total",
      averagePerEvent: "Média por evento",
    },
    health: {
      title: "Saúde",
      noShowRate: "Taxa média de no-show",
      flagged: "Perfis sinalizados",
      flaggedDescription: "Amarelo + Vermelho",
    },
  },
  eventsSection: {
    title: "Eventos",
    attendance: {
      title: "Presença por Evento",
      description:
        "Evolução do número de candidaturas, comparecimentos e faltas ao longo dos eventos.",
    },
    revenue: {
      title: "Faturamento por Evento",
      description:
        "Receita total e preço do ingresso por evento, com evolução ao longo do tempo.",
    },
    funnel: {
      title: "Funil de Conversão",
      description:
        "Proporção das candidaturas que finalizaram cadastro, pagaram e compareceram.",
    },
    occupancy: {
      title: "Ocupação",
      description: "Percentual de ocupação das vagas em cada evento.",
    },
    veteranRookie: {
      title: "Veteranos e Novatos",
      description: "Quantas pessoas veteranas e novatas compareceram a cada evento.",
    },
    seasonality: {
      title: "Sazonalidade",
      description:
        "Média de candidaturas e comparecimentos por evento em cada mês do ano, somando todos os eventos.",
    },
  },
  communitySection: {
    title: "Comunidade",
    gender: {
      title: "Identidade de Gênero",
      description: "Distribuição de identidades de gênero na comunidade.",
    },
    orientation: {
      title: "Orientação Sexual",
      description: "Distribuição de orientações sexuais na comunidade.",
    },
    age: {
      title: "Faixa Etária",
      description: "Distribuição de idades na comunidade.",
    },
    race: {
      title: "Raça/Cor",
      description: "Distribuição de raça e cor na comunidade.",
    },
    growth: {
      title: "Crescimento",
      description: "Novos cadastros por mês e total acumulado de perfis.",
    },
    retention: {
      title: "Retenção",
      description: "Quantas pessoas participaram de N ou mais eventos.",
    },
  },
  charts: {
    share: "Percentual",
    people: (total: number) => `${total} pessoas`,
    answer: (category: string, count: number) => `${category} · ${count}`,
    newProfilesSummary: "Novos cadastros por mês.",
    migrationNote:
      "Em destaque, julho de 2025: Migração do sistema anterior.",
    cumulativeSummary: "Total acumulado de perfis cadastrados, mês a mês.",
    revenueSummary:
      "Faturamento líquido, com reembolsos descontados, e bruto de cada evento.",
    ticketSummary:
      "Preço do ingresso e quanto cada pagante pagou em média, por evento.",
  },
  eventRangeSelector: {
    label: "Selecionar intervalo de eventos",
  },
  ageChart: {
    filledProfiles: (filled: number, total: number) =>
      `${filled} perfis com data de nascimento preenchida (de ${total} total)`,
  },
  raceChart: {
    filledProfiles: (total: number) =>
      `Apenas ${total} perfis preencheram este campo`,
  },
  growthChart: {
    newProfiles: "Novos cadastros",
    cumulative: "Total acumulado",
  },
  retentionChart: {
    people: "Pessoas",
    total: (total: number) => `Total: ${total} pessoas únicas`,
  },
  attendanceChart: {
    series: {
      applications: "Candidaturas",
      attended: "Compareceram",
      didNotAttend: "Não foram",
      withdrew: "Desistiu",
      notSelected: "Não selecionade",
      rotation: "Rodízio",
      socialSpots: "Vagas sociais",
      staff: "Staff",
    },
  },
  revenueChart: {
    revenue: "Faturamento líquido",
    grossRevenue: "Faturamento bruto",
    ticketPrice: "Preço do ingresso",
    averageTicket: "Ticket médio",
  },
  funnelChart: {
    applications: "Candidaturas",
    finalised: "Finalizados",
    paid: "Pagaram",
    attended: "Compareceram",
  },
  occupancyChart: {
    occupancy: "Ocupação",
    average: (average: number) => `Média: ${average}%`,
  },
  seasonalityChart: {
    applications: "Candidaturas",
    attended: "Compareceram",
  },
  veteranRookieChart: {
    veterans: "Veteranos",
    rookies: "Novatos",
  },
} as const
