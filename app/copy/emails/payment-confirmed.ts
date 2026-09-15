export const paymentConfirmedMailCopy = {
  documentTitle: "Pagamento confirmado - Positiv",
  logoAlt: "Positiv",
  heading: "Pagamento confirmado",
  subject: (eventName: string) => `Pagamento confirmado - ${eventName}`,
  intro: (displayName: string, eventName: string) =>
    `${displayName}, recebemos seu pagamento da <strong>${eventName}</strong>. Sua vaga está garantida!`,
  receiptHeading: "Resumo do pagamento",
  amount: (value: string) => `Valor: <strong>${value}</strong>`,
  method: (name: string) => `Forma de pagamento: <strong>${name}</strong>`,
  installments: (count: number, perInstallment: string) =>
    `Parcelado em <strong>${count}x de ${perInstallment}</strong>`,
  paidAt: (date: string) => `Data: <strong>${date}</strong>`,
  cta: "Ver meus eventos",
  nextSteps:
    "A organização entra em contato com os próximos passos antes do evento.",
  footer: {
    reason: "Você recebeu este e-mail pois se candidatou a um evento da",
    brand: "Positiv",
    settings: "Configurações",
  },
} as const
