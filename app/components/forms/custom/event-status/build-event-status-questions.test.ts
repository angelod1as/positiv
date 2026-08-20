import { describe, expect, it } from "vitest"
import { adminEventsCopy } from "~/copy/admin/events"
import { ALL_EVENT_STATUS_OPTIONS, eventStatusMap } from "~/lib/helpers/propMaps"
import { buildEventStatusQuestions } from "./build-event-status-questions"

describe("buildEventStatusQuestions", () => {
  it("asks about the status and nothing else", () => {
    const questions = buildEventStatusQuestions()

    expect(questions).toHaveLength(1)
    expect(questions[0].id).toBe("event_status")
    expect(questions[0].prompt).toBe(adminEventsCopy.statusForm.label)
  })

  it("offers every status an event can be in, named as the admin reads them", () => {
    const [question] = buildEventStatusQuestions()

    expect(question.input).toEqual({
      kind: "select",
      options: ALL_EVENT_STATUS_OPTIONS.map((status) => ({
        value: status,
        label: eventStatusMap(status),
      })),
    })
  })

  it("refuses a status no event can be in", () => {
    const [question] = buildEventStatusQuestions()

    expect(question.schema.safeParse("Draft").success).toBe(true)
    expect(question.schema.safeParse("Bananas").success).toBe(false)
    expect(question.schema.safeParse(undefined).success).toBe(false)
  })
})
