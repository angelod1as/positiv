import { describe, expect, it } from "vitest"

import { pathsOf } from "../../test/errors"
import { paragraphs } from "../../test/portable-text"
import { validateValueOf } from "../../test/validate"

const feedback = {
  _type: "feedback",
  title: "Nos deixe um feedback",
  body: paragraphs("Estamos sempre buscando melhorias."),
  ctaLabel: "Deixar feedback",
}

describe("feedback", () => {
  it("accepts a title, a body and a button label", async () => {
    expect(await validateValueOf("feedback", feedback)).toEqual([])
  })

  it.each(["title", "body", "ctaLabel"])("requires the %s", async (field) => {
    const errors = await validateValueOf("feedback", {
      ...feedback,
      [field]: undefined,
    })

    expect(pathsOf(errors)).toContain(`feedback.${field}`)
  })
})
