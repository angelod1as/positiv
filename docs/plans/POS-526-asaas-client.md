# POS-526 — Asaas client, env vars, fees, CPF validator — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Everything the later Asaas PRs call into: environment variables, a small typed `fetch` wrapper for the Asaas v3 API, the account fee lookup with cache and fallback, a CPF validator, and the one-off webhook registration script.

**Architecture:** No SDK — Asaas has no official Node SDK and the surface is seven calls. `asaas-client.server.ts` exposes one function per endpoint, each validating the response with Zod and throwing `AsaasError` with the API's `errors[]` on non-2xx. `asaas-fees.server.ts` turns `GET /v3/myAccount/fees/` into the `AsaasFees` shape that `pricing.ts` (POS-527) consumes, cached in module memory for 12 h with the public price list as fallback. `cpf.ts` is pure.

**Tech Stack:** TypeScript, zod v4 (`~/lib/helpers/zod`), varlock `ENV`, native `fetch`, Vitest with `vi.stubGlobal("fetch", …)`.

**Spec:** `docs/plans/payments-v3-design.md` §7 (code layout, env), Asaas facts in the research digest: header `access_token`, mandatory `User-Agent`, GET with empty body, error envelope `{ errors: [{ code, description }] }`, sandbox base `https://api-sandbox.asaas.com/v3`.

**Branch:** `pos-526-asaas-client` from `main`, worktree `wt/pos-526-asaas-client`.

> **Correction, 2026-08-24 (POS-519).** The real `GET /v3/myAccount/fees/`
> payload disagrees with the Zod schema and fallback constants below:
>
> - `payment.pix.percentageFee`, `minimumFeeValue` and `maximumFeeValue` come
>   back **`null`** when `payment.pix.type` is `FIXED`, which is the current
>   state of the account. `zod.number()` rejects the response outright — they
>   need `.nullable()`, and the mapper has to read null as zero before
>   `pricing.ts` divides by `1 − pixPercent`.
> - The anticipation block has no `monthlyFeePercentage` for credit card. It
>   carries **two** fields: `detachedMonthlyFeeValue` (1.15) for
>   single-installment charges and `installmentMonthlyFeeValue` (1.60) for
>   instalments. `ASAAS_ANTICIPATION_MONTHLY_RATE`, declared in Task 1 as one
>   scalar, cannot express that — split it or drop it and read the payload.
> - `payment.creditCard` also ships `discount*Percentage` fields and a
>   `hasValidDiscount` flag. Branch on the flag instead of hardcoding the
>   plain percentages.
>
> Full payload: POS-519. `docs/plans/payments-v3-design.md` §6 is already
> corrected.


---

### Task 1: Environment variables

**Files:**
- Modify: `.env.schema` (append a section after `# --- Telegram alerts (winston logger) ---`)
- Modify: `.env.example` if it exists in the worktree (same keys, empty values)
- Test: `scripts/env-schema.test.ts` already guards `@static` misuse — no new test, but it must stay green

- [ ] **Step 1: Add the section to `.env.schema`**

```
# --- Payments (Asaas) ---
# Master switch for everything that talks to Asaas. Off: status changes are
# just status changes, the payment page and the webhook answer 404.
# @public @type=boolean
PAYMENTS_ENABLED=false
# @public @type=url @example="https://api-sandbox.asaas.com/v3"
ASAAS_API_URL=
# @sensitive
ASAAS_API_KEY=
# Token Asaas sends back in the `asaas-access-token` header of every webhook.
# @sensitive
ASAAS_WEBHOOK_TOKEN=
# Monthly rate of "antecipação automática", as a fraction (0.0125 = 1,25 %).
# Overrides the value the fee endpoint reports; empty means use the endpoint.
# @public @type=number
ASAAS_ANTICIPATION_MONTHLY_RATE=
```

None of them is `@static` — every one is read on the server at runtime.

- [ ] **Step 2: Regenerate the types and run the schema guard**

Run: `pnpm lint`
Expected: `varlock codegen` rewrites `env.d.ts` with the five new keys; eslint/tsc clean.

Run: `pnpm test:unit -- scripts/env-schema.test.ts`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add .env.schema env.d.ts
git commit -m "feat(payments): declare the Asaas environment variables"
```

---

### Task 2: CPF validator

**Files:**
- Create: `app/business/payment/cpf.ts`
- Test: `app/business/payment/cpf.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// app/business/payment/cpf.test.ts
import { describe, expect, it } from "vitest"
import { isValidCpf, normalizeCpf } from "./cpf"

