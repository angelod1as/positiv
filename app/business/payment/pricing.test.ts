import { describe, expect, it } from "vitest"
import {
  buildPaymentOptions,
  findPaymentOption,
  MAX_INSTALLMENTS,
  PAYMENT_OPTION_IDS,
  parsePaymentOptionId,
  PIX_DISCOUNT_PERCENT,
  pixPrice,
} from "./pricing"
import { asaasConnector } from "./provider/asaas/asaas-connector.server"

const { splitInstallments } = asaasConnector

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

describe("buildPaymentOptions", () => {
  describe("with card payments on", () => {
    const options = buildPaymentOptions(25000, { cardEnabled: true, splitInstallments })

    it("returns pix first, then card 1x..6x", () => {
      expect(options.map((option) => option.id)).toEqual(PAYMENT_OPTION_IDS)
    })

    it("offers Pix at 10% off the event price", () => {
      expect(options[0]).toEqual({
        id: "pix",
        method: "pix",
        installmentCount: null,
        perInstallment: 22500,
        total: 22500,
      })
    })

    it("charges the event price on the card, whatever the installments", () => {
      for (const option of options.slice(1)) {
        expect(option.method).toBe("credit_card")
        expect(option.total).toBe(25000)
      }
    })

    it("carries each installment the way Asaas will charge it", () => {
      expect(options[1]).toMatchObject({
        id: "card_1",
        installmentCount: 1,
        perInstallment: 25000,
      })
      expect(options[6]).toMatchObject({
        id: "card_6",
        installmentCount: 6,
        perInstallment: 4166,
      })
    })

    it("takes each installment from the split it is given", () => {
      const split = (total: number, count: number) => [
        total - 1,
        ...Array(count - 1).fill(1),
      ]
      const card = buildPaymentOptions(25000, {
        cardEnabled: true,
        splitInstallments: split,
      })[6]

      expect(card).toMatchObject({ perInstallment: 24999, total: 25000 })
    })
  })

  describe("with card payments off", () => {
    it("offers Pix alone, at the full event price", () => {
      expect(buildPaymentOptions(25000, { cardEnabled: false, splitInstallments })).toEqual([
        {
          id: "pix",
          method: "pix",
          installmentCount: null,
          perInstallment: 25000,
          total: 25000,
        },
      ])
    })
  })
})

describe("findPaymentOption", () => {
  it("returns the option for an id and null for an unknown one", () => {
    const options = buildPaymentOptions(22000, { cardEnabled: true, splitInstallments })
    expect(findPaymentOption(options, "card_2")?.installmentCount).toBe(2)
    expect(findPaymentOption(options, "card_9")).toBeNull()
  })

  it("finds no card option while card payments are off", () => {
    const options = buildPaymentOptions(22000, { cardEnabled: false, splitInstallments })
    expect(findPaymentOption(options, "card_1")).toBeNull()
    expect(findPaymentOption(options, "pix")?.total).toBe(22000)
  })
})

describe("pixPrice", () => {
  it("takes 10% off the event price", () => {
    expect(PIX_DISCOUNT_PERCENT).toBe(10)
    expect(pixPrice(22000)).toBe(19800)
  })

  // 4645 × 0.9 = 4180.5: the half cent goes to the participant.
  it("rounds an odd cent down, in the participant's favour", () => {
    expect(pixPrice(4645)).toBe(4180)
    expect(pixPrice(1)).toBe(0)
  })

  it("keeps a free spot free", () => {
    expect(pixPrice(0)).toBe(0)
  })
})
