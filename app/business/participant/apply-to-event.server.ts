import { applySchema } from "composable-functions"
import { dateToString } from "~/lib/helpers/date-to-string"
import { applyToEventSchema, userContextSchema } from "../common"
import { sendApplicationMail } from "./send-application-mail.server"
import { db } from "~/lib/supabase/db.server"

export const applyToEvent = applySchema(
  applyToEventSchema,
  userContextSchema,
)(async (allValues, context) => {
  const { supabase, currentProfile } = context
  const { eventId, applicationDate, ...values } = allValues

  if (!currentProfile || !eventId) {
    throw new Error("Oops, algo deu errado na sua inscrição. Tente mais tarde.")
  }

  const profileId = currentProfile.id

  // Fetch full event once for both status check and email sending
  const event = await db
    .selectFrom("events")
    .selectAll()
    .where("id", "=", eventId)
    .executeTakeFirst()

  if (!event) {
    throw new Error("Evento não encontrado.")
  }

  if (event.event_status === "Registration Closed") {
    throw new Error(
      "Inscrições encerradas! Este evento atingiu o limite de participantes.",
    )
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
    throw new Error("Sua inscrição teve um erro, tente novamente. Erro: upsert")
  }

  let emailSent = false

  if (currentProfile.email) {
    const emailResult = await sendApplicationMail({ profile: currentProfile, event })
    emailSent = emailResult.emailSent
  }

  return { emailSent }
})
