import { describe, expect, it } from "vitest"
import { applicationMailTemplate } from "./application-mail.template"

describe("applicationMailTemplate", () => {
  const participantName = "Testy"
  const eventTitle = "Test Event"
  const eventEmoji = "🎉"
  const eventLocation = "Test Location"
  const eventStartTime = "2024-12-25T20:00:00-03:00"

  it("should return a string", () => {
    const result = applicationMailTemplate(participantName, eventTitle, eventEmoji, eventLocation, eventStartTime)
    expect(typeof result).toBe("string")
  })

  it("should be valid HTML with DOCTYPE", () => {
    const result = applicationMailTemplate(participantName, eventTitle, eventEmoji, eventLocation, eventStartTime)
    expect(result).toContain("<!DOCTYPE html>")
    expect(result).toContain("<html lang=\"pt-BR\">")
    expect(result).toContain("</html>")
  })

  it("should include Brand Purple gradient background", () => {
    const result = applicationMailTemplate(participantName, eventTitle, eventEmoji, eventLocation, eventStartTime)
    expect(result).toContain(
      "linear-gradient(135deg, #4a75d2 0%, #bf03c3 100%)",
    )
  })

  it("should include Positiv logo", () => {
    const result = applicationMailTemplate(participantName, eventTitle, eventEmoji, eventLocation, eventStartTime)
    expect(result).toContain("positiv-logo-colors.png")
  })

  it("should display participant name", () => {
    const result = applicationMailTemplate(participantName, eventTitle, eventEmoji, eventLocation, eventStartTime)
    expect(result).toContain("Testy")
  })

  it("should include event title with emoji", () => {
    const result = applicationMailTemplate(participantName, eventTitle, eventEmoji, eventLocation, eventStartTime)
    expect(result).toContain("🎉 Test Event")
    expect(result).toContain("🎉&nbsp;Test Event")
  })

  it("should include event location", () => {
    const result = applicationMailTemplate(participantName, eventTitle, eventEmoji, eventLocation, eventStartTime)
    expect(result).toContain("Test Location")
  })

  it("should format event date in Brazilian Portuguese", () => {
    const result = applicationMailTemplate(participantName, eventTitle, eventEmoji, eventLocation, eventStartTime)
    expect(result).toContain("25 de dezembro de 2024")
  })

  it("should format event time with h suffix", () => {
    const result = applicationMailTemplate(participantName, eventTitle, eventEmoji, eventLocation, eventStartTime)
    expect(result).toContain("20h")
  })

  it("should include event details section", () => {
    const result = applicationMailTemplate(participantName, eventTitle, eventEmoji, eventLocation, eventStartTime)
    expect(result).toContain("Evento:")
    expect(result).toContain("Local:")
    expect(result).toContain("Data:")
    expect(result).toContain("Horário de início:")
  })

  it("should include important notes section", () => {
    const result = applicationMailTemplate(participantName, eventTitle, eventEmoji, eventLocation, eventStartTime)
    expect(result).toContain("Importante!")
    expect(result).toContain("Não se esqueça:")
  })

  it("should include all important bullet points", () => {
    const result = applicationMailTemplate(participantName, eventTitle, eventEmoji, eventLocation, eventStartTime)
    expect(result).toContain("Ter participado de edições anteriores")
    expect(result).toContain("Se você quer ir acompanhade")
    expect(result).toContain("Inscrever-se no formulário")
    expect(result).toContain("entradas sociais")
  })

  it("should include footer with Positiv link", () => {
    const result = applicationMailTemplate(participantName, eventTitle, eventEmoji, eventLocation, eventStartTime)
    expect(result).toContain("Você recebeu este e-mail pois se cadastrou")
    expect(result).toContain("Positiv")
    expect(result).toContain("Configurações")
  })

  it("should include account settings link", () => {
    const result = applicationMailTemplate(participantName, eventTitle, eventEmoji, eventLocation, eventStartTime)
    expect(result).toContain("conta")
  })
})

