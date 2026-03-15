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

async function asaasFetch<T>(
  path: string,
  body: Record<string, unknown>,
): Promise<T> {
  const { apiKey, apiUrl } = getAsaasConfig()

  const response = await fetch(`${apiUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      access_token: apiKey,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`Asaas API error (${response.status}): ${errorBody}`)
  }

  return response.json() as Promise<T>
}

export async function createAsaasCustomer({
  name,
  cpfCnpj,
}: {
  name: string
  cpfCnpj: string
}): Promise<{ id: string }> {
  return asaasFetch("/customers", { name, cpfCnpj })
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
    body.installmentValue = Number((value / installmentCount).toFixed(2))
  }

  return asaasFetch("/payments", body)
}
