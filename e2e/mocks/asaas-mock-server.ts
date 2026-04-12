import { createServer, type IncomingMessage, type ServerResponse, type Server } from "node:http"

interface AsaasCall {
  method: string
  path: string
  headers: Record<string, string>
  body: Record<string, unknown>
  timestamp: number
}

interface MockCustomer {
  id: string
  name: string
  cpfCnpj: string
  email?: string
  mobilePhone?: string
}

type PaymentStatus = "PENDING" | "CONFIRMED" | "REFUNDED" | "DELETED"

interface MockPayment {
  id: string
  customer: string
  billingType: "PIX" | "CREDIT_CARD"
  value: number
  dueDate: string
  description?: string
  installmentCount?: number
  status: PaymentStatus
  invoiceUrl: string
}

interface AsaasState {
  customers: Map<string, MockCustomer>
  payments: Map<string, MockPayment>
  calls: AsaasCall[]
}

let state: AsaasState = {
  customers: new Map(),
  payments: new Map(),
  calls: [],
}

let server: Server | null = null

type Json = Record<string, unknown>

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function respondJson(res: ServerResponse, status: number, body: Json): void {
  res.statusCode = status
  res.setHeader("Content-Type", "application/json")
  res.end(JSON.stringify(body))
}

function validationError(res: ServerResponse, description: string): void {
  respondJson(res, 400, {
    errors: [{ code: "invalid_field", description }],
  })
}

function requireAuth(req: IncomingMessage, res: ServerResponse): boolean {
  const token = req.headers["access_token"]
  if (!token || typeof token !== "string" || token.length === 0) {
    respondJson(res, 401, {
      errors: [{ code: "unauthorized", description: "Missing access_token header" }],
    })
    return false
  }
  return true
}

function handleCreateCustomer(body: Json, res: ServerResponse): void {
  const name = asString(body.name)
  const cpfCnpj = asString(body.cpfCnpj)
  if (!name) return validationError(res, "name is required")
  if (!cpfCnpj) return validationError(res, "cpfCnpj is required")

  const id = `cus_mock_${Date.now()}_${state.customers.size}`
  const customer: MockCustomer = {
    id,
    name,
    cpfCnpj,
    email: asString(body.email) ?? undefined,
    mobilePhone: asString(body.mobilePhone) ?? undefined,
  }
  state.customers.set(id, customer)
  respondJson(res, 200, { id })
}

function handleCreatePayment(body: Json, res: ServerResponse): void {
  const customer = asString(body.customer)
  const billingType = asString(body.billingType)
  const value = asNumber(body.value)
  const dueDate = asString(body.dueDate)

  if (!customer) return validationError(res, "customer is required")
  if (!state.customers.has(customer))
    return validationError(res, `customer ${customer} does not exist`)
  if (billingType !== "PIX" && billingType !== "CREDIT_CARD")
    return validationError(res, "billingType must be PIX or CREDIT_CARD")
  if (value === null || value <= 0)
    return validationError(res, "value must be a positive number")
  if (!dueDate) return validationError(res, "dueDate is required")
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate))
    return validationError(res, "dueDate must be in YYYY-MM-DD format")

  const installmentCount = asNumber(body.installmentCount)
  if (installmentCount !== null && installmentCount <= 0)
    return validationError(res, "installmentCount must be positive")

  const id = `pay_mock_${Date.now()}_${state.payments.size}`
  const payment: MockPayment = {
    id,
    customer,
    billingType,
    value,
    dueDate,
    description: asString(body.description) ?? undefined,
    installmentCount: installmentCount ?? undefined,
    status: "PENDING",
    invoiceUrl: `http://localhost:5173/mock-invoice/${id}`,
  }
  state.payments.set(id, payment)
  respondJson(res, 200, { id, invoiceUrl: payment.invoiceUrl })
}

function handleRefund(paymentId: string, res: ServerResponse): void {
  const payment = state.payments.get(paymentId)
  if (!payment)
    return respondJson(res, 404, {
      errors: [{ code: "not_found", description: `Payment ${paymentId} not found` }],
    })
  if (payment.status === "DELETED")
    return respondJson(res, 400, {
      errors: [{ code: "invalid_state", description: "Cannot refund a deleted payment" }],
    })
  payment.status = "REFUNDED"
  respondJson(res, 200, { id: payment.id, status: "REFUNDED" })
}

function handleDelete(paymentId: string, res: ServerResponse): void {
  const payment = state.payments.get(paymentId)
  if (!payment)
    return respondJson(res, 404, {
      errors: [{ code: "not_found", description: `Payment ${paymentId} not found` }],
    })
  payment.status = "DELETED"
  respondJson(res, 200, { deleted: true, id: payment.id })
}

