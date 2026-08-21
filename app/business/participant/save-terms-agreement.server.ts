import type { z } from "zod"
import { toCommitErrors } from "~/lib/helpers/to-commit-errors"
import { logger } from "~/lib/logger/logger.server"
import type { CommitError } from "~types/forms/commit.types"
import { agreeToTermsSchema, userContextSchema } from "../common"
import { agreeToTerms } from "./agree-to-terms.server"

/**
 * The choices were saved, and the newsletter is the part that can fail on its
 * own: the page says so without pretending nothing was written.
 */
export type TermsAgreementResult =
  | { ok: true; newsletterFailed: boolean }
  | { ok: false; errors: CommitError[]; message?: string }

type SaveTermsAgreementProps = {
  answers: Record<string, unknown>
  /**
   * Narrower than the context the composable behind this takes: agreeing to
   * the terms is something only a signed-in person does, and saying so here
   * makes a caller that forgot to authenticate a type error rather than a
   * refusal raised at runtime.
   */
  context: z.infer<typeof userContextSchema>
}

export async function saveTermsAgreement({
  answers,
  context,
}: SaveTermsAgreementProps): Promise<TermsAgreementResult> {
  const parsed = agreeToTermsSchema.safeParse(answers)

  if (!parsed.success) {
    return { ok: false, errors: toCommitErrors(parsed.error) }
  }

  const result = await agreeToTerms(parsed.data, context)

  if (!result.success) {
    // Only the first message has anywhere to go: the form shows one failure
    // above its button. The rest are written down rather than dropped, so a
    // second failure mode added later is not invisible.
    logger.error("Refused to save the terms agreement", {
      errors: result.errors.map((error) => error.message),
    })

    // Linking a profile, creating one, unsubscribing — nothing that fails here
    // belongs to a box someone ticked.
    return { ok: false, errors: [], message: result.errors[0]?.message }
  }

  const data = result.data as { newsletterSubscriptionError?: string }

  return { ok: true, newsletterFailed: Boolean(data.newsletterSubscriptionError) }
}
