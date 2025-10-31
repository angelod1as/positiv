import { describe, expect, it, vi, beforeEach, type Mock } from "vitest"
import { createSaveHandler } from "./create-save-handler"
import type { FetcherWithComponents } from "react-router"
import type { ComposableFetcherData } from "~types/database/entities.types"

// Mock composable-functions
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

describe("createSaveHandler", () => {
  let mockSubmit: Mock
  let mockFetcher: FetcherWithComponents<ComposableFetcherData>

  type TestData = {
    id: string
    name: string
    status: string
    isActive: boolean
    description: string | null
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
        name: "Item 1",
        status: "active",
        isActive: true,
        description: "Test description",
      },
      {
        id: "2",
        name: "Item 2",
        status: "inactive",
        isActive: false,
        description: null,
      },
    ]
  })

  it("should update item and submit FormData with correct values", async () => {
    const handleSave = createSaveHandler({
      data: testData,
      fetcher: mockFetcher,
      intent: "update-item",
    })

    await handleSave("1", "status", "pending")

    expect(testData[0].status).toBe("pending")
    expect(mockSubmit).toHaveBeenCalledTimes(1)

    const formData = mockSubmit.mock.calls[0][0] as FormData
    expect(formData.get("intent")).toBe("update-item")
    expect(formData.get("id")).toBe("1")
    expect(formData.get("status")).toBe("pending")
  })

  it("should handle boolean values correctly", async () => {
    const handleSave = createSaveHandler({
      data: testData,
      fetcher: mockFetcher,
      intent: "update-item",
    })

    await handleSave("1", "isActive", false)

    const formData = mockSubmit.mock.calls[0][0] as FormData
    expect(formData.get("isActive")).toBe("false")

    await handleSave("2", "isActive", true)

    const formData2 = mockSubmit.mock.calls[1][0] as FormData
    expect(formData2.get("isActive")).toBe("true")
  })

  it("should include required fields in FormData", async () => {
    const handleSave = createSaveHandler({
      data: testData,
      fetcher: mockFetcher,
      intent: "update-item",
      getRequiredFields: (item) => ({
        profile_id: item.id,
        name: item.name,
      }),
    })

    await handleSave("1", "status", "completed")

    const formData = mockSubmit.mock.calls[0][0] as FormData
    expect(formData.get("profile_id")).toBe("1")
    expect(formData.get("name")).toBe("Item 1")
    expect(formData.get("status")).toBe("completed")
  })

  it("should call validation before save if provided", async () => {
    const mockValidate = vi.fn()
    const handleSave = createSaveHandler({
      data: testData,
      fetcher: mockFetcher,
      intent: "update-item",
      validateBeforeSave: mockValidate,
    })

    await handleSave("1", "status", "pending")

    expect(mockValidate).toHaveBeenCalledWith(testData[0], "status", "pending")
    expect(mockSubmit).toHaveBeenCalled()
  })

  it("should rollback changes on validation error", async () => {
    const handleSave = createSaveHandler({
      data: testData,
      fetcher: mockFetcher,
      intent: "update-item",
      validateBeforeSave: () => {
        throw new Error("Validation failed")
      },
    })

    const originalStatus = testData[0].status

    // Validation errors get caught by composable and return { success: false }
    // Then our code throws the generic error message
    await expect(handleSave("1", "status", "invalid")).rejects.toThrow(
      "Ops, algo deu errado ao salvar seu valor",
    )

    expect(testData[0].status).toBe(originalStatus)
    expect(mockSubmit).not.toHaveBeenCalled()
  })

  it("should rollback changes on submit error", async () => {
    mockSubmit.mockResolvedValue({ success: false, errors: [] })

    const handleSave = createSaveHandler({
      data: testData,
      fetcher: mockFetcher,
      intent: "update-item",
    })

    const originalStatus = testData[0].status

    try {
      await handleSave("1", "status", "pending")
      // Should not reach here
      expect.fail("Should have thrown an error")
    } catch (error) {
      expect(error).toBeInstanceOf(Error)
      expect((error as Error).message).toBe(
        "Ops, algo deu errado ao salvar seu valor",
      )
    }

    expect(testData[0].status).toBe(originalStatus)
  })

  it("should handle item not found gracefully", async () => {
    const handleSave = createSaveHandler({
      data: testData,
      fetcher: mockFetcher,
      intent: "update-item",
    })

    await handleSave("999", "status", "pending")

    expect(mockSubmit).not.toHaveBeenCalled()
  })

  it("should handle null values by excluding from FormData", async () => {
    const handleSave = createSaveHandler({
      data: testData,
      fetcher: mockFetcher,
      intent: "update-item",
    })

    await handleSave("1", "description", null)

    const formData = mockSubmit.mock.calls[0][0] as FormData
    expect(formData.has("description")).toBe(false)
  })

  it("should handle undefined values by excluding from FormData", async () => {
    const handleSave = createSaveHandler({
      data: testData,
      fetcher: mockFetcher,
      intent: "update-item",
    })

    await handleSave("1", "description", undefined as unknown as string | null)

    const formData = mockSubmit.mock.calls[0][0] as FormData
    expect(formData.has("description")).toBe(false)
  })

  it("should include complex required fields with conditional logic", async () => {
    type ParticipantData = {
      id: string
      flag: string | null
      flag_notes: string | null
    }

    const participantData: ParticipantData[] = [
      { id: "1", flag: "red", flag_notes: "Important notes" },
      { id: "2", flag: null, flag_notes: null },
    ]

    const handleSave = createSaveHandler({
      data: participantData,
      fetcher: mockFetcher,
      intent: "update-participant",
      getRequiredFields: (participant) => ({
        ...(participant.flag && participant.flag !== "none"
          ? {
              flag: participant.flag,
              flag_notes: participant.flag_notes || "",
            }
          : {}),
      }),
    })

    await handleSave("1", "flag", "yellow")

    const formData = mockSubmit.mock.calls[0][0] as FormData
    expect(formData.get("flag")).toBe("yellow")
    expect(formData.get("flag_notes")).toBe("Important notes")
  })
})
