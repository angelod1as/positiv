import type { ProviderRefund } from "./payment-provider"

/** A refunds list added up, in cents. */
export type RefundTally = { done: number; pending: number; cancelled: number }

export function tallyRefunds(refunds: ProviderRefund[]): RefundTally {
  return refunds.reduce<RefundTally>(
    (tally, refund) => {
      tally[refund.state] += refund.amount
      return tally
    },
    { done: 0, pending: 0, cancelled: 0 },
  )
}

/**
 * Where a payment stands once the provider's refunds are added up -- the one
 * reading the webhook, the sync button and the refund sync job share.
 *
 * `tell` is whether the participant is owed the refund notice now. A single
 * charge is one refund per step, and each one is worth telling. A plan is
 * spread over its charges, so it is told once: when the total reaches what was
 * asked for, or the whole gross for a refund started in the provider's
 * dashboard.
 *
 * `releaseClaim` gives the admin the button back when a request ended short:
 * nothing is on its way any more and the provider cancelled part of it. Right
 * after a request the provider may list nothing at all, which is not the same
 * thing, so a claim is only released on evidence of a cancellation.
 */
export function nextRefundState(input: {
  amount: number
  previousRefunded: number
  requested: number | null
  claimed: boolean
  isPlan: boolean
  tally: RefundTally
}) {
  const { amount, previousRefunded, requested, claimed, isPlan, tally } = input
  const refunded = Math.min(tally.done, amount)
  const target = requested ?? amount

  const status: "paid" | "partially_refunded" | "refunded" =
    refunded >= amount ? "refunded" : refunded > 0 ? "partially_refunded" : "paid"

  const grew = refunded > previousRefunded
  const tell = grew && (!isPlan || (previousRefunded < target && refunded >= target))

  const releaseClaim =
    claimed && tally.pending === 0 && tally.cancelled > 0 && refunded < target

  return {
    status,
    refunded,
    pending: tally.pending,
    cancelled: tally.cancelled,
    releaseClaim,
    tell,
  }
}
