import { describe, expect, it, vi } from "vitest"
import { baselineEmailTemplates } from "~/business/cms/email-templates.fixture"
import { emailTemplatesSchema } from "~/business/cms/email-templates.schema"
import { paymentLinkCopyFallback } from "./payment-link-mail-copy"
import { loadPaymentLinkCopy } from "./payment-link-mail-copy.server"

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
  paymentLink: {
    subject: "Assunto {{evento}}",
    heading: "Título",
    body: [
      {
        _type: "block",
        _key: "p0",
        style: "normal",
        markDefs: [],
        children: [
          { _type: "span", _key: "s0", text: "Oi ", marks: [] },
          { _type: "span", _key: "s1", text: "{{nome}}", marks: ["strong"] },
        ],
      },
    ],
  },
})

describe("loadPaymentLinkCopy", () => {
  it("returns the copy the Editor set, serialised to inline HTML", async () => {
    const copy = await loadPaymentLinkCopy({ get: vi.fn(async () => templates) })

    expect(copy.subject).toBe("Assunto {{evento}}")
    expect(copy.heading).toBe("Título")
    expect(copy.bodyParagraphs).toEqual(["Oi <strong>{{nome}}</strong>"])
  })

  it("falls back to the code copy when the singleton is missing", async () => {
    expect(await loadPaymentLinkCopy({ get: vi.fn(async () => null) })).toEqual(
      paymentLinkCopyFallback,
    )
  })

  it("falls back to the code copy when the cache cannot load", async () => {
    expect(
      await loadPaymentLinkCopy({
        get: vi.fn(async () => Promise.reject(new Error("down"))),
      }),
    ).toEqual(paymentLinkCopyFallback)
  })
})
