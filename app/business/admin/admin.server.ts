import { applySchema, composable } from "composable-functions"
import { sql } from "kysely"
import type { Params } from "react-router"
import type { z } from "zod"
import { kysely } from "~/kysely"
import { schemaValuesToDB } from "~/lib/helpers/db-values-to-form-schema"
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
  updateEventDemographicsSchema,
  updateEventParticipantByIdSchema,
  updateEventStatusSchema,
  updateParticipantVsEventSchema,
} from "./common"
import {
  deleteEventListmonkList,
  updateEventListmonkList,
} from "./event-listmonk-sync.server"

export const getAdminContext = async (
  request: Request,
  params: Params,
): Promise<z.infer<typeof adminContextSchema>> => {
  const context = await getUserContext(request, params)
  return context
}

export const getEventsForDashboard = async () => {
  const events = await kysely
    .selectFrom("events")
    .select([
      "id",
      "title",
      "description",
      "emoji",
      "event_status",
      "location",
      "ticket_price",
      "time_event_start",
      "time_event_end",
      "time_application_start",
      "time_application_end",
      "time_interviews_start",
      "time_interviews_end",
      "time_group_start",
      "time_group_end",
      "time_payment_start",
      "time_payment_end",
    ])
    .orderBy("time_event_start", "desc")
    .limit(50)
    .execute()

  return events
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
    was_admin_skipped_last_event?: boolean | null
    attended_events_count?: number | null
    last_attended_event_title?: string | null
    last_attended_event_date?: string | null
    last_attended_event_id?: string | null
  }

// Main query to get event_participants information along with if they were skipped in the last event
const profilesWithExtraDataQuery = kysely
  .selectFrom("event_participants as current_ep")
  .innerJoin("profiles as p", "current_ep.profile_id", "p.id")
  .innerJoin("events as current_event", "current_ep.event_id", "current_event.id")
  .selectAll(["p", "current_ep"])
  .select((eb) => [
    eb
      .selectFrom("event_participants as ep")
      .innerJoin("events as e", "ep.event_id", "e.id")
      .select(sql<boolean>`ep.attendance_status = 'skipped'`.as("is_skipped"))
      .whereRef("ep.profile_id", "=", "current_ep.profile_id")
      .where("ep.is_user_applied", "=", true)
      .where("ep.application_status", "=", "finalised")
      .whereRef("e.time_event_start", "<", "current_event.time_event_start")
      .orderBy("e.time_event_start", "desc")
      .limit(1)
      .as("was_admin_skipped_last_event"),
    eb
      .selectFrom("event_participants as ep_count")
      .innerJoin("events as e_count", "ep_count.event_id", "e_count.id")
      .select(sql<number>`COUNT(*)::int`.as("count"))
      .whereRef("ep_count.profile_id", "=", "current_ep.profile_id")
      .where("ep_count.attendance_status", "=", "attended")
      .where("ep_count.application_status", "=", "finalised")
      .where("e_count.event_status", "!=", "Cancelled")
      .whereRef("ep_count.event_id", "!=", "current_ep.event_id")
      .as("attended_events_count"),
    eb
      .selectFrom("event_participants as ep_last")
      .innerJoin("events as e_last", "ep_last.event_id", "e_last.id")
      .select("e_last.title")
      .whereRef("ep_last.profile_id", "=", "current_ep.profile_id")
      .where("ep_last.attendance_status", "=", "attended")
      .where("ep_last.application_status", "=", "finalised")
      .where("e_last.event_status", "!=", "Cancelled")
      .whereRef("ep_last.event_id", "!=", "current_ep.event_id")
      .orderBy("e_last.time_event_start", "desc")
      .limit(1)
      .as("last_attended_event_title"),
    eb
      .selectFrom("event_participants as ep_last_date")
      .innerJoin("events as e_last_date", "ep_last_date.event_id", "e_last_date.id")
      .select("e_last_date.time_event_start")
      .whereRef("ep_last_date.profile_id", "=", "current_ep.profile_id")
      .where("ep_last_date.attendance_status", "=", "attended")
      .where("ep_last_date.application_status", "=", "finalised")
      .where("e_last_date.event_status", "!=", "Cancelled")
      .whereRef("ep_last_date.event_id", "!=", "current_ep.event_id")
      .orderBy("e_last_date.time_event_start", "desc")
      .limit(1)
      .as("last_attended_event_date"),
    eb
      .selectFrom("event_participants as ep_last_id")
      .innerJoin("events as e_last_id", "ep_last_id.event_id", "e_last_id.id")
      .select("e_last_id.id")
      .whereRef("ep_last_id.profile_id", "=", "current_ep.profile_id")
      .where("ep_last_id.attendance_status", "=", "attended")
      .where("ep_last_id.application_status", "=", "finalised")
      .where("e_last_id.event_status", "!=", "Cancelled")
      .whereRef("ep_last_id.event_id", "!=", "current_ep.event_id")
      .orderBy("e_last_id.time_event_start", "desc")
      .limit(1)
      .as("last_attended_event_id"),
  ])

