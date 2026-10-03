import { afterEach, describe, expect, it } from "vitest"
import { setupIntegrationTest } from "~/test/integration-setup"
import {
  SIGNUP_ATTEMPT_LIMIT,
  SIGNUP_ATTEMPT_WINDOW_MS,
  hashSignupIp,
  isSignupDomainBlocked,
  recordSignupAttempt,
} from "./signup-guard.server"

describe("Signup guard - Integration Tests", () => {
  const { kysely } = setupIntegrationTest()
  const runId = Date.now()
  const usedIps: string[] = []

  const testIp = (label: string) => {
    const ip = `test-${runId}-${label}`
    usedIps.push(ip)
    return ip
  }

  afterEach(async () => {
    if (usedIps.length === 0) return
    await kysely
      .deleteFrom("signup_attempts")
      .where("ip_hash", "in", usedIps.map(hashSignupIp))
      .execute()
    usedIps.length = 0
  })

  describe("recordSignupAttempt", () => {
    it("allows attempts up to the limit and refuses the next one", async () => {
      const ip = testIp("limit")

      for (let i = 0; i < SIGNUP_ATTEMPT_LIMIT; i++) {
        await expect(recordSignupAttempt(ip)).resolves.toBe(true)
      }

      await expect(recordSignupAttempt(ip)).resolves.toBe(false)
    })

    it("counts each address on its own", async () => {
      const busy = testIp("busy")
      const other = testIp("other")

      for (let i = 0; i < SIGNUP_ATTEMPT_LIMIT; i++) {
        await recordSignupAttempt(busy)
      }

      await expect(recordSignupAttempt(busy)).resolves.toBe(false)
      await expect(recordSignupAttempt(other)).resolves.toBe(true)
    })

    it("forgets attempts older than the window", async () => {
      const ip = testIp("window")
      const longAgo = new Date(Date.now() - SIGNUP_ATTEMPT_WINDOW_MS - 60_000)

      for (let i = 0; i < SIGNUP_ATTEMPT_LIMIT; i++) {
        await recordSignupAttempt(ip, longAgo)
      }

      await expect(recordSignupAttempt(ip)).resolves.toBe(true)
    })

    it("never stores the address in the clear", async () => {
      const ip = testIp("clear")

      await recordSignupAttempt(ip)

      const rows = await kysely
        .selectFrom("signup_attempts")
        .select("ip_hash")
        .where("ip_hash", "=", hashSignupIp(ip))
        .execute()

      expect(rows).toHaveLength(1)
      expect(rows[0].ip_hash).not.toContain(ip)
    })
  })

  describe("isSignupDomainBlocked", () => {
    it.each([
      "someone@aol.com",
      "someone@yahoo.com",
      "someone@comcast.net",
      "someone@verizon.net",
      "someone@shaw.ca",
    ])("blocks %s", async (email) => {
      await expect(isSignupDomainBlocked(email)).resolves.toBe(true)
    })

    it("matches the domain whatever its case or surrounding spaces", async () => {
      await expect(isSignupDomainBlocked("  Someone@AOL.com ")).resolves.toBe(
        true,
      )
    })

    it.each([
      "someone@gmail.com",
      "someone@hotmail.com",
      "someone@outlook.com",
      "someone@yahoo.com.br",
      "someone@uol.com.br",
      "someone@bol.com.br",
      "someone@icloud.com",
    ])("lets %s through", async (email) => {
      await expect(isSignupDomainBlocked(email)).resolves.toBe(false)
    })
  })
})
