import { afterEach, describe, expect, it, vi } from "vitest"
import { logger } from "~/lib/logger/logger.server"
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

afterEach(() => {
  vi.clearAllMocks()
})

describe("resolveEmailTemplates", () => {
  it("returns the parsed templates for valid content", () => {
    expect(resolveEmailTemplates({ ...baselineEmailTemplates, paymentLink })?.paymentLink?.subject).toBe(
      "Seu pagamento da {{evento}}",
    )
  })

  it("returns null when the singleton is missing", () => {
    expect(resolveEmailTemplates(null)).toBeNull()
    expect(resolveEmailTemplates(undefined)).toBeNull()
  })

  it("drops only the invalid email, never throwing, and logs which one", () => {
    const templates = resolveEmailTemplates({
      ...baselineEmailTemplates,
      paymentLink: { ...paymentLink, subject: "Oi {{nome}}" },
    })

    expect(templates?.paymentLink).toBeUndefined()
    expect(templates?.application).toEqual(
      resolveEmailTemplates(baselineEmailTemplates)?.application,
    )
    expect(logger.error).toHaveBeenCalledWith(
      "The paymentLink email copy failed validation, using the default",
      expect.objectContaining({ error: expect.any(String) }),
    )
  })

  it("drops an email the singleton does not have", () => {
    const { paymentRefund: _, ...withoutRefund } = baselineEmailTemplates

    const templates = resolveEmailTemplates(withoutRefund)

    expect(templates?.paymentRefund).toBeUndefined()
    expect(templates?.paymentConfirmed).toBeDefined()
  })

  it("degrades to null, never throwing, when the singleton is not an object", () => {
    expect(resolveEmailTemplates("not a document")).toBeNull()
  })
})

describe("getEmailTemplates", () => {
  it("queries the singleton and resolves the response", async () => {
    const fetch = vi.fn(async () => ({ ...baselineEmailTemplates, paymentLink }))

    expect((await getEmailTemplates({ fetch }))?.paymentLink?.heading).toBe(
      "Hora de garantir sua vaga",
    )
    expect(fetch).toHaveBeenCalledWith(emailTemplatesQuery)
  })
})
