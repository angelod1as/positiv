import { describe, expect, it } from "vitest"
import type { PaymentOption } from "~/business/payment/pricing"
import { paymentsCopy } from "./payments"

const pix: PaymentOption = {
  id: "pix",
  method: "pix",
  installmentCount: null,
  perInstallment: 22500,
  total: 22500,
}

const cardOnce: PaymentOption = {
  id: "card_1",
  method: "credit_card",
  installmentCount: 1,
  perInstallment: 25000,
  total: 25000,
}

const cardFiveTimes: PaymentOption = {
  id: "card_5",
  method: "credit_card",
  installmentCount: 5,
  perInstallment: 5000,
  total: 25000,
}

const cardSixTimes: PaymentOption = {
  id: "card_6",
  method: "credit_card",
  installmentCount: 6,
  perInstallment: 4166,
  total: 25000,
}

describe("paymentsCopy.options.label", () => {
  it("labels pix with the total", () => {
    expect(paymentsCopy.options.label(pix)).toBe("Pix — R$ 225,00")
  })

  it("labels a single card installment with the total only", () => {
    expect(paymentsCopy.options.label(cardOnce)).toBe(
      "Cartão à vista — R$ 250,00",
    )
  })

  it("labels installments with the per-installment value and the total", () => {
    expect(paymentsCopy.options.label(cardSixTimes)).toBe(
      "Cartão 6x de R$ 41,66 (total R$ 250,00)",
    )
  })
})

describe("paymentsCopy.options.title", () => {
  it("names Pix plainly", () => {
    expect(paymentsCopy.options.title(pix)).toBe("Pix")
  })

  it("names the card, then how it is paid", () => {
    expect(paymentsCopy.options.title(cardOnce)).toBe(
      "Cartão de crédito — à vista",
    )
    expect(paymentsCopy.options.title(cardSixTimes)).toBe(
      "Cartão de crédito — 6x de R$ 41,66",
    )
  })
})

describe("paymentsCopy.options.breakdown", () => {
  it("names the Pix discount against the event price", () => {
    expect(paymentsCopy.options.breakdown(25000, pix)).toBe(
      "10% de desconto sobre R$ 250,00",
    )
  })

  it("says nothing about a Pix at the full price", () => {
    expect(
      paymentsCopy.options.breakdown(25000, { ...pix, total: 25000 }),
    ).toBeNull()
  })

  // The card's title already says how it is paid; nothing more goes under it.
  it("says nothing about a card option, however it is split", () => {
    expect(paymentsCopy.options.breakdown(25000, cardOnce)).toBeNull()
    expect(paymentsCopy.options.breakdown(25000, cardFiveTimes)).toBeNull()
    expect(paymentsCopy.options.breakdown(25000, cardSixTimes)).toBeNull()
  })
})

describe("paymentsCopy.whatsappMessage", () => {
  const options: PaymentOption[] = [pix, cardSixTimes]

  const input = {
    displayName: "Ana",
    eventTitle: "Festa de Setembro",
    paymentUrl: "https://www.positivparty.com/pagamento/abc",
    dueAt: "2026-09-01T12:00:00Z",
    options,
  }

  it("names the person and the event", () => {
    const message = paymentsCopy.whatsappMessage(input)

    expect(message).toContain("Ana")
    expect(message).toContain("Festa de Setembro")
  })

  it("lists every option with its price", () => {
    const message = paymentsCopy.whatsappMessage(input)

    expect(message).toContain("Pix — R$ 225,00")
    expect(message).toContain("Cartão 6x de R$ 41,66 (total R$ 250,00)")
  })

  it("carries the link and the deadline", () => {
    const message = paymentsCopy.whatsappMessage(input)

    expect(message).toContain("https://www.positivparty.com/pagamento/abc")
    expect(message).toContain("01/09/2026")
  })
})
