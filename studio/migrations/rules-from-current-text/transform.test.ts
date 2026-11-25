import { describe, expect, it } from "vitest"

import { validateDocumentOf } from "../../test/validate"
import {
  rulesDocument,
  splitIntoRules,
  type SourceBlock,
} from "./transform"

const block = (
  spans: [string, string[]?][],
  fields: Partial<SourceBlock> = {},
): SourceBlock => ({
  _type: "block",
  _key: "k",
  style: "normal",
  markDefs: [],
  children: spans.map(([text, marks = []], index) => ({
    _type: "span",
    _key: `s${index}`,
    text,
    marks,
  })),
  ...fields,
})

const textOf = (blocks: { children: { text: string }[] }[]) =>
  blocks.map((each) => each.children.map((span) => span.text).join(""))

describe("splitIntoRules", () => {
  it("starts a rule at each paragraph that opens with an emoji", () => {
    const rules = splitIntoRules(
      [
        block([["🚨 Nenhuma pessoa é obrigada a nada 🚨", ["strong"]]]),
        block([["Se você não quiser, não faça."]]),
        block([["📸 Sem celular e sem fotos 📸", ["strong"]]]),
        block([["Usar o celular é proibido."]]),
        block([["O acesso só é permitido na garagem."]]),
      ],
      "geral",
    )

    expect(rules.map((rule) => rule.title)).toEqual([
      "🚨 Nenhuma pessoa é obrigada a nada 🚨",
      "📸 Sem celular e sem fotos 📸",
    ])
    expect(textOf(rules[1].body)).toEqual([
      "Usar o celular é proibido.",
      "O acesso só é permitido na garagem.",
    ])
  })

  it("keeps bold, italic and list items in the text", () => {
    const [rule] = splitIntoRules(
      [
        block([["👍 Apenas SIM é SIM 👍"]]),
        block([["Ficou na dúvida? É "], ["não", ["strong"]], [";"]], {
          listItem: "bullet",
          level: 1,
        }),
      ],
      "geral",
    )

    expect(rule.body[0]).toMatchObject({ listItem: "bullet", level: 1 })
    expect(rule.body[0].children[1]).toMatchObject({
      text: "não",
      marks: ["strong"],
    })
  })

  it("finds a title written after a line break inside another paragraph", () => {
    const rules = splitIntoRules(
      [
        block([["⏰ Pontualidade 🕐"]]),
        block([
          ["Por favor, seja "],
          ["pontual", ["strong"]],
          [".\n\n🥯 Comidinhas 🌯\nCada participante leva uma comidinha. "],
        ]),
      ],
      "acordo",
    )

    expect(rules.map((rule) => rule.title)).toEqual([
      "⏰ Pontualidade 🕐",
      "🥯 Comidinhas 🌯",
    ])
    expect(textOf(rules[0].body)).toEqual(["Por favor, seja pontual."])
    expect(rules[0].body[0].children[1].marks).toEqual(["strong"])
    expect(textOf(rules[1].body)).toEqual([
      "Cada participante leva uma comidinha.",
    ])
  })

  it("drops empty paragraphs and the line breaks around a title", () => {
    const rules = splitIntoRules(
      [
        block([["🤫 Sigilo 🤫"]]),
        block([["Não comentamos."]]),
        block([[""]]),
        block([["\n"], ["😷 Proteção e saúde 😷", ["strong"]]]),
        block([["Camisinha sempre. \n"]]),
      ],
      "geral",
    )

    expect(rules.map((rule) => rule.title)).toEqual([
      "🤫 Sigilo 🤫",
      "😷 Proteção e saúde 😷",
    ])
    expect(textOf(rules[0].body)).toEqual(["Não comentamos."])
    expect(textOf(rules[1].body)).toEqual(["Camisinha sempre."])
  })

  it("gives every rule and block its own key", () => {
    const rules = splitIntoRules(
      [
        block([["⏰ Pontualidade 🕐"]]),
        block([["Seja pontual.\n🥯 Comidinhas 🌯\nLeve comida."]]),
      ],
      "acordo",
    )
    const keys = [
      ...rules.map((rule) => rule._key),
      ...rules.flatMap((rule) => rule.body.map((each) => each._key)),
    ]

    expect(new Set(keys).size).toBe(keys.length)
  })

  it("refuses text before the first title, rather than losing it", () => {
    expect(() =>
      splitIntoRules([block([["Um texto sem título."]])], "geral"),
    ).toThrow(/título/)
  })
})

describe("rulesDocument", () => {
  it("builds a draft of the Rules the Studio accepts", async () => {
    const general = splitIntoRules(
      [block([["🚨 Regra 🚨"]]), block([["Texto."]])],
      "geral",
    )
    const document = rulesDocument({
      generalRules: general,
      agreements: general,
      privateRules: [],
    })

    expect(document._id).toBe("drafts.rules")
    expect(document._type).toBe("rules")
    expect(await validateDocumentOf("rules", document)).toEqual([])
  })
})
