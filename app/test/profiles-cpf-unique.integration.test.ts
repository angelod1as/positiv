import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { cleanupAfterTest, setupIntegrationTest } from "~/test/integration-setup"
import { createTestProfile } from "~/test/db-test-utils"

describe("One profile per CPF", () => {
  const { tracker, kysely } = setupIntegrationTest()
  let testId: number

  beforeEach(() => {
    tracker.clear()
    testId = Date.now()
  })

  afterEach(async () => {
    await cleanupAfterTest(tracker, kysely)
  })

  const profileWith = (suffix: string, cpf: string | null) =>
    createTestProfile(tracker, kysely, {
      user_id: null,
      email: `test${testId}-cpf-${suffix}@example.com`,
      cpf,
    })

  it("refuses a second profile with the same CPF, however it is written", async () => {
    await profileWith("first", "529.982.247-25")

    await expect(profileWith("second", "52998224725")).rejects.toThrow(
      /profiles_cpf_unique/,
    )
  })

  it("lets any number of profiles go without a CPF", async () => {
    await profileWith("none-1", null)
    await profileWith("none-2", null)
    await profileWith("empty-1", "")
    await profileWith("empty-2", "")
  })
})
