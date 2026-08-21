import type { z } from "zod"
import { errorsCopy } from "~/copy/errors"
import { appOrigin } from "~/lib/helpers/app-origin"
import { toCommitErrors } from "~/lib/helpers/to-commit-errors"
import { logger } from "~/lib/logger/logger.server"
import type { CommitResult } from "~types/forms/commit.types"
import paths from "~/lib/paths"
import { contextSchema, forgotPasswordSchema } from "../common"

const {
  auth: { LOGON_CALLBACK },
} = paths

type RequestPasswordResetProps = {
  answers: Record<string, unknown>
  context: z.infer<typeof contextSchema>
}

export async function requestPasswordReset({
  answers,
  context,
}: RequestPasswordResetProps): Promise<CommitResult> {
  const parsed = forgotPasswordSchema.safeParse(answers)

  if (!parsed.success) {
    return { ok: false, errors: toCommitErrors(parsed.error) }
  }

  const { supabase, host } = context

  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    { redirectTo: `${appOrigin(host)}${LOGON_CALLBACK}` },
  )

  if (error) {
    logger.error("Password Reset Error", { error })
    return { ok: false, errors: [], message: errorsCopy.auth.resetRequestFailed }
  }

  return { ok: true }
}
