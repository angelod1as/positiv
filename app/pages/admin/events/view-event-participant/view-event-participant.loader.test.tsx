import { NoResultError, type QueryNode } from "kysely"
import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  getEventParticipantBasic,
  getProfileById,
} from "~/business/admin/admin.server"
import { getContext } from "~/business/auth/auth.server"
import { defaultSettings } from "~/test/request-context"
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

vi.mock("~/business/auth/auth.server", () => ({
  getContext: vi.fn(),
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
    vi.mocked(getContext).mockResolvedValue({
      settings: defaultSettings,
    } as Awaited<ReturnType<typeof getContext>>)
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
})
