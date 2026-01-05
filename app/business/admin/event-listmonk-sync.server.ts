import { composable } from "composable-functions"
import { z } from "zod"
import { kysely } from "~/kysely"
import {
  participantApplicationStatusEnum,
  participantAttendanceStatusEnum,
  profileApprovedToAttendStatusEnum,
} from "~/types/database/entities.types"
import { createList, deleteList, getListById, getListSubscribers } from "../newsletter/listmonk-lists.server"
import { addSubscriber, addSubscribersToListBulk, removeSubscriberFromList } from "../newsletter/listmonk-client.server"
import { updateSyncStatus } from "../newsletter/subscription-helpers.server"

export const listmonkSyncFiltersSchema = z.object({
  approvalStatuses: z.array(profileApprovedToAttendStatusEnum).optional(),
  applicationStatuses: z.array(participantApplicationStatusEnum).optional(),
  attendanceStatuses: z.array(participantAttendanceStatusEnum).optional(),
})

export type ListmonkSyncFilters = z.infer<typeof listmonkSyncFiltersSchema>

export interface SyncResult {
  listId: number
  subscribersAdded: number
  subscribersFailed: number
  subscribersRemoved: number
}

interface EventWithListmonk {
  id: string
  title: string | null
  listmonk_list_id: number | null
  listmonk_list_synced_at: string | null
}

async function getEventById(eventId: string): Promise<EventWithListmonk> {
  return await kysely
    .selectFrom("events")
    .select(["id", "title", "listmonk_list_id", "listmonk_list_synced_at"])
    .where("id", "=", eventId)
    .executeTakeFirstOrThrow()
}

async function getNonRejectedParticipants(
  eventId: string,
  filters?: ListmonkSyncFilters
) {
  let query = kysely
    .selectFrom("event_participants as ep")
    .innerJoin("profiles as p", "ep.profile_id", "p.id")
    .leftJoin("newsletter_subscriptions as ns", "ns.profile_id", "p.id")
    .select([
      "p.id as profile_id",
      "p.email",
      "p.social_name",
      "p.full_name",
      "p.approved_to_attend",
      "ns.listmonk_subscriber_id",
    ])
    .where("ep.event_id", "=", eventId)

  if (
    (filters?.approvalStatuses && filters.approvalStatuses.length === 0) ||
    (filters?.applicationStatuses && filters.applicationStatuses.length === 0) ||
    (filters?.attendanceStatuses && filters.attendanceStatuses.length === 0)
  ) {
    return []
  }

  if (filters?.approvalStatuses) {
    query = query.where("p.approved_to_attend", "in", filters.approvalStatuses)
  } else {
    query = query.where("p.approved_to_attend", "!=", "rejected")
  }

  if (filters?.applicationStatuses) {
    query = query.where("ep.application_status", "in", filters.applicationStatuses)
  }

  if (filters?.attendanceStatuses) {
    query = query.where("ep.attendance_status", "in", filters.attendanceStatuses)
  }

  return await query.execute()
}

async function updateEventListmonkFields(
  eventId: string,
  listmonkListId: number | null,
  syncedAt: Date | null
) {
  await kysely
    .updateTable("events")
    .set({
      listmonk_list_id: listmonkListId,
      listmonk_list_synced_at: syncedAt?.toISOString() ?? null,
    })
    .where("id", "=", eventId)
    .execute()
}

/**
 * Add participants to a Listmonk list using the bulk API when possible.
 * - Participants WITH existing listmonk_subscriber_id: Added via bulk API (single call)
 * - Participants WITHOUT listmonk_subscriber_id: Created individually (new subscribers)
 */
async function addParticipantsToList(
  participants: Array<{
    profile_id: string
    email: string
    social_name: string | null
    full_name: string | null
    approved_to_attend: string | null
    listmonk_subscriber_id: number | null
  }>,
  listId: number
) {
  let subscribersAdded = 0
  let subscribersFailed = 0

  // Separate participants by whether they have an existing Listmonk subscriber ID
  const withSubscriberId = participants.filter(p => p.listmonk_subscriber_id !== null)
  const withoutSubscriberId = participants.filter(p => p.listmonk_subscriber_id === null)

  // BULK ADD: Add existing subscribers to the list in a single API call
  if (withSubscriberId.length > 0) {
    const subscriberIds = withSubscriberId.map(p => p.listmonk_subscriber_id as number)
    const bulkResult = await addSubscribersToListBulk(subscriberIds, listId)

    if (bulkResult.success) {
      subscribersAdded += withSubscriberId.length
    } else {
      // If bulk add fails, fall back to individual adds
      console.warn("Bulk subscriber add failed, falling back to individual adds:", bulkResult.errors)
      for (const participant of withSubscriberId) {
        const name = participant.social_name ?? participant.full_name ?? participant.email
        const result = await addSubscriber({
          email: participant.email,
          name,
          lists: [listId],
          attributes: {
            profile_id: participant.profile_id,
            synced_at: new Date().toISOString(),
          },
        })

        if (result.success) {
          subscribersAdded++
        } else {
          subscribersFailed++
        }
      }
    }
  }

  // INDIVIDUAL ADD: Create new subscribers who don't have a Listmonk ID yet
  for (const participant of withoutSubscriberId) {
    const name = participant.social_name ?? participant.full_name ?? participant.email
    const result = await addSubscriber({
      email: participant.email,
      name,
      lists: [listId],
      attributes: {
        profile_id: participant.profile_id,
        synced_at: new Date().toISOString(),
      },
    })

    if (result.success && result.data) {
      subscribersAdded++
      // Save the new subscriber ID for future bulk operations
      await updateSyncStatus(
        participant.profile_id,
        "synced",
        result.data.subscriberId
      )
    } else {
      subscribersFailed++
    }
  }

  return { subscribersAdded, subscribersFailed }
}