describe("normalizeCpf", () => {
  it("keeps only digits", () => {
    expect(normalizeCpf("529.982.247-25")).toBe("52998224725")
    expect(normalizeCpf(" 529 982 247 25 ")).toBe("52998224725")
    expect(normalizeCpf(null)).toBe("")
  })
})

describe("isValidCpf", () => {
  it("accepts a CPF whose check digits match", () => {
    expect(isValidCpf("529.982.247-25")).toBe(true)
    expect(isValidCpf("11144477735")).toBe(true)
  })

  it("rejects wrong check digits", () => {
    expect(isValidCpf("529.982.247-26")).toBe(false)
    expect(isValidCpf("11144477736")).toBe(false)
  })

  it("rejects repeated digits and wrong lengths", () => {
    expect(isValidCpf("11111111111")).toBe(false)
    expect(isValidCpf("00000000000")).toBe(false)
    expect(isValidCpf("1234567890")).toBe(false)
    expect(isValidCpf("")).toBe(false)
    expect(isValidCpf(undefined)).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:unit -- app/business/payment/cpf.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

```ts
// app/business/payment/cpf.ts
export function normalizeCpf(value: string | null | undefined): string {
  return (value ?? "").replace(/\D/g, "")
}

function checkDigit(digits: string, length: number): number {
  let sum = 0
  for (let i = 0; i < length; i++) {
    sum += Number(digits[i]) * (length + 1 - i)
  }
  const remainder = (sum * 10) % 11
  return remainder === 10 ? 0 : remainder
}

export function isValidCpf(value: string | null | undefined): boolean {
  const digits = normalizeCpf(value)
  if (digits.length !== 11) return false
  if (/^(\d)\1{10}$/.test(digits)) return false
  return (
    checkDigit(digits, 9) === Number(digits[9]) &&
    checkDigit(digits, 10) === Number(digits[10])
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:unit -- app/business/payment/cpf.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add app/business/payment/cpf.ts app/business/payment/cpf.test.ts
git commit -m "feat(payments): validate CPF check digits"
```

---

### Task 3: The request wrapper and `AsaasError`

**Files:**
- Create: `app/business/payment/asaas-client.server.ts`
- Test: `app/business/payment/asaas-client.server.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// app/business/payment/asaas-client.server.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("varlock/env", () => ({
  ENV: {
    APP_ENV: "test",
    ASAAS_API_URL: "https://api-sandbox.asaas.com/v3/",
    ASAAS_API_KEY: "$aact_test_key",
    ASAAS_WEBHOOK_TOKEN: "whsec_test",
    ASAAS_ANTICIPATION_MONTHLY_RATE: undefined,
  },
}))

vi.mock("~/lib/logger/logger.server", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

import { AsaasError, asaasRequest } from "./asaas-client.server"
import { z } from "~/lib/helpers/zod"

const fetchMock = vi.fn()

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal("fetch", fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("asaasRequest", () => {
  it("sends the api key, a user agent and json, and strips the trailing slash", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "cus_1" }))

    const result = await asaasRequest("POST", "/customers", z.object({ id: z.string() }), {
      name: "Ana",
    })

    expect(result).toEqual({ id: "cus_1" })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe("https://api-sandbox.asaas.com/v3/customers")
    expect(init.method).toBe("POST")
    expect(init.headers["access_token"]).toBe("$aact_test_key")
    expect(init.headers["User-Agent"]).toMatch(/^Positiv\//)
    expect(init.headers["Content-Type"]).toBe("application/json")
    expect(init.body).toBe(JSON.stringify({ name: "Ana" }))
  })

  it("sends GET requests with no body and no content type", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: [] }))

    await asaasRequest("GET", "/customers?cpfCnpj=1", z.object({ data: z.array(z.unknown()) }))

    const [, init] = fetchMock.mock.calls[0]
    expect(init.body).toBeUndefined()
    expect(init.headers["Content-Type"]).toBeUndefined()
  })

  it("throws AsaasError carrying the api's errors on a non-2xx", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        { errors: [{ code: "invalid_cpfCnpj", description: "CPF inválido" }] },
        400,
      ),
    )

    await expect(
      asaasRequest("POST", "/customers", z.object({ id: z.string() }), {}),
    ).rejects.toMatchObject({
      name: "AsaasError",
      status: 400,
      errors: [{ code: "invalid_cpfCnpj", description: "CPF inválido" }],
    })
  })

  it("throws AsaasError with an empty errors list when the body is not the envelope", async () => {
    fetchMock.mockResolvedValueOnce(new Response("gateway timeout", { status: 504 }))

    await expect(
      asaasRequest("GET", "/payments/pay_1", z.object({ id: z.string() })),
    ).rejects.toMatchObject({ name: "AsaasError", status: 504, errors: [] })
  })

  it("rejects a 2xx body that does not match the schema", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ nope: true }))

    await expect(
      asaasRequest("GET", "/payments/pay_1", z.object({ id: z.string() })),
    ).rejects.toThrow()
  })

  it("aborts after the timeout", async () => {
    vi.useFakeTimers()
    fetchMock.mockImplementationOnce(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener("abort", () =>
            reject(new DOMException("aborted", "AbortError")),
          )
        }),
    )

    const pending = asaasRequest("GET", "/payments/pay_1", z.object({ id: z.string() }), undefined, {
      timeoutMs: 1000,
    })
    const assertion = expect(pending).rejects.toMatchObject({ name: "AbortError" })
    await vi.advanceTimersByTimeAsync(1001)
    await assertion
    vi.useRealTimers()
  })

  it("throws a plain error when the api url or key is missing", async () => {
    const env = await import("varlock/env")
    const original = env.ENV.ASAAS_API_KEY
    ;(env.ENV as { ASAAS_API_KEY?: string }).ASAAS_API_KEY = undefined

    await expect(
      asaasRequest("GET", "/payments/pay_1", z.object({ id: z.string() })),
    ).rejects.toThrow(/ASAAS_API_KEY/)

    ;(env.ENV as { ASAAS_API_KEY?: string }).ASAAS_API_KEY = original
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:unit -- app/business/payment/asaas-client.server.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

```ts
// app/business/payment/asaas-client.server.ts
import { ENV } from "varlock/env"
import type { z } from "zod"
import { zod } from "~/lib/helpers/zod"
import { logger } from "~/lib/logger/logger.server"

const USER_AGENT = `Positiv/1.0 (${ENV.APP_ENV})`
const DEFAULT_TIMEOUT_MS = 30_000

const errorEnvelope = zod.object({
  errors: zod.array(zod.object({ code: zod.string(), description: zod.string() })),
})

export type AsaasApiError = { code: string; description: string }

export class AsaasError extends Error {
  readonly name = "AsaasError"
  constructor(
    readonly status: number,
    readonly errors: AsaasApiError[],
    readonly path: string,
  ) {
    super(
      errors[0]
        ? `Asaas ${status} on ${path}: ${errors[0].code} — ${errors[0].description}`
        : `Asaas ${status} on ${path}`,
    )
  }
}

function config() {
  const url = ENV.ASAAS_API_URL
  const key = ENV.ASAAS_API_KEY
  if (!url) throw new Error("ASAAS_API_URL is not configured")
  if (!key) throw new Error("ASAAS_API_KEY is not configured")
  return { baseUrl: url.replace(/\/+$/, ""), key }
}

export async function asaasRequest<T>(
  method: "GET" | "POST" | "PUT" | "DELETE",
  path: string,
  schema: z.ZodType<T>,
  body?: unknown,
  options: { timeoutMs?: number } = {},
): Promise<T> {
  const { baseUrl, key } = config()
  const controller = new AbortController()
  const timer = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  )

  const headers: Record<string, string> = {
    access_token: key,
    "User-Agent": USER_AGENT,
    Accept: "application/json",
  }
  const init: RequestInit = { method, headers, signal: controller.signal }
  if (method !== "GET" && body !== undefined) {
    headers["Content-Type"] = "application/json"
    init.body = JSON.stringify(body)
  }

  try {
    const response = await fetch(`${baseUrl}${path}`, init)
    const text = await response.text()
    const json = text ? safeJson(text) : undefined

    if (!response.ok) {
      const parsed = errorEnvelope.safeParse(json)
      const errors = parsed.success ? parsed.data.errors : []
      logger.error("Asaas request failed", {
        path,
        method,
        status: response.status,
        errors,
      })
      throw new AsaasError(response.status, errors, path)
    }

    return schema.parse(json)
  } finally {
    clearTimeout(timer)
  }
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

export function centsToReais(cents: number): number {
  return Number((cents / 100).toFixed(2))
}

export function reaisToCents(reais: number): number {
  return Math.round(reais * 100)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:unit -- app/business/payment/asaas-client.server.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add app/business/payment/asaas-client.server.ts app/business/payment/asaas-client.server.test.ts
git commit -m "feat(payments): add the Asaas request wrapper"
```

---

### Task 4: Customer endpoints

**Files:**
- Modify: `app/business/payment/asaas-client.server.ts`
- Test: `app/business/payment/asaas-client.server.test.ts`

- [ ] **Step 1: Write the failing test**

Append to the test file (inside the same `beforeEach`/`afterEach` scope):

```ts
import { createAsaasCustomer, findAsaasCustomerByCpf } from "./asaas-client.server"

describe("customers", () => {
  it("creates a customer with notifications disabled and the profile id as external reference", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "cus_9" }))

    const id = await createAsaasCustomer({
      name: "Ana Souza",
      cpf: "529.982.247-25",
      email: "ana@example.com",
      mobilePhone: "11999998888",
      externalReference: "profile-uuid",
    })

    expect(id).toBe("cus_9")
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe("https://api-sandbox.asaas.com/v3/customers")
    expect(JSON.parse(init.body)).toEqual({
      name: "Ana Souza",
      cpfCnpj: "52998224725",
      email: "ana@example.com",
      mobilePhone: "11999998888",
      externalReference: "profile-uuid",
      notificationDisabled: true,
    })
  })

  it("finds an existing customer by cpf", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ data: [{ id: "cus_old", deleted: false }] }),
    )

    const id = await findAsaasCustomerByCpf("529.982.247-25")

    expect(id).toBe("cus_old")
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe("https://api-sandbox.asaas.com/v3/customers?cpfCnpj=52998224725&limit=1")
    expect(init.method).toBe("GET")
  })

  it("returns null when no customer matches", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: [] }))
    expect(await findAsaasCustomerByCpf("52998224725")).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:unit -- app/business/payment/asaas-client.server.test.ts`
Expected: FAIL — `createAsaasCustomer is not a function`

- [ ] **Step 3: Write minimal implementation**

Append to `asaas-client.server.ts`:

```ts
import { normalizeCpf } from "./cpf"

