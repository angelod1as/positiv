import { sql } from "kysely"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { buildRestoreStatement } from "./integration-global-setup"
import { cleanupAfterTest, setupIntegrationTest } from "./integration-setup"
import { cleanupTestAuthUsers, createTestAuthUser, createTestProfile } from "./db-test-utils"

const BACKUP_TABLE = "_backup_restore_spec_profiles"

describe("integration global setup restore - Integration Tests", () => {
  const { tracker, kysely } = setupIntegrationTest()

  beforeEach(async () => {
    tracker.clear()
    await sql.raw(`DROP TABLE IF EXISTS ${BACKUP_TABLE}`).execute(kysely)
  })

  afterEach(async () => {
    await sql.raw(`DROP TABLE IF EXISTS ${BACKUP_TABLE}`).execute(kysely)
    await cleanupAfterTest(tracker, kysely)
  })

  it("restores the profiles whose auth user is still there and skips the rest", async () => {
    const survivorEmail = `restore-survivor-${Date.now()}@example.com`
    const vanishingEmail = `restore-vanishing-${Date.now()}@example.com`

    const survivorUserId = await createTestAuthUser(survivorEmail, "test1234", tracker)
    const vanishingUserId = await createTestAuthUser(vanishingEmail, "test1234", tracker)

    const survivor = await createTestProfile(tracker, kysely, {
      user_id: survivorUserId,
      email: survivorEmail,
    })
    const vanishing = await createTestProfile(tracker, kysely, {
      user_id: vanishingUserId,
      email: vanishingEmail,
    })

    // Snapshot both profiles the way the global setup does
    await sql
      .raw(
        `CREATE TABLE ${BACKUP_TABLE} AS SELECT * FROM profiles WHERE id IN ('${survivor.id}', '${vanishing.id}')`
      )
      .execute(kysely)

    // Teardown truncates the table, and meanwhile a concurrent E2E run has deleted
    // the auth user one of these profiles belonged to
    await kysely.deleteFrom("profiles").where("id", "in", [survivor.id, vanishing.id]).execute()
    await cleanupTestAuthUsers([vanishingEmail])

    const columns = ["id", "user_id", "email", "basic_data_filled"]
    const statement = buildRestoreStatement("profiles", columns, BACKUP_TABLE, [
      { column: "user_id", refTable: "auth.users", refColumn: "id" },
    ])

    await sql.raw(statement).execute(kysely)

    const restored = await kysely
      .selectFrom("profiles")
      .select("id")
      .where("id", "in", [survivor.id, vanishing.id])
      .execute()

    expect(restored.map(row => row.id)).toEqual([survivor.id])
  })
})
