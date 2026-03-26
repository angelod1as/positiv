import { describe, expect, it } from "vitest"
import { zod } from "~/lib/helpers/zod"
import { getRulesFormSchema } from "./rules-form-schema"

describe("getRulesFormSchema", () => {
  it("should show 'Resposta obrigatória' when checkbox question receives undefined", () => {
    const schemaFields = getRulesFormSchema("regular")
    const schema = zod.object(schemaFields)

    const result = schema.safeParse({})

    expect(result.success).toBe(false)
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message)
      expect(messages).not.toContain("Expected array, received undefined")
      expect(messages).toContain("Resposta obrigatória")
    }
  })
})
