import { applySchema, composable } from "composable-functions"
import { sql } from "kysely"
import type { Params } from "react-router"
import { redirectWithError } from "remix-toast"
import type { z } from "zod"
import { kysely } from "~/kysely"
import { formatReminderMail } from "~/lib/email/format-reminder-mail"
import { sendEmail, type MailOptions } from "~/lib/email/send-email"
import { chunkArray } from "~/lib/helpers/chunk-array"
import { schemaValuesToDB } from "~/lib/helpers/db-values-to-form-schema"
import paths from "~/lib/paths"
import type { Profile } from "~types/entities.types"
import { getUserContext } from "../auth/auth.server"
import {
  adminContextSchema,
  eventFormSchema,
  sendEventRemindersSchema,
  updateEventStatusSchema,
  updateParticipantPropertySchema,
} from "./common"

const {
  admin: { ADMIN_DASHBOARD },
} = paths

export const getAdminContext = async (
  request: Request,
  params: Params,
): Promise<z.infer<typeof adminContextSchema>> => {
  const context = await getUserContext(request, params)
  const { error, data } = await context.supabase.from("events").select("*")

  if (error) {
    throw await redirectWithError(
      ADMIN_DASHBOARD,
      "Ocorreu um erro ao buscar eventos",
    )
  }

  const events = data

  return { ...context, events }
}

export const getAdminEventById = composable(async (eventId: string) => {
  const result = await kysely
    .selectFrom("events")
    .selectAll()
    .where("id", "=", eventId)
    .executeTakeFirstOrThrow()

  return result
})

export type ParticipantWithExtraData = {
  id: string
  full_name: string | null
  social_name: string | null
  pronouns: string[] | null
  gender: string[] | null
  orientation: string[] | null
  phone: number | null
  process_status: string
  is_veteran: boolean | null
  is_social_spot: boolean | null
  was_admin_skipped_last_event: boolean
  payment: number | null
}

export const getAdminParticipantsWithExtraDataById = composable(
  async (eventId: string) => {
    // Main query to get participants information along with if they were skipped in the last event

    const participantsWithExtraData = await kysely
      .selectFrom("event_participants as current_ep")
      .innerJoin("profiles as p", "current_ep.profile_id", "p.id")
      .leftJoin(
        (eb) =>
          eb
            .selectFrom("event_participants as ep")
            .innerJoin("events as e", "ep.event_id", "e.id")
            .select([
              "ep.profile_id",
              "ep.process_status",
              sql<number>`row_number() over (
            partition by ep.profile_id
            order by e.time_event_start desc
          )`.as("rn"),
            ])
            .where("ep.is_user_applied", "=", true)
            .as("ranked_events"),
        (join) =>
          join
            .onRef("ranked_events.profile_id", "=", "current_ep.profile_id")
            .on("ranked_events.rn", "=", 2),
      )
      .select([
        "p.id",
        "p.full_name",
        "p.social_name",
        "p.pronouns",
        "p.phone",
        "p.gender",
        "p.orientation",
        "p.is_veteran",
        "current_ep.payment",
        "current_ep.process_status",
        "current_ep.is_social_spot",
        sql<boolean>`ranked_events.process_status = 'skipped'`.as(
          "was_admin_skipped_last_event",
        ),
      ])
      .where("current_ep.event_id", "=", eventId)
      .where("current_ep.is_user_applied", "=", true)
      .execute()

    return participantsWithExtraData
  },
)

///////
// ACTIONS
//////

export const createOrUpdateEvent = applySchema(
  eventFormSchema,
  adminContextSchema,
)(async (values, context) => {
  const { supabase, eventId } = context

  const parsedValues = schemaValuesToDB(values)

  const { error, data } = await supabase
    .from("events")
    .upsert({
      ...parsedValues,
      id: eventId,
    })
    .select("id")
    .single()

  if (error) {
    throw new Error(
      "Ocorreu um erro adicionando seu evento, tente novamente. Erro: upsert",
    )
  }

  return data.id
})

export const updateEventStatus = applySchema(
  updateEventStatusSchema,
  adminContextSchema,
)(async (values, context) => {
  const { eventId } = context
  if (!eventId) return null

  const result = await kysely
    .updateTable("events")
    .set({
      event_status: values.event_status,
    })
    .where("id", "=", eventId)
    .execute()

  return result.length > 0
})

