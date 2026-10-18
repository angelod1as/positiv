import { describe, expect, it } from "vitest"
import { emailTemplatesQuery } from "./email-templates-query"
import { emailTemplatesSchema } from "./email-templates.schema"
import { createProductionReadClient } from "./production-read-client.server"

describe("the published E-mails singleton in production", () => {
  it("satisfies the email contract once it is published", async () => {
    const document = await createProductionReadClient().fetch(
      emailTemplatesQuery,
    )

    // The migration seeds this singleton on production before the move merges.
    // Until it has run the singleton may be absent, which is not a contract
    // breach; once present it must satisfy the contract the app reads it with.
    // POS-611 removes this early return once the migration has run, so the test
    // cannot pass vacuously forever.
    if (document === null || document === undefined) return

    expect(emailTemplatesSchema.parse(document)).toEqual(document)
  })
})
