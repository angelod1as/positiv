import { beforeEach, describe, expect, it, vi } from "vitest"

const TOKEN = "whsec_a_token_long_enough_to_be_real_0000"

const env = vi.hoisted<Record<string, unknown>>(() => ({ APP_ENV: "test" }))
vi.mock("varlock/env", () => ({ ENV: env }))

const logger = vi.hoisted(() => ({
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
}))
vi.mock("~/lib/logger/logger.server", () => ({ logger }))

import { asaasConnector } from "./asaas-connector.server"

function delivery(body: unknown, token: string | null = TOKEN) {
  return new Request("http://localhost/api/payment/webhook", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token === null ? {} : { "asaas-access-token": token }),
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  })
}

async function read(body: unknown) {
  const reading = await asaasConnector.readWebhook(delivery(body))
  if (!reading.ok) throw new Error(`refused: ${reading.error}`)
  return reading.event
}

const charge = {
  id: "pay_1",
  installment: null,
  externalReference: "payment-uuid",
  value: 221.99,
}

beforeEach(() => {
  env.ASAAS_WEBHOOK_TOKEN = TOKEN
  vi.clearAllMocks()
})

describe("asaasConnector.readWebhook", () => {
  describe("authentication", () => {
    it("refuses with 503, and shouts, when the token is not configured", async () => {
      env.ASAAS_WEBHOOK_TOKEN = ""

      const reading = await asaasConnector.readWebhook(
        delivery({ id: "evt_1", event: "PAYMENT_RECEIVED" }, "anything"),
      )

      expect(reading).toMatchObject({ ok: false, status: 503 })
      expect(logger.error).toHaveBeenCalled()
    })

    it.each([
      ["no token", null],
      ["the wrong token", "whsec_wrong_but_the_same_length_00000"],
      ["a token of a different length", "short"],
    ])("refuses with 401 given %s", async (_, token) => {
      const reading = await asaasConnector.readWebhook(
        delivery({ id: "evt_1", event: "PAYMENT_RECEIVED" }, token),
      )

      expect(reading).toMatchObject({ ok: false, status: 401 })
    })
  })

  describe("parsing", () => {
    it("refuses with 400 a body that is not json", async () => {
      const reading = await asaasConnector.readWebhook(delivery("{not json"))

      expect(reading).toMatchObject({ ok: false, status: 400 })
    })

    it("refuses with 400 a body that is not an Asaas event", async () => {
      const reading = await asaasConnector.readWebhook(
        delivery({ hello: "world" }),
      )

      expect(reading).toMatchObject({ ok: false, status: 400 })
    })

    it("accepts fields it was not told about, and keeps the raw payload", async () => {
      const body = {
        id: "evt_1",
        event: "PAYMENT_RECEIVED",
        somethingNew: { nested: true },
        payment: { ...charge, brandNewField: "value" },
      }

      const reading = await asaasConnector.readWebhook(delivery(body))

      expect(reading).toMatchObject({ ok: true, payload: body })
    })

    it("carries the ids every event is matched by", async () => {
      expect(
        await read({
          id: "evt_1",
          event: "PAYMENT_RECEIVED",
          payment: { ...charge, installment: "ins_1" },
        }),
      ).toMatchObject({
        eventId: "evt_1",
        providerType: "PAYMENT_RECEIVED",
        chargeId: "pay_1",
        planId: "ins_1",
        reference: "payment-uuid",
      })
    })

    it("reads an event with no payment, like a checkout one, as ignored", async () => {
      expect(await read({ id: "evt_1", event: "CHECKOUT_PAID" })).toMatchObject(
        {
          type: "ignored",
          chargeId: null,
          planId: null,
          reference: null,
        },
      )
    })
  })

  describe("translation", () => {
    it.each(["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED"])(
      "reads %s as paid, in cents",
      async (event) => {
        expect(
          await read({ id: "evt_1", event, payment: charge }),
        ).toMatchObject({ type: "paid", amount: 22199 })
      },
    )

    it.each([
      ["PAYMENT_OVERDUE", "overdue"],
      ["PAYMENT_DELETED", "cancelled"],
      ["PAYMENT_RESTORED", "restored"],
      ["PAYMENT_REFUND_IN_PROGRESS", "refund_in_progress"],
      ["PAYMENT_CREATED", "ignored"],
      ["PAYMENT_CHECKOUT_VIEWED", "ignored"],
    ])("reads %s as %s", async (event, type) => {
      expect(await read({ id: "evt_1", event, payment: charge })).toMatchObject(
        {
          type,
        },
      )
    })

    it.each([
      "PAYMENT_CHARGEBACK_REQUESTED",
      "PAYMENT_CHARGEBACK_DISPUTE",
      "PAYMENT_AWAITING_CHARGEBACK_REVERSAL",
      "PAYMENT_CREDIT_CARD_CAPTURE_REFUSED",
      "PAYMENT_REPROVED_BY_RISK_ANALYSIS",
    ])("reads %s as an alarm", async (event) => {
      expect(await read({ id: "evt_1", event, payment: charge })).toMatchObject(
        {
          type: "alarm",
        },
      )
    })

    it("reads PAYMENT_UPDATED with its value in cents and the end of its due day in São Paulo", async () => {
      expect(
        await read({
          id: "evt_1",
          event: "PAYMENT_UPDATED",
          payment: { ...charge, value: 150, dueDate: "2026-10-05" },
        }),
      ).toMatchObject({
        type: "updated",
        amount: 15000,
        dueAt: "2026-10-06T02:59:59.000Z",
      })
    })

    it("reads a PAYMENT_UPDATED due date it cannot parse as no due date", async () => {
      expect(
        await read({
          id: "evt_1",
          event: "PAYMENT_UPDATED",
          payment: { ...charge, dueDate: "05/10/2026" },
        }),
      ).toMatchObject({ type: "updated", dueAt: null })
    })

    it("reads the refunds a charge lists, in cents, by where they stand", async () => {
      expect(
        await read({
          id: "evt_1",
          event: "PAYMENT_PARTIALLY_REFUNDED",
          payment: {
            ...charge,
            refunds: [
              { value: 30, status: "DONE" },
              { value: 20, status: "PENDING" },
              { value: 10, status: "CANCELLED" },
            ],
          },
        }),
      ).toMatchObject({
        type: "partially_refunded",
        refunds: [
          { amount: 3000, state: "done" },
          { amount: 2000, state: "pending" },
          { amount: 1000, state: "cancelled" },
        ],
      })
    })

    it("reads a PAYMENT_REFUNDED that lists nothing as the whole charge given back", async () => {
      expect(
        await read({ id: "evt_1", event: "PAYMENT_REFUNDED", payment: charge }),
      ).toMatchObject({
        type: "refunded",
        refunds: [{ amount: 22199, state: "done" }],
      })
    })

    it("reads a partial refund that lists nothing as not saying how much moved", async () => {
      expect(
        await read({
          id: "evt_1",
          event: "PAYMENT_PARTIALLY_REFUNDED",
          payment: charge,
        }),
      ).toMatchObject({ type: "partially_refunded", refunds: null })
    })

    it("reads PAYMENT_REFUND_DENIED with the reason Asaas sends outside the documented payload", async () => {
      expect(
        await read({
          id: "evt_1",
          event: "PAYMENT_REFUND_DENIED",
          payment: charge,
          additionalInfo: { denialReason: "Saldo insuficiente." },
        }),
      ).toMatchObject({ type: "refund_denied", reason: "Saldo insuficiente." })
    })

    it("reads a denial without a reason as one", async () => {
      expect(
        await read({
          id: "evt_1",
          event: "PAYMENT_REFUND_DENIED",
          payment: charge,
        }),
      ).toMatchObject({ type: "refund_denied", reason: null })
    })
  })
})
