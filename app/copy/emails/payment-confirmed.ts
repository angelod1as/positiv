// The baseline copy of the payment-confirmed email, the single source the
// Studio seed, the production migration and the code fallback all read. Kept
// free of any ~-aliased import so the Studio package can import it across the
// boundary. Plain strings and Portable Text (bold and italic only);
// {{variables}} are filled by the renderer at send time.
export const paymentConfirmedMailContent = {
  subject: "Pagamento confirmado - {{evento}}",
  heading: "Pagamento confirmado",
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
          text: "{{nome}}, recebemos seu pagamento da ",
          marks: [],
        },
        { _type: "span", _key: "intro-1", text: "{{evento}}", marks: ["strong"] },
        {
          _type: "span",
          _key: "intro-2",
          text: ". Sua vaga está garantida!",
          marks: [],
        },
      ],
    },
  ],
  cta: "Ver meus eventos",
  closing: [
    {
      _type: "block",
      _key: "next-steps",
      style: "normal",
      markDefs: [],
      children: [
        {
          _type: "span",
          _key: "next-steps-0",
          text: "A organização entra em contato com os próximos passos antes do evento.",
          marks: [],
        },
      ],
    },
  ],
} as const

export const paymentConfirmedMailCopy = {
  documentTitle: "Pagamento confirmado - Positiv",
  logoAlt: "Positiv",
  receiptHeading: "Resumo do pagamento",
  amount: (value: string) => `Valor: <strong>${value}</strong>`,
  method: (name: string) => `Forma de pagamento: <strong>${name}</strong>`,
  installments: (count: number, perInstallment: string) =>
    `Parcelado em <strong>${count}x de ${perInstallment}</strong>`,
  paidAt: (date: string) => `Data: <strong>${date}</strong>`,
  footer: {
    reason: "Você recebeu este e-mail pois se candidatou a um evento da",
    brand: "Positiv",
    settings: "Configurações",
  },
} as const
