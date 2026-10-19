import { describe, expect, it } from "vitest"
import type { RegistrationLimitAdminCopy } from "~/business/email/registration-limit-admin-mail-copy"
import type { Event } from "~types/database/entities.types"
import { registrationLimitReachedAdminTemplate } from "./registration-limit-reached-admin.template"

const event = {
  id: "event-1",
  title: "Festa",
  emoji: "🎉",
} as Event

const timestamp = new Date("2026-11-02T14:30:00Z")

const copy: RegistrationLimitAdminCopy = {
  subject: "Lotou: {{evento}}",
  heading: "Lotou!",
  bodyParagraphs: ["A <strong>{{evento}}</strong> chegou a {{participantes}}."],
  cta: "Abrir lista",
  closingParagraphs: ["Aviso <em>automático</em>."],
}

describe("registrationLimitReachedAdminTemplate with copy from the CMS", () => {
  it("renders the copy it is given, filling the placeholders", () => {
    const html = registrationLimitReachedAdminTemplate(event, 90, timestamp, copy)

    expect(html).toContain("Lotou!")
    expect(html).toContain("A <strong>🎉&nbsp;Festa</strong> chegou a 90.")
    expect(html).toContain("Abrir lista")
    expect(html).toContain("Aviso <em>automático</em>.")
  })

  it("HTML-escapes the heading and button an Editor typed", () => {
    const html = registrationLimitReachedAdminTemplate(event, 90, timestamp, {
      ...copy,
      heading: "Ofertas & novidades",
      cta: "<b>Ir</b>",
    })

    expect(html).toContain("Ofertas &amp; novidades")
    expect(html).toContain("&lt;b&gt;Ir&lt;/b&gt;")
  })

  it("HTML-escapes a value so an event title cannot inject markup", () => {
    const html = registrationLimitReachedAdminTemplate(
      { ...event, title: '<img src=x onerror="steal()">' },
      90,
      timestamp,
      copy,
    )

    expect(html).not.toContain("onerror")
  })

  it("throws on a body placeholder outside the whitelist", () => {
    expect(() =>
      registrationLimitReachedAdminTemplate(event, 90, timestamp, {
        ...copy,
        bodyParagraphs: ["{{nome}}"],
      }),
    ).toThrow(/nome/)
  })

  it("throws on a placeholder in the closing", () => {
    expect(() =>
      registrationLimitReachedAdminTemplate(event, 90, timestamp, {
        ...copy,
        closingParagraphs: ["{{evento}}"],
      }),
    ).toThrow(/evento/)
  })
})
