import { env } from "~/env.server"
import { logger } from "~/lib/logger/logger.server"

function getAsaasConfig() {
  const { asaasApiKey, asaasApiUrl } = env()
  if (!asaasApiKey || !asaasApiUrl) {
    throw new Error(
      "Missing ASAAS_API_KEY or ASAAS_API_URL environment variables",
    )
  }
  // Strip trailing slashes so callers can pass either
  // `https://sandbox.asaas.com/api/v3` or `.../v3/` without producing
  // double-slash request URLs.
  const normalizedUrl = asaasApiUrl.replace(/\/+$/, "")
  return { apiKey: asaasApiKey, apiUrl: normalizedUrl }
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
    // Asaas error bodies can carry PII (CPF, email, phone). Don't put the
    // raw body in the thrown Error.message — handleApiError() in this
    // codebase serializes message into JSON responses and logs, which would
    // leak that data outward. Log the body server-side only.
    const errorBody = await response.text().catch(() => "<unreadable>")
    logger.error("Asaas API request failed", {
      path,
      status: response.status,
      body: errorBody.slice(0, 500),
    })
    throw new Error(`Asaas API error (${response.status})`)
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
    // Only include description when actually provided (avoids `undefined`
    // in the JSON-stringified body — explicit intent for payment payloads).
    ...(description !== undefined ? { description } : {}),
  }

  // NOTE: installment payload deliberately disabled for now.
  //
  // The naive `installmentValue = value / installmentCount` (rounded to
  // 2 decimals) creates totals that don't match `value` for many inputs
  // (e.g. 100/3 → 33.33 → 33.33*3 = 99.99). The correct implementation
  // distributes cents across installments and matches the total exactly,
  // and lives in `payment-pricing.server.ts` (introduced in a later PR;
  // see `docs/payment-system-architecture.md` §8 PR #6).
  //
  // Once payment-pricing is in place, callers will compute the correct
  // installmentValue (or just rely on Asaas to derive it from
  // installmentCount + value) and we'll re-enable the block below — or
  // remove it entirely if the final design omits installmentValue.
  //
  // if (
  //   billingType === "CREDIT_CARD" &&
  //   installmentCount &&
  //   installmentCount > 1
  // ) {
  //   body.installmentCount = installmentCount
  //   body.installmentValue = Number((value / installmentCount).toFixed(2))
  // }
  void installmentCount

  return asaasFetch("/payments", body)
}
