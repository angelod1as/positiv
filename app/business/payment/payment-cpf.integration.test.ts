import { afterEach, beforeEach, describe, expect, it } from "vitest"
import {
  cleanupAfterTest,
  setupIntegrationTest,
} from "~/test/integration-setup"
import { createTestProfile } from "~/test/db-test-utils"
import { paymentsCopy } from "~/copy/payments"
import { savePaymentCpf } from "./payment-cpf.server"

describe("savePaymentCpf", () => {
  const { tracker, kysely } = setupIntegrationTest()
  let profileId: string

  beforeEach(async () => {
    tracker.clear()
    const testId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const profile = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: `test${testId}-cpf@example.com`,
      full_name: "Ana Souza",
      cpf: null,
    })
    profileId = profile.id
  })

  afterEach(async () => {
    await cleanupAfterTest(tracker, kysely)
  })

  const cpfOf = async () =>
    (
      await kysely
        .selectFrom("profiles")
        .select("cpf")
        .where("id", "=", profileId)
        .executeTakeFirstOrThrow()
    ).cpf

  it("saves a CPF that checks out, keeping only the digits", async () => {
    const result = await savePaymentCpf({ profileId, cpf: "529.982.247-25" })

    expect(result.success).toBe(true)
    expect(await cpfOf()).toBe("52998224725")
  })

  it("refuses one whose digits do not check out and leaves the profile alone", async () => {
    const result = await savePaymentCpf({ profileId, cpf: "111.111.111-11" })

    expect(result.success).toBe(false)
    expect(result.success === false && result.errors[0]?.message).toBe(
      paymentsCopy.errors.invalidCpf,
    )
    expect(await cpfOf()).toBeNull()
  })

  it("refuses a CPF of the wrong length", async () => {
    const result = await savePaymentCpf({ profileId, cpf: "5299822472" })

    expect(result.success).toBe(false)
    expect(await cpfOf()).toBeNull()
  })
})
