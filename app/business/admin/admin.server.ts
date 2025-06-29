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
import type {
  EventParticipant,
  ParticipantVsEvent,
  Profile,
} from "~types/entities.types"
import { getUserContext } from "../auth/auth.server"
import {
  adminContextSchema,
  eventFormSchema,
  sendEventRemindersSchema,
  updateEventParticipantByIdSchema,
  updateEventStatusSchema,
  updateParticipantVsEventSchema,
} from "./common"
import { calculateDemographics } from "./utils/demographics"

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

export const getAdminEventById = composable(
  async ({ eventId }: { eventId: string }) => {
    return await kysely
      .selectFrom("events")
      .selectAll()
      .where("id", "=", eventId)
      .executeTakeFirstOrThrow()
  },
)

export type ProfileWithExtraData = Profile &
  EventParticipant & {
    was_admin_skipped_last_event: boolean
  }

// Main query to get event_participants information along with if they were skipped in the last event
const profilesWithExtraDataQuery = kysely
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
  .selectAll(["p", "current_ep"])
  .select([
    sql<boolean>`ranked_events.process_status = 'skipped'`.as(
      "was_admin_skipped_last_event",
    ),
  ])

export const getProfileWithExtraDataById = composable(
  async ({ eventParticipantId }: { eventParticipantId: string }) => {
    const profile = await profilesWithExtraDataQuery
      .where("current_ep.id", "=", eventParticipantId)
      .where("current_ep.is_user_applied", "=", true)
      .executeTakeFirst()
    return profile
  },
)

export const getProfilesWithExtraDataById = composable(
  async ({ eventId }: { eventId: string }) => {
    const profiles = await profilesWithExtraDataQuery
      .where("current_ep.event_id", "=", eventId)
      .where("current_ep.is_user_applied", "=", true)
      .execute()

    return profiles
  },
)

export const getAdminProfileById = composable(
  async ({ profileId }: { profileId: string }) => {
    return await kysely
      .selectFrom("profiles")
      .selectAll()
      .where("id", "=", profileId)
      .executeTakeFirstOrThrow()
  },
)

export const getEventParticipantHistoryById = composable(
  async ({
    eventParticipantId,
  }: {
    eventParticipantId: string
  }): Promise<Array<ParticipantVsEvent>> => {
    return await kysely
      .selectFrom("event_participants")
      .innerJoin("events", "events.id", "event_participants.event_id")
      .selectAll("event_participants")
      .select(["events.title as event_title", "events.emoji as event_emoji"])
      .where("event_participants.id", "=", eventParticipantId)
      .where("is_user_applied", "=", true)
      .orderBy("events.time_event_start", "desc")
      .execute()
  },
)

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
  emails: Array<string>
  profileIds: Array<string>
  eventId: string
}
const sendBatchEventReminderEmail = composable(
  async ({ emails, eventId, profileIds }: SendBatchEventReminderEmail) => {
    const eventResult = await getAdminEventById({ eventId })

    if (!eventResult.success) {
      throw new Error(`Erro: eventResult > ${eventResult.errors.join("; ")}`)
    }

    const event = eventResult.data

    const { html, text } = await formatReminderMail(event)

    const options: MailOptions = {
      bcc: emails,
      subject: `Inscrições abertas para o evento ${event.emoji} ${event.title}`,
      text: text,
      html: html,
    }

    const result = await sendEmail(options)

    if (!result.success) {
      console.error("REMINDER MAIL ERROR", result.errors)
      return false
    }

    await markEmailsAsSent(profileIds)

    return true
  },
)

export const getEmailsByIds = composable(
  async (profileIds: Array<Profile["id"]>) => {
    if (!profileIds || profileIds.length === 0) return []
    return await kysely
      .selectFrom("profiles")
      .select(["email", "id"])
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

  const emailsWithProfileIds = emailsResult.data

  const emailGroups = chunkArray(emailsWithProfileIds)

  const sendPromises = emailGroups.map((group) => {
    return sendBatchEventReminderEmail({
      emails: group.map((item) => item.email),
      eventId: event_id,
      profileIds: group.map((item) => item.id),
    })
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

export const markEmailsAsSent = composable(
  async (profileIds: Array<string>) => {
    return await kysely
      .updateTable("event_reminders")
      .set({
        email_sent: true,
        email_sent_date: new Date().toISOString(),
      })
      .where("profile_id", "in", profileIds)
      .execute()
  },
)

export const getAdminReminderCountByEventId = composable(
  async ({
    eventId,
    isScheduled,
    isOpen,
  }: {
    eventId: string
    isScheduled: boolean
    isOpen: boolean
  }) => {
    if (!isScheduled && !isOpen) return 0

    const result = await kysely
      .selectFrom("event_reminders")
      .select((eb) =>
        eb.fn
          .count<number>("event_id")
          .filterWhere("event_id", "=", eventId)
          .filterWhere("email_sent", "=", false)
          .as("count"),
      )
      .executeTakeFirstOrThrow()

    return Number(result.count)
  },
)

export const getEventDemographicsById = composable(
  async ({ eventId }: { eventId: string }) => {
    const baseQuery = kysely
      .selectFrom("event_participants")
      .where("event_participants.event_id", "=", eventId)
      .where("process_status", "=", "attended")

    const result = await baseQuery
      .innerJoin("profiles", "profiles.id", "event_participants.profile_id")
      .select([
        "profiles.date_of_birth",
        "profiles.gender",
        "profiles.is_veteran",
        "profiles.orientation",
        "profiles.where_lives",
      ])
      .execute()

    const demographics = calculateDemographics(result)
    return demographics
  },
)

export const updateParticipantVsEvent = applySchema(
  updateParticipantVsEventSchema,
)(async (formData) => {
  const { intent, event_id, profile_id, ...data } = formData

  return await kysely
    .updateTable("event_participants")
    .where("event_id", "=", event_id)
    .where("profile_id", "=", profile_id)
    .set(data)
    .execute()
})

export const updateEventParticipantById = applySchema(
  updateEventParticipantByIdSchema,
)(async (formData) => {
  const { intent, id, ...data } = formData

  return await kysely
    .updateTable("event_participants")
    .where("id", "=", id)
    .set(data)
    .execute()
})
