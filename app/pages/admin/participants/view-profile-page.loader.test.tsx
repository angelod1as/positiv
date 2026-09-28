import { NoResultError, type QueryNode } from "kysely"
import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  getParticipantFullEventHistory,
  getProfileById,
} from "~/business/admin/admin.server"
import { loader } from "./view-profile-page"

const { logger } = vi.hoisted(() => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

vi.mock("~/lib/logger/logger.server", () => ({ logger }))

vi.mock("~/business/admin/admin.server", () => ({
  getAdminContext: vi.fn(),
  getParticipantFullEventHistory: vi.fn(),
  getProfileById: vi.fn(),
  updateProfileAdminNotes: vi.fn(),
  updateProfileApprovalStatus: vi.fn(),
}))

type ProfileResult = Awaited<ReturnType<typeof getProfileById>>
type HistoryResult = Awaited<ReturnType<typeof getParticipantFullEventHistory>>

const runLoader = () =>
  loader({
    request: new Request("http://localhost/admin/perfis/profile-1"),
    params: { profileId: "profile-1" },
  } as Parameters<typeof loader>[0])

describe("view profile page loader", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getProfileById).mockResolvedValue({
      success: true,
      data: { id: "profile-1" },
      errors: [],
    } as unknown as ProfileResult)
    vi.mocked(getParticipantFullEventHistory).mockResolvedValue({
      success: true,
      data: [],
      errors: [],
    } as unknown as HistoryResult)
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

  it("logs an error when the history cannot be fetched and still shows the profile", async () => {
    const errors = [new Error("connection lost")]
    vi.mocked(getParticipantFullEventHistory).mockResolvedValue({
      success: false,
      errors,
    } as HistoryResult)

    const data = await runLoader()

    expect(data).toMatchObject({ fullHistory: [] })
    expect(logger.error).toHaveBeenCalledWith(
      "Failed to fetch participant history",
      { profileId: "profile-1", errors },
    )
  })
})
