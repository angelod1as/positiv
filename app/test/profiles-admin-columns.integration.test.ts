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
        ).rejects.toThrow(/admin-only/i)
      })
    }

    it("still changes their own data", async () => {
      const { userId, profile } = await createUserWithProfile("own-data")

      await runAsAuthenticatedUser(db, userId, (trx) =>
        sql`
          UPDATE public.profiles
             SET full_name = 'Renamed', cpf = '529.982.247-25', rg = '12345'
           WHERE id = ${profile.id}
        `.execute(trx),
      )

      const saved = await db
        .selectFrom("profiles")
        .select(["full_name", "cpf", "rg"])
        .where("id", "=", profile.id)
        .executeTakeFirstOrThrow()

      expect(saved).toEqual({
        full_name: "Renamed",
        cpf: "529.982.247-25",
        rg: "12345",
      })
    })

    it("can create their profile with the defaults", async () => {
      const email = `web40-insert-${testId}@example.com`
      const userId = await createTestAuthUser(email, "test1234", tracker)

      const { rows } = await runAsAuthenticatedUser(db, userId, (trx) =>
        sql<{ id: string }>`
          INSERT INTO public.profiles (user_id, email)
          VALUES (${userId}::uuid, ${email})
          RETURNING id
        `.execute(trx),
      )
      expect(rows).toHaveLength(1)
      tracker.track("profiles", rows[0]?.id ?? "")
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
      ).rejects.toThrow(/admin-only/i)
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
    it("can change another profile's admin-only columns", async () => {
      const { userId: adminId } = await createTestAdminUser(
        tracker,
        db,
        `web40-admin-${testId}@example.com`,
      )
      const { profile } = await createUserWithProfile("managed")

      await runAsAuthenticatedUser(db, adminId, (trx) =>
        sql`
          UPDATE public.profiles
             SET cpf_exempt = true, approved_to_attend = 'approved'
           WHERE id = ${profile.id}
        `.execute(trx),
      )

      const saved = await db
        .selectFrom("profiles")
        .select(["cpf_exempt", "approved_to_attend"])
        .where("id", "=", profile.id)
        .executeTakeFirstOrThrow()

      expect(saved).toEqual({ cpf_exempt: true, approved_to_attend: "approved" })
    })
  })
})
