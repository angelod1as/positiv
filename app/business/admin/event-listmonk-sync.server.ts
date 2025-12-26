import { composable } from "composable-functions"
import { sql } from "kysely"
import { kysely } from "~/kysely"
import { createList, deleteList, getListById } from "../newsletter/listmonk-lists.server"
import { addSubscriber } from "../newsletter/listmonk-client.server"

export interface SyncResult {
  listId: number
  subscribersAdded: number
  subscribersFailed: number
}

export interface StalenessResult {
  isStale: boolean
  staleParticipantCount: number
}

interface EventWithListmonk {
  id: string
  title: string
  listmonk_list_id: number | null
  listmonk_list_synced_at: Date | string | null
}

async function getEventById(eventId: string): Promise<EventWithListmonk> {
  const event = await kysely
    .selectFrom("events")
    .select([
      "id",
      "title",
      sql<number | null>`listmonk_list_id`.as("listmonk_list_id"),
      sql<Date | null>`listmonk_list_synced_at`.as("listmonk_list_synced_at"),
    ])
    .where("id", "=", eventId)
    .executeTakeFirstOrThrow()

  return event as EventWithListmonk
}

async function getNonRejectedParticipants(eventId: string) {
  return await kysely
    .selectFrom("event_participants as ep")
    .innerJoin("profiles as p", "ep.profile_id", "p.id")
    .select([
      "p.id as profile_id",
      "p.email",
      "p.social_name",
      "p.full_name",
      "p.approved_to_attend",
    ])
    .where("ep.event_id", "=", eventId)
    .where("p.approved_to_attend", "!=", "rejected")
    .execute()
}

async function updateEventListmonkFields(
  eventId: string,
  listmonkListId: number | null,
  syncedAt: Date | null
) {
  await sql`
    UPDATE events
    SET listmonk_list_id = ${listmonkListId},
        listmonk_list_synced_at = ${syncedAt}
    WHERE id = ${eventId}
  `.execute(kysely)
}

async function addParticipantsToList(
  participants: Array<{
    profile_id: string
    email: string
    social_name: string | null
    full_name: string | null
    approved_to_attend: string | null
  }>,
  listId: number
) {
  let subscribersAdded = 0
  let subscribersFailed = 0

  for (const participant of participants) {
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

  return { subscribersAdded, subscribersFailed }
}

export const createEventListmonkList = composable(
  async (eventId: string): Promise<SyncResult> => {
    const event = await getEventById(eventId)

    const listResult = await createList({
      name: `Inscrites - ${event.title}`,
      type: "private",
      optin: "single",
    })

    if (!listResult.success || !listResult.data) {
      throw new Error(
        listResult.errors?.[0]?.message || "Failed to create Listmonk list"
      )
    }

    const listId = listResult.data.id

    const participants = await getNonRejectedParticipants(eventId)

    const { subscribersAdded, subscribersFailed } = await addParticipantsToList(
      participants,
      listId
    )

    await updateEventListmonkFields(eventId, listId, new Date())

    return {
      listId,
      subscribersAdded,
      subscribersFailed,
    }
  }
)

export const deleteEventListmonkList = composable(
  async (eventId: string): Promise<void> => {
    const event = await getEventById(eventId)

    if (event.listmonk_list_id) {
      await deleteList(event.listmonk_list_id)
    }

    await updateEventListmonkFields(eventId, null, null)
  }
)

export const updateEventListmonkList = composable(
  async (eventId: string): Promise<SyncResult> => {
    const event = await getEventById(eventId)

    if (!event.listmonk_list_id) {
      const result = await createEventListmonkList(eventId)
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
      const result = await createEventListmonkList(eventId)
      if (!result.success || !result.data) {
        throw new Error(
          result.errors?.[0]?.message || "Failed to create Listmonk list"
        )
      }
      return result.data
    }

    const participants = await getNonRejectedParticipants(eventId)

    const { subscribersAdded, subscribersFailed } = await addParticipantsToList(
      participants,
      event.listmonk_list_id
    )

    await updateEventListmonkFields(eventId, event.listmonk_list_id, new Date())

    return {
      listId: event.listmonk_list_id,
      subscribersAdded,
      subscribersFailed,
    }
  }
)

export const getEventListStaleness = composable(
  async (eventId: string): Promise<StalenessResult> => {
    const event = await getEventById(eventId)

    if (!event.listmonk_list_synced_at) {
      return {
        isStale: false,
        staleParticipantCount: 0,
      }
    }

    const syncTime = new Date(event.listmonk_list_synced_at)

    const result = await sql<{ max_updated_at: Date | null; count: number }>`
      SELECT
        MAX(ep.updated_at) as max_updated_at,
        COUNT(CASE WHEN ep.updated_at > ${syncTime} THEN 1 END)::int as count
      FROM event_participants ep
      INNER JOIN profiles p ON ep.profile_id = p.id
      WHERE ep.event_id = ${eventId}
      AND p.approved_to_attend != 'rejected'
    `.execute(kysely).then(r => r.rows[0])

    if (!result || !result.max_updated_at) {
      return {
        isStale: false,
        staleParticipantCount: 0,
      }
    }

    const maxUpdatedAt = new Date(result.max_updated_at)
    const isStale = maxUpdatedAt > syncTime
    const staleParticipantCount = result.count || 0

    return {
      isStale,
      staleParticipantCount,
    }
  }
)
