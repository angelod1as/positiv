import { describe, expect, it, vi } from "vitest"
import paymentMessagesFixture from "../../../e2e/fixtures/payment-messages.json"
import type { SiteSnapshot } from "~/business/cms/site-snapshot.server"
import { paymentsCopy } from "~/copy/payments"
import type { PaymentRow } from "./payment-totals.server"
import {
  buildWhatsappPaymentMessage,
  DEFAULT_WHATSAPP_PAYMENT_MESSAGE,
  loadWhatsappPaymentMessage,
} from "./payment-messages.server"
import { buildPaymentOptions } from "./pricing"

vi.mock("~/lib/logger/logger.server", () => ({
  logger: { error: vi.fn() },
}))

function cacheOf(paymentMessages: SiteSnapshot["paymentMessages"]) {
  return {
    get: vi.fn(
      async () =>
        ({
          pages: new Map(),
          siteSettings: null,
          paymentMessages,
        }) satisfies SiteSnapshot,
    ),
  }
}

describe("loadWhatsappPaymentMessage", () => {
  it("returns the message the admin edited in the CMS", async () => {
    const cache = cacheOf({ whatsappMessage: "Pague {{link}}." })

    expect(await loadWhatsappPaymentMessage(cache)).toBe("Pague {{link}}.")
  })

  it("falls back to the default when the singleton is missing", async () => {
    const cache = cacheOf(null)

    expect(await loadWhatsappPaymentMessage(cache)).toBe(
      DEFAULT_WHATSAPP_PAYMENT_MESSAGE,
    )
  })

  it("falls back to the default when the snapshot cannot load", async () => {
    const cache = { get: vi.fn(async () => Promise.reject(new Error("down"))) }

    expect(await loadWhatsappPaymentMessage(cache)).toBe(
      DEFAULT_WHATSAPP_PAYMENT_MESSAGE,
    )
  })
})

const activeCharge = {
  id: "abc",
  due_at: "2026-09-01T12:00:00Z",
  base_amount: 25000,
} as PaymentRow

const context = {
  participantName: "Ana",
  eventTitle: "Festa de Setembro",
  appOrigin: "https://www.positivparty.com",
  cardPaymentsEnabled: true,
}

describe("buildWhatsappPaymentMessage", () => {
  it("returns null when there is no active charge", () => {
    expect(
      buildWhatsappPaymentMessage({
        template: DEFAULT_WHATSAPP_PAYMENT_MESSAGE,
        active: null,
        ...context,
      }),
    ).toBeNull()
  })

  it("substitutes the name, event, link, formatted due date and options", () => {
    const message = buildWhatsappPaymentMessage({
      template: DEFAULT_WHATSAPP_PAYMENT_MESSAGE,
      active: activeCharge,
      ...context,
    })

    const options = buildPaymentOptions(activeCharge.base_amount, {
      cardEnabled: true,
    })
    const formas = options
      .map((option) => `• ${paymentsCopy.options.label(option)}`)
      .join("\n")

    expect(message).toContain("Ana")
    expect(message).toContain("Festa de Setembro")
    expect(message).toContain(
      "https://www.positivparty.com/pagamento/abc",
    )
    expect(message).toContain("01/09/2026")
    expect(message).toContain(formas)
  })

  it("honours a template that reorders and omits variables", () => {
    const message = buildWhatsappPaymentMessage({
      template: "{{link}} vence {{data}}",
      active: activeCharge,
      ...context,
    })

    expect(message).toBe(
      "https://www.positivparty.com/pagamento/abc vence 01/09/2026",
    )
  })

  it("falls back to the default when the template has an unknown variable", () => {
    const message = buildWhatsappPaymentMessage({
      template: "Pague {{boleto}} em {{link}}",
      active: activeCharge,
      ...context,
    })

    expect(message).toContain("https://www.positivparty.com/pagamento/abc")
    expect(message).not.toContain("{{boleto}}")
  })
})

describe("DEFAULT_WHATSAPP_PAYMENT_MESSAGE", () => {
  it("matches the seeded message, so the fallback never drifts from the seed", () => {
    expect(DEFAULT_WHATSAPP_PAYMENT_MESSAGE).toBe(
      paymentMessagesFixture.whatsappMessage,
    )
  })
})
