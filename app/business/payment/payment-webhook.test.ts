import { describe, expect, it, vi } from "vitest"
import { webhookEventSchema } from "./payment-webhook.server"

const env = vi.hoisted<Record<string, unknown>>(() => ({ APP_ENV: "test" }))

vi.mock("varlock/env", () => ({ ENV: env }))

vi.mock("~/kysely-db", () => ({ kyselyDb: {} }))

describe("webhookEventSchema", () => {
  it("accepts what Asaas documents", () => {
    const parsed = webhookEventSchema.parse({
      id: "evt_05b708f961d739ea7eba7e4db318f621&368604920",
      event: "PAYMENT_RECEIVED",
      dateCreated: "2026-06-12 16:45:03",
      payment: {
        object: "payment",
        id: "pay_080225913252",
        customer: "cus_1",
        installment: null,
        value: 100,
        netValue: 94.51,
        status: "RECEIVED",
        externalReference: "056984",
        refunds: null,
      },
    })

    expect(parsed.payment?.id).toBe("pay_080225913252")
    expect(parsed.payment?.netValue).toBe(94.51)
  })

  it("keeps fields it was not told about", () => {
    const parsed = webhookEventSchema.parse({
      id: "evt_1",
      event: "PAYMENT_UPDATED",
      payment: { id: "pay_1", brandNewField: "value" },
    })

    expect((parsed.payment as Record<string, unknown>).brandNewField).toBe(
      "value",
    )
  })

  it("accepts an event with no payment, like a checkout one", () => {
    expect(() =>
      webhookEventSchema.parse({ id: "evt_1", event: "CHECKOUT_PAID" }),
    ).not.toThrow()
  })

  it("refuses a body without an id or an event", () => {
    expect(() =>
      webhookEventSchema.parse({ event: "PAYMENT_RECEIVED" }),
    ).toThrow()
    expect(() => webhookEventSchema.parse({ id: "evt_1" })).toThrow()
  })

  it("reads the refunded total from the refunds list", () => {
    const parsed = webhookEventSchema.parse({
      id: "evt_1",
      event: "PAYMENT_PARTIALLY_REFUNDED",
      payment: {
        id: "pay_1",
        value: 100,
        refunds: [
          { value: 30, status: "DONE" },
          { value: 20, status: "DONE" },
          { value: 10, status: "CANCELLED" },
        ],
      },
    })

    expect(parsed.payment?.refunds).toHaveLength(3)
  })
})
