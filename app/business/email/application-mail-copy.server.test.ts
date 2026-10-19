import { describe, expect, it, vi } from "vitest"
import { baselineEmailTemplates } from "~/business/cms/email-templates.fixture"
import { emailTemplatesSchema } from "~/business/cms/email-templates.schema"
import { applicationCopyFallback } from "./application-mail-copy"
import { loadApplicationCopy } from "./application-mail-copy.server"

vi.mock("~/lib/logger/logger.server", () => ({ logger: { error: vi.fn() } }))

const block = (text: string, marks: string[] = []) => ({
  _type: "block",
  _key: text,
  style: "normal",
  markDefs: [],
  children: [{ _type: "span", _key: `${text}-0`, text, marks }],
})

const templates = emailTemplatesSchema.parse({
  ...baselineEmailTemplates,
  application: {
    subject: "Assunto {{evento}}",
    heading: "Título",
    body: [block("{{nome}}", ["strong"])],
    importantHeading: "Atenção",
    importantLead: "Lembre:",
    notes: [block("Um"), block("Dois", ["em"])],
  },
})

describe("loadApplicationCopy", () => {
  it("returns the copy the Editor set, serialised to inline HTML", async () => {
    const copy = await loadApplicationCopy({ get: vi.fn(async () => templates) })

    expect(copy).toEqual({
      subject: "Assunto {{evento}}",
      heading: "Título",
      bodyParagraphs: ["<strong>{{nome}}</strong>"],
      importantHeading: "Atenção",
      importantLead: "Lembre:",
      notes: ["Um", "<em>Dois</em>"],
    })
  })

  it("falls back to the code copy when the singleton is missing", async () => {
    expect(await loadApplicationCopy({ get: vi.fn(async () => null) })).toEqual(
      applicationCopyFallback,
    )
  })
})
