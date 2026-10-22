import type { PaymentProvider } from "./payment-provider"

export const MAX_INSTALLMENTS = 6

export const PIX_DISCOUNT_PERCENT = 10

export function pixPrice(base: number): number {
  return Math.floor((base * (100 - PIX_DISCOUNT_PERCENT)) / 100)
}

export type PaymentOptionId =
  | "pix"
  | "card_1"
  | "card_2"
  | "card_3"
  | "card_4"
  | "card_5"
  | "card_6"

export const PAYMENT_OPTION_IDS: readonly PaymentOptionId[] = [
  "pix",
  "card_1",
  "card_2",
  "card_3",
  "card_4",
  "card_5",
  "card_6",
]

export function parsePaymentOptionId(value: unknown): PaymentOptionId | null {
  if (typeof value !== "string") return null
  return (PAYMENT_OPTION_IDS as readonly string[]).includes(value)
    ? (value as PaymentOptionId)
    : null
}

// Matches the payment_method enum: POS-528 writes this straight into the row.
export type PaymentMethod = "pix" | "credit_card"

export type PaymentOption = {
  id: PaymentOptionId
  method: PaymentMethod
  installmentCount: number | null
  perInstallment: number
  total: number
}

/**
 * Card on: Pix at 10% off, card in 1x to 6x at the event price, no interest.
 * Card off: Pix alone at the event price. Positiv absorbs every fee, so what
 * the event costs is what the organisers priced it at. Each installment is
 * split the way the provider will charge it.
 */
export function buildPaymentOptions(
  base: number,
  {
    cardEnabled,
    splitInstallments,
  }: {
    cardEnabled: boolean
    splitInstallments: PaymentProvider["splitInstallments"]
  },
): PaymentOption[] {
  const pixTotal = cardEnabled ? pixPrice(base) : base
  const options: PaymentOption[] = [
    {
      id: "pix",
      method: "pix",
      installmentCount: null,
      perInstallment: pixTotal,
      total: pixTotal,
    },
  ]

  if (!cardEnabled) return options

  for (let n = 1; n <= MAX_INSTALLMENTS; n++) {
    const installments = splitInstallments(base, n)
    options.push({
      id: `card_${n}` as PaymentOptionId,
      method: "credit_card",
      installmentCount: n,
      perInstallment: installments[0],
      total: base,
    })
  }

  return options
}

export function findPaymentOption(
  options: PaymentOption[],
  id: unknown,
): PaymentOption | null {
  const parsed = parsePaymentOptionId(id)
  if (!parsed) return null
  return options.find((option) => option.id === parsed) ?? null
}
