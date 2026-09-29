export const MAX_INSTALLMENTS = 6

export const PIX_DISCOUNT_PERCENT = 10

export function pixPrice(base: number): number {
  return Math.floor((base * (100 - PIX_DISCOUNT_PERCENT)) / 100)
}

/**
 * Asaas takes a plan's total and an installment count, truncates each
 * installment to the cent and charges the difference on the last one. This
 * mirrors it, so the page shows what the card will actually be charged.
 */
export function splitInstallments(total: number, n: number): number[] {
  const each = Math.floor(total / n)
  return [...Array(n - 1).fill(each), total - each * (n - 1)]
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
  lastInstallment: number
  total: number
}

/**
 * Card on: Pix at 10% off, card in 1x to 6x at the event price, no interest.
 * Card off: Pix alone at the event price. Positiv absorbs every fee, so what
 * the event costs is what the organisers priced it at.
 */
export function buildPaymentOptions(
  base: number,
  { cardEnabled }: { cardEnabled: boolean },
): PaymentOption[] {
  const pixTotal = cardEnabled ? pixPrice(base) : base
  const options: PaymentOption[] = [
    {
      id: "pix",
      method: "pix",
      installmentCount: null,
      perInstallment: pixTotal,
      lastInstallment: pixTotal,
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
      lastInstallment: installments[n - 1],
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
