import { describe, expect, it } from "vitest"
import { emailTemplatesSchema } from "./email-templates.schema"

const body = (...spans: { text: string; marks?: string[] }[]) => [
  {
    _type: "block",
    _key: "p0",
    style: "normal",
    markDefs: [],
    children: spans.map((span, index) => ({
      _type: "span",
      _key: `s${index}`,
      text: span.text,
      marks: span.marks ?? [],
    })),
  },
]

const paymentLink = {
  subject: "Seu pagamento da {{evento}}",
  heading: "Hora de garantir sua vaga",
  body: body(
    { text: "{{nome}}, sua vaga na " },
    { text: "{{evento}}", marks: ["strong"] },
  ),
}

describe("emailTemplatesSchema", () => {
  it("accepts copy using only the documented variables", () => {
    expect(emailTemplatesSchema.safeParse({ paymentLink }).success).toBe(true)
  })

  it("rejects a variable the subject does not allow", () => {
    expect(
      emailTemplatesSchema.safeParse({
        paymentLink: { ...paymentLink, subject: "Oi {{nome}}" },
      }).success,
    ).toBe(false)
  })

  it("rejects any variable in the heading", () => {
    expect(
      emailTemplatesSchema.safeParse({
        paymentLink: { ...paymentLink, heading: "{{evento}}" },
      }).success,
    ).toBe(false)
  })

  it("rejects an unknown variable in the body", () => {
    expect(
      emailTemplatesSchema.safeParse({
        paymentLink: { ...paymentLink, body: body({ text: "{{boleto}}" }) },
      }).success,
    ).toBe(false)
  })
})
