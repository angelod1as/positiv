import type { PaymentOption } from "~/business/payment/pricing"
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
  manage: {
    title: "Pagamentos",
    trigger: "Gerenciar pagamento",
    description: (name: string) => `Histórico de pagamentos de ${name}.`,
    empty: "Nenhum pagamento registrado.",
    close: "Fechar",
    totals: {
      gross: "Total pago",
      fee: "Taxas",
      net: "Líquido",
      refunded: "Reembolsado",
    },
    columns: {
      status: "Situação",
      kind: "Origem",
      method: "Forma",
      amount: "Valor",
      date: "Data",
      actions: "Ações",
    },
    kinds: { asaas: "Asaas", manual: "Manual" },
    methods: {
      pix: "Pix",
      credit_card: "Cartão de crédito",
      cash: "Dinheiro",
      transfer: "Transferência",
      other: "Outro",
    },
    noAmount: "—",
    noMethod: "—",
    noDate: "—",
  },
  manual: {
    title: "Registrar pagamento manual",
    amount: "Valor recebido",
    paidAt: "Data do pagamento",
    submit: "Registrar pagamento",
    success: "Pagamento registrado.",
  },
  refund: {
    title: "Marcar como reembolsado",
    description:
      "Registra que o dinheiro voltou para a pessoa. Não movimenta nada no Asaas.",
    amount: "Valor devolvido",
    amountHint: "Deixe em branco para devolver o valor inteiro.",
    submit: "Marcar reembolso",
    confirm: "Confirmar reembolso?",
    success: "Reembolso registrado.",
  },
  cancel: {
    title: "Cancelar cobrança",
    confirm: "Cancelar a cobrança em aberto?",
    description:
      "A cobrança deixa de valer e a pessoa pode receber uma nova. Nada é movimentado no Asaas.",
    keep: "Manter cobrança",
    submit: "Confirmar cancelamento",
    success: "Cobrança cancelada.",
  },
  errors: {
    participantNotFound: "Participante não encontrada.",
    freeSpot: "Vagas sociais e de produção não têm cobrança.",
    noAmount: "Defina um valor: este evento não tem preço cadastrado.",
    alreadyPaid:
      "Esta pessoa já pagou. Cancele ou reembolse antes de cobrar de novo.",
    notResendable: "Não há cobrança em aberto para reenviar.",
    amountRequired: "Informe um valor de zero ou mais.",
    activeChargeExists:
      "Existe uma cobrança em aberto. Cancele-a antes de registrar um pagamento manual.",
    refundAmountRequired: "Informe um valor de reembolso maior que zero.",
    refundTooLarge: "O reembolso não pode ser maior que o valor pago.",
    notRefundable: "Só é possível reembolsar um pagamento já confirmado.",
    notCancellable: "Só é possível cancelar uma cobrança em aberto.",
    generic: "Não foi possível concluir a operação.",
  },
} as const
