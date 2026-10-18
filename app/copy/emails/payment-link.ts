// The baseline copy of the payment-link email, the single source the Studio
// seed, the production migration and the code fallback all read. Kept free of
// any ~-aliased import so the Studio package can import it across the boundary.
// The subject and heading are plain strings; the body is Portable Text (bold
// and italic only). {{variables}} are filled by the renderer at send time.
export const paymentLinkMailContent = {
  subject: "Seu pagamento da {{evento}}",
  heading: "Hora de garantir sua vaga",
  body: [
    {
      _type: "block",
      _key: "intro",
      style: "normal",
      markDefs: [],
      children: [
        {
          _type: "span",
          _key: "intro-0",
          text: "{{nome}}, sua vaga na ",
          marks: [],
        },
        {
          _type: "span",
          _key: "intro-1",
          text: "{{evento}}",
          marks: ["strong"],
        },
        { _type: "span", _key: "intro-2", text: " está reservada!", marks: [] },
      ],
    },
    {
      _type: "block",
      _key: "one-step",
      style: "normal",
      markDefs: [],
      children: [
        {
          _type: "span",
          _key: "one-step-0",
          text: "Para garanti-la, só falta um passo: o pagamento.",
          marks: [],
        },
      ],
    },
  ],
} as const

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
