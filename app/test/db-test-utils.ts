import type { Kysely, Selectable, Insertable } from "kysely"
import type { Database } from "~/types/database/kysely.types"
import type { Database as DatabaseTypes } from "~/types/database/database.types"
import { createClient } from "@supabase/supabase-js"
import { ROLES } from "~/lib/constants/roles"

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
  
  // Group entities by table for batch operations
  const groupedData = dataToCleanup.reduce((acc, { table, id }) => {
    if (!acc[table]) {
      acc[table] = []
    }
    acc[table].push(id)
    return acc
  }, {} as Record<string, string[]>)
  
  // Perform batch deletions for each table
  // Order matters due to foreign key constraints - delete in reverse order of dependencies
  const tableOrder = [
    "event_participants",
    "events",
    "profiles"
  ]
  
  for (const table of tableOrder) {
    const ids = groupedData[table]
    if (!ids || ids.length === 0) continue
    
    try {
      switch (table) {
        case "event_participants":
          await kysely
            .deleteFrom("event_participants")
            .where("id", "in", ids)
            .execute()
          break
        case "events":
          await kysely
            .deleteFrom("events")
            .where("id", "in", ids)
            .execute()
          break
        case "profiles":
          await kysely
            .deleteFrom("profiles")
            .where("id", "in", ids)
            .execute()
          break
        default:
          // For any unknown tables, log a warning
          // We don't attempt deletion as it could fail with unknown table names
          console.warn(`Unknown table type: ${table} - skipping ${ids.length} records`)
      }
    } catch (error) {
      console.error(`Failed to delete ${ids.length} records from ${table}:`, error)
    }
  }
  
  tracker.clear()
}

interface TestProfileData {
  user_id: string | null
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

/**
 * Helper to create a Supabase client for test operations
 * Uses service role key for admin operations in test environment
 */
export function getTestSupabaseClient() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set for tests")
  }
  
  return createClient<DatabaseTypes>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

/**
 * Helper to create an auth user for testing
 * Returns the user ID that can be used in profiles
 */
export async function createTestAuthUser(
  email: string,
  password: string = 'test1234'
): Promise<string> {
  const supabase = getTestSupabaseClient()
  
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  })
  
  if (error) {
    throw new Error(`Failed to create test auth user: ${error.message}`)
  }
  
  return data.user.id
}

/**
 * Helper to clean up test auth users
 */
export async function cleanupTestAuthUsers(emails: string[]): Promise<void> {
  if (emails.length === 0) return
  
  const supabase = getTestSupabaseClient()
  
  // Get user IDs for the emails
  const { data: users, error: listError } = await supabase.auth.admin.listUsers()
  
  if (listError) {
    console.error('Failed to list users for cleanup:', listError)
    return
  }
  
  const testUsers = users.users.filter(u => u.email && emails.includes(u.email))
  
  // Delete each test user
  for (const user of testUsers) {
    const { error } = await supabase.auth.admin.deleteUser(user.id)
    if (error) {
      console.error(`Failed to delete test user ${user.email}:`, error)
    }
  }
}

/**
 * Helper to create a test admin user
 * Creates auth user, profile, and assigns admin role
 */
export async function createTestAdminUser(
  tracker: TestDataTracker,
  kysely: Kysely<Database>,
  email: string,
  profileData?: Partial<TestProfileData>
): Promise<{
  userId: string
  profile: Selectable<DatabaseTypes["public"]["Tables"]["profiles"]["Row"]>
}> {
  // Create auth user
  const userId = await createTestAuthUser(email)
  
  // Create profile
  const profile = await createTestProfile(tracker, kysely, {
    user_id: userId,
    email,
    full_name: profileData?.full_name || "Test Admin",
    allow_marketing_email: true,
    ...profileData
  })
  
  // Add admin role
  await kysely
    .insertInto("user_roles")
    .values({
      user_id: userId,
      role_name: ROLES.ADMIN,
      created_at: new Date().toISOString()
    })
    .execute()
  
  return { userId, profile }
}