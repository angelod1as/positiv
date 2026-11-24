import { describe, expect, it } from "vitest"
import { rulesQuery } from "./rules-query"
import { rulesSchema } from "./rules.schema"
import { createProductionReadClient } from "./production-read-client.server"

describe("the published Regras singleton in production", () => {
  it("satisfies the Rules contract once it is published", async () => {
    const document = await createProductionReadClient().fetch(rulesQuery)

    // Production has no Rules until they are first published. Absent Rules
    // are not a contract breach; once present they must satisfy the contract.
    if (document === null || document === undefined) return

    expect(rulesSchema.parse(document)).toEqual(document)
  })
})
