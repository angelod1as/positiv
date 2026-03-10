import { env } from "~/env.server"
import { ASAAS_API_URLS, ASAAS_REQUIRED_HEADERS, PAYMENT_METHOD_CONFIG } from "./constants"
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
  const { billingType, amount, installmentCount } = PAYMENT_METHOD_CONFIG[params.paymentMethod]

  const body: Record<string, unknown> = {
    customer: params.customer,
    billingType,
    value: amount,
    dueDate: params.dueDate,
    description: params.description,
    externalReference: params.externalReference,
    callback: params.callback,
    ...(installmentCount && { installmentCount, totalValue: amount }),
  }

  const response = await fetch(`${baseUrl}/payments`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  })

  return (await response.json()) as AsaasPayment
}