export const updateParticipantProperty = composable(
  async (
    eventId: string,
    participantId: string,
    property: z.infer<typeof updateParticipantPropertySchema>["property"],
    value: boolean | number | string,
  ) => {
    const updateProfiles = async () => {
      const result = await kysely
        .updateTable("profiles")
        .set({ [property]: value })
        .where("id", "=", participantId)
        .execute()

      return result.length > 0
    }

    const updateEventParticipants = async () => {
      const result = await kysely
        .updateTable("event_participants")
        .set({ [property]: value })
        .where("event_id", "=", eventId)
        .where("profile_id", "=", participantId)
        .execute()

      return result.length > 0
    }

    if (typeof value === "boolean") {
      if (property === "is_veteran") {
        return await updateProfiles()
      }

      if (property === "is_social_spot") {
        return await updateEventParticipants()
      }

      if (property === "was_admin_skipped_last_event") {
        // For was_admin_skipped_last_event, we need to find the previous event
        // and update its process_status to 'skipped' or not

        // First, get the current event's start time
        const currentEvent = await kysely
          .selectFrom("events")
          .select("time_event_start")
          .where("id", "=", eventId)
          .executeTakeFirst()

        if (!currentEvent) {
          return false
        }

        // Find the previous event for this participant
        const previousEvent = await kysely
          .selectFrom("event_participants as ep")
          .innerJoin("events as e", "ep.event_id", "e.id")
          .select(["ep.id", "ep.process_status"])
          .where("ep.profile_id", "=", participantId)
          .where("ep.is_user_applied", "=", true)
          .where("e.time_event_start", "<", currentEvent.time_event_start)
          .orderBy("e.time_event_start", "desc")
          .limit(1)
          .executeTakeFirst()

        if (!previousEvent) {
          return false
        }

        // Update the process_status of the previous event
        const result = await kysely
          .updateTable("event_participants")
          .set({ process_status: value ? "skipped" : "approved" })
          .where("id", "=", previousEvent.id)
          .execute()

        return result.length > 0
      }
    }

    if (typeof value === "number") {
      return await updateEventParticipants()
    }

    if (typeof value === "string") {
      if (property === "process_status") {
        return await updateEventParticipants()
      }
    }

    return false
  },
)

const getEventRemindersByEventId = composable(
  async (eventId: string) =>
    await kysely
      .selectFrom("event_reminders")
      .select("profile_id")
      .where("event_id", "=", eventId)
      .where("email_sent", "=", false)
      .execute(),
)

type SendBatchEventReminderEmail = {
  emails: string[]
  eventId: string
}
const sendBatchEventReminderEmail = composable(
  async ({ emails, eventId }: SendBatchEventReminderEmail) => {
    const eventResult = await getAdminEventById(eventId)

    if (!eventResult.success) {
      throw new Error(`Erro: eventResult > ${eventResult.errors.join("; ")}`)
    }

    const event = eventResult.data

    const { html, text } = await formatReminderMail(event)

    const options: MailOptions = {
      to: emails,
      subject: `Inscrições abertas para o evento ${event.emoji} ${event.title}`,
      text: text,
      html: html,
    }

    try {
      await sendEmail(options)
      return true
    } catch (error) {
      console.error("REMINDER MAIL ERROR", error)
      return false
    }
  },
)

export const getEmailsByIds = composable(
  async (profileIds: Array<Profile["id"]>) => {
    if (!profileIds || profileIds.length === 0) return []
    return await kysely
      .selectFrom("profiles")
      .select("email")
      .where("id", "in", profileIds)
      .execute()
  },
)

export const sendEventReminders = applySchema(sendEventRemindersSchema)(async (
  values,
) => {
  const { intent: _intent, event_id, event_status } = values
  if (!event_id) {
    throw new Error("O id de evento é obrigatório, fale com o administrador")
  }
  if (event_status !== "Registration Open") {
    throw new Error(
      "O evento deve estar com o status de 'Inscrições Abertas', fale com o administrador",
    )
  }

  const remindersResult = await getEventRemindersByEventId(event_id)

  if (!remindersResult.success) {
    throw new Error(`Erro: reminders > ${remindersResult.errors.join("; ")}`)
  }

  const reminders = remindersResult.data

  if (!reminders || reminders.length === 0) {
    console.info("No reminders found")
    return
  }

  const profileIds = reminders.map((item) => item.profile_id)

  const emailsResult = await getEmailsByIds(profileIds)

  if (!emailsResult.success) {
    const message = `Erro: emailsResult > ${emailsResult.errors.join("; ")}`
    console.error(message)
    throw new Error(message)
  }

  const emails = emailsResult.data.map((item) => item.email)
  const emailGroups = chunkArray(emails)

  const sendPromises = emailGroups.map((emails) => {
    return sendBatchEventReminderEmail({ emails, eventId: event_id })
  })

  await Promise.allSettled(sendPromises).then((results) => {
    results.forEach((result, index, array) => {
      const total = array.length
      if (result.status === "rejected") {
        console.error(`Batch ${index + 1}/${total} failed:`, result.reason)
      } else {
        console.info(`Email batch ${index + 1}/${total} successful.`)
      }
    })
  })

  return
})
