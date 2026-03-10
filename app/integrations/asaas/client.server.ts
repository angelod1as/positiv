import { env } from "~/env.server"
import { ASAAS_API_URLS, ASAAS_REQUIRED_HEADERS, PAYMENT_PRICING } from "./constants"
import type { AsaasPayment, CreatePaymentChargeParams } from "./types"

export function getAsaasConfig() {
  const { asaasApiKey, asaasEnvironment } = env()

  if (!asaasApiKey) {
    throw new Error("Asaas API key not configured")
  }

  return {
    baseUrl: ASAAS_API_URLS[asaasEnvironment],
    headers: {
      ...ASAAS_REQUIRED_HEADERS,
      access_token: asaasApiKey,
    },
  }
}

export async function createPaymentCharge(
  params: CreatePaymentChargeParams
): Promise<AsaasPayment> {
  const { baseUrl, headers } = getAsaasConfig()

  const isPix = params.paymentMethod === "pix"
  const billingType = isPix ? "PIX" : "CREDIT_CARD"
  const value = isPix ? PAYMENT_PRICING.pix.amount : PAYMENT_PRICING.creditCard.amount

  const body: Record<string, unknown> = {
    customer: params.customer,
    billingType,
    value,
    dueDate: params.dueDate,
    description: params.description,
    externalReference: params.externalReference,
    callback: params.callback,
  }

  if (!isPix) {
    body.installmentCount = PAYMENT_PRICING.creditCard.maxInstallments
    body.totalValue = value
  }

  const response = await fetch(`${baseUrl}/payments`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  })

  return (await response.json()) as AsaasPayment
}
