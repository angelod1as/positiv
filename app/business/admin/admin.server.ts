import { applySchema, composable } from "composable-functions"
import { sql } from "kysely"
import type { Params } from "react-router"
import { redirectWithError } from "remix-toast"
import type { z } from "zod"
import { formatReminderMail } from "~/business/email/format-reminder-mail"
import { sendEmail, type MailOptions } from "~/business/email/send-email"
import { kysely } from "~/kysely"
import { chunkArray } from "~/lib/helpers/chunk-array"
import { schemaValuesToDB } from "~/lib/helpers/db-values-to-form-schema"
import paths from "~/lib/paths"
import type {
  EventParticipant,
  ParticipantVsEvent,
  Profile,
  ProfileApprovedToAttendStatus,
  ProfileFlagStatus,
} from "~types/database/entities.types"
import { getUserContext } from "../auth/auth.server"
import {
  adminContextSchema,
  eventFormSchema,
  sendEventRemindersSchema,
  updateEventDemographicsSchema,
  updateEventParticipantByIdSchema,
  updateEventStatusSchema,
  updateParticipantVsEventSchema,
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
    was_admin_skipped_last_event?: boolean
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
          "ep.application_status",
          "ep.attendance_status",
          "ep.has_paid",
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
    sql<boolean>`ranked_events.attendance_status = 'skipped'`.as(
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
      .innerJoin("profiles", "profiles.id", "event_participants.profile_id")
      .selectAll("event_participants")
      .select([
        "events.title as event_title",
        "events.emoji as event_emoji",
        "profiles.is_veteran as is_veteran",
        "profiles.approved_to_attend as approved_to_attend",
        "profiles.flag as flag",
        "profiles.flag_notes as flag_notes",
      ])
      .where("event_participants.id", "=", eventParticipantId)
      .where("is_user_applied", "=", true)
      .orderBy("events.time_event_start", "desc")
      .execute()
  },
)

export const getParticipantFullEventHistory = composable(
  async ({
    profileId,
    excludeEventId,
  }: {
    profileId: string
    excludeEventId?: string
  }): Promise<Array<ParticipantVsEvent & { time_event_start: string }>> => {
    let query = kysely
      .selectFrom("event_participants")
      .innerJoin("events", "events.id", "event_participants.event_id")
      .innerJoin("profiles", "profiles.id", "event_participants.profile_id")
      .selectAll("event_participants")
      .select([
        "events.title as event_title",
        "events.emoji as event_emoji",
        "events.time_event_start as time_event_start",
        "profiles.is_veteran as is_veteran",
      ])
      .where("event_participants.profile_id", "=", profileId)
      .where("is_user_applied", "=", true)
      .orderBy("events.time_event_start", "desc")

    if (excludeEventId) {
      query = query.where("event_participants.event_id", "!=", excludeEventId)
    }

    const results = await query.execute()
    // Filter out results with null time_event_start since we need it for sorting
    return results.filter(
      (r): r is ParticipantVsEvent & { time_event_start: string } =>
        r.time_event_start !== null,
    )
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
      event_type: values.event_type as "regular" | "bdsm",
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

  // Use transaction to ensure atomicity
  return await kysely.transaction().execute(async (trx) => {
    // Only calculate and store demographics when status is changing TO Completed
    if (values.event_status === "Completed") {
      // Calculate demographics FIRST, before updating status
      const baseQuery = trx
        .selectFrom("event_participants")
        .where("event_participants.event_id", "=", eventId)
        .where("attendance_status", "=", "attended")

      const participantsResult = await baseQuery
        .innerJoin("profiles", "profiles.id", "event_participants.profile_id")
        .select([
          "profiles.date_of_birth",
          "profiles.gender",
          "profiles.is_veteran",
          "profiles.orientation",
          "profiles.where_lives",
        ])
        .execute()

      const { calculateDemographics } = await import(
        "./demographics/demographics"
      )
      const demographics = calculateDemographics(participantsResult)

      const { upsertEventDemographicsSnapshot } = await import(
        "./demographics/demographics-history.server"
      )
      
      // Store demographics snapshot using the transaction
      const snapshotResult = await upsertEventDemographicsSnapshot({
        eventId,
        demographics,
        trx,
      })

      if (!snapshotResult.success) {
        // If demographics calculation fails, throw error to rollback transaction
        throw new Error(
          `Failed to store demographics snapshot for event ${eventId}: ${snapshotResult.errors?.join(", ")}`
        )
      }
    }

    // Update event status AFTER demographics are successfully stored
    const result = await trx
      .updateTable("events")
      .set({
        event_status: values.event_status,
      })
      .where("id", "=", eventId)
      .execute()

    return result.length > 0
  })
})

