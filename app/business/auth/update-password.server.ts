import type { z } from "zod"
import { errorsCopy } from "~/copy/errors"
import { toCommitErrors } from "~/lib/helpers/to-commit-errors"
import { logger } from "~/lib/logger/logger.server"
import type { CommitResult } from "~types/forms/commit.types"
import { changePasswordSchema, userContextSchema } from "../common"

type UpdatePasswordProps = {
  answers: Record<string, unknown>
  context: z.infer<typeof userContextSchema>
}

export async function updatePassword({
  answers,
  context,
}: UpdatePasswordProps): Promise<CommitResult> {
  const parsed = changePasswordSchema.safeParse(answers)

  if (!parsed.success) {
    return { ok: false, errors: toCommitErrors(parsed.error) }
  }

  const { supabase } = context
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  })

  if (error) {
    if (error.code === "same_password") {
      return { ok: false, errors: [], message: errorsCopy.auth.samePassword }
    }

    logger.error("Password change error", { error })
    return {
      ok: false,
      errors: [],
      message: errorsCopy.auth.passwordChangeFailed,
    }
  }

  return { ok: true }
}
