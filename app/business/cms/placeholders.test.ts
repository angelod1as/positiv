import { describe, expect, it } from "vitest"
import { renderTemplate, unknownVariables } from "./placeholders"

const whitelist = ["nome", "evento", "link"] as const

const values = {
  nome: "Ana",
  evento: "Festa",
  link: "https://positiv.test/pagamento/1",
}

describe("renderTemplate", () => {
  it("substitutes every variable the whitelist allows", () => {
    expect(
      renderTemplate("Oi {{nome}}, {{evento}} em {{link}}", values, whitelist),
    ).toBe("Oi Ana, Festa em https://positiv.test/pagamento/1")
  })

  it("tolerates whitespace inside the braces", () => {
    expect(renderTemplate("{{ nome }}", values, whitelist)).toBe("Ana")
  })

  it("leaves text without variables unchanged", () => {
    expect(renderTemplate("Sem variável.", values, whitelist)).toBe(
      "Sem variável.",
    )
  })

  it("does not require the template to use every variable", () => {
    expect(renderTemplate("Apenas {{nome}}.", values, whitelist)).toBe(
      "Apenas Ana.",
    )
  })

  it("throws naming an unknown variable rather than blanking it", () => {
    expect(() =>
      renderTemplate("Pague em {{boleto}}.", values, whitelist),
    ).toThrow(/\{\{boleto\}\}/)
  })

  it.each(["{{ nome-completo }}", "{{#if nome}}", "{{nome.first}}", "{{}}"])(
    "rejects the malformed token %s instead of copying its braces",
    (token) => {
      expect(() =>
        renderTemplate(`Olá ${token}`, values, whitelist),
      ).toThrow()
    },
  )

  it("does not re-interpolate a value that itself looks like a variable", () => {
    expect(
      renderTemplate("Oi {{nome}}", { ...values, nome: "{{link}}" }, whitelist),
    ).toBe("Oi {{link}}")
  })
})

describe("unknownVariables", () => {
  it("lists only the variables outside the whitelist, once each", () => {
    expect(
      unknownVariables("{{nome}} {{boleto}} {{boleto}} {{pix}}", whitelist),
    ).toEqual(["boleto", "pix"])
  })

  it("returns nothing for a template inside the whitelist", () => {
    expect(unknownVariables("{{nome}} {{ evento }}", whitelist)).toEqual([])
  })
})
