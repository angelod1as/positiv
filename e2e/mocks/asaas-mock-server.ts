// A stand-in for the Asaas API, started next to the production build under
// test so the suite never reaches the sandbox. It answers only the endpoints
// the app calls, validates what the real API validates, and records every call
// so a spec can assert on the request the app made, not only on the screen.
//
// The global setup and the Playwright workers are separate processes, so specs
// reach this state over HTTP — /__mock/calls and /__mock/reset — never through
// module variables.
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http"
import type { AddressInfo } from "node:net"

export const E2E_ASAAS_API_KEY = "e2e-asaas-api-key"
export const E2E_ASAAS_WEBHOOK_TOKEN = "e2e-asaas-webhook-token-0123456789abcdef"

// The sandbox account's GET /v3/myAccount/fees/, recorded in POS-519.
const SANDBOX_FEES = {
  payment: {
    pix: {
      fixedFeeValue: 1.99,
      percentageFee: null,
      minimumFeeValue: null,
      maximumFeeValue: null,
      type: "FIXED",
    },
    creditCard: {
      operationValue: 0.49,
      oneInstallmentPercentage: 2.99,
      upToSixInstallmentsPercentage: 3.49,
      discountOneInstallmentPercentage: 1.99,
      discountUpToSixInstallmentsPercentage: 2.49,
      hasValidDiscount: false,
    },
  },
  anticipation: {
    creditCard: { detachedMonthlyFeeValue: 1.15, installmentMonthlyFeeValue: 1.6 },
  },
}

type Call = { method: string; path: string; body: unknown }

type Charge = {
  id: string
  customer: string
  billingType: string
  value: number
  status: string
  installment: string | null
  externalReference: string | null
  deleted: boolean
  refunded: number
}

type State = {
  calls: Call[]
  customers: { id: string; cpfCnpj: string }[]
  charges: Charge[]
  sequence: number
}

function emptyState(): State {
  return { calls: [], customers: [], charges: [], sequence: 0 }
}

let state = emptyState()
let server: Server | null = null

function nextId(prefix: string): string {
  state.sequence += 1
  return `${prefix}_${String(state.sequence).padStart(12, "0")}`
}

function send(response: ServerResponse, status: number, body: unknown) {
  response.statusCode = status
  response.setHeader("Content-Type", "application/json")
  response.end(JSON.stringify(body))
}

function fail(response: ServerResponse, status: number, code: string, description: string) {
  send(response, status, { errors: [{ code, description }] })
}

function readBody(request: IncomingMessage): Promise<unknown> {
  return new Promise((resolve) => {
    let raw = ""
    request.on("data", (chunk) => (raw += chunk))
    request.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : undefined)
      } catch {
        resolve(undefined)
      }
    })
  })
}

function reaisToCents(reais: number): number {
  return Math.round(reais * 100)
}

// Asaas splits a plan's total into equal installments; whatever cents do not
// divide evenly go on the last one.
function splitInstallments(totalValue: number, count: number): number[] {
  const total = reaisToCents(totalValue)
  const each = Math.floor(total / count)
  return Array.from({ length: count }, (_, index) =>
    (index === count - 1 ? total - each * (count - 1) : each) / 100,
  )
}

function publicCharge(charge: Charge, origin: string) {
  return {
    id: charge.id,
    customer: charge.customer,
    billingType: charge.billingType,
    value: charge.value,
    status: charge.status,
    installment: charge.installment,
    externalReference: charge.externalReference,
    invoiceUrl: `${origin}/i/${charge.id}`,
    deleted: charge.deleted,
  }
}

function findCharge(id: string): Charge | undefined {
  return state.charges.find((charge) => charge.id === id && !charge.deleted)
}

function createCharge(body: Record<string, unknown>, response: ServerResponse, origin: string) {
  if (!state.customers.some((customer) => customer.id === body.customer)) {
    return fail(response, 400, "invalid_customer", "Customer inválido ou não informado.")
  }

  const installmentCount = Number(body.installmentCount ?? 1)
  const values =
    installmentCount > 1
      ? splitInstallments(Number(body.totalValue), installmentCount)
      : [Number(body.value)]

  if (values.some((value) => !(value > 0))) {
    return fail(response, 400, "invalid_value", "O valor da cobrança deve ser maior que zero.")
  }

  const installment = installmentCount > 1 ? nextId("inst") : null
  const charges = values.map((value) => ({
    id: nextId("pay"),
    customer: String(body.customer),
    billingType: String(body.billingType),
    value,
    status: "PENDING",
    installment,
    externalReference: typeof body.externalReference === "string" ? body.externalReference : null,
    deleted: false,
    refunded: 0,
  }))
  state.charges.push(...charges)

  send(response, 200, publicCharge(charges[0], origin))
}

// The sandbox confirm stands in for the participant paying. A card plan is one
// authorisation on the card, so confirming any charge of it confirms them all.
function confirmCharge(charge: Charge) {
  const plan = charge.installment
    ? state.charges.filter((item) => item.installment === charge.installment && !item.deleted)
    : [charge]
  for (const item of plan) item.status = "CONFIRMED"
}

