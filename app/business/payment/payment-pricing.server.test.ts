import { describe, it, expect } from "vitest"
import {
  buildPaymentOptions,
  calculateChargeAmount,
  calculateInstallmentValue,
  MAX_INSTALLMENTS,
} from "./payment-pricing.server"

describe("calculateChargeAmount", () => {
  it("single installment (PIX/CC 1x) — Asaas 1x fee: 2.99% + R$0.49", () => {
    // Formula: (price_cents / anticipationFactor + fixed_fee) / (1 - percent_fee)
    // For 1x: anticipationFactor = 1 - 0.0115 * 1 = 0.9885 ≈ 1 (but code uses it)
    // price=100 => ceil((10000/0.9885 + 49) / (1 - 0.0299)) / 100 = ceil((10116.34 + 49) / 0.9701) / 100
    //           = ceil(10478.84) / 100 = 104.79
    const result = calculateChargeAmount(100, 1)
    expect(result).toBe(104.79)
  })

  it("2x installment uses 3.49% + R$0.49 config", () => {
    // anticipationFactor = 1 - 0.016 * 2 = 0.968
    const result = calculateChargeAmount(100, 2)
    // Verify it's more than 1x since fees are higher + anticipation
    expect(result).toBeGreaterThan(calculateChargeAmount(100, 1))
  })

  it("4x installment charges more than 2x (more anticipation)", () => {
    expect(calculateChargeAmount(100, 4)).toBeGreaterThan(
      calculateChargeAmount(100, 2),
    )
  })

  it("throws for installments > 6 (Asaas unsupported)", () => {
    expect(() => calculateChargeAmount(100, 7)).toThrow(
      "Unsupported installment count",
    )
  })

  it("rounds UP to nearest cent (gateway fee safety)", () => {
    // Any fractional cent must round up so Asaas fees never push us below
    // the ticket price
    const result = calculateChargeAmount(100, 1)
    const cents = Math.round(result * 100)
    expect(cents).toBe(10479) // exact cents, no fractions
  })
})

describe("calculateInstallmentValue", () => {
  it("1x installment equals charge amount", () => {
    const total = calculateChargeAmount(100, 1)
    const perInstallment = calculateInstallmentValue(100, 1)
    expect(perInstallment).toBe(total)
  })

  it("2x installment value × 2 is close to (not less than) charge amount", () => {
    const perInstallment = calculateInstallmentValue(100, 2)
    const total = calculateChargeAmount(100, 2)
    // Each installment rounds up independently, so total may be a cent
    // higher than the computed charge amount.
    expect(perInstallment * 2).toBeGreaterThanOrEqual(total)
    expect(perInstallment * 2 - total).toBeLessThan(0.1)
  })
})

describe("buildPaymentOptions", () => {
  it("returns PIX + CC 1 through MAX_INSTALLMENTS", () => {
    const options = buildPaymentOptions(100)
    expect(options).toHaveLength(1 + MAX_INSTALLMENTS)
    expect(options[0].value).toBe("PIX")
    expect(options[0].billingType).toBe("PIX")
    for (let i = 1; i <= MAX_INSTALLMENTS; i++) {
      const opt = options[i]
      expect(opt.value).toBe(`CC_${i}`)
      expect(opt.billingType).toBe("CREDIT_CARD")
      expect(opt.installments).toBe(i)
    }
  })

  it("PIX totalReais equals ticket price (no fees passed to user)", () => {
    const [pix] = buildPaymentOptions(220)
    expect(pix.totalReais).toBe(220)
    expect(pix.perInstallmentReais).toBe(220)
  })

  it("CC options charge more than PIX (fees)", () => {
    const [pix, cc1] = buildPaymentOptions(220)
    expect(cc1.totalReais).toBeGreaterThan(pix.totalReais)
  })

  it("Higher installments always cost more total", () => {
    const options = buildPaymentOptions(220)
    const ccOnly = options.filter((o) => o.billingType === "CREDIT_CARD")
    for (let i = 1; i < ccOnly.length; i++) {
      expect(ccOnly[i].totalReais).toBeGreaterThan(ccOnly[i - 1].totalReais)
    }
  })

  it("perInstallmentReais × installments is close to (>=) totalReais", () => {
    const options = buildPaymentOptions(220)
    for (const opt of options) {
      const product = Math.round(opt.perInstallmentReais * opt.installments * 100) / 100
      expect(product).toBeGreaterThanOrEqual(opt.totalReais - 0.01)
    }
  })

  it("MAX_INSTALLMENTS is within Asaas's supported range (1-6)", () => {
    // Guard: payment-pricing only configures fees for 1 and 2-6 tiers.
    // If MAX_INSTALLMENTS ever exceeds 6, calculateChargeAmount throws.
    expect(MAX_INSTALLMENTS).toBeLessThanOrEqual(6)
    expect(MAX_INSTALLMENTS).toBeGreaterThanOrEqual(1)
  })
})
