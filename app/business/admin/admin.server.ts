import { applySchema, composable } from "composable-functions"
import { can, PERMISSIONS } from "~/business/auth/permissions"
import { sql } from "kysely"
import type { Params } from "react-router"
import { redirectWithError } from "remix-toast"
import type { z } from "zod"
import { adminLayoutCopy } from "~/copy/admin"
import { db } from "~/lib/supabase/db.server"
import paths from "~/lib/paths"
import { logger } from "~/lib/logger/logger.server"
import type {
  EventParticipant,
  EventParticipantWithEvent,
  GetAllProfilesFilters,
  ParticipantEventHistoryData,
  ParticipantPaymentTotals,
  ParticipantVsEvent,
  Profile,
  ProfileApprovedToAttendStatus,
  ProfileFlagStatus,
  ProfileGlobal,
} from "~types/database/entities.types"
import { getUserContext } from "../auth/auth.server"
import {
  adminContextSchema,
  updateEventParticipantByIdSchema,
  updateParticipantVsEventSchema,
  updateProfileAdminNotesSchema,
  updateProfileApprovalStatusSchema,
} from "./common"
import { syncVeteransListmonkList } from "../newsletter/veterans-list.server"

const {
  root: { HOME },
} = paths

export const getAdminContext = async (
  request: Request,
  params: Params,
): Promise<z.infer<typeof adminContextSchema>> => {
  const context = await getUserContext(request, params)

  // Actions call this directly because React Router does not run the admin
  // layout loader, which holds the same check, before a child action
  if (!can(context.currentProfile, PERMISSIONS.ADMIN_PANEL)) {
    throw await redirectWithError(HOME, adminLayoutCopy.accessDenied)
  }

  return context
}

export type ProfileWithExtraData = Profile &
  EventParticipant &
  ParticipantPaymentTotals & {
    was_admin_skipped_last_event?: boolean | null
    attended_events_count?: number | null
    last_attended_events_count?: number | null
    last_attended_event_title?: string | null
    last_attended_event_date?: string | null
    last_attended_event_id?: string | null
  }

// The attendance history both admin queries show. The event-scoped one passes
// excludedEventId so the event being viewed never counts towards its own history
const participantHistoryFields = ({
  profileId,
  excludedEventId,
}: {
  profileId: "current_ep.profile_id" | "p.id"
  excludedEventId?: "current_ep.event_id"
}) => {
  const profile = sql.ref<string>(profileId)
  const excludedEvent =
    excludedEventId === undefined ? undefined : sql.ref<string>(excludedEventId)

  return [
    db
      .selectFrom("event_participants as ep_count")
      .innerJoin("events as e_count", "ep_count.event_id", "e_count.id")
      .select(sql<number>`COALESCE(COUNT(*)::int, 0)`.as("count"))
      .where("ep_count.profile_id", "=", profile)
      .where("ep_count.attendance_status", "=", "attended")
      .where("ep_count.application_status", "=", "finalised")
      .where("e_count.event_status", "!=", "Cancelled")
      .$call((qb) =>
        excludedEvent ? qb.where("ep_count.event_id", "!=", excludedEvent) : qb,
      )
      .as("attended_events_count"),
    db
      .selectFrom("event_participants as ep_last")
      .innerJoin("events as e_last", "ep_last.event_id", "e_last.id")
      .select("e_last.title")
      .where("ep_last.profile_id", "=", profile)
      .where("ep_last.attendance_status", "=", "attended")
      .where("ep_last.application_status", "=", "finalised")
      .where("e_last.event_status", "!=", "Cancelled")
      .$call((qb) =>
        excludedEvent ? qb.where("ep_last.event_id", "!=", excludedEvent) : qb,
      )
      .orderBy("e_last.time_event_start", "desc")
      .limit(1)
      .as("last_attended_event_title"),
    db
      .selectFrom("event_participants as ep_last_date")
      .innerJoin(
        "events as e_last_date",
        "ep_last_date.event_id",
        "e_last_date.id",
      )
      .select("e_last_date.time_event_start")
      .where("ep_last_date.profile_id", "=", profile)
      .where("ep_last_date.attendance_status", "=", "attended")
      .where("ep_last_date.application_status", "=", "finalised")
      .where("e_last_date.event_status", "!=", "Cancelled")
      .$call((qb) =>
        excludedEvent
          ? qb.where("ep_last_date.event_id", "!=", excludedEvent)
          : qb,
      )
      .orderBy("e_last_date.time_event_start", "desc")
      .limit(1)
      .as("last_attended_event_date"),
    db
      .selectFrom("event_participants as ep_last_id")
      .innerJoin("events as e_last_id", "ep_last_id.event_id", "e_last_id.id")
      .select("e_last_id.id")
      .where("ep_last_id.profile_id", "=", profile)
      .where("ep_last_id.attendance_status", "=", "attended")
      .where("ep_last_id.application_status", "=", "finalised")
      .where("e_last_id.event_status", "!=", "Cancelled")
      .$call((qb) =>
        excludedEvent
          ? qb.where("ep_last_id.event_id", "!=", excludedEvent)
          : qb,
      )
      .orderBy("e_last_id.time_event_start", "desc")
      .limit(1)
      .as("last_attended_event_id"),
    db
      .selectFrom("event_participants as ep_recent")
      .innerJoin("events as e_recent", "ep_recent.event_id", "e_recent.id")
      .select(sql<number>`COALESCE(COUNT(*)::int, 0)`.as("count"))
      .where("ep_recent.profile_id", "=", profile)
      .where("ep_recent.attendance_status", "=", "attended")
      .where("ep_recent.application_status", "=", "finalised")
      .where("e_recent.event_status", "!=", "Cancelled")
      .$call((qb) =>
        excludedEvent
          ? qb.where("ep_recent.event_id", "!=", excludedEvent)
          : qb,
      )
      .where("ep_recent.event_id", "in", (subEb) =>
        subEb
          .selectFrom("events as e_top")
          .select("e_top.id")
          .where("e_top.event_status", "=", "Completed")
          .$call((qb) =>
            excludedEvent ? qb.where("e_top.id", "!=", excludedEvent) : qb,
          )
          .orderBy("e_top.time_event_start", "desc")
          .limit(6),
      )
      // Going through the rodízio restarts the count: an attendance only counts
      // when no rodízio skip happened at or after its event
      .where((recentEb) =>
        recentEb.not(
          recentEb.exists(
            recentEb
              .selectFrom("event_participants as ep_reset")
              .innerJoin("events as e_reset", "ep_reset.event_id", "e_reset.id")
              .select("ep_reset.id")
              .whereRef("ep_reset.profile_id", "=", "ep_recent.profile_id")
              .where("ep_reset.attendance_status", "=", "skipped")
              .where("ep_reset.was_selected_for_rotation", "=", true)
              .where("e_reset.event_status", "=", "Completed")
              .whereRef(
                "e_reset.time_event_start",
                ">=",
                "e_recent.time_event_start",
              ),
          ),
        ),
      )
      .as("last_attended_events_count"),
  ]
}

