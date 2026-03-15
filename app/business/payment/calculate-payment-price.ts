export const BASE_PRICE = 22_000

export const ASAAS_FEES = {
  pix: { rate: 0, fixed: 0 },
  cc_1x: { rate: 0.0299, fixed: 49 },
  cc_2_6x: { rate: 0.0349, fixed: 49 },
} as const

export const MAX_INSTALLMENTS = 6

type PaymentMethod = "pix" | "credit_card"

interface PaymentPrice {
  totalAmount: number
  installmentValue: number
}

function getFee(method: PaymentMethod, installments: number) {
  if (method === "pix") return ASAAS_FEES.pix
  if (installments === 1) return ASAAS_FEES.cc_1x
  return ASAAS_FEES.cc_2_6x
}

export function calculatePaymentPrice(
  method: PaymentMethod,
  installments: number,
): PaymentPrice {
  if (installments < 1 || installments > MAX_INSTALLMENTS) {
    throw new Error(
      `Installments must be between 1 and ${MAX_INSTALLMENTS}, got ${installments}`,
    )
  }

  if (method === "pix" && installments > 1) {
    throw new Error("Pix payments do not support installments")
  }

  const fee = getFee(method, installments)
  const totalAmount = Math.ceil(BASE_PRICE * (1 + fee.rate) + fee.fixed)
  const installmentValue = Math.ceil(totalAmount / installments)

  return { totalAmount, installmentValue }
}