function handleMockState(res: ServerResponse): void {
  respondJson(res, 200, {
    customers: [...state.customers.values()],
    payments: [...state.payments.values()],
    calls: state.calls,
  })
}

function handleMockReset(res: ServerResponse): void {
  state = { customers: new Map(), payments: new Map(), calls: [] }
  respondJson(res, 200, { reset: true })
}

function handleRequest(req: IncomingMessage, res: ServerResponse): void {
  let raw = ""
  req.on("data", (chunk: string) => (raw += chunk))
  req.on("end", () => {
    const method = req.method ?? "UNKNOWN"
    const url = req.url ?? "/"

    // Introspection endpoints for tests (no auth required, used by e2e helpers)
    if (method === "GET" && url === "/_mock/state") return handleMockState(res)
    if (method === "POST" && url === "/_mock/reset") return handleMockReset(res)

    if (!requireAuth(req, res)) return

    let body: Json = {}
    if (raw.length > 0) {
      try {
        body = JSON.parse(raw)
      } catch {
        return respondJson(res, 400, {
          errors: [{ code: "invalid_json", description: "Request body is not valid JSON" }],
        })
      }
    }

    state.calls.push({
      method,
      path: url,
      headers: { "access_token": String(req.headers["access_token"] ?? "") },
      body,
      timestamp: Date.now(),
    })

    if (method === "POST" && url === "/api/v3/customers")
      return handleCreateCustomer(body, res)

    if (method === "POST" && url === "/api/v3/payments")
      return handleCreatePayment(body, res)

    const refundMatch = url.match(/^\/api\/v3\/payments\/([^/]+)\/refund$/)
    if (method === "POST" && refundMatch) return handleRefund(refundMatch[1], res)

    const deleteMatch = url.match(/^\/api\/v3\/payments\/([^/]+)$/)
    if (method === "DELETE" && deleteMatch) return handleDelete(deleteMatch[1], res)

    respondJson(res, 404, {
      errors: [{ code: "unknown_endpoint", description: `${method} ${url} not mocked` }],
    })
  })
}

export function startAsaasMockServer(port = 9999): Promise<void> {
  return new Promise((resolve) => {
    server = createServer(handleRequest)
    server.listen(port, () => {
      console.info(`Asaas mock server running on port ${port}`)
      resolve()
    })
  })
}

export function stopAsaasMockServer(): Promise<void> {
  return new Promise((resolve) => {
    if (server) {
      server.close(() => {
        console.info("Asaas mock server stopped")
        resolve()
      })
    } else {
      resolve()
    }
  })
}

/**
 * The mock server runs in the Playwright global-setup process. Tests run
 * in separate worker processes and therefore cannot see the in-memory
 * state directly. The functions below are HTTP clients that talk to the
 * introspection endpoints on the running mock server.
 *
 * They accept an optional `port` argument so tests can override the
 * default port if needed.
 */

const MOCK_BASE = (port = 9999) => `http://localhost:${port}`

interface MockStateResponse {
  customers: MockCustomer[]
  payments: MockPayment[]
  calls: AsaasCall[]
}

async function fetchMockState(port = 9999): Promise<MockStateResponse> {
  const response = await fetch(`${MOCK_BASE(port)}/_mock/state`)
  if (!response.ok) {
    throw new Error(`Mock state endpoint failed: ${response.status}`)
  }
  return (await response.json()) as MockStateResponse
}

export async function resetAsaasState(port = 9999): Promise<void> {
  const response = await fetch(`${MOCK_BASE(port)}/_mock/reset`, {
    method: "POST",
  })
  if (!response.ok) {
    throw new Error(`Mock reset endpoint failed: ${response.status}`)
  }
}

export async function getAsaasCalls(port = 9999): Promise<AsaasCall[]> {
  const s = await fetchMockState(port)
  return s.calls
}

export async function getAsaasCallsByMethod(
  method: string,
  port = 9999,
): Promise<AsaasCall[]> {
  const calls = await getAsaasCalls(port)
  return calls.filter((c) => c.method === method)
}

export async function getAsaasCallsByPath(
  pathPattern: RegExp,
  port = 9999,
): Promise<AsaasCall[]> {
  const calls = await getAsaasCalls(port)
  return calls.filter((c) => pathPattern.test(c.path))
}

export async function getAsaasPayment(
  id: string,
  port = 9999,
): Promise<MockPayment | undefined> {
  const s = await fetchMockState(port)
  return s.payments.find((p) => p.id === id)
}

export async function getAllAsaasPayments(port = 9999): Promise<MockPayment[]> {
  const s = await fetchMockState(port)
  return s.payments
}

export async function getAllAsaasCustomers(
  port = 9999,
): Promise<MockCustomer[]> {
  const s = await fetchMockState(port)
  return s.customers
}
