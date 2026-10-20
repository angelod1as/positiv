import { ENV } from "varlock/env"
import type { z } from "zod"
import { errorsCopy } from "~/copy/errors"
import { appOrigin } from "~/lib/helpers/app-origin"
import { toCommitErrors } from "~/lib/helpers/to-commit-errors"
import { logger } from "~/lib/logger/logger.server"
import type { CommitResult } from "~types/forms/commit.types"
import paths from "~/lib/paths"
import { contextSchema, forgotPasswordSchema } from "../common"
import { recordAuthAttempt } from "./auth-attempt-guard.server"

const {
  auth: { LOGON_CALLBACK },
} = paths

type RequestPasswordResetProps = {
  answers: Record<string, unknown>
  context: z.infer<typeof contextSchema>
  ip?: string | null
}

export type RequestPasswordResetResult =
  | CommitResult
  | { ok: false; errors: []; message: string; rateLimited: true }

const rateLimited: RequestPasswordResetResult = {
  ok: false,
  errors: [],
  message: errorsCopy.auth.resetRateLimited,
  rateLimited: true,
}

export async function requestPasswordReset({
  answers,
  context,
  ip = null,
}: RequestPasswordResetProps): Promise<RequestPasswordResetResult> {
  const parsed = forgotPasswordSchema.safeParse(answers)

  if (!parsed.success) {
    return { ok: false, errors: toCommitErrors(parsed.error) }
  }

  // Both limits are counted before supabase is asked anything, so a refusal
  // says nothing about whether the e-mail has an account.
  if (!ip) {
    if (ENV.APP_ENV === "production") {
      logger.error(
        "Password reset without a client IP; the address limit was skipped",
      )
    }
  } else if (!(await recordAuthAttempt("reset_ip", ip))) {
    logger.warn(
      "[ADMIN] Refused password reset: too many requests from one address",
    )
    return rateLimited
  }

  if (!(await recordAuthAttempt("reset_email", parsed.data.email))) {
    logger.warn(
      "[ADMIN] Refused password reset: too many requests for one e-mail",
    )
    return rateLimited
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
