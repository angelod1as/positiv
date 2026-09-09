// The fee snapshot the pricing engine works from. It is declared here, not
// beside the Asaas client, because pricing owns the shape it consumes: rates
// are fractions and money is integer cents, whatever the API happens to send.
export type AsaasFees = {
  pix: { fixed: number; percent: number }
  card: {
    fixed: number
    percentOneInstallment: number
    percentUpToSix: number
  }
  // Asaas charges two monthly anticipation rates: the detached one on a
  // single-installment card charge, the higher one on a plan of two or more.
  anticipation: {
    detachedMonthlyRate: number
    installmentMonthlyRate: number
  }
}

export const MAX_INSTALLMENTS = 6

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

function assertInstallments(n: number) {
  if (!Number.isInteger(n) || n < 1 || n > MAX_INSTALLMENTS) {
    throw new Error(
      `installment count must be between 1 and ${MAX_INSTALLMENTS}, got ${n}`,
    )
  }
}

export function grossForPix(base: number, fees: AsaasFees): number {
  const denominator = 1 - fees.pix.percent
  if (denominator <= 0) throw new Error("PIX fee leaves nothing to receive")
  return Math.ceil((base + fees.pix.fixed) / denominator)
}

/**
 * Asaas takes a percentage, a fixed fee, and anticipation at a monthly rate for
 * the months until each installment settles — installment k settles at about k
 * months, so the term is r·(n+1)/2. The rate depends on n: a single charge is
 * anticipated at the detached rate, a plan of two or more at the higher
 * instalment rate.
 *
 * This assumes Asaas charges anticipation on the GROSS. Nothing in
 * `GET /v3/myAccount/fees/` says whether it does; if it charges on the net,
 * every price here is off in the same direction. POS-532 settles it by
 * comparing `asaas_net` on a real confirmed sandbox charge against the base,
 * and adjusts this formula if the two disagree.
 */
export function grossForCard(base: number, n: number, fees: AsaasFees): number {
  assertInstallments(n)
  const percent =
    n === 1 ? fees.card.percentOneInstallment : fees.card.percentUpToSix
  const monthlyRate =
    n === 1
      ? fees.anticipation.detachedMonthlyRate
      : fees.anticipation.installmentMonthlyRate
  const denominator = 1 - percent - monthlyRate * ((n + 1) / 2)
  if (denominator <= 0) throw new Error("card fees leave nothing to receive")
  return Math.ceil((base + fees.card.fixed) / denominator)
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

export function buildPaymentOptions(
  base: number,
  fees: AsaasFees,
): PaymentOption[] {
  const pixTotal = grossForPix(base, fees)
  const options: PaymentOption[] = [
    {
      id: "pix",
      method: "pix",
      installmentCount: null,
      perInstallment: pixTotal,
      total: pixTotal,
    },
  ]

  for (let n = 1; n <= MAX_INSTALLMENTS; n++) {
    const gross = grossForCard(base, n, fees)
    // Rounded up per installment, so the total can exceed the gross by a few
    // cents. That direction is deliberate: Positiv is never short.
    const perInstallment = Math.ceil(gross / n)
    options.push({
      id: `card_${n}` as PaymentOptionId,
      method: "credit_card",
      installmentCount: n,
      perInstallment,
      total: perInstallment * n,
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
