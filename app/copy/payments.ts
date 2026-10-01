import {
  PIX_DISCOUNT_PERCENT,
  type PaymentOption,
} from "~/business/payment/pricing"
import { formatInTimeZone } from "date-fns-tz"
import { formatCurrency } from "~/lib/helpers/format-currency"

export const paymentsCopy = {
  options: {
    label: (option: PaymentOption) => {
      if (option.method === "pix") {
        return `Pix — ${formatCurrency(option.total)}`
      }
      if (option.installmentCount === 1) {
        return `Cartão à vista — ${formatCurrency(option.total)}`
      }
      return `Cartão ${option.installmentCount}x de ${formatCurrency(option.perInstallment)} (total ${formatCurrency(option.total)})`
    },
    // The payment page's cards: the name here, the total beside it.
    title: (option: PaymentOption) => {
      if (option.method === "pix") return "Pix"
      if (option.installmentCount === 1) return "Cartão de crédito — à vista"
      return `Cartão de crédito — ${option.installmentCount}x de ${formatCurrency(option.perInstallment)}`
    },
    // Only a discounted Pix says anything more; a card's title already does.
    breakdown: (baseAmount: number, option: PaymentOption) =>
      option.method === "pix" && option.total < baseAmount
        ? `${PIX_DISCOUNT_PERCENT}% de desconto sobre ${formatCurrency(baseAmount)}`
        : null,
  },
  // Plain text, not Markdown: this one is pasted into WhatsApp, which renders
  // none of it. The four-digit year is deliberate — a deadline read on a phone
  // is the last place to save two characters.
  whatsappMessage: (input: {
    displayName: string
    eventTitle: string
    paymentUrl: string
    dueAt: string
    options: PaymentOption[]
  }) =>
    [
      `Oi, ${input.displayName}! Aqui está o link para o pagamento da ${input.eventTitle}:`,
      "",
      input.paymentUrl,
      "",
      "Formas de pagamento:",
      ...input.options.map(
        (option) => `• ${paymentsCopy.options.label(option)}`,
      ),
      "",
      `O link vale até ${formatInTimeZone(input.dueAt, "America/Sao_Paulo", "dd/MM/yyyy")}.`,
    ].join("\n"),
  page: {
    title: "Pagamento",
    heading: (eventTitle: string) => `Pagamento — ${eventTitle}`,
    notYours: "Este link de pagamento não é seu.",
    chooseOption: "Como você quer pagar?",
    priceIntro: (baseAmount: number) =>
      `O valor do evento é ${formatCurrency(baseAmount)}.`,
    pay: "Pagar",
    dueAt: (date: string) => `Este link vale até ${date}.`,
    paidTitle: "Pagamento confirmado",
    paidBody: (amount: string, date: string) =>
      `Recebemos ${amount} em ${date}. Nada mais a fazer.`,
    closedTitle: "Este link não está mais disponível",
    closedBody:
      "A cobrança foi cancelada ou expirou. Fale com a organização para receber um novo link.",
    cpfTitle: "Precisamos do seu CPF",
    cpfBody: (provider: string) =>
      `O pagamento é processado pelo ${provider}, que exige o CPF de quem paga.`,
    cpfLabel: "CPF",
    cpfSubmit: "Salvar e continuar",
    cpfSaved: "CPF salvo.",
    thanksTitle: "Recebemos sua escolha",
    thanksBody:
      "Assim que o pagamento for confirmado você recebe um email. Isso é imediato no Pix e pode levar alguns minutos no cartão.",
    thanksPaidTitle: "Pagamento confirmado",
    thanksPaidBody: "Está tudo certo. Até lá!",
    backToDashboard: "Voltar para o painel",
  },
  betaNotice: {
    body: (whatsappLink: string) =>
      `O sistema de pagamento é novo e ainda está em teste. Se acontecer qualquer problema, fale com a Positiv no [WhatsApp](<${whatsappLink}>)`,
    whatsappMessage: (eventTitle: string) =>
      `Oi! Tive um problema com o pagamento de ${eventTitle}.`,
  },
  chargeDescription: (eventTitle: string) => `Positiv — ${eventTitle}`,
  manage: {
    title: "Pagamentos",
    trigger: "Gerenciar pagamento",
    description: (name: string) => `Histórico de pagamentos de ${name}.`,
    empty: "Nenhum pagamento registrado.",
    close: "Fechar",
    totals: {
      gross: "Total pago",
      net: "Líquido",
      refunded: "Reembolsado",
    },
    columns: {
      status: "Situação",
      kind: "Origem",
      method: "Forma",
      amount: "Valor",
      sentAt: "Enviada em",
      date: "Data pagto",
      actions: "Ações",
    },
    // An online payment is labelled with the provider's name.
    kinds: { manual: "Manual" },
    // The lines under a payment's status: where its refund stands, as the
    // provider last reported it.
    refundLines: {
      refunded: (amount: string) => `Devolvido ${amount}`,
      pending: (provider: string, amount: string) =>
        `Em andamento no ${provider}: ${amount}`,
      cancelled: (provider: string, amount: string) =>
        `Cancelado pelo ${provider}: ${amount}`,
    },
    sync: {
      button: (provider: string) => `Atualizar do ${provider}`,
      syncedAt: (provider: string, date: string) =>
        `Atualizado do ${provider} em ${date}`,
    },
    methods: {
      pix: "Pix",
      credit_card: "Cartão de crédito",
      cash: "Dinheiro",
      transfer: "Transferência",
      other: "Outro",
    },
    noMethod: "—",
    noDate: "—",
  },
  charge: {
    title: "Cobrança",
    amount: "Valor a cobrar",
    amountHint: (provider: string) =>
      `O valor que a Positiv recebe. As taxas do ${provider} entram por cima, na conta de quem paga.`,
    send: "Enviar cobrança",
    resendAmount: "Reenviar com outro valor",
    resendEmail: "Reenviar email",
    copyMessage: "Copiar mensagem",
    copied: "Mensagem copiada.",
    shareTitle: "Link de pagamento",
    created:
      "Cobrança criada e enviada por email. Copie a mensagem e mande também pelo WhatsApp.",
    noChargeForSpot: "Vaga social ou staff não paga: não há cobrança.",
    emailFailed:
      "A cobrança foi criada, mas o email não saiu. Copie a mensagem e mande por outro caminho.",
    resendFailed:
      "O email não saiu. A cobrança segue em aberto — copie a mensagem e mande por outro caminho.",
    resendSucceeded: "Email reenviado.",
    replaceConfirm: "Substituir a cobrança em aberto?",
    replaceDescription: (provider: string) =>
      `Esta pessoa já escolheu como pagar. A cobrança atual será cancelada no ${provider} e ela receberá um novo link.`,
    replaceKeep: "Manter cobrança",
    replaceSubmit: "Substituir cobrança",
    afterRefundConfirm: "Tem certeza que deseja gerar outra cobrança?",
    afterRefundDescription:
      "Esta pessoa já pagou e recebeu um reembolso. Uma nova cobrança manda para ela outro link de pagamento.",
    afterRefundKeep: "Voltar",
    afterRefundSubmit: "Gerar cobrança",
  },
  manual: {
    title: "Registrar pagamento manual",
    amount: "Valor recebido",
    paidAt: "Data do pagamento",
    submit: "Registrar pagamento",
    success: "Pagamento registrado.",
  },
  edit: {
    title: "Editar",
    confirm: "Corrigir pagamento manual",
    description:
      "Substitui o que foi registrado. Os totais da pessoa passam a usar o novo valor.",
    amount: "Valor recebido",
    method: "Forma",
    paidAt: "Data do pagamento",
    note: "Observação",
    submit: "Salvar alterações",
  },
  refund: {
    title: "Marcar como reembolsado",
    description: (provider: string) =>
      `Registra que o dinheiro voltou para a pessoa. Não movimenta nada no ${provider}.`,
    amount: "Valor devolvido",
    amountHint: "Deixe em branco para devolver o valor inteiro.",
    submit: "Marcar reembolso",
    confirm: "Confirmar reembolso?",
    success: "Reembolso registrado.",
    provider: {
      title: (provider: string) => `Reembolsar no ${provider}`,
      inProgress: (provider: string) =>
        `Reembolso solicitado — aguardando o ${provider} confirmar.`,
      denied: (provider: string, reason: string | null) =>
        reason
          ? `O ${provider} negou o último pedido de reembolso. Motivo: ${reason.replace(/\.$/, "")}. Você pode pedir de novo.`
          : `O ${provider} negou o último pedido de reembolso. Você pode pedir de novo.`,
    },
  },
  cancel: {
    title: "Cancelar cobrança",
    confirm: "Cancelar a cobrança em aberto?",
    description: (provider: string) =>
      `A cobrança deixa de valer e a pessoa pode receber uma nova. Nada é movimentado no ${provider}.`,
    keep: "Manter cobrança",
    submit: "Confirmar cancelamento",
    success: "Cobrança cancelada.",
  },
  // What a payment provider's refusal becomes before a person reads it. The
  // technical detail -- status, path, code -- stays in the log.
  providerErrors: {
    checkoutCpf:
      "O sistema de pagamentos não aceitou o CPF da sua conta. Confira o CPF em Dados básicos ou fale com a organização.",
    checkoutRefused: (description: string) =>
      `O sistema de pagamentos recusou a cobrança: ${description}`,
    unavailable:
      "O sistema de pagamentos não respondeu. Tente de novo em alguns minutos.",
    syncRefused: (provider: string, description: string) =>
      `O ${provider} não deixou atualizar este pagamento: ${description}`,
  },
  errors: {
    participantNotFound: "Participante não encontrade.",
    freeSpot: "Vagas sociais e de produção não têm cobrança.",
    noAmount: "Defina um valor: este evento não tem preço cadastrado.",
    amountTooLow: "O valor da cobrança precisa ser maior que zero.",
    amountUnreadable:
      "Não consegui ler esse valor. Escreva só números, como 150,00.",
    alreadyPaid:
      "Esta pessoa já pagou. Cancele ou reembolse antes de cobrar de novo.",
    confirmChargeAfterRefund:
      "Esta pessoa já recebeu um reembolso. Confirme que deseja gerar outra cobrança.",
    notResendable: "Não há cobrança em aberto para reenviar.",
    amountRequired: "Informe um valor de zero ou mais.",
    activeChargeExists:
      "Existe uma cobrança em aberto. Cancele-a antes de registrar um pagamento manual.",
    refundAmountRequired: "Informe um valor de reembolso maior que zero.",
    refundTooLarge: "O reembolso não pode ser maior que o valor pago.",
    notRefundable: "Só é possível reembolsar um pagamento já confirmado.",
    notEditable: "Só é possível editar um pagamento manual confirmado.",
    notCancellable: "Só é possível cancelar uma cobrança em aberto.",
    notSyncable: (provider: string) =>
      `Só um pagamento feito pelo ${provider} pode ser atualizado do ${provider}.`,
    invalidCpf: "Esse CPF não confere. Confira os números.",
    cpfTaken:
      "Esse CPF já está cadastrado em outra conta. Se ele é seu, fale com a organização.",
    customerTaken:
      "Não conseguimos gerar a cobrança: o CPF desta conta já está ligado a outra pessoa no sistema de pagamentos. Fale com a organização.",
    chargeClosed: "Esta cobrança não está mais aberta.",
    unknownOption: "Escolha uma das formas de pagamento oferecidas.",
    noInvoiceUrl: (provider: string) =>
      `O ${provider} não devolveu a página de pagamento. Tente de novo.`,
    generic: "Não foi possível concluir a operação.",
  },
} as const
