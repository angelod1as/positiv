import { describe, expect, it } from "vitest"
import { validationMessages } from "~/lib/helpers/validation-messages"
import { zod } from "~/lib/helpers/zod"
import { getRulesFormSchema } from "./rules-form-schema"

describe("getRulesFormSchema", () => {
  it("should show the standard required message when checkbox question receives undefined", () => {
    const schemaFields = getRulesFormSchema("regular")
    const schema = zod.object(schemaFields)

    const result = schema.safeParse({})

    expect(result.success).toBe(false)
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message)
      expect(messages).not.toContain("Expected array, received undefined")
      expect(messages.length).toBeGreaterThan(0)
      expect(new Set(messages)).toEqual(new Set([validationMessages.required]))
    }
  })
})
