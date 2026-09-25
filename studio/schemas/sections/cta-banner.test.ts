import { describe, expect, it } from "vitest"

import { pathsOf } from "../../test/errors"
import { paragraphs } from "../../test/portable-text"
import { validateValueOf } from "../../test/validate"

const ctaBanner = {
  _type: "ctaBanner",
  title: "Não perca nossos próximos eventos",
  body: paragraphs("Faça login agora, candidate-se ao próximo evento."),
}

describe("ctaBanner", () => {
  it("accepts a title and a body", async () => {
    expect(await validateValueOf("ctaBanner", ctaBanner)).toEqual([])
  })

  it.each(["title", "body"])("requires the %s", async (field) => {
    const errors = await validateValueOf("ctaBanner", {
      ...ctaBanner,
      [field]: undefined,
    })

    expect(pathsOf(errors)).toContain(`ctaBanner.${field}`)
  })
})
