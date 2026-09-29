import { NoResultError, type QueryNode } from "kysely"
import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  getEventParticipantBasic,
  getParticipantFullEventHistory,
  getProfileById,
} from "~/business/admin/admin.server"
import { isOnlinePaymentsEnabled } from "~/business/settings/app-settings.server"
import { loader } from "./view-event-participant"

const { logger } = vi.hoisted(() => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

vi.mock("~/lib/logger/logger.server", () => ({ logger }))

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

type ProfileResult = Awaited<ReturnType<typeof getProfileById>>
type ParticipantResult = Awaited<ReturnType<typeof getEventParticipantBasic>>

const runLoader = () =>
  loader({
    request: new Request("http://localhost/admin/eventos/event-1/profile-1"),
    params: { eventId: "event-1", profileId: "profile-1" },
  } as Parameters<typeof loader>[0])

describe("view event participant loader", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(isOnlinePaymentsEnabled).mockResolvedValue(false)
    vi.mocked(getProfileById).mockResolvedValue({
      success: true,
      data: { id: "profile-1" },
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
      profileId: "profile-1",
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
      profileId: "profile-1",
      errors,
    })
  })

  it("warns, without alerting, when the person has not applied to the event", async () => {
    const response = await runLoader()

    expect(response).toBeInstanceOf(Response)
    expect(logger.warn).toHaveBeenCalledWith(
      "Participant has not applied to this event",
      { profileId: "profile-1", eventId: "event-1" },
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
      { profileId: "profile-1", eventId: "event-1", errors },
    )
  })

  it.each([true, false])(
    "hands the payment modal the online and card payments switches (%s)",
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
        cardPaymentsEnabled: true,
      })
    },
  )
})
