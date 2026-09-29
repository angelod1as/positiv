// How far along an anticipation is, from requested to settled. A plan has one
// per charge, and the plan is only as far along as its slowest charge.
const PROGRESS = ["PENDING", "SCHEDULED", "OVERDUE", "CREDITED", "DEBITED"]

// An anticipation that will not happen, and so costs nothing.
const VOID = ["CANCELLED", "DENIED"]

/**
 * What advancing a card charge or plan costs Positiv, and where it stands.
 * `fee` is null when Asaas has no anticipation for it at all -- a Pix, or a
 * card not advanced -- which is not the same as a fee of zero.
 */
export function summarizeAnticipations(
  anticipations: { status: string; fee: number }[],
): { fee: number | null; status: string | null } {
  if (!anticipations.length) return { fee: null, status: null }

  const live = anticipations.filter((item) => !VOID.includes(item.status))
  if (!live.length) return { fee: 0, status: anticipations[0].status }

  const fee = live.reduce((total, item) => total + item.fee, 0)
  const rank = (status: string) => {
    const index = PROGRESS.indexOf(status)
    return index === -1 ? 0 : index
  }
  const slowest = live.reduce((least, item) =>
    rank(item.status) < rank(least.status) ? item : least,
  )

  return { fee, status: slowest.status }
}
