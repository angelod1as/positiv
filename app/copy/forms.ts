export const chipSelectCopy = {
  otherPlaceholder: "Outro? Escreva aqui",
  otherAdd: "Adicionar",
  remove: (value: string) => `Remover ${value}`,
  added: (value: string) => `${value} adicionado`,
  removed: (value: string) => `${value} removido`,
} as const

export const autoSaveFormCopy = {
  saved: "Dados atualizados com sucesso",
  saveFailed: "Erro ao salvar",
  invalidNumber: "Valor numérico inválido",
} as const

export const formRuntimeCopy = {
  back: "Voltar",
  commitFailed: "Não foi possível salvar agora. Tente novamente.",
  fieldsRejected:
    "Há campos que precisam da sua atenção. Confira as mensagens do formulário.",
  selectPlaceholder: "Selecione",
  progressLabel: "Progresso do formulário",
  progressOf: (index: number, total: number) => `${index}/${total}`,
} as const

export const likertCopy = {
  choices: {
    strongly_disagree: "Discordo totalmente",
    disagree: "Discordo",
    depends: "Depende",
    agree: "Concordo",
    strongly_agree: "Concordo totalmente",
  },
  commentLabel: "Comentário (opcional)",
  choiceRequired: "Escolha uma opção",
} as const

export const monthYearCopy = {
  month: "Mês",
  year: "Ano",
  months: [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ],
  incomplete: "Informe o mês e o ano",
  future: "A data não pode estar no futuro",
} as const
