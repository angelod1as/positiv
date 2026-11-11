import { applySchema } from "composable-functions"
import { can, PERMISSIONS } from "~/business/auth/permissions"
import { participantCopy } from "~/copy/participant"
import { dateToString } from "~/lib/helpers/date-to-string"
import { applyToEventInputSchema } from "./application-schemas"
import { userContextSchema } from "../auth/auth-schemas"
import { findValidInvite, markInviteUsed } from "../event/event-invite.server"
import { sendApplicationMail } from "./send-application-mail.server"
import { db } from "~/lib/supabase/db.server"

export const applyToEvent = applySchema(
  applyToEventInputSchema,
  userContextSchema,
)(async (allValues, context) => {
  const { currentProfile } = context
  const { eventId, applicationDate, skipEmail, ...values } = allValues

  if (!currentProfile || !eventId) {
    throw new Error(participantCopy.application.failed)
  }

  const profileId = currentProfile.id

  // Fetch full event once for both status check and email sending
  const event = await db
    .selectFrom("events")
    .selectAll()
    .where("id", "=", eventId)
    .executeTakeFirst()

  if (!event) {
    throw new Error(participantCopy.application.eventNotFound)
  }

  if (
    event.event_status !== "Registration Open" &&
    event.event_status !== "Registration Closed"
  ) {
    throw new Error(participantCopy.application.notAccepting)
  }

  const appliesAsStaff = can(currentProfile, PERMISSIONS.EVENTS_APPLY_AS_STAFF)

  // A closed event still lets in staff, who are outside the limit that closed
  // it, and whoever holds an invite for it. The invite is read against the
  // signed-in profile, so the link is worthless to anybody else who is handed
  // it.
  const needsInvite =
    event.event_status === "Registration Closed" && !appliesAsStaff

  const application = {
    application_date: dateToString(applicationDate),
    referrals: values.referrals,
    referred: values.referred,
    companions: values.companions,
    bond: values.bond,
    notes: values.notes,
    is_user_applied: true,
    cancellation_reason: null,
    ...(appliesAsStaff && { spot_type: "staff" as const }),
  }

  // The invite is read locked, and the application and the stamp on the
  // invite are written in the same transaction: an admin revoking the invite
  // meanwhile either lands first and is seen, or waits until this is in.
  await db.transaction().execute(async (trx) => {
    const invite = needsInvite
      ? await findValidInvite(eventId, profileId, trx)
      : undefined

    if (needsInvite && !invite) {
      throw new Error(participantCopy.application.registrationClosed)
    }

    // profile_id is the signed-in profile's, never anything the request sent.
    await trx
      .insertInto("event_participants")
      .values({ event_id: eventId, profile_id: profileId, ...application })
      .onConflict((oc) =>
        oc.columns(["event_id", "profile_id"]).doUpdateSet(application),
      )
      .execute()
      .catch(() => {
        throw new Error(participantCopy.application.upsertFailed)
      })

    if (invite) await markInviteUsed(eventId, profileId, trx)
  })

  let emailSent = false

  if (currentProfile.email && !skipEmail) {
    const emailResult = await sendApplicationMail({ profile: currentProfile, event })
    emailSent = emailResult.emailSent
  }

  return { emailSent }
})
