import { env } from "~/env.server"
import { ASAAS_API_URLS, ASAAS_REQUIRED_HEADERS, PAYMENT_METHOD_CONFIG } from "./constants"
import type {
  AsaasCustomer,
  AsaasListResponse,
  AsaasPayment,
  CreateAsaasCustomerParams,
  CreatePaymentChargeParams,
  RefundAsaasPaymentParams,
} from "./types"

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

export async function getPaymentStatus(paymentId: string): Promise<AsaasPayment> {
  const { baseUrl, headers } = getAsaasConfig()

  const response = await fetch(`${baseUrl}/payments/${paymentId}`, {
    method: "GET",
    headers,
    signal: AbortSignal.timeout(15_000),
  })

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "Unable to read error body")
    throw new Error(
      `Failed to get payment status: ${response.status} ${response.statusText}. Response: ${errorBody}`
    )
  }

  return (await response.json()) as AsaasPayment
}

export async function refundPayment(
  paymentId: string,
  params: RefundAsaasPaymentParams
): Promise<AsaasPayment> {
  const { baseUrl, headers } = getAsaasConfig()

  const response = await fetch(`${baseUrl}/payments/${paymentId}/refund`, {
    method: "POST",
    headers,
    body: JSON.stringify(params),
    signal: AbortSignal.timeout(15_000),
  })

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "Unable to read error body")
    throw new Error(
      `Failed to refund payment: ${response.status} ${response.statusText}. Response: ${errorBody}`
    )
  }

  return (await response.json()) as AsaasPayment
}

export function verifyWebhookSignature(token: string): boolean {
  const { asaasWebhookToken } = env()
  if (!asaasWebhookToken || !token) return false
  return token === asaasWebhookToken
}

export async function getOrCreateAsaasCustomer(
  params: CreateAsaasCustomerParams
): Promise<AsaasCustomer> {
  const { baseUrl, headers } = getAsaasConfig()

  if (params.email) {
    const searchResponse = await fetch(
      `${baseUrl}/customers?email=${encodeURIComponent(params.email)}`,
      {
        method: "GET",
        headers,
        signal: AbortSignal.timeout(15_000),
      }
    )

    if (!searchResponse.ok) {
      const errorBody = await searchResponse.text().catch(() => "Unable to read error body")
      throw new Error(
        `Failed to search for customer: ${searchResponse.status} ${searchResponse.statusText}. Response: ${errorBody}`
      )
    }

    const searchResult = (await searchResponse.json()) as AsaasListResponse<AsaasCustomer>
    if (searchResult.data.length > 0) {
      return searchResult.data[0]
    }
  }

  const createResponse = await fetch(`${baseUrl}/customers`, {
    method: "POST",
    headers,
    body: JSON.stringify(params),
    signal: AbortSignal.timeout(15_000),
  })

  if (!createResponse.ok) {
    const errorBody = await createResponse.text().catch(() => "Unable to read error body")
    throw new Error(
      `Failed to create customer: ${createResponse.status} ${createResponse.statusText}. Response: ${errorBody}`
    )
  }

  return (await createResponse.json()) as AsaasCustomer
}
