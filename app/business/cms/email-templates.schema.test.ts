import { describe, expect, it } from "vitest"
import { emailTemplatesSchema } from "./email-templates.schema"
import { baselineEmailTemplates } from "./email-templates.fixture"

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
    expect(emailTemplatesSchema.safeParse({ ...baselineEmailTemplates, paymentLink }).success).toBe(true)
  })

  it("rejects a variable the subject does not allow", () => {
    expect(
      emailTemplatesSchema.safeParse({
        ...baselineEmailTemplates,
        paymentLink: { ...paymentLink, subject: "Oi {{nome}}" },
      }).success,
    ).toBe(false)
  })

  it("rejects any variable in the heading", () => {
    expect(
      emailTemplatesSchema.safeParse({
        ...baselineEmailTemplates,
        paymentLink: { ...paymentLink, heading: "{{evento}}" },
      }).success,
    ).toBe(false)
  })

  it("rejects an unknown variable in the body", () => {
    expect(
      emailTemplatesSchema.safeParse({
        ...baselineEmailTemplates,
        paymentLink: { ...paymentLink, body: body({ text: "{{boleto}}" }) },
      }).success,
    ).toBe(false)
  })

  it("rejects a token split across spans in the body", () => {
    const split = body(
      { text: "{{" },
      { text: "nome", marks: ["strong"] },
      { text: "}}" },
    )

    expect(
      emailTemplatesSchema.safeParse({
        ...baselineEmailTemplates,
        paymentLink: { ...paymentLink, body: split },
      }).success,
    ).toBe(false)
  })

  it("rejects an empty subject or heading", () => {
    expect(
      emailTemplatesSchema.safeParse({
        ...baselineEmailTemplates,
        paymentLink: { ...paymentLink, subject: "" },
      }).success,
    ).toBe(false)
    expect(
      emailTemplatesSchema.safeParse({
        ...baselineEmailTemplates,
        paymentLink: { ...paymentLink, heading: "" },
      }).success,
    ).toBe(false)
  })

  it("rejects a whitespace-only subject or heading", () => {
    expect(
      emailTemplatesSchema.safeParse({
        ...baselineEmailTemplates,
        paymentLink: { ...paymentLink, subject: "   " },
      }).success,
    ).toBe(false)
    expect(
      emailTemplatesSchema.safeParse({
        ...baselineEmailTemplates,
        paymentLink: { ...paymentLink, heading: "   " },
      }).success,
    ).toBe(false)
  })

  it("rejects a subject with a line break", () => {
    expect(
      emailTemplatesSchema.safeParse({
        ...baselineEmailTemplates,
        paymentLink: { ...paymentLink, subject: "Seu pagamento\nda {{evento}}" },
      }).success,
    ).toBe(false)
  })

  it("rejects a subject over 150 characters", () => {
    expect(
      emailTemplatesSchema.safeParse({
        ...baselineEmailTemplates,
        paymentLink: { ...paymentLink, subject: "a".repeat(151) },
      }).success,
    ).toBe(false)
  })

  it("rejects a body whose blocks render no text", () => {
    expect(
      emailTemplatesSchema.safeParse({
        ...baselineEmailTemplates,
        paymentLink: { ...paymentLink, body: body({ text: "" }) },
      }).success,
    ).toBe(false)
  })

  it("rejects a non-normal block style in the body", () => {
    const heading = [
      {
        _type: "block",
        _key: "p0",
        style: "h2",
        markDefs: [],
        children: [{ _type: "span", _key: "s0", text: "Oi", marks: [] }],
      },
    ]

    expect(
      emailTemplatesSchema.safeParse({
        ...baselineEmailTemplates,
        paymentLink: { ...paymentLink, body: heading },
      }).success,
    ).toBe(false)
  })

  it("rejects a list item in the body", () => {
    const bullet = [
      {
        _type: "block",
        _key: "p0",
        style: "normal",
        listItem: "bullet",
        level: 1,
        markDefs: [],
        children: [{ _type: "span", _key: "s0", text: "Oi", marks: [] }],
      },
    ]

    expect(
      emailTemplatesSchema.safeParse({
        ...baselineEmailTemplates,
        paymentLink: { ...paymentLink, body: bullet },
      }).success,
    ).toBe(false)
  })

  it("rejects a link in the body", () => {
    const withLink = [
      {
        _type: "block",
        _key: "p0",
        style: "normal",
        markDefs: [{ _type: "link", _key: "l", href: "https://example.com" }],
        children: [{ _type: "span", _key: "s0", text: "oi", marks: ["l"] }],
      },
    ]

    expect(
      emailTemplatesSchema.safeParse({
        ...baselineEmailTemplates,
        paymentLink: { ...paymentLink, body: withLink },
      }).success,
    ).toBe(false)
  })
})

describe("the application email in emailTemplatesSchema", () => {
  const parse = (application: Record<string, unknown>) =>
    emailTemplatesSchema.safeParse({
      ...baselineEmailTemplates,
      application: { ...baselineEmailTemplates.application, ...application },
    }).success

  it("accepts the baseline copy", () => {
    expect(parse({})).toBe(true)
  })

  it("rejects a variable the subject does not allow", () => {
    expect(parse({ subject: "Oi {{nome}}" })).toBe(false)
  })

  it("rejects an unknown variable in the body", () => {
    expect(parse({ body: body({ text: "{{boleto}}" }) })).toBe(false)
  })

  it("rejects any variable in the important heading, lead or notes", () => {
    expect(parse({ importantHeading: "{{nome}}" })).toBe(false)
    expect(parse({ importantLead: "{{nome}}" })).toBe(false)
    expect(parse({ notes: body({ text: "{{evento}}" }) })).toBe(false)
  })

  it("rejects blank plain lines and empty notes", () => {
    expect(parse({ importantHeading: " " })).toBe(false)
    expect(parse({ importantLead: "" })).toBe(false)
    expect(parse({ notes: body({ text: "" }) })).toBe(false)
  })

  it("rejects a missing application email", () => {
    const { application: _, ...rest } = baselineEmailTemplates
    expect(emailTemplatesSchema.safeParse(rest).success).toBe(false)
  })
})

describe("the payment-confirmed email in emailTemplatesSchema", () => {
  const parse = (paymentConfirmed: Record<string, unknown>) =>
    emailTemplatesSchema.safeParse({
      ...baselineEmailTemplates,
      paymentConfirmed: {
        ...baselineEmailTemplates.paymentConfirmed,
        ...paymentConfirmed,
      },
    }).success

  it("accepts the baseline copy", () => {
    expect(parse({})).toBe(true)
  })

  it("rejects a variable the subject does not allow", () => {
    expect(parse({ subject: "Oi {{nome}}" })).toBe(false)
  })

  it("rejects an unknown variable in the body", () => {
    expect(parse({ body: body({ text: "{{boleto}}" }) })).toBe(false)
  })

  it("rejects any variable in the button or closing", () => {
    expect(parse({ cta: "{{nome}}" })).toBe(false)
    expect(parse({ closing: body({ text: "{{evento}}" }) })).toBe(false)
  })

  it("rejects a blank button and an empty closing", () => {
    expect(parse({ cta: " " })).toBe(false)
    expect(parse({ closing: body({ text: "" }) })).toBe(false)
  })
})
