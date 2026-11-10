import { applySchema, composable } from "composable-functions"
import { sql } from "kysely"
import { db } from "~/lib/supabase/db.server"
import { logger } from "~/lib/logger/logger.server"
import type {
  GetAllProfilesFilters,
  ParticipantEventHistoryData,
  ProfileApprovedToAttendStatus,
  ProfileFlagStatus,
  ProfileGlobal,
} from "~types/database/entities.types"
import {
  updateProfileAdminNotesSchema,
  updateProfileApprovalStatusSchema,
} from "./profile-schemas"
import { syncVeteransListmonkList } from "../newsletter/veterans-list.server"
import { participantHistoryFields } from "../application/event-participants.server"
import type { DBClient } from "~types/utils/utils.types"

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

export const findOrphanedProfile = async (supabase: DBClient, email: string) =>
  supabase
    .from("profiles")
    .select("*")
    .eq("email", email)
    .is("user_id", null)
    .single()
