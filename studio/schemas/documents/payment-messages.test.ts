import { describe, expect, it } from "vitest"

import { pathsOf } from "../../test/errors"
import { validateDocumentOf } from "../../test/validate"
import {
  PAYMENT_MESSAGE_VARIABLES,
  paymentMessages as paymentMessagesType,
  unknownVariableProblem,
} from "./payment-messages"

const paymentMessages = {
  whatsappMessage:
    "Oi, {{nome}}! Aqui está o link para o pagamento da {{evento}}: {{link}} (vale até {{data}}). {{formas}}",
}

function validate(fields: Record<string, unknown>) {
  return validateDocumentOf("paymentMessages", fields)
}

describe("paymentMessages", () => {
  it("accepts a message using every known variable", async () => {
    expect(await validate(paymentMessages)).toEqual([])
  })

  it("accepts a message with no variables", async () => {
    expect(await validate({ whatsappMessage: "Fale com a organização." })).toEqual(
      [],
    )
  })

  it("requires the message", async () => {
    expect(
      pathsOf(await validate({ whatsappMessage: undefined })),
    ).toContain("whatsappMessage")
  })

  it("rejects an unknown variable", async () => {
    expect(
      pathsOf(await validate({ whatsappMessage: "Pague em {{boleto}}." })),
    ).toContain("whatsappMessage")
  })

  it("titles the preview Mensagens de pagamento", () => {
    expect(paymentMessagesType.preview?.prepare?.()).toEqual({
      title: "Mensagens de pagamento",
    })
  })
})

describe("unknownVariableProblem", () => {
  it("passes every documented variable, spaced or tight", () => {
    expect(unknownVariableProblem("{{link}} {{ data }} {{nome}}")).toBe(true)
    expect([...PAYMENT_MESSAGE_VARIABLES]).toEqual([
      "link",
      "data",
      "nome",
      "evento",
      "formas",
    ])
  })

  it("names the first unknown variable it finds", () => {
    const problem = unknownVariableProblem("{{link}} e {{boleto}}")
    expect(problem).toContain("{{boleto}}")
  })

  it("passes an empty or missing value", () => {
    expect(unknownVariableProblem("")).toBe(true)
    expect(unknownVariableProblem(undefined)).toBe(true)
  })
})
