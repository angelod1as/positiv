export const checkboxWithOtherCopy = {
  other: "Outros",
  placeholder: "Exemplo 1, Exemplo 2",
  description: "Separe múltiplos por vírgula",
} as const

export const schemaFormCopy = {
  submit: "Continuar",
} as const

export const autoSaveFormCopy = {
  saved: "Dados atualizados com sucesso",
  saveFailed: "Erro ao salvar",
  invalidNumber: "Valor numérico inválido",
} as const

export const formRuntimeCopy = {
  commitFailed: "Não foi possível salvar agora. Tente novamente.",
  selectPlaceholder: "Selecione",
  progressLabel: "Progresso do formulário",
  progressOf: (index: number, total: number) => `${index}/${total}`,
} as const
