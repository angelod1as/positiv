export const adminAddParticipantsCopy = {
  trigger: "Adicionar participante",
  notAccepting:
    "Não é possível adicionar participantes a um evento em rascunho ou cancelado.",
  modal: {
    title: "Adicionar participante",
    description:
      "Coloque pessoas direto no evento, sem inscrição. Ninguém recebe e-mail: avise cada pessoa diretamente.",
    searchLabel: "Buscar pessoa",
    searchPlaceholder: "Nome, nome social, e-mail ou telefone",
    searchHelp:
      "Só aparecem perfis com dados básicos preenchidos e que não foram reprovados.",
    noResults: "Ninguém encontrado com esse termo.",
    select: "Selecionar",
    selected: "Selecionado",
    alreadyParticipant: "Já inscrito",
    selectedTitle: "Selecionadas",
    noneSelected: "Ninguém selecionado ainda.",
    spotTypeLabel: (name: string) => `Tipo de vaga de ${name}`,
    remove: (name: string) => `Remover ${name}`,
    removeShort: "Remover",
    submit: (count: number) =>
      count === 1 ? "Adicionar 1 pessoa" : `Adicionar ${count} pessoas`,
    resultsTitle: "Resultado",
    outcome: {
      added: "Adicionade",
      reactivated: "Inscrição cancelada reativada",
      "already-registered": "Já inscrito, nada mudou",
      ineligible: "Não adicionade: dados básicos incompletos ou reprovade",
    },
    outcomeLine: (name: string, outcome: string) => `${name}: ${outcome}`,
    failed: "Não foi possível adicionar. Tente de novo.",
  },
} as const
