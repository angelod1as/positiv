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
  runAsAuthenticatedUser,
} from "~/test/db-test-utils"
import { ROLES, type RoleName } from "~/lib/constants/roles"
import { PERMISSIONS } from "./permissions"

const ALL_PERMISSIONS = Object.values(PERMISSIONS)

describe("RBAC - Integration Tests", () => {
  const { tracker, kysely } = setupIntegrationTest()

  beforeEach(() => {
    tracker.clear()
  })

  afterEach(async () => {
    await cleanupAfterTest(tracker, kysely)
  })

  const createUser = async (role?: RoleName) => {
    const email = `test-rbac-${role ?? "user"}-${Date.now()}-${Math.random()}@example.com`
    const userId = await createTestAuthUser(email, "test1234", tracker)
    const profile = await createTestProfile(tracker, kysely, {
      user_id: userId,
      email,
      full_name: `RBAC ${role ?? "user"}`,
    })

    if (role) {
      await sql`SELECT public.add_user_role(${userId}::uuid, ${role})`.execute(
        kysely,
      )
      tracker.track("user_roles", userId)
    }

    return { userId, profile }
  }

  const authorize = (userId: string, permission: string) =>
    runAsAuthenticatedUser(kysely, userId, async (trx) => {
      const { rows } = await sql<{ allowed: boolean }>`
        SELECT public.authorize(${permission}::public.app_permission) AS allowed
      `.execute(trx)
      return rows[0].allowed
    })

  describe("user_role enum", () => {
    it("rejects a role that does not exist", async () => {
      const { userId } = await createUser()
      tracker.track("user_roles", userId)

      await expect(
        sql`INSERT INTO public.user_roles (user_id, role_name) VALUES (${userId}::uuid, 'moderator')`.execute(
          kysely,
        ),
      ).rejects.toThrow(/invalid input value for enum/)
    })

    it.each([ROLES.ADMIN, ROLES.STAFF])(
      "add_user_role assigns %s",
      async (role) => {
        const { userId } = await createUser(role)

        const rows = await kysely
          .selectFrom("user_roles")
          .select("role_name")
          .where("user_id", "=", userId)
          .execute()

        expect(rows.map((row) => row.role_name)).toEqual([role])
      },
    )
  })

  describe("role_permissions", () => {
    it("maps admin to every permission and staff to the direct application only", async () => {
      const { rows } = await sql<{ role: string; permission: string }>`
        SELECT role::text, permission::text
        FROM public.role_permissions
        ORDER BY role, permission
      `.execute(kysely)

      const byRole = (role: string) =>
        rows
          .filter((row) => row.role === role)
          .map((row) => row.permission)
          .sort()

      expect(byRole(ROLES.ADMIN)).toEqual([...ALL_PERMISSIONS].sort())
      expect(byRole(ROLES.STAFF)).toEqual(["events.apply_direct"])
    })

    it("is not readable by an authenticated user", async () => {
      const { userId } = await createUser(ROLES.ADMIN)

      await expect(
        runAsAuthenticatedUser(kysely, userId, (trx) =>
          sql`SELECT * FROM public.role_permissions`.execute(trx),
        ),
      ).rejects.toThrow(/permission denied/)
    })
  })

  describe("get_admin_user_ids", () => {
    it("returns whoever receives admin notifications: the admins, and no staff", async () => {
      const admin = await createUser(ROLES.ADMIN)
      const staff = await createUser(ROLES.STAFF)

      const { rows } = await sql<{ user_id: string }>`
        SELECT public.get_admin_user_ids() AS user_id
      `.execute(kysely)
      const ids = rows.map((row) => row.user_id)

      expect(ids).toContain(admin.userId)
      expect(ids).not.toContain(staff.userId)
    })
  })

  describe("authorize()", () => {
    it.each(ALL_PERMISSIONS)(
      "is true for an admin on %s",
      async (permission) => {
        const { userId } = await createUser(ROLES.ADMIN)

        expect(await authorize(userId, permission)).toBe(true)
      },
    )

    it.each(ALL_PERMISSIONS)(
      "is true for a staff only on events.apply_direct (%s)",
      async (permission) => {
        const { userId } = await createUser(ROLES.STAFF)

        expect(await authorize(userId, permission)).toBe(
          permission === "events.apply_direct",
        )
      },
    )

    it.each(ALL_PERMISSIONS)(
      "is false for a user with no role on %s",
      async (permission) => {
        const { userId } = await createUser()

        expect(await authorize(userId, permission)).toBe(false)
      },
    )
  })

  describe("policies", () => {
    it("no policy compares role names", async () => {
      const { rows } = await sql<{ policy: string }>`
        SELECT tablename || '.' || policyname AS policy
        FROM pg_policies
        WHERE schemaname = 'public'
        AND (coalesce(qual, '') ILIKE '%role_name%'
          OR coalesce(with_check, '') ILIKE '%role_name%')
      `.execute(kysely)

      expect(rows).toEqual([])
    })

    it("no policy asks get_admin_user_ids who the admins are", async () => {
      const { rows } = await sql<{ policy: string }>`
        SELECT tablename || '.' || policyname AS policy
        FROM pg_policies
        WHERE schemaname = 'public'
        AND (coalesce(qual, '') ILIKE '%get_admin_user_ids%'
          OR coalesce(with_check, '') ILIKE '%get_admin_user_ids%')
      `.execute(kysely)

      expect(rows).toEqual([])
    })

    it("lets an admin read another person's roles, and nobody else", async () => {
      const admin = await createUser(ROLES.ADMIN)
      const staff = await createUser(ROLES.STAFF)
      const other = await createUser(ROLES.STAFF)

      const visibleTo = (userId: string) =>
        runAsAuthenticatedUser(kysely, userId, (trx) =>
          trx
            .selectFrom("user_roles")
            .select("role_name")
            .where("user_id", "=", other.userId)
            .execute(),
        )

      expect(await visibleTo(admin.userId)).toHaveLength(1)
      expect(await visibleTo(staff.userId)).toHaveLength(0)
    })

    it("lets an admin read another person's profile, and nobody else", async () => {
      const admin = await createUser(ROLES.ADMIN)
      const staff = await createUser(ROLES.STAFF)
      const user = await createUser()
      const other = await createUser()

      const visibleTo = (userId: string) =>
        runAsAuthenticatedUser(kysely, userId, (trx) =>
          trx
            .selectFrom("profiles")
            .select("id")
            .where("id", "=", other.profile.id)
            .execute(),
        )

      expect(await visibleTo(admin.userId)).toHaveLength(1)
      expect(await visibleTo(staff.userId)).toHaveLength(0)
      expect(await visibleTo(user.userId)).toHaveLength(0)
    })

    it("lets an admin see an event that is not open, and nobody else", async () => {
      const admin = await createUser(ROLES.ADMIN)
      const staff = await createUser(ROLES.STAFF)
      const event = await createTestEvent(tracker, kysely, {
        title: `RBAC cancelled ${Date.now()}`,
        event_status: "Cancelled",
      })

      const visibleTo = (userId: string) =>
        runAsAuthenticatedUser(kysely, userId, (trx) =>
          trx
            .selectFrom("events")
            .select("id")
            .where("id", "=", event.id)
            .execute(),
        )

      expect(await visibleTo(admin.userId)).toHaveLength(1)
      expect(await visibleTo(staff.userId)).toHaveLength(0)
    })

    it("lets a person read their own roles", async () => {
      const staff = await createUser(ROLES.STAFF)

      const rows = await runAsAuthenticatedUser(kysely, staff.userId, (trx) =>
        trx
          .selectFrom("user_roles")
          .select("role_name")
          .where("user_id", "=", staff.userId)
          .execute(),
      )

      expect(rows.map((row) => row.role_name)).toEqual([ROLES.STAFF])
    })

    it("never lets an authenticated user write roles, not even an admin", async () => {
      const admin = await createUser(ROLES.ADMIN)
      const user = await createUser()
      tracker.track("user_roles", user.userId)

      await expect(
        runAsAuthenticatedUser(kysely, admin.userId, (trx) =>
          trx
            .insertInto("user_roles")
            .values({ user_id: user.userId, role_name: ROLES.STAFF })
            .execute(),
        ),
      ).rejects.toThrow(/permission denied/)

      await expect(
        runAsAuthenticatedUser(kysely, admin.userId, (trx) =>
          trx
            .deleteFrom("user_roles")
            .where("user_id", "=", admin.userId)
            .execute(),
        ),
      ).rejects.toThrow(/permission denied/)
    })
  })
})
