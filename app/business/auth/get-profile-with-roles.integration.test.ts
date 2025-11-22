import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest"
import {
  cleanupAfterTest,
  setupIntegrationTest,
} from "~/test/integration-setup"
import { sql } from "kysely"

describe("get_profile_with_roles RPC - Integration Tests", () => {
  const { tracker, kysely } = setupIntegrationTest()

  // Get a test user ID from the database
  let testUserId: string

  beforeEach(async () => {
    tracker.clear()

    // Get first available auth user for testing
    const authUser = await kysely
      .selectFrom("profiles")
      .select("user_id as id")
      .where("user_id", "is not", null)
      .limit(1)
      .executeTakeFirst()

    if (!authUser || !authUser.id) {
      throw new Error("No auth users found in test database")
    }

    testUserId = authUser.id

    // Only clear user_roles for this user (we'll create new ones in tests)
    // DO NOT delete the profile itself - it's shared test data
    await kysely
      .deleteFrom("user_roles")
      .where("user_id", "=", testUserId)
      .execute()
  })

  afterEach(async () => {
    await cleanupAfterTest(tracker, kysely)
  })

  it("should return profile with is_admin=false and empty roles array when user has no roles", async () => {
    // Arrange: No roles added (beforeEach already cleared user_roles for this user)

    // Act: Call the RPC using Kysely sql template
    const result = await sql<{
      id: string
      email: string
      full_name: string | null
      is_admin: boolean
      roles: string[] | null
    }>`SELECT * FROM get_profile_with_roles(${testUserId}::uuid)`.execute(
      kysely,
    )

    // Assert
    expect(result.rows).toHaveLength(1)
    const data = result.rows[0]
    expect(data.is_admin).toBe(false)
    expect(data.roles).toBeNull() // PostgreSQL array_agg returns NULL for zero rows
  })

  it("should return profile with is_admin=true and roles=['admin'] when user has admin role", async () => {
    // Arrange: Add admin role to existing profile
    await kysely
      .insertInto("user_roles")
      .values({
        user_id: testUserId,
        role_name: "admin",
        created_at: new Date().toISOString(),
      })
      .execute()

    // Act: Call the RPC
    const result = await sql<{
      is_admin: boolean
      roles: string[] | null
      email: string
      full_name: string | null
    }>`SELECT * FROM get_profile_with_roles(${testUserId}::uuid)`.execute(
      kysely,
    )

    // Assert
    expect(result.rows).toHaveLength(1)
    const data = result.rows[0]
    expect(data.is_admin).toBe(true)
    expect(data.roles).toEqual(["admin"])
    // Verify it returns the existing profile's data
    expect(data.email).toBeDefined()
    expect(data.full_name).toBeDefined()
  })

  it("should return profile with is_admin=false when user has non-admin roles", async () => {
    // Arrange: Add moderator role to existing profile (not admin)
    await kysely
      .insertInto("user_roles")
      .values({
        user_id: testUserId,
        role_name: "moderator",
        created_at: new Date().toISOString(),
      })
      .execute()

    // Act: Call the RPC
    const result = await sql<{
      is_admin: boolean
      roles: string[] | null
    }>`SELECT * FROM get_profile_with_roles(${testUserId}::uuid)`.execute(
      kysely,
    )

    // Assert
    expect(result.rows).toHaveLength(1)
    const data = result.rows[0]
    expect(data.is_admin).toBe(false)
    expect(data.roles).toEqual(["moderator"])
  })

  it("should return profile with multiple roles sorted alphabetically", async () => {
    // Arrange: Add multiple roles to existing profile (inserted in non-alphabetical order)
    await kysely
      .insertInto("user_roles")
      .values([
        {
          user_id: testUserId,
          role_name: "moderator",
          created_at: new Date().toISOString(),
        },
        {
          user_id: testUserId,
          role_name: "admin",
          created_at: new Date().toISOString(),
        },
        {
          user_id: testUserId,
          role_name: "editor",
          created_at: new Date().toISOString(),
        },
      ])
      .execute()

    // Act: Call the RPC
    const result = await sql<{
      is_admin: boolean
      roles: string[] | null
    }>`SELECT * FROM get_profile_with_roles(${testUserId}::uuid)`.execute(
      kysely,
    )

    // Assert
    expect(result.rows).toHaveLength(1)
    const data = result.rows[0]
    expect(data.is_admin).toBe(true) // Has admin role
    expect(data.roles).toEqual(["admin", "editor", "moderator"]) // Sorted alphabetically
  })

  it("should return all profile columns correctly", async () => {
    // Arrange: Use existing profile (no roles added)

    // Act: Call the RPC
    const result = await sql<{
      id: string
      email: string
      full_name: string | null
      social_name: string | null
      basic_data_filled: boolean
      pronouns: string[] | null
      rg: string | null
      cpf: string | null
      phone: string | null
      date_of_birth: Date | null
      gender: string[] | null
      orientation: string[] | null
      race_color: string[] | null
      where_lives: string | null
      how_came_to_us: string | null
      rg_issuer: string | null
      created_at: string
      is_admin: boolean
      roles: string[] | null
    }>`SELECT * FROM get_profile_with_roles(${testUserId}::uuid)`.execute(
      kysely,
    )

    // Assert: Verify all expected columns are present and have correct types
    expect(result.rows).toHaveLength(1)
    const data = result.rows[0]

    // Verify all columns exist (structure test)
    expect(data).toHaveProperty("id")
    expect(data).toHaveProperty("email")
    expect(data).toHaveProperty("full_name")
    expect(data).toHaveProperty("social_name")
    expect(data).toHaveProperty("basic_data_filled")
    expect(data).toHaveProperty("pronouns")
    expect(data).toHaveProperty("rg")
    expect(data).toHaveProperty("cpf")
    expect(data).toHaveProperty("phone")
    expect(data).toHaveProperty("date_of_birth")
    expect(data).toHaveProperty("gender")
    expect(data).toHaveProperty("orientation")
    expect(data).toHaveProperty("race_color")
    expect(data).toHaveProperty("where_lives")
    expect(data).toHaveProperty("how_came_to_us")
    expect(data).toHaveProperty("rg_issuer")
    expect(data).toHaveProperty("created_at")
    expect(data).toHaveProperty("is_admin")
    expect(data).toHaveProperty("roles")

    // Verify derived fields match expected values (no roles added)
    expect(data.is_admin).toBe(false)
    expect(data.roles).toBeNull() // PostgreSQL array_agg returns NULL for zero rows
  })

  it("should return no rows when user_id does not exist", async () => {
    // Arrange: Use a non-existent user_id
    const nonExistentUserId = "99999999-9999-9999-9999-999999999999"

    // Act: Call the RPC
    const result = await sql`SELECT * FROM get_profile_with_roles(${nonExistentUserId}::uuid)`.execute(
      kysely,
    )

    // Assert: Should return no rows
    expect(result.rows).toHaveLength(0)
  })
})