export const updateEventDemographics = applySchema(
  updateEventDemographicsSchema,
  adminContextSchema,
)(async (_values, context) => {
  const { eventId } = context
  if (!eventId) return null

  // Check if event is completed
  const eventResult = await getAdminEventById({ eventId })
  if (!eventResult.success || eventResult.data.event_status !== "Completed") {
    throw new Error("Demographics can only be updated for completed events")
  }

  // Calculate current demographics from database
  const baseQuery = kysely
    .selectFrom("event_participants")
    .where("event_participants.event_id", "=", eventId)
    .where("attendance_status", "=", "attended")

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

  const { calculateDemographics } = await import("./demographics/demographics")
  const demographics = calculateDemographics(result)

  // Upsert the snapshot
  const { upsertEventDemographicsSnapshot } = await import(
    "./demographics/demographics-history.server"
  )
  const snapshotResult = await upsertEventDemographicsSnapshot({
    eventId,
    demographics,
  })

  if (!snapshotResult.success) {
    console.error("Failed to upsert demographics snapshot for event", {
      eventId,
      errors: snapshotResult.errors,
    })
    throw new Error("Failed to update demographics snapshot")
  }

  return snapshotResult.data
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
    const { getEventDemographicsHistory } = await import(
      "./demographics/demographics-history.server"
    )
    const historicalResult = await getEventDemographicsHistory({ eventId })

    if (historicalResult.success && historicalResult.data) {
      return historicalResult.data
    }

    return null
  },
)

export const updateParticipantVsEvent = applySchema(
  updateParticipantVsEventSchema,
)(async (formData) => {
  const {
    intent,
    event_id,
    profile_id,
    is_veteran,
    approved_to_attend,
    flag,
    flag_notes,
    ...data
  } = formData

  return await kysely.transaction().execute(async (transaction) => {
    await transaction
      .updateTable("event_participants")
      .where("event_id", "=", event_id)
      .where("profile_id", "=", profile_id)
      .set(data)
      .execute()

    const profileUpdateData: {
      is_veteran?: boolean
      approved_to_attend?: ProfileApprovedToAttendStatus
      flag?: ProfileFlagStatus
      flag_notes?: string
    } = {}

    if (typeof is_veteran === "boolean") {
      profileUpdateData.is_veteran = is_veteran
    }

    if (approved_to_attend) {
      profileUpdateData.approved_to_attend = approved_to_attend
    }

    if (flag) profileUpdateData.flag = flag
    if (flag_notes) profileUpdateData.flag_notes = flag_notes

    if (Object.keys(profileUpdateData).length > 0) {
      await transaction
        .updateTable("profiles")
        .where("id", "=", profile_id)
        .set(profileUpdateData)
        .execute()
    }
  })
})

export const updateEventParticipantById = applySchema(
  updateEventParticipantByIdSchema,
)(async (formData) => {
  const {
    intent,
    id,
    profile_id,
    is_veteran,
    approved_to_attend,
    flag,
    flag_notes,
    ...data
  } = formData

  return await kysely.transaction().execute(async (transaction) => {
    if (
      typeof is_veteran === "boolean" ||
      !!approved_to_attend ||
      flag !== undefined ||
      flag_notes !== undefined
    ) {
      const profileUpdates: Record<string, string | boolean | null> = {}
      if (typeof is_veteran === "boolean")
        profileUpdates.is_veteran = is_veteran
      if (approved_to_attend)
        profileUpdates.approved_to_attend = approved_to_attend
      if (flag !== undefined) profileUpdates.flag = flag
      if (flag_notes !== undefined) profileUpdates.flag_notes = flag_notes

      await transaction
        .updateTable("profiles")
        .where("id", "=", profile_id)
        .set(profileUpdates)
        .execute()
    }

    const notAllUndefined = Object.values(data).some(
      (value) => value !== undefined,
    )

    if (Object.keys(data).length > 0 && notAllUndefined) {
      await transaction
        .updateTable("event_participants")
        .where("id", "=", id)
        .set(data)
        .execute()
    }
  })
})
