// The baseline copy of the payment-refund email, the single source the Studio
// seed, the production migration and the code fallback all read. Kept free of
// any ~-aliased import so the Studio package can import it across the boundary.
// Plain strings and Portable Text (bold and italic only); {{variables}} are
// filled by the renderer at send time.
export const paymentRefundMailContent = {
  subject: "Reembolso - {{evento}}",
  heading: "Reembolso confirmado",
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
          text: "{{nome}}, o reembolso do seu pagamento da ",
          marks: [],
        },
        { _type: "span", _key: "intro-1", text: "{{evento}}", marks: ["strong"] },
        { _type: "span", _key: "intro-2", text: " foi confirmado.", marks: [] },
      ],
    },
  ],
  cta: "Ver meus eventos",
} as const

export const paymentRefundMailCopy = {
  documentTitle: "Reembolso confirmado - Positiv",
  logoAlt: "Positiv",
  receiptHeading: "Resumo do reembolso",
  amount: (value: string) => `Valor devolvido: <strong>${value}</strong>`,
  partial: (paid: string) =>
    `Este é um reembolso parcial: você tinha pago ${paid}.`,
  method: (name: string) => `Forma de pagamento: <strong>${name}</strong>`,
  windowPix: "O Pix cai na sua conta em instantes.",
  windowCard:
    "No cartão, o valor aparece na sua fatura em até 10 dias úteis, conforme o banco.",
  footer: {
    reason: "Você recebeu este e-mail pois se candidatou a um evento da",
    brand: "Positiv",
    settings: "Configurações",
  },
} as const
