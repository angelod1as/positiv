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
  // Renamed via destructure to silence the "unused variable" check without
  // changing the public API — callers still pass `{ installmentCount: N }`.
  // The value is intentionally ignored in this scaffold; see the comment
  // block below for why.
  installmentCount: _installmentCount,
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

  // Note: installment payload deliberately disabled for now.
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
  //   _installmentCount &&
  //   _installmentCount > 1
  // ) {
  //   body.installmentCount = _installmentCount
  //   body.installmentValue = Number((value / _installmentCount).toFixed(2))
  // }

  return asaasFetch("/payments", body)
}
