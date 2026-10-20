import { ENV } from "varlock/env"
import type { z } from "zod"
import { errorsCopy } from "~/copy/errors"
import { trackServerEvent } from "~/lib/analytics/umami.server"
import { safeRedirect } from "~/lib/helpers/safe-redirect"
import { toCommitErrors } from "~/lib/helpers/to-commit-errors"
import { logger } from "~/lib/logger/logger.server"
import paths from "~/lib/paths"
import type { CommitError } from "~types/forms/commit.types"
import { contextSchema, loginSchema } from "../common"
import {
  recordAuthAttempt,
  releaseAuthAttempt,
  reserveAuthAttempt,
} from "./auth-attempt-guard.server"

const {
  dash: { DASHBOARD },
  admin: { ADMIN_DASHBOARD },
} = paths

/**
 * A sign-in that went through says where the person belongs: the context was
 * built before there was a session, so whether they are an admin is only
 * knowable once they are in.
 */
export type SignInResult =
  | { ok: true; redirectTo: string }
  | {
      ok: false
      errors: CommitError[]
      message?: string
      rateLimited?: true
    }

type SignInProps = {
  answers: Record<string, unknown>
  context: z.infer<typeof contextSchema>
  ip?: string | null
}

const rateLimited: SignInResult = {
  ok: false,
  errors: [],
  message: errorsCopy.auth.loginRateLimited,
  rateLimited: true,
}

export async function signIn({
  answers,
  context,
  ip = null,
}: SignInProps): Promise<SignInResult> {
  const parsed = loginSchema.safeParse(answers)

  if (!parsed.success) {
    return { ok: false, errors: toCommitErrors(parsed.error) }
  }

  const { email } = parsed.data

  // Supabase sees every sign-in coming from this server, so its own per-IP
  // limits cannot tell one visitor from another; the limits are ours to keep.
  // Both are checked before supabase is asked anything, so a refusal says
  // nothing about whether the e-mail has an account.
  if (!ip) {
    if (ENV.APP_ENV === "production") {
      logger.error("Sign-in without a client IP; the address limit was skipped")
    }
  } else if (!(await recordAuthAttempt("login_ip", ip))) {
    logger.warn("[ADMIN] Refused sign-in: too many attempts from one address")
    return rateLimited
  }

  // Only a wrong password counts against the e-mail, but the turn is taken
  // before supabase is asked and handed back after, so a burst of guesses
  // cannot all get through before the first failure is counted.
  const reservation = await reserveAuthAttempt("login_email", email)

  if (reservation === null) {
    logger.warn("[ADMIN] Refused sign-in: too many failures for one e-mail")
    return rateLimited
  }

  const { supabase } = context
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data)

  // A turn that cannot be handed back only expires with its window, which is
  // no reason to fail a sign-in supabase has already let through.
  if (error?.code !== "invalid_credentials") {
    await releaseAuthAttempt(reservation).catch((releaseError: unknown) => {
      logger.error("Could not hand a sign-in turn back", { releaseError })
    })
  }

  if (error) {
    if (error.code === "invalid_credentials") {
      return {
        ok: false,
        errors: [],
        message: errorsCopy.auth.invalidCredentials,
      }
    }
    if (error.code === "email_not_confirmed") {
      return {
        ok: false,
        errors: [],
        message: errorsCopy.auth.emailNotConfirmed,
      }
    }

    return {
      ok: false,
      errors: [],
      message: errorsCopy.auth.authFailed(error.code, error.message),
    }
  }

  trackServerEvent("user_login", { userId: data.user.id }, "/auth/login")

  const { data: profile } = await supabase
    .rpc("get_profile_with_roles", { user_id_input: data.user.id })
    .single()

  const home = profile?.is_admin ? ADMIN_DASHBOARD : DASHBOARD

  // Read from the raw answers rather than the parsed ones: loginSchema draws
  // the form, and a destination is not a field anybody fills in.
  return {
    ok: true,
    redirectTo: safeRedirect(
      typeof answers.redirectTo === "string" ? answers.redirectTo : null,
      home,
    ),
  }
}
