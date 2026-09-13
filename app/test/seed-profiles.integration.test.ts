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
})
