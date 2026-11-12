import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { sql } from "kysely"
import {
  cleanupAfterTest,
  setupIntegrationTest,
} from "~/test/integration-setup"
import {
  createTestAdminUser,
  createTestAuthUser,
  createTestProfile,
  getTestSupabaseClient,
  runAsAuthenticatedUser,
} from "~/test/db-test-utils"

describe("Admin-only profile columns", () => {
  const { tracker, kysely: db } = setupIntegrationTest()
  let testId: number

  beforeEach(() => {
    tracker.clear()
    testId = Date.now()
  })

  afterEach(async () => {
    await cleanupAfterTest(tracker, db)
  })

  const createUserWithProfile = async (label: string) => {
    const email = `web40-${label}-${testId}@example.com`
    const userId = await createTestAuthUser(email, "test1234", tracker)
    const profile = await createTestProfile(tracker, db, {
      user_id: userId,
      email,
      full_name: `WEB-40 ${label}`,
    })

    return { userId, profile }
  }

  describe("cpf_exempt", () => {
    it("starts false", async () => {
      const { profile } = await createUserWithProfile("default")

      expect(profile.cpf_exempt).toBe(false)
    })

    it("refuses a profile that is exempt and still holds a CPF", async () => {
      await expect(
        createTestProfile(tracker, db, {
          user_id: null,
          email: `web40-both-${testId}@example.com`,
          cpf: "529.982.247-25",
          cpf_exempt: true,
        }),
      ).rejects.toThrow(/profiles_cpf_exempt_has_no_cpf/)
    })

    it("lets the server grant it", async () => {
      const { profile } = await createUserWithProfile("server")

      const updated = await db
        .updateTable("profiles")
        .set({ cpf_exempt: true })
        .where("id", "=", profile.id)
        .returning("cpf_exempt")
        .executeTakeFirstOrThrow()

      expect(updated.cpf_exempt).toBe(true)
    })

    it("is returned by get_profile_with_roles", async () => {
      const { userId, profile } = await createUserWithProfile("rpc")
      await db
        .updateTable("profiles")
        .set({ cpf_exempt: true })
        .where("id", "=", profile.id)
        .execute()

      const { rows } = await runAsAuthenticatedUser(db, userId, (trx) =>
        sql<{ cpf_exempt: boolean }>`
          SELECT cpf_exempt FROM public.get_profile_with_roles(${userId}::uuid)
        `.execute(trx),
      )

      expect(rows[0]?.cpf_exempt).toBe(true)
    })
  })

  describe("a participant writing their own profile", () => {
    // WEB-48: the server writes profiles through Kysely as the owner, so the
    // Data API holds no write grant at all and every attempt is refused before
    // the guard trigger is reached.
    const adminOnlyChanges = {
      cpf_exempt: sql`cpf_exempt = true`,
      approved_to_attend: sql`approved_to_attend = 'approved'`,
      is_veteran: sql`is_veteran = true`,
      became_veteran_date: sql`became_veteran_date = now()`,
      flag: sql`flag = 'red'`,
      flag_notes: sql`flag_notes = 'self-written'`,
      general_notes: sql`general_notes = 'self-written'`,
      provider_customer_id: sql`provider_customer_id = 'cus_self'`,
    }

    for (const [column, assignment] of Object.entries(adminOnlyChanges)) {
      it(`cannot change ${column}`, async () => {
        const { userId, profile } = await createUserWithProfile(`own-${column}`)

        await expect(
          runAsAuthenticatedUser(db, userId, (trx) =>
            sql`UPDATE public.profiles SET ${assignment} WHERE id = ${profile.id}`.execute(
              trx,
            ),
          ),
        ).rejects.toThrow(/permission denied for table profiles/)
      })
    }

    it("cannot change them with the anon key either", async () => {
      const { profile } = await createUserWithProfile("anon")

      await expect(
        db.transaction().execute(async (trx) => {
          await sql`SET LOCAL ROLE anon`.execute(trx)
          await sql`UPDATE public.profiles SET cpf_exempt = true WHERE id = ${profile.id}`.execute(
            trx,
          )
        }),
      ).rejects.toThrow(/permission denied for table profiles/)

      const saved = await db
        .selectFrom("profiles")
        .select("cpf_exempt")
        .where("id", "=", profile.id)
        .executeTakeFirstOrThrow()
      expect(saved.cpf_exempt).toBe(false)
    })

    it("cannot change their own data either", async () => {
      const { userId, profile } = await createUserWithProfile("own-data")

      await expect(
        runAsAuthenticatedUser(db, userId, (trx) =>
          sql`
            UPDATE public.profiles
               SET full_name = 'Renamed', cpf = '529.982.247-25', rg = '12345'
             WHERE id = ${profile.id}
          `.execute(trx),
        ),
      ).rejects.toThrow(/permission denied for table profiles/)
    })

    it("cannot create their profile, not even with the defaults", async () => {
      const email = `web40-insert-${testId}@example.com`
      const userId = await createTestAuthUser(email, "test1234", tracker)

      await expect(
        runAsAuthenticatedUser(db, userId, (trx) =>
          sql`
            INSERT INTO public.profiles (user_id, email)
            VALUES (${userId}::uuid, ${email})
          `.execute(trx),
        ),
      ).rejects.toThrow(/permission denied for table profiles/)
    })

    it("cannot delete their profile", async () => {
      const { userId, profile } = await createUserWithProfile("own-delete")

      await expect(
        runAsAuthenticatedUser(db, userId, (trx) =>
          sql`DELETE FROM public.profiles WHERE id = ${profile.id}`.execute(trx),
        ),
      ).rejects.toThrow(/permission denied for table profiles/)
    })

    it("cannot create their profile already exempt or approved", async () => {
      const email = `web40-insert-admin-${testId}@example.com`
      const userId = await createTestAuthUser(email, "test1234", tracker)

      await expect(
        runAsAuthenticatedUser(db, userId, (trx) =>
          sql`
            INSERT INTO public.profiles (user_id, email, cpf_exempt, approved_to_attend)
            VALUES (${userId}::uuid, ${email}, true, 'approved')
          `.execute(trx),
        ),
      ).rejects.toThrow(/permission denied for table profiles/)
    })
  })

  describe("the guard trigger, should a write grant come back", () => {
    // Nothing reaches guard_admin_only_profile_columns through the Data API
    // since WEB-48 revoked the writes. It stays as a second layer, so this
    // restores a grant and a policy inside a transaction that never commits.
    it("still refuses a participant changing an admin-only column", async () => {
      const { userId, profile } = await createUserWithProfile("regrant")

      await expect(
        db.transaction().execute(async (trx) => {
          await sql`GRANT UPDATE ON public.profiles TO authenticated`.execute(trx)
          await sql`
            CREATE POLICY web48_regrant ON public.profiles FOR UPDATE TO authenticated
              USING (user_id = (SELECT auth.uid()))
          `.execute(trx)
          await sql`SET LOCAL ROLE authenticated`.execute(trx)
          await sql`SELECT set_config('request.jwt.claims', ${JSON.stringify({
            sub: userId,
            role: "authenticated",
          })}, true)`.execute(trx)
          await sql`UPDATE public.profiles SET cpf_exempt = true WHERE id = ${profile.id}`.execute(
            trx,
          )
        }),
      ).rejects.toThrow(/cpf_exempt is admin-only/)
    })
  })

  describe("service_role", () => {
    it("writes them, as the e2e helpers and the server's supabase client do", async () => {
      const { profile } = await createUserWithProfile("service-role")

      const { error } = await getTestSupabaseClient()
        .from("profiles")
        .update({ full_name: "By service", approved_to_attend: "approved" })
        .eq("id", profile.id)

      expect(error).toBeNull()
      const saved = await db
        .selectFrom("profiles")
        .select(["full_name", "approved_to_attend"])
        .where("id", "=", profile.id)
        .executeTakeFirstOrThrow()
      expect(saved).toEqual({
        full_name: "By service",
        approved_to_attend: "approved",
      })
    })
  })

  describe("an admin through the API", () => {
    // The admin panel writes through the server; the Data API is no way in.
    it("cannot change another profile's admin-only columns either", async () => {
      const { userId: adminId } = await createTestAdminUser(
        tracker,
        db,
        `web40-admin-${testId}@example.com`,
      )
      const { profile } = await createUserWithProfile("managed")

      await expect(
        runAsAuthenticatedUser(db, adminId, (trx) =>
          sql`
            UPDATE public.profiles
               SET cpf_exempt = true, approved_to_attend = 'approved'
             WHERE id = ${profile.id}
          `.execute(trx),
        ),
      ).rejects.toThrow(/permission denied for table profiles/)
    })
  })
})
