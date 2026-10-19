import { describe, expect, it } from "vitest"
import { emailTemplatesQuery } from "./email-templates-query"
import { emailTemplatesSchema } from "./email-templates.schema"
import { createProductionReadClient } from "./production-read-client.server"

describe("the published E-mails singleton in production", () => {
  it("satisfies the email contract", async () => {
    const document = await createProductionReadClient().fetch(
      emailTemplatesQuery,
    )

    expect(document).not.toBeNull()
    expect(emailTemplatesSchema.parse(document)).toEqual(document)
  })
})
