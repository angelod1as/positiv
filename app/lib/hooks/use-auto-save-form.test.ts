import { act, renderHook } from "@testing-library/react"
import { describe, expect, it, vi, beforeEach } from "vitest"
import { z } from "zod"
import { toast } from "sonner"
import { useAutoSaveForm } from "./use-auto-save-form"
import type { FetcherWithComponents } from "react-router"
import type { ComposableFetcherData } from "~types/database/entities.types"

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

const testSchema = z.object({
  name: z.string(),
  status: z.string(),
  count: z.coerce.number(),
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
  } as FetcherWithComponents<ComposableFetcherData>
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

  describe("select fields", () => {
    it("should return current value from register.select", () => {
      const fetcher = createMockFetcher()

      const { result } = renderHook(() =>
        useAutoSaveForm({
          schema: testSchema,
          initialData: defaultInitialData,
          fetcher,
          onSubmit: mockOnSubmit,
        }),
      )

      const selectProps = result.current.register.select("status")
      expect(selectProps.value).toBe("active")
    })

    it("should update local value and call onSubmit immediately when select changes", () => {
      const fetcher = createMockFetcher()

      const { result } = renderHook(() =>
        useAutoSaveForm({
          schema: testSchema,
          initialData: defaultInitialData,
          fetcher,
          onSubmit: mockOnSubmit,
        }),
      )

      act(() => {
        result.current.register.select("status").onValueChange("inactive")
      })

      expect(result.current.values.status).toBe("inactive")
      expect(mockOnSubmit).toHaveBeenCalledTimes(1)
      expect(mockOnSubmit).toHaveBeenCalledWith(
        "status",
        "inactive",
        expect.any(Object),
      )
    })
  })

  describe("checkbox fields", () => {
    it("should return current checked state from register.checkbox", () => {
      const fetcher = createMockFetcher()

      const { result } = renderHook(() =>
        useAutoSaveForm({
          schema: testSchema,
          initialData: defaultInitialData,
          fetcher,
          onSubmit: mockOnSubmit,
        }),
      )

      const checkboxProps = result.current.register.checkbox("isActive")
      expect(checkboxProps.checked).toBe(true)
    })

    it("should update local value and call onSubmit immediately when checkbox changes", () => {
      const fetcher = createMockFetcher()

      const { result } = renderHook(() =>
        useAutoSaveForm({
          schema: testSchema,
          initialData: defaultInitialData,
          fetcher,
          onSubmit: mockOnSubmit,
        }),
      )

      act(() => {
        result.current.register
          .checkbox("isActive")
          .onChange({ target: { checked: false } })
      })

      expect(result.current.values.isActive).toBe(false)
      expect(mockOnSubmit).toHaveBeenCalledTimes(1)
      expect(mockOnSubmit).toHaveBeenCalledWith(
        "isActive",
        false,
        expect.any(Object),
      )
    })
  })

  describe("text fields", () => {
    it("should return current value from register.text", () => {
      const fetcher = createMockFetcher()

      const { result } = renderHook(() =>
        useAutoSaveForm({
          schema: testSchema,
          initialData: defaultInitialData,
          fetcher,
          onSubmit: mockOnSubmit,
        }),
      )

      const textProps = result.current.register.text("name")
      expect(textProps.value).toBe("Test Name")
    })

    it("should update local value on change without submitting", () => {
      const fetcher = createMockFetcher()

      const { result } = renderHook(() =>
        useAutoSaveForm({
          schema: testSchema,
          initialData: defaultInitialData,
          fetcher,
          onSubmit: mockOnSubmit,
        }),
      )

      act(() => {
        result.current.register
          .text("name")
          .onChange({ target: { value: "New Name" } })
      })

      expect(result.current.values.name).toBe("New Name")
      expect(mockOnSubmit).not.toHaveBeenCalled()
    })

    it("should submit on blur when value changed", () => {
      const fetcher = createMockFetcher()

      const { result } = renderHook(() =>
        useAutoSaveForm({
          schema: testSchema,
          initialData: defaultInitialData,
          fetcher,
          onSubmit: mockOnSubmit,
        }),
      )

      act(() => {
        result.current.register
          .text("name")
          .onChange({ target: { value: "New Name" } })
      })

      act(() => {
        result.current.register.text("name").onBlur()
      })

      expect(mockOnSubmit).toHaveBeenCalledTimes(1)
      expect(mockOnSubmit).toHaveBeenCalledWith(
        "name",
        "New Name",
        expect.any(Object),
      )
    })

    it("should not submit on blur when value unchanged", () => {
      const fetcher = createMockFetcher()

      const { result } = renderHook(() =>
        useAutoSaveForm({
          schema: testSchema,
          initialData: defaultInitialData,
          fetcher,
          onSubmit: mockOnSubmit,
        }),
      )

      act(() => {
        result.current.register.text("name").onBlur()
      })

      expect(mockOnSubmit).not.toHaveBeenCalled()
    })
  })

  describe("number fields", () => {
    it("should return current value as string from register.number", () => {
      const fetcher = createMockFetcher()

      const { result } = renderHook(() =>
        useAutoSaveForm({
          schema: testSchema,
          initialData: defaultInitialData,
          fetcher,
          onSubmit: mockOnSubmit,
        }),
      )

      const numberProps = result.current.register.number("count")
      expect(numberProps.value).toBe("10")
    })

    it("should update local value on change without submitting", () => {
      const fetcher = createMockFetcher()

      const { result } = renderHook(() =>
        useAutoSaveForm({
          schema: testSchema,
          initialData: defaultInitialData,
          fetcher,
          onSubmit: mockOnSubmit,
        }),
      )

      act(() => {
        result.current.register
          .number("count")
          .onChange({ target: { value: "20" } })
      })

      expect(result.current.values.count).toBe("20")
      expect(mockOnSubmit).not.toHaveBeenCalled()
    })

    it("should submit on blur when value changed", () => {
      const fetcher = createMockFetcher()

      const { result } = renderHook(() =>
        useAutoSaveForm({
          schema: testSchema,
          initialData: defaultInitialData,
          fetcher,
          onSubmit: mockOnSubmit,
        }),
      )

      act(() => {
        result.current.register
          .number("count")
          .onChange({ target: { value: "25" } })
      })

      act(() => {
        result.current.register.number("count").onBlur()
      })

      expect(mockOnSubmit).toHaveBeenCalledTimes(1)
      expect(mockOnSubmit).toHaveBeenCalledWith(
        "count",
        "25",
        expect.any(Object),
      )
    })

    it("should not submit on blur when value unchanged", () => {
      const fetcher = createMockFetcher()

      const { result } = renderHook(() =>
        useAutoSaveForm({
          schema: testSchema,
          initialData: defaultInitialData,
          fetcher,
          onSubmit: mockOnSubmit,
        }),
      )

      act(() => {
        result.current.register.number("count").onBlur()
      })

      expect(mockOnSubmit).not.toHaveBeenCalled()
    })
  })

  describe("saving state", () => {
    it("should reflect isSaving as true when fetcher is submitting", () => {
      const fetcher = createMockFetcher({ state: "submitting" })

      const { result } = renderHook(() =>
        useAutoSaveForm({
          schema: testSchema,
          initialData: defaultInitialData,
          fetcher,
          onSubmit: mockOnSubmit,
        }),
      )

      expect(result.current.isSaving).toBe(true)
    })

    it("should reflect isSaving as true when fetcher is loading", () => {
      const fetcher = createMockFetcher({ state: "loading" })

      const { result } = renderHook(() =>
        useAutoSaveForm({
          schema: testSchema,
          initialData: defaultInitialData,
          fetcher,
          onSubmit: mockOnSubmit,
        }),
      )

      expect(result.current.isSaving).toBe(true)
    })
  })

  describe("toast feedback", () => {
    it("should show success toast when fetcher returns success", () => {
      const { rerender } = renderHook(
        ({ fetcherData }) =>
          useAutoSaveForm({
            schema: testSchema,
            initialData: defaultInitialData,
            fetcher: createMockFetcher({ data: fetcherData }),
            onSubmit: mockOnSubmit,
          }),
        { initialProps: { fetcherData: undefined as ComposableFetcherData | undefined } },
      )

      rerender({
        fetcherData: { success: true, intent: "update" },
      })

      expect(toast.success).toHaveBeenCalledWith("Dados atualizados com sucesso")
    })

    it("should show custom success message when provided", () => {
      const { rerender } = renderHook(
        ({ fetcherData }) =>
          useAutoSaveForm({
            schema: testSchema,
            initialData: defaultInitialData,
            fetcher: createMockFetcher({ data: fetcherData }),
            onSubmit: mockOnSubmit,
            successMessage: "Custom success!",
          }),
        { initialProps: { fetcherData: undefined as ComposableFetcherData | undefined } },
      )

      rerender({
        fetcherData: { success: true, intent: "update" },
      })

      expect(toast.success).toHaveBeenCalledWith("Custom success!")
    })

    it("should show error toast when fetcher returns error", () => {
      const { rerender } = renderHook(
        ({ fetcherData }) =>
          useAutoSaveForm({
            schema: testSchema,
            initialData: defaultInitialData,
            fetcher: createMockFetcher({ data: fetcherData }),
            onSubmit: mockOnSubmit,
          }),
        { initialProps: { fetcherData: undefined as ComposableFetcherData | undefined } },
      )

      rerender({
        fetcherData: {
          success: false,
          intent: "update",
          errors: { _global: ["Validation failed"] },
        },
      })

      expect(toast.error).toHaveBeenCalledWith("Validation failed")
    })

    it("should show default error message when no specific error", () => {
      const { rerender } = renderHook(
        ({ fetcherData }) =>
          useAutoSaveForm({
            schema: testSchema,
            initialData: defaultInitialData,
            fetcher: createMockFetcher({ data: fetcherData }),
            onSubmit: mockOnSubmit,
          }),
        { initialProps: { fetcherData: undefined as ComposableFetcherData | undefined } },
      )

      rerender({
        fetcherData: { success: false, intent: "update" },
      })

      expect(toast.error).toHaveBeenCalledWith("Erro ao salvar")
    })

    it("should show custom error message when provided", () => {
      const { rerender } = renderHook(
        ({ fetcherData }) =>
          useAutoSaveForm({
            schema: testSchema,
            initialData: defaultInitialData,
            fetcher: createMockFetcher({ data: fetcherData }),
            onSubmit: mockOnSubmit,
            errorMessage: "Custom error!",
          }),
        { initialProps: { fetcherData: undefined as ComposableFetcherData | undefined } },
      )

      rerender({
        fetcherData: { success: false, intent: "update" },
      })

      expect(toast.error).toHaveBeenCalledWith("Custom error!")
    })
  })

  describe("manual setValue and submitField", () => {
    it("should update value with setValue", () => {
      const fetcher = createMockFetcher()

      const { result } = renderHook(() =>
        useAutoSaveForm({
          schema: testSchema,
          initialData: defaultInitialData,
          fetcher,
          onSubmit: mockOnSubmit,
        }),
      )

      act(() => {
        result.current.setValue("name", "Manually set")
      })

      expect(result.current.values.name).toBe("Manually set")
    })

    it("should submit field value with submitField", () => {
      const fetcher = createMockFetcher()

      const { result } = renderHook(() =>
        useAutoSaveForm({
          schema: testSchema,
          initialData: defaultInitialData,
          fetcher,
          onSubmit: mockOnSubmit,
        }),
      )

      act(() => {
        result.current.setValue("name", "New value")
      })

      act(() => {
        result.current.submitField("name")
      })

      expect(mockOnSubmit).toHaveBeenCalledWith(
        "name",
        "New value",
        expect.any(Object),
      )
    })
  })

  describe("schema validation", () => {
    it("should not submit when field validation fails", () => {
      const strictSchema = z.object({
        name: z.string().min(5, "Name must be at least 5 characters"),
        status: z.string(),
        count: z.number(),
        isActive: z.boolean(),
      })

      const fetcher = createMockFetcher()

      const { result } = renderHook(() =>
        useAutoSaveForm({
          schema: strictSchema,
          initialData: { name: "Valid", status: "active", count: 10, isActive: true },
          fetcher,
          onSubmit: mockOnSubmit,
        }),
      )

      act(() => {
        result.current.register
          .text("name")
          .onChange({ target: { value: "ab" } })
      })

      act(() => {
        result.current.register.text("name").onBlur()
      })

      expect(mockOnSubmit).not.toHaveBeenCalled()
      expect(toast.error).toHaveBeenCalledWith("Name must be at least 5 characters")
    })

    it("should submit when field validation passes", () => {
      const strictSchema = z.object({
        name: z.string().min(5, "Name must be at least 5 characters"),
        status: z.string(),
        count: z.number(),
        isActive: z.boolean(),
      })

      const fetcher = createMockFetcher()

      const { result } = renderHook(() =>
        useAutoSaveForm({
          schema: strictSchema,
          initialData: { name: "Valid", status: "active", count: 10, isActive: true },
          fetcher,
          onSubmit: mockOnSubmit,
        }),
      )

      act(() => {
        result.current.register
          .text("name")
          .onChange({ target: { value: "ValidName" } })
      })

      act(() => {
        result.current.register.text("name").onBlur()
      })

      expect(mockOnSubmit).toHaveBeenCalledWith(
        "name",
        "ValidName",
        expect.any(Object),
      )
    })
  })

  describe("getFieldState", () => {
    it("should return isDirty true when field value differs from initial", () => {
      const fetcher = createMockFetcher()

      const { result } = renderHook(() =>
        useAutoSaveForm({
          schema: testSchema,
          initialData: defaultInitialData,
          fetcher,
          onSubmit: mockOnSubmit,
        }),
      )

      act(() => {
        result.current.register
          .text("name")
          .onChange({ target: { value: "Changed Name" } })
      })

      expect(result.current.getFieldState("name").isDirty).toBe(true)
      expect(result.current.getFieldState("status").isDirty).toBe(false)
    })

    it("should return isSaving true when fetcher is not idle", () => {
      const fetcher = createMockFetcher({ state: "submitting" })

      const { result } = renderHook(() =>
        useAutoSaveForm({
          schema: testSchema,
          initialData: defaultInitialData,
          fetcher,
          onSubmit: mockOnSubmit,
        }),
      )

      expect(result.current.getFieldState("name").isSaving).toBe(true)
    })
  })

  describe("baseline reset after save", () => {
    it("should update baseline after successful save to prevent re-submitting unchanged values", () => {
      const { rerender, result } = renderHook(
        ({ fetcherData }) =>
          useAutoSaveForm({
            schema: testSchema,
            initialData: defaultInitialData,
            fetcher: createMockFetcher({ data: fetcherData }),
            onSubmit: mockOnSubmit,
          }),
        { initialProps: { fetcherData: undefined as ComposableFetcherData | undefined } },
      )

      // Change value and submit
      act(() => {
        result.current.register
          .text("name")
          .onChange({ target: { value: "New Name" } })
      })

      act(() => {
        result.current.register.text("name").onBlur()
      })

      expect(mockOnSubmit).toHaveBeenCalledTimes(1)
      mockOnSubmit.mockClear()

      // Simulate successful save
      rerender({ fetcherData: { success: true, intent: "update" } })

      // Try to blur again without changing - should NOT submit since baseline was updated
      act(() => {
        result.current.register.text("name").onBlur()
      })

      expect(mockOnSubmit).not.toHaveBeenCalled()
    })
  })

  describe("error state tracking", () => {
    it("should track validation error in field state", () => {
      const strictSchema = z.object({
        name: z.string().min(5, "Name must be at least 5 characters"),
        status: z.string(),
        count: z.coerce.number(),
        isActive: z.boolean(),
      })

      const fetcher = createMockFetcher()

      const { result } = renderHook(() =>
        useAutoSaveForm({
          schema: strictSchema,
          initialData: { name: "Valid", status: "active", count: 10, isActive: true },
          fetcher,
          onSubmit: mockOnSubmit,
        }),
      )

      // Change to invalid value and trigger blur
      act(() => {
        result.current.register
          .text("name")
          .onChange({ target: { value: "ab" } })
      })

      act(() => {
        result.current.register.text("name").onBlur()
      })

      // Error should be tracked in field state
      expect(result.current.getFieldState("name").error).toBe(
        "Name must be at least 5 characters",
      )
    })

    it("should clear error when validation passes", () => {
      const strictSchema = z.object({
        name: z.string().min(5, "Name must be at least 5 characters"),
        status: z.string(),
        count: z.coerce.number(),
        isActive: z.boolean(),
      })

      const fetcher = createMockFetcher()

      const { result } = renderHook(() =>
        useAutoSaveForm({
          schema: strictSchema,
          initialData: { name: "Valid", status: "active", count: 10, isActive: true },
          fetcher,
          onSubmit: mockOnSubmit,
        }),
      )

      // First, trigger error
      act(() => {
        result.current.register
          .text("name")
          .onChange({ target: { value: "ab" } })
      })

      act(() => {
        result.current.register.text("name").onBlur()
      })

      expect(result.current.getFieldState("name").error).toBe(
        "Name must be at least 5 characters",
      )

      // Now fix the value
      act(() => {
        result.current.register
          .text("name")
          .onChange({ target: { value: "ValidName" } })
      })

      act(() => {
        result.current.register.text("name").onBlur()
      })

      // Error should be cleared
      expect(result.current.getFieldState("name").error).toBeNull()
    })
  })

  describe("null value handling", () => {
    it("should treat null and empty string as equivalent for dirty checking", () => {
      const nullableSchema = z.object({
        name: z.string(),
        status: z.string(),
        count: z.coerce.number(),
        isActive: z.boolean(),
      })

      const fetcher = createMockFetcher()

      const { result } = renderHook(() =>
        useAutoSaveForm({
          schema: nullableSchema,
          initialData: {
            name: null as unknown as string,
            status: "active",
            count: 10,
            isActive: true,
          },
          fetcher,
          onSubmit: mockOnSubmit,
        }),
      )

      // Field with null initial value, focused and blurred without change
      // should NOT trigger submit since "" === null (normalized)
      act(() => {
        result.current.register.text("name").onBlur()
      })

      expect(mockOnSubmit).not.toHaveBeenCalled()
    })
  })
})
