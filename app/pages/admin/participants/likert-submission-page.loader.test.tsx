import { beforeEach, describe, expect, it, vi } from "vitest"
import { getAdminContext } from "~/business/auth/admin-context.server"
import { getParticipantLikertSubmission } from "~/business/profile/participant-likert.server"
import { getProfileById } from "~/business/profile/profiles.server"
import { loader } from "./likert-submission-page"

vi.mock("~/business/auth/admin-context.server", () => ({
  getAdminContext: vi.fn(),
}))
vi.mock("~/business/profile/participant-likert.server", () => ({
  getParticipantLikertSubmission: vi.fn(),
}))
vi.mock("~/business/profile/profiles.server", () => ({
  getProfileById: vi.fn(),
}))

type ProfileResult = Awaited<ReturnType<typeof getProfileById>>
type AdminContext = Awaited<ReturnType<typeof getAdminContext>>

const profileId = "7c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f"
const submissionId = "aaaaaaaa-1111-4111-8111-111111111111"
const eventId = "3f2b8c1e-9a4d-4e7b-8c2a-1d5e6f7a8b9c"
const currentProfile = {
  id: "11111111-2222-4333-8444-555555555555",
  permissions: ["admin.panel", "profiles.manage"],
}

const submission = {
  id: submissionId,
  profileId,
  submittedAt: new Date("2026-11-10T12:00:00Z"),
  beenTo: [],
  nonMonogamySince: null,
  answers: [],
}

const runLoader = (
  params: { profileId: string; submissionId: string } = {
    profileId,
    submissionId,
  },
  search = "",
) =>
  loader({
    request: new Request(
      `http://localhost/admin/participantes/${params.profileId}/escala/${params.submissionId}${search}`,
    ),
    params,
  } as Parameters<typeof loader>[0])

const locationOf = (response: unknown) =>
  (response as Response).headers.get("Location")

describe("Likert submission page loader", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getAdminContext).mockResolvedValue({
      currentProfile,
    } as unknown as AdminContext)
    vi.mocked(getProfileById).mockResolvedValue({
      success: true,
      data: { id: profileId, social_name: "Ana", full_name: "Ana Legal" },
      errors: [],
    } as unknown as ProfileResult)
    vi.mocked(getParticipantLikertSubmission).mockResolvedValue({
      submission,
      newerId: null,
      olderId: "bbbbbbbb-2222-4222-8222-222222222222",
    })
  })

  it("opens the submission as the admin, with the person's name", async () => {
    const data = await runLoader()

    expect(getParticipantLikertSubmission).toHaveBeenCalledWith({
      profileId,
      submissionId,
      viewer: currentProfile,
    })
    expect(data).toEqual({
      profileId,
      name: "Ana",
      eventId: null,
      submission,
      newerId: null,
      olderId: "bbbbbbbb-2222-4222-8222-222222222222",
    })
  })

  it("keeps the event the admin came from", async () => {
    const data = await runLoader(undefined, `?evento=${eventId}`)

    expect(data).toMatchObject({ eventId })
  })

  it("ignores an event that is not an id", async () => {
    const data = await runLoader(undefined, "?evento=../../outra-coisa")

    expect(data).toMatchObject({ eventId: null })
  })

  it("is a 404 when an id in the address is not a uuid", async () => {
    await expect(
      runLoader({ profileId, submissionId: "garbage" }),
    ).rejects.toMatchObject({ status: 404 })
    expect(getParticipantLikertSubmission).not.toHaveBeenCalled()
  })

  it("sends the admin back to the person when the submission is not theirs", async () => {
    vi.mocked(getParticipantLikertSubmission).mockResolvedValue(null)

    const response = await runLoader()

    expect(locationOf(response)).toBe(`/admin/participantes/${profileId}`)
  })

  it("sends the admin back to the event page they came from", async () => {
    vi.mocked(getParticipantLikertSubmission).mockResolvedValue(null)

    const response = await runLoader(undefined, `?evento=${eventId}`)

    expect(locationOf(response)).toBe(
      `/admin/eventos/${eventId}/participantes/${profileId}`,
    )
  })

  it("sends the admin to the list when the person does not exist", async () => {
    vi.mocked(getProfileById).mockResolvedValue({
      success: false,
      errors: [new Error("no result")],
    } as ProfileResult)

    const response = await runLoader()

    expect(locationOf(response)).toBe("/admin/participantes")
  })
})
