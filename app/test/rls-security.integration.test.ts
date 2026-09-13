import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { sql } from "kysely"
import {
  cleanupAfterTest,
  setupIntegrationTest,
} from "~/test/integration-setup"
import {
  createTestAuthUser,
  createTestEvent,
  createTestProfile,
} from "~/test/db-test-utils"

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

  describe("SECURITY DEFINER function execute privileges", () => {
    // Every public SECURITY DEFINER function runs with postgres privileges and
    // is reachable over PostgREST at /rest/v1/rpc/<name>, so anon and
    // authenticated must hold EXECUTE only where the client genuinely calls it.
    const allowedGrantees: Record<string, string[]> = {
      get_profile_with_roles: ["authenticated"],
      get_admin_user_ids: ["authenticated"],
    }

    it("should not grant EXECUTE to anon or authenticated beyond the allowlist", async () => {
      const { rows } = await sql<{
        signature: string
        proname: string
        anon_can_execute: boolean
        authed_can_execute: boolean
      }>`
        SELECT p.oid::regprocedure::text AS signature,
               p.proname,
               has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_can_execute,
               has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authed_can_execute
        FROM pg_proc p
        INNER JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
        AND p.prosecdef
        AND NOT EXISTS (
          SELECT 1 FROM pg_depend d WHERE d.objid = p.oid AND d.deptype = 'e'
        )
        ORDER BY p.proname
      `.execute(db)

      expect(rows.length).toBeGreaterThan(0)

      const unexpectedGrants = rows.flatMap((row) => {
        const allowed = allowedGrantees[row.proname] ?? []

        return [
          ...(row.anon_can_execute && !allowed.includes("anon")
            ? [`anon can execute ${row.signature}`]
            : []),
          ...(row.authed_can_execute && !allowed.includes("authenticated")
            ? [`authenticated can execute ${row.signature}`]
            : []),
        ]
      })

      expect(unexpectedGrants).toEqual([])
    })

    it("should keep EXECUTE for the roles the allowlist documents", async () => {
      const { rows } = await sql<{
        proname: string
        anon_can_execute: boolean
        authed_can_execute: boolean
      }>`
        SELECT p.proname,
               has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_can_execute,
               has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authed_can_execute
        FROM pg_proc p
        INNER JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
        AND p.proname IN ('get_profile_with_roles', 'get_admin_user_ids')
      `.execute(db)

      expect(rows.length).toBe(2)

      rows.forEach((row) => {
        expect(row.authed_can_execute).toBe(true)
        expect(row.anon_can_execute).toBe(false)
      })
    })
  })

  describe("get_profile_with_roles caller scoping", () => {
    // The function is SECURITY DEFINER and takes the user id as an argument, so
    // the grant alone does not stop one signed-in user from reading another
    // user's cpf, rg, phone and date of birth. The guard lives in the body.
    const runAsAuthenticated = async <T>(
      userId: string,
      run: (trx: typeof db) => Promise<T>,
    ): Promise<T> =>
      db.transaction().execute(async (trx) => {
        await sql`SET LOCAL ROLE authenticated`.execute(trx)
        await sql`SELECT set_config('request.jwt.claims', ${JSON.stringify({
          sub: userId,
          role: "authenticated",
        })}, true)`.execute(trx)

        return run(trx as unknown as typeof db)
      })

    const createUserWithProfile = async (label: string) => {
      const email = `pos539-${label}-${Date.now()}@example.com`
      const userId = await createTestAuthUser(email, "test1234", tracker)

      await createTestProfile(tracker, db, {
        user_id: userId,
        email,
        full_name: `POS-539 ${label}`,
        cpf: "12345678901",
      })

      return { userId, email }
    }

    it("should return the caller's own profile", async () => {
      const caller = await createUserWithProfile("self")

      const { rows } = await runAsAuthenticated(caller.userId, (trx) =>
        sql<{ email: string }>`
          SELECT email FROM public.get_profile_with_roles(${caller.userId}::uuid)
        `.execute(trx),
      )

      expect(rows).toHaveLength(1)
      expect(rows[0]?.email).toBe(caller.email)
    })

    it("should refuse to return another user's profile", async () => {
      const caller = await createUserWithProfile("caller")
      const victim = await createUserWithProfile("victim")

      await expect(
        runAsAuthenticated(caller.userId, (trx) =>
          sql`
            SELECT cpf FROM public.get_profile_with_roles(${victim.userId}::uuid)
          `.execute(trx),
        ),
      ).rejects.toThrow(/own profile/i)
    })
  })

  describe("search_path is pinned on every public function", () => {
    // Two separate failures hide behind the same advisor lint. A function with
    // no search_path at all resolves unqualified names against whatever the
    // caller set. A function that declares one and then runs
    // `SET search_path = public` in its body throws the declaration away on the
    // first statement, which reads as fixed in pg_proc.proconfig and is not.
    const publicFunctions = async () => {
      const { rows } = await sql<{
        signature: string
        has_fixed_search_path: boolean
        body_overrides_search_path: boolean
      }>`
        SELECT p.oid::regprocedure::text AS signature,
               EXISTS (
                 SELECT 1 FROM unnest(COALESCE(p.proconfig, '{}')) AS config
                 WHERE config LIKE 'search_path=%'
               ) AS has_fixed_search_path,
               p.prosrc ILIKE '%SET search_path%' AS body_overrides_search_path
        FROM pg_proc p
        INNER JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
        AND NOT EXISTS (
          SELECT 1 FROM pg_depend d WHERE d.objid = p.oid AND d.deptype = 'e'
        )
        ORDER BY p.proname
      `.execute(db)

      expect(rows.length).toBeGreaterThan(0)
      return rows
    }

    it("should declare a fixed search_path on every function", async () => {
      const rows = await publicFunctions()

      const mutable = rows
        .filter((row) => !row.has_fixed_search_path)
        .map((row) => row.signature)

      expect(mutable).toEqual([])
    })

    it("should not override the declared search_path inside a body", async () => {
      const rows = await publicFunctions()

      const overriding = rows
        .filter((row) => row.body_overrides_search_path)
        .map((row) => row.signature)

      expect(overriding).toEqual([])
    })
  })

  describe("Row level security coverage", () => {
    it("should have RLS enabled on every table in public", async () => {
      const { rows } = await sql<{ relname: string; relrowsecurity: boolean }>`
        SELECT c.relname, c.relrowsecurity
        FROM pg_class c
        INNER JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
        AND c.relkind IN ('r', 'p')
        -- The integration harness backs every table up for the length of a run
        -- (app/test/integration-global-setup.ts), so its copies are in pg_class
        -- while this test reads it.
        AND c.relname NOT LIKE '\_backup\_%'
        AND NOT EXISTS (
          SELECT 1 FROM pg_depend d WHERE d.objid = c.oid AND d.deptype = 'e'
        )
        ORDER BY c.relname
      `.execute(db)

      expect(rows.length).toBeGreaterThan(0)

      const withoutRls = rows
        .filter((row) => !row.relrowsecurity)
        .map((row) => row.relname)

      expect(withoutRls).toEqual([])
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
