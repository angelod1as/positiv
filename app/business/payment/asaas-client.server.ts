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

async function asaasFetch<T>(
  path: string,
  body: Record<string, unknown>,
  schema: z.ZodType<T>,
  method: "POST" | "GET" = "POST",
): Promise<T> {
  const { apiKey, apiUrl } = getAsaasConfig()

  const response = await fetch(`${apiUrl}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      access_token: apiKey,
    },
    ...(method !== "GET" && { body: JSON.stringify(body) }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`Asaas API error (${response.status}): ${errorBody}`)
  }

  const json = await response.json()
  return schema.parse(json)
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
