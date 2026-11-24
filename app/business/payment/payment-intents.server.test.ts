import { beforeEach, describe, expect, it, vi } from "vitest"
import { PERMISSIONS } from "~/business/auth/permissions"
import { errorsCopy } from "~/copy/errors"
import {
  cancelManualPayment,
  editManualPayment,
  registerManualPayment,
} from "./manual-payment.server"
import { cancelPayment } from "./payment-cancel.server"
import { handlePaymentIntent } from "./payment-intents.server"
import { createPaymentOffer, resendPaymentOffer } from "./payment-offer.server"
import { markManualRefunded } from "./payment-refund.server"
import { syncPaymentFromProvider } from "./payment-sync.server"

vi.mock("./manual-payment.server", () => ({
  cancelManualPayment: vi.fn(),
  editManualPayment: vi.fn(),
  registerManualPayment: vi.fn(),
}))
vi.mock("./payment-cancel.server", () => ({ cancelPayment: vi.fn() }))
vi.mock("./payment-offer.server", () => ({
  createPaymentOffer: vi.fn(),
  resendPaymentOffer: vi.fn(),
}))
vi.mock("./payment-refund.server", () => ({ markManualRefunded: vi.fn() }))
vi.mock("./payment-sync.server", () => ({ syncPaymentFromProvider: vi.fn() }))

const HANDLERS = {
  "payment-offer": createPaymentOffer,
  "payment-resend": resendPaymentOffer,
  "payment-sync": syncPaymentFromProvider,
  "payment-manual": registerManualPayment,
  "payment-manual-edit": editManualPayment,
  "payment-manual-cancel": cancelManualPayment,
  "payment-manual-refund": markManualRefunded,
  "payment-cancel": cancelPayment,
} as const

const INTENTS = Object.keys(HANDLERS) as (keyof typeof HANDLERS)[]

const treasurer = {
  id: "treasurer-1",
  permissions: [PERMISSIONS.ADMIN_PANEL, PERMISSIONS.PAYMENTS_MANAGE],
}
const interviewer = { id: "interviewer-1", permissions: [PERMISSIONS.ADMIN_PANEL] }

describe("handlePaymentIntent", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    for (const handler of Object.values(HANDLERS)) {
      vi.mocked(handler).mockResolvedValue({ success: true } as never)
    }
  })

  it.each(INTENTS)("runs %s for a person who handles payments", async (intent) => {
    const result = await handlePaymentIntent(intent, new FormData(), treasurer)

    expect(result).toMatchObject({ success: true, intent })
    expect(HANDLERS[intent]).toHaveBeenCalledOnce()
  })

  it.each(INTENTS)(
    "refuses %s to a person in the admin area without payments.manage",
    async (intent) => {
      const result = await handlePaymentIntent(intent, new FormData(), interviewer)

      expect(result).toEqual({
        success: false,
        intent,
        errors: [{ message: errorsCopy.auth.paymentsPermissionRequired }],
      })
      expect(HANDLERS[intent]).not.toHaveBeenCalled()
    },
  )

  it("refuses a payment intent when nobody is signed in", async () => {
    const result = await handlePaymentIntent("payment-manual", new FormData(), null)

    expect(result).toMatchObject({ success: false, intent: "payment-manual" })
    expect(registerManualPayment).not.toHaveBeenCalled()
  })

  it("records who opened a charge", async () => {
    const formData = new FormData()
    formData.set("eventParticipantId", "ep-1")

    await handlePaymentIntent("payment-offer", formData, treasurer)

    expect(createPaymentOffer).toHaveBeenCalledWith({
      eventParticipantId: "ep-1",
      createdBy: "treasurer-1",
    })
  })

  it("answers null for an intent that is not a payment, whoever asks", async () => {
    expect(
      await handlePaymentIntent("update-event-participant", new FormData(), interviewer),
    ).toBeNull()
  })
})
