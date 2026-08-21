import type { z } from "zod"
import { errorsCopy } from "~/copy/errors"
import { trackServerEvent } from "~/lib/analytics/umami.server"
import { toCommitErrors } from "~/lib/helpers/to-commit-errors"
import paths from "~/lib/paths"
import type { CommitError } from "~types/forms/commit.types"
import { contextSchema, loginSchema } from "../common"

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
  | { ok: false; errors: CommitError[]; message?: string }

type SignInProps = {
  answers: Record<string, unknown>
  context: z.infer<typeof contextSchema>
}

export async function signIn({
  answers,
  context,
}: SignInProps): Promise<SignInResult> {
  const parsed = loginSchema.safeParse(answers)

  if (!parsed.success) {
    return { ok: false, errors: toCommitErrors(parsed.error) }
  }

  const { supabase } = context
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data)

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

  return {
    ok: true,
    redirectTo: profile?.is_admin ? ADMIN_DASHBOARD : DASHBOARD,
  }
}