async function handleApi(
  method: string,
  path: string,
  query: URLSearchParams,
  body: Record<string, unknown>,
  response: ServerResponse,
  origin: string,
) {
  if (method === "GET" && path === "/customers") {
    const found = state.customers.filter((customer) => customer.cpfCnpj === query.get("cpfCnpj"))
    return send(response, 200, { data: found.map(({ id }) => ({ id, deleted: false })) })
  }

  if (method === "POST" && path === "/customers") {
    if (typeof body.cpfCnpj !== "string" || !body.cpfCnpj) {
      return fail(response, 400, "invalid_cpfCnpj", "O CPF/CNPJ informado é inválido.")
    }
    if (typeof body.name !== "string" || !body.name) {
      return fail(response, 400, "invalid_name", "O nome do cliente deve ser informado.")
    }
    const customer = { id: nextId("cus"), cpfCnpj: body.cpfCnpj }
    state.customers.push(customer)
    return send(response, 200, { id: customer.id, name: body.name, cpfCnpj: body.cpfCnpj })
  }

  if (method === "GET" && path === "/payments") {
    const installment = query.get("installment")
    const charges = state.charges.filter(
      (charge) => !charge.deleted && (!installment || charge.installment === installment),
    )
    return send(response, 200, {
      hasMore: false,
      data: charges.map((charge) => publicCharge(charge, origin)),
    })
  }

  if (method === "POST" && path === "/payments") {
    return createCharge(body, response, origin)
  }

  if (method === "GET" && path === "/myAccount/fees/") {
    return send(response, 200, SANDBOX_FEES)
  }

  const sandboxConfirm = path.match(/^\/sandbox\/payment\/([^/]+)\/confirm$/)
  if (method === "POST" && sandboxConfirm) {
    const charge = findCharge(sandboxConfirm[1])
    if (!charge) return fail(response, 404, "not_found", "Cobrança não encontrada.")
    confirmCharge(charge)
    return send(response, 200, publicCharge(charge, origin))
  }

  const refund = path.match(/^\/payments\/([^/]+)\/refund$/)
  if (method === "POST" && refund) {
    const charge = findCharge(refund[1])
    if (!charge) return fail(response, 404, "not_found", "Cobrança não encontrada.")
    if (!["CONFIRMED", "RECEIVED"].includes(charge.status)) {
      return fail(response, 400, "invalid_action", "Esta cobrança não pode ser estornada.")
    }
    // Without a value Asaas gives back whatever the charge still holds; with
    // one, never more than that.
    const remaining = reaisToCents(charge.value) - charge.refunded
    const requested = body.value === undefined ? remaining : reaisToCents(Number(body.value))
    if (remaining <= 0 || requested > remaining) {
      return fail(response, 400, "invalid_value", "O valor do estorno excede o valor disponível.")
    }
    charge.refunded += requested
    return send(response, 200, publicCharge(charge, origin))
  }

  const single = path.match(/^\/payments\/([^/]+)$/)
  if (method === "DELETE" && single) {
    const charge = findCharge(single[1])
    if (!charge) return fail(response, 404, "not_found", "Cobrança não encontrada.")
    // Asaas deletes only a charge nobody has paid: a confirmed or refunded one
    // stays, whatever the caller asks.
    if (!["PENDING", "OVERDUE"].includes(charge.status)) {
      return fail(response, 400, "invalid_action", "Esta cobrança não pode ser removida.")
    }
    charge.deleted = true
    return send(response, 200, { deleted: true, id: charge.id })
  }

  return fail(response, 404, "not_found", `No mock for ${method} ${path}`)
}

async function handle(request: IncomingMessage, response: ServerResponse) {
  const method = request.method ?? "GET"
  const url = new URL(request.url ?? "/", `http://${request.headers.host}`)
  const origin = url.origin

  if (url.pathname === "/__mock/calls" && method === "GET") {
    return send(response, 200, state.calls)
  }
  if (url.pathname === "/__mock/reset" && method === "POST") {
    state = emptyState()
    return send(response, 200, { ok: true })
  }

  const invoice = url.pathname.match(/^\/i\/([^/]+)$/)
  if (invoice && method === "GET") {
    response.statusCode = 200
    response.setHeader("Content-Type", "text/html; charset=utf-8")
    return response.end(`<!doctype html><title>Asaas mock</title><h1>Fatura ${invoice[1]}</h1>`)
  }

  if (!url.pathname.startsWith("/v3/")) {
    return fail(response, 404, "not_found", `No mock for ${method} ${url.pathname}`)
  }

  if (request.headers.access_token !== E2E_ASAAS_API_KEY) {
    return fail(response, 401, "invalid_access_token", "A chave de API fornecida é inválida")
  }

  const path = url.pathname.slice("/v3".length)
  const body = await readBody(request)
  state.calls.push({ method, path: `${path}${url.search}`, body })

  return handleApi(
    method,
    path,
    url.searchParams,
    (body ?? {}) as Record<string, unknown>,
    response,
    origin,
  )
}

export function startAsaasMockServer(port: number): Promise<string> {
  state = emptyState()
  const listening = createServer((request, response) => {
    handle(request, response).catch((error: unknown) => {
      fail(response, 500, "mock_error", String(error))
    })
  })
  server = listening

  return new Promise((resolve, reject) => {
    listening.once("error", reject)
    listening.listen(port, "127.0.0.1", () => {
      resolve(`http://127.0.0.1:${(listening.address() as AddressInfo).port}`)
    })
  })
}

export function stopAsaasMockServer(): Promise<void> {
  const closing = server
  server = null
  return new Promise((resolve) => (closing ? closing.close(() => resolve()) : resolve()))
}
