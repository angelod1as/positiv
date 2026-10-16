import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  getAdminEventById,
  getProfilesWithExtraDataById,
  getRejectedEventParticipants,
} from "~/business/admin/admin.server"
import { listInvitesForEvent } from "~/business/admin/event-invites.server"
import { getPaymentsForEvent } from "~/business/payment/payment-totals.server"
import { isOnlinePaymentsEnabled } from "~/business/settings/app-settings.server"
import { loader } from "./view-event-page"

const { logger } = vi.hoisted(() => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

vi.mock("~/lib/logger/logger.server", () => ({ logger }))

vi.mock("~/business/admin/admin.server", () => ({
  getAdminContext: vi.fn(),
  getAdminEventById: vi.fn(),
  getEventDemographicsById: vi.fn(),
  getProfilesWithExtraDataById: vi.fn(),
  getRejectedEventParticipants: vi.fn(),
}))

vi.mock("~/business/settings/app-settings.server", () => ({
  isCardPaymentsEnabled: vi.fn(async () => true),
  isOnlinePaymentsEnabled: vi.fn(),
}))

vi.mock("~/business/admin/event-invites.server", () => ({
  listInvitesForEvent: vi.fn(),
}))

vi.mock("~/business/payment/payment-totals.server", () => ({
  getPaymentsForEvent: vi.fn(),
}))

vi.mock("~/business/payment/payment-messages.server", async (importActual) => ({
  ...(await importActual<
    typeof import("~/business/payment/payment-messages.server")
  >()),
  loadWhatsappPaymentMessage: vi.fn(
    async () => "Oi {{nome}}, pague {{link}} até {{data}}.",
  ),
}))

const runLoader = () =>
  loader({
    request: new Request("http://localhost/admin/eventos/event-1"),
    params: { id: "event-1" },
  } as Parameters<typeof loader>[0])

describe("view event page loader", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(isOnlinePaymentsEnabled).mockResolvedValue(false)
    vi.mocked(getAdminEventById).mockResolvedValue({
      success: true,
      data: { id: "event-1", event_status: "Open" },
      errors: [],
    } as unknown as Awaited<ReturnType<typeof getAdminEventById>>)
    vi.mocked(getProfilesWithExtraDataById).mockResolvedValue({
      success: true,
      data: [],
      errors: [],
    } as unknown as Awaited<ReturnType<typeof getProfilesWithExtraDataById>>)
    vi.mocked(getPaymentsForEvent).mockResolvedValue({})
    vi.mocked(listInvitesForEvent).mockResolvedValue([])
  })

  it("logs a failed rejected-participants fetch and still renders the page", async () => {
    const error = new Error("connection lost")
    vi.mocked(getRejectedEventParticipants).mockRejectedValue(error)

    const data = await runLoader()

    expect(data.rejectedParticipants).toEqual([])
    expect(logger.error).toHaveBeenCalledWith(
      "Failed to fetch rejected participants",
      { error },
    )
  })

  it.each([true, false])(
    "hands the payment modal the online payments switch (%s)",
    async (enabled) => {
      vi.mocked(isOnlinePaymentsEnabled).mockResolvedValue(enabled)
      vi.mocked(getRejectedEventParticipants).mockResolvedValue([])

      const result = await runLoader()

      expect(result).toMatchObject({
        paymentsEnabled: enabled,
        providerName: "Asaas",
      })
    },
  )

  it("builds a WhatsApp message per participant, keyed by id, for the active charge", async () => {
    vi.mocked(getProfilesWithExtraDataById).mockResolvedValue({
      success: true,
      data: [
        {
          id: "ep-1",
          active_payment_id: "pay-1",
          social_name: "Ana Social",
          full_name: "Ana Legal",
        },
        {
          id: "ep-2",
          active_payment_id: null,
          social_name: null,
          full_name: "Bia",
        },
      ],
      errors: [],
    } as unknown as Awaited<ReturnType<typeof getProfilesWithExtraDataById>>)
    vi.mocked(getPaymentsForEvent).mockResolvedValue({
      "ep-1": [
        { id: "pay-1", due_at: "2026-09-01T12:00:00Z", base_amount: 25000 },
      ],
    } as unknown as Awaited<ReturnType<typeof getPaymentsForEvent>>)

    const { whatsappMessageByParticipant } = (await runLoader()) as {
      whatsappMessageByParticipant: Record<string, string | null>
    }

    // The active charge's message, named by social_name over full_name.
    expect(whatsappMessageByParticipant["ep-1"]).toContain("Ana Social")
    expect(whatsappMessageByParticipant["ep-1"]).toContain("/pagamento/pay-1")
    // No active charge: no message to copy.
    expect(whatsappMessageByParticipant["ep-2"]).toBeNull()
  })
})
