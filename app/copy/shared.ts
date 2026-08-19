export const sharedCopy = {
  actions: {
    save: "Salvar",
    cancel: "Cancelar",
    confirm: "Confirmar",
    back: "Voltar",
    edit: "Editar",
    backHome: "Voltar para a home",
  },
  status: {
    loading: "Carregando...",
  },
  values: {
    yes: "Sim",
    no: "Não",
    anonymous: "Anônimo",
  },
  dateTime: {
    full: (date: string, time: string) => `${date}, às ${time}`,
  },
  validation: {
    captcha: "Por favor, complete a verificação de segurança",
  },
  confirmDialog: {
    title: "Tem certeza?",
    description: "Essa ação não pode ser desfeita.",
    loading: "⏳ Carregando...",
  },
} as const
