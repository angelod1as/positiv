import { describe, expect, it } from "vitest"
import { calculatePaymentPrice } from "./calculate-payment-price"

describe("calculatePaymentPrice", () => {
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

    it("throws for non-integer installments", () => {
      expect(() => calculatePaymentPrice("credit_card", 1.5)).toThrow(
        "Installments must be an integer",
      )
    })
  })
})
