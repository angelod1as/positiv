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
    ...(installmentCount !== undefined && { installmentCount, totalValue: amount }),
  }

  const response = await fetch(`${baseUrl}/payments`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  })

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "Unable to read error body")
    throw new Error(
      `Failed to create ${params.paymentMethod} charge: ${response.status} ${response.statusText}. Response: ${errorBody}`
    )
  }

  return (await response.json()) as AsaasPayment
}
