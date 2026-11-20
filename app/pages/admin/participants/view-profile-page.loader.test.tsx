import { NoResultError, type QueryNode } from "kysely"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { getAdminContext } from "~/business/auth/admin-context.server"
import { getParticipantLikert } from "~/business/profile/participant-likert.server"
import { getParticipantFullEventHistory, getProfileById } from "~/business/profile/profiles.server"
import { loader } from "./view-profile-page"

const { logger } = vi.hoisted(() => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

vi.mock("~/lib/logger/logger.server", () => ({ logger }))

vi.mock("~/business/profile/cpf-exemption.server", () => ({
  setProfileCpfExempt: vi.fn(),
}))

vi.mock("~/business/auth/admin-context.server", () => ({
  getAdminContext: vi.fn(),
}))
vi.mock("~/business/profile/participant-likert.server", () => ({
  getParticipantLikert: vi.fn(),
}))
vi.mock("~/business/profile/profiles.server", () => ({
  getParticipantFullEventHistory: vi.fn(),
  getProfileById: vi.fn(),
  updateProfileAdminNotes: vi.fn(),
  updateProfileApprovalStatus: vi.fn(),
}))

type ProfileResult = Awaited<ReturnType<typeof getProfileById>>
type HistoryResult = Awaited<ReturnType<typeof getParticipantFullEventHistory>>
type AdminContext = Awaited<ReturnType<typeof getAdminContext>>

const currentProfile = {
  id: "11111111-2222-4333-8444-555555555555",
  permissions: ["admin.panel", "profiles.manage"],
}

const runLoader = (search = "") =>
  loader({
    request: new Request(
      `http://localhost/admin/participantes/7c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f${search}`,
    ),
    params: { profileId: "7c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f" },
  } as Parameters<typeof loader>[0])

describe("view profile page loader", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getAdminContext).mockResolvedValue({
      currentProfile,
    } as unknown as AdminContext)
    vi.mocked(getParticipantLikert).mockResolvedValue({
      submissions: [],
      selected: null,
    })
    vi.mocked(getProfileById).mockResolvedValue({
      success: true,
      data: { id: "7c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f" },
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
      { profileId: "7c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f", errors },
    )
  })

  it("hands the page the Likert submission the admin asked to open", async () => {
    const likert = {
      submissions: [
        {
          id: "aaaaaaaa-1111-4111-8111-111111111111",
          submittedAt: new Date("2026-11-10T12:00:00Z"),
        },
      ],
      selected: null,
    }
    vi.mocked(getParticipantLikert).mockResolvedValue(likert)

    const data = await runLoader("?envio=aaaaaaaa-1111-4111-8111-111111111111")

    expect(getParticipantLikert).toHaveBeenCalledWith({
      profileId: "7c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f",
      viewer: currentProfile,
      submissionId: "aaaaaaaa-1111-4111-8111-111111111111",
    })
    expect(data).toMatchObject({ likert })
  })
})
