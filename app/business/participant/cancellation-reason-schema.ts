import { zod } from "~/lib/helpers/zod"

export const MAX_CANCELLATION_REASON_LENGTH = 500

export const cancellationReasonSchema = zod
  .string()
  .trim()
  .max(MAX_CANCELLATION_REASON_LENGTH)
  .optional()
  .transform((reason) => reason || null)
