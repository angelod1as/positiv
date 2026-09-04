import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  FALLBACK_FEES,
  getAsaasFees,
  resetAsaasFeesCache,
} from "./asaas-fees.server"

const env = vi.hoisted<Record<string, unknown>>(() => ({
  APP_ENV: "test",
  ASAAS_API_URL: "https://api-sandbox.asaas.com/v3",
  ASAAS_API_KEY: "aact_test_key",
}))

vi.mock("varlock/env", () => ({ ENV: env }))

vi.mock("~/lib/logger/logger.server", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

const fetchMock = vi.fn()

// The shape Asaas actually returned for the sandbox account on 2026-08-24:
// the PIX percentages are null because the account is on a FIXED PIX fee, and
// the card block ships both the plain and the negotiated percentages.
const feesBody = {
  payment: {
    creditCard: {
      operationValue: 0.49,
      oneInstallmentPercentage: 2.99,
      upToSixInstallmentsPercentage: 3.49,
      discountOneInstallmentPercentage: 1.99,
      discountUpToSixInstallmentsPercentage: 2.49,
      hasValidDiscount: false,
      discountExpiration: "2026-06-10 00:00:00",
    },
    pix: {
      fixedFeeValue: 1.99,
      percentageFee: null,
      minimumFeeValue: null,
      maximumFeeValue: null,
      type: "FIXED",
      monthlyCreditsWithoutFee: 100,
    },
  },
  anticipation: {
    creditCard: {
      detachedMonthlyFeeValue: 1.15,
      installmentMonthlyFeeValue: 1.6,
    },
  },
}

function feesResponse(body: unknown = feesBody, status = 200) {
  return new Response(JSON.stringify(body), { status })
}

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal("fetch", fetchMock)
  resetAsaasFeesCache()
  delete env.ASAAS_ANTICIPATION_DETACHED_MONTHLY_RATE
  delete env.ASAAS_ANTICIPATION_INSTALLMENT_MONTHLY_RATE
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe("getAsaasFees", () => {
  it("maps the account fees to cents and fractions", async () => {
    fetchMock.mockResolvedValueOnce(feesResponse())

    expect(await getAsaasFees()).toEqual({
      pix: { fixed: 199, percent: 0 },
      card: { fixed: 49, percentOneInstallment: 0.0299, percentUpToSix: 0.0349 },
      anticipation: { detachedMonthlyRate: 0.0115, installmentMonthlyRate: 0.016 },
    })
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://api-sandbox.asaas.com/v3/myAccount/fees/",
    )
  })

  it("uses the negotiated card percentages while the discount is valid", async () => {
    fetchMock.mockResolvedValueOnce(
      feesResponse({
        ...feesBody,
        payment: {
          ...feesBody.payment,
          creditCard: { ...feesBody.payment.creditCard, hasValidDiscount: true },
        },
      }),
    )

    const fees = await getAsaasFees()

    expect(fees.card.percentOneInstallment).toBe(0.0199)
    expect(fees.card.percentUpToSix).toBe(0.0249)
  })

  it("reads a percentage PIX account rather than assuming the fixed fee", async () => {
    fetchMock.mockResolvedValueOnce(
      feesResponse({
        ...feesBody,
        payment: {
          ...feesBody.payment,
          pix: { fixedFeeValue: 0, percentageFee: 1.2, type: "PERCENTAGE" },
        },
      }),
    )

    expect((await getAsaasFees()).pix).toEqual({ fixed: 0, percent: 0.012 })
  })

  it("prefers a configured anticipation rate, one side at a time", async () => {
    env.ASAAS_ANTICIPATION_INSTALLMENT_MONTHLY_RATE = 0.0125
    fetchMock.mockResolvedValueOnce(feesResponse())

    expect((await getAsaasFees()).anticipation).toEqual({
      detachedMonthlyRate: 0.0115,
      installmentMonthlyRate: 0.0125,
    })
  })

  it("caches for twelve hours", async () => {
    vi.useFakeTimers()
    fetchMock.mockResolvedValue(feesResponse())

    await getAsaasFees()
    await getAsaasFees()
    expect(fetchMock).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(12 * 60 * 60 * 1000 + 1)
    await getAsaasFees()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it("falls back to the list prices when the request fails, without caching the failure", async () => {
    fetchMock.mockResolvedValueOnce(feesResponse("nope", 500))

    expect(await getAsaasFees()).toEqual(FALLBACK_FEES)

    fetchMock.mockResolvedValueOnce(feesResponse())
    await getAsaasFees()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it("falls back when the payload no longer has the fields it maps", async () => {
    fetchMock.mockResolvedValueOnce(feesResponse({ payment: { pix: {} } }))

    expect(await getAsaasFees()).toEqual(FALLBACK_FEES)
  })

  it("still applies a configured rate to the fallback", async () => {
    env.ASAAS_ANTICIPATION_DETACHED_MONTHLY_RATE = 0.009
    fetchMock.mockResolvedValueOnce(feesResponse("nope", 500))

    expect((await getAsaasFees()).anticipation.detachedMonthlyRate).toBe(0.009)
  })
})