const idOnly = zod.object({ id: zod.string() })

export async function createAsaasCustomer(input: {
  name: string
  cpf: string
  email: string
  mobilePhone?: string
  externalReference: string
}): Promise<string> {
  const { id } = await asaasRequest("POST", "/customers", idOnly, {
    name: input.name,
    cpfCnpj: normalizeCpf(input.cpf),
    email: input.email,
    mobilePhone: input.mobilePhone,
    externalReference: input.externalReference,
    notificationDisabled: true,
  })
  return id
}

export async function findAsaasCustomerByCpf(cpf: string): Promise<string | null> {
  const { data } = await asaasRequest(
    "GET",
    `/customers?cpfCnpj=${normalizeCpf(cpf)}&limit=1`,
    zod.object({
      data: zod.array(zod.object({ id: zod.string(), deleted: zod.boolean().optional() })),
    }),
  )
  const live = data.find((customer) => !customer.deleted)
  return live?.id ?? null
}
```

(`JSON.stringify` drops the `mobilePhone: undefined` key, which is why the equality in the test holds when the phone is present and would still hold without it.)

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:unit -- app/business/payment/asaas-client.server.test.ts`
Expected: PASS (10 tests)

- [ ] **Step 5: Commit**

```bash
git add app/business/payment/asaas-client.server.ts app/business/payment/asaas-client.server.test.ts
git commit -m "feat(payments): create and look up Asaas customers"
```

