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
import {
  createTestAuthUser,
  createTestProfile,
} from "~/test/db-test-utils"
import { sql } from "kysely"

describe("get_profile_with_roles RPC - Integration Tests", () => {
  const { tracker, kysely } = setupIntegrationTest()

  let testUserId: string

  beforeEach(async () => {
    tracker.clear()

    const testEmail = `test-rpc-${Date.now()}@example.com`
    testUserId = await createTestAuthUser(testEmail, "test1234", tracker)
    await createTestProfile(tracker, kysely, {
      user_id: testUserId,
      email: testEmail,
      full_name: "Test RPC User",
    })

    await kysely
      .deleteFrom("user_roles")
      .where("user_id", "=", testUserId)
      .execute()
  })

  afterEach(async () => {
    await cleanupAfterTest(tracker, kysely)
  })

  it("should return profile with is_admin=false and empty roles array when user has no roles", async () => {
    const result = await sql<{
      id: string
      email: string
      full_name: string | null
      is_admin: boolean
      roles: string[] | null
    }>`SELECT * FROM get_profile_with_roles(${testUserId}::uuid)`.execute(
      kysely,
    )

    expect(result.rows).toHaveLength(1)
    const data = result.rows[0]
    expect(data.is_admin).toBe(false)
    expect(data.roles).toBeNull()
  })

  it("should return profile with is_admin=true and roles=['admin'] when user has admin role", async () => {
    await kysely
      .insertInto("user_roles")
      .values({
        user_id: testUserId,
        role_name: "admin",
        created_at: new Date().toISOString(),
      })
      .execute()

    const result = await sql<{
      is_admin: boolean
      roles: string[] | null
      email: string
      full_name: string | null
    }>`SELECT * FROM get_profile_with_roles(${testUserId}::uuid)`.execute(
      kysely,
    )

    expect(result.rows).toHaveLength(1)
    const data = result.rows[0]
    expect(data.is_admin).toBe(true)
    expect(data.roles).toEqual(["admin"])
    expect(data.email).toBeDefined()
    expect(data.full_name).toBeDefined()
  })

  it("should return profile with is_admin=false when user has non-admin roles", async () => {
    await kysely
      .insertInto("user_roles")
      .values({
        user_id: testUserId,
        role_name: "moderator",
        created_at: new Date().toISOString(),
      })
      .execute()

    const result = await sql<{
      is_admin: boolean
      roles: string[] | null
    }>`SELECT * FROM get_profile_with_roles(${testUserId}::uuid)`.execute(
      kysely,
    )

    expect(result.rows).toHaveLength(1)
    const data = result.rows[0]
    expect(data.is_admin).toBe(false)
    expect(data.roles).toEqual(["moderator"])
  })

  it("should return profile with multiple roles sorted alphabetically", async () => {
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

    const result = await sql<{
      is_admin: boolean
      roles: string[] | null
    }>`SELECT * FROM get_profile_with_roles(${testUserId}::uuid)`.execute(
      kysely,
    )

    expect(result.rows).toHaveLength(1)
    const data = result.rows[0]
    expect(data.is_admin).toBe(true)
    expect(data.roles).toEqual(["admin", "editor", "moderator"])
  })

  it("should return all profile columns correctly", async () => {
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

    expect(result.rows).toHaveLength(1)
    const data = result.rows[0]

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

    expect(data.is_admin).toBe(false)
    expect(data.roles).toBeNull()
  })

  it("should return no rows when user_id does not exist", async () => {
    const nonExistentUserId = "99999999-9999-9999-9999-999999999999"

    const result = await sql`SELECT * FROM get_profile_with_roles(${nonExistentUserId}::uuid)`.execute(
      kysely,
    )

    expect(result.rows).toHaveLength(0)
  })
})
