export const paymentLinkMailCopy = {
  documentTitle: "Pagamento - Positiv",
  logoAlt: "Positiv",
  heading: "Hora de garantir sua vaga",
  subject: (eventName: string) => `Seu pagamento da ${eventName}`,
  intro: (displayName: string, eventName: string) =>
    `${displayName}, sua vaga na <strong>${eventName}</strong> está reservada!`,
  oneStepLeft: "Para garanti-la, só falta um passo: o pagamento.",
  pix: (value: string, discountPercent: number | null) =>
    discountPercent
      ? `No Pix (${discountPercent}% de desconto): <strong>${value}</strong>`
      : `No Pix: <strong>${value}</strong>`,
  card: (installments: string, value: string) =>
    `No cartão de crédito (${installments}): ${value}`,
  installmentRange: (max: number) => `1x a ${max}x sem juros`,
  installmentsChosen: (count: number) =>
    count === 1 ? "à vista" : `${count}x sem juros`,
  cta: "Pagar agora",
  dueAt: (date: string) => `O link vale até ${date}.`,
  afterDue:
    "Depois dessa data o link expira e você precisa pedir um novo para a organização.",
  footer: {
    reason: "Você recebeu este e-mail pois se candidatou a um evento da",
    brand: "Positiv",
    settings: "Configurações",
  },
} as const
