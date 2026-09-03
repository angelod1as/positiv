import { ENV } from "varlock/env"
import type { ZodType } from "zod"
import { zod } from "~/lib/helpers/zod"
import { logger } from "~/lib/logger/logger.server"
import { normalizeCpf } from "./cpf"

// Asaas rejects a request without a User-Agent. The package is private and
// carries no version field, so the client names itself and the environment it
// is calling from, which is what makes an Asaas support ticket answerable.
const USER_AGENT = `Positiv/1.0 (${ENV.APP_ENV})`
const DEFAULT_TIMEOUT_MS = 30_000

const errorEnvelope = zod.object({
  errors: zod.array(zod.object({ code: zod.string(), description: zod.string() })),
})

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
