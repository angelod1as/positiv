import { describe, expect, it } from "vitest"
import { formatPaymentSuccessMail } from "./format-payment-success-mail"

describe("formatPaymentSuccessMail", () => {
  const participantName = "Ana Maria"
  const eventTitle = "Festa de Ano Novo"
  const eventEmoji = "🎉"
  const paymentMethod = "PIX"
  const amount = "R$ 220,00"
  const installments = null
  const paymentDate = "10 de março de 2026"

  it("should return both html and text", async () => {
    const result = await formatPaymentSuccessMail(
      participantName, eventTitle, eventEmoji, paymentMethod, amount, installments, paymentDate,
    )

    expect(result).toHaveProperty("html")
    expect(result).toHaveProperty("text")
    expect(typeof result.html).toBe("string")
    expect(typeof result.text).toBe("string")
  })

  it("should include participant name in html", async () => {
    const result = await formatPaymentSuccessMail(
      participantName, eventTitle, eventEmoji, paymentMethod, amount, installments, paymentDate,
    )

    expect(result.html).toContain("Ana Maria")
  })

  it("should include event details in html", async () => {
    const result = await formatPaymentSuccessMail(
      participantName, eventTitle, eventEmoji, paymentMethod, amount, installments, paymentDate,
    )

    expect(result.html).toContain("Festa de Ano Novo")
    expect(result.html).toContain("🎉")
  })

  it("should include payment details in html", async () => {
    const result = await formatPaymentSuccessMail(
      participantName, eventTitle, eventEmoji, paymentMethod, amount, installments, paymentDate,
    )

    expect(result.html).toContain("PIX")
    expect(result.html).toContain("R$ 220,00")
    expect(result.html).toContain("10 de março de 2026")
  })

  it("should convert html to plain text", async () => {
    const result = await formatPaymentSuccessMail(
      participantName, eventTitle, eventEmoji, paymentMethod, amount, installments, paymentDate,
    )

    expect(result.text).toContain("Ana Maria")
    expect(result.text).toContain("Festa de Ano Novo")
    expect(result.text).not.toContain("<html")
    expect(result.text).not.toContain("<body")
  })
})