// Main query to get event_participants information along with if they were skipped in the last event
const profilesWithExtraDataQuery = db
  .selectFrom("event_participants as current_ep")
  .innerJoin("profiles as p", "current_ep.profile_id", "p.id")
  .innerJoin(
    "events as current_event",
    "current_ep.event_id",
    "current_event.id",
  )
  .leftJoin(
    "event_participant_payments as epp",
    "epp.event_participant_id",
    "current_ep.id",
  )
  .selectAll(["p", "current_ep"])
  .select([
    sql<number>`coalesce(epp.paid_gross, 0)`.as("paid_gross"),
    sql<number>`coalesce(epp.net, 0)`.as("net"),
    sql<number>`coalesce(epp.refunded, 0)`.as("refunded"),
    "epp.current_status as payment_status",
    "epp.active_payment_id",
  ])
  .select((eb) => [
    eb
      .selectFrom("event_participants as ep")
      .innerJoin("events as e", "ep.event_id", "e.id")
      .select("ep.was_selected_for_rotation")
      .whereRef("ep.profile_id", "=", "current_ep.profile_id")
      .where("ep.is_user_applied", "=", true)
      .where("ep.application_status", "=", "finalised")
      .whereRef("e.time_event_start", "<", "current_event.time_event_start")
      .orderBy("e.time_event_start", "desc")
      .limit(1)
      .as("was_admin_skipped_last_event"),
    ...participantHistoryFields({
      profileId: "current_ep.profile_id",
      excludedEventId: "current_ep.event_id",
    }),
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

export const profilesWithExtraDataByIdQuery = (eventId: string) =>
  profilesWithExtraDataQuery
    .where("current_ep.event_id", "=", eventId)
    .where("current_ep.is_user_applied", "=", true)
    .where("p.approved_to_attend", "!=", "rejected")

export const getProfilesWithExtraDataById = composable(
  async ({ eventId }: { eventId: string }) => {
    const profiles = await profilesWithExtraDataByIdQuery(eventId).execute()

    return profiles
  },
)

export type RejectedEventParticipant = {
  profile_id: string
  social_name: string | null
  full_name: string | null
}

export async function getRejectedEventParticipants(
  eventId: string,
): Promise<RejectedEventParticipant[]> {
  return db
    .selectFrom("event_participants as ep")
    .innerJoin("profiles as p", "ep.profile_id", "p.id")
    .select(["p.id as profile_id", "p.social_name", "p.full_name"])
    .where("ep.event_id", "=", eventId)
    .where("ep.is_user_applied", "=", true)
    .where("p.approved_to_attend", "=", "rejected")
    .execute()
}

const globalProfileBaseQuery = db
  .selectFrom("profiles as p")
  .selectAll("p")
  .select(participantHistoryFields({ profileId: "p.id" }))

export const getAllProfiles = composable(
  async (filters?: GetAllProfilesFilters): Promise<ProfileGlobal[]> => {
    let query = globalProfileBaseQuery
      // Only show profiles that have completed basic data (excludes users who never filled their profile)
      .where("p.basic_data_filled", "=", true)

    if (filters?.gender?.length) {
      query = query.where(({ eb }) =>
        eb(sql`p.gender`, "&&", sql`${sql.val(filters.gender)}::text[]`),
      )
    }
    if (filters?.orientation?.length) {
      query = query.where(({ eb }) =>
        eb(
          sql`p.orientation`,
          "&&",
          sql`${sql.val(filters.orientation)}::text[]`,
        ),
      )
    }
    if (filters?.is_veteran !== undefined) {
      query = query.where("p.is_veteran", "=", filters.is_veteran)
    }
    if (filters?.flag?.length) {
      query = query.where("p.flag", "in", filters.flag)
    }
    if (filters?.where_lives) {
      query = query.where("p.where_lives", "ilike", `%${filters.where_lives}%`)
    }
    if (filters?.approved_to_attend?.length) {
      query = query.where(
        "p.approved_to_attend",
        "in",
        filters.approved_to_attend,
      )
    }

    // Order by newest profiles first for better UX when viewing recently registered users
    query = query.orderBy("p.created_at", "desc")

    // Pagination
    if (filters?.limit !== undefined) {
      query = query.limit(filters.limit)
    }
    if (filters?.offset !== undefined) {
      query = query.offset(filters.offset)
    }

    return await query.execute()
  },
)

export const getRecentProfiles = async () => {
  const result = await getAllProfiles({ limit: 10 })
  if (!result.success) {
    return []
  }
  return result.data
}

export const getAdminProfileById = composable(
  async ({ profileId }: { profileId: string }) => {
    return await db
      .selectFrom("profiles")
      .selectAll()
      .where("id", "=", profileId)
      .executeTakeFirstOrThrow()
  },
)

export const getProfileById = composable(
  async ({ profileId }: { profileId: string }): Promise<ProfileGlobal> => {
    return globalProfileBaseQuery
      .where("p.id", "=", profileId)
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
    return await db
      .selectFrom("event_participants")
      .innerJoin("events", "events.id", "event_participants.event_id")
      .innerJoin("profiles", "profiles.id", "event_participants.profile_id")
      .leftJoin(
        "event_participant_payments as epp",
        "epp.event_participant_id",
        "event_participants.id",
      )
      .selectAll("event_participants")
      .select([
        "events.title as event_title",
        "events.emoji as event_emoji",
        "profiles.is_veteran as is_veteran",
        "profiles.approved_to_attend as approved_to_attend",
        "profiles.flag as flag",
        "profiles.flag_notes as flag_notes",
      ])
      .select([
        sql<number>`coalesce(epp.paid_gross, 0)`.as("paid_gross"),
        sql<number>`coalesce(epp.net, 0)`.as("net"),
        sql<number>`coalesce(epp.refunded, 0)`.as("refunded"),
        "epp.current_status as payment_status",
        "epp.active_payment_id",
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
  }): Promise<Array<ParticipantEventHistoryData>> => {
    let query = db
      .selectFrom("event_participants")
      .innerJoin("events", "events.id", "event_participants.event_id")
      .innerJoin("profiles", "profiles.id", "event_participants.profile_id")
      .leftJoin(
        "event_participant_payments as epp",
        "epp.event_participant_id",
        "event_participants.id",
      )
      .selectAll("event_participants")
      .select([
        "events.title as event_title",
        "events.emoji as event_emoji",
        "events.time_event_start as time_event_start",
        "events.ticket_price as ticket_price",
        "profiles.is_veteran as is_veteran",
        "profiles.approved_to_attend as approved_to_attend",
      ])
      .select([
        sql<number>`coalesce(epp.paid_gross, 0)`.as("paid_gross"),
        sql<number>`coalesce(epp.net, 0)`.as("net"),
        sql<number>`coalesce(epp.refunded, 0)`.as("refunded"),
        "epp.current_status as payment_status",
        "epp.active_payment_id",
      ])
      .where("event_participants.profile_id", "=", profileId)
      .orderBy("events.time_event_start", "desc")

    if (excludeEventId) {
      query = query.where("event_participants.event_id", "!=", excludeEventId)
    }

    const results = await query.execute()
    // Filter out results with null time_event_start since we need it for sorting
    return results.filter(
      (r): r is ParticipantEventHistoryData => r.time_event_start !== null,
    )
  },
)

export const updateParticipantVsEvent = applySchema(
  updateParticipantVsEventSchema,
)(async (formData) => {
  const { intent, event_id, profile_id, ...data } = formData

  await db
    .updateTable("event_participants")
    .where("event_id", "=", event_id)
    .where("profile_id", "=", profile_id)
    .set(data)
    .execute()
})

export const updateEventParticipantById = applySchema(
  updateEventParticipantByIdSchema,
)(async (formData) => {
  const { id, profile_id, is_veteran, flag, flag_notes, approved_to_attend, ...data } =
    formData

  const result = await db.transaction().execute(async (transaction) => {
    if (
      typeof is_veteran === "boolean" ||
      flag !== undefined ||
      flag_notes !== undefined ||
      approved_to_attend !== undefined
    ) {
      const profileUpdates: Record<string, string | boolean | null> = {}
      if (typeof is_veteran === "boolean")
        profileUpdates.is_veteran = is_veteran
      if (flag !== undefined) profileUpdates.flag = flag
      if (flag_notes !== undefined) profileUpdates.flag_notes = flag_notes
      if (approved_to_attend !== undefined)
        profileUpdates.approved_to_attend = approved_to_attend

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

  if (typeof is_veteran === "boolean") {
    const syncResult = await syncVeteransListmonkList()
    if (!syncResult.success) {
      logger.warn("Failed to sync the Veterans Listmonk list:", {
        profile_id,
        errors: syncResult.errors,
      })
    }
  }

  return result
})

export const updateProfileApprovalStatus = applySchema(
  updateProfileApprovalStatusSchema,
)(async (formData) => {
  const { profile_id, approved_to_attend } = formData

  const result = await db
    .updateTable("profiles")
    .where("id", "=", profile_id)
    .set({ approved_to_attend })
    .execute()

  if (result.length === 0 || Number(result[0].numUpdatedRows) === 0) {
    throw new Error("Failed to update profile approval status")
  }

  return { profile_id, approved_to_attend }
})

export const getEventParticipantBasic = composable(
  async ({
    profileId,
    eventId,
  }: {
    profileId: string
    eventId: string
  }): Promise<EventParticipantWithEvent | null> => {
    const result = await db
      .selectFrom("event_participants")
      .innerJoin("events", "events.id", "event_participants.event_id")
      .leftJoin(
        "event_participant_payments as epp",
        "epp.event_participant_id",
        "event_participants.id",
      )
      .selectAll("event_participants")
      .select([
        "events.title as event_title",
        "events.emoji as event_emoji",
        "events.ticket_price as event_ticket_price",
      ])
      .select([
        sql<number>`coalesce(epp.paid_gross, 0)`.as("paid_gross"),
        sql<number>`coalesce(epp.net, 0)`.as("net"),
        sql<number>`coalesce(epp.refunded, 0)`.as("refunded"),
        "epp.current_status as payment_status",
        "epp.active_payment_id",
      ])
      .where("event_participants.profile_id", "=", profileId)
      .where("event_participants.event_id", "=", eventId)
      .executeTakeFirst()

    return result ?? null
  },
)

export const updateProfileAdminNotes = applySchema(
  updateProfileAdminNotesSchema,
)(async (formData) => {
  const {
    profile_id,
    flag,
    flag_notes,
    general_notes,
    is_veteran,
    approved_to_attend,
  } = formData

  const updateData: {
    flag?: ProfileFlagStatus
    flag_notes?: string | null
    general_notes?: string | null
    is_veteran?: boolean
    approved_to_attend?: ProfileApprovedToAttendStatus
  } = {}

  if (flag !== undefined) updateData.flag = flag
  if (flag_notes !== undefined) updateData.flag_notes = flag_notes
  if (general_notes !== undefined) updateData.general_notes = general_notes
  if (is_veteran !== undefined) updateData.is_veteran = is_veteran
  if (approved_to_attend !== undefined)
    updateData.approved_to_attend = approved_to_attend

  if (Object.keys(updateData).length === 0) {
    return { profile_id }
  }

  const result = await db
    .updateTable("profiles")
    .where("id", "=", profile_id)
    .set(updateData)
    .execute()

  if (result.length === 0 || Number(result[0].numUpdatedRows) === 0) {
    throw new Error("Failed to update profile admin notes")
  }

  if (is_veteran !== undefined) {
    const syncResult = await syncVeteransListmonkList()
    if (!syncResult.success) {
      logger.warn("Failed to sync the Veterans Listmonk list:", {
        profile_id,
        errors: syncResult.errors,
      })
    }
  }

  return { profile_id, ...updateData }
})
