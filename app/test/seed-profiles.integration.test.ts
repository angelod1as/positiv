import { describe, expect, it } from "vitest"
import { isValidCpf } from "~/lib/helpers/cpf"
import { setupIntegrationTest } from "~/test/integration-setup"

/**
 * The profile update guard blocks every page for a profile whose CPF does not
 * check out. Seeded profiles that fail the rule would put that modal in front
 * of every authenticated E2E test, so the seeds have to hold real CPFs.
 */
describe("Seeded profiles", () => {
  const { kysely } = setupIntegrationTest()

  it("gives every seeded profile a CPF that passes the check digits", async () => {
    const seeded = await kysely
      .selectFrom("profiles")
      .select(["email", "cpf"])
      .where("email", "~", "^(admin|user[0-9]+)@example\\.com$")
      .execute()

    expect(seeded.length).toBeGreaterThan(0)

    const invalid = seeded
      .filter((profile) => !isValidCpf(profile.cpf))
      .map((profile) => `${profile.email}: ${profile.cpf}`)

    expect(invalid).toEqual([])
  })

  // Asaas knows a customer by CPF: two seeded profiles sharing one end up
  // sharing a customer, and the second to pay fails on it.
  it("gives every seeded profile a CPF of its own", async () => {
    const shared = await kysely
      .selectFrom("profiles")
      .select("cpf")
      .where("email", "~", "^(admin|user[0-9]+)@example\\.com$")
      .groupBy("cpf")
      .having((eb) => eb.fn.countAll(), ">", 1)
      .execute()

    expect(shared).toEqual([])
  })

  // A phone Asaas refuses is dropped from the customer, so a local payment
  // would never exercise the phone at all.
  it("gives every seeded profile a distinct Brazilian mobile", async () => {
    const seeded = await kysely
      .selectFrom("profiles")
      .select(["email", "phone"])
      .where("email", "~", "^(admin|user[0-9]+)@example\\.com$")
      .execute()

    const notMobile = seeded
      .filter((profile) => !/^[1-9]{2}9\d{8}$/.test(String(profile.phone)))
      .map((profile) => `${profile.email}: ${profile.phone}`)
    const phones = seeded.map((profile) => String(profile.phone))

    expect(notMobile).toEqual([])
    expect(new Set(phones).size).toBe(phones.length)
  })
})
