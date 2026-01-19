import { act, renderHook } from "@testing-library/react"
import { describe, expect, it, vi, beforeEach } from "vitest"
import { z } from "zod"
import { useAutoSaveForm } from "./use-auto-save-form"
import type { FetcherWithComponents } from "react-router"
import type { ComposableFetcherData } from "~types/database/entities.types"

const testSchema = z.object({
  name: z.string(),
  status: z.string(),
  count: z.number(),
  isActive: z.boolean(),
})

type TestData = z.infer<typeof testSchema>

function createMockFetcher(
  overrides: Partial<FetcherWithComponents<ComposableFetcherData>> = {},
): FetcherWithComponents<ComposableFetcherData> {
  return {
    state: "idle",
    data: undefined,
    formMethod: undefined,
    formAction: undefined,
    formEncType: undefined,
    formData: undefined,
    json: undefined,
    text: undefined,
    submit: vi.fn(),
    load: vi.fn(),
    Form: vi.fn() as unknown as FetcherWithComponents<ComposableFetcherData>["Form"],
    ...overrides,
  }
}

describe("useAutoSaveForm", () => {
  const defaultInitialData: TestData = {
    name: "Test Name",
    status: "active",
    count: 10,
    isActive: true,
  }

  const mockOnSubmit = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("initialization", () => {
    it("should initialize values from initialData", () => {
      const fetcher = createMockFetcher()

      const { result } = renderHook(() =>
        useAutoSaveForm({
          schema: testSchema,
          initialData: defaultInitialData,
          fetcher,
          onSubmit: mockOnSubmit,
        }),
      )

      expect(result.current.values).toEqual(defaultInitialData)
    })

    it("should re-sync values when initialData changes", () => {
      const fetcher = createMockFetcher()

      const { result, rerender } = renderHook(
        ({ initialData }) =>
          useAutoSaveForm({
            schema: testSchema,
            initialData,
            fetcher,
            onSubmit: mockOnSubmit,
          }),
        { initialProps: { initialData: defaultInitialData } },
      )

      expect(result.current.values.name).toBe("Test Name")

      const newData = { ...defaultInitialData, name: "Updated Name" }
      rerender({ initialData: newData })

      expect(result.current.values.name).toBe("Updated Name")
    })

    it("should start with isSaving as false", () => {
      const fetcher = createMockFetcher()

      const { result } = renderHook(() =>
        useAutoSaveForm({
          schema: testSchema,
          initialData: defaultInitialData,
          fetcher,
          onSubmit: mockOnSubmit,
        }),
      )

      expect(result.current.isSaving).toBe(false)
    })
  })
})
