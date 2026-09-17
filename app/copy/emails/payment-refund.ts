export const paymentRefundMailCopy = {
  documentTitle: "Reembolso confirmado - Positiv",
  logoAlt: "Positiv",
  heading: "Reembolso confirmado",
  subject: (eventName: string) => `Reembolso - ${eventName}`,
  intro: (displayName: string, eventName: string) =>
    `${displayName}, o reembolso do seu pagamento da <strong>${eventName}</strong> foi confirmado.`,
  receiptHeading: "Resumo do reembolso",
  amount: (value: string) => `Valor devolvido: <strong>${value}</strong>`,
  partial: (paid: string) =>
    `Este é um reembolso parcial: você tinha pago ${paid}.`,
  method: (name: string) => `Forma de pagamento: <strong>${name}</strong>`,
  windowPix: "O Pix cai na sua conta em instantes.",
  windowCard:
    "No cartão, o valor aparece na sua fatura em até 10 dias úteis, conforme o banco.",
  feesStay:
    "As taxas de pagamento não voltam: o valor devolvido é o que a Positiv recebeu, sem as taxas cobradas na hora do pagamento.",
  cta: "Ver meus eventos",
  footer: {
    reason: "Você recebeu este e-mail pois se candidatou a um evento da",
    brand: "Positiv",
    settings: "Configurações",
  },
} as const
