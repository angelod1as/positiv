import { beforeEach, describe, expect, it, vi } from "vitest"

const mockLogger = { error: vi.fn() }
vi.mock("~/lib/logger/logger.server", () => ({
  logger: mockLogger,
}))

const mockReturningExecute = vi.fn().mockResolvedValue([])
const mockExecute = vi.fn().mockResolvedValue([])

vi.mock("~/kysely-db", () => ({
  kyselyDb: {
    updateTable: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          where: vi.fn(() => ({
            execute: mockExecute,
            returning: vi.fn(() => ({
              execute: mockReturningExecute,
            })),
          })),
        })),
      })),
    })),
    selectFrom: vi.fn(() => ({
      selectAll: vi.fn(() => ({
        where: vi.fn(() => ({
          where: vi.fn(() => ({
            executeTakeFirst: vi.fn().mockResolvedValue(null),
          })),
        })),
      })),
    })),
    insertInto: vi.fn(() => ({
      values: vi.fn(() => ({
        onConflict: vi.fn(() => ({
          execute: mockExecute,
        })),
      })),
    })),
  },
}))

vi.mock("~/lib/helpers/kysely-helpers", () => ({
  json: vi.fn((v: unknown) => v),
}))

describe("updateCampaignError", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should log error at error level when max retries reached", async () => {
    mockReturningExecute.mockResolvedValueOnce([{ times_attempted: 3 }])

    const { updateCampaignError } = await import(
      "./campaign-tracking.server"
    )

    const errorData = {
      step: "campaign_creation" as const,
      message: "fetch failed",
      timestamp: "2026-03-25T14:00:00.000Z",
    }

    await updateCampaignError("event-123", errorData, "opening")

    expect(mockLogger.error).toHaveBeenCalledWith(
      "Campaign email failed after max retries — will not retry again",
      expect.objectContaining({
        eventId: "event-123",
        campaignType: "opening",
        lastError: "fetch failed",
      }),
    )
  })

  it("should not log error when retries below max", async () => {
    mockReturningExecute.mockResolvedValueOnce([{ times_attempted: 1 }])

    const { updateCampaignError } = await import(
      "./campaign-tracking.server"
    )

    const errorData = {
      step: "campaign_creation" as const,
      message: "fetch failed",
      timestamp: "2026-03-25T14:00:00.000Z",
    }

    await updateCampaignError("event-123", errorData, "opening")

    expect(mockLogger.error).not.toHaveBeenCalled()
  })

  it("should not log error when returning gives empty result", async () => {
    mockReturningExecute.mockResolvedValueOnce([])

    const { updateCampaignError } = await import(
      "./campaign-tracking.server"
    )

    const errorData = {
      step: "campaign_creation" as const,
      message: "fetch failed",
      timestamp: "2026-03-25T14:00:00.000Z",
    }

    await updateCampaignError("event-123", errorData, "opening")

    expect(mockLogger.error).not.toHaveBeenCalled()
  })
})
