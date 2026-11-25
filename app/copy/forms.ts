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
  commentTooLong: "O comentário pode ter até 5000 caracteres",
  keyboard: {
    open: "Use o teclado para preencher",
    title: "Preencher pelo teclado",
    description:
      "Dá para responder a escala inteira sem tirar as mãos do teclado.",
    or: "ou",
    groups: [
      {
        title: "Escolhendo a resposta",
        shortcuts: [
          {
            keys: ["1", "2", "3", "4", "5"],
            action:
              "Escolhem a resposta, de Discordo totalmente (1) a Concordo totalmente (5)",
          },
          { keys: ["Enter", "Espaço", "→"], action: "Continua para a próxima" },
          { keys: ["←"], action: "Volta para a anterior" },
        ],
      },
      {
        title: "Escrevendo o comentário",
        shortcuts: [
          { keys: ["Enter"], action: "Pula linha" },
          {
            keys: ["Ctrl + Enter", "⌘ + Enter"],
            action: "Continua para a próxima",
          },
          {
            keys: ["Esc"],
            action: "Sai do comentário e volta para os atalhos de cima",
          },
        ],
      },
    ],
  },
} as const

export const yearCopy = {
  year: "Ano",
  required: "Informe o ano",
  tooEarly: (first: number) => `Escolha um ano a partir de ${first}`,
  future: "O ano não pode estar no futuro",
} as const
