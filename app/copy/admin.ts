export const participantBadgesCopy = {
  veteran: "Veterane",
  rookie: "Novate",
} as const

export const approvalStatusCopy = {
  label: "Status de Aprovação",
  saving: "Salvando...",
  updated: "Status de aprovação atualizado",
  updateFailed: "Erro ao atualizar status",
} as const

export const demographicFilterCopy = {
  all: "Toda a comunidade",
  attended: "Quem já compareceu",
} as const

export const googleContactsCopy = {
  cta: "Adicionar ao Google Contacts",
  nameCopied: "Nome copiado! Cole no campo de nome do Google Contacts",
  copyFailed: "Erro ao copiar nome para a área de transferência",
} as const

export const adminLayoutCopy = {
  accessDenied: "Você precisa ser administradore para visitar essa página",
} as const

export const adminDashboardCopy = {
  title: "Visão geral",
  activeEventsTitle: "Eventos com candidaturas abertas",
  recentProfiles: {
    title: "Participantes recentes",
    cta: "Ver todos os perfis",
    hint: "Veja a tabela completa para editar os dados",
  },
  recentFeedbacks: {
    title: "Feedbacks recentes",
    cta: "Ver todos os feedbacks",
  },
} as const

export const adminFeedbacksCopy = {
  title: "Feedbacks",
  loadFailed: "Erro ao carregar feedbacks. Tente novamente.",
} as const

export const listmonkDiagnosticCopy = {
  title: "Diagnóstico de Email",
  description:
    "Essa ferramenta testa a conexão com o serviço de newsletter (Listmonk) e envia uma campanha de teste para os desenvolvedores. Use quando quiser verificar se os emails de abertura de evento estão funcionando.",
  stepOk: (label: string) => `✓ ${label}`,
  stepFailed: (label: string) => `✗ ${label}`,
  failedBeforeCampaign: "Diagnóstico falhou antes de criar a campanha",
  confirmTitle: "Testar conexão?",
  confirmDescription:
    "Será enviado um email de teste para todos os desenvolvedores cadastrados na lista de devs do Listmonk.",
  confirmLabel: "Testar",
  testing: "Testando...",
  test: "Testar conexão com Listmonk",
  cleaning: "Limpando...",
  clean: "Limpar campanha de teste",
} as const
