import { describe, expect, it } from "vitest"
import {
  getPaymentSuccessEmailSubject,
  paymentSuccessEmailTemplate,
} from "./payment-success-email.template"

describe("paymentSuccessEmailTemplate", () => {
  const participantName = "Ana Maria"
  const eventTitle = "Festa de Ano Novo"
  const eventEmoji = "🎉"
  const paymentMethod = "PIX"
  const amount = "R$ 220,00"
  const installments = null
  const paymentDate = "10 de março de 2026"

  describe("Basic structure", () => {
    it("should return a string", () => {
      const result = paymentSuccessEmailTemplate(
        participantName, eventTitle, eventEmoji, paymentMethod, amount, installments, paymentDate,
      )
      expect(typeof result).toBe("string")
    })

    it("should be valid HTML with DOCTYPE", () => {
      const result = paymentSuccessEmailTemplate(
        participantName, eventTitle, eventEmoji, paymentMethod, amount, installments, paymentDate,
      )
      expect(result).toContain("<!DOCTYPE html>")
      expect(result).toContain('<html lang="pt-BR">')
      expect(result).toContain("</html>")
    })

    it("should include Brand Purple gradient background", () => {
      const result = paymentSuccessEmailTemplate(
        participantName, eventTitle, eventEmoji, paymentMethod, amount, installments, paymentDate,
      )
      expect(result).toContain(
        "linear-gradient(135deg, #4a75d2 0%, #bf03c3 100%)",
      )
    })

    it("should include Positiv logo", () => {
      const result = paymentSuccessEmailTemplate(
        participantName, eventTitle, eventEmoji, paymentMethod, amount, installments, paymentDate,
      )
      expect(result).toContain("positiv-logo-colors.png")
    })
  })

  describe("Content", () => {
    it("should include greeting with participant name", () => {
      const result = paymentSuccessEmailTemplate(
        participantName, eventTitle, eventEmoji, paymentMethod, amount, installments, paymentDate,
      )
      expect(result).toContain("Olá, Ana Maria!")
    })

    it("should include event title with emoji", () => {
      const result = paymentSuccessEmailTemplate(
        participantName, eventTitle, eventEmoji, paymentMethod, amount, installments, paymentDate,
      )
      expect(result).toContain("🎉")
      expect(result).toContain("Festa de Ano Novo")
    })

    it("should handle null emoji", () => {
      const result = paymentSuccessEmailTemplate(
        participantName, eventTitle, null, paymentMethod, amount, installments, paymentDate,
      )
      expect(result).toContain("Festa de Ano Novo")
      expect(result).not.toContain("🎉")
    })

    it("should include success confirmation message", () => {
      const result = paymentSuccessEmailTemplate(
        participantName, eventTitle, eventEmoji, paymentMethod, amount, installments, paymentDate,
      )
      expect(result).toContain("Seu pagamento foi confirmado com sucesso!")
    })

    it("should include payment method in details", () => {
      const result = paymentSuccessEmailTemplate(
        participantName, eventTitle, eventEmoji, paymentMethod, amount, installments, paymentDate,
      )
      expect(result).toContain("PIX")
    })

    it("should include amount in details", () => {
      const result = paymentSuccessEmailTemplate(
        participantName, eventTitle, eventEmoji, paymentMethod, amount, installments, paymentDate,
      )
      expect(result).toContain("R$ 220,00")
    })

    it("should include payment date in details", () => {
      const result = paymentSuccessEmailTemplate(
        participantName, eventTitle, eventEmoji, paymentMethod, amount, installments, paymentDate,
      )
      expect(result).toContain("10 de março de 2026")
    })

    it("should show installments when greater than 1", () => {
      const result = paymentSuccessEmailTemplate(
        participantName, eventTitle, eventEmoji, "Cartão de Crédito", "R$ 250,00", 3, paymentDate,
      )
      expect(result).toContain("3x")
    })

    it("should not show installments when null", () => {
      const result = paymentSuccessEmailTemplate(
        participantName, eventTitle, eventEmoji, paymentMethod, amount, null, paymentDate,
      )
      expect(result).not.toMatch(/Parcelas/)
    })

    it("should not show installments when 1", () => {
      const result = paymentSuccessEmailTemplate(
        participantName, eventTitle, eventEmoji, "Cartão de Crédito", "R$ 250,00", 1, paymentDate,
      )
      expect(result).not.toMatch(/Parcelas/)
    })

    it("should include next steps message", () => {
      const result = paymentSuccessEmailTemplate(
        participantName, eventTitle, eventEmoji, paymentMethod, amount, installments, paymentDate,
      )
      expect(result).toContain("Agora é só aguardar o dia do evento!")
    })

    it("should include footer with settings link", () => {
      const result = paymentSuccessEmailTemplate(
        participantName, eventTitle, eventEmoji, paymentMethod, amount, installments, paymentDate,
      )
      expect(result).toContain("Configurações")
      expect(result).toContain("conta")
      expect(result).toContain("Positiv")
    })
  })

  describe("XSS Protection", () => {
    it("should sanitize script tags in participant name", () => {
      const html = paymentSuccessEmailTemplate(
        '<script>alert("XSS")</script>John',
        eventTitle, eventEmoji, paymentMethod, amount, installments, paymentDate,
      )

      expect(html).not.toContain("<script>")
      expect(html).not.toContain('alert("XSS")')
      expect(html).toContain("John")
    })

    it("should sanitize script tags in event title", () => {
      const html = paymentSuccessEmailTemplate(
        participantName,
        '<script>alert("XSS")</script>Party',
        eventEmoji, paymentMethod, amount, installments, paymentDate,
      )

      expect(html).not.toContain("<script>")
      expect(html).not.toContain('alert("XSS")')
      expect(html).toContain("Party")
    })

    it("should sanitize img tag with onerror in emoji", () => {
      const html = paymentSuccessEmailTemplate(
        participantName, eventTitle,
        '<img src=x onerror="alert(1)">',
        paymentMethod, amount, installments, paymentDate,
      )

      expect(html).not.toContain("onerror")
      expect(html).not.toContain("alert(1)")
    })

    it("should sanitize iframe injection in participant name", () => {
      const html = paymentSuccessEmailTemplate(
        '<iframe src="https://evil.com"></iframe>Jane',
        eventTitle, eventEmoji, paymentMethod, amount, installments, paymentDate,
      )

      expect(html).not.toContain("<iframe")
      expect(html).not.toContain("evil.com")
      expect(html).toContain("Jane")
    })

    it("should sanitize onclick in payment method", () => {
      const html = paymentSuccessEmailTemplate(
        participantName, eventTitle, eventEmoji,
        '<div onclick="alert(1)">PIX</div>',
        amount, installments, paymentDate,
      )

      expect(html).not.toContain("onclick")
      expect(html).not.toContain("alert(1)")
    })

    it("should sanitize javascript: protocol in amount", () => {
      const html = paymentSuccessEmailTemplate(
        participantName, eventTitle, eventEmoji,
        paymentMethod,
        '<a href="javascript:alert(1)">R$ 220,00</a>',
        installments, paymentDate,
      )

      expect(html).not.toContain("javascript:")
    })

    it("should sanitize data: protocol in payment date", () => {
      const html = paymentSuccessEmailTemplate(
        participantName, eventTitle, eventEmoji,
        paymentMethod, amount, installments,
        '<a href="data:text/html,<script>alert(1)</script>">date</a>',
      )

      expect(html).not.toContain("data:text/html")
    })

    it("should preserve legitimate content after sanitization", () => {
      const html = paymentSuccessEmailTemplate(
        "Ana Maria", "Festa de Ano Novo", "🎉",
        "PIX", "R$ 220,00", null, "10 de março de 2026",
      )

      expect(html).toContain("Ana Maria")
      expect(html).toContain("Festa de Ano Novo")
      expect(html).toContain("🎉")
      expect(html).toContain("Pagamento confirmado")
    })
  })
})

describe("getPaymentSuccessEmailSubject", () => {
  it("should include event title", () => {
    const result = getPaymentSuccessEmailSubject("Festa de Ano Novo", "🎉")
    expect(result).toContain("Festa de Ano Novo")
  })

  it("should include emoji when present", () => {
    const result = getPaymentSuccessEmailSubject("Festa de Ano Novo", "🎉")
    expect(result).toContain("🎉")
  })

  it("should work without emoji", () => {
    const result = getPaymentSuccessEmailSubject("Festa de Ano Novo", null)
    expect(result).toContain("Festa de Ano Novo")
    expect(result).not.toContain("null")
  })

  it("should mention payment confirmation", () => {
    const result = getPaymentSuccessEmailSubject("Festa de Ano Novo", "🎉")
    expect(result).toContain("Pagamento confirmado")
  })
})
