import type { AsaasFees, PaymentMethod } from "../../app/business/payment/pricing"

// Fifty cents either way: enough for rounding across a plan's charges, far
// below a rate applied to the wrong base.
const TOLERANCE_CENTS = 50

export type ExpectedNet = { beforeAnticipation: number; anticipation: number }

/**
 * What the pricing engine expects Asaas to keep, split the way Asaas reports
 * it: the card or PIX fee comes off the charge's netValue, while anticipation
 * is booked as its own object under /v3/anticipations.
 */
export function expectedNet(
  charge: { method: PaymentMethod; installmentCount: number | null; total: number },
  fees: AsaasFees,
): ExpectedNet {
  if (charge.method === "pix") {
    const fee = fees.pix.fixed + fees.pix.percent * charge.total
    return { beforeAnticipation: Math.round(charge.total - fee), anticipation: 0 }
  }

  const n = charge.installmentCount ?? 1
  const percent = n === 1 ? fees.card.percentOneInstallment : fees.card.percentUpToSix
  const monthlyRate =
    n === 1 ? fees.anticipation.detachedMonthlyRate : fees.anticipation.installmentMonthlyRate

  return {
    beforeAnticipation: Math.round(charge.total - (percent * charge.total + fees.card.fixed)),
    anticipation: Math.round(monthlyRate * ((n + 1) / 2) * charge.total),
  }
}

export function calibrate(input: {
  expected: ExpectedNet
  reportedNet: number
  reportedAnticipation: number | null
}): { feeDifference: number; anticipationDifference: number | null; ok: boolean } {
  const feeDifference = input.reportedNet - input.expected.beforeAnticipation
  const anticipationDifference =
    input.reportedAnticipation === null
      ? null
      : input.reportedAnticipation - input.expected.anticipation

  const ok =
    Math.abs(feeDifference) <= TOLERANCE_CENTS &&
    (anticipationDifference === null || Math.abs(anticipationDifference) <= TOLERANCE_CENTS)

  return { feeDifference, anticipationDifference, ok }
}
