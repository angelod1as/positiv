import { formatInTimeZone } from "date-fns-tz"
import { ENV } from "varlock/env"
import type { z, ZodType } from "zod"
import { zod } from "~/lib/helpers/zod"
import { logger } from "~/lib/logger/logger.server"
import { normalizeCpf } from "./cpf"

// Asaas rejects a request without a User-Agent. The package is private and
// carries no version field, so the client names itself and the environment it
// is calling from, which is what makes an Asaas support ticket answerable.
const USER_AGENT = `Positiv/1.0 (${ENV.APP_ENV})`
const DEFAULT_TIMEOUT_MS = 30_000
// Creating a charge is the one call that regularly takes longer than the
// default, and a participant who gave up waiting is worse than a slow page.
const CHARGE_TIMEOUT_MS = 60_000
// Asaas compares dueDate against the calendar day in Brazil, so a charge
// created late at night in UTC must not be dated tomorrow.
const CHARGE_TIME_ZONE = "America/Sao_Paulo"

const errorEnvelope = zod.object({
  errors: zod.array(zod.object({ code: zod.string(), description: zod.string() })),
})

function centsToReais(cents: number): number {
  return Number((cents / 100).toFixed(2))
}

export type AsaasApiError = { code: string; description: string }

export class AsaasError extends Error {
  readonly status: number
  readonly errors: AsaasApiError[]
  readonly path: string

  constructor(status: number, errors: AsaasApiError[], path: string) {
    const [first] = errors
    super(
      first
        ? `Asaas ${status} on ${path}: ${first.code} — ${first.description}`
        : `Asaas ${status} on ${path}`,
    )
    this.name = "AsaasError"
    this.status = status
    this.errors = errors
    this.path = path
  }
}

function config() {
  const url = ENV.ASAAS_API_URL
  const key = ENV.ASAAS_API_KEY
  if (!url) throw new Error("ASAAS_API_URL is not configured")
  if (!key) throw new Error("ASAAS_API_KEY is not configured")
  return { baseUrl: url.replace(/\/+$/, ""), key }
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

export async function asaasRequest<T>(
  method: "GET" | "POST" | "PUT" | "DELETE",
  path: string,
  schema: ZodType<T>,
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
        method,
        path,
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

const customerId = zod.object({ id: zod.string() })

export async function createAsaasCustomer(input: {
  name: string
  cpf: string
  email: string
  mobilePhone?: string
  externalReference: string
}): Promise<string> {
  const { id } = await asaasRequest("POST", "/customers", customerId, {
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
      data: zod.array(
        zod.object({ id: zod.string(), deleted: zod.boolean().optional() }),
      ),
    }),
  )
  return data.find((customer) => !customer.deleted)?.id ?? null
}

export type AsaasPaymentMethod = "pix" | "credit_card"

export type CreatedAsaasPayment = {
  id: string
  status: string
  invoiceUrl: string | null
  installmentId: string | null
}

const paymentResponse = zod.object({
  id: zod.string(),
  status: zod.string(),
  invoiceUrl: zod.string().nullable().optional(),
  installment: zod.string().nullable().optional(),
})

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
  const installments =
    input.method === "credit_card" ? (input.installmentCount ?? 1) : 1

  const body: Record<string, unknown> = {
    customer: input.customerId,
    billingType: input.method === "pix" ? "PIX" : "CREDIT_CARD",
    dueDate: formatInTimeZone(input.dueDate, CHARGE_TIME_ZONE, "yyyy-MM-dd"),
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

// Only the fields the fee mapper reads are described. Everything Asaas ships
// alongside them — the boleto block, PIX credit allowances, the card-present
// rates — is left out on purpose, so a change there cannot fail the parse.
const accountFees = zod.object({
  payment: zod.object({
    creditCard: zod.object({
      operationValue: zod.number(),
      oneInstallmentPercentage: zod.number(),
      upToSixInstallmentsPercentage: zod.number(),
      discountOneInstallmentPercentage: zod.number().nullable().optional(),
      discountUpToSixInstallmentsPercentage: zod.number().nullable().optional(),
      hasValidDiscount: zod.boolean().nullable().optional(),
    }),
    // The percentage fields come back null whenever the account is on a fixed
    // PIX fee, which is what the sandbox account uses today.
    pix: zod.object({
      fixedFeeValue: zod.number(),
      percentageFee: zod.number().nullable().optional(),
    }),
  }),
  anticipation: zod
    .object({
      creditCard: zod
        .object({
          detachedMonthlyFeeValue: zod.number().nullable().optional(),
          installmentMonthlyFeeValue: zod.number().nullable().optional(),
        })
        .optional(),
    })
    .optional(),
})

export type AsaasAccountFees = z.infer<typeof accountFees>

export function getAsaasAccountFees(): Promise<AsaasAccountFees> {
  return asaasRequest("GET", "/myAccount/fees/", accountFees)
}

export function reaisToCents(reais: number): number {
  return Math.round(reais * 100)
}
