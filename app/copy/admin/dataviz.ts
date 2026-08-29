export const adminDatavizCopy = {
  title: "Números",
  noData: "Nenhum dado disponível",
  people: "pessoas",
  kpiScores: {
    community: {
      title: "Comunidade",
      totalProfiles: "Total de perfis",
      veterans: "Veterans",
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
  eventRangeSelector: {
    label: "Selecionar intervalo de eventos",
  },
  ageChart: {
    ariaLabel: "Distribuição de idade",
    filledProfiles: (filled: number, total: number) =>
      `${filled} perfis com data de nascimento preenchida (de ${total} total)`,
  },
  genderChart: {
    ariaLabel: "Distribuição de gênero",
  },
  orientationChart: {
    ariaLabel: "Distribuição de orientação",
  },
  raceChart: {
    ariaLabel: "Distribuição de raça/cor",
    filledProfiles: (total: number) =>
      `Apenas ${total} perfis preencheram este campo`,
  },
  growthChart: {
    ariaLabel: "Gráfico de crescimento de perfis cadastrados",
    newProfiles: "Novos cadastros",
    cumulative: "Total acumulado",
    migration: "Migração do sistema anterior",
  },
  retentionChart: {
    ariaLabel: "Gráfico de frequência de comparecimento",
    noData: "Nenhum dado de retenção disponível",
    people: "Pessoas",
    attendance: (numPeople: number, eventsAttended: string) => {
      const peopleWent = numPeople === 1 ? "pessoa foi" : "pessoas foram"
      const events =
        eventsAttended === "7+" ? "a 7 ou mais" : `a ${eventsAttended}`
      const parties = eventsAttended === "1" ? "festa" : "festas"
      return `${numPeople} ${peopleWent} ${events} ${parties}`
    },
    total: (total: number) => `Total: ${total} pessoas únicas`,
  },
  attendanceChart: {
    ariaLabel: "Presença por evento",
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
    ariaLabel: "Faturamento por evento",
    revenue: "Faturamento líquido",
    grossRevenue: "Faturamento bruto",
    fees: "Taxas",
    ticketPrice: "Preço do ingresso",
    payers: "Pagantes",
    averageTicket: "Ticket médio",
  },
  funnelChart: {
    ariaLabel: "Funil de conversão por evento",
    applications: "Candidaturas",
    finalised: "Finalizados",
    paid: "Pagaram",
    attended: "Compareceram",
    shareOfApplications: (value: number, percentage: number) =>
      `${value} (${percentage}% das candidaturas)`,
  },
  occupancyChart: {
    ariaLabel: "Gráfico de taxa de ocupação por evento",
    noData: "Nenhum dado de ocupação disponível",
    occupancyRate: "Taxa de Ocupação",
    occupancy: "Ocupação",
    percentage: (value: number) => `${value}%`,
    attendedOfTotal: (attended: number, total: number) =>
      `${attended} / ${total}`,
    attended: "Compareceram",
    fullCapacity: "Capacidade Total (100%)",
    average: (average: number) => `Média: ${average}%`,
  },
  seasonalityChart: {
    ariaLabel:
      "Análise de sazonalidade - candidaturas e comparecimento ao longo do tempo",
    applications: "Candidaturas",
    attended: "Compareceram",
    summary: (events: number, years: number) => {
      const eventsWord = events === 1 ? "evento" : "eventos"
      const yearsWord = years === 1 ? "ano" : "anos"
      return `Baseado em ${events} ${eventsWord} ao longo de ${years} ${yearsWord}`
    },
  },
  veteranRookieChart: {
    ariaLabel: "Gráfico de proporção veteranos vs novatos ao longo do tempo",
    veterans: "Veteranos",
    rookies: "Novatos",
    total: "Total",
    veteranPercentage: "% Veteranos",
    percentage: (value: string) => `${value}%`,
  },
} as const
