import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import {
  E2E_ASAAS_API_KEY,
  startAsaasMockServer,
  stopAsaasMockServer,
} from "./asaas-mock-server"

let origin: string

beforeAll(async () => {
  origin = await startAsaasMockServer(0)
})

afterAll(async () => {
  await stopAsaasMockServer()
})

beforeEach(async () => {
  await fetch(`${origin}/__mock/reset`, { method: "POST" })
})

function call(path: string, init: { method?: string; body?: unknown } = {}) {
  return fetch(`${origin}/v3${path}`, {
    method: init.method ?? "GET",
    headers: { access_token: E2E_ASAAS_API_KEY, "Content-Type": "application/json" },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  })
}

async function createCustomer() {
  const response = await call("/customers", {
    method: "POST",
    body: { name: "Ana", cpfCnpj: "52998224725", email: "ana@example.com" },
  })
  return (await response.json()) as { id: string }
}

async function createPayment(body: Record<string, unknown>) {
  const customer = await createCustomer()
  const response = await call("/payments", {
    method: "POST",
    body: { customer: customer.id, dueDate: "2026-10-01", ...body },
  })
  return (await response.json()) as {
    id: string
    status: string
    invoiceUrl: string
    installment: string | null
  }
}

describe("asaas mock server", () => {
  it("refuses a request without the api key", async () => {
    const response = await fetch(`${origin}/v3/customers?cpfCnpj=52998224725`)

    expect(response.status).toBe(401)
  })

  it("refuses a customer without a cpf, in the Asaas error envelope", async () => {
    const response = await call("/customers", { method: "POST", body: { name: "Ana" } })

    expect(response.status).toBe(400)
    expect((await response.json()).errors[0].code).toBe("invalid_cpfCnpj")
  })

  it("finds a customer by cpf once it exists", async () => {
    const before = await call("/customers?cpfCnpj=52998224725&limit=1")
    expect((await before.json()).data).toEqual([])

    const customer = await createCustomer()

    const after = await call("/customers?cpfCnpj=52998224725&limit=1")
    expect((await after.json()).data).toEqual([{ id: customer.id, deleted: false }])
  })

  it("creates a single charge with an invoice url it serves itself", async () => {
    const payment = await createPayment({ billingType: "PIX", value: 221.99 })

    expect(payment.id).toMatch(/^pay_/)
    expect(payment.status).toBe("PENDING")
    expect(payment.installment).toBeNull()
    expect(payment.invoiceUrl).toBe(`${origin}/i/${payment.id}`)
    expect((await fetch(payment.invoiceUrl)).status).toBe(200)
  })

  it("refuses a charge for a customer it does not know", async () => {
    const response = await call("/payments", {
      method: "POST",
      body: { customer: "cus_nope", billingType: "PIX", value: 10, dueDate: "2026-10-01" },
    })

    expect(response.status).toBe(400)
    expect((await response.json()).errors[0].code).toBe("invalid_customer")
  })

  it("bills a card plan as one charge per installment under one installment id", async () => {
    const payment = await createPayment({
      billingType: "CREDIT_CARD",
      installmentCount: 3,
      totalValue: 237.3,
    })

    expect(payment.installment).toMatch(/^inst_/)

    const plan = await call(`/payments?installment=${payment.installment}&limit=100`)
    const { data } = (await plan.json()) as { data: { id: string; value: number; status: string }[] }
    expect(data.map((charge) => charge.value)).toEqual([79.1, 79.1, 79.1])
    expect(data[0].id).toBe(payment.id)
  })

  it("confirms a whole card plan through the sandbox endpoint", async () => {
    const payment = await createPayment({
      billingType: "CREDIT_CARD",
      installmentCount: 2,
      totalValue: 100,
    })

    const confirmed = await call(`/sandbox/payment/${payment.id}/confirm`, { method: "POST", body: {} })
    expect(confirmed.status).toBe(200)

    const plan = await call(`/payments?installment=${payment.installment}&limit=100`)
    const { data } = (await plan.json()) as { data: { status: string }[] }
    expect(data.map((charge) => charge.status)).toEqual(["CONFIRMED", "CONFIRMED"])
  })

  it("settles a confirmed PIX charge as received, as the sandbox does", async () => {
    const payment = await createPayment({ billingType: "PIX", value: 10 })

    const confirmed = await call(`/sandbox/payment/${payment.id}/confirm`, { method: "POST", body: {} })

    expect((await confirmed.json()).status).toBe("RECEIVED")
  })

  it("deletes a pending charge once, and never a confirmed one", async () => {
    const pending = await createPayment({ billingType: "PIX", value: 10 })
    const deleted = await call(`/payments/${pending.id}`, { method: "DELETE" })
    expect(await deleted.json()).toEqual({ deleted: true, id: pending.id })
    expect((await call(`/payments/${pending.id}`, { method: "DELETE" })).status).toBe(404)

    const paid = await createPayment({ billingType: "PIX", value: 10 })
    await call(`/sandbox/payment/${paid.id}/confirm`, { method: "POST", body: {} })
    expect((await call(`/payments/${paid.id}`, { method: "DELETE" })).status).toBe(400)
  })

  it("refunds only a charge whose money was received", async () => {
    const payment = await createPayment({ billingType: "PIX", value: 10 })
    const early = await call(`/payments/${payment.id}/refund`, { method: "POST", body: { value: 5 } })
    expect(early.status).toBe(400)

    await call(`/sandbox/payment/${payment.id}/confirm`, { method: "POST", body: {} })
    const refund = await call(`/payments/${payment.id}/refund`, { method: "POST", body: { value: 5 } })
    expect(refund.status).toBe(200)
    expect((await refund.json()).id).toBe(payment.id)
  })

  it("never gives back more than the charge still holds", async () => {
    const payment = await createPayment({ billingType: "PIX", value: 10 })
    await call(`/sandbox/payment/${payment.id}/confirm`, { method: "POST", body: {} })

    const first = await call(`/payments/${payment.id}/refund`, { method: "POST", body: { value: 6 } })
    expect(first.status).toBe(200)

    const second = await call(`/payments/${payment.id}/refund`, { method: "POST", body: { value: 6 } })
    expect(second.status).toBe(400)

    const rest = await call(`/payments/${payment.id}/refund`, { method: "POST", body: { value: 4 } })
    expect(rest.status).toBe(200)

    const whole = await call(`/payments/${payment.id}/refund`, { method: "POST", body: {} })
    expect(whole.status).toBe(400)
  })

  it("reports the sandbox fee snapshot", async () => {
    const fees = await (await call("/myAccount/fees/")).json()

    expect(fees.payment.pix).toMatchObject({ fixedFeeValue: 1.99, percentageFee: null })
    expect(fees.payment.creditCard).toMatchObject({
      operationValue: 0.49,
      oneInstallmentPercentage: 2.99,
      upToSixInstallmentsPercentage: 3.49,
      hasValidDiscount: false,
    })
    expect(fees.anticipation.creditCard).toEqual({
      detachedMonthlyFeeValue: 1.15,
      installmentMonthlyFeeValue: 1.6,
    })
  })

  it("records every api call for a spec to assert on, and forgets them on reset", async () => {
    await createCustomer()

    const calls = await (await fetch(`${origin}/__mock/calls`)).json()
    expect(calls).toEqual([
      {
        method: "POST",
        path: "/customers",
        body: { name: "Ana", cpfCnpj: "52998224725", email: "ana@example.com" },
      },
    ])

    await fetch(`${origin}/__mock/reset`, { method: "POST" })
    expect(await (await fetch(`${origin}/__mock/calls`)).json()).toEqual([])
  })
})
