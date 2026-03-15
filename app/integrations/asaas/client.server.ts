import { timingSafeEqual } from "node:crypto"
import { env } from "~/env.server"
import { ASAAS_API_URLS, ASAAS_REQUIRED_HEADERS } from "./constants"
import type {
  AsaasCustomer,
  AsaasListResponse,
  AsaasPayment,
  CreateAsaasCustomerParams,
  CreatePaymentChargeParams,
  RefundAsaasPaymentParams,
} from "./types"

async function throwAsaasError(response: Response, action: string): Promise<never> {
  const errorBody = await response.text().catch(() => "Unable to read error body")
  throw new Error(
    `Failed to ${action}: ${response.status} ${response.statusText}. Response: ${errorBody}`
  )
}

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
  const billingType = params.paymentMethod === "pix" ? "PIX" : "CREDIT_CARD"
  const valueInReais = params.amount / 100

  const body: Record<string, unknown> = {
    customer: params.customer,
    billingType,
    value: valueInReais,
    dueDate: params.dueDate,
    description: params.description,
    externalReference: params.externalReference,
    callback: params.callback,
    ...(params.installments && params.installments > 1
      ? { installmentCount: params.installments, totalValue: valueInReais }
      : {}),
  }

  const response = await fetch(`${baseUrl}/payments`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  })

  if (!response.ok) {
    await throwAsaasError(response, `create ${params.paymentMethod} charge`)
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
    await throwAsaasError(response, "get payment status")
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
    await throwAsaasError(response, "refund payment")
  }

  return (await response.json()) as AsaasPayment
}

export async function deletePayment(paymentId: string): Promise<void> {
  const { baseUrl, headers } = getAsaasConfig()

  const response = await fetch(`${baseUrl}/payments/${paymentId}`, {
    method: "DELETE",
    headers,
    signal: AbortSignal.timeout(15_000),
  })

  if (!response.ok) {
    await throwAsaasError(response, "delete payment")
  }
}

export function verifyWebhookSignature(token: string): boolean {
  const { asaasWebhookToken } = env()
  if (!asaasWebhookToken || !token) return false
  const a = Buffer.from(token)
  const b = Buffer.from(asaasWebhookToken)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
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
      await throwAsaasError(searchResponse, "search for customer")
    }

    const searchResult = (await searchResponse.json()) as AsaasListResponse<AsaasCustomer>
    const activeCustomer = searchResult.data.find((c) => !c.deleted)
    if (activeCustomer) {
      return activeCustomer
    }
  }

  const createResponse = await fetch(`${baseUrl}/customers`, {
    method: "POST",
    headers,
    body: JSON.stringify(params),
    signal: AbortSignal.timeout(15_000),
  })

  if (!createResponse.ok) {
    await throwAsaasError(createResponse, "create customer")
  }

  return (await createResponse.json()) as AsaasCustomer
}
