import { describe, expect, it } from "vitest"

import { LIKERT_KEY_PATTERN } from "../../../app/business/cms/likert-key"
import { pathsOf } from "../../test/errors"
import { validateDocumentOf } from "../../test/validate"
import { likertScale as likertScaleType, newLikertKey } from "./likert-scale"

const statement = (key: string, text: string) => ({
  _type: "likertStatement",
  _key: key,
  key,
  text,
})

const valid = {
  statements: [
    statement("s1", "Sou uma pessoa de exemplo."),
    statement("s2", "Gosto de afirmações de teste."),
  ],
}

function validate(fields: Record<string, unknown>) {
  return validateDocumentOf("likertScale", fields)
}

describe("likertScale", () => {
  it("accepts a list of statements", async () => {
    expect(await validate(valid)).toEqual([])
  })

  it("requires at least one statement", async () => {
    expect(pathsOf(await validate({ statements: [] }))).toContain("statements")
  })

  it("rejects a blank statement", async () => {
    expect(
      pathsOf(await validate({ statements: [statement("s1", "   ")] })),
    ).toContain("statements.s1.text")
  })

  it("rejects a statement key outside the allowed format", async () => {
    expect(
      pathsOf(await validate({ statements: [statement("Chave Ruim", "Texto.")] })),
    ).toContain("statements.Chave Ruim.key")
  })

  // The key is hidden, so the error lands on the duplicated statements
  // themselves: on a long list the editor can see which ones to fix.
  it("flags each statement that shares its key with another", async () => {
    const statements = [
      statement("s1", "Um."),
      { ...statement("s2", "Dois."), key: "s1" },
      statement("s3", "Três."),
    ]
    expect(pathsOf(await validate({ statements }))).toEqual([
      "statements.s1",
      "statements.s2",
    ])
  })

  it("describes the page to whoever edits it", () => {
    const field = likertScaleType.fields.find(
      (candidate) => candidate.name === "statements",
    )
    expect(field?.description).toContain("sem perda de dados")
  })

  it("keeps the statement key out of the editor's sight", () => {
    const list = likertScaleType.fields.find(
      (candidate) => candidate.name === "statements",
    ) as { of: { fields: { name: string; hidden?: unknown }[] }[] }
    const key = list.of[0].fields.find((field) => field.name === "key")
    expect(key?.hidden).toBe(true)
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
    expect(first).toMatch(LIKERT_KEY_PATTERN)
    expect(newLikertKey()).not.toBe(first)
  })
})
