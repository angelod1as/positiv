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

    // Clear test data for this user
    await kysely
      .deleteFrom("user_roles")
      .where("user_id", "=", testUserId)
      .execute()
    await kysely
      .deleteFrom("profiles")
      .where("user_id", "=", testUserId)
      .execute()
  })

  afterEach(async () => {
    await cleanupAfterTest(tracker, kysely)
  })

  it("should return profile with is_admin=false and empty roles array when user has no roles", async () => {
    // Arrange: Create a profile without roles
    const insertedProfile = await kysely
      .insertInto("profiles")
      .values({
        user_id: testUserId,
        email: "test-no-roles@example.com",
        full_name: "Test User No Roles",
        basic_data_filled: false,
        created_at: new Date().toISOString(),
      })
      .returningAll()
      .executeTakeFirstOrThrow()
    tracker.track("profiles", insertedProfile.id)

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
    expect(data.email).toBe("test-no-roles@example.com")
    expect(data.full_name).toBe("Test User No Roles")
  })

  it("should return profile with is_admin=true and roles=['admin'] when user has admin role", async () => {
    // Arrange: Create a profile with admin role
    const insertedProfile = await kysely
      .insertInto("profiles")
      .values({
        user_id: testUserId,
        email: "test-admin@example.com",
        full_name: "Test Admin User",
        basic_data_filled: true,
        created_at: new Date().toISOString(),
      })
      .returningAll()
      .executeTakeFirstOrThrow()
    tracker.track("profiles", insertedProfile.id)

    // Add admin role
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
    expect(data.email).toBe("test-admin@example.com")
    expect(data.full_name).toBe("Test Admin User")
  })

  it("should return profile with is_admin=false when user has non-admin roles", async () => {
    // Arrange: Create a profile with moderator role (not admin)
    const insertedProfile = await kysely
      .insertInto("profiles")
      .values({
        user_id: testUserId,
        email: "test-moderator@example.com",
        full_name: "Test Moderator User",
        basic_data_filled: true,
        created_at: new Date().toISOString(),
      })
      .returningAll()
      .executeTakeFirstOrThrow()
    tracker.track("profiles", insertedProfile.id)

    // Add moderator role
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
    // Arrange: Create a profile with multiple roles
    const insertedProfile = await kysely
      .insertInto("profiles")
      .values({
        user_id: testUserId,
        email: "test-multi-role@example.com",
        full_name: "Test Multi Role User",
        basic_data_filled: true,
        created_at: new Date().toISOString(),
      })
      .returningAll()
      .executeTakeFirstOrThrow()
    tracker.track("profiles", insertedProfile.id)

    // Add multiple roles (inserted in non-alphabetical order)
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
    // Arrange: Create a profile with all fields populated
    const testDate = new Date("1990-05-15")
    const createdAt = new Date().toISOString()

    const insertedProfile = await kysely
      .insertInto("profiles")
      .values({
        user_id: testUserId,
        email: "test-all-fields@example.com",
        full_name: "Test Full Name",
        social_name: "Test Social Name",
        basic_data_filled: true,
        pronouns: ["he/him", "they/them"],
        rg: "123456789",
        cpf: "12345678901",
        phone: 11987654321,
        date_of_birth: testDate.toISOString().split("T")[0],
        gender: ["man", "non-binary"],
        orientation: ["gay", "queer"],
        race_color: ["white"],
        where_lives: "São Paulo, SP",
        how_came_to_us: "Social media",
        rg_issuer: "SSP-SP",
        created_at: createdAt,
      })
      .returningAll()
      .executeTakeFirstOrThrow()
    tracker.track("profiles", insertedProfile.id)

    // Act: Call the RPC
    const result = await sql<{
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
      is_admin: boolean
      roles: string[] | null
    }>`SELECT * FROM get_profile_with_roles(${testUserId}::uuid)`.execute(
      kysely,
    )

    // Assert: Verify all columns are returned correctly
    expect(result.rows).toHaveLength(1)
    const data = result.rows[0]
    expect(data.email).toBe("test-all-fields@example.com")
    expect(data.full_name).toBe("Test Full Name")
    expect(data.social_name).toBe("Test Social Name")
    expect(data.basic_data_filled).toBe(true)
    expect(data.pronouns).toEqual(["he/him", "they/them"])
    expect(data.rg).toBe("123456789")
    expect(data.cpf).toBe("12345678901")
    expect(data.phone).toBe("11987654321") // BigInt converted to string by Kysely
    // date_of_birth is returned as Date object by Kysely
    expect(data.date_of_birth).toBeInstanceOf(Date)
    expect((data.date_of_birth as Date).toISOString().split("T")[0]).toBe(
      "1990-05-15",
    )
    expect(data.gender).toEqual(["man", "non-binary"])
    expect(data.orientation).toEqual(["gay", "queer"])
    expect(data.race_color).toEqual(["white"])
    expect(data.where_lives).toBe("São Paulo, SP")
    expect(data.how_came_to_us).toBe("Social media")
    expect(data.rg_issuer).toBe("SSP-SP")
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
