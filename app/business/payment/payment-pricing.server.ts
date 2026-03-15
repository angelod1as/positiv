interface InstallmentFeeConfig {
  percentFee: number
  fixedFeeCents: number
  monthlyAnticipationRate: number
}

const ASAAS_FEE_CONFIG: Record<string, InstallmentFeeConfig> = {
  "1": {
    percentFee: 0.0299,
    fixedFeeCents: 49,
    monthlyAnticipationRate: 0.0115,
  },
  "2-6": {
    percentFee: 0.0349,
    fixedFeeCents: 49,
    monthlyAnticipationRate: 0.016,
  },
}

function getFeeConfig(installments: number): InstallmentFeeConfig {
  if (installments === 1) return ASAAS_FEE_CONFIG["1"]
  if (installments <= 6) return ASAAS_FEE_CONFIG["2-6"]
  throw new Error(`Unsupported installment count: ${installments}`)
}

export function calculateChargeAmount(
  ticketPriceCents: number,
  installments: number,
): number {
  const { percentFee, fixedFeeCents, monthlyAnticipationRate } =
    getFeeConfig(installments)
  const anticipationFactor = 1 - monthlyAnticipationRate * installments
  const grossCents =
    (ticketPriceCents / anticipationFactor + fixedFeeCents) / (1 - percentFee)
  return Math.ceil(grossCents)
}

export function calculateInstallmentValue(
  ticketPriceCents: number,
  installments: number,
): number {
  const totalCents = calculateChargeAmount(ticketPriceCents, installments)
  return Math.ceil(totalCents / installments)
}

export type PaymentOption = {
  value: string
  billingType: "PIX" | "CREDIT_CARD"
  installments: number
  totalCents: number
  perInstallmentCents: number
}

export const MAX_INSTALLMENTS = 4

export function buildPaymentOptions(ticketPriceCents: number): PaymentOption[] {
  const options: PaymentOption[] = [
    {
      value: "PIX",
      billingType: "PIX",
      installments: 1,
      totalCents: ticketPriceCents,
      perInstallmentCents: ticketPriceCents,
    },
  ]

  for (let i = 1; i <= MAX_INSTALLMENTS; i++) {
    const perInstallmentCents = calculateInstallmentValue(ticketPriceCents, i)
    const totalCents = perInstallmentCents * i

    options.push({
      value: `CC_${i}`,
      billingType: "CREDIT_CARD",
      installments: i,
      totalCents,
      perInstallmentCents,
    })
  }

  return options
}
