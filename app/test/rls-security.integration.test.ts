import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { sql } from "kysely"
import {
  cleanupAfterTest,
  setupIntegrationTest,
} from "~/test/integration-setup"
import { createTestEvent } from "~/test/db-test-utils"

describe("RLS Security - Integration Tests", () => {
  const { tracker, kysely: db } = setupIntegrationTest()

  beforeEach(async () => {
    tracker.clear()
    await db.deleteFrom("event_newsletter_campaigns").execute()
  })

  afterEach(async () => {
    await cleanupAfterTest(tracker, db)
  })

  describe("event_newsletter_campaigns RLS policies", () => {
    it("should have RLS enabled on event_newsletter_campaigns table", async () => {
      const { rows } = await sql<{ relrowsecurity: boolean }>`
        SELECT c.relrowsecurity
        FROM pg_class c
        INNER JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
        AND c.relname = 'event_newsletter_campaigns'
      `.execute(db)

      const result = rows[0]
      expect(result).toBeDefined()
      expect(result?.relrowsecurity).toBe(true)
    })

    it("should allow service role to insert into event_newsletter_campaigns", async () => {
      const event = await createTestEvent(tracker, db, {
        title: "Test Event for Campaign",
        event_status: "Registration Open",
      })

      const result = await db
        .insertInto("event_newsletter_campaigns")
        .values({
          event_id: event.id,
          campaign_is_created: false,
          campaign_is_sent: false,
          times_attempted: 0,
        })
        .returningAll()
        .executeTakeFirst()

      expect(result).toBeDefined()
      expect(result?.event_id).toBe(event.id)
    })

    it("should allow service role to select from event_newsletter_campaigns", async () => {
      const result = await db
        .selectFrom("event_newsletter_campaigns")
        .selectAll()
        .execute()

      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe("Function search_path security", () => {
    const functionsToTest = [
      "add_user_role",
      "update_profile_email",
      "get_admin_user_ids",
      "update_newsletter_subscriptions_updated_at",
      "update_event_statuses_automatically",
      "get_vault_secret",
      "update_veteran_status",
      "get_profile_with_roles",
    ]

    functionsToTest.forEach((functionName) => {
      it(`should have search_path set to empty string for ${functionName}`, async () => {
        const { rows } = await sql<{ proconfig: string[] | null }>`
          SELECT p.proconfig
          FROM pg_proc p
          INNER JOIN pg_namespace n ON n.oid = p.pronamespace
          WHERE n.nspname = 'public'
          AND p.proname = ${functionName}
        `.execute(db)

        const result = rows[0]
        expect(result).toBeDefined()
        expect(result?.proconfig).toBeDefined()

        const hasEmptySearchPath = result?.proconfig?.some((config: string) =>
          config === 'search_path=""'
        )
        expect(hasEmptySearchPath).toBe(true)
      })
    })
  })

  describe("Extension schema location", () => {
    it("should have pg_net extension in extensions schema", async () => {
      const { rows } = await sql<{ nspname: string }>`
        SELECT n.nspname
        FROM pg_extension e
        INNER JOIN pg_namespace n ON n.oid = e.extnamespace
        WHERE e.extname = 'pg_net'
      `.execute(db)

      const result = rows[0]
      expect(result).toBeDefined()
      expect(result?.nspname).toBe("extensions")
    })

    it("should have http extension in extensions schema", async () => {
      const { rows } = await sql<{ nspname: string }>`
        SELECT n.nspname
        FROM pg_extension e
        INNER JOIN pg_namespace n ON n.oid = e.extnamespace
        WHERE e.extname = 'http'
      `.execute(db)

      const result = rows[0]
      expect(result).toBeDefined()
      expect(result?.nspname).toBe("extensions")
    })
  })
})
