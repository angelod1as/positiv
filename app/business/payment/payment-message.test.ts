import { describe, expect, it } from "vitest"
import {
  PAYMENT_MESSAGE_VARIABLES,
  renderPaymentMessage,
  unknownVariables,
} from "./payment-message"

const values = {
  link: "https://positiv.test/pagamento/1",
  data: "31/12/2026",
  nome: "Ana",
  evento: "Festa",
  formas: "• Pix — R$ 150,00",
}

describe("renderPaymentMessage", () => {
  it("substitutes every documented variable", () => {
    const template =
      "Oi, {{nome}}! Pague {{evento}} em {{link}} até {{data}}. {{formas}}"

    expect(renderPaymentMessage(template, values)).toBe(
      "Oi, Ana! Pague Festa em https://positiv.test/pagamento/1 até 31/12/2026. • Pix — R$ 150,00",
    )
  })

  it("tolerates whitespace inside the braces", () => {
    expect(renderPaymentMessage("{{ link }}", values)).toBe(values.link)
  })

  it("leaves text without variables unchanged", () => {
    expect(renderPaymentMessage("Fale com a organização.", values)).toBe(
      "Fale com a organização.",
    )
  })

  it("does not require the template to use every variable", () => {
    expect(renderPaymentMessage("Apenas {{link}}.", values)).toBe(
      "Apenas https://positiv.test/pagamento/1.",
    )
  })

  it("throws naming an unknown variable rather than blanking it", () => {
    expect(() => renderPaymentMessage("Pague em {{boleto}}.", values)).toThrow(
      /\{\{boleto\}\}/,
    )
  })
})

describe("unknownVariables", () => {
  it("lists only the variables outside the documented set, once each", () => {
    expect(unknownVariables("{{link}} {{boleto}} {{boleto}} {{pix}}")).toEqual([
      "boleto",
      "pix",
    ])
  })

  it("documents exactly the supported set", () => {
    expect([...PAYMENT_MESSAGE_VARIABLES]).toEqual([
      "link",
      "data",
      "nome",
      "evento",
      "formas",
    ])
  })
})
