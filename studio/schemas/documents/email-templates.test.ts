import type { PortableTextBlock } from "sanity"
import { describe, expect, it } from "vitest"

import { pathsOf } from "../../test/errors"
import { validateDocumentOf } from "../../test/validate"
import { emailTemplates as emailTemplatesType } from "./email-templates"

const body = (...texts: { text: string; strong?: boolean }[]) =>
  [
    {
      _type: "block",
      _key: "p0",
      style: "normal",
      markDefs: [],
      children: texts.map((span, index) => ({
        _type: "span",
        _key: `s${index}`,
        text: span.text,
        marks: span.strong ? ["strong"] : [],
      })),
    },
  ] as unknown as PortableTextBlock[]

const valid = {
  paymentLink: {
    subject: "Seu pagamento da {{evento}}",
    heading: "Hora de garantir sua vaga",
    body: body(
      { text: "{{nome}}, sua vaga na " },
      { text: "{{evento}}", strong: true },
      { text: " está reservada!" },
    ),
  },
}

function validate(paymentLink: Record<string, unknown>) {
  return validateDocumentOf("emailTemplates", { paymentLink })
}

describe("emailTemplates", () => {
  it("accepts copy using only the documented variables", async () => {
    expect(await validate(valid.paymentLink)).toEqual([])
  })

  it("rejects an unknown variable in the body", async () => {
    expect(
      pathsOf(
        await validate({ ...valid.paymentLink, body: body({ text: "{{boleto}}" }) }),
      ),
    ).toContain("paymentLink.body")
  })

  it("rejects a token split across spans in the body", async () => {
    expect(
      pathsOf(
        await validate({
          ...valid.paymentLink,
          body: body(
            { text: "{{" },
            { text: "nome", strong: true },
            { text: "}}" },
          ),
        }),
      ),
    ).toContain("paymentLink.body")
  })

  it("rejects a body whose blocks render no text", async () => {
    expect(
      pathsOf(await validate({ ...valid.paymentLink, body: body({ text: "" }) })),
    ).toContain("paymentLink.body")
  })

  it("rejects a variable the subject does not allow", async () => {
    expect(
      pathsOf(await validate({ ...valid.paymentLink, subject: "Oi {{nome}}" })),
    ).toContain("paymentLink.subject")
  })

  it("rejects any variable in the heading", async () => {
    expect(
      pathsOf(await validate({ ...valid.paymentLink, heading: "{{evento}}" })),
    ).toContain("paymentLink.heading")
  })

  it("requires the subject, heading and body", async () => {
    const paths = pathsOf(
      await validate({ subject: undefined, heading: undefined, body: undefined }),
    )
    expect(paths).toContain("paymentLink.subject")
    expect(paths).toContain("paymentLink.heading")
    expect(paths).toContain("paymentLink.body")
  })

  it("titles the preview E-mails", () => {
    expect(emailTemplatesType.preview?.prepare?.()).toEqual({ title: "E-mails" })
  })
})
