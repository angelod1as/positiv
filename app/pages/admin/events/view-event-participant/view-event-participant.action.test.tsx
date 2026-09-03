import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  getAdminContext,
  updateEventParticipantById,
  updateProfileAdminNotes,
  updateProfileApprovalStatus,
} from "~/business/admin/admin.server"
import { cancelPayment } from "~/business/payment/payment-cancel.server"
import { markManualRefunded } from "~/business/payment/payment-refund.server"
import { registerManualPayment } from "~/business/payment/manual-payment.server"
import { action } from "./view-event-participant"

vi.mock("~/business/admin/admin.server", () => ({
  getAdminContext: vi.fn(),
  getEventParticipantBasic: vi.fn(),
  getParticipantFullEventHistory: vi.fn(),
  getProfileById: vi.fn(),
  updateEventParticipantById: vi.fn(),
  updateProfileAdminNotes: vi.fn(),
  updateProfileApprovalStatus: vi.fn(),
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

const buildRequest = (fields: Record<string, string>) =>
  new Request("http://localhost/admin/eventos/event-1/participantes/profile-1", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(fields).toString(),
  })

const params = { eventId: "event-1", profileId: "profile-1" }

const runAction = (fields: Record<string, string>) =>
  action({ request: buildRequest(fields), params } as Parameters<
    typeof action
  >[0])

const INTENTS = [
  {
    intent: "update-profile-approval-status",
    fields: { profile_id: "profile-1", approved_to_attend: "approved" },
    mutation: updateProfileApprovalStatus,
  },
  {
    intent: "update-profile-admin-notes",
    fields: { profile_id: "profile-1", admin_notes: "a note" },
    mutation: updateProfileAdminNotes,
  },
  {
    intent: "update-event-participant",
    fields: { id: "participant-1", spot_type: "social" },
    mutation: updateEventParticipantById,
  },
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

describe("ViewEventParticipant action", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getAdminContext).mockResolvedValue({
      currentProfile: { id: "admin-1" },
    } as Awaited<ReturnType<typeof getAdminContext>>)
    vi.mocked(updateProfileApprovalStatus).mockResolvedValue({
      success: true,
    } as never)
    vi.mocked(updateProfileAdminNotes).mockResolvedValue({
      success: true,
    } as never)
    vi.mocked(updateEventParticipantById).mockResolvedValue({
      success: true,
    } as never)
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

    it("should run for an admin", async () => {
      await runAction({ intent, ...fields })

      expect(getAdminContext).toHaveBeenCalledTimes(1)
      expect(mutation).toHaveBeenCalledTimes(1)
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

  it("should report a failed payment back to the modal", async () => {
    vi.mocked(cancelPayment).mockResolvedValue({
      success: false,
      errors: [{ message: "Só é possível cancelar uma cobrança em aberto." }],
    } as never)

    const result = await runAction({
      intent: "payment-cancel",
      paymentId: "payment-1",
    })

    expect(result).toMatchObject({
      success: false,
      intent: "payment-cancel",
      errors: [{ message: "Só é possível cancelar uma cobrança em aberto." }],
    })
  })
})