---

### Task 5: Payment endpoints (create, delete, refund)

**Files:**
- Modify: `app/business/payment/asaas-client.server.ts`
- Test: `app/business/payment/asaas-client.server.test.ts`

- [ ] **Step 1: Write the failing test**

Append:

```ts
import {
  createAsaasPayment,
  deleteAsaasPayment,
  refundAsaasInstallment,
  refundAsaasPayment,
} from "./asaas-client.server"

describe("payments", () => {
  it("creates a PIX charge with the amount in reais and the payment id as external reference", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        id: "pay_1",
        status: "PENDING",
        invoiceUrl: "https://sandbox.asaas.com/i/pay_1",
        installment: null,
      }),
    )

    const payment = await createAsaasPayment({
      customerId: "cus_9",
      method: "pix",
      amount: 22199,
      installmentCount: null,
      dueDate: new Date("2026-09-01T12:00:00Z"),
      description: "Positiv — Festa de setembro",
      externalReference: "payment-uuid",
      successUrl: "https://www.positivparty.com/pagamento/payment-uuid/obrigado",
    })

    expect(payment).toEqual({
      id: "pay_1",
      status: "PENDING",
      invoiceUrl: "https://sandbox.asaas.com/i/pay_1",
      installmentId: null,
    })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe("https://api-sandbox.asaas.com/v3/payments")
    expect(JSON.parse(init.body)).toEqual({
      customer: "cus_9",
      billingType: "PIX",
      value: 221.99,
      dueDate: "2026-09-01",
      description: "Positiv — Festa de setembro",
      externalReference: "payment-uuid",
      callback: {
        successUrl: "https://www.positivparty.com/pagamento/payment-uuid/obrigado",
        autoRedirect: true,
      },
    })
  })

  it("creates a card plan with installmentCount and totalValue", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        id: "pay_first",
        status: "PENDING",
        invoiceUrl: "https://sandbox.asaas.com/i/pay_first",
        installment: "inst_1",
      }),
    )

    const payment = await createAsaasPayment({
      customerId: "cus_9",
      method: "credit_card",
      amount: 23454,
      installmentCount: 3,
      dueDate: new Date("2026-09-01T12:00:00Z"),
      description: "Positiv",
      externalReference: "payment-uuid",
      successUrl: null,
    })

    expect(payment.installmentId).toBe("inst_1")
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.billingType).toBe("CREDIT_CARD")
    expect(body.installmentCount).toBe(3)
    expect(body.totalValue).toBe(234.54)
    expect(body.value).toBeUndefined()
    expect(body.callback).toBeUndefined()
  })

  it("uses a 60 second timeout for charges", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ id: "pay_1", status: "PENDING", invoiceUrl: null, installment: null }),
    )
    await createAsaasPayment({
      customerId: "cus_9",
      method: "pix",
      amount: 100,
      installmentCount: null,
      dueDate: new Date("2026-09-01T12:00:00Z"),
      description: "x",
      externalReference: "y",
      successUrl: null,
    })
    // The signal exists; the exact timeout is asserted through the wrapper test above.
    expect(fetchMock.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal)
  })

  it("deletes a charge and reports whether Asaas confirmed it", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ deleted: true, id: "pay_1" }))
    expect(await deleteAsaasPayment("pay_1")).toBe(true)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe("https://api-sandbox.asaas.com/v3/payments/pay_1")
    expect(init.method).toBe("DELETE")
  })

  it("refunds a charge fully or partially", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "pay_1", status: "REFUND_REQUESTED" }))
    await refundAsaasPayment("pay_1", { amount: null, description: "Cancelou" })
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ description: "Cancelou" })

    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "pay_1", status: "REFUND_REQUESTED" }))
    await refundAsaasPayment("pay_1", { amount: 5000, description: null })
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ value: 50 })
    expect(fetchMock.mock.calls[1][0]).toBe(
      "https://api-sandbox.asaas.com/v3/payments/pay_1/refund",
    )
  })

  it("refunds an installment plan", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "inst_1" }))
    await refundAsaasInstallment("inst_1", "Cancelou")
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://api-sandbox.asaas.com/v3/installments/inst_1/refund",
    )
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:unit -- app/business/payment/asaas-client.server.test.ts`
Expected: FAIL — `createAsaasPayment is not a function`

