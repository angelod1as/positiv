import { describe, expect, it } from "vitest"
import { eventFormSchema } from "~/business/admin/common"
import { adminEventsCopy } from "~/copy/admin/events"
import { buildEventQuestions } from "./build-event-questions"

const formCopy = adminEventsCopy.form

const byId = (id: string) => {
  const question = buildEventQuestions().find((one) => one.id === id)
  if (!question) throw new Error(`no question for ${id}`)
  return question
}

describe("buildEventQuestions", () => {
  it("asks for everything the event is described by, except its id", () => {
    const asked = buildEventQuestions().map((question) => question.id)

    const described = Object.keys(eventFormSchema.shape).filter(
      (field) => field !== "id",
    )

    expect(asked.sort()).toEqual(described.sort())
  })

  it("names each question with the label the admin reads", () => {
    expect(byId("title").prompt).toBe(formCopy.labels.title)
    expect(byId("time_group_start").prompt).toBe(
      formCopy.labels.time_group_start,
    )
  })

  it("tells the times apart by name alone", () => {
    const prompts = buildEventQuestions()
      .filter((question) => question.input.kind === "datetime")
      .map((question) => question.prompt)

    expect(new Set(prompts).size).toBe(prompts.length)
  })

  it("draws every time as a date and an hour together", () => {
    const times = buildEventQuestions().filter((question) =>
      question.id.startsWith("time_"),
    )

    expect(times).toHaveLength(7)
    for (const time of times) {
      expect(time.input.kind).toBe("datetime")
    }
  })

  it("gives the description room to breathe, and its hint", () => {
    const description = byId("description")

    expect(description.input).toEqual({
      kind: "textarea",
      placeholder: formCopy.placeholders.description,
    })
    expect(description.help).toBe(formCopy.descriptions.description)
  })

  it("says what the price and the capacity are counted in", () => {
    expect(byId("ticket_price").input).toEqual({
      kind: "textnumber",
      placeholder: formCopy.placeholders.ticket_price,
      prefix: formCopy.ticketPricePrefix,
    })
    expect(byId("total_spots").input).toEqual({
      kind: "textnumber",
      placeholder: formCopy.placeholders.total_spots,
      suffix: formCopy.totalSpotsSuffix,
    })
  })

  it("asks about publishing itself as one box", () => {
    const autoPublish = byId("auto_publish")

    expect(autoPublish.input).toEqual({ kind: "boolean" })
    expect(autoPublish.help).toBe(formCopy.descriptions.auto_publish)
  })

  it("judges an answer by the schema the save will use", () => {
    expect(byId("title").schema.safeParse("a").success).toBe(false)
    expect(byId("title").schema.safeParse("Rapa do Tacho").success).toBe(true)
    expect(byId("emoji").schema.safeParse("festa").success).toBe(false)
    expect(byId("emoji").schema.safeParse("🎉").success).toBe(true)
  })
})
