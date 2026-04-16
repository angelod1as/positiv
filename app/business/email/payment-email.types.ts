export type PaymentOption = {
  value: string
  billingType: "PIX" | "CREDIT_CARD"
  installments: number
  totalReais: number
  perInstallmentReais: number
}
