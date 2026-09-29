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
  settings: {
    title: "Configurações",
    cta: "Abrir configurações",
    hint: "Pagamentos online e diagnóstico de email",
  },
} as const

export const adminSettingsCopy = {
  title: "Configurações",
} as const

export const onlinePaymentsSettingCopy = {
  title: "Pagamentos online",
  description:
    "Ligados, a equipe pode abrir cobranças pelo Asaas e cada participante paga pelo link que recebe por email. Desligados, só entram pagamentos registrados à mão.",
  whatStays:
    "Desligar não cancela nada: quem já está na página do Asaas ainda consegue pagar, e pagamentos e reembolsos do Asaas continuam sendo registrados.",
  on: "Ligados",
  off: "Desligados",
  notConfigured:
    "O Asaas não está configurado neste ambiente. Os pagamentos online ficam desligados até as chaves serem cadastradas.",
  lastChange: (when: string, name: string) => `Alterado por ${name} em ${when}`,
  turnOn: "Ligar pagamentos online",
  turnOff: "Desligar pagamentos online",
  confirmOnTitle: "Ligar pagamentos online?",
  confirmOnDescription:
    "A equipe volta a poder abrir cobranças pelo Asaas, e os links de pagamento voltam a mostrar as opções.",
  confirmOn: "Ligar",
  confirmOffTitle: "Desligar pagamentos online?",
  confirmOffDescription:
    "Nenhuma cobrança nova pode ser aberta, e os links de pagamento passam a pedir que a pessoa fale com a organização. Cobranças já abertas no Asaas continuam pagáveis.",
  confirmOff: "Desligar",
} as const

export const cardPaymentsSettingCopy = {
  title: "Cartão de crédito",
  description:
    "Ligado, o link de pagamento oferece cartão em 1x a 6x pelo valor do evento e Pix com 10% de desconto. Desligado, só Pix, pelo valor cheio do evento. Só vale enquanto os pagamentos online estão ligados.",
  whatStays:
    "Mudar não altera cobranças já abertas: cada uma mantém o valor e a forma de pagamento com que foi criada.",
  on: "Ligado",
  off: "Desligado",
  turnOn: "Ligar cartão de crédito",
  turnOff: "Desligar cartão de crédito",
  confirmOnTitle: "Ligar cartão de crédito?",
  confirmOnDescription:
    "Os links de pagamento passam a oferecer cartão em até 6x pelo valor do evento, e o Pix passa a ter 10% de desconto.",
  confirmOn: "Ligar",
  confirmOffTitle: "Desligar cartão de crédito?",
  confirmOffDescription:
    "Os links de pagamento passam a oferecer só Pix, pelo valor cheio do evento.",
  confirmOff: "Desligar",
} as const

export const adminFeedbacksCopy = {
  title: "Feedbacks",
  loadFailed: "Erro ao carregar feedbacks. Tente novamente.",
  notFound: "Feedback não encontrado",
  invalidStatus: "Status inválido",
  statusLabels: {
    new: "Novo",
    in_progress: "Em progresso",
    resolved: "Resolvido",
  },
  telegramAlert: {
    title: "Novo feedback recebido",
    author: (author: string, contact: string) =>
      `De: ${author}${contact ? ` (${contact})` : ""}`,
    contactSeparator: " · ",
    participation: {
      never: "Nunca participou",
      once: "Participou uma vez",
      more_than_once: "Participou mais de uma vez",
    },
  },
} as const

export const listmonkDiagnosticCopy = {
  title: "Diagnóstico de Email",
  description:
    "Essa ferramenta testa a conexão com o serviço de newsletter (Listmonk) e envia uma campanha de teste para os desenvolvedores. Use quando quiser verificar se os emails de abertura de evento estão funcionando.",
  steps: {
    config: "Configuração do Listmonk",
    connection: "Conexão estabelecida",
    campaignCreated: "Campanha de teste criada",
    emailSent: "Email enviado para devs",
    campaignRemoved: "Campanha de teste removida",
  },
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
