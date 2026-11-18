import { describe, expect, it } from "vitest"
import { likertScaleQuery } from "./likert-scale-query"
import { likertScaleSchema } from "./likert-scale.schema"
import { createProductionReadClient } from "./production-read-client.server"

describe("the published Escala de Likert singleton in production", () => {
  it("satisfies the Likert scale contract once it is published", async () => {
    const document =
      await createProductionReadClient().fetch(likertScaleQuery)

    // The scale is written in the Studio, not by a migration, so production
    // has none until it is first published. An absent scale is not a contract
    // breach; once present it must satisfy the contract the app reads it with.
    if (document === null || document === undefined) return

    expect(likertScaleSchema.parse(document)).toEqual(document)
  })
})
