import { beforeEach, describe, expect, it, vi } from "vitest"
import { AsaasError } from "./provider/asaas/asaas-client.server"
import {
  logPaymentProviderFailure,
  paymentAlertContext,
  type PaymentAlertRow,
} from "./payment-alert.server"

const { env, logger } = vi.hoisted(() => ({
  env: {} as Record<string, unknown>,
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

vi.mock("varlock/env", () => ({ ENV: env }))
vi.mock("~/lib/logger/logger.server", () => ({ logger }))

const row: PaymentAlertRow = {
  paymentId: "48e85b01-0000-4000-8000-000000000001",
  profileId: "11111111-0000-4000-8000-000000000002",
  eventId: "22222222-0000-4000-8000-000000000003",
  eventTitle: "Retiro de Outono",
  status: "pending",
  method: null,
  installmentCount: null,
  amount: null,
  dueAt: "2026-10-26T03:00:00+00:00",
  providerChargeId: "pay_old",
  providerCustomerId: "cus_000123",
}

// What the checkout reads alongside the row: the participant's own data,
// which must never reach a Telegram group.
const personal = {
  full_name: "Maria da Silva",
  social_name: "Mari",
  email: "maria@example.com",
  cpf: "52998224725",
  phone: 11987654321,
}

const pixRefusal = new AsaasError(
  "POST",
  400,
  [
    {
      code: "invalid_billingType",
      description: "Não há nenhuma chave Pix disponível para receber cobranças.",
    },
  ],
  "/payments",
)

beforeEach(() => {
  vi.clearAllMocks()
  env.APP_ENV = "test"
  env.APP_URL = "https://positiv.test/"
  env.ASAAS_API_URL = "https://api.asaas.com/v3"
})

describe("paymentAlertContext", () => {
  it("names the person, the payment, the event and what was attempted", () => {
    expect(
      paymentAlertContext(row, {
        method: "pix",
        installmentCount: null,
        amount: 45000,
      }),
    ).toEqual({
      profileId: row.profileId,
      paymentId: row.paymentId,
      eventId: row.eventId,
      eventTitle: "Retiro de Outono",
      method: "pix",
      installmentCount: null,
      amount: 45000,
      customerId: "cus_000123",
      dueDate: "2026-10-26T03:00:00+00:00",
      statusBefore: "pending",
      previousChargeId: "pay_old",
      links: {
        "Payment in the admin": `https://positiv.test/admin/eventos/${row.eventId}/participantes/${row.profileId}`,
        "Customer in Asaas":
          "https://www.asaas.com/customerAccount/show/cus_000123",
      },
    })
  })

  it("falls back to what the row holds when nothing is being attempted", () => {
    const context = paymentAlertContext({
      ...row,
      method: "credit_card",
      installmentCount: 3,
      amount: 50000,
    })

    expect(context).toMatchObject({
      method: "credit_card",
      installmentCount: 3,
      amount: 50000,
    })
  })

  it("prefers the customer just found over the row's empty one", () => {
    const context = paymentAlertContext(
      { ...row, providerCustomerId: null },
      { customerId: "cus_new" },
    )

    expect(context.customerId).toBe("cus_new")
    expect(context.links["Customer in Asaas"]).toBe(
      "https://www.asaas.com/customerAccount/show/cus_new",
    )
  })

  it("leaves the customer link out while there is no customer", () => {
    const context = paymentAlertContext({ ...row, providerCustomerId: null })

    expect(context.customerId).toBeNull()
    expect(context.links).not.toHaveProperty("Customer in Asaas")
  })
})

describe("logPaymentProviderFailure", () => {
  it("logs once, with the payment's context and what the provider answered", () => {
    logPaymentProviderFailure(
      "Could not create the charge at the payment provider",
      paymentAlertContext(row, { method: "pix", amount: 45000 }),
      pixRefusal,
    )

    expect(logger.error).toHaveBeenCalledTimes(1)
    expect(logger.error).toHaveBeenCalledWith(
      "Could not create the charge at the payment provider",
      expect.objectContaining({
        profileId: row.profileId,
        paymentId: row.paymentId,
        eventId: row.eventId,
        eventTitle: "Retiro de Outono",
        method: "pix",
        amount: 45000,
        customerId: "cus_000123",
        statusBefore: "pending",
        previousChargeId: "pay_old",
        provider: {
          method: "POST",
          path: "/payments",
          status: 400,
          errors: pixRefusal.errors,
        },
      }),
    )
  })

  it("keeps the participant's own data out, even when the row carried it", () => {
    logPaymentProviderFailure(
      "Could not create the charge at the payment provider",
      paymentAlertContext({ ...row, ...personal }),
      pixRefusal,
    )

    const logged = JSON.stringify(logger.error.mock.calls)
    for (const value of [
      "Maria da Silva",
      "Mari\"",
      "maria@example.com",
      "52998224725",
      "11987654321",
    ]) {
      expect(logged).not.toContain(value)
    }
    for (const key of ["full_name", "social_name", "email", "cpf", "phone", "body"]) {
      expect(logged).not.toContain(`"${key}"`)
    }
  })

  it("logs a failure that never reached the provider with its message", () => {
    logPaymentProviderFailure(
      "Could not create the charge at the payment provider",
      paymentAlertContext(row),
      new TypeError("fetch failed"),
    )

    expect(logger.error).toHaveBeenCalledWith(
      "Could not create the charge at the payment provider",
      expect.objectContaining({ provider: { error: "fetch failed" } }),
    )
  })
})
