import { beforeEach, describe, expect, it, vi } from "vitest"
import { getAdminContext } from "~/business/admin/admin.server"
import { registerManualPayment } from "~/business/payment/manual-payment.server"
import { cancelPayment } from "~/business/payment/payment-cancel.server"
import { markManualRefunded } from "~/business/payment/payment-refund.server"
import { action } from "./view-event-page"

vi.mock("~/business/admin/admin.server", () => ({
  getAdminContext: vi.fn(),
  getAdminEventById: vi.fn(),
  getEventDemographicsById: vi.fn(),
  getProfilesWithExtraDataById: vi.fn(),
  getRejectedEventParticipants: vi.fn(),
}))

vi.mock("~/business/admin/event-listmonk-sync.server", () => ({
  listmonkSyncFiltersSchema: { safeParse: vi.fn() },
  updateEventListmonkList: vi.fn(),
}))

vi.mock("~/business/payment/manual-payment.server", () => ({
  registerManualPayment: vi.fn(),
}))

vi.mock("~/business/payment/payment-refund.server", () => ({
  markManualRefunded: vi.fn(),
}))

vi.mock("~/business/payment/payment-cancel.server", () => ({
  cancelPayment: vi.fn(),
}))

const params = { id: "event-1" }

const runAction = (fields: Record<string, string>) =>
  action({
    request: new Request("http://localhost/admin/eventos/event-1", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(fields).toString(),
    }),
    params,
  } as Parameters<typeof action>[0])

const INTENTS = [
  {
    intent: "payment-manual",
    fields: {
      eventParticipantId: "participant-1",
      amount: "150",
      method: "pix",
      paidAt: "2026-08-20",
    },
    mutation: registerManualPayment,
  },
  {
    intent: "payment-manual-refund",
    fields: { paymentId: "payment-1", amount: "50" },
    mutation: markManualRefunded,
  },
  {
    intent: "payment-cancel",
    fields: { paymentId: "payment-1" },
    mutation: cancelPayment,
  },
] as const

describe("AdminViewEventPage action", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getAdminContext).mockResolvedValue({
      currentProfile: { id: "admin-1" },
    } as Awaited<ReturnType<typeof getAdminContext>>)
    vi.mocked(registerManualPayment).mockResolvedValue({
      success: true,
    } as never)
    vi.mocked(markManualRefunded).mockResolvedValue({ success: true } as never)
    vi.mocked(cancelPayment).mockResolvedValue({ success: true } as never)
  })

  describe.each(INTENTS)("$intent", ({ intent, fields, mutation }) => {
    it("should refuse to run for a non-admin", async () => {
      vi.mocked(getAdminContext).mockRejectedValue(
        new Response(null, { status: 302 }),
      )

      await expect(runAction({ intent, ...fields })).rejects.toBeInstanceOf(
        Response,
      )

      expect(mutation).not.toHaveBeenCalled()
    })

    it("should run for an admin and name the intent in the answer", async () => {
      const result = await runAction({ intent, ...fields })

      expect(mutation).toHaveBeenCalledTimes(1)
      expect(result).toMatchObject({ success: true, intent })
    })
  })

  it("should record who registered a manual payment", async () => {
    await runAction({
      intent: "payment-manual",
      eventParticipantId: "participant-1",
      amount: "150",
      method: "pix",
      paidAt: "2026-08-20",
    })

    expect(registerManualPayment).toHaveBeenCalledWith(
      expect.objectContaining({ amount: "150", createdBy: "admin-1" }),
    )
  })
})
