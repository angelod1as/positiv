import type { z } from "zod"
import type { CommitResult } from "~types/forms/commit.types"
import { dateToString } from "~/lib/helpers/date-to-string"
import { schemaValuesToDB } from "~/lib/helpers/db-values-to-form-schema"
import { toCommitErrors } from "~/lib/helpers/to-commit-errors"
import { logger } from "~/lib/logger/logger.server"
import { db } from "~/lib/supabase/db.server"
import { participantCopy } from "~/copy/participant"
import { basicDataValidation, cpfExemptionCopy } from "~/copy/account"
import { isUniqueViolation } from "~/lib/helpers/is-unique-violation"
import {
  basicDataSchema,
  cpfExemptBasicDataSchema,
  ExtraBasicDataSchema,
} from "./profile-schemas"
import { userContextSchema } from "../auth/auth-schemas"
import { refreshNewsletterSubscriber } from "../newsletter/auto-subscribe.server"

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
  const { currentUser } = context

  // The e-mail is how a profile left behind is found and how a new one is
  // keyed, so there is nothing to save without it.
  if (!currentUser.email) return { ok: false, errors: [] }
  const email = currentUser.email

  // Read from the profile the request loaded, never from the answers: only an
  // admin grants the exemption, and the form asking for one proves nothing.
  const cpfExempt = context.currentProfile?.cpf_exempt === true

  const basic = (cpfExempt ? cpfExemptBasicDataSchema : basicDataSchema).safeParse(
    answers,
  )
  const extra = ExtraBasicDataSchema.safeParse(answers)

  if (!basic.success || !extra.success) {
    // Someone who asked for the exemption is told it has not been granted yet,
    // rather than that their CPF is missing -- they know it is.
    const waiting = answers.cpf_exempt_requested === true
    const basicErrors = basic.success ? [] : toCommitErrors(basic.error)
    const cpfRefused = basicErrors.some((error) => error.questionId === "cpf")

    return {
      ok: false,
      errors: [
        ...(waiting && cpfRefused
          ? [
              ...basicErrors.filter((error) => error.questionId !== "cpf"),
              { questionId: "cpf", message: cpfExemptionCopy.notYetExempt },
            ]
          : basicErrors),
        ...(extra.success ? [] : toCommitErrors(extra.error)),
      ],
    }
  }

  // The same conversion the profile has always been written through: a field
  // left empty becomes null rather than vanishing from the write, so clearing
  // one clears it on the row too.
  const { confirm_phone, ...values } = schemaValuesToDB(basic.data)

  const written = {
    ...values,
    ...extra.data,
    date_of_birth: dateToString(values.date_of_birth),
    ...(cpfExempt && { cpf: null }),
    user_id: currentUser.id,
    email,
    basic_data_filled: true,
  }

  // Updated by id when the row to write is already known, and only inserted
  // when it is not. An upsert cannot do both: its conflict target is user_id,
  // which a profile left behind has none of — so adopting one used to insert a
  // second row with the same primary key and fail on it.
  //
  // The update only lands on a row that is this person's or nobody's yet: a
  // profile id belonging to someone else matches nothing and is refused.
  let profileId: string | undefined
  let saved: { id: string } | undefined
  try {
    // A failed lookup leaves unanswered whether a profile is waiting under
    // this e-mail, and writing a second one would strand the first -- so it
    // refuses like a failed write does.
    const orphanedProfile = await db
      .selectFrom("profiles")
      .select("id")
      .where("email", "=", email)
      .where("user_id", "is", null)
      .executeTakeFirst()

    profileId = orphanedProfile?.id ?? context.currentProfile?.id

    saved = profileId
      ? await db
          .updateTable("profiles")
          .set(written)
          .where("id", "=", profileId)
          .where((eb) =>
            eb.or([
              eb("user_id", "=", currentUser.id),
              eb("user_id", "is", null),
            ]),
          )
          .returning("id")
          .executeTakeFirst()
      : await db
          .insertInto("profiles")
          .values(written)
          .onConflict((oc) => oc.column("user_id").doUpdateSet(written))
          .returning("id")
          .executeTakeFirst()
  } catch (error) {
    // One profile per CPF. Said on the field, since it is the person's to
    // correct -- or, if the CPF is theirs, to take up with the organisation.
    if (isUniqueViolation(error, "profiles_cpf_unique")) {
      return {
        ok: false,
        errors: [{ questionId: "cpf", message: basicDataValidation.cpfTaken }],
      }
    }

    const { code, message } = error as { code?: string; message?: string }
    logger.error(
      participantCopy.basicData.profileUpdateFailed(
        code ?? "UNKNOWN",
        message ?? String(error),
      ),
    )
    return { ok: false, errors: [] }
  }

  if (!saved) {
    logger.error(
      participantCopy.basicData.profileUpdateFailed(
        "NO_ROW",
        `profile ${profileId} is not this user's to write`,
      ),
    )
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
    await refreshNewsletterSubscriber(saved.id)
  }

  return { ok: true }
}
