export const adminDatavizCopy = {
  title: "Números",
  noData: "Nenhum dado disponível",
  internal: (title: string) => `${title} · Interno`,
  chapters: {
    overview: {
      title: "Visão geral",
      parties: "Festas",
      people: "Pessoas foram às festas",
      applications: "Inscrições",
      registerTitle: "Cadastro",
      profiles: "Perfis cadastrados",
      approved: "Perfis aprovados para participar",
      flagged: "Perfis sinalizados · Amarelo + Vermelho",
    },
    parties: {
      title: "Festas",
      acceptance: "Das pessoas que se inscreveram entraram",
      perParty: "Pessoas por festa",
      fullest: "Na festa mais cheia",
      operationTitle: "Operação",
      noShow: "Não foram depois de confirmar",
      occupancy: "Ocupação média das vagas",
      notSelected: "Inscrições não selecionadas",
    },
    people: {
      title: "Pessoas",
      returned: "Das novates voltaram a outra festa",
      repeat: "Foram a duas festas ou mais",
      age: "Idade · menor, média e maior",
      frequencyTitle: "Frequência",
      newcomers: "Novates no intervalo",
      threePlus: "Foram a três festas ou mais",
      fivePlus: "Foram a cinco festas ou mais",
    },
    money: {
      title: "Dinheiro",
      socialTitle: "Vagas sociais",
      social: "Vagas sociais usadas",
      socialPerParty: "Vagas sociais por festa",
      socialShare: "Das presenças foram vagas sociais",
      revenueTitle: "Receita",
      net: "Receita líquida",
      gross: "Receita bruta",
      perParty: "Receita líquida por festa",
      refunds: "Reembolsos",
      averageTicket: "Ticket médio",
      cardShare: "Dos pagamentos foram no cartão",
    },
  },
  kpiScores: {
    withNote: (label: string, note: string) => `${label} · ${note}`,
    community: {
      veterans: "Veteranes",
      rookies: "Novates",
      profiles: "Perfis",
    },
  },
  eventsSection: {
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
        "Quantas candidaturas chegaram a cada etapa, somando os eventos do intervalo, com o percentual sobre as candidaturas.",
    },
    conversion: {
      title: "Conversão por Evento",
      description:
        "Percentual das candidaturas de cada evento que finalizaram cadastro, pagaram e compareceram.",
    },
    occupancy: {
      title: "Ocupação",
      description: "Percentual de ocupação das vagas em cada evento.",
    },
    veteranRookie: {
      title: "Veteranes e Novates",
      description: "Quantas pessoas veteranas e novatas compareceram a cada evento.",
    },
    seasonality: {
      title: "Sazonalidade",
      description:
        "Média de candidaturas e comparecimentos por evento em cada mês do ano, somando todos os eventos.",
    },
  },
  communitySection: {
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
    otherAnswers: "Outras respostas",
    newProfilesSummary: "Novos cadastros por mês.",
    migrationNote:
      "Em destaque, julho de 2025: Migração do sistema anterior.",
    revenueSummary:
      "Faturamento líquido de cada festa, com reembolsos descontados, separado entre pagamentos manuais e pelo Asaas, ao lado do bruto.",
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
  },
  retentionChart: {
    people: "Pessoas",
    sevenPlus: "7+",
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
    manual: "Líquido manual",
    asaas: "Líquido pelo Asaas",
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
  timingChart: {
    title: "Antecedência",
    description:
      "Quantos dias antes de cada festa as pessoas se inscreveram e pagaram, pela mediana.",
    applied: "Inscrição",
    paid: "Pagamento",
  },
  newcomersChart: {
    title: "Novates e veteranes no intervalo",
    description:
      "Quantas das pessoas que foram às festas do intervalo estavam na primeira festa delas.",
  },
  veteranRookieChart: {
    veterans: "Veteranes",
    rookies: "Novates",
  },
} as const
