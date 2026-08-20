import type { z } from "zod"
import { toCommitErrors } from "~/lib/helpers/to-commit-errors"
import type { CommitError } from "~types/forms/commit.types"
import { agreeToTermsSchema, contextSchema } from "../common"
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
  context: z.infer<typeof contextSchema>
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
    // Linking a profile, creating one, unsubscribing — nothing that fails here
    // belongs to a box someone ticked.
    return { ok: false, errors: [], message: result.errors[0]?.message }
  }

  const data = result.data as { newsletterSubscriptionError?: string }

  return { ok: true, newsletterFailed: Boolean(data.newsletterSubscriptionError) }
}
