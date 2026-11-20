import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  getLikertSubmission,
  listLikertSubmissions,
} from "./likert-submissions.server"
import type { LikertSubmission } from "./likert-submissions.server"
import { getParticipantLikert } from "./participant-likert.server"

const { logger } = vi.hoisted(() => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

vi.mock("~/lib/logger/logger.server", () => ({ logger }))

vi.mock("./likert-submissions.server", () => ({
  listLikertSubmissions: vi.fn(),
  getLikertSubmission: vi.fn(),
}))

const profileId = "7c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f"
const viewer = { id: "11111111-2222-4333-8444-555555555555", permissions: [] }
const latestId = "aaaaaaaa-1111-4111-8111-111111111111"
const olderId = "bbbbbbbb-2222-4222-8222-222222222222"

const summaries = [
  { id: latestId, submittedAt: new Date("2026-11-10T12:00:00Z") },
  { id: olderId, submittedAt: new Date("2026-10-01T12:00:00Z") },
]

const submission = (id: string): LikertSubmission => ({
  id,
  profileId,
  submittedAt: new Date("2026-11-10T12:00:00Z"),
  beenTo: [],
  nonMonogamySince: null,
  answers: [
    {
      statementKey: "s1",
      statementText: "Uma afirmação",
      answer: 4,
      comment: null,
    },
  ],
})

describe("getParticipantLikert", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(listLikertSubmissions).mockResolvedValue(summaries)
    vi.mocked(getLikertSubmission).mockImplementation(async (id) =>
      submission(id),
    )
  })

  it("has nothing to show for someone who never answered", async () => {
    vi.mocked(listLikertSubmissions).mockResolvedValue([])

    const likert = await getParticipantLikert({ profileId, viewer })

    expect(likert).toEqual({ submissions: [], selected: null })
    expect(getLikertSubmission).not.toHaveBeenCalled()
  })

  it("opens the latest submission when none is asked for", async () => {
    const likert = await getParticipantLikert({ profileId, viewer })

    expect(listLikertSubmissions).toHaveBeenCalledWith(profileId, viewer)
    expect(getLikertSubmission).toHaveBeenCalledWith(latestId, viewer)
    expect(likert).toEqual({
      submissions: summaries,
      selected: submission(latestId),
    })
  })

  it("opens an earlier submission of this person when asked", async () => {
    const likert = await getParticipantLikert({
      profileId,
      viewer,
      submissionId: olderId,
    })

    expect(getLikertSubmission).toHaveBeenCalledWith(olderId, viewer)
    expect(likert?.selected?.id).toBe(olderId)
  })

  it.each([
    ["not a uuid", "garbage"],
    ["another person's submission", "cccccccc-3333-4333-8333-333333333333"],
  ])("falls back to the latest when asked for %s", async (_, submissionId) => {
    const likert = await getParticipantLikert({
      profileId,
      viewer,
      submissionId,
    })

    expect(getLikertSubmission).toHaveBeenCalledWith(latestId, viewer)
    expect(likert?.selected?.id).toBe(latestId)
  })

  it("logs and gives up when the answers cannot be read", async () => {
    const error = new Error("connection lost")
    vi.mocked(listLikertSubmissions).mockRejectedValue(error)

    const likert = await getParticipantLikert({ profileId, viewer })

    expect(likert).toBeNull()
    expect(logger.error).toHaveBeenCalledWith(
      "Failed to fetch Likert submissions",
      { profileId, error },
    )
  })
})
