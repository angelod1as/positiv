import { paymentsCopy } from "~/copy/payments"

export type RefundablePart = { id: string; value: number }

export type RefundShare = { id: string; amount: number }

/**
 * How much of a refund each charge of a card plan gives back.
 *
 * Proportional to what each one billed, in whole cents, and never more than it
 * billed. Flooring every share leaves a few cents over, which are handed out
 * one at a time from the last charge upwards — the last is where a plan's
 * rounding already lands, and walking up from there is what makes the cents
 * fit when the last charge has no room for them.
 */
export function splitRefund(
  amount: number,
  parts: RefundablePart[],
): RefundShare[] {
  const billed = parts.reduce((total, part) => total + part.value, 0)

  if (billed <= 0) {
    throw new Error(paymentsCopy.errors.refundNothingToRefund)
  }

  if (amount > billed) {
    throw new Error(paymentsCopy.errors.refundTooLarge)
  }

  const shares = parts.map((part) => ({
    id: part.id,
    amount: Math.floor((amount * part.value) / billed),
  }))

  let remainder = amount - shares.reduce((total, share) => total + share.amount, 0)

  for (let index = shares.length - 1; index >= 0 && remainder > 0; index--) {
    const headroom = parts[index].value - shares[index].amount
    const given = Math.min(headroom, remainder)
    shares[index].amount += given
    remainder -= given
  }

  return shares.filter((share) => share.amount > 0)
}
