import { describe, expect, it } from "vitest"
import { validationMessages } from "~/lib/helpers/validation-messages"
import { zod } from "~/lib/helpers/zod"
import { getRulesFormSchema } from "./rules-form-schema"
import { getRulesFormQuestions } from "./rules-questions"

const questionKeysByKind = () => {
  const questions = getRulesFormQuestions("regular")
  const entries = Object.entries(questions)

  return {
    radio: entries.find(([, q]) => q.answers.correct.length === 1)?.[0],
    checkbox: entries.find(([, q]) => q.answers.correct.length > 1)?.[0],
  }
}

describe("getRulesFormSchema", () => {
  const parseEmpty = () => {
    const schema = zod.object(getRulesFormSchema("regular"))
    const result = schema.safeParse({})

    if (result.success) {
      throw new Error("expected the empty quiz to fail validation")
    }

    return result.error.issues
  }

  const messagesFor = (key: string) =>
    parseEmpty()
      .filter((issue) => issue.path[0] === key)
      .map((issue) => issue.message)

  it("should show the standard required message for an unanswered radio question", () => {
    const { radio } = questionKeysByKind()

    expect(radio).toBeDefined()
    expect(messagesFor(radio as string)).toEqual([validationMessages.required])
  })

  it("should show the standard required message for an unanswered checkbox question", () => {
    const { checkbox } = questionKeysByKind()

    expect(checkbox).toBeDefined()
    expect(messagesFor(checkbox as string)[0]).toBe(validationMessages.required)
  })

  it("should never show a zod message to the person answering", () => {
    const messages = parseEmpty().map((issue) => issue.message)

    expect(messages.length).toBeGreaterThan(0)
    for (const message of messages) {
      expect(message).not.toContain("Expected")
      expect(message).not.toContain("Invalid")
      expect(message).not.toContain("undefined")
    }
  })
})
