export const paymentLinkMailCopy = {
  documentTitle: "Pagamento - Positiv",
  logoAlt: "Positiv",
  heading: "Hora de garantir sua vaga",
  subject: (eventName: string) => `Seu pagamento da ${eventName}`,
  intro: (displayName: string, eventName: string) =>
    `${displayName}, sua vaga na <strong>${eventName}</strong> está reservada! Escolha como prefere pagar e conclua abaixo.`,
  optionsHeading: "Formas de pagamento",
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
