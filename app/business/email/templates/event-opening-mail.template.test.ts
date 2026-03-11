import { describe, expect, it } from "vitest"
import { eventOpeningMailTemplate } from "./event-opening-mail.template"

describe("eventOpeningMailTemplate", () => {
  const eventTitle = "Test Event"
  const eventEmoji = "🎉"
  const eventLocation = "Test Location"
  const eventStartTime = "2024-12-25T20:00:00-03:00"
  const applicationStartTime = "2024-12-01T10:00:00-03:00"
  const profileId = "test-profile-123"

  it("should return a string", () => {
    const result = eventOpeningMailTemplate(eventTitle, eventEmoji, eventLocation, eventStartTime, applicationStartTime, profileId)
    expect(typeof result).toBe("string")
  })

  it("should be valid HTML with DOCTYPE", () => {
    const result = eventOpeningMailTemplate(eventTitle, eventEmoji, eventLocation, eventStartTime, applicationStartTime, profileId)
    expect(result).toContain("<!DOCTYPE html>")
    expect(result).toContain('<html lang="pt-BR">')
    expect(result).toContain("</html>")
  })

  it("should include Brand Purple gradient background", () => {
    const result = eventOpeningMailTemplate(eventTitle, eventEmoji, eventLocation, eventStartTime, applicationStartTime, profileId)
    expect(result).toContain(
      "linear-gradient(135deg, #4a75d2 0%, #bf03c3 100%)",
    )
  })

  it("should include Positiv logo", () => {
    const result = eventOpeningMailTemplate(eventTitle, eventEmoji, eventLocation, eventStartTime, applicationStartTime, profileId)
    expect(result).toContain("positiv-logo-colors.png")
  })

  it("should include main heading for new event", () => {
    const result = eventOpeningMailTemplate(eventTitle, eventEmoji, eventLocation, eventStartTime, applicationStartTime, profileId)
    expect(result).toContain("Novo evento disponível! 🎉")
  })

  it("should include event title with emoji in intro", () => {
    const result = eventOpeningMailTemplate(eventTitle, eventEmoji, eventLocation, eventStartTime, applicationStartTime, profileId)
    expect(result).toContain("🎉&nbsp;Test Event")
  })

  it("should include CTA button", () => {
    const result = eventOpeningMailTemplate(eventTitle, eventEmoji, eventLocation, eventStartTime, applicationStartTime, profileId)
    expect(result).toContain("Inscreva-se agora!")
    expect(result).toMatch(/background: #bf03c3/)
  })

  it("should include opening announcement message", () => {
    const result = eventOpeningMailTemplate(eventTitle, eventEmoji, eventLocation, eventStartTime, applicationStartTime, profileId)
    expect(result).toContain("acabam de abrir")
  })

  it("should include urgency message", () => {
    const result = eventOpeningMailTemplate(eventTitle, eventEmoji, eventLocation, eventStartTime, applicationStartTime, profileId)
    expect(result).toContain("Corra e garanta sua vaga")
  })

  it("should include event location", () => {
    const result = eventOpeningMailTemplate(eventTitle, eventEmoji, eventLocation, eventStartTime, applicationStartTime, profileId)
    expect(result).toContain("Test Location")
  })

  it("should format event start date in Brazilian Portuguese", () => {
    const result = eventOpeningMailTemplate(eventTitle, eventEmoji, eventLocation, eventStartTime, applicationStartTime, profileId)
    expect(result).toContain("25 de dezembro de 2024")
  })

  it("should format event start time with h suffix", () => {
    const result = eventOpeningMailTemplate(eventTitle, eventEmoji, eventLocation, eventStartTime, applicationStartTime, profileId)
    expect(result).toContain("20h")
  })

  it("should format application open date", () => {
    const result = eventOpeningMailTemplate(eventTitle, eventEmoji, eventLocation, eventStartTime, applicationStartTime, profileId)
    expect(result).toContain("01 de dezembro de 2024")
  })

  it("should format application open time", () => {
    const result = eventOpeningMailTemplate(eventTitle, eventEmoji, eventLocation, eventStartTime, applicationStartTime, profileId)
    expect(result).toContain("10h")
  })

  it("should include all event details labels", () => {
    const result = eventOpeningMailTemplate(eventTitle, eventEmoji, eventLocation, eventStartTime, applicationStartTime, profileId)
    expect(result).toContain("Evento:")
    expect(result).toContain("Local:")
    expect(result).toContain("Data do evento:")
    expect(result).toContain("Horário de início:")
    expect(result).toContain("Inscrições abrem em:")
  })

  it("should include important notes section", () => {
    const result = eventOpeningMailTemplate(eventTitle, eventEmoji, eventLocation, eventStartTime, applicationStartTime, profileId)
    expect(result).toContain("Informações importantes")
  })

  it("should include all important bullet points", () => {
    const result = eventOpeningMailTemplate(eventTitle, eventEmoji, eventLocation, eventStartTime, applicationStartTime, profileId)
    expect(result).toContain("Ter participado de edições anteriores")
    expect(result).toContain("Se você quer ir acompanhade")
    expect(result).toContain("Inscrever-se no formulário")
    expect(result).toContain("entradas sociais")
  })

  it("should include footer with newsletter subscription message", () => {
    const result = eventOpeningMailTemplate(eventTitle, eventEmoji, eventLocation, eventStartTime, applicationStartTime, profileId)
    expect(result).toContain("Você recebeu este e-mail pois está inscrite na newsletter")
    expect(result).toContain("Positiv")
  })

  it("should include unsubscribe link with profile ID", () => {
    const result = eventOpeningMailTemplate(eventTitle, eventEmoji, eventLocation, eventStartTime, applicationStartTime, profileId)
    expect(result).toContain("newsletter/unsubscribe?id=test-profile-123")
    expect(result).toContain("Cancelar inscrição")
  })

  it("should include account settings link", () => {
    const result = eventOpeningMailTemplate(eventTitle, eventEmoji, eventLocation, eventStartTime, applicationStartTime, profileId)
    expect(result).toContain("conta")
    expect(result).toContain("Configurações")
  })

  it("should include details in a styled section", () => {
    const result = eventOpeningMailTemplate(eventTitle, eventEmoji, eventLocation, eventStartTime, applicationStartTime, profileId)
    expect(result).toContain("background: #f9f9f9")
    expect(result).toContain("border-radius: 8px")
  })
})

describe("eventOpeningMailTemplate - XSS Protection", () => {
  const eventLocation = "Test Location"
  const eventStartTime = "2024-12-25T20:00:00-03:00"
  const applicationStartTime = "2024-12-01T10:00:00-03:00"
  const profileId = "test-profile-123"

  describe("Event Title Sanitization", () => {
    it("should sanitize script tags in event title", () => {
      const html = eventOpeningMailTemplate(
        '<script>alert("XSS")</script>Party',
        "🎉", eventLocation, eventStartTime, applicationStartTime, profileId,
      )

      expect(html).not.toContain("<script>")
      expect(html).not.toContain('alert("XSS")')
      expect(html).toContain("Party")
    })

    it("should sanitize img tag with onerror in event title", () => {
      const html = eventOpeningMailTemplate(
        '<img src=x onerror="alert(\'XSS\')">Party',
        "🎉", eventLocation, eventStartTime, applicationStartTime, profileId,
      )

      expect(html).not.toContain("onerror")
      expect(html).not.toContain('alert(\'XSS\')')
    })

    it("should escape HTML entities in event title", () => {
      const html = eventOpeningMailTemplate(
        "Party <New Year's> & More",
        "🎉", eventLocation, eventStartTime, applicationStartTime, profileId,
      )

      expect(html).toContain("&amp;")
      expect(html).toContain("Party")
      expect(html).toContain("More")
      expect(html).not.toContain("<New Year's>")
    })
  })

  describe("Event Location Sanitization", () => {
    it("should sanitize script tags in location", () => {
      const html = eventOpeningMailTemplate(
        "Test Event", "🎉",
        '<script>alert("XSS")</script>São Paulo',
        eventStartTime, applicationStartTime, profileId,
      )

      expect(html).not.toContain("<script>")
      expect(html).not.toContain('alert("XSS")')
      expect(html).toContain("São Paulo")
    })

    it("should sanitize onclick event handler in location", () => {
      const html = eventOpeningMailTemplate(
        "Test Event", "🎉",
        '<a href="#" onclick="alert(\'XSS\')">Click</a>',
        eventStartTime, applicationStartTime, profileId,
      )

      expect(html).not.toContain("onclick")
      expect(html).not.toContain('alert(\'XSS\')')
    })

    it("should escape HTML entities in location", () => {
      const html = eventOpeningMailTemplate(
        "Test Event", "🎉",
        "Street <Main> & Ave",
        eventStartTime, applicationStartTime, profileId,
      )

      expect(html).toContain("&amp;")
      expect(html).toContain("Street")
      expect(html).toContain("Ave")
      expect(html).not.toContain("<Main>")
    })
  })

  describe("Event Emoji Sanitization", () => {
    it("should sanitize script tags in emoji field", () => {
      const html = eventOpeningMailTemplate(
        "Test Event",
        '<script>alert("XSS")</script>🎉',
        eventLocation, eventStartTime, applicationStartTime, profileId,
      )

      expect(html).not.toContain("<script>")
      expect(html).not.toContain('alert("XSS")')
    })

    it("should allow legitimate emoji characters", () => {
      const html = eventOpeningMailTemplate(
        "Test Event", "🎉",
        eventLocation, eventStartTime, applicationStartTime, profileId,
      )

      expect(html).toContain("🎉")
    })
  })

  describe("Combined Attack Vectors", () => {
    it("should sanitize multiple XSS attempts across all fields", () => {
      const html = eventOpeningMailTemplate(
        '<iframe src="https://evil.com">Party</iframe>',
        '<script>alert("emoji")</script>🎉',
        '<a onclick="alert(\'loc\')">Place</a>',
        eventStartTime, applicationStartTime, profileId,
      )

      expect(html).not.toContain("<script>")
      expect(html).not.toContain("<iframe")
      expect(html).not.toContain("onerror")
      expect(html).not.toContain("onclick")
      expect(html).not.toContain("evil.com")
      expect(html).not.toContain('alert(')
    })
  })

  describe("Legitimate Content Preservation", () => {
    it("should preserve legitimate content after sanitization", () => {
      const html = eventOpeningMailTemplate(
        "Festa de Ano Novo", "🎉", "São Paulo, SP",
        eventStartTime, applicationStartTime, profileId,
      )

      expect(html).toContain("Festa de Ano Novo")
      expect(html).toContain("São Paulo, SP")
      expect(html).toContain("🎉")
      expect(html).toContain("Novo evento disponível!")
      expect(html).toContain("Informações importantes")
    })
  })
})
