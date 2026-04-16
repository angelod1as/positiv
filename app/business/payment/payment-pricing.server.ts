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
  if (installments >= 2 && installments <= 6) return ASAAS_FEE_CONFIG["2-6"]
  throw new Error(`Unsupported installment count: ${installments}`)
}

export function calculateChargeAmount(
  ticketPrice: number,
  installments: number,
): number {
  const ticketPriceCents = Math.round(ticketPrice * 100)
  const { percentFee, fixedFeeCents, monthlyAnticipationRate } =
    getFeeConfig(installments)
  const anticipationFactor = 1 - monthlyAnticipationRate * installments
  const grossCents =
    (ticketPriceCents / anticipationFactor + fixedFeeCents) / (1 - percentFee)
  return Math.ceil(grossCents) / 100
}

export function calculateInstallmentValue(
  ticketPrice: number,
  installments: number,
): number {
  const totalReais = calculateChargeAmount(ticketPrice, installments)
  const totalCents = Math.round(totalReais * 100)
  return Math.ceil(totalCents / installments) / 100
}

export type PaymentOption = {
  value: string
  billingType: "PIX" | "CREDIT_CARD"
  installments: number
  totalReais: number
  perInstallmentReais: number
}

export const MAX_INSTALLMENTS = 4

export function buildPaymentOptions(ticketPrice: number): PaymentOption[] {
  const options: PaymentOption[] = [
    {
      value: "PIX",
      billingType: "PIX",
      installments: 1,
      totalReais: ticketPrice,
      perInstallmentReais: ticketPrice,
    },
  ]

  for (let i = 1; i <= MAX_INSTALLMENTS; i++) {
    const perInstallmentReais = calculateInstallmentValue(ticketPrice, i)
    // totalReais is derived from the rounded-up per-installment value × count,
    // NOT directly from calculateChargeAmount. This can be 1-2 centavos higher
    // than the Asaas charge — intentional, so the displayed total matches
    // what the participant actually pays across installments.
    const totalReais =
      Math.round(perInstallmentReais * i * 100) / 100

    options.push({
      value: `CC_${i}`,
      billingType: "CREDIT_CARD",
      installments: i,
      totalReais,
      perInstallmentReais,
    })
  }

  return options
}
