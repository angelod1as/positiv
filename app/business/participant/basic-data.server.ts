import type { z } from "zod"
import type { CommitResult } from "~types/forms/commit.types"
import { dateToString } from "~/lib/helpers/date-to-string"
import { schemaValuesToDB } from "~/lib/helpers/db-values-to-form-schema"
import { toCommitErrors } from "~/lib/helpers/to-commit-errors"
import { logger } from "~/lib/logger/logger.server"
import { db } from "~/lib/supabase/db.server"
import { participantCopy } from "~/copy/participant"
import { basicDataSchema, ExtraBasicDataSchema, userContextSchema } from "../common"
import { subscribeProfileToNewsletter } from "../newsletter/auto-subscribe.server"
import type { SubscriptionSource } from "../newsletter/types"

type SaveBasicDataProps = {
  answers: Record<string, unknown>
  context: z.infer<typeof userContextSchema>
}

/**
 * Writes the fourteen fields of a profile in one go, adopting the profile left
 * behind under the same e-mail if there is one — someone who attended before
 * signing up already has a row, and it holds their history.
 */
export async function saveBasicData({
  answers,
  context,
}: SaveBasicDataProps): Promise<CommitResult> {
  const { supabase, currentUser } = context

  // The e-mail is how a profile left behind is found and how a new one is
  // keyed, so there is nothing to save without it.
  if (!currentUser.email) return { ok: false, errors: [] }
  const email = currentUser.email

  const basic = basicDataSchema.safeParse(answers)
  const extra = ExtraBasicDataSchema.safeParse(answers)

  if (!basic.success || !extra.success) {
    return {
      ok: false,
      errors: [
        ...(basic.success ? [] : toCommitErrors(basic.error)),
        ...(extra.success ? [] : toCommitErrors(extra.error)),
      ],
    }
  }

  // The same conversion the profile has always been written through: a field
  // left empty becomes null rather than vanishing from the write, so clearing
  // one clears it on the row too.
  const { confirm_phone, ...values } = schemaValuesToDB(basic.data)

  const { data: orphanedProfile, error: orphanedError } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email)
    .is("user_id", null)
    .single()

  // Anything other than "no rows" means the question of whether a profile is
  // waiting under this e-mail went unanswered, and writing a second one would
  // strand the first.
  if (orphanedError && orphanedError.code !== "PGRST116") {
    logger.error(
      `Error checking for orphaned profile: ${orphanedError.message}`,
    )
    return { ok: false, errors: [] }
  }

  const profileId = orphanedProfile?.id ?? context.currentProfile?.id

  const written = {
    ...values,
    ...extra.data,
    date_of_birth: dateToString(values.date_of_birth),
    user_id: currentUser.id,
    email,
    basic_data_filled: true,
  }

  // Updated by id when the row to write is already known, and only inserted
  // when it is not. An upsert cannot do both: its conflict target is user_id,
  // which a profile left behind has none of — so adopting one used to insert a
  // second row with the same primary key and fail on it.
  const { data: saved, error: upsertError } = profileId
    ? await supabase
        .from("profiles")
        .update(written)
        .eq("id", profileId)
        .select("id")
        .single()
    : await supabase
        .from("profiles")
        .upsert(written, { onConflict: "user_id" })
        .select("id")
        .single()

  if (upsertError || !saved) {
    const code = upsertError?.code ?? "UNKNOWN"
    const message = upsertError?.message ?? String(upsertError)
    logger.error(participantCopy.basicData.profileUpdateFailed(code, message))
    return { ok: false, errors: [] }
  }

  // The name reaching the profile is often the first real one the newsletter
  // could have: before this, a subscriber taken at sign-up is filed under an
  // e-mail address.
  const subscription = await db
    .selectFrom("newsletter_subscriptions")
    .select(["consent_given", "subscription_source"])
    .where("profile_id", "=", saved.id)
    .where("consent_given", "=", true)
    .executeTakeFirst()

  if (subscription?.subscription_source) {
    await subscribeProfileToNewsletter(
      saved.id,
      subscription.subscription_source as SubscriptionSource,
    )
  }

  return { ok: true }
}
