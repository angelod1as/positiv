import { describe, expect, it } from "vitest"
import type { AsaasFees } from "../../app/business/payment/pricing"
import { calibrate, expectedNet } from "./smoke-calibration"

const fees: AsaasFees = {
  pix: { fixed: 199, percent: 0 },
  card: { fixed: 49, percentOneInstallment: 0.0299, percentUpToSix: 0.0349 },
  anticipation: { detachedMonthlyRate: 0.0115, installmentMonthlyRate: 0.016 },
}

describe("expectedNet", () => {
  it("takes only the fixed fee off a PIX charge, with nothing to anticipate", () => {
    // 22199 − 199
    expect(expectedNet({ method: "pix", installmentCount: null, total: 22199 }, fees)).toEqual({
      beforeAnticipation: 22000,
      anticipation: 0,
    })
  })

  it("splits a card plan's cost into the card fee Asaas nets out and the anticipation it books apart", () => {
    // Card fee: 3.49% of 23631 + 49 = 873.72 → 22757.28 left
    // Anticipation: 1.60%/month × (3+1)/2 months × 23631 = 756.19
    expect(
      expectedNet({ method: "credit_card", installmentCount: 3, total: 23631 }, fees),
    ).toEqual({ beforeAnticipation: 22757, anticipation: 756 })
  })

  it("prices a single card charge at the one-installment and detached rates", () => {
    // Card fee: 2.99% of 23000 + 49 = 736.70 → 22263.30 left
    // Anticipation: 1.15%/month × 1 month × 23000 = 264.50
    expect(
      expectedNet({ method: "credit_card", installmentCount: 1, total: 23000 }, fees),
    ).toEqual({ beforeAnticipation: 22263, anticipation: 265 })
  })
})

describe("calibrate", () => {
  const expected = { beforeAnticipation: 22757, anticipation: 756 }

  it("passes when Asaas nets what the formula predicts, within fifty cents", () => {
    expect(
      calibrate({ expected, reportedNet: 22740, reportedAnticipation: 760 }),
    ).toEqual({ feeDifference: -17, anticipationDifference: 4, ok: true })
  })

  it("fails on a card-fee gap past the tolerance", () => {
    expect(
      calibrate({ expected, reportedNet: 22600, reportedAnticipation: 756 }).ok,
    ).toBe(false)
  })

  it("fails on an anticipation gap past the tolerance", () => {
    expect(
      calibrate({ expected, reportedNet: 22757, reportedAnticipation: 900 }).ok,
    ).toBe(false)
  })

  it("says the anticipation was not measured rather than passing it", () => {
    expect(
      calibrate({ expected, reportedNet: 22757, reportedAnticipation: null }),
    ).toEqual({ feeDifference: 0, anticipationDifference: null, ok: true })
  })
})
