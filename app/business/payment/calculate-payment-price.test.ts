import { describe, expect, it } from "vitest"
import { ASAAS_FEES, BASE_PRICE, MAX_INSTALLMENTS } from "~/integrations/asaas/constants"
import { calculatePaymentPrice } from "./calculate-payment-price"

describe("calculatePaymentPrice", () => {
  describe("constants", () => {
    it("has BASE_PRICE of 22000 centavos (R$220)", () => {
      expect(BASE_PRICE).toBe(22_000)
    })

    it("has pix fees at zero (absorbed by us)", () => {
      expect(ASAAS_FEES.pix).toEqual({ rate: 0, fixed: 0 })
    })

    it("has cc_1x fees at 2.99% + R$0.49", () => {
      expect(ASAAS_FEES.cc_1x).toEqual({ rate: 0.0299, fixed: 49 })
    })

    it("has cc_2_6x fees at 3.49% + R$0.49", () => {
      expect(ASAAS_FEES.cc_2_6x).toEqual({ rate: 0.0349, fixed: 49 })
    })

    it("has MAX_INSTALLMENTS of 6", () => {
      expect(MAX_INSTALLMENTS).toBe(6)
    })
  })

  describe("pix", () => {
    it("returns totalAmount of 22000 and installmentValue of 22000", () => {
      const result = calculatePaymentPrice("pix", 1)
      expect(result).toEqual({ totalAmount: 22_000, installmentValue: 22_000 })
    })
  })

  describe("credit card 1x", () => {
    it("returns totalAmount of 22707 and installmentValue of 22707", () => {
      const result = calculatePaymentPrice("credit_card", 1)
      expect(result).toEqual({
        totalAmount: 22_707,
        installmentValue: 22_707,
      })
    })
  })

  describe("credit card 2x", () => {
    it("returns totalAmount of 22817 and installmentValue of 11409", () => {
      const result = calculatePaymentPrice("credit_card", 2)
      expect(result).toEqual({
        totalAmount: 22_817,
        installmentValue: 11_409,
      })
    })
  })

  describe("credit card 3x", () => {
    it("returns totalAmount of 22817 and installmentValue of 7606", () => {
      const result = calculatePaymentPrice("credit_card", 3)
      expect(result).toEqual({
        totalAmount: 22_817,
        installmentValue: 7_606,
      })
    })
  })

  describe("credit card 6x", () => {
    it("returns totalAmount of 22817 and installmentValue of 3803", () => {
      const result = calculatePaymentPrice("credit_card", 6)
      expect(result).toEqual({
        totalAmount: 22_817,
        installmentValue: 3_803,
      })
    })
  })

  describe("edge cases", () => {
    it("throws for 0 installments", () => {
      expect(() => calculatePaymentPrice("credit_card", 0)).toThrow()
    })

    it("throws for negative installments", () => {
      expect(() => calculatePaymentPrice("credit_card", -1)).toThrow()
    })

    it("throws for installments greater than MAX_INSTALLMENTS", () => {
      expect(() => calculatePaymentPrice("credit_card", 7)).toThrow()
    })

    it("throws for pix with more than 1 installment", () => {
      expect(() => calculatePaymentPrice("pix", 2)).toThrow()
    })
  })
})
