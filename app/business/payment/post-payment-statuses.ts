import type { ParticipantApplicationStatus } from "~types/database/entities.types"

// Application statuses at or past the money, which the paid webhook and the
// offer both leave alone so a paid participant is never walked back.
export const POST_PAYMENT_STATUSES = [
  "paid",
  "sent_rules",
  "finalised",
] as const satisfies ParticipantApplicationStatus[]
