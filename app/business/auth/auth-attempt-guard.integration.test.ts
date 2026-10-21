import { afterEach, describe, expect, it } from "vitest"
import { setupIntegrationTest } from "~/test/integration-setup"
import {
  AUTH_ATTEMPT_LIMITS,
  hashAuthAttemptKey,
  recordAuthAttempt,
  releaseAuthAttempt,
  reserveAuthAttempt,
} from "./auth-attempt-guard.server"

describe("Auth attempt guard - Integration Tests", () => {
  const { kysely } = setupIntegrationTest()
  const runId = Date.now()
  const usedKeys: string[] = []

  const testKey = (label: string) => {
    const key = `test-${runId}-${label}`
    usedKeys.push(key)
    return key
  }

  afterEach(async () => {
    if (usedKeys.length === 0) return
    await kysely
      .deleteFrom("auth_attempts")
      .where("key_hash", "in", usedKeys.map(hashAuthAttemptKey))
      .execute()
    usedKeys.length = 0
  })

  describe("recordAuthAttempt", () => {
    const { limit, windowMs } = AUTH_ATTEMPT_LIMITS.reset_ip

    it("allows attempts up to the limit and refuses the next one", async () => {
      const key = testKey("limit")

      for (let i = 0; i < limit; i++) {
        await expect(recordAuthAttempt("reset_ip", key)).resolves.toBe(true)
      }

      await expect(recordAuthAttempt("reset_ip", key)).resolves.toBe(false)
    })

    it("lets exactly the limit through when attempts arrive at once", async () => {
      const key = testKey("burst")

      const answers = await Promise.all(
        Array.from({ length: limit + 5 }, () =>
          recordAuthAttempt("reset_ip", key),
        ),
      )

      expect(answers.filter(Boolean)).toHaveLength(limit)
    })

    it("counts each key on its own", async () => {
      const busy = testKey("busy")
      const other = testKey("other")

      for (let i = 0; i < limit; i++) {
        await recordAuthAttempt("reset_ip", busy)
      }

      await expect(recordAuthAttempt("reset_ip", busy)).resolves.toBe(false)
      await expect(recordAuthAttempt("reset_ip", other)).resolves.toBe(true)
    })

    it("counts each scope on its own", async () => {
      const key = testKey("scope")

      for (let i = 0; i < limit; i++) {
        await recordAuthAttempt("reset_ip", key)
      }

      await expect(recordAuthAttempt("reset_ip", key)).resolves.toBe(false)
      await expect(recordAuthAttempt("login_ip", key)).resolves.toBe(true)
    })

    it("gives the turns back once the window has passed", async () => {
      const key = testKey("window")
      const longAgo = new Date(Date.now() - windowMs - 60_000)

      for (let i = 0; i < limit; i++) {
        await recordAuthAttempt("reset_ip", key, longAgo)
      }

      await expect(recordAuthAttempt("reset_ip", key)).resolves.toBe(true)
    })

    it("treats an e-mail the same whatever its case or surrounding spaces", async () => {
      const key = testKey("case")
      const { limit: emailLimit } = AUTH_ATTEMPT_LIMITS.reset_email

      for (let i = 0; i < emailLimit; i++) {
        await recordAuthAttempt("reset_email", `  ${key.toUpperCase()} `)
      }

      await expect(recordAuthAttempt("reset_email", key)).resolves.toBe(false)
    })

    it("never stores the key in the clear", async () => {
      const key = testKey("clear")

      await recordAuthAttempt("reset_ip", key)

      const rows = await kysely
        .selectFrom("auth_attempts")
        .select("key_hash")
        .where("key_hash", "=", hashAuthAttemptKey(key))
        .execute()

      expect(rows).toHaveLength(1)
      expect(rows[0].key_hash).not.toContain(key)
    })
  })

  describe("reserveAuthAttempt and releaseAuthAttempt", () => {
    const { limit } = AUTH_ATTEMPT_LIMITS.login_email

    it("refuses a reservation once the key holds the limit", async () => {
      const key = testKey("reserve")

      for (let i = 0; i < limit; i++) {
        await expect(
          reserveAuthAttempt("login_email", key),
        ).resolves.not.toBeNull()
      }

      await expect(reserveAuthAttempt("login_email", key)).resolves.toBeNull()
    })

    it("answers with the reservation as a number", async () => {
      const key = testKey("reserve-id")

      const id = await reserveAuthAttempt("login_email", key)

      expect(typeof id).toBe("number")
    })

    it("lets exactly the limit reserve when attempts arrive at once", async () => {
      const key = testKey("reserve-burst")

      const reservations = await Promise.all(
        Array.from({ length: limit + 5 }, () =>
          reserveAuthAttempt("login_email", key),
        ),
      )

      expect(reservations.filter((id) => id !== null)).toHaveLength(limit)
    })

    it("gives a released reservation back", async () => {
      const key = testKey("release")
      const reservations: (number | null)[] = []

      for (let i = 0; i < limit; i++) {
        reservations.push(await reserveAuthAttempt("login_email", key))
      }

      await releaseAuthAttempt(reservations[0] as number)

      await expect(
        reserveAuthAttempt("login_email", key),
      ).resolves.not.toBeNull()
    })
  })
})
