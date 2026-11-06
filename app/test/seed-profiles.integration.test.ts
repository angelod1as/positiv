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

  it("gives every seeded profile a CPF that passes the check digits, but the foreigner", async () => {
    const seeded = await kysely
      .selectFrom("profiles")
      .select(["email", "cpf"])
      .where("email", "~", "^(admin|user[0-9]+)@example\\.com$")
      .where("cpf_exempt", "=", false)
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
      .where("cpf", "is not", null)
      .groupBy("cpf")
      .having((eb) => eb.fn.countAll(), ">", 1)
      .execute()

    expect(shared).toEqual([])
  })

  // A phone Asaas refuses is dropped from the customer, so a local payment
  // would never exercise the phone at all.
  it("gives every seeded profile a distinct Brazilian mobile, but the foreigner", async () => {
    const seeded = await kysely
      .selectFrom("profiles")
      .select(["email", "phone"])
      .where("email", "~", "^(admin|user[0-9]+)@example\\.com$")
      .where("phone_is_international", "=", false)
      .execute()

    const notMobile = seeded
      .filter((profile) => !/^[1-9]{2}9\d{8}$/.test(String(profile.phone)))
      .map((profile) => `${profile.email}: ${profile.phone}`)
    const phones = seeded.map((profile) => String(profile.phone))

    expect(notMobile).toEqual([])
    expect(new Set(phones).size).toBe(phones.length)
  })

  // Someone with no CPF, exempted by an admin, so every screen that treats a
  // foreigner differently has a profile to be looked at with. WEB-40
  it("seeds one foreign participant, exempt from the CPF", async () => {
    const foreigner = await kysely
      .selectFrom("profiles as p")
      .innerJoin("event_participants as ep", "ep.profile_id", "p.id")
      .innerJoin("events as e", "e.id", "ep.event_id")
      .select([
        "p.cpf",
        "p.cpf_exempt",
        "p.rg",
        "p.rg_issuer",
        "p.phone_is_international",
        "e.title",
      ])
      .where("p.email", "=", "user9@example.com")
      .where("e.title", "=", "Evento Com Inscrições Abertas 1")
      .executeTakeFirst()

    expect(foreigner).toEqual({
      cpf: null,
      cpf_exempt: true,
      rg: "C01X00T47",
      rg_issuer: "Alemanha",
      phone_is_international: true,
      title: "Evento Com Inscrições Abertas 1",
    })
  })
})
