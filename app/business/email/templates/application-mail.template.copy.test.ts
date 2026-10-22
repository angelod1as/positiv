import { describe, expect, it } from "vitest"
import type { ApplicationCopy } from "~/business/email/application-mail-copy"
import type { Event, ProfileWithRoles } from "~types/database/entities.types"
import { applicationMailTemplate } from "./application-mail.template"

const profile: NonNullable<ProfileWithRoles> = {
  id: "profile-1",
  full_name: "Ana Souza",
  social_name: "Ana",
  email: "ana@example.com",
  basic_data_filled: true,
  created_at: "2024-01-01T00:00:00Z",
}

const event = {
  id: "event-1",
  title: "Festa",
  emoji: "🎉",
  location: "Casa",
  time_event_start: "2026-12-12T22:00:00-03:00",
} as Event

const copy: ApplicationCopy = {
  subject: "Candidatura: {{evento}}",
  heading: "Recebemos!",
  bodyParagraphs: ["Oi {{nome}}, bem-vinde à <strong>{{evento}}</strong>."],
  importantHeading: "Atenção",
  importantLead: "Lembre:",
  notes: ["Nota <em>um</em>", "Nota dois"],
}

describe("applicationMailTemplate with copy from the CMS", () => {
  it("renders the copy it is given, filling the placeholders", () => {
    const html = applicationMailTemplate(profile, event, copy)

    expect(html).toContain("Recebemos!")
    expect(html).toContain(
      "Oi Ana, bem-vinde à <strong>🎉&nbsp;Festa</strong>.",
    )
    expect(html).toContain("Atenção")
    expect(html).toContain("Lembre:")
  })

  it("renders one list item per note", () => {
    const html = applicationMailTemplate(profile, event, copy)

    expect(html.match(/<li /g)).toHaveLength(2)
    expect(html).toContain("Nota <em>um</em>")
  })

  it("HTML-escapes the plain lines an Editor typed", () => {
    const html = applicationMailTemplate(profile, event, {
      ...copy,
      heading: "Ofertas & novidades",
      importantHeading: "<b>Atenção</b>",
      importantLead: "Isto & aquilo",
    })

    expect(html).toContain("Ofertas &amp; novidades")
    expect(html).toContain("&lt;b&gt;Atenção&lt;/b&gt;")
    expect(html).toContain("Isto &amp; aquilo")
  })

  it("HTML-escapes a value so a participant cannot inject markup", () => {
    const html = applicationMailTemplate(
      { ...profile, social_name: '<img src=x onerror="steal()">' },
      event,
      copy,
    )

    expect(html).not.toContain("onerror")
  })

  it("throws on a body placeholder outside the whitelist", () => {
    expect(() =>
      applicationMailTemplate(profile, event, {
        ...copy,
        bodyParagraphs: ["Pague em {{boleto}}."],
      }),
    ).toThrow(/boleto/)
  })

  it("throws on a placeholder in a note", () => {
    expect(() =>
      applicationMailTemplate(profile, event, { ...copy, notes: ["{{nome}}"] }),
    ).toThrow(/nome/)
  })
})
