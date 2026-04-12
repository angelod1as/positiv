import { z } from "zod"
import { env } from "~/env.server"

function getAsaasConfig() {
  const { asaasApiKey, asaasApiUrl } = env()
  if (!asaasApiKey || !asaasApiUrl) {
    throw new Error(
      "Missing ASAAS_API_KEY or ASAAS_API_URL environment variables",
    )
  }
  return { apiKey: asaasApiKey, apiUrl: asaasApiUrl }
}

const asaasCustomerResponseSchema = z.object({
  id: z.string(),
})

const asaasPaymentResponseSchema = z.object({
  id: z.string(),
  invoiceUrl: z.string(),
})

const ASAAS_FETCH_TIMEOUT_MS = 30_000

async function asaasFetch<T>(
  path: string,
  body: Record<string, unknown>,
  schema: z.ZodType<T>,
  method: "POST" | "GET" | "DELETE" = "POST",
): Promise<T> {
  const { apiKey, apiUrl } = getAsaasConfig()

  const controller = new AbortController()
  const timeout = setTimeout(
    () => controller.abort(new Error("Asaas request timeout")),
    ASAAS_FETCH_TIMEOUT_MS,
  )

  try {
    const hasBody = method !== "GET" && method !== "DELETE"
    const response = await fetch(`${apiUrl}${path}`, {
      method,
      signal: controller.signal,
      headers: {
        access_token: apiKey,
        ...(hasBody && { "Content-Type": "application/json" }),
      },
      ...(hasBody && { body: JSON.stringify(body) }),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      throw new Error(`Asaas API error (${response.status}): ${errorBody}`)
    }

    const json = await response.json()
    return schema.parse(json)
  } finally {
    clearTimeout(timeout)
  }
}

export async function createAsaasCustomer({
  name,
  cpfCnpj,
  email,
  phone,
}: {
  name: string
  cpfCnpj: string
  email?: string
  phone?: string
}): Promise<{ id: string }> {
  const body: Record<string, unknown> = { name, cpfCnpj }
  if (email) body.email = email
  if (phone) body.mobilePhone = phone
  return asaasFetch("/customers", body, asaasCustomerResponseSchema)
}

export async function createAsaasPayment({
  customerId,
  billingType,
  value,
  dueDate,
  description,
  installmentCount,
}: {
  customerId: string
  billingType: "PIX" | "CREDIT_CARD"
  value: number
  dueDate: string
  description?: string
  installmentCount?: number
}): Promise<{ id: string; invoiceUrl: string }> {
  const body: Record<string, unknown> = {
    customer: customerId,
    billingType,
    value,
    dueDate,
    description,
  }

  if (
    billingType === "CREDIT_CARD" &&
    installmentCount &&
    installmentCount > 1
  ) {
    body.installmentCount = installmentCount
  }

  return asaasFetch("/payments", body, asaasPaymentResponseSchema)
}

export async function refundAsaasPayment(
  paymentId: string,
  value?: number,
): Promise<void> {
  const body: Record<string, unknown> = {}
  if (value !== undefined) {
    body.value = value
  }
  await asaasFetch(
    `/payments/${paymentId}/refund`,
    body,
    z.object({ id: z.string() }),
  )
}

export async function cancelAsaasPayment(paymentId: string): Promise<void> {
  const result = await asaasFetch(
    `/payments/${paymentId}`,
    {},
    z.object({ deleted: z.boolean(), id: z.string() }),
    "DELETE",
  )
  // Asaas returns HTTP 200 with `{ deleted: false }` when the payment cannot
  // be deleted (e.g. already paid). Treat this as a failure — otherwise we
  // silently claim "cancelled" while the charge is still alive on Asaas.
  if (!result.deleted) {
    throw new Error(
      `Asaas refused to delete payment ${paymentId} (deleted=false)`,
    )
  }
}
