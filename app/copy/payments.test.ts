import { describe, expect, it } from "vitest"
import type { PaymentOption } from "~/business/payment/pricing"
import { paymentsCopy } from "./payments"

describe("paymentsCopy.options.label", () => {
  it("labels pix with the total", () => {
    const pix: PaymentOption = {
      id: "pix",
      method: "pix",
      installmentCount: null,
      perInstallment: 22199,
      total: 22199,
    }
    expect(paymentsCopy.options.label(pix)).toBe("Pix — R$ 221,99")
  })

  it("labels a single card installment with the total only", () => {
    expect(
      paymentsCopy.options.label({
        id: "card_1",
        method: "credit_card",
        installmentCount: 1,
        perInstallment: 23002,
        total: 23002,
      }),
    ).toBe("Cartão à vista — R$ 230,02")
  })

  it("labels installments with the per-installment value and the total", () => {
    expect(
      paymentsCopy.options.label({
        id: "card_3",
        method: "credit_card",
        installmentCount: 3,
        perInstallment: 7877,
        total: 23631,
      }),
    ).toBe("Cartão 3x de R$ 78,77 (total R$ 236,31)")
  })
})
