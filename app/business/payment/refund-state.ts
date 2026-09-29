import { reaisToCents } from "~/lib/helpers/format-currency"

/** One entry of Asaas's `refunds` list, on a charge or on a whole plan. */
export type AsaasRefund = { value?: number | null; status?: string | null }

/** A refunds list added up, in cents. */
export type RefundTally = { done: number; pending: number; cancelled: number }

/**
 * Only DONE is money back: "a existência do array refunds não significa que o
 * valor já foi devolvido" (docs, Estornos). CANCELLED never will be. Anything
 * else -- PENDING, the AWAITING_* authorisations, or a status we do not know
 * -- is on its way, and never counted as given back on a guess.
 */
export function tallyRefunds(refunds: AsaasRefund[]): RefundTally {
  return refunds.reduce<RefundTally>(
    (tally, refund) => {
      const cents = reaisToCents(refund.value ?? 0)
      if (refund.status === "DONE") tally.done += cents
      else if (refund.status === "CANCELLED") tally.cancelled += cents
      else tally.pending += cents
      return tally
    },
    { done: 0, pending: 0, cancelled: 0 },
  )
}

/**
 * Where a payment stands once Asaas's refunds are added up -- the one reading
 * the webhook, the "Atualizar do Asaas" button and the refund sync share.
 *
 * `tell` is whether the participant is owed the refund notice now. A single
 * charge is one refund per step, and each one is worth telling. A plan is
 * spread over its charges, so it is told once: when the total reaches what was
 * asked for, or the whole gross for a refund started in the Asaas dashboard.
 *
 * `releaseClaim` gives the admin the button back when a request ended short:
 * nothing is on its way any more and Asaas cancelled part of it. Right after a
 * request Asaas may list nothing at all, which is not the same thing, so a
 * claim is only released on evidence of a cancellation.
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
