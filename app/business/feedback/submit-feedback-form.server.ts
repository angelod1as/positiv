import { ENV } from "varlock/env"
import { publicCopy } from "~/copy/public"
import { toCommitErrors } from "~/lib/helpers/to-commit-errors"
import { verifyTurnstileToken } from "~/lib/helpers/verify-turnstile.server"
import { logger } from "~/lib/logger/logger.server"
import type { CommitResult } from "~types/forms/commit.types"
import { feedbackRateLimiter } from "./feedback-rate-limiter"
import { feedbackFormSchema } from "./feedback-schema"
import { submitFeedback } from "./feedback.server"
import { notifyNewFeedback } from "./notify-new-feedback.server"

const feedbackCopy = publicCopy.feedback

type SubmitFeedbackFormProps = {
  answers: Record<string, unknown>
  /** Whoever sent it, as far as the edge could tell. What the limit counts. */
  ip: string
}

/**
 * The form's save, with the two guards that stand in front of it: an address
 * may only send one feedback in a while, and the security check has to have
 * answered. Both are the server's to enforce — the browser is what a bare POST
 * skips.
 */
export async function submitFeedbackForm({
  answers,
  ip,
}: SubmitFeedbackFormProps): Promise<CommitResult> {
  const parsed = feedbackFormSchema.safeParse(answers)

  if (!parsed.success) {
    return { ok: false, errors: toCommitErrors(parsed.error) }
  }

  const isDev = ENV.APP_ENV === "development"

  if (!isDev && feedbackRateLimiter.isRateLimited(ip)) {
    return { ok: false, errors: [], message: feedbackCopy.rateLimited }
  }

  const turnstileResult = await verifyTurnstileToken(
    parsed.data.captchaToken,
    ip,
    { ip },
  )

  if (!turnstileResult.success) {
    return {
      ok: false,
      errors: [
        { questionId: "captchaToken", message: feedbackCopy.captchaFailed },
      ],
    }
  }

  const { captchaToken: _, ...feedbackData } = parsed.data
  const feedback = await submitFeedback(feedbackData, ip)

  void notifyNewFeedback(feedback).catch((error) =>
    logger.error("Failed to notify a new feedback", { error }),
  )

  if (!isDev) {
    feedbackRateLimiter.recordRequest(ip)
  }

  return { ok: true }
}
