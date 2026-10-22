import { NoResultError, type QueryNode } from "kysely"
import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  getEventParticipantBasic,
  getParticipantFullEventHistory,
  getProfileById,
} from "~/business/admin/admin.server"
import { getPaymentsForParticipant } from "~/business/payment/payment-totals.server"
import { isOnlinePaymentsEnabled } from "~/business/settings/app-settings.server"
import { loader } from "./view-event-participant"

const { logger } = vi.hoisted(() => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

vi.mock("~/lib/logger/logger.server", () => ({
  logger: { ...logger, child: () => logger },
}))

vi.mock("~/business/admin/admin.server", () => ({
  getAdminContext: vi.fn(),
  getEventParticipantBasic: vi.fn(),
  getParticipantFullEventHistory: vi.fn(),
  getProfileById: vi.fn(),
  updateEventParticipantById: vi.fn(),
  updateProfileAdminNotes: vi.fn(),
  updateProfileApprovalStatus: vi.fn(),
}))

vi.mock("~/business/settings/app-settings.server", () => ({
  isCardPaymentsEnabled: vi.fn(async () => true),
  isOnlinePaymentsEnabled: vi.fn(),
}))

vi.mock("~/business/payment/payment-totals.server", () => ({
  getPaymentsForParticipant: vi.fn(async () => []),
}))

vi.mock("~/business/payment/payment-messages.server", async (importActual) => ({
  ...(await importActual<
    typeof import("~/business/payment/payment-messages.server")
  >()),
  loadWhatsappPaymentMessage: vi.fn(
    async () => "Oi {{nome}}, pague {{link}} até {{data}}.",
  ),
}))

type ProfileResult = Awaited<ReturnType<typeof getProfileById>>
type ParticipantResult = Awaited<ReturnType<typeof getEventParticipantBasic>>

const runLoader = () =>
  loader({
    request: new Request("http://localhost/admin/eventos/3f2b8c1e-9a4d-4e7b-8c2a-1d5e6f7a8b9c/7c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f"),
    params: { eventId: "3f2b8c1e-9a4d-4e7b-8c2a-1d5e6f7a8b9c", profileId: "7c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f" },
  } as Parameters<typeof loader>[0])

describe("view event participant loader", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(isOnlinePaymentsEnabled).mockResolvedValue(false)
    vi.mocked(getProfileById).mockResolvedValue({
      success: true,
      data: { id: "7c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f" },
      errors: [],
    } as unknown as ProfileResult)
    vi.mocked(getEventParticipantBasic).mockResolvedValue({
      success: true,
      data: null,
      errors: [],
    } as unknown as ParticipantResult)
  })

  it("warns, without alerting, when the profile does not exist", async () => {
    vi.mocked(getProfileById).mockResolvedValue({
      success: false,
      errors: [new NoResultError({} as QueryNode)],
    } as ProfileResult)

    const response = await runLoader()

    expect(response).toBeInstanceOf(Response)
    expect(logger.warn).toHaveBeenCalledWith("Profile not found", {
      profileId: "7c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f",
    })
    expect(logger.error).not.toHaveBeenCalled()
  })

  it("logs an error when the profile cannot be fetched", async () => {
    const errors = [new Error("connection lost")]
    vi.mocked(getProfileById).mockResolvedValue({
      success: false,
      errors,
    } as ProfileResult)

    const response = await runLoader()

    expect(response).toBeInstanceOf(Response)
    expect(logger.error).toHaveBeenCalledWith("Failed to fetch profile", {
      profileId: "7c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f",
      errors,
    })
  })

  it("warns, without alerting, when the person has not applied to the event", async () => {
    const response = await runLoader()

    expect(response).toBeInstanceOf(Response)
    expect(logger.warn).toHaveBeenCalledWith(
      "Participant has not applied to this event",
      { profileId: "7c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f", eventId: "3f2b8c1e-9a4d-4e7b-8c2a-1d5e6f7a8b9c" },
    )
    expect(logger.error).not.toHaveBeenCalled()
  })

  it("logs an error when the event participant cannot be fetched", async () => {
    const errors = [new Error("connection lost")]
    vi.mocked(getEventParticipantBasic).mockResolvedValue({
      success: false,
      errors,
    } as ParticipantResult)

    const response = await runLoader()

    expect(response).toBeInstanceOf(Response)
    expect(logger.error).toHaveBeenCalledWith(
      "Failed to fetch event participant",
      { profileId: "7c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f", eventId: "3f2b8c1e-9a4d-4e7b-8c2a-1d5e6f7a8b9c", errors },
    )
  })

  it.each([true, false])(
    "hands the payment modal the online payments switch (%s)",
    async (enabled) => {
      vi.mocked(isOnlinePaymentsEnabled).mockResolvedValue(enabled)
      vi.mocked(getEventParticipantBasic).mockResolvedValue({
        success: true,
        data: { id: "participant-1" },
        errors: [],
      } as unknown as ParticipantResult)
      vi.mocked(getParticipantFullEventHistory).mockResolvedValue({
        success: true,
        data: [],
        errors: [],
      } as unknown as Awaited<
        ReturnType<typeof getParticipantFullEventHistory>
      >)

      const result = await runLoader()

      expect(result).toMatchObject({
        paymentsEnabled: enabled,
        providerName: "Asaas",
      })
    },
  )

  it("hands the modal a message built for the active charge, named by social_name", async () => {
    vi.mocked(getProfileById).mockResolvedValue({
      success: true,
      data: {
        id: "7c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f",
        social_name: "Ana Social",
        full_name: "Ana Legal",
      },
      errors: [],
    } as unknown as ProfileResult)
    vi.mocked(getEventParticipantBasic).mockResolvedValue({
      success: true,
      data: { id: "participant-1", event_title: "Festa" },
      errors: [],
    } as unknown as ParticipantResult)
    vi.mocked(getParticipantFullEventHistory).mockResolvedValue({
      success: true,
      data: [],
      errors: [],
    } as unknown as Awaited<ReturnType<typeof getParticipantFullEventHistory>>)
    vi.mocked(getPaymentsForParticipant).mockResolvedValue({
      active: { id: "pay-1", due_at: "2026-09-01T12:00:00Z", base_amount: 25000 },
      payments: [],
      totals: {},
    } as unknown as Awaited<ReturnType<typeof getPaymentsForParticipant>>)

    const { whatsappMessage } = (await runLoader()) as {
      whatsappMessage: string | null
    }

    expect(whatsappMessage).toContain("Ana Social")
    expect(whatsappMessage).toContain("/pagamento/pay-1")
    expect(whatsappMessage).toContain("01/09/2026")
  })

  it("hands the modal no message when there is no active charge", async () => {
    vi.mocked(getProfileById).mockResolvedValue({
      success: true,
      data: { id: "7c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f", full_name: "Ana" },
      errors: [],
    } as unknown as ProfileResult)
    vi.mocked(getEventParticipantBasic).mockResolvedValue({
      success: true,
      data: { id: "participant-1", event_title: "Festa" },
      errors: [],
    } as unknown as ParticipantResult)
    vi.mocked(getParticipantFullEventHistory).mockResolvedValue({
      success: true,
      data: [],
      errors: [],
    } as unknown as Awaited<ReturnType<typeof getParticipantFullEventHistory>>)
    vi.mocked(getPaymentsForParticipant).mockResolvedValue({
      active: null,
      payments: [],
      totals: {},
    } as unknown as Awaited<ReturnType<typeof getPaymentsForParticipant>>)

    const { whatsappMessage } = (await runLoader()) as {
      whatsappMessage: string | null
    }

    expect(whatsappMessage).toBeNull()
  })
})
