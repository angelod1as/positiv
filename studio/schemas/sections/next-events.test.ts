import { describe, expect, it } from "vitest"

import { pathsOf } from "../../test/errors"
import { validateValueOf } from "../../test/validate"

const nextEvents = {
  _type: "nextEvents",
  title: "Próximos Eventos",
  subtitle: "Confira nossos próximos encontros e garanta sua participação.",
  count: 3,
}

describe("nextEvents", () => {
  it("accepts a title, a subtitle and how many events to show", async () => {
    expect(await validateValueOf("nextEvents", nextEvents)).toEqual([])
  })

  it.each(["title", "subtitle", "count"])("requires the %s", async (field) => {
    const errors = await validateValueOf("nextEvents", {
      ...nextEvents,
      [field]: undefined,
    })

    expect(pathsOf(errors)).toContain(`nextEvents.${field}`)
  })

  it.each([0, 7, 2.5])("rejects showing %s events", async (count) => {
    const errors = await validateValueOf("nextEvents", { ...nextEvents, count })

    expect(pathsOf(errors)).toContain("nextEvents.count")
  })
})