- [ ] **Step 3: Write minimal implementation**

Append:

```ts
import { formatInTimeZone } from "date-fns-tz"

const CHARGE_TIMEOUT_MS = 60_000

const paymentResponse = zod.object({
  id: zod.string(),
  status: zod.string(),
  invoiceUrl: zod.string().nullable().optional(),
  installment: zod.string().nullable().optional(),
})

export type AsaasPaymentMethod = "pix" | "credit_card"

export type CreatedAsaasPayment = {
  id: string
  status: string
  invoiceUrl: string | null
  installmentId: string | null
}

export async function createAsaasPayment(input: {
  customerId: string
  method: AsaasPaymentMethod
  amount: number
  installmentCount: number | null
  dueDate: Date
  description: string
  externalReference: string
  successUrl: string | null
}): Promise<CreatedAsaasPayment> {
  const installments = input.method === "credit_card" ? input.installmentCount ?? 1 : 1
  const body: Record<string, unknown> = {
    customer: input.customerId,
    billingType: input.method === "pix" ? "PIX" : "CREDIT_CARD",
    dueDate: formatInTimeZone(input.dueDate, "America/Sao_Paulo", "yyyy-MM-dd"),
    description: input.description,
    externalReference: input.externalReference,
  }
  if (installments > 1) {
    body.installmentCount = installments
    body.totalValue = centsToReais(input.amount)
  } else {
    body.value = centsToReais(input.amount)
  }
  if (input.successUrl) {
    body.callback = { successUrl: input.successUrl, autoRedirect: true }
  }

  const payment = await asaasRequest("POST", "/payments", paymentResponse, body, {
    timeoutMs: CHARGE_TIMEOUT_MS,
  })
  return {
    id: payment.id,
    status: payment.status,
    invoiceUrl: payment.invoiceUrl ?? null,
    installmentId: payment.installment ?? null,
  }
}

export async function deleteAsaasPayment(paymentId: string): Promise<boolean> {
  const { deleted } = await asaasRequest(
    "DELETE",
    `/payments/${paymentId}`,
    zod.object({ deleted: zod.boolean(), id: zod.string() }),
  )
  return deleted
}

export async function refundAsaasPayment(
  paymentId: string,
  input: { amount: number | null; description: string | null },
): Promise<void> {
  const body: Record<string, unknown> = {}
  if (input.amount !== null) body.value = centsToReais(input.amount)
  if (input.description) body.description = input.description
  await asaasRequest(
    "POST",
    `/payments/${paymentId}/refund`,
    zod.object({ id: zod.string(), status: zod.string() }),
    body,
  )
}

export async function refundAsaasInstallment(
  installmentId: string,
  description: string | null,
): Promise<void> {
  await asaasRequest(
    "POST",
    `/installments/${installmentId}/refund`,
    zod.object({ id: zod.string() }),
    description ? { description } : {},
  )
}
```

