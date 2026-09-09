import { describe, expect, it } from "vitest"
import {
  type AsaasFees,
  grossForCard,
  grossForPix,
  MAX_INSTALLMENTS,
  PAYMENT_OPTION_IDS,
  parsePaymentOptionId,
} from "./pricing"

// The list prices, spelled out rather than imported from FALLBACK_FEES: a
// change to the fallback must not silently rewrite an expectation here.
const LIST_FEES: AsaasFees = {
  pix: { fixed: 199, percent: 0 },
  card: { fixed: 49, percentOneInstallment: 0.0299, percentUpToSix: 0.0349 },
  anticipation: { detachedMonthlyRate: 0.0115, installmentMonthlyRate: 0.016 },
}

// A PIX account that charges a percentage instead of a fixed fee. The sandbox
// account is on a fixed fee, so nothing else exercises the division.
const PERCENT_PIX_FEES: AsaasFees = {
  ...LIST_FEES,
  pix: { fixed: 0, percent: 0.01 },
}

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

describe("grossForPix", () => {
  it("adds a fixed PIX fee", () => {
    expect(grossForPix(22000, LIST_FEES)).toBe(22199)
  })

  it("grosses up a percentage PIX fee, rounding up", () => {
    // 22000 / 0.99 = 22222.22…
    expect(grossForPix(22000, PERCENT_PIX_FEES)).toBe(22223)
  })
})

describe("grossForCard", () => {
  it("uses the 1x tier and the detached anticipation rate", () => {
    expect(grossForCard(22000, 1, LIST_FEES)).toBe(23002)
  })

  it("uses the 2–6x tier and the instalment anticipation rate", () => {
    expect(grossForCard(22000, 2, LIST_FEES)).toBe(23429)
    expect(grossForCard(22000, 3, LIST_FEES)).toBe(23630)
    expect(grossForCard(22000, 4, LIST_FEES)).toBe(23835)
    expect(grossForCard(22000, 5, LIST_FEES)).toBe(24043)
    expect(grossForCard(22000, 6, LIST_FEES)).toBe(24254)
  })

  it("prices a single installment off the detached rate, not the instalment one", () => {
    const sameRate: AsaasFees = {
      ...LIST_FEES,
      anticipation: {
        detachedMonthlyRate: 0.016,
        installmentMonthlyRate: 0.016,
      },
    }
    expect(grossForCard(22000, 1, sameRate)).not.toBe(
      grossForCard(22000, 1, LIST_FEES),
    )
    expect(grossForCard(22000, 3, sameRate)).toBe(
      grossForCard(22000, 3, LIST_FEES),
    )
  })

  it("never nets less than the base after the fees are taken", () => {
    for (const base of [100, 999, 22000, 123456]) {
      for (let n = 1; n <= MAX_INSTALLMENTS; n++) {
        const gross = grossForCard(base, n, LIST_FEES)
        const percent =
          n === 1
            ? LIST_FEES.card.percentOneInstallment
            : LIST_FEES.card.percentUpToSix
        const monthlyRate =
          n === 1
            ? LIST_FEES.anticipation.detachedMonthlyRate
            : LIST_FEES.anticipation.installmentMonthlyRate
        const net =
          gross -
          (gross * percent + LIST_FEES.card.fixed) -
          gross * monthlyRate * ((n + 1) / 2)
        expect(net).toBeGreaterThanOrEqual(base)
      }
    }
  })

  it("rejects installment counts outside 1..6", () => {
    expect(() => grossForCard(22000, 0, LIST_FEES)).toThrow()
    expect(() => grossForCard(22000, 7, LIST_FEES)).toThrow()
  })

  it("rejects a fee table whose fees eat the whole price", () => {
    const greedy: AsaasFees = {
      ...LIST_FEES,
      anticipation: { detachedMonthlyRate: 0.0115, installmentMonthlyRate: 0.5 },
    }
    expect(() => grossForCard(22000, 6, greedy)).toThrow()
  })
})
