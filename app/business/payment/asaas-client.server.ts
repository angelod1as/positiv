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

// Note: this is a scaffold-grade fetch wrapper. AbortController/timeout, retry
// on 429/5xx, and Zod response validation are deferred to the PR that
// introduces production-grade error handling for the Asaas client (see
// `docs/payment-system-architecture.md` §8, PR #3). Do NOT use this client
// from a route until that PR lands.
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
      // API expects — non-standard vs. typical `Authorization: Bearer`, but
      // documented at https://docs.asaas.com (auth section). Don't change
      // the casing without re-checking the Asaas docs.
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
  // Installments are not implemented in this scaffold. The correct design
  // computes per-installment values in integer cents (distributing the
  // remainder across installments so the total matches `value` exactly)
  // and lives in `payment-pricing.server.ts` — see
  // `docs/payment-system-architecture.md` §8 PR #6.
  //
  // Fail loudly rather than silently creating a single-payment charge when
  // a caller genuinely wants installments: better a hard error now than a
  // miscarried payment in production.
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
    // Only include description when actually provided (avoids `undefined`
    // in the JSON-stringified body — explicit intent for payment payloads).
    ...(description !== undefined ? { description } : {}),
    // Note: when PR #6 enables installments > 1, the implementation will
    // add `installmentCount` (and likely `installmentValue` or `totalValue`
    // — check Asaas docs for the current required pairing) to this body.
    // The throw above intentionally blocks that path in the scaffold, so
    // the body construction and the throw must be kept in sync when PR #6
    // lands.
  }

  return asaasFetch("/payments", body)
}
