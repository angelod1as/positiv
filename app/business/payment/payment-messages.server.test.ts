import { describe, expect, it, vi } from "vitest"
import paymentMessagesFixture from "../../../e2e/fixtures/payment-messages.json"
import type { SiteSnapshot } from "~/business/cms/site-snapshot.server"
import {
  DEFAULT_WHATSAPP_PAYMENT_MESSAGE,
  loadWhatsappPaymentMessage,
} from "./payment-messages.server"

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

describe("DEFAULT_WHATSAPP_PAYMENT_MESSAGE", () => {
  it("matches the seeded message, so the fallback never drifts from the seed", () => {
    expect(DEFAULT_WHATSAPP_PAYMENT_MESSAGE).toBe(
      paymentMessagesFixture.whatsappMessage,
    )
  })
})
