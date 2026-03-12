import { describe, expect, it } from "vitest"
import {
  getPaymentFailureEmailSubject,
  paymentFailureEmailTemplate,
} from "./payment-failure-email.template"

describe("paymentFailureEmailTemplate", () => {
  const participantName = "Ana Maria"
  const eventTitle = "Festa de Ano Novo"
  const eventEmoji = "🎉"
  const failureReason = "Cartão recusado pela operadora"
  const paymentLink = "https://pay.example.com/retry/abc123"

  describe("Basic structure", () => {
    it("should return a string", () => {
      const result = paymentFailureEmailTemplate(
        participantName, eventTitle, eventEmoji, failureReason, paymentLink,
      )
      expect(typeof result).toBe("string")
    })

    it("should be valid HTML with DOCTYPE", () => {
      const result = paymentFailureEmailTemplate(
        participantName, eventTitle, eventEmoji, failureReason, paymentLink,
      )
      expect(result).toContain("<!DOCTYPE html>")
      expect(result).toContain('<html lang="pt-BR">')
      expect(result).toContain("</html>")
    })

    it("should include Brand Purple gradient background", () => {
      const result = paymentFailureEmailTemplate(
        participantName, eventTitle, eventEmoji, failureReason, paymentLink,
      )
      expect(result).toContain(
        "linear-gradient(135deg, #4a75d2 0%, #bf03c3 100%)",
      )
    })

    it("should include Positiv logo", () => {
      const result = paymentFailureEmailTemplate(
        participantName, eventTitle, eventEmoji, failureReason, paymentLink,
      )
      expect(result).toContain("positiv-logo-colors.png")
    })
  })

  describe("Content", () => {
    it("should include heading in red", () => {
      const result = paymentFailureEmailTemplate(
        participantName, eventTitle, eventEmoji, failureReason, paymentLink,
      )
      expect(result).toContain("Problema no pagamento")
      expect(result).toContain("#b7002d")
    })

    it("should include greeting with participant name", () => {
      const result = paymentFailureEmailTemplate(
        participantName, eventTitle, eventEmoji, failureReason, paymentLink,
      )
      expect(result).toContain("Olá, Ana Maria!")
    })

    it("should include event title with emoji", () => {
      const result = paymentFailureEmailTemplate(
        participantName, eventTitle, eventEmoji, failureReason, paymentLink,
      )
      expect(result).toContain("🎉")
      expect(result).toContain("Festa de Ano Novo")
    })

    it("should handle null emoji", () => {
      const result = paymentFailureEmailTemplate(
        participantName, eventTitle, null, failureReason, paymentLink,
      )
      expect(result).toContain("Festa de Ano Novo")
      expect(result).not.toContain("🎉")
    })

    it("should include warning icon", () => {
      const result = paymentFailureEmailTemplate(
        participantName, eventTitle, eventEmoji, failureReason, paymentLink,
      )
      expect(result).toContain("&#9888;")
    })

    it("should include supportive failure message", () => {
      const result = paymentFailureEmailTemplate(
        participantName, eventTitle, eventEmoji, failureReason, paymentLink,
      )
      expect(result).toContain("Tivemos um problema ao processar seu pagamento")
    })

    it("should include failure reason when provided", () => {
      const result = paymentFailureEmailTemplate(
        participantName, eventTitle, eventEmoji, failureReason, paymentLink,
      )
      expect(result).toContain("Cartão recusado pela operadora")
      expect(result).toContain("Motivo:")
    })

    it("should not include failure reason box when null", () => {
      const result = paymentFailureEmailTemplate(
        participantName, eventTitle, eventEmoji, null, paymentLink,
      )
      expect(result).not.toContain("Motivo:")
    })

    it("should include retry button linking to paymentLink", () => {
      const result = paymentFailureEmailTemplate(
        participantName, eventTitle, eventEmoji, failureReason, paymentLink,
      )
      expect(result).toContain("Tentar novamente")
      expect(result).toContain("https://pay.example.com/retry/abc123")
    })

    it("should include WhatsApp support link", () => {
      const result = paymentFailureEmailTemplate(
        participantName, eventTitle, eventEmoji, failureReason, paymentLink,
      )
      expect(result).toContain("Se o problema persistir")
      expect(result).toContain("wa.me/")
      expect(result).toContain("WhatsApp")
    })

    it("should include footer with settings link", () => {
      const result = paymentFailureEmailTemplate(
        participantName, eventTitle, eventEmoji, failureReason, paymentLink,
      )
      expect(result).toContain("Configurações")
      expect(result).toContain("conta")
      expect(result).toContain("Positiv")
    })
  })

  describe("XSS Protection", () => {
    it("should sanitize script tags in participant name", () => {
      const html = paymentFailureEmailTemplate(
        '<script>alert("XSS")</script>John',
        eventTitle, eventEmoji, failureReason, paymentLink,
      )
      expect(html).not.toContain("<script>")
      expect(html).not.toContain('alert("XSS")')
      expect(html).toContain("John")
    })

    it("should sanitize script tags in event title", () => {
      const html = paymentFailureEmailTemplate(
        participantName,
        '<script>alert("XSS")</script>Party',
        eventEmoji, failureReason, paymentLink,
      )
      expect(html).not.toContain("<script>")
      expect(html).not.toContain('alert("XSS")')
      expect(html).toContain("Party")
    })

    it("should sanitize script tags in failure reason", () => {
      const html = paymentFailureEmailTemplate(
        participantName, eventTitle, eventEmoji,
        '<script>alert("XSS")</script>Declined',
        paymentLink,
      )
      expect(html).not.toContain("<script>")
      expect(html).not.toContain('alert("XSS")')
      expect(html).toContain("Declined")
    })

    it("should sanitize img tag with onerror in emoji", () => {
      const html = paymentFailureEmailTemplate(
        participantName, eventTitle,
        '<img src=x onerror="alert(1)">',
        failureReason, paymentLink,
      )
      expect(html).not.toContain("onerror")
      expect(html).not.toContain("alert(1)")
    })

    it("should sanitize iframe injection in participant name", () => {
      const html = paymentFailureEmailTemplate(
        '<iframe src="https://evil.com"></iframe>Jane',
        eventTitle, eventEmoji, failureReason, paymentLink,
      )
      expect(html).not.toContain("<iframe")
      expect(html).not.toContain("evil.com")
      expect(html).toContain("Jane")
    })

    it("should reject javascript: protocol in paymentLink", () => {
      const html = paymentFailureEmailTemplate(
        participantName, eventTitle, eventEmoji, failureReason,
        "javascript:alert(1)",
      )
      expect(html).not.toContain("javascript:")
    })

    it("should reject data: protocol in paymentLink", () => {
      const html = paymentFailureEmailTemplate(
        participantName, eventTitle, eventEmoji, failureReason,
        "data:text/html,<script>alert(1)</script>",
      )
      expect(html).not.toContain("data:text/html")
    })

    it("should strip quotes and angle brackets from paymentLink to prevent attribute injection", () => {
      const maliciousLink = 'https://evil.com" onclick="alert(1)'
      const html = paymentFailureEmailTemplate(
        participantName, eventTitle, eventEmoji, failureReason,
        maliciousLink,
      )
      expect(html).not.toContain(maliciousLink)
      expect(html).not.toContain('" onclick="')
      expect(html).toContain("https://evil.com onclick=alert(1)")
    })

    it("should allow valid https paymentLink", () => {
      const html = paymentFailureEmailTemplate(
        participantName, eventTitle, eventEmoji, failureReason,
        "https://pay.example.com/retry",
      )
      expect(html).toContain("https://pay.example.com/retry")
    })

    it("should preserve legitimate content after sanitization", () => {
      const html = paymentFailureEmailTemplate(
        "Ana Maria", "Festa de Ano Novo", "🎉",
        "Cartão recusado", "https://pay.example.com/retry",
      )
      expect(html).toContain("Ana Maria")
      expect(html).toContain("Festa de Ano Novo")
      expect(html).toContain("🎉")
      expect(html).toContain("Problema no pagamento")
    })
  })
})

describe("getPaymentFailureEmailSubject", () => {
  it("should include event title", () => {
    const result = getPaymentFailureEmailSubject("Festa de Ano Novo", "🎉")
    expect(result).toContain("Festa de Ano Novo")
  })

  it("should include emoji when present", () => {
    const result = getPaymentFailureEmailSubject("Festa de Ano Novo", "🎉")
    expect(result).toContain("🎉")
  })

  it("should work without emoji", () => {
    const result = getPaymentFailureEmailSubject("Festa de Ano Novo", null)
    expect(result).toContain("Festa de Ano Novo")
    expect(result).not.toContain("null")
  })

  it("should mention payment problem", () => {
    const result = getPaymentFailureEmailSubject("Festa de Ano Novo", "🎉")
    expect(result).toContain("Problema no pagamento")
  })
})
