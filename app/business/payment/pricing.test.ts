import { describe, expect, it } from "vitest"
import {
  MAX_INSTALLMENTS,
  PAYMENT_OPTION_IDS,
  parsePaymentOptionId,
} from "./pricing"

describe("payment option ids", () => {
  it("lists pix and one card option per installment count", () => {
    expect(MAX_INSTALLMENTS).toBe(6)
    expect(PAYMENT_OPTION_IDS).toEqual([
      "pix",
      "card_1",
      "card_2",
      "card_3",
      "card_4",
      "card_5",
      "card_6",
    ])
  })

  it("parses a known id and rejects anything else", () => {
    expect(parsePaymentOptionId("pix")).toBe("pix")
    expect(parsePaymentOptionId("card_3")).toBe("card_3")
    expect(parsePaymentOptionId("card_7")).toBeNull()
    expect(parsePaymentOptionId("boleto")).toBeNull()
    expect(parsePaymentOptionId(3)).toBeNull()
    expect(parsePaymentOptionId(undefined)).toBeNull()
  })
})
