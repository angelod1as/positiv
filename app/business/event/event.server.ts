import { applySchema, composable } from "composable-functions"
import { sql } from "kysely"
import { can, PERMISSIONS } from "~/business/auth/permissions"
import { adminEventsCopy } from "~/copy/admin/events"
import { db } from "~/lib/supabase/db.server"
import { schemaValuesToDB } from "~/lib/helpers/db-values-to-form-schema"
import { logger } from "~/lib/logger/logger.server"
import { adminContextSchema } from "../auth/auth-schemas"
import {
  eventFormSchema,
  updateEventDemographicsSchema,
  updateEventStatusSchema,
} from "./event-schemas"
import {
  deleteEventListmonkList,
  updateEventListmonkList,
} from "../newsletter/event-listmonk-sync.server"
import { syncVeteransListmonkList } from "../newsletter/veterans-list.server"

export const getEventsForDashboard = async () => {
  const events = await db
    .selectFrom("events")
    .selectAll()
    .orderBy("time_event_start", "desc")
    .execute()

  return events
}

export const getAdminEventById = composable(
  async ({ eventId }: { eventId: string }) => {
    return await db
      .selectFrom("events")
      .selectAll()
      .where("id", "=", eventId)
      .executeTakeFirstOrThrow()
  },
)

export const createOrUpdateEvent = applySchema(
  eventFormSchema,
  adminContextSchema,
)(async (values, context) => {
  const { currentProfile, eventId } = context

  // The admin panel is not the same grant as managing events, even if only
  // the admin role holds either today.
  if (!can(currentProfile, PERMISSIONS.EVENTS_MANAGE)) {
    throw new Error(adminEventsCopy.saveFailed)
  }

  const parsedValues = schemaValuesToDB(values)

  const saved = await (eventId
    ? db
        .updateTable("events")
        .set(parsedValues)
        .where("id", "=", eventId)
        .returning("id")
        .executeTakeFirst()
    : db
        .insertInto("events")
        .values(parsedValues)
        .returning("id")
        .executeTakeFirst()
  ).catch(() => undefined)

  if (!saved) {
    throw new Error(adminEventsCopy.saveFailed)
  }

  return saved.id
})

export const updateEventStatus = applySchema(
  updateEventStatusSchema,
  adminContextSchema,
)(async (values, context) => {
  const { eventId } = context
  if (!eventId) return null

  // Use transaction to ensure atomicity
  const transactionResult = await db
    .transaction()
    .execute(async (trx) => {
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
          "../reporting/demographics/demographics"
        )
        const demographics = calculateDemographics(participantsResult)

        const { upsertEventDemographicsSnapshot } = await import(
          "./demographics-history.server"
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
        logger.warn("Failed to sync Listmonk list:", {
          eventId,
          errors: syncResult.errors,
        })
      }
    } else if (values.event_status === "Cancelled") {
      // Only delete immediately for Cancelled events
      // Completed events have their lists deleted via cron job after time_group_end
      const syncResult = await deleteEventListmonkList(eventId)
      if (!syncResult.success) {
        logger.warn("Failed to delete Listmonk list:", {
          eventId,
          errors: syncResult.errors,
        })
      }
    } else if (values.event_status === "Completed") {
      const syncResult = await syncVeteransListmonkList()
      if (!syncResult.success) {
        logger.warn("Failed to sync the Veterans Listmonk list:", {
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
  const baseQuery = db
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

  const { calculateDemographics } = await import("../reporting/demographics/demographics")
  const demographics = calculateDemographics(result)

  // Upsert the snapshot
  const { upsertEventDemographicsSnapshot } = await import(
    "./demographics-history.server"
  )
  const snapshotResult = await upsertEventDemographicsSnapshot({
    eventId,
    demographics,
  })

  if (!snapshotResult.success) {
    logger.error("Failed to upsert demographics snapshot for event", {
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
      "./demographics-history.server"
    )
    const historicalResult = await getEventDemographicsHistory({ eventId })

    if (historicalResult.success && historicalResult.data) {
      return historicalResult.data
    }

    return null
  },
)

// Every status but Draft, the same rule as findVisibleEvent.
export const findCalendarEvent = async (eventId: string) =>
  db
    .selectFrom("events")
    .selectAll()
    .where("id", "=", eventId)
    .where("event_status", "!=", "Draft")
    .executeTakeFirst()

export const findEventId = async (eventId: string) =>
  db
    .selectFrom("events")
    .select("id")
    .where("id", "=", eventId)
    .executeTakeFirst()
