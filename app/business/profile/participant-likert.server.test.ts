import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  getLikertSubmission,
  listLikertSubmissions,
} from "./likert-submissions.server"
import type { LikertSubmission } from "./likert-submissions.server"
import {
  getParticipantLikert,
  getParticipantLikertSubmission,
} from "./participant-likert.server"

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
const middleId = "bbbbbbbb-2222-4222-8222-222222222222"
const oldestId = "cccccccc-3333-4333-8333-333333333333"

const summaries = [
  { id: latestId, submittedAt: new Date("2026-11-10T12:00:00Z") },
  { id: middleId, submittedAt: new Date("2026-10-01T12:00:00Z") },
  { id: oldestId, submittedAt: new Date("2026-08-01T12:00:00Z") },
]

const submission = (id: string): LikertSubmission => ({
  id,
  profileId,
  submittedAt: new Date("2026-10-01T12:00:00Z"),
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

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(listLikertSubmissions).mockResolvedValue(summaries)
  vi.mocked(getLikertSubmission).mockImplementation(async (id) =>
    submission(id),
  )
})

describe("getParticipantLikert", () => {
  it("lists the person's submissions, newest first, as the store gives them", async () => {
    const likert = await getParticipantLikert({ profileId, viewer })

    expect(listLikertSubmissions).toHaveBeenCalledWith(profileId, viewer)
    expect(likert).toEqual(summaries)
    expect(getLikertSubmission).not.toHaveBeenCalled()
  })

  it("logs and gives up when the submissions cannot be read", async () => {
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

describe("getParticipantLikertSubmission", () => {
  it("opens a submission of this person with its newer and older neighbours", async () => {
    const page = await getParticipantLikertSubmission({
      profileId,
      submissionId: middleId,
      viewer,
    })

    expect(getLikertSubmission).toHaveBeenCalledWith(middleId, viewer)
    expect(page).toEqual({
      submission: submission(middleId),
      newerId: latestId,
      olderId: oldestId,
    })
  })

  it("has no newer neighbour for the latest and no older one for the first", async () => {
    const latest = await getParticipantLikertSubmission({
      profileId,
      submissionId: latestId,
      viewer,
    })
    const oldest = await getParticipantLikertSubmission({
      profileId,
      submissionId: oldestId,
      viewer,
    })

    expect(latest).toMatchObject({ newerId: null, olderId: middleId })
    expect(oldest).toMatchObject({ newerId: middleId, olderId: null })
  })

  it("refuses a submission that is not this person's", async () => {
    const page = await getParticipantLikertSubmission({
      profileId,
      submissionId: "dddddddd-4444-4444-8444-444444444444",
      viewer,
    })

    expect(page).toBeNull()
    expect(getLikertSubmission).not.toHaveBeenCalled()
  })
})
