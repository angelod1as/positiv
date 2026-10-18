import type { PortableTextBlock } from "sanity"
import { describe, expect, it } from "vitest"
import {
  placeholderText,
  unknownVariableProblem,
} from "./placeholder-validation"

const whitelist = ["nome", "evento"] as const

const block = (...texts: { text: string; strong?: boolean }[]) =>
  [
    {
      _type: "block",
      _key: "a",
      style: "normal",
      markDefs: [],
      children: texts.map((span, index) => ({
        _type: "span",
        _key: `s${index}`,
        text: span.text,
        marks: span.strong ? ["strong"] : [],
      })),
    },
  ] as unknown as PortableTextBlock[]

describe("placeholderText", () => {
  it("returns a plain string unchanged", () => {
    expect(placeholderText("Oi {{nome}}")).toBe("Oi {{nome}}")
  })

  it("returns an empty string for undefined", () => {
    expect(placeholderText(undefined)).toBe("")
  })

  it("flattens Portable Text spans to their text", () => {
    const text = placeholderText(
      block({ text: "Oi {{nome}}, " }, { text: "{{evento}}", strong: true }),
    )
    expect(text).toContain("{{nome}}")
    expect(text).toContain("{{evento}}")
  })
})

describe("unknownVariableProblem", () => {
  it("passes a value inside the whitelist, spaced or tight", () => {
    expect(unknownVariableProblem("{{nome}} {{ evento }}", whitelist)).toBe(true)
  })

  it("passes an empty or missing value", () => {
    expect(unknownVariableProblem("", whitelist)).toBe(true)
    expect(unknownVariableProblem(undefined, whitelist)).toBe(true)
  })

  it("names the first unknown variable and lists the allowed set", () => {
    const problem = unknownVariableProblem("{{nome}} e {{boleto}}", whitelist)
    expect(problem).toContain("{{boleto}}")
    expect(problem).toContain("{{nome}}")
    expect(problem).toContain("{{evento}}")
  })

  it("rejects a malformed token", () => {
    expect(unknownVariableProblem("{{ nome-completo }}", whitelist)).not.toBe(
      true,
    )
  })

  it("finds an unknown variable inside Portable Text", () => {
    expect(unknownVariableProblem(block({ text: "{{boleto}}" }), whitelist)).toContain(
      "{{boleto}}",
    )
  })
})
