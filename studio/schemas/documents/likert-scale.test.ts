import { describe, expect, it } from "vitest"

import { pathsOf } from "../../test/errors"
import { validateDocumentOf } from "../../test/validate"
import { likertScale as likertScaleType, newLikertKey } from "./likert-scale"

const statement = (key: string, text: string) => ({
  _type: "likertStatement",
  _key: key,
  key,
  text,
})

const theme = (key: string, name: string, statements: unknown[]) => ({
  _type: "likertTheme",
  _key: key,
  name,
  statements,
})

const option = (key: string, label: string) => ({
  _type: "likertOption",
  _key: key,
  key,
  label,
})

const valid = {
  themes: [
    theme("t1", "Como vive a não-monogamia", [
      statement("s1", "Sou uma pessoa de exemplo."),
      statement("s2", "Gosto de afirmações de teste."),
    ]),
    theme("t2", "O que vem buscar", [statement("s3", "Quero testar.")]),
  ],
  venues: {
    question: "A quais destes você já foi?",
    options: [option("sauna", "Sauna"), option("nenhum", "Nenhum destes")],
  },
  nonMonogamySince: {
    question: "Desde quando você vive a não-monogamia?",
    notLivingLabel: "Não vivo a não-monogamia hoje",
  },
}

function validate(fields: Record<string, unknown>) {
  return validateDocumentOf("likertScale", fields)
}

describe("likertScale", () => {
  it("accepts a complete scale", async () => {
    expect(await validate(valid)).toEqual([])
  })

  it("requires at least one theme", async () => {
    expect(pathsOf(await validate({ ...valid, themes: [] }))).toContain(
      "themes",
    )
  })

  it("requires a theme name", async () => {
    const themes = [theme("t1", "", [statement("s1", "Texto.")])]
    expect(pathsOf(await validate({ ...valid, themes }))).toContain(
      "themes.t1.name",
    )
  })

  it("requires at least one statement in a theme", async () => {
    const themes = [theme("t1", "Tema", [])]
    expect(pathsOf(await validate({ ...valid, themes }))).toContain(
      "themes.t1.statements",
    )
  })

  it("rejects a blank statement", async () => {
    const themes = [theme("t1", "Tema", [statement("s1", "   ")])]
    expect(pathsOf(await validate({ ...valid, themes }))).toContain(
      "themes.t1.statements.s1.text",
    )
  })

  it("rejects a statement key outside the allowed format", async () => {
    const themes = [theme("t1", "Tema", [statement("Chave Ruim", "Texto.")])]
    expect(pathsOf(await validate({ ...valid, themes }))).toContain(
      "themes.t1.statements.Chave Ruim.key",
    )
  })

  it("rejects the same statement key in two themes", async () => {
    const themes = [
      theme("t1", "Tema 1", [statement("s1", "Um.")]),
      theme("t2", "Tema 2", [{ ...statement("s2", "Dois."), key: "s1" }]),
    ]
    expect(pathsOf(await validate({ ...valid, themes }))).toContain("themes")
  })

  it("requires at least one venue option", async () => {
    expect(
      pathsOf(
        await validate({ ...valid, venues: { ...valid.venues, options: [] } }),
      ),
    ).toContain("venues.options")
  })

  it("rejects two venue options with the same key", async () => {
    const options = [option("sauna", "Sauna"), { ...option("x", "Outra"), key: "sauna" }]
    expect(
      pathsOf(await validate({ ...valid, venues: { ...valid.venues, options } })),
    ).toContain("venues.options")
  })

  it("requires the questions' text", async () => {
    const paths = pathsOf(
      await validate({
        ...valid,
        venues: { ...valid.venues, question: "" },
        nonMonogamySince: { question: "", notLivingLabel: "" },
      }),
    )
    expect(paths).toEqual(
      expect.arrayContaining([
        "venues.question",
        "nonMonogamySince.question",
        "nonMonogamySince.notLivingLabel",
      ]),
    )
  })

  it("titles the preview Escala de Likert", () => {
    expect(likertScaleType.preview?.prepare?.()).toEqual({
      title: "Escala de Likert",
    })
  })
})

describe("newLikertKey", () => {
  it("makes a fresh key in the allowed format every time", () => {
    const first = newLikertKey()
    expect(first).toMatch(/^[a-z0-9][a-z0-9-]*$/)
    expect(newLikertKey()).not.toBe(first)
  })
})