describe("applicationMailTemplate - XSS Protection", () => {
  const eventTitle = "Test Event"
  const eventEmoji = "🎉"
  const eventLocation = "Test Location"
  const eventStartTime = "2024-12-25T20:00:00-03:00"

  describe("Profile Name Sanitization", () => {
    it("should sanitize script tags in participant name", () => {
      const html = applicationMailTemplate(
        '<script>alert("XSS")</script>John',
        eventTitle, eventEmoji, eventLocation, eventStartTime,
      )

      expect(html).not.toContain("<script>")
      expect(html).not.toContain("</script>")
      expect(html).not.toContain('alert("XSS")')
      expect(html).toContain("John")
    })

    it("should sanitize img tag with onerror in participant name", () => {
      const html = applicationMailTemplate(
        '<img src=x onerror="alert(\'XSS\')">John',
        eventTitle, eventEmoji, eventLocation, eventStartTime,
      )

      expect(html).not.toContain("onerror")
      expect(html).not.toContain('alert(\'XSS\')')
    })

    it("should sanitize iframe injection in participant name", () => {
      const html = applicationMailTemplate(
        '<iframe src="https://evil.com"></iframe>Jane',
        eventTitle, eventEmoji, eventLocation, eventStartTime,
      )

      expect(html).not.toContain("<iframe")
      expect(html).not.toContain("evil.com")
      expect(html).toContain("Jane")
    })

    it("should escape HTML entities in legitimate names", () => {
      const html = applicationMailTemplate(
        "John <Doe> & Associates",
        eventTitle, eventEmoji, eventLocation, eventStartTime,
      )

      expect(html).toContain("&amp;")
      expect(html).toContain("John")
      expect(html).toContain("Associates")
      expect(html).not.toContain("<Doe>")
    })
  })

  describe("Event Title Sanitization", () => {
    it("should sanitize script tags in event title", () => {
      const html = applicationMailTemplate(
        "Test User",
        '<script>alert("XSS")</script>Party',
        eventEmoji, eventLocation, eventStartTime,
      )

      expect(html).not.toContain("<script>")
      expect(html).not.toContain('alert("XSS")')
      expect(html).toContain("Party")
    })

    it("should sanitize img tag with onerror in event title", () => {
      const html = applicationMailTemplate(
        "Test User",
        '<img src=x onerror="alert(\'XSS\')">Party',
        eventEmoji, eventLocation, eventStartTime,
      )

      expect(html).not.toContain("onerror")
      expect(html).not.toContain('alert(\'XSS\')')
    })

    it("should escape HTML entities in event title", () => {
      const html = applicationMailTemplate(
        "Test User",
        "Party <New Year's> & More",
        eventEmoji, eventLocation, eventStartTime,
      )

      expect(html).toContain("&amp;")
      expect(html).toContain("Party")
      expect(html).toContain("More")
      expect(html).not.toContain("<New Year's>")
    })
  })

  describe("Event Location Sanitization", () => {
    it("should sanitize script tags in location", () => {
      const html = applicationMailTemplate(
        "Test User", eventTitle, eventEmoji,
        '<script>alert("XSS")</script>São Paulo',
        eventStartTime,
      )

      expect(html).not.toContain("<script>")
      expect(html).not.toContain('alert("XSS")')
      expect(html).toContain("São Paulo")
    })

    it("should sanitize onclick event handler in location", () => {
      const html = applicationMailTemplate(
        "Test User", eventTitle, eventEmoji,
        '<a href="#" onclick="alert(\'XSS\')">Click</a>',
        eventStartTime,
      )

      expect(html).not.toContain("onclick")
      expect(html).not.toContain('alert(\'XSS\')')
    })

    it("should escape HTML entities in location", () => {
      const html = applicationMailTemplate(
        "Test User", eventTitle, eventEmoji,
        "Street <Main> & Ave",
        eventStartTime,
      )

      expect(html).toContain("&amp;")
      expect(html).toContain("Street")
      expect(html).toContain("Ave")
      expect(html).not.toContain("<Main>")
    })
  })

  describe("Event Emoji Sanitization", () => {
    it("should sanitize script tags in emoji field", () => {
      const html = applicationMailTemplate(
        "Test User", eventTitle,
        '<script>alert("XSS")</script>🎉',
        eventLocation, eventStartTime,
      )

      expect(html).not.toContain("<script>")
      expect(html).not.toContain('alert("XSS")')
    })

    it("should allow legitimate emoji characters", () => {
      const html = applicationMailTemplate(
        "Test User", eventTitle, "🎉",
        eventLocation, eventStartTime,
      )

      expect(html).toContain("🎉")
    })
  })

  describe("Combined Attack Vectors", () => {
    it("should sanitize multiple XSS attempts across all fields", () => {
      const html = applicationMailTemplate(
        '<script>alert("name")</script>John',
        '<iframe src="https://evil.com">Party</iframe>',
        '<script>alert("emoji")</script>🎉',
        '<a onclick="alert(\'loc\')">Place</a>',
        eventStartTime,
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
      const html = applicationMailTemplate(
        "Ana Maria",
        "Festa de Ano Novo",
        "🎉",
        "São Paulo, SP",
        "2024-12-25T20:00:00-03:00",
      )

      expect(html).toContain("Ana Maria")
      expect(html).toContain("Festa de Ano Novo")
      expect(html).toContain("São Paulo, SP")
      expect(html).toContain("🎉")
      expect(html).toContain("Sua inscrição foi recebida")
      expect(html).toContain("Importante!")
    })
  })
})