export const createEventListmonkList = composable(
  async (eventId: string, filters?: ListmonkSyncFilters): Promise<SyncResult> => {
    const event = await getEventById(eventId)

    if (event.listmonk_list_id) {
      const result = await updateEventListmonkList(eventId, filters)
      if (!result.success || !result.data) {
        throw new Error(
          result.errors?.[0]?.message || "Failed to sync existing Listmonk list"
        )
      }
      return result.data
    }

    const listResult = await createList({
      name: `Inscrites - ${event.title ?? "Evento sem título"}`,
      type: "private",
      optin: "single",
    })

    if (!listResult.success || !listResult.data) {
      throw new Error(
        listResult.errors?.[0]?.message || "Failed to create Listmonk list"
      )
    }

    const listId = listResult.data.id

    const participants = await getNonRejectedParticipants(eventId, filters)

    const { subscribersAdded, subscribersFailed } = await addParticipantsToList(
      participants,
      listId
    )

    await updateEventListmonkFields(eventId, listId, new Date())

    return {
      listId,
      subscribersAdded,
      subscribersFailed,
      subscribersRemoved: 0,
    }
  }
)

export const deleteEventListmonkList = composable(
  async (eventId: string): Promise<void> => {
    const event = await getEventById(eventId)

    if (!event.listmonk_list_id) {
      await updateEventListmonkFields(eventId, null, null)
      return
    }

    const deleteResult = await deleteList(event.listmonk_list_id)
    if (!deleteResult.success) {
      throw new Error(
        deleteResult.errors?.[0]?.message || "Failed to delete Listmonk list"
      )
    }

    await updateEventListmonkFields(eventId, null, null)
  }
)

async function removeIneligibleSubscribers(
  listId: number,
  eligibleEmails: Set<string>
): Promise<number> {
  const subscribersResult = await getListSubscribers(listId)

  if (!subscribersResult.success || !subscribersResult.data) {
    return 0
  }

  const currentSubscribers = subscribersResult.data
  let removedCount = 0

  for (const subscriber of currentSubscribers) {
    if (!eligibleEmails.has(subscriber.email.toLowerCase())) {
      try {
        await removeSubscriberFromList(subscriber.id, listId)
        removedCount++
      } catch (error) {
        console.error(
          `Failed to remove subscriber ${subscriber.email} from list ${listId}:`,
          error
        )
      }
    }
  }

  return removedCount
}

export const updateEventListmonkList = composable(
  async (eventId: string, filters?: ListmonkSyncFilters): Promise<SyncResult> => {
    const event = await getEventById(eventId)

    if (!event.listmonk_list_id) {
      const result = await createEventListmonkList(eventId, filters)
      if (!result.success || !result.data) {
        throw new Error(
          result.errors?.[0]?.message || "Failed to create Listmonk list"
        )
      }
      return result.data
    }

    const listResult = await getListById(event.listmonk_list_id)

    if (!listResult.success) {
      throw new Error(
        listResult.errors?.[0]?.message || "Failed to get Listmonk list"
      )
    }

    if (!listResult.data) {
      const result = await createEventListmonkList(eventId, filters)
      if (!result.success || !result.data) {
        throw new Error(
          result.errors?.[0]?.message || "Failed to create Listmonk list"
        )
      }
      return result.data
    }

    const participants = await getNonRejectedParticipants(eventId, filters)
    const eligibleEmails = new Set(
      participants
        .map((p) => p.email?.trim())
        .filter((email): email is string => Boolean(email))
        .map((email) => email.toLowerCase())
    )

    const subscribersRemoved = await removeIneligibleSubscribers(
      event.listmonk_list_id,
      eligibleEmails
    )

    const { subscribersAdded, subscribersFailed } = await addParticipantsToList(
      participants,
      event.listmonk_list_id
    )

    await updateEventListmonkFields(eventId, event.listmonk_list_id, new Date())

    return {
      listId: event.listmonk_list_id,
      subscribersAdded,
      subscribersFailed,
      subscribersRemoved,
    }
  }
)

