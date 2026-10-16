import type { ParticipantApplicationStatus } from "~types/database/entities.types"

// Application statuses at or past the money. Both the webhook that marks a
// charge paid and the offer that opens a new charge leave these alone, so a
// paid participant is never walked back up the funnel. Shared so the two paths
// cannot drift apart.
export const POST_PAYMENT_STATUSES = [
  "paid",
  "sent_rules",
  "finalised",
] as const satisfies ParticipantApplicationStatus[]
