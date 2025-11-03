import { describe, expect, it, vi, beforeEach, type Mock } from "vitest"
import { createSaveHandler } from "./create-save-handler"
import type { FetcherWithComponents } from "react-router"
import type { ComposableFetcherData } from "~types/database/entities.types"

/**
 * Error Flow Tests
 *
 * These tests verify that errors are properly propagated through the fetcher
 * so they can be displayed via the sendToast system, rather than being caught
 * and hidden in the cell editor's try-catch block.
 *
 * The goal is to ensure errors flow: Cell Editor → Fetcher → Action → Response → sendToast → Toast
 */

// Mock composable-functions to simulate the real behavior
vi.mock("composable-functions", () => ({
  composable: vi.fn((fn) => async () => {
    try {
      const result = await fn()
      return result
    } catch (error) {
      return { success: false, errors: [error] }
    }
  }),
}))

describe("createSaveHandler - Error Flow (sendToast integration)", () => {
  let mockSubmit: Mock
  let mockFetcher: FetcherWithComponents<ComposableFetcherData>

  type TestData = {
    id: string
    flag: string | null
    flag_notes: string | null
  }

  let testData: TestData[]

  beforeEach(() => {
    vi.clearAllMocks()

    mockSubmit = vi.fn().mockResolvedValue({ success: true })
    mockFetcher = {
      submit: mockSubmit,
    } as unknown as FetcherWithComponents<ComposableFetcherData>

    testData = [
      {
        id: "1",
        flag: "red",
        flag_notes: "Important notes",
      },
      {
        id: "2",
        flag: null,
        flag_notes: null,
      },
    ]
  })

  it("should always call fetcher even when data would fail server validation", async () => {
    // With client-side validation removed, the fetcher is ALWAYS called
    // Server validation handles all validation logic
    const handleSave = createSaveHandler({
      data: testData,
      fetcher: mockFetcher,
      intent: "update-event-participant",
      getRequiredFields: (participant) => ({
        profile_id: participant.id,
        ...(participant.flag && participant.flag !== "none"
          ? {
              flag: participant.flag,
              flag_notes: participant.flag_notes || "",
            }
          : {}),
      }),
    })

    // Try to set flag without notes (would fail server validation but fetcher is still called)
    await handleSave("2", "flag", "red")

    // The fetcher SHOULD be called so server can validate and return error
    expect(mockSubmit).toHaveBeenCalledTimes(1)

    const formData = mockSubmit.mock.calls[0][0] as FormData
    expect(formData.get("intent")).toBe("update-event-participant")
    expect(formData.get("flag")).toBe("red")
    expect(formData.get("flag_notes")).toBe("") // Empty because flag_notes is null
  })

  it("should throw error when fetcher returns success: false (but fetcher WAS called)", async () => {
    // Simulate server validation failure
    mockSubmit.mockResolvedValue({
      success: false,
      errors: {
        flag_notes: ["Notas da Flag são obrigatórias quando uma flag é selecionada"],
      },
      intent: "update-event-participant",
    })

    const handleSave = createSaveHandler({
      data: testData,
      fetcher: mockFetcher,
      intent: "update-event-participant",
      getRequiredFields: (participant) => ({
        profile_id: participant.id,
      }),
    })

    // This should still throw an error, but only AFTER the fetcher was called
    await expect(handleSave("2", "flag", "red")).rejects.toThrow(
      "Ops, algo deu errado ao salvar seu valor",
    )

    // The key difference: the fetcher WAS called, so fetcher.data gets updated
    // This allows sendToast to see the error and display it
    expect(mockSubmit).toHaveBeenCalledTimes(1)

    // Verify rollback happened
    expect(testData[1].flag).toBe(null) // Rolled back to original
  })

  it("should not throw error when fetcher returns success: true", async () => {
    mockSubmit.mockResolvedValue({
      success: true,
      intent: "update-event-participant",
    })

    const handleSave = createSaveHandler({
      data: testData,
      fetcher: mockFetcher,
      intent: "update-event-participant",
      getRequiredFields: (participant) => ({
        profile_id: participant.id,
      }),
    })

    // This should NOT throw
    await expect(handleSave("1", "flag", "yellow")).resolves.not.toThrow()

    expect(mockSubmit).toHaveBeenCalledTimes(1)
    expect(testData[0].flag).toBe("yellow") // Update persisted
  })

  it("should rollback optimistic update when server returns error", async () => {
    mockSubmit.mockResolvedValue({
      success: false,
      errors: { _global: ["Server error"] },
      intent: "update-event-participant",
    })

    const handleSave = createSaveHandler({
      data: testData,
      fetcher: mockFetcher,
      intent: "update-event-participant",
    })

    const originalFlag = testData[0].flag

    await expect(handleSave("1", "flag", "blue")).rejects.toThrow()

    // Verify rollback
    expect(testData[0].flag).toBe(originalFlag)
  })
})
