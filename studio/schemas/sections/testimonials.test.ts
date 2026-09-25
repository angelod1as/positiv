import { describe, expect, it } from "vitest"

import { pathsOf } from "../../test/errors"
import { validateValueOf } from "../../test/validate"

const quote = {
  _type: "testimonial",
  _key: "q1",
  author: "A., 32",
  quote: "Foi uma experiência libertadora.",
}

const testimonials = {
  _type: "testimonials",
  title: "Quem vai, nunca esquece",
  subtitle: "Experiências reais de algumas pessoas.",
  quotes: [quote],
}

describe("testimonials", () => {
  it("accepts a title, a subtitle and a quote", async () => {
    expect(await validateValueOf("testimonials", testimonials)).toEqual([])
  })

  it.each(["title", "subtitle", "quotes"])("requires the %s", async (field) => {
    const errors = await validateValueOf("testimonials", {
      ...testimonials,
      [field]: undefined,
    })

    expect(pathsOf(errors)).toContain(`testimonials.${field}`)
  })

  it("rejects an empty list of quotes", async () => {
    const errors = await validateValueOf("testimonials", {
      ...testimonials,
      quotes: [],
    })

    expect(pathsOf(errors)).toContain("testimonials.quotes")
  })

  it.each(["author", "quote"])("requires each quote's %s", async (field) => {
    const errors = await validateValueOf("testimonials", {
      ...testimonials,
      quotes: [{ ...quote, [field]: undefined }],
    })

    expect(pathsOf(errors)).toContain(`testimonials.quotes.q1.${field}`)
  })
})
