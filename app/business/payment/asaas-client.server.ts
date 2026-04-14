import { env } from "~/env.server"
import { logger } from "~/lib/logger/logger.server"

// Defensive PII truncation on the Asaas error body we log (can carry CPF,
// email, phone).
const MAX_ERROR_BODY_LOG_CHARS = 500

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

// Scaffold-grade fetch wrapper. AbortController/timeout, retry on 429/5xx,
// and Zod response validation are deferred to PR #3 (see
// `docs/payment-system-architecture.md` §8). Do NOT use this client from a
// route until that PR lands.
async function asaasFetch<T>(
  path: string,
  body: Record<string, unknown>,
): Promise<T> {
  const { apiKey, apiUrl } = getAsaasConfig()

  const response = await fetch(`${apiUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // `access_token` (lowercase, underscore) is the header name the Asaas
      // API expects — non-standard but documented at https://docs.asaas.com
      // (auth section). Don't change the casing without re-checking.
      access_token: apiKey,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    // Asaas error bodies can carry PII. Don't interpolate the raw body into
    // `Error.message` — the app's `handleApiError` serializes message into
    // outward-facing JSON responses. Log the body server-side only.
    const errorBody = await response.text().catch(() => "<unreadable>")
    logger.error("Asaas API request failed", {
      path,
      status: response.status,
      body: errorBody.slice(0, MAX_ERROR_BODY_LOG_CHARS),
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

// `invoiceUrl` is nullable because Asaas surfaces the payable artifact
// differently per billing type (PIX uses `pixQrCodeUrl` on another endpoint).
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
}): Promise<{ id: string; invoiceUrl: string | null }> {
  // Installments deferred to PR #6 (see payment-pricing.server.ts). Fail
  // loudly rather than silently creating a single-payment charge.
  if (installmentCount !== undefined && installmentCount > 1) {
    throw new Error(
      "createAsaasPayment: installmentCount > 1 is not yet implemented. " +
        "See docs/payment-system-architecture.md §8 PR #6.",
    )
  }

  const body: Record<string, unknown> = {
    customer: customerId,
    billingType,
    value,
    dueDate,
    ...(description !== undefined ? { description } : {}),
    // PR #6 will add `installmentCount` (and `installmentValue`/`totalValue`
    // per current Asaas docs) here — the throw above must be lifted in sync.
  }

  return asaasFetch("/payments", body)
}
