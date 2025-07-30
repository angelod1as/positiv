import type { Kysely, Selectable, Insertable } from "kysely"
import type { Database } from "~/types/database/kysely.types"
import type { Database as DatabaseTypes } from "~/types/database/database.types"

interface TrackedEntity {
  table: string
  id: string
}

export class TestDataTracker {
  private trackedData: TrackedEntity[] = []

  track(table: string, id: string): void {
    this.trackedData.push({ table, id })
  }

  getTrackedData(): TrackedEntity[] {
    return [...this.trackedData]
  }

  getTrackedDataForCleanup(): TrackedEntity[] {
    return [...this.trackedData].reverse()
  }

  clear(): void {
    this.trackedData = []
  }
}

export async function cleanupTestData(
  tracker: TestDataTracker,
  kysely: Kysely<Database>
): Promise<void> {
  const dataToCleanup = tracker.getTrackedDataForCleanup()
  
  for (const { table, id } of dataToCleanup) {
    try {
      // Handle each table type separately for type safety
      switch (table) {
        case "event_participants":
          await kysely.deleteFrom("event_participants").where("id", "=", id).execute()
          break
        case "events":
          await kysely.deleteFrom("events").where("id", "=", id).execute()
          break
        case "profiles":
          await kysely.deleteFrom("profiles").where("id", "=", id).execute()
          break
        default:
          console.warn(`Unknown table type: ${table}`)
      }
    } catch (error) {
      console.error(`Failed to delete ${table} with id ${id}:`, error)
    }
  }
  
  tracker.clear()
}

interface TestProfileData {
  user_id: string
  email: string
  [key: string]: unknown
}

export async function createTestProfile(
  tracker: TestDataTracker,
  kysely: Kysely<Database>,
  data: TestProfileData
): Promise<Selectable<DatabaseTypes["public"]["Tables"]["profiles"]["Row"]>> {
  const profile = await kysely
    .insertInto("profiles")
    .values(data as Insertable<DatabaseTypes["public"]["Tables"]["profiles"]["Row"]>)
    .returningAll()
    .executeTakeFirstOrThrow()
  
  tracker.track("profiles", profile.id)
  return profile
}

interface TestEventData {
  title: string
  [key: string]: unknown
}

export async function createTestEvent(
  tracker: TestDataTracker,
  kysely: Kysely<Database>,
  data: TestEventData
): Promise<Selectable<DatabaseTypes["public"]["Tables"]["events"]["Row"]>> {
  const event = await kysely
    .insertInto("events")
    .values(data as Insertable<DatabaseTypes["public"]["Tables"]["events"]["Row"]>)
    .returningAll()
    .executeTakeFirstOrThrow()
  
  tracker.track("events", event.id)
  return event
}

export async function createTestEventParticipant(
  tracker: TestDataTracker,
  kysely: Kysely<Database>,
  data: {
    profile_id: string
    event_id: string
    [key: string]: unknown
  }
): Promise<Selectable<DatabaseTypes["public"]["Tables"]["event_participants"]["Row"]>> {
  const participant = await kysely
    .insertInto("event_participants")
    .values(data as Insertable<DatabaseTypes["public"]["Tables"]["event_participants"]["Row"]>)
    .returningAll()
    .executeTakeFirstOrThrow()
  
  tracker.track("event_participants", participant.id)
  return participant
}