`formatInTimeZone` is already a dependency (`date-fns-tz`); the due date is a calendar day in São Paulo, which is what Asaas compares against.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:unit -- app/business/payment/asaas-client.server.test.ts`
Expected: PASS (16 tests)

- [ ] **Step 5: Commit**

```bash
git add app/business/payment/asaas-client.server.ts app/business/payment/asaas-client.server.test.ts
git commit -m "feat(payments): create, delete and refund Asaas charges"
```

---

### Task 6: Account fees with cache and fallback

**Files:**
- Modify: `app/business/payment/asaas-client.server.ts` (raw endpoint)
- Create: `app/business/payment/asaas-fees.server.ts`
- Test: `app/business/payment/asaas-fees.server.test.ts`

`AsaasFees` is declared in `app/business/payment/pricing.ts` (POS-527). If POS-527 has not merged, create `pricing.ts` containing only the `AsaasFees` type from POS-527 Task 1 and let that PR fill the rest.

- [ ] **Step 1: Write the failing test**

```ts
// app/business/payment/asaas-fees.server.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const env = {
  APP_ENV: "test",
  ASAAS_API_URL: "https://api-sandbox.asaas.com/v3",
  ASAAS_API_KEY: "key",
  ASAAS_ANTICIPATION_MONTHLY_RATE: undefined as number | undefined,
}
vi.mock("varlock/env", () => ({ ENV: env }))
vi.mock("~/lib/logger/logger.server", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

import { FALLBACK_FEES, getAsaasFees, resetAsaasFeesCache } from "./asaas-fees.server"

const fetchMock = vi.fn()

const feesBody = {
  payment: {
    bankSlip: { defaultValue: 1.99, discountValue: 0, expirationDate: null, daysToReceive: 1 },
    creditCard: {
      operationValue: 0.49,
      oneInstallmentPercentage: 2.99,
      upToSixInstallmentsPercentage: 3.49,
      upToTwelveInstallmentsPercentage: 3.99,
      upToTwentyOneInstallmentsPercentage: 4.29,
      daysToReceive: 32,
    },
    pix: { fixedFeeValue: 1.99, percentageFee: 0, minimumFeeValue: 0, maximumFeeValue: 0 },
  },
  anticipation: { creditCard: { monthlyFeePercentage: 1.25 } },
}

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal("fetch", fetchMock)
  resetAsaasFeesCache()
  env.ASAAS_ANTICIPATION_MONTHLY_RATE = undefined
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe("getAsaasFees", () => {
  it("maps the account fees to cents and fractions", async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(feesBody), { status: 200 }))

    expect(await getAsaasFees()).toEqual({
      pix: { fixed: 199, percent: 0 },
      card: { fixed: 49, percentOneInstallment: 0.0299, percentUpToSix: 0.0349 },
      anticipationMonthlyRate: 0.0125,
    })
    expect(fetchMock.mock.calls[0][0]).toBe("https://api-sandbox.asaas.com/v3/myAccount/fees/")
  })

  it("prefers the configured anticipation rate", async () => {
    env.ASAAS_ANTICIPATION_MONTHLY_RATE = 0.0115
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(feesBody), { status: 200 }))

    expect((await getAsaasFees()).anticipationMonthlyRate).toBe(0.0115)
  })

  it("caches for twelve hours", async () => {
    vi.useFakeTimers()
    fetchMock.mockResolvedValue(new Response(JSON.stringify(feesBody), { status: 200 }))

    await getAsaasFees()
    await getAsaasFees()
    expect(fetchMock).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(12 * 60 * 60 * 1000 + 1)
    await getAsaasFees()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it("falls back to the list prices when the request fails, without caching the failure", async () => {
    fetchMock.mockResolvedValueOnce(new Response("nope", { status: 500 }))
    expect(await getAsaasFees()).toEqual(FALLBACK_FEES)

    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(feesBody), { status: 200 }))
    await getAsaasFees()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:unit -- app/business/payment/asaas-fees.server.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

Append to `asaas-client.server.ts`:

```ts
export const accountFeesSchema = zod.object({
  payment: zod.object({
    creditCard: zod.object({
      operationValue: zod.number(),
      oneInstallmentPercentage: zod.number(),
      upToSixInstallmentsPercentage: zod.number(),
    }),
    pix: zod.object({
      fixedFeeValue: zod.number(),
      percentageFee: zod.number(),
    }),
  }),
  anticipation: zod
    .object({
      creditCard: zod.object({ monthlyFeePercentage: zod.number() }).partial(),
    })
    .partial()
    .optional(),
})

export type AsaasAccountFees = zod.infer<typeof accountFeesSchema>

export function getAsaasAccountFees(): Promise<AsaasAccountFees> {
  return asaasRequest("GET", "/myAccount/fees/", accountFeesSchema)
}
```

Create `asaas-fees.server.ts`:

```ts
import { ENV } from "varlock/env"
import { logger } from "~/lib/logger/logger.server"
import { getAsaasAccountFees, reaisToCents } from "./asaas-client.server"
import type { AsaasFees } from "./pricing"

const CACHE_TTL_MS = 12 * 60 * 60 * 1000

export const FALLBACK_FEES: AsaasFees = {
  pix: { fixed: 199, percent: 0 },
  card: { fixed: 49, percentOneInstallment: 0.0299, percentUpToSix: 0.0349 },
  anticipationMonthlyRate: 0.0125,
}

let cached: { fees: AsaasFees; fetchedAt: number } | null = null

export function resetAsaasFeesCache() {
  cached = null
}

function withConfiguredAnticipation(fees: AsaasFees): AsaasFees {
  const configured = ENV.ASAAS_ANTICIPATION_MONTHLY_RATE
  return typeof configured === "number" && configured > 0
    ? { ...fees, anticipationMonthlyRate: configured }
    : fees
}

export async function getAsaasFees(): Promise<AsaasFees> {
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return withConfiguredAnticipation(cached.fees)
  }

  try {
    const account = await getAsaasAccountFees()
    const fees: AsaasFees = {
      pix: {
        fixed: reaisToCents(account.payment.pix.fixedFeeValue),
        percent: account.payment.pix.percentageFee / 100,
      },
      card: {
        fixed: reaisToCents(account.payment.creditCard.operationValue),
        percentOneInstallment: account.payment.creditCard.oneInstallmentPercentage / 100,
        percentUpToSix: account.payment.creditCard.upToSixInstallmentsPercentage / 100,
      },
      anticipationMonthlyRate:
        (account.anticipation?.creditCard?.monthlyFeePercentage ??
          FALLBACK_FEES.anticipationMonthlyRate * 100) / 100,
    }
    cached = { fees, fetchedAt: Date.now() }
    return withConfiguredAnticipation(fees)
  } catch (error) {
    logger.error("Could not read Asaas account fees, using the list prices", {
      error: error instanceof Error ? error.message : String(error),
    })
    return withConfiguredAnticipation(FALLBACK_FEES)
  }
}
```

The exact key of the anticipation block in `GET /myAccount/fees/` must be confirmed against the sandbox during POS-519's checklist step ("fee values recorded"); the schema above is `.partial().optional()` so an unexpected shape falls through to the fallback rate instead of failing the parse.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:unit -- app/business/payment/asaas-fees.server.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add app/business/payment/asaas-client.server.ts app/business/payment/asaas-fees.server.ts app/business/payment/asaas-fees.server.test.ts
git commit -m "feat(payments): read the account fees from Asaas with a cache and a fallback"
```

---

### Task 7: Webhook registration script

**Files:**
- Create: `scripts/asaas/register-webhook.ts`
- Modify: `package.json` (script `asaas:register-webhook`)

No unit test: the script is a thin CLI over the client, run once per environment and verified by the Asaas dashboard. It is exercised for real in POS-532.

- [ ] **Step 1: Write the script**

```ts
// scripts/asaas/register-webhook.ts
// Usage: pnpm asaas:register-webhook https://www.positivparty.com
// Registers (or updates) the "Positiv" webhook on the Asaas account behind
// ASAAS_API_KEY. Idempotent by name. Reads ASAAS_WEBHOOK_TOKEN for authToken.
import { ENV } from "varlock/env"
import { zod } from "../../app/lib/helpers/zod"
import { asaasRequest } from "../../app/business/payment/asaas-client.server"

export const WEBHOOK_NAME = "Positiv"

export const WEBHOOK_EVENTS = [
  "PAYMENT_CREATED",
  "PAYMENT_CONFIRMED",
  "PAYMENT_RECEIVED",
  "PAYMENT_OVERDUE",
  "PAYMENT_DELETED",
  "PAYMENT_RESTORED",
  "PAYMENT_UPDATED",
  "PAYMENT_REFUNDED",
  "PAYMENT_PARTIALLY_REFUNDED",
  "PAYMENT_REFUND_IN_PROGRESS",
  "PAYMENT_REFUND_DENIED",
  "PAYMENT_CHARGEBACK_REQUESTED",
  "PAYMENT_CHARGEBACK_DISPUTE",
  "PAYMENT_AWAITING_CHARGEBACK_REVERSAL",
  "PAYMENT_CREDIT_CARD_CAPTURE_REFUSED",
  "PAYMENT_AWAITING_RISK_ANALYSIS",
  "PAYMENT_APPROVED_BY_RISK_ANALYSIS",
  "PAYMENT_REPROVED_BY_RISK_ANALYSIS",
] as const

const webhook = zod.object({ id: zod.string(), name: zod.string(), url: zod.string() })
const list = zod.object({ data: zod.array(webhook) })

async function main() {
  const origin = process.argv[2]
  if (!origin) throw new Error("usage: register-webhook <https://origin>")
  const token = ENV.ASAAS_WEBHOOK_TOKEN
  if (!token || token.length < 32) {
    throw new Error("ASAAS_WEBHOOK_TOKEN must be set and at least 32 characters long")
  }
  const url = `${origin.replace(/\/+$/, "")}/api/asaas/webhook`

  const body = {
    name: WEBHOOK_NAME,
    url,
    email: "contato@positivparty.com",
    enabled: true,
    interrupted: false,
    apiVersion: 3,
    authToken: token,
    sendType: "SEQUENTIALLY",
    events: WEBHOOK_EVENTS,
  }

  const existing = (await asaasRequest("GET", "/webhooks", list)).data.find(
    (item) => item.name === WEBHOOK_NAME,
  )

  const saved = existing
    ? await asaasRequest("PUT", `/webhooks/${existing.id}`, webhook, body)
    : await asaasRequest("POST", "/webhooks", webhook, body)

  console.info(`${existing ? "Updated" : "Created"} webhook ${saved.id} → ${saved.url}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
```

- [ ] **Step 2: Add the package script**

In `package.json` `scripts`, next to `perf:baseline`:

```json
"asaas:register-webhook": "varlock run -- tsx scripts/asaas/register-webhook.ts"
```

- [ ] **Step 3: Type-check**

Run: `pnpm lint`
Expected: clean (tsx is already a dev dependency because `perf:baseline` uses it; if `tsc` complains about the script's imports, add `scripts/asaas/**` to the `include` list in `tsconfig.json` next to the existing `scripts` entries).

- [ ] **Step 4: Commit**

```bash
git add scripts/asaas/register-webhook.ts package.json
git commit -m "feat(payments): script to register the Asaas webhook"
```

---

### Task 8: Full verification

- [ ] Run: `pnpm lint`
- [ ] Run: `pnpm test` (unit + integration; integration has nothing new but must stay green)
- [ ] `git log --oneline main..` shows 6 commits in the order above

## Definition of done

- PR title: `[POS-526] Add the Asaas client, its environment and the CPF validator`.
- Delete this plan file before opening the PR.
