import type { Kysely } from "kysely"
import type { Database } from "~/types/database/kysely.types"

export type UpdateResult = {
  success: boolean
  status_updates: {
    count: number
    updated: string[]
  }
  group_closing_tracking: {
    count: number
    created: string[]
  }
  timestamp: string
}

export async function updateEventStatusesAutomatically(
  kysely: Kysely<Database>
): Promise<UpdateResult> {
  try {
    // Call the database function that handles the automatic updates using raw SQL
    const result = await kysely
      .selectNoFrom((eb) => [
        eb.fn("update_event_statuses_automatically", []).as("result")
      ])
      .executeTakeFirstOrThrow()

    // The database function returns JSONB, which kysely parses for us
    const parsedResult = result.result as UpdateResult

    // Validate the result structure
    if (!parsedResult || typeof parsedResult.success !== 'boolean') {
      throw new Error('Invalid response from database function')
    }

    return parsedResult
  } catch (error) {
    console.error('Failed to update event statuses automatically:', error)
    // Return a safe default result on error
    return {
      success: false,
      status_updates: {
        count: 0,
        updated: [],
      },
      group_closing_tracking: {
        count: 0,
        created: [],
      },
      timestamp: new Date().toISOString()
    }
  }
}