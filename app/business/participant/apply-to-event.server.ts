import { applySchema } from "composable-functions"
import { participantCopy } from "~/copy/participant"
import { dateToString } from "~/lib/helpers/date-to-string"
import { applyToEventInputSchema, userContextSchema } from "../common"
import { findValidInvite, markInviteUsed } from "./event-invite.server"
import { sendApplicationMail } from "./send-application-mail.server"
import { db } from "~/lib/supabase/db.server"

export const applyToEvent = applySchema(
  applyToEventInputSchema,
  userContextSchema,
)(async (allValues, context) => {
  const { supabase, currentProfile } = context
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

  // A closed event still lets in whoever holds an invite for it. The invite is
  // read against the signed-in profile, so the link is worthless to anybody
  // else who is handed it.
  const invite =
    event.event_status === "Registration Closed"
      ? await findValidInvite(eventId, profileId)
      : undefined

  if (event.event_status === "Registration Closed" && !invite) {
    throw new Error(participantCopy.application.registrationClosed)
  }

  const { data } = await supabase
    .from("event_participants")
    .select("id")
    .eq("event_id", eventId)
    .eq("profile_id", profileId)
    .single()

  const { error } = await supabase.from("event_participants").upsert({
    id: data?.id,
    event_id: eventId,
    profile_id: profileId,
    application_date: dateToString(applicationDate),
    ...values, // Supabase sanitizes automatically
    is_user_applied: true,
  })

  if (error) {
    throw new Error(participantCopy.application.upsertFailed)
  }

  if (invite) await markInviteUsed(eventId, profileId)

  let emailSent = false

  if (currentProfile.email && !skipEmail) {
    const emailResult = await sendApplicationMail({ profile: currentProfile, event })
    emailSent = emailResult.emailSent
  }

  return { emailSent }
})
