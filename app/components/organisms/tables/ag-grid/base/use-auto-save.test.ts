import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useAutoSave } from "./use-auto-save"
import type { CellValueChangedEvent, GridApi } from "ag-grid-community"

// Mock toast
vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
  },
}))

describe("useAutoSave", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const createMockEvent = (
    oldValue: unknown,
    newValue: unknown,
    field = "status"
  ): CellValueChangedEvent => {
    const mockApi = {
      applyTransaction: vi.fn(),
      getRowNode: vi.fn().mockReturnValue({
        setDataValue: vi.fn(),
      }),
    } as unknown as GridApi

    return {
      oldValue,
      newValue,
      colDef: { field },
      data: { id: "row-1", [field]: newValue },
      node: { id: "row-1", data: { id: "row-1", [field]: newValue } },
      api: mockApi,
      column: { getColId: () => field },
    } as unknown as CellValueChangedEvent
  }

  describe("Debounce Behavior", () => {
    it("does not call onSave immediately when cell value changes", async () => {
      const onSave = vi.fn().mockResolvedValue(undefined)

      const { result } = renderHook(() =>
        useAutoSave({ onSave, debounceMs: 500 })
      )

      const event = createMockEvent("pending", "approved")
      act(() => {
        result.current.handleCellValueChanged(event)
      })

      expect(onSave).not.toHaveBeenCalled()
    })

    it("calls onSave after debounce delay", async () => {
      const onSave = vi.fn().mockResolvedValue(undefined)

      const { result } = renderHook(() =>
        useAutoSave({ onSave, debounceMs: 500 })
      )

      const event = createMockEvent("pending", "approved")
      act(() => {
        result.current.handleCellValueChanged(event)
      })

      expect(onSave).not.toHaveBeenCalled()

      await act(async () => {
        vi.advanceTimersByTime(500)
      })

      expect(onSave).toHaveBeenCalledTimes(1)
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          field: "status",
          oldValue: "pending",
          newValue: "approved",
          rowData: expect.objectContaining({ id: "row-1" }),
        })
      )
    })

    it("resets debounce timer on subsequent changes", async () => {
      const onSave = vi.fn().mockResolvedValue(undefined)

      const { result } = renderHook(() =>
        useAutoSave({ onSave, debounceMs: 500 })
      )

      act(() => {
        result.current.handleCellValueChanged(createMockEvent("pending", "approved"))
      })

      await act(async () => {
        vi.advanceTimersByTime(300)
      })

      // Another change before debounce completes
      act(() => {
        result.current.handleCellValueChanged(createMockEvent("approved", "rejected"))
      })

      await act(async () => {
        vi.advanceTimersByTime(300)
      })

      // First save should not have been called yet
      expect(onSave).not.toHaveBeenCalled()

      await act(async () => {
        vi.advanceTimersByTime(200)
      })

      // Only the last change should be saved
      expect(onSave).toHaveBeenCalledTimes(1)
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          newValue: "rejected",
        })
      )
    })

    it("uses default 500ms debounce when not specified", async () => {
      const onSave = vi.fn().mockResolvedValue(undefined)

      const { result } = renderHook(() => useAutoSave({ onSave }))

      act(() => {
        result.current.handleCellValueChanged(createMockEvent("old", "new"))
      })

      await act(async () => {
        vi.advanceTimersByTime(499)
      })
      expect(onSave).not.toHaveBeenCalled()

      await act(async () => {
        vi.advanceTimersByTime(1)
      })
      expect(onSave).toHaveBeenCalledTimes(1)
    })

    it("cancels pending save on unmount", async () => {
      const onSave = vi.fn().mockResolvedValue(undefined)

      const { result, unmount } = renderHook(() =>
        useAutoSave({ onSave, debounceMs: 500 })
      )

      act(() => {
        result.current.handleCellValueChanged(createMockEvent("old", "new"))
      })

      await act(async () => {
        vi.advanceTimersByTime(300)
      })

      unmount()

      await act(async () => {
        vi.advanceTimersByTime(500)
      })

      expect(onSave).not.toHaveBeenCalled()
    })
  })

  describe("Optimistic Updates", () => {
    it("keeps new value when save succeeds", async () => {
      const onSave = vi.fn().mockResolvedValue(undefined)

      const { result } = renderHook(() =>
        useAutoSave({ onSave, debounceMs: 500 })
      )

      const event = createMockEvent("pending", "approved")
      act(() => {
        result.current.handleCellValueChanged(event)
      })

      await act(async () => {
        vi.advanceTimersByTime(500)
      })

      // Cell value should remain as "approved" (no rollback)
      expect(event.api.applyTransaction).not.toHaveBeenCalled()
    })
  })

  describe("Error Rollback", () => {
    it("reverts to old value when save fails", async () => {
      const onSave = vi.fn().mockRejectedValue(new Error("Save failed"))

      const { result } = renderHook(() =>
        useAutoSave({ onSave, debounceMs: 500 })
      )

      const event = createMockEvent("pending", "approved")
      const mockNode = event.api.getRowNode("row-1")

      act(() => {
        result.current.handleCellValueChanged(event)
      })

      // Advance timers to fire the debounced save
      await act(async () => {
        vi.advanceTimersByTime(500)
      })

      // Flush the microtask queue to let the Promise rejection handler run
      await act(async () => {
        await Promise.resolve()
        await Promise.resolve()
      })

      expect(mockNode?.setDataValue).toHaveBeenCalledWith("status", "pending")
    })

    it("shows error toast on save failure", async () => {
      const { toast } = await import("sonner")
      const onSave = vi.fn().mockRejectedValue(new Error("Network error"))

      const { result } = renderHook(() =>
        useAutoSave({ onSave, debounceMs: 500 })
      )

      act(() => {
        result.current.handleCellValueChanged(createMockEvent("old", "new"))
      })

      await act(async () => {
        vi.advanceTimersByTime(500)
      })

      await act(async () => {
        await Promise.resolve()
        await Promise.resolve()
      })

      expect(toast.error).toHaveBeenCalled()
    })

    it("uses custom error message when provided", async () => {
      const { toast } = await import("sonner")
      const onSave = vi.fn().mockRejectedValue(new Error("Failed"))

      const { result } = renderHook(() =>
        useAutoSave({
          onSave,
          debounceMs: 500,
          errorMessage: "Falha ao salvar alteração",
        })
      )

      act(() => {
        result.current.handleCellValueChanged(createMockEvent("old", "new"))
      })

      await act(async () => {
        vi.advanceTimersByTime(500)
      })

      await act(async () => {
        await Promise.resolve()
        await Promise.resolve()
      })

      expect(toast.error).toHaveBeenCalledWith("Falha ao salvar alteração")
    })
  })

  describe("Save State", () => {
    it("exposes isSaving state", async () => {
      let resolvePromise: () => void = () => {}
      const savePromise = new Promise<void>((resolve) => {
        resolvePromise = resolve
      })
      const onSave = vi.fn().mockReturnValue(savePromise)

      const { result } = renderHook(() =>
        useAutoSave({ onSave, debounceMs: 500 })
      )

      expect(result.current.isSaving).toBe(false)

      act(() => {
        result.current.handleCellValueChanged(createMockEvent("old", "new"))
      })

      await act(async () => {
        vi.advanceTimersByTime(500)
      })

      // Flush microtask queue
      await act(async () => {
        await Promise.resolve()
      })

      expect(result.current.isSaving).toBe(true)

      await act(async () => {
        resolvePromise()
        await Promise.resolve()
        await Promise.resolve()
      })

      expect(result.current.isSaving).toBe(false)
    })
  })

  describe("No onSave provided", () => {
    it("does nothing when onSave is not provided", async () => {
      const { result } = renderHook(() => useAutoSave({}))

      const event = createMockEvent("old", "new")

      // Should not throw
      act(() => {
        result.current.handleCellValueChanged(event)
      })

      await act(async () => {
        vi.advanceTimersByTime(500)
      })

      // No errors, no calls
      expect(event.api.applyTransaction).not.toHaveBeenCalled()
    })
  })

  describe("Field Resolution", () => {
    it("uses column.getColId() when colDef.field is undefined", async () => {
      const onSave = vi.fn().mockResolvedValue(undefined)

      const { result } = renderHook(() =>
        useAutoSave({ onSave, debounceMs: 500 })
      )

      const event = createMockEvent("old", "new", "myColumn")
      // Force fallback by removing field from colDef
      event.colDef.field = undefined

      act(() => {
        result.current.handleCellValueChanged(event)
      })

      await act(async () => {
        vi.advanceTimersByTime(500)
      })

      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({ field: "myColumn" }) // From getColId()
      )
    })
  })

  describe("Error Logging", () => {
    it("logs error to console on save failure", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
      const saveError = new Error("Network error")
      const onSave = vi.fn().mockRejectedValue(saveError)

      const { result } = renderHook(() =>
        useAutoSave({ onSave, debounceMs: 500 })
      )

      act(() => {
        result.current.handleCellValueChanged(createMockEvent("old", "new"))
      })

      await act(async () => {
        vi.advanceTimersByTime(500)
      })

      await act(async () => {
        await Promise.resolve()
        await Promise.resolve()
      })

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Auto-save failed:",
        expect.objectContaining({
          error: saveError,
          field: "status",
          rowId: "row-1",
        })
      )

      consoleErrorSpy.mockRestore()
    })
  })
})
