import { describe, expect, it, vi } from "vitest"
import { baselineEmailTemplates } from "~/business/cms/email-templates.fixture"
import { emailTemplatesSchema } from "~/business/cms/email-templates.schema"
import { paymentConfirmedCopyFallback } from "./payment-confirmed-mail-copy"
import { loadPaymentConfirmedCopy } from "./payment-confirmed-mail-copy.server"

vi.mock("~/lib/logger/logger.server", () => ({
  logger: {
    error: vi.fn(),
    child() {
      return this
    },
  },
}))

const block = (text: string, marks: string[] = []) => ({
  _type: "block",
  _key: text,
  style: "normal",
  markDefs: [],
  children: [{ _type: "span", _key: `${text}-0`, text, marks }],
})

const templates = emailTemplatesSchema.parse({
  ...baselineEmailTemplates,
  paymentConfirmed: {
    subject: "Assunto {{evento}}",
    heading: "Título",
    body: [block("{{nome}}", ["strong"])],
    cta: "Botão",
    closing: [block("Tchau", ["em"])],
  },
})

describe("loadPaymentConfirmedCopy", () => {
  it("returns the copy the Editor set, serialised to inline HTML", async () => {
    const copy = await loadPaymentConfirmedCopy({
      get: vi.fn(async () => templates),
    })

    expect(copy).toEqual({
      subject: "Assunto {{evento}}",
      heading: "Título",
      bodyParagraphs: ["<strong>{{nome}}</strong>"],
      cta: "Botão",
      closingParagraphs: ["<em>Tchau</em>"],
    })
  })

  it("falls back to the code copy when the singleton is missing", async () => {
    expect(
      await loadPaymentConfirmedCopy({ get: vi.fn(async () => null) }),
    ).toEqual(paymentConfirmedCopyFallback)
  })
})