export const getProfileWithExtraDataById = composable(
  async ({ profileId, eventId }: { profileId: string; eventId: string }) => {
    const profile = await profilesWithExtraDataQuery
      .where("current_ep.profile_id", "=", profileId)
      .where("current_ep.event_id", "=", eventId)
      .where("current_ep.is_user_applied", "=", true)
      .executeTakeFirst()

    if (!profile) {
      throw new Error("No registration found for this profile in this event")
    }

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
    profileId,
    eventId,
  }: {
    profileId: string
    eventId: string
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
      .where("event_participants.profile_id", "=", profileId)
      .where("event_participants.event_id", "=", eventId)
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
        "profiles.approved_to_attend as approved_to_attend",
      ])
      .where("event_participants.profile_id", "=", profileId)
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
  const transactionResult = await kysely.transaction().execute(async (trx) => {
    // Only calculate and store demographics when status is changing TO Completed
    if (values.event_status === "Completed") {
      // Calculate demographics FIRST, before updating status
      const baseQuery = trx
        .selectFrom("event_participants")
        .where("event_participants.event_id", "=", eventId)
        .where("attendance_status", "=", "attended")

      const participantsResult = await baseQuery
        .innerJoin("profiles", "profiles.id", "event_participants.profile_id")
        .innerJoin("events", "events.id", "event_participants.event_id")
        .select([
          "profiles.date_of_birth",
          "profiles.gender",
          "profiles.orientation",
          "profiles.where_lives",
          "profiles.race_color",
          sql<boolean>`
            CASE
              WHEN profiles.became_veteran_date IS NULL THEN false
              WHEN profiles.became_veteran_date < events.time_event_start THEN true
              ELSE false
            END
          `.as("is_veteran"),
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
          `Failed to store demographics snapshot for event ${eventId}: ${snapshotResult.errors?.join(", ")}`,
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

  // Sync with Listmonk AFTER the transaction completes successfully
  // This is done outside the transaction because it's an external API call
  // and we don't want it to block or fail the status update
  if (transactionResult) {
    if (values.event_status === "Registration Closed") {
      const syncResult = await updateEventListmonkList(eventId)
      if (!syncResult.success) {
        console.error("Failed to sync Listmonk list:", {
          eventId,
          errors: syncResult.errors,
        })
      }
    } else if (values.event_status === "Cancelled") {
      // Only delete immediately for Cancelled events
      // Completed events have their lists deleted via cron job after time_group_end
      const syncResult = await deleteEventListmonkList(eventId)
      if (!syncResult.success) {
        console.error("Failed to delete Listmonk list:", {
          eventId,
          errors: syncResult.errors,
        })
      }
    }
  }

  return transactionResult
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
    .innerJoin("events", "events.id", "event_participants.event_id")
    .select([
      "profiles.date_of_birth",
      "profiles.gender",
      "profiles.orientation",
      "profiles.where_lives",
      "profiles.race_color",
      sql<boolean>`
        CASE
          WHEN profiles.became_veteran_date IS NULL THEN false
          WHEN profiles.became_veteran_date < events.time_event_start THEN true
          ELSE false
        END
      `.as("is_veteran"),
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
