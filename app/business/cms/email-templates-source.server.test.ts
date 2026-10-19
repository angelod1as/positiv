import { describe, expect, it, vi } from "vitest"
import { emailTemplatesQuery } from "./email-templates-query"
import {
  getEmailTemplates,
  resolveEmailTemplates,
} from "./email-templates-source.server"
import { baselineEmailTemplates } from "./email-templates.fixture"

vi.mock("~/lib/logger/logger.server", () => ({ logger: { error: vi.fn() } }))

const paymentLink = {
  subject: "Seu pagamento da {{evento}}",
  heading: "Hora de garantir sua vaga",
  body: [
    {
      _type: "block",
      _key: "p0",
      style: "normal",
      markDefs: [],
      children: [{ _type: "span", _key: "s0", text: "{{nome}}", marks: [] }],
    },
  ],
}

describe("resolveEmailTemplates", () => {
  it("returns the parsed templates for valid content", () => {
    expect(resolveEmailTemplates({ ...baselineEmailTemplates, paymentLink })?.paymentLink.subject).toBe(
      "Seu pagamento da {{evento}}",
    )
  })

  it("returns null when the singleton is missing", () => {
    expect(resolveEmailTemplates(null)).toBeNull()
    expect(resolveEmailTemplates(undefined)).toBeNull()
  })

  it("degrades to null, never throwing, on invalid content", () => {
    expect(
      resolveEmailTemplates({
        ...baselineEmailTemplates,
        paymentLink: { ...paymentLink, subject: "Oi {{nome}}" },
      }),
    ).toBeNull()
  })
})

describe("getEmailTemplates", () => {
  it("queries the singleton and resolves the response", async () => {
    const fetch = vi.fn(async () => ({ ...baselineEmailTemplates, paymentLink }))

    expect((await getEmailTemplates({ fetch }))?.paymentLink.heading).toBe(
      "Hora de garantir sua vaga",
    )
    expect(fetch).toHaveBeenCalledWith(emailTemplatesQuery)
  })
})
