export const paymentsCopy = {
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
    statuses: {
      pending: "Aguardando envio",
      awaiting_payment: "Aguardando pagamento",
      paid: "Pago",
      expired: "Expirado",
      cancelled: "Cancelado",
      refunded: "Reembolsado",
      partially_refunded: "Reembolsado em parte",
    },
    noMethod: "—",
    noDate: "—",
  },
  manual: {
    title: "Registrar pagamento manual",
    description:
      "Para dinheiro que não passou pelo Asaas: transferência, dinheiro ou cortesia combinada por fora.",
    amount: "Valor recebido",
    amountHint:
      "Zero registra uma cortesia: a participação fica quitada sem dinheiro nenhum.",
    method: "Forma",
    methodPlaceholder: "Escolha a forma",
    paidAt: "Data do pagamento",
    note: "Observação",
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
    submit: "Cancelar cobrança",
    success: "Cobrança cancelada.",
  },
  errors: {
    amountRequired: "Informe um valor de zero ou mais.",
    activeChargeExists:
      "Existe uma cobrança em aberto. Cancele-a antes de registrar um pagamento manual.",
    refundTooLarge: "O reembolso não pode ser maior que o valor pago.",
    notRefundable: "Só é possível reembolsar um pagamento já confirmado.",
    notCancellable: "Só é possível cancelar uma cobrança em aberto.",
    generic: "Não foi possível concluir a operação.",
  },
} as const
