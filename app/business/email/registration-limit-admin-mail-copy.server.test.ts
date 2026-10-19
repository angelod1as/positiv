import { describe, expect, it, vi } from "vitest"
import type { EmailTemplates } from "~/business/cms/email-templates.schema"
import { registrationLimitAdminCopyFallback } from "./registration-limit-admin-mail-copy"
import { loadRegistrationLimitAdminCopy } from "./registration-limit-admin-mail-copy.server"

vi.mock("~/lib/logger/logger.server", () => ({ logger: { error: vi.fn() } }))

const block = (text: string, marks: string[] = []) => ({
  _type: "block",
  _key: text,
  style: "normal",
  markDefs: [],
  children: [{ _type: "span", _key: `${text}-0`, text, marks }],
})

const templates = {
  registrationLimit: {
    subject: "Assunto {{evento}}",
    heading: "Título",
    body: [block("{{participantes}}", ["strong"])],
    cta: "Botão",
    closing: [block("Aviso", ["em"])],
  },
} as unknown as EmailTemplates

describe("loadRegistrationLimitAdminCopy", () => {
  it("returns the copy the Editor set, serialised to inline HTML", async () => {
    const copy = await loadRegistrationLimitAdminCopy({
      get: vi.fn(async () => templates),
    })

    expect(copy).toEqual({
      subject: "Assunto {{evento}}",
      heading: "Título",
      bodyParagraphs: ["<strong>{{participantes}}</strong>"],
      cta: "Botão",
      closingParagraphs: ["<em>Aviso</em>"],
    })
  })

  it("falls back to the code copy when the singleton is missing", async () => {
    expect(
      await loadRegistrationLimitAdminCopy({ get: vi.fn(async () => null) }),
    ).toEqual(registrationLimitAdminCopyFallback)
  })
})
