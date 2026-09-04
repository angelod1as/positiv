import { ENV } from "varlock/env"
import { logger } from "~/lib/logger/logger.server"
import { getAsaasAccountFees, reaisToCents } from "./asaas-client.server"
import type { AsaasFees } from "./pricing"

const CACHE_TTL_MS = 12 * 60 * 60 * 1000

// The public price list, read from the sandbox account on 2026-08-24. Used
// only when the fee endpoint cannot be reached: charging by these when the
// account has negotiated rates undercharges, which is the safe direction.
export const FALLBACK_FEES: AsaasFees = {
  pix: { fixed: 199, percent: 0 },
  card: { fixed: 49, percentOneInstallment: 0.0299, percentUpToSix: 0.0349 },
  anticipation: { detachedMonthlyRate: 0.0115, installmentMonthlyRate: 0.016 },
}

let cached: { fees: AsaasFees; fetchedAt: number } | null = null

export function resetAsaasFeesCache() {
  cached = null
}

// Asaas quotes percentages as decimals ("2.49"), and dividing by 100 in binary
// floating point turns that into 0.024900000000000002. Rounded here so a fee
// snapshot stored beside a payment reads as the rate Asaas published.
function percentToFraction(percentage: number | null | undefined): number {
  return Math.round(((percentage ?? 0) / 100) * 1e6) / 1e6
}

function configuredRate(value: unknown): number | null {
  return typeof value === "number" && value > 0 ? value : null
}

function withConfiguredAnticipation(fees: AsaasFees): AsaasFees {
  const detached = configuredRate(ENV.ASAAS_ANTICIPATION_DETACHED_MONTHLY_RATE)
  const installment = configuredRate(ENV.ASAAS_ANTICIPATION_INSTALLMENT_MONTHLY_RATE)
  if (detached === null && installment === null) return fees

  return {
    ...fees,
    anticipation: {
      detachedMonthlyRate: detached ?? fees.anticipation.detachedMonthlyRate,
      installmentMonthlyRate: installment ?? fees.anticipation.installmentMonthlyRate,
    },
  }
}

export async function getAsaasFees(): Promise<AsaasFees> {
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return withConfiguredAnticipation(cached.fees)
  }

  try {
    const { payment, anticipation } = await getAsaasAccountFees()
    const { creditCard, pix } = payment
    // Asaas ships the negotiated percentages alongside the plain ones and a
    // flag saying whether they apply today. Reading the discounted pair
    // unconditionally would overcharge the participant once it lapses.
    const discounted = creditCard.hasValidDiscount === true

    const fees: AsaasFees = {
      pix: {
        fixed: reaisToCents(pix.fixedFeeValue),
        percent: percentToFraction(pix.percentageFee),
      },
      card: {
        fixed: reaisToCents(creditCard.operationValue),
        percentOneInstallment: percentToFraction(
          discounted
            ? (creditCard.discountOneInstallmentPercentage ??
              creditCard.oneInstallmentPercentage)
            : creditCard.oneInstallmentPercentage,
        ),
        percentUpToSix: percentToFraction(
          discounted
            ? (creditCard.discountUpToSixInstallmentsPercentage ??
              creditCard.upToSixInstallmentsPercentage)
            : creditCard.upToSixInstallmentsPercentage,
        ),
      },
      anticipation: {
        detachedMonthlyRate:
          percentToFraction(anticipation?.creditCard?.detachedMonthlyFeeValue) ||
          FALLBACK_FEES.anticipation.detachedMonthlyRate,
        installmentMonthlyRate:
          percentToFraction(anticipation?.creditCard?.installmentMonthlyFeeValue) ||
          FALLBACK_FEES.anticipation.installmentMonthlyRate,
      },
    }

    cached = { fees, fetchedAt: Date.now() }
    return withConfiguredAnticipation(fees)
  } catch (error) {
    logger.error("Could not read the Asaas account fees, using the list prices", {
      error: error instanceof Error ? error.message : String(error),
    })
    return withConfiguredAnticipation(FALLBACK_FEES)
  }
}
