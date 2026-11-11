import type { PaymentLinkMailOption } from "./payment-link-mail.template"

export const paymentLinkOptions = ({
  pix,
  card,
}: {
  pix: number
  card?: number
}): PaymentLinkMailOption[] => [
  { method: "pix", installmentCount: null, total: pix },
  ...(card === undefined
    ? []
    : [1, 2, 3, 4, 5, 6].map((installmentCount) => ({
        method: "credit_card" as const,
        installmentCount,
        total: card,
      }))),
]
