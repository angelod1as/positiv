import type {
  AsaasBillingType,
  AsaasEnvironment,
  AsaasWebhookEvent,
  PaymentMethod,
  PaymentTransactionStatus,
} from "./types"

export const ASAAS_API_URLS: Record<AsaasEnvironment, string> = {
  sandbox: "https://api-sandbox.asaas.com/v3",
  production: "https://api.asaas.com/v3",
}

export const ASAAS_REQUIRED_HEADERS = {
  "Content-Type": "application/json",
} as const

export const PAYMENT_PRICING = {
  pix: { amount: 22_000 },
  creditCard: { amount: 22_700, maxInstallments: 6 },
} as const

export function formatCentavos(centavos: number): string {
  return (centavos / 100).toFixed(2).replace(".", ",")
}

export const PAYMENT_METHOD_CONFIG: Record<
  PaymentMethod,
  {
    billingType: AsaasBillingType
    amount: number
    installmentCount?: number
  }
> = {
  pix: {
    billingType: "PIX",
    amount: PAYMENT_PRICING.pix.amount,
  },
  credit_card: {
    billingType: "CREDIT_CARD",
    amount: PAYMENT_PRICING.creditCard.amount,
    installmentCount: PAYMENT_PRICING.creditCard.maxInstallments,
  },
}

export const PAYMENT_LINK_EXPIRY_HOURS = 48

export const HANDLED_WEBHOOK_EVENTS: readonly AsaasWebhookEvent[] = [
  "PAYMENT_CONFIRMED",
  "PAYMENT_RECEIVED",
  "PAYMENT_REFUNDED",
  "PAYMENT_OVERDUE",
  "PAYMENT_CREDIT_CARD_CAPTURE_REFUSED",
] as const

export const BILLING_TYPE_TO_PAYMENT_METHOD: Partial<
  Record<AsaasBillingType, PaymentMethod>
> = {
  PIX: "pix",
  CREDIT_CARD: "credit_card",
}

export const WEBHOOK_EVENT_TO_TRANSACTION_STATUS: Partial<
  Record<AsaasWebhookEvent, PaymentTransactionStatus>
> = {
  PAYMENT_CONFIRMED: "confirmed",
  PAYMENT_RECEIVED: "confirmed",
  PAYMENT_REFUNDED: "refunded",
  PAYMENT_OVERDUE: "failed",
  PAYMENT_CREDIT_CARD_CAPTURE_REFUSED: "failed",
}
