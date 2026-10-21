import { describe, expect, it, vi } from "vitest"
import { baselineEmailTemplates } from "~/business/cms/email-templates.fixture"
import { emailTemplatesSchema } from "~/business/cms/email-templates.schema"
import { paymentRefundCopyFallback } from "./payment-refund-mail-copy"
import { loadPaymentRefundCopy } from "./payment-refund-mail-copy.server"

vi.mock("~/lib/logger/logger.server", () => ({
  logger: {
    error: vi.fn(),
    child() {
      return this
    },
  },
}))

const templates = emailTemplatesSchema.parse({
  ...baselineEmailTemplates,
  paymentRefund: {
    subject: "Assunto {{evento}}",
    heading: "Título",
    body: [
      {
        _type: "block",
        _key: "p0",
        style: "normal",
        markDefs: [],
        children: [
          { _type: "span", _key: "s0", text: "{{nome}}", marks: ["strong"] },
        ],
      },
    ],
    cta: "Botão",
  },
})

describe("loadPaymentRefundCopy", () => {
  it("returns the copy the Editor set, serialised to inline HTML", async () => {
    const copy = await loadPaymentRefundCopy({ get: vi.fn(async () => templates) })

    expect(copy).toEqual({
      subject: "Assunto {{evento}}",
      heading: "Título",
      bodyParagraphs: ["<strong>{{nome}}</strong>"],
      cta: "Botão",
    })
  })

  it("falls back to the code copy when the singleton is missing", async () => {
    expect(await loadPaymentRefundCopy({ get: vi.fn(async () => null) })).toEqual(
      paymentRefundCopyFallback,
    )
  })
})
