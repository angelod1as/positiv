import type { Kysely } from "kysely"
import type { Database } from "~/types/database/kysely.types"

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
      await kysely
        .deleteFrom(table as any)
        .where("id" as any, "=", id)
        .execute()
    } catch (error) {
      console.error(`Failed to delete ${table} with id ${id}:`, error)
    }
  }
  
  tracker.clear()
}

interface TestProfileData {
  user_id: string
  email: string
  [key: string]: any
}

export async function createTestProfile(
  tracker: TestDataTracker,
  kysely: Kysely<Database>,
  data: TestProfileData
): Promise<any> {
  const profile = await kysely
    .insertInto("profiles")
    .values({
      ...data,
      is_test_data: true
    } as any)
    .returning("*" as any)
    .executeTakeFirstOrThrow()
  
  tracker.track("profiles", (profile as any).id)
  return profile
}

interface TestEventData {
  title: string
  [key: string]: any
}

export async function createTestEvent(
  tracker: TestDataTracker,
  kysely: Kysely<Database>,
  data: TestEventData
): Promise<any> {
  const event = await kysely
    .insertInto("events")
    .values({
      ...data,
      is_test_data: true
    } as any)
    .returning("*" as any)
    .executeTakeFirstOrThrow()
  
  tracker.track("events", (event as any).id)
  return event
}

export async function createTestEventParticipant(
  tracker: TestDataTracker,
  kysely: Kysely<Database>,
  data: {
    profile_id: string
    event_id: string
    [key: string]: any
  }
): Promise<any> {
  const participant = await kysely
    .insertInto("event_participants")
    .values(data as any)
    .returning("*" as any)
    .executeTakeFirstOrThrow()
  
  tracker.track("event_participants", (participant as any).id)
  return participant
